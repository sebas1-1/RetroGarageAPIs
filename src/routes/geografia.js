const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

router.get('/paises', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id_pais AS id, descripcion
      FROM paises WHERE activo = 1 ORDER BY descripcion
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener países' });
  }
});

router.get('/paises/:id/provincias', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_provincia AS id, descripcion FROM provincias WHERE activo = 1 AND id_pais = @id ORDER BY descripcion`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener provincias' });
  }
});

router.get('/provincias/:id/cantones', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_canton AS id, descripcion FROM cantones WHERE activo = 1 AND id_provincia = @id ORDER BY descripcion`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cantones' });
  }
});

router.get('/cantones/:id/distritos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`SELECT id_distrito AS id, descripcion FROM distritos WHERE activo = 1 AND id_canton = @id ORDER BY descripcion`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener distritos' });
  }
});

module.exports = router;
