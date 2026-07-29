const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const {
  ExchangeRateError,
  getExchangeRate,
} = require('../exchangeRateService');
const {
  PayPalApiError,
  captureOrder,
  createOrder,
  findApprovalUrl,
  getOrder,
} = require('../paypalClient');

class PayPalPaymentError extends Error {
  constructor(status, message, code = 'PAGO_PAYPAL_INVALIDO') {
    super(message);
    this.name = 'PayPalPaymentError';
    this.status = status;
    this.code = code;
  }
}

const asPositiveInteger = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PayPalPaymentError(
      400,
      `${field} debe ser un entero mayor que cero.`,
    );
  }
  return parsed;
};

const asReference = (value) => {
  const normalized = String(value || '').trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new PayPalPaymentError(400, 'La referencia de PayPal no es válida.');
  }
  return normalized;
};

const observationsOrNull = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, 500) : null;
};

const getConversionConfig = async () => {
  const currency = String(process.env.PAYPAL_CURRENCY || 'USD').toUpperCase();
  if (currency !== 'USD') {
    throw new PayPalPaymentError(
      500,
      'Esta integración de PayPal debe utilizar USD.',
      'PAYPAL_CONFIG_ERROR',
    );
  }
  const exchangeRate = await getExchangeRate();
  return {
    rate: exchangeRate.venta,
    buyRate: exchangeRate.compra,
    rateDate: exchangeRate.fecha,
    rateSource: exchangeRate.fuente,
    isFallback: exchangeRate.es_respaldo,
    currency,
  };
};

const convertCrcToUsd = (amountCrc, rate) => {
  const amountUsd = Number((amountCrc / rate).toFixed(2));
  if (amountUsd < 0.01) {
    throw new PayPalPaymentError(
      400,
      'El monto es demasiado bajo para procesarlo con PayPal.',
    );
  }
  return amountUsd;
};

const buildCallbackUrl = (baseUrl, params) => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const rollbackSafely = async (transaction) => {
  if (!transaction || transaction._aborted) return;
  try {
    await transaction.rollback();
  } catch {
    // Puede haberse cerrado por un error de SQL Server.
  }
};

const getPayPalIssues = (error) =>
  (error?.details || [])
    .map((detail) => detail?.issue)
    .filter(Boolean);

const isFinalPayPalRejection = (error) => {
  if (!(error instanceof PayPalApiError)) return false;
  const issues = getPayPalIssues(error);
  return issues.some((issue) =>
    ['INSTRUMENT_DECLINED', 'TRANSACTION_REFUSED', 'PAYMENT_DENIED'].includes(
      issue,
    ),
  );
};

