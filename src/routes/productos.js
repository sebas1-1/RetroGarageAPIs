const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/productos
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT p.id_producto, p.id_categoria, c.nombre AS categoria_nombre,
                     p.nombre, p.codigo_item, p.precio_venta, p.precio_costo,
                     p.stock_actual, p.stock_minimo, p.unidad_medida,
                     p.proveedor, p.activo
              FROM productos p
              INNER JOIN categorias c ON c.id_categoria = p.id_categoria
              WHERE p.activo = 1
              ORDER BY c.nombre, p.nombre`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT p.id_producto, p.id_categoria, c.nombre AS categoria_nombre,
                     p.nombre, p.codigo_item, p.precio_venta, p.precio_costo,
                     p.stock_actual, p.stock_minimo, p.unidad_medida,
                     p.proveedor, p.activo
              FROM productos p
              INNER JOIN categorias c ON c.id_categoria = p.id_categoria
              WHERE p.id_producto = @id AND p.activo = 1`);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// POST /api/productos
router.post('/', async (req, res) => {
  try {
    const {
      id_categoria, nombre, codigo_item,
      precio_venta, precio_costo,
      stock_actual, stock_minimo,
      unidad_medida, proveedor
    } = req.body;

    if (!id_categoria || !nombre || !codigo_item || precio_venta == null || precio_costo == null || stock_actual == null || stock_minimo == null || !unidad_medida)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const result = await pool.request()
      .input('id_categoria',  sql.Int,        id_categoria)
      .input('nombre',        sql.NVarChar,   nombre)
      .input('codigo_item',   sql.NVarChar,   codigo_item)
      .input('precio_venta',  sql.Decimal(10,2), precio_venta)
      .input('precio_costo',  sql.Decimal(10,2), precio_costo)
      .input('stock_actual',  sql.Int,        stock_actual)
      .input('stock_minimo',  sql.Int,        stock_minimo)
      .input('unidad_medida', sql.NVarChar,   unidad_medida)
      .input('proveedor',     sql.NVarChar,   proveedor || null)
      .query(`INSERT INTO productos
                (id_categoria, nombre, codigo_item, precio_venta, precio_costo,
                 stock_actual, stock_minimo, unidad_medida, proveedor)
              OUTPUT INSERTED.id_producto
              VALUES
                (@id_categoria, @nombre, @codigo_item, @precio_venta, @precio_costo,
                 @stock_actual, @stock_minimo, @unidad_medida, @proveedor)`);

    res.status(201).json({ id_producto: result.recordset[0].id_producto });
  } catch (err) {
    if (err.number === 2627)
      return res.status(400).json({ error: 'El código interno ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/productos/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      id_categoria, nombre, codigo_item,
      precio_venta, precio_costo,
      stock_actual, stock_minimo,
      unidad_medida, proveedor
    } = req.body;

    if (!id_categoria || !nombre || !codigo_item || precio_venta == null || precio_costo == null || stock_actual == null || stock_minimo == null || !unidad_medida)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    await pool.request()
      .input('id',            sql.Int,           req.params.id)
      .input('id_categoria',  sql.Int,           id_categoria)
      .input('nombre',        sql.NVarChar,      nombre)
      .input('codigo_item',   sql.NVarChar,      codigo_item)
      .input('precio_venta',  sql.Decimal(10,2), precio_venta)
      .input('precio_costo',  sql.Decimal(10,2), precio_costo)
      .input('stock_actual',  sql.Int,           stock_actual)
      .input('stock_minimo',  sql.Int,           stock_minimo)
      .input('unidad_medida', sql.NVarChar,      unidad_medida)
      .input('proveedor',     sql.NVarChar,      proveedor || null)
      .query(`UPDATE productos SET
                id_categoria  = @id_categoria,
                nombre        = @nombre,
                codigo_item   = @codigo_item,
                precio_venta  = @precio_venta,
                precio_costo  = @precio_costo,
                stock_actual  = @stock_actual,
                stock_minimo  = @stock_minimo,
                unidad_medida = @unidad_medida,
                proveedor     = @proveedor
              WHERE id_producto = @id`);
    res.json({ ok: true });
  } catch (err) {
    if (err.number === 2627)
      return res.status(400).json({ error: 'El código interno ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// PATCH /api/productos/:id/agotado
router.patch('/:id/agotado', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE productos SET stock_actual = 0 WHERE id_producto = @id`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al marcar producto como agotado' });
  }
});

// DELETE /api/productos/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE productos SET activo = 0 WHERE id_producto = @id`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router;