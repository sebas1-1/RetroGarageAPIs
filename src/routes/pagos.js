const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const {
  ExchangeRateError,
  getExchangeRate,
} = require('../exchangeRateService');
const {
  BankValidationError,
  createAuthorizationCode,
  hashCardCvv,
  hashCardNumber,
  normalizeSinpePhone,
  secureBufferEquals,
  validateCardDetails,
} = require('../bankSimulator');

class PaymentError extends Error {
  constructor(status, message, code = 'PAGO_INVALIDO') {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
    this.code = code;
  }
}

const asPositiveInteger = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PaymentError(400, `${field} debe ser un entero mayor que cero.`);
  }
  return parsed;
};

const generateInvoiceNumber = () => {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `FACT-${localDate}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

const formatDatabaseExpiry = (date) => {
  const value = new Date(date);
  return `${String(value.getUTCMonth() + 1).padStart(2, '0')}/${String(value.getUTCFullYear()).slice(-2)}`;
};

const insertGatewayTransaction = async (transaction, data) => {
  const result = await new sql.Request(transaction)
    .input('id_tarjeta', sql.Int, data.idTarjeta || null)
    .input('tipo', sql.NVarChar(10), data.tipo)
    .input('estado', sql.NVarChar(15), data.estado)
    .input('monto', sql.Decimal(12, 2), data.monto)
    .input('codigo', sql.NVarChar(30), data.codigo || null)
    .input('marca', sql.NVarChar(20), data.marca || null)
    .input('ultimos_cuatro', sql.Char(4), data.ultimosCuatro || null)
    .input('telefono', sql.Char(8), data.telefono || null)
    .input('banco', sql.NVarChar(100), data.banco || null)
    .input('mensaje', sql.NVarChar(250), data.mensaje)
    .query(`
      INSERT INTO transacciones_pasarela
        (id_tarjeta_simulada, tipo, estado, monto, codigo_autorizacion, marca_tarjeta,
         ultimos_cuatro, telefono_sinpe, banco, mensaje)
      OUTPUT INSERTED.id_transaccion
      VALUES
        (@id_tarjeta, @tipo, @estado, @monto, @codigo, @marca,
         @ultimos_cuatro, @telefono, @banco, @mensaje)
    `);
  return result.recordset[0].id_transaccion;
};

const rollbackSafely = async (transaction) => {
  if (!transaction || !transaction._aborted) {
    try {
      await transaction.rollback();
    } catch {
      // La transacción puede no haber iniciado o ya haberse cerrado.
    }
  }
};

const sendPaymentError = (res, error) => {
  if (error instanceof PaymentError || error instanceof BankValidationError) {
    return res.status(error.status || 400).json({
      error: error.message,
      codigo: error.code,
    });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error al procesar el pago' });
};

// Lista únicamente los métodos habilitados por la pasarela simulada.
router.get('/metodos/lista', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id_metodo, codigo, nombre, requiere_referencia
      FROM metodos_pago
      WHERE activo = 1 AND codigo IN ('TARJETA', 'SINPE', 'PAYPAL')
      ORDER BY CASE codigo
        WHEN 'TARJETA' THEN 1
        WHEN 'SINPE' THEN 2
        WHEN 'PAYPAL' THEN 3
      END
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

// Indicador informativo para pagos locales con Tarjeta y SINPE.
router.get('/tipo-cambio', async (_req, res) => {
  try {
    const exchangeRate = await getExchangeRate();
    return res.json({
      moneda_origen: 'CRC',
      moneda_destino: 'USD',
      compra: exchangeRate.compra,
      venta: exchangeRate.venta,
      fecha: exchangeRate.fecha,
      fuente: exchangeRate.fuente,
      es_respaldo: exchangeRate.es_respaldo,
    });
  } catch (error) {
    if (error instanceof ExchangeRateError) {
      return res.status(503).json({
        error: 'No fue posible obtener el tipo de cambio.',
        codigo: error.code,
      });
    }
    console.error(error);
    return res.status(500).json({
      error: 'Error al consultar el tipo de cambio.',
    });
  }
});

// Historial de pagos con el resultado sanitizado de la pasarela.
router.get('/', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT p.id_pago, p.numero_factura, p.id_cita, p.id_usuario,
             p.id_metodo, m.codigo AS codigo_metodo, m.nombre AS metodo_pago,
             p.monto, p.monto_recibido, p.cambio,
             p.numero_referencia, p.banco,
             p.observaciones, p.estado_pago, p.fecha_pago,
             c.marca_vehiculo, c.modelo_vehiculo,
             cl.nombre + ' ' + cl.apellido AS cliente,
             s.nombre AS servicio,
             tp.id_transaccion, tp.estado AS estado_pasarela,
             tp.marca_tarjeta, tp.ultimos_cuatro, tp.telefono_sinpe,
             tp.paypal_order_id, tp.moneda_externa, tp.monto_externo
      FROM pagos p
      INNER JOIN metodos_pago m ON m.id_metodo = p.id_metodo
      LEFT JOIN citas c ON c.id_cita = p.id_cita
      LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
      LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
      LEFT JOIN transacciones_pasarela tp ON tp.id_pago = p.id_pago
      ORDER BY p.fecha_pago DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = asPositiveInteger(req.params.id, 'id');
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT p.id_pago, p.numero_factura, p.id_cita, p.id_usuario,
               p.id_metodo, m.codigo AS codigo_metodo, m.nombre AS metodo_pago,
               p.monto, p.monto_recibido, p.cambio,
               p.numero_referencia, p.banco,
               p.observaciones, p.estado_pago, p.fecha_pago,
               tp.id_transaccion, tp.estado AS estado_pasarela,
               tp.marca_tarjeta, tp.ultimos_cuatro, tp.telefono_sinpe,
               tp.paypal_order_id, tp.moneda_externa, tp.monto_externo,
               tp.mensaje AS mensaje_pasarela
        FROM pagos p
        INNER JOIN metodos_pago m ON m.id_metodo = p.id_metodo
        LEFT JOIN transacciones_pasarela tp ON tp.id_pago = p.id_pago
        WHERE p.id_pago = @id
      `);
    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    sendPaymentError(res, error);
  }
});