const sendError = (res, error) => {
  if (error instanceof ExchangeRateError) {
    return res.status(503).json({
      error: 'No fue posible obtener el tipo de cambio.',
      codigo: error.code,
    });
  }
  if (error instanceof PayPalPaymentError) {
    return res.status(error.status).json({
      error: error.message,
      codigo: error.code,
    });
  }
  if (error instanceof PayPalApiError) {
    if (error.debugId) {
      console.error(`PayPal debug_id: ${error.debugId}; código: ${error.code}`);
    }
    const issues = getPayPalIssues(error);
    if (issues.includes('INSTRUMENT_DECLINED')) {
      return res.status(402).json({
        error:
          'PayPal rechazó la fuente de fondos. Selecciona otro saldo, tarjeta o cuenta bancaria.',
        codigo: 'INSTRUMENT_DECLINED',
      });
    }
    if (
      issues.includes('TRANSACTION_REFUSED') ||
      issues.includes('PAYMENT_DENIED')
    ) {
      return res.status(402).json({
        error: 'PayPal rechazó el pago. Utiliza otra forma de pago.',
        codigo: issues[0],
      });
    }
    const notApproved =
      issues.includes('ORDER_NOT_APPROVED') ||
      error.code === 'PAYER_ACTION_REQUIRED';
    return res.status(notApproved ? 409 : 502).json({
      error: notApproved
        ? 'La orden todavía no ha sido aprobada en PayPal.'
        : 'PayPal no pudo procesar la solicitud. Intenta nuevamente.',
      codigo: error.code,
    });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error al procesar el pago con PayPal' });
};

const calculatePurchase = async (transaction, payload) => {
  const userId = asPositiveInteger(payload.id_usuario, 'id_usuario');
  const methodId = asPositiveInteger(payload.id_metodo, 'id_metodo');
  const appointmentId =
    payload.id_cita === null ||
    payload.id_cita === undefined ||
    payload.id_cita === ''
      ? null
      : asPositiveInteger(payload.id_cita, 'id_cita');
  const products = payload.productos ?? [];

  if (!Array.isArray(products)) {
    throw new PayPalPaymentError(400, 'productos debe ser una lista.');
  }

  const userResult = await new sql.Request(transaction)
    .input('id_usuario', sql.Int, userId)
    .query('SELECT id_usuario FROM usuarios WHERE id_usuario = @id_usuario');
  if (!userResult.recordset.length) {
    throw new PayPalPaymentError(400, 'El usuario indicado no existe.');
  }

  const methodResult = await new sql.Request(transaction)
    .input('id_metodo', sql.Int, methodId)
    .query(`
      SELECT id_metodo
      FROM metodos_pago
      WHERE id_metodo = @id_metodo
        AND codigo = 'PAYPAL'
        AND activo = 1
    `);
  if (!methodResult.recordset.length) {
    throw new PayPalPaymentError(
      400,
      'El método PayPal no está habilitado.',
    );
  }

  let serviceAmount = 0;
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
      throw new PayPalPaymentError(404, 'La cita indicada no existe.');
    }
    if (appointmentResult.recordset[0].estado !== 'PENDIENTE') {
      throw new PayPalPaymentError(
        409,
        'La cita ya no está pendiente de pago.',
      );
    }
    serviceAmount = Number(appointmentResult.recordset[0].precio_base);
  } else if (!products.length) {
    throw new PayPalPaymentError(
      400,
      'Una venta directa debe incluir al menos un producto.',
    );
  }

  let totalAmount = serviceAmount;
  const normalizedItems = [];
  const usedProductIds = new Set();

  for (const rawItem of products) {
    const productId = asPositiveInteger(rawItem.id_producto, 'id_producto');
    const quantity = asPositiveInteger(rawItem.cantidad, 'cantidad');
    if (usedProductIds.has(productId)) {
      throw new PayPalPaymentError(
        400,
        'No se permiten productos duplicados.',
      );
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
      throw new PayPalPaymentError(
        404,
        `El producto ${productId} no existe o está inactivo.`,
      );
    }

    const product = productResult.recordset[0];
    if (Number(product.stock_actual) < quantity) {
      throw new PayPalPaymentError(
        409,
        `Stock insuficiente para ${product.nombre}.`,
      );
    }

    const unitPrice = Number(product.precio_venta);
    totalAmount += unitPrice * quantity;
    normalizedItems.push({
      id_producto: productId,
      cantidad: quantity,
      precio_unitario: unitPrice,
    });
  }

  totalAmount = Number(totalAmount.toFixed(2));
  if (totalAmount <= 0) {
    throw new PayPalPaymentError(
      400,
      'El monto calculado debe ser mayor que cero.',
    );
  }
  if (
    payload.monto !== undefined &&
    Math.abs(Number(payload.monto) - totalAmount) > 0.009
  ) {
    throw new PayPalPaymentError(
      409,
      `El total cambió. El monto actualizado es ₡${totalAmount.toLocaleString('es-CR')}.`,
      'MONTO_ACTUALIZADO',
    );
  }

  return {
    userId,
    methodId,
    appointmentId,
    serviceAmount,
    totalAmount,
    items: normalizedItems,
    observations: observationsOrNull(payload.observaciones),
  };
};

const markOrderAsFailed = async (pool, reference) => {
  try {
    await pool.request()
      .input('referencia', sql.UniqueIdentifier, reference)
      .query(`
        UPDATE ordenes_paypal
        SET estado = 'FALLIDA',
            fecha_actualizacion = SYSDATETIME()
        WHERE referencia_local = @referencia
          AND estado = 'CREANDO'
      `);
  } catch (error) {
    console.error('No se pudo marcar la orden PayPal como fallida:', error);
  }
};

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
    return sendError(res, error);
  }
});

