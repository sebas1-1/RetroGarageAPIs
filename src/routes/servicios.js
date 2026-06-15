const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/servicios
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT s.id_servicio, s.nombre, s.precio_base, 
               c.nombre AS categoria
        FROM servicios s
        INNER JOIN categorias c ON s.id_categoria = c.id_categoria
        WHERE s.activo = 1
        ORDER BY c.nombre, s.nombre
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

module.exports = router;