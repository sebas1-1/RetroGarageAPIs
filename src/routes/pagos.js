const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/pagos
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT p.id_pago, p.numero_factura, p.id_cita, p.id_usuario,
               p.id_metodo, m.nombre AS metodo_pago,
               p.monto, p.monto_recibido, p.cambio,
               p.numero_referencia, p.banco,
               p.observaciones, p.estado_pago, p.fecha_pago,
               c.marca_vehiculo, c.modelo_vehiculo,
               cl.nombre + ' ' + cl.apellido AS cliente
        FROM pagos p
        INNER JOIN metodos_pago m ON m.id_metodo = p.id_metodo
        LEFT  JOIN citas c        ON c.id_cita   = p.id_cita
        LEFT  JOIN clientes cl    ON cl.id_cliente = c.id_cliente
        ORDER BY p.fecha_pago DESC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// GET /api/pagos/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT p.id_pago, p.numero_factura, p.id_cita, p.id_usuario,
               p.id_metodo, m.nombre AS metodo_pago,
               p.monto, p.monto_recibido, p.cambio,
               p.numero_referencia, p.banco,
               p.observaciones, p.estado_pago, p.fecha_pago
        FROM pagos p
        INNER JOIN metodos_pago m ON m.id_metodo = p.id_metodo
        WHERE p.id_pago = @id
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pago' });
  }
});

// GET /api/pagos/metodos  — lista métodos de pago
router.get('/metodos/lista', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT id_metodo, nombre, requiere_referencia
              FROM metodos_pago WHERE activo = 1`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener métodos de pago' });
  }
});

// POST /api/pagos
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    const {
      id_cita,           // null si es venta directa
      id_usuario,
      id_metodo,
      monto,
      monto_recibido,
      cambio,
      numero_referencia,
      banco,
      observaciones,
      productos,         // [{ id_producto, cantidad, precio_unitario }]
    } = req.body;

    if (!id_usuario || !id_metodo || !monto || !productos)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    await transaction.begin();
    const req2 = new sql.Request(transaction);

    // Generar número de factura
    const facturaResult = await req2
      .query(`SELECT TOP 1 numero_factura FROM pagos ORDER BY id_pago DESC`);

    let nextNum = 1;
    if (facturaResult.recordset.length) {
      const last = facturaResult.recordset[0].numero_factura;
      const num = parseInt(last.replace('FACTURA-', ''), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }
    const numero_factura = `FACTURA-${String(nextNum).padStart(3, '0')}`;

    // Insertar pago
    const pagoResult = await new sql.Request(transaction)
      .input('numero_factura',    sql.NVarChar,      numero_factura)
      .input('id_cita',           sql.Int,           id_cita || null)
      .input('id_usuario',        sql.Int,           id_usuario)
      .input('id_metodo',         sql.Int,           id_metodo)
      .input('monto',             sql.Decimal(10,2), monto)
      .input('monto_recibido',    sql.Decimal(10,2), monto_recibido || null)
      .input('cambio',            sql.Decimal(10,2), cambio || null)
      .input('numero_referencia', sql.NVarChar,      numero_referencia || null)
      .input('banco',             sql.NVarChar,      banco || null)
      .input('observaciones',     sql.NVarChar,      observaciones || null)
      .query(`
        INSERT INTO pagos
          (numero_factura, id_cita, id_usuario, id_metodo, monto,
           monto_recibido, cambio, numero_referencia, banco, observaciones)
        OUTPUT INSERTED.id_pago
        VALUES
          (@numero_factura, @id_cita, @id_usuario, @id_metodo, @monto,
           @monto_recibido, @cambio, @numero_referencia, @banco, @observaciones)
      `);

    const id_pago = pagoResult.recordset[0].id_pago;

    // Descontar stock de productos
    for (const item of productos) {
      // Obtener stock actual
      const stockResult = await new sql.Request(transaction)
        .input('id_producto', sql.Int, item.id_producto)
        .query(`SELECT stock_actual FROM productos WHERE id_producto = @id_producto`);

      const stock_anterior = stockResult.recordset[0].stock_actual;
      const stock_resultante = stock_anterior - item.cantidad;

      // Actualizar stock
      await new sql.Request(transaction)
        .input('id_producto', sql.Int, item.id_producto)
        .input('cantidad',    sql.Int, item.cantidad)
        .query(`UPDATE productos SET stock_actual = stock_actual - @cantidad
                WHERE id_producto = @id_producto`);

      // Registrar movimiento
      await new sql.Request(transaction)
        .input('id_producto',      sql.Int,      item.id_producto)
        .input('id_cita',          sql.Int,      id_cita || null)
        .input('id_usuario',       sql.Int,      id_usuario)
        .input('cantidad',         sql.Int,      item.cantidad)
        .input('stock_anterior',   sql.Int,      stock_anterior)
        .input('stock_resultante', sql.Int,      stock_resultante)
        .input('motivo',           sql.NVarChar, `Venta - ${numero_factura}`)
        .query(`
          INSERT INTO movimientos_inventario
            (id_producto, id_cita, id_usuario, tipo, cantidad,
             stock_anterior, stock_resultante, motivo)
          VALUES
            (@id_producto, @id_cita, @id_usuario, 'salida', @cantidad,
             @stock_anterior, @stock_resultante, @motivo)
        `);
    }

    // Si tiene cita, marcarla como COMPLETADA
    if (id_cita) {
      await new sql.Request(transaction)
        .input('id_cita', sql.Int, id_cita)
        .query(`UPDATE citas SET estado = 'COMPLETADA' WHERE id_cita = @id_cita`);
    }

    await transaction.commit();
    res.status(201).json({ id_pago, numero_factura });

  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

module.exports = router;