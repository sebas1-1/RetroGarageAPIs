const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/categorias
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT id_categoria, nombre, tipo, descripcion, activo
              FROM categorias
              WHERE activo = 1
              ORDER BY tipo, nombre`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/categorias/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_categoria, nombre, tipo, descripcion, activo
              FROM categorias
              WHERE id_categoria = @id AND activo = 1`);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categoría' });
  }
});

// POST /api/categorias
router.post('/', async (req, res) => {
  try {
    const { nombre, tipo, descripcion } = req.body;
    if (!nombre || !tipo)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const result = await pool.request()
      .input('nombre',      sql.NVarChar, nombre)
      .input('tipo',        sql.NVarChar, tipo)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .query(`INSERT INTO categorias (nombre, tipo, descripcion)
              OUTPUT INSERTED.id_categoria
              VALUES (@nombre, @tipo, @descripcion)`);
    res.status(201).json({ id_categoria: result.recordset[0].id_categoria });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, tipo, descripcion } = req.body;
    if (!nombre || !tipo)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    await pool.request()
      .input('id',          sql.Int,      req.params.id)
      .input('nombre',      sql.NVarChar, nombre)
      .input('tipo',        sql.NVarChar, tipo)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .query(`UPDATE categorias SET
                nombre      = @nombre,
                tipo        = @tipo,
                descripcion = @descripcion
              WHERE id_categoria = @id`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// DELETE /api/categorias/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE categorias SET activo = 0 WHERE id_categoria = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;