router.post('/ordenes', async (req, res) => {
  let transaction;
  let localReference = null;
  let pool;

  try {
    const conversion = await getConversionConfig();
    pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const purchase = await calculatePurchase(transaction, req.body);
    const amountUsd = convertCrcToUsd(
      purchase.totalAmount,
      conversion.rate,
    );

    const orderResult = await new sql.Request(transaction)
      .input('id_usuario', sql.Int, purchase.userId)
      .input('id_cita', sql.Int, purchase.appointmentId)
      .input('id_metodo', sql.Int, purchase.methodId)
      .input(
        'monto_servicio_crc',
        sql.Decimal(12, 2),
        purchase.serviceAmount,
      )
      .input('monto_crc', sql.Decimal(12, 2), purchase.totalAmount)
      .input('tasa_crc_usd', sql.Decimal(12, 4), conversion.rate)
      .input(
        'tasa_compra_crc_usd',
        sql.Decimal(12, 4),
        conversion.buyRate,
      )
      .input('tipo_cambio_fecha', sql.Date, conversion.rateDate)
      .input(
        'tipo_cambio_fuente',
        sql.NVarChar(50),
        conversion.rateSource,
      )
      .input('monto_usd', sql.Decimal(12, 2), amountUsd)
      .input('moneda', sql.Char(3), conversion.currency)
      .input('observaciones', sql.NVarChar(500), purchase.observations)
      .query(`
        INSERT INTO ordenes_paypal
          (id_usuario, id_cita, id_metodo, monto_servicio_crc, monto_crc,
           tasa_crc_usd, tasa_compra_crc_usd, tipo_cambio_fecha,
           tipo_cambio_fuente, monto_usd, moneda, observaciones, estado)
        OUTPUT INSERTED.id_orden, INSERTED.referencia_local
        VALUES
          (@id_usuario, @id_cita, @id_metodo, @monto_servicio_crc, @monto_crc,
           @tasa_crc_usd, @tasa_compra_crc_usd, @tipo_cambio_fecha,
           @tipo_cambio_fuente, @monto_usd, @moneda, @observaciones, 'CREANDO')
      `);

    const localOrder = orderResult.recordset[0];
    localReference = String(localOrder.referencia_local);

    for (const item of purchase.items) {
      await new sql.Request(transaction)
        .input('id_orden', sql.BigInt, localOrder.id_orden)
        .input('id_producto', sql.Int, item.id_producto)
        .input('cantidad', sql.Int, item.cantidad)
        .input(
          'precio_unitario_crc',
          sql.Decimal(10, 2),
          item.precio_unitario,
        )
        .query(`
          INSERT INTO detalles_orden_paypal
            (id_orden, id_producto, cantidad, precio_unitario_crc)
          VALUES
            (@id_orden, @id_producto, @cantidad, @precio_unitario_crc)
        `);
    }

    await transaction.commit();
    transaction = null;

    const returnBase =
      process.env.PAYPAL_RETURN_URL ||
      'http://localhost:8081/pagos/paypal-retorno';
    const cancelBase =
      process.env.PAYPAL_CANCEL_URL ||
      'http://localhost:8081/pagos/paypal-retorno';
    const returnUrl = buildCallbackUrl(returnBase, {
      orden: localReference,
    });
    const cancelUrl = buildCallbackUrl(cancelBase, {
      orden: localReference,
      cancelado: 1,
    });
    const requestId = `crt-${localReference.replaceAll('-', '')}`;

    const paypalOrder = await createOrder({
      value: amountUsd.toFixed(2),
      currency: conversion.currency,
      referenceId: localReference,
      description: 'Pago en Retro Garage',
      returnUrl,
      cancelUrl,
      requestId,
    });
    const approvalUrl = findApprovalUrl(paypalOrder);
    if (!paypalOrder.id || !approvalUrl) {
      throw new PayPalPaymentError(
        502,
        'PayPal no devolvió un enlace de aprobación.',
        'PAYPAL_INVALID_RESPONSE',
      );
    }

    await pool.request()
      .input('referencia', sql.UniqueIdentifier, localReference)
      .input('paypal_order_id', sql.NVarChar(64), paypalOrder.id)
      .query(`
        UPDATE ordenes_paypal
        SET paypal_order_id = @paypal_order_id,
            estado = 'PENDIENTE',
            fecha_actualizacion = SYSDATETIME()
        WHERE referencia_local = @referencia
          AND estado = 'CREANDO'
      `);

    return res.status(201).json({
      referencia: localReference,
      paypal_order_id: paypalOrder.id,
      url_aprobacion: approvalUrl,
      monto_crc: purchase.totalAmount,
      monto_usd: amountUsd,
      moneda: conversion.currency,
      tipo_cambio: {
        compra: conversion.buyRate,
        venta: conversion.rate,
        fecha: conversion.rateDate,
        fuente: conversion.rateSource,
        es_respaldo: conversion.isFallback,
      },
    });
  } catch (error) {
    await rollbackSafely(transaction);
    if (localReference && pool) {
      await markOrderAsFailed(pool, localReference);
    }
    return sendError(res, error);
  }
});