// Autoriza el cobro en el banco simulado y registra pago, detalle e inventario.
router.post('/', async (req, res) => {
  let transaction;
  try {
    const {
      id_cita,
      id_usuario,
      id_metodo,
      monto,
      observaciones,
      productos = [],
      datos_pasarela,
    } = req.body;

    const userId = asPositiveInteger(id_usuario, 'id_usuario');
    const methodId = asPositiveInteger(id_metodo, 'id_metodo');
    const appointmentId =
      id_cita === null || id_cita === undefined || id_cita === ''
        ? null
        : asPositiveInteger(id_cita, 'id_cita');

    if (!Array.isArray(productos)) {
      throw new PaymentError(400, 'productos debe ser una lista.');
    }
    if (!datos_pasarela || typeof datos_pasarela !== 'object') {
      throw new PaymentError(400, 'Faltan los datos de la pasarela.');
    }

    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const userResult = await new sql.Request(transaction)
      .input('id_usuario', sql.Int, userId)
      .query('SELECT id_usuario FROM usuarios WHERE id_usuario = @id_usuario');
    if (!userResult.recordset.length) {
      throw new PaymentError(400, 'El usuario indicado no existe.');
    }

    const methodResult = await new sql.Request(transaction)
      .input('id_metodo', sql.Int, methodId)
      .query(`
        SELECT id_metodo, codigo, nombre
        FROM metodos_pago
        WHERE id_metodo = @id_metodo
          AND activo = 1
          AND codigo IN ('TARJETA', 'SINPE')
      `);
    if (!methodResult.recordset.length) {
      throw new PaymentError(400, 'El método de pago no está habilitado.');
    }
    const method = methodResult.recordset[0];

    let calculatedAmount = 0;
    if (appointmentId) {
      const appointmentResult = await new sql.Request(transaction)
        .input('id_cita', sql.Int, appointmentId)
        .query(`
          SELECT c.id_cita, c.estado, s.precio_base
          FROM citas c WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN servicios s ON s.id_servicio = c.id_servicio
          WHERE c.id_cita = @id_cita
        `);
      if (!appointmentResult.recordset.length) {
        throw new PaymentError(404, 'La cita indicada no existe.');
      }
      if (appointmentResult.recordset[0].estado !== 'PENDIENTE') {
        throw new PaymentError(409, 'La cita ya no está pendiente de pago.');
      }
      calculatedAmount += Number(appointmentResult.recordset[0].precio_base);
    } else if (!productos.length) {
      throw new PaymentError(400, 'Una venta directa debe incluir al menos un producto.');
    }

    const normalizedItems = [];
    const usedProductIds = new Set();
    for (const rawItem of productos) {
      const productId = asPositiveInteger(rawItem.id_producto, 'id_producto');
      const quantity = asPositiveInteger(rawItem.cantidad, 'cantidad');
      if (usedProductIds.has(productId)) {
        throw new PaymentError(400, 'No se permiten productos duplicados.');
      }
      usedProductIds.add(productId);

      const productResult = await new sql.Request(transaction)
        .input('id_producto', sql.Int, productId)
        .query(`
          SELECT id_producto, nombre, precio_venta, stock_actual
          FROM productos WITH (UPDLOCK, HOLDLOCK)
          WHERE id_producto = @id_producto AND activo = 1
        `);
      if (!productResult.recordset.length) {
        throw new PaymentError(404, `El producto ${productId} no existe o está inactivo.`);
      }

      const product = productResult.recordset[0];
      if (Number(product.stock_actual) < quantity) {
        throw new PaymentError(409, `Stock insuficiente para ${product.nombre}.`);
      }

      const unitPrice = Number(product.precio_venta);
      calculatedAmount += unitPrice * quantity;
      normalizedItems.push({
        id_producto: productId,
        cantidad: quantity,
        precio_unitario: unitPrice,
        stock_anterior: Number(product.stock_actual),
      });
    }

    calculatedAmount = Number(calculatedAmount.toFixed(2));
    if (calculatedAmount <= 0) {
      throw new PaymentError(400, 'El monto calculado debe ser mayor que cero.');
    }
    if (monto !== undefined && Math.abs(Number(monto) - calculatedAmount) > 0.009) {
      throw new PaymentError(
        409,
        `El total cambió. El monto actualizado es ₡${calculatedAmount.toLocaleString('es-CR')}.`,
        'MONTO_ACTUALIZADO',
      );
    }

    let gateway;
    let sinpeAccount = null;
    if (method.codigo === 'TARJETA') {
      const card = validateCardDetails(datos_pasarela);
      const cardResult = await new sql.Request(transaction)
        .input('numero_hash', sql.VarBinary(32), hashCardNumber(card.number))
        .query(`
          SELECT id_tarjeta, marca, banco, fecha_vencimiento, saldo, cvv_hash
          FROM tarjetas_simuladas WITH (UPDLOCK, HOLDLOCK)
          WHERE numero_hash = @numero_hash AND activa = 1
        `);

      const account = cardResult.recordset[0] || null;
      const credentialsMatch = Boolean(account) &&
        account.marca === card.brand &&
        formatDatabaseExpiry(account.fecha_vencimiento) === card.expiry &&
        secureBufferEquals(account.cvv_hash, hashCardCvv(card.number, datos_pasarela.cvv));
      const enoughBalance = credentialsMatch && Number(account.saldo) >= calculatedAmount;
      const approved = credentialsMatch && enoughBalance;

      gateway = {
        tipo: 'TARJETA',
        estado: approved ? 'APROBADA' : 'RECHAZADA',
        monto: calculatedAmount,
        codigo: approved ? createAuthorizationCode('CARD') : null,
        marca: card.brand,
        ultimosCuatro: card.lastFour,
        banco: account?.banco || null,
        idTarjeta: account?.id_tarjeta || null,
        mensaje: !account
          ? 'La tarjeta no está registrada en la entidad bancaria.'
          : !credentialsMatch
            ? 'El vencimiento o CVV no coincide con la información bancaria.'
            : approved
              ? 'Tarjeta autorizada y saldo debitado correctamente.'
              : 'Saldo insuficiente en la tarjeta.',
      };
    } else {
      const phone = normalizeSinpePhone(datos_pasarela.telefono);
      const accountResult = await new sql.Request(transaction)
        .input('telefono', sql.Char(8), phone)
        .query(`
          SELECT telefono, banco, saldo
          FROM cuentas_sinpe_simuladas WITH (UPDLOCK, HOLDLOCK)
          WHERE telefono = @telefono AND activo = 1
        `);

      sinpeAccount = accountResult.recordset[0] || null;
      const approved = Boolean(sinpeAccount) && Number(sinpeAccount.saldo) >= calculatedAmount;
      gateway = {
        tipo: 'SINPE',
        estado: approved ? 'APROBADA' : 'RECHAZADA',
        monto: calculatedAmount,
        codigo: approved ? createAuthorizationCode('SINPE') : null,
        telefono: phone,
        banco: sinpeAccount?.banco || null,
        mensaje: !sinpeAccount
          ? 'El teléfono no está vinculado a SINPE Móvil.'
          : approved
            ? 'Transferencia SINPE autorizada correctamente.'
            : 'Saldo insuficiente en la cuenta SINPE.',
      };
    }

    const gatewayTransactionId = await insertGatewayTransaction(transaction, gateway);
    if (gateway.estado === 'RECHAZADA') {
      await transaction.commit();
      return res.status(402).json({
        error: gateway.mensaje,
        codigo: 'TRANSACCION_RECHAZADA',
        id_transaccion: gatewayTransactionId,
      });
    }

    if (method.codigo === 'SINPE') {
      await new sql.Request(transaction)
        .input('telefono', sql.Char(8), gateway.telefono)
        .input('monto', sql.Decimal(12, 2), calculatedAmount)
        .query(`
          UPDATE cuentas_sinpe_simuladas
          SET saldo = saldo - @monto
          WHERE telefono = @telefono
        `);
    } else {
      await new sql.Request(transaction)
        .input('id_tarjeta', sql.Int, gateway.idTarjeta)
        .input('monto', sql.Decimal(12, 2), calculatedAmount)
        .query(`
          UPDATE tarjetas_simuladas
          SET saldo = saldo - @monto
          WHERE id_tarjeta = @id_tarjeta
        `);
    }

    const invoiceNumber = generateInvoiceNumber();
    const paymentResult = await new sql.Request(transaction)
      .input('numero_factura', sql.NVarChar(20), invoiceNumber)
      .input('id_cita', sql.Int, appointmentId)
      .input('id_usuario', sql.Int, userId)
      .input('id_metodo', sql.Int, methodId)
      .input('monto', sql.Decimal(10, 2), calculatedAmount)
      .input('numero_referencia', sql.NVarChar(100), gateway.codigo)
      .input('banco', sql.NVarChar(100), gateway.banco)
      .input('observaciones', sql.NVarChar(500), observationsOrNull(observaciones))
      .query(`
        INSERT INTO pagos
          (numero_factura, id_cita, id_usuario, id_metodo, monto,
           monto_recibido, cambio, numero_referencia, banco,
           observaciones, estado_pago, fecha_pago)
        OUTPUT INSERTED.id_pago
        VALUES
          (@numero_factura, @id_cita, @id_usuario, @id_metodo, @monto,
           NULL, NULL, @numero_referencia, @banco,
           @observaciones, 'COMPLETADO', GETDATE())
      `);
    const paymentId = paymentResult.recordset[0].id_pago;

    for (const item of normalizedItems) {
      await new sql.Request(transaction)
        .input('id_pago', sql.Int, paymentId)
        .input('id_producto', sql.Int, item.id_producto)
        .input('cantidad', sql.Int, item.cantidad)
        .input('precio_unitario', sql.Decimal(10, 2), item.precio_unitario)
        .query(`
          INSERT INTO detalles_pago (id_pago, id_producto, cantidad, precio_unitario)
          VALUES (@id_pago, @id_producto, @cantidad, @precio_unitario)
        `);

      await new sql.Request(transaction)
        .input('id_producto', sql.Int, item.id_producto)
        .input('cantidad', sql.Int, item.cantidad)
        .query(`
          UPDATE productos
          SET stock_actual = stock_actual - @cantidad
          WHERE id_producto = @id_producto
        `);

      await new sql.Request(transaction)
        .input('id_producto', sql.Int, item.id_producto)
        .input('id_cita', sql.Int, appointmentId)
        .input('id_usuario', sql.Int, userId)
        .input('cantidad', sql.Int, item.cantidad)
        .input('stock_anterior', sql.Int, item.stock_anterior)
        .input('stock_resultante', sql.Int, item.stock_anterior - item.cantidad)
        .input('motivo', sql.NVarChar(300), `Venta - ${invoiceNumber}`)
        .query(`
          INSERT INTO movimientos_inventario
            (id_producto, id_cita, id_usuario, tipo, cantidad,
             stock_anterior, stock_resultante, motivo)
          VALUES
            (@id_producto, @id_cita, @id_usuario, 'salida', @cantidad,
             @stock_anterior, @stock_resultante, @motivo)
        `);
    }

    if (appointmentId) {
      await new sql.Request(transaction)
        .input('id_cita', sql.Int, appointmentId)
        .query("UPDATE citas SET estado = 'COMPLETADA' WHERE id_cita = @id_cita");
    }

    await new sql.Request(transaction)
      .input('id_pago', sql.Int, paymentId)
      .input('id_transaccion', sql.BigInt, gatewayTransactionId)
      .query(`
        UPDATE transacciones_pasarela
        SET id_pago = @id_pago
        WHERE id_transaccion = @id_transaccion
      `);

    await transaction.commit();
    res.status(201).json({
      id_pago: paymentId,
      numero_factura: invoiceNumber,
      id_transaccion: gatewayTransactionId,
      codigo_autorizacion: gateway.codigo,
      metodo: method.codigo,
      marca_tarjeta: gateway.marca || null,
      banco: gateway.banco,
      mensaje: gateway.mensaje,
    });
  } catch (error) {
    await rollbackSafely(transaction);
    sendPaymentError(res, error);
  }
});

function observationsOrNull(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, 500) : null;
}

module.exports = router;
