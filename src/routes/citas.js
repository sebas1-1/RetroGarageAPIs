const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/citas?buscar=...&estado=...&fecha=...
router.get('/', async (req, res) => {
  try {
    const { buscar, estado, fecha } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let query = `
      SELECT c.id_cita, c.id_cliente, c.id_servicio,
             cl.nombre + ' ' + cl.apellido AS cliente,
             cl.identificacion,
             s.nombre AS servicio,
             c.marca_vehiculo, c.modelo_vehiculo, c.anio_vehiculo,
             c.fecha, CONVERT(VARCHAR(5), c.hora, 108) AS hora,
             c.descripcion, c.estado, c.fecha_registro
      FROM citas c
      INNER JOIN clientes cl ON c.id_cliente = cl.id_cliente
      INNER JOIN servicios s  ON c.id_servicio = s.id_servicio
      WHERE 1=1
    `;
    if (buscar) {
      request.input('buscar', sql.NVarChar, `%${buscar}%`);
      query += ` AND (cl.nombre LIKE @buscar OR cl.apellido LIKE @buscar
                   OR c.marca_vehiculo LIKE @buscar OR c.modelo_vehiculo LIKE @buscar)`;
    }
    if (estado) {
      request.input('estado', sql.NVarChar, estado);
      query += ` AND c.estado = @estado`;
    }
    if (fecha) {
      request.input('fechaFiltro', sql.Date, fecha);
      query += ` AND CONVERT(DATE, c.fecha) = @fechaFiltro`;
    }
    query += ' ORDER BY c.fecha DESC, c.hora ASC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// GET /api/citas/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT c.id_cita, c.id_cliente, c.id_servicio,
               cl.nombre + ' ' + cl.apellido AS cliente,
               cl.identificacion,
               s.nombre AS servicio,
               c.marca_vehiculo, c.modelo_vehiculo, c.anio_vehiculo,
               c.fecha, CONVERT(VARCHAR(5), c.hora, 108) AS hora,
               c.descripcion, c.estado, c.fecha_registro
        FROM citas c
        INNER JOIN clientes cl ON c.id_cliente = cl.id_cliente
        INNER JOIN servicios s  ON c.id_servicio = s.id_servicio
        WHERE c.id_cita = @id
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

// POST /api/citas
router.post('/', async (req, res) => {
  try {
    const { id_cliente, id_servicio, marca_vehiculo, modelo_vehiculo,
            anio_vehiculo, fecha, hora, descripcion, estado } = req.body;

    if (!id_cliente || !id_servicio || !marca_vehiculo || !modelo_vehiculo || !fecha || !hora)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const result = await pool.request()
      .input('id_cliente',      sql.Int,      id_cliente)
      .input('id_servicio',     sql.Int,      id_servicio)
      .input('marca_vehiculo',  sql.NVarChar, marca_vehiculo)
      .input('modelo_vehiculo', sql.NVarChar, modelo_vehiculo)
      .input('anio_vehiculo',   sql.Int,      anio_vehiculo || null)
      .input('fecha',           sql.Date,     fecha)
      .input('hora',            sql.VarChar,  hora)
      .input('descripcion',     sql.NVarChar, descripcion || null)
      .input('estado',          sql.NVarChar, estado || 'PENDIENTE')
      .query(`
        INSERT INTO citas
          (id_cliente, id_servicio, marca_vehiculo, modelo_vehiculo,
           anio_vehiculo, fecha, hora, descripcion, estado)
        OUTPUT INSERTED.id_cita
        VALUES (@id_cliente, @id_servicio, @marca_vehiculo, @modelo_vehiculo,
                @anio_vehiculo, @fecha, @hora, @descripcion, @estado)
      `);
    res.status(201).json({ id_cita: result.recordset[0].id_cita });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear cita' });
  }
});

// PUT /api/citas/:id
router.put('/:id', async (req, res) => {
  try {
    const { id_cliente, id_servicio, marca_vehiculo, modelo_vehiculo,
            anio_vehiculo, fecha, hora, descripcion, estado } = req.body;

    if (!id_cliente || !id_servicio || !marca_vehiculo || !modelo_vehiculo || !fecha || !hora)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    await pool.request()
      .input('id',              sql.Int,      req.params.id)
      .input('id_cliente',      sql.Int,      id_cliente)
      .input('id_servicio',     sql.Int,      id_servicio)
      .input('marca_vehiculo',  sql.NVarChar, marca_vehiculo)
      .input('modelo_vehiculo', sql.NVarChar, modelo_vehiculo)
      .input('anio_vehiculo',   sql.Int,      anio_vehiculo || null)
      .input('fecha',           sql.Date,     fecha)
      .input('hora',            sql.VarChar,  hora)
      .input('descripcion',     sql.NVarChar, descripcion || null)
      .input('estado',          sql.NVarChar, estado || 'PENDIENTE')
      .query(`
        UPDATE citas SET
          id_cliente      = @id_cliente,
          id_servicio     = @id_servicio,
          marca_vehiculo  = @marca_vehiculo,
          modelo_vehiculo = @modelo_vehiculo,
          anio_vehiculo   = @anio_vehiculo,
          fecha           = @fecha,
          hora            = @hora,
          descripcion     = @descripcion,
          estado          = @estado
        WHERE id_cita = @id
      `);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// PATCH /api/citas/:id/estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['PENDIENTE', 'COMPLETADA', 'CANCELADA'].includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    const pool = await getPool();
    await pool.request()
      .input('id',     sql.Int,      req.params.id)
      .input('estado', sql.NVarChar, estado)
      .query('UPDATE citas SET estado = @estado WHERE id_cita = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// DELETE /api/citas/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM citas WHERE id_cita = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

module.exports = router;