const extractCompletedCapture = (paypalOrder) => {
  const captures = (paypalOrder.purchase_units || []).flatMap(
    (unit) => unit.payments?.captures || [],
  );
  return captures.find((capture) => capture.status === 'COMPLETED') || null;
};

const captureOrReadCompletedOrder = async (paypalOrderId, requestId) => {
  try {
    return await captureOrder(paypalOrderId, requestId);
  } catch (error) {
    if (!(error instanceof PayPalApiError) || error.status !== 422) {
      throw error;
    }
    const currentOrder = await getOrder(paypalOrderId);
    if (currentOrder.status !== 'COMPLETED') {
      throw error;
    }
    return currentOrder;
  }
};

router.post('/ordenes/:referencia/capturar', async (req, res) => {
  let transaction;
  let reference = null;
  let pool;

  try {
    reference = asReference(req.params.referencia);
    const receivedPayPalOrderId = String(
      req.body?.paypal_order_id || '',
    ).trim();
    if (!receivedPayPalOrderId) {
      throw new PayPalPaymentError(400, 'Falta el identificador de PayPal.');
    }

    pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const orderResult = await new sql.Request(transaction)
      .input('referencia', sql.UniqueIdentifier, reference)
      .query(`
        SELECT op.*, p.numero_factura
        FROM ordenes_paypal op WITH (UPDLOCK, HOLDLOCK)
        LEFT JOIN pagos p ON p.id_pago = op.id_pago
        WHERE op.referencia_local = @referencia
      `);
    if (!orderResult.recordset.length) {
      throw new PayPalPaymentError(404, 'La orden PayPal no existe.');
    }

    const order = orderResult.recordset[0];
    if (order.paypal_order_id !== receivedPayPalOrderId) {
      throw new PayPalPaymentError(
        409,
        'La orden recibida no coincide con la orden iniciada.',
      );
    }
    if (order.estado === 'CAPTURADA') {
      await transaction.commit();
      return res.json({
        id_pago: order.id_pago,
        numero_factura: order.numero_factura,
        paypal_order_id: order.paypal_order_id,
        paypal_capture_id: order.paypal_capture_id,
        metodo: 'PAYPAL',
        mensaje: 'El pago ya se encontraba confirmado.',
      });
    }
    if (order.estado !== 'PENDIENTE') {
      throw new PayPalPaymentError(
        409,
        `La orden PayPal se encuentra ${String(order.estado).toLowerCase()}.`,
      );
    }

    if (order.id_cita) {
      const appointmentResult = await new sql.Request(transaction)
        .input('id_cita', sql.Int, order.id_cita)
        .query(`
          SELECT id_cita, estado
          FROM citas WITH (UPDLOCK, HOLDLOCK)
          WHERE id_cita = @id_cita
        `);
      if (
        !appointmentResult.recordset.length ||
        appointmentResult.recordset[0].estado !== 'PENDIENTE'
      ) {
        throw new PayPalPaymentError(
          409,
          'La cita ya no está pendiente de pago.',
        );
      }
    }

    const itemResult = await new sql.Request(transaction)
      .input('id_orden', sql.BigInt, order.id_orden)
      .query(`
        SELECT id_producto, cantidad, precio_unitario_crc
        FROM detalles_orden_paypal
        WHERE id_orden = @id_orden
        ORDER BY id_detalle
      `);

    const lockedItems = [];
    for (const item of itemResult.recordset) {
      const productResult = await new sql.Request(transaction)
        .input('id_producto', sql.Int, item.id_producto)
        .query(`
          SELECT id_producto, nombre, stock_actual
          FROM productos WITH (UPDLOCK, HOLDLOCK)
          WHERE id_producto = @id_producto AND activo = 1
        `);
      if (!productResult.recordset.length) {
        throw new PayPalPaymentError(
          409,
          `El producto ${item.id_producto} ya no está disponible.`,
        );
      }
      const product = productResult.recordset[0];
      if (Number(product.stock_actual) < Number(item.cantidad)) {
        throw new PayPalPaymentError(
          409,
          `Stock insuficiente para ${product.nombre}. No se realizó el cobro.`,
        );
      }
      lockedItems.push({
        id_producto: Number(item.id_producto),
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario_crc),
        stock_anterior: Number(product.stock_actual),
      });
    }

    const requestId = `cap-${reference.replaceAll('-', '')}`;
    const paypalOrder = await captureOrReadCompletedOrder(
      order.paypal_order_id,
      requestId,
    );
    const capture = extractCompletedCapture(paypalOrder);
    if (!capture || paypalOrder.status !== 'COMPLETED') {
      throw new PayPalPaymentError(
        502,
        'PayPal no confirmó la captura del pago.',
        'PAYPAL_CAPTURE_NOT_COMPLETED',
      );
    }

    const capturedCurrency = capture.amount?.currency_code;
    const capturedAmount = Number(capture.amount?.value);
    if (
      capturedCurrency !== order.moneda ||
      Math.abs(capturedAmount - Number(order.monto_usd)) > 0.009
    ) {
      throw new PayPalPaymentError(
        502,
        'El monto confirmado por PayPal no coincide con la orden.',
        'PAYPAL_AMOUNT_MISMATCH',
      );
    }

    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const suffix = reference.replaceAll('-', '').slice(0, 6).toUpperCase();
    const invoiceNumber = `FACT-${localDate}-${suffix}`;

    const paymentResult = await new sql.Request(transaction)
      .input('numero_factura', sql.NVarChar(20), invoiceNumber)
      .input('id_cita', sql.Int, order.id_cita)
      .input('id_usuario', sql.Int, order.id_usuario)
      .input('id_metodo', sql.Int, order.id_metodo)
      .input('monto', sql.Decimal(10, 2), order.monto_crc)
      .input('numero_referencia', sql.NVarChar(100), capture.id)
      .input('banco', sql.NVarChar(100), 'PayPal')
      .input('observaciones', sql.NVarChar(500), order.observaciones)
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

    for (const item of lockedItems) {
      await new sql.Request(transaction)
        .input('id_pago', sql.Int, paymentId)
        .input('id_producto', sql.Int, item.id_producto)
        .input('cantidad', sql.Int, item.cantidad)
        .input(
          'precio_unitario',
          sql.Decimal(10, 2),
          item.precio_unitario,
        )
        .query(`
          INSERT INTO detalles_pago
            (id_pago, id_producto, cantidad, precio_unitario)
          VALUES
            (@id_pago, @id_producto, @cantidad, @precio_unitario)
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
        .input('id_cita', sql.Int, order.id_cita)
        .input('id_usuario', sql.Int, order.id_usuario)
        .input('cantidad', sql.Int, item.cantidad)
        .input('stock_anterior', sql.Int, item.stock_anterior)
        .input(
          'stock_resultante',
          sql.Int,
          item.stock_anterior - item.cantidad,
        )
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

    if (order.id_cita) {
      await new sql.Request(transaction)
        .input('id_cita', sql.Int, order.id_cita)
        .query(`
          UPDATE citas
          SET estado = 'COMPLETADA'
          WHERE id_cita = @id_cita
        `);
    }

    const gatewayResult = await new sql.Request(transaction)
      .input('id_pago', sql.Int, paymentId)
      .input('tipo', sql.NVarChar(10), 'PAYPAL')
      .input('estado', sql.NVarChar(15), 'APROBADA')
      .input('monto', sql.Decimal(12, 2), order.monto_crc)
      .input('codigo', sql.NVarChar(64), capture.id)
      .input('banco', sql.NVarChar(100), 'PayPal')
      .input('mensaje', sql.NVarChar(250), 'Pago autorizado correctamente.')
      .input(
        'paypal_order_id',
        sql.NVarChar(64),
        order.paypal_order_id,
      )
      .input('moneda_externa', sql.Char(3), order.moneda)
      .input('monto_externo', sql.Decimal(12, 2), order.monto_usd)
      .query(`
        INSERT INTO transacciones_pasarela
          (id_pago, tipo, estado, monto, codigo_autorizacion, banco, mensaje,
           paypal_order_id, moneda_externa, monto_externo)
        OUTPUT INSERTED.id_transaccion
        VALUES
          (@id_pago, @tipo, @estado, @monto, @codigo, @banco, @mensaje,
           @paypal_order_id, @moneda_externa, @monto_externo)
      `);

    await new sql.Request(transaction)
      .input('id_orden', sql.BigInt, order.id_orden)
      .input('id_pago', sql.Int, paymentId)
      .input('paypal_capture_id', sql.NVarChar(64), capture.id)
      .query(`
        UPDATE ordenes_paypal
        SET id_pago = @id_pago,
            paypal_capture_id = @paypal_capture_id,
            estado = 'CAPTURADA',
            fecha_captura = SYSDATETIME(),
            fecha_actualizacion = SYSDATETIME()
        WHERE id_orden = @id_orden
      `);

    await transaction.commit();
    return res.status(201).json({
      id_pago: paymentId,
      numero_factura: invoiceNumber,
      id_transaccion: gatewayResult.recordset[0].id_transaccion,
      paypal_order_id: order.paypal_order_id,
      paypal_capture_id: capture.id,
      metodo: 'PAYPAL',
      monto_crc: Number(order.monto_crc),
      monto_usd: Number(order.monto_usd),
      moneda: order.moneda,
      mensaje: 'Pago autorizado correctamente.',
    });
  } catch (error) {
    await rollbackSafely(transaction);
    if (reference && pool && isFinalPayPalRejection(error)) {
      try {
        await pool.request()
          .input('referencia', sql.UniqueIdentifier, reference)
          .query(`
            UPDATE ordenes_paypal
            SET estado = 'FALLIDA',
                fecha_actualizacion = SYSDATETIME()
            WHERE referencia_local = @referencia
              AND estado = 'PENDIENTE'
          `);
      } catch (updateError) {
        console.error(
          'No se pudo marcar la orden PayPal como fallida:',
          updateError,
        );
      }
    }
    return sendError(res, error);
  }
});

router.post('/ordenes/:referencia/cancelar', async (req, res) => {
  try {
    const reference = asReference(req.params.referencia);
    const pool = await getPool();
    const result = await pool.request()
      .input('referencia', sql.UniqueIdentifier, reference)
      .query(`
        UPDATE ordenes_paypal
        SET estado = 'CANCELADA',
            fecha_actualizacion = SYSDATETIME()
        OUTPUT INSERTED.estado
        WHERE referencia_local = @referencia
          AND estado IN ('CREANDO', 'PENDIENTE')
      `);

    if (!result.recordset.length) {
      const current = await pool.request()
        .input('referencia', sql.UniqueIdentifier, reference)
        .query(`
          SELECT estado
          FROM ordenes_paypal
          WHERE referencia_local = @referencia
        `);
      if (!current.recordset.length) {
        throw new PayPalPaymentError(404, 'La orden PayPal no existe.');
      }
      return res.json({ estado: current.recordset[0].estado });
    }

    return res.json({ estado: result.recordset[0].estado });
  } catch (error) {
    return sendError(res, error);
  }
});

module.exports = router;
module.exports.convertCrcToUsd = convertCrcToUsd;
