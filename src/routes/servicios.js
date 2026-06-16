const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/servicios/categorias
router.get('/categorias', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT id_categoria, nombre FROM categorias
              WHERE tipo = 'Servicio' AND activo = 1
              ORDER BY nombre`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/servicios?buscar=...
router.get('/', async (req, res) => {
  try {
    const { buscar } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let query = `
      SELECT s.id_servicio, s.id_categoria, c.nombre AS categoria,
             s.nombre, s.precio_base, s.activo
      FROM servicios s
      INNER JOIN categorias c ON s.id_categoria = c.id_categoria
      WHERE s.activo = 1
    `;
    if (buscar) {
      request.input('buscar', sql.NVarChar, `%${buscar}%`);
      query += ` AND (s.nombre LIKE @buscar OR c.nombre LIKE @buscar)`;
    }
    query += ' ORDER BY c.nombre, s.nombre';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// GET /api/servicios/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT s.id_servicio, s.id_categoria, c.nombre AS categoria,
               s.nombre, s.precio_base, s.activo
        FROM servicios s
        INNER JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.id_servicio = @id AND s.activo = 1
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicio' });
  }
});

// POST /api/servicios
router.post('/', async (req, res) => {
  try {
    const { id_categoria, nombre, precio_base } = req.body;
    if (!id_categoria || !nombre || precio_base === undefined)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const result = await pool.request()
      .input('id_categoria', sql.Int,      id_categoria)
      .input('nombre',       sql.NVarChar, nombre)
      .input('precio_base',  sql.Decimal,  precio_base)
      .query(`
        INSERT INTO servicios (id_categoria, nombre, precio_base)
        OUTPUT INSERTED.id_servicio
        VALUES (@id_categoria, @nombre, @precio_base)
      `);
    res.status(201).json({ id_servicio: result.recordset[0].id_servicio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

// PUT /api/servicios/:id
router.put('/:id', async (req, res) => {
  try {
    const { id_categoria, nombre, precio_base } = req.body;
    if (!id_categoria || !nombre || precio_base === undefined)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    await pool.request()
      .input('id',           sql.Int,      req.params.id)
      .input('id_categoria', sql.Int,      id_categoria)
      .input('nombre',       sql.NVarChar, nombre)
      .input('precio_base',  sql.Decimal,  precio_base)
      .query(`
        UPDATE servicios SET
          id_categoria = @id_categoria,
          nombre       = @nombre,
          precio_base  = @precio_base
        WHERE id_servicio = @id
      `);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar servicio' });
  }
});

// DELETE /api/servicios/:id — baja lógica
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE servicios SET activo = 0 WHERE id_servicio = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

module.exports = router;