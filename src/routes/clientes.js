const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

// GET /api/clientes?buscar=...
router.get('/', async (req, res) => {
  try {
    const { buscar } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let query = `
  SELECT id_cliente,nombre,apellido,identificacion,fecha_nacimiento,telefono,correo,provincia,canton,notas,fecha_registro
  FROM clientes
  WHERE activo = 1
`;
    if (buscar) {
      request.input('buscar', sql.NVarChar, `%${buscar}%`);
      query += ` AND (nombre LIKE @buscar OR apellido LIKE @buscar
                   OR identificacion LIKE @buscar OR telefono LIKE @buscar)`;
    }
    query += ' ORDER BY fecha_registro DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM clientes WHERE id_cliente = @id AND activo = 1');
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido, identificacion, fecha_nacimiento,
            correo, telefono, provincia, canton, notas } = req.body;
    if (!nombre || !apellido || !identificacion || !telefono)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const result = await pool.request()
      .input('nombre',           sql.NVarChar, nombre)
      .input('apellido',         sql.NVarChar, apellido)
      .input('identificacion',   sql.NVarChar, identificacion)
      .input('fecha_nacimiento', sql.Date,     fecha_nacimiento || null)
      .input('correo',           sql.NVarChar, correo || null)
      .input('telefono',         sql.NVarChar, telefono)
      .input('provincia',        sql.NVarChar, provincia || null)
      .input('canton',           sql.NVarChar, canton || null)
      .input('notas',            sql.NVarChar, notas || null)
      .query(`
        INSERT INTO clientes
          (nombre, apellido, identificacion, fecha_nacimiento,
           correo, telefono, provincia, canton, notas)
        OUTPUT INSERTED.id_cliente
        VALUES (@nombre, @apellido, @identificacion, @fecha_nacimiento,
                @correo, @telefono, @provincia, @canton, @notas)
      `);
    res.status(201).json({ id_cliente: result.recordset[0].id_cliente });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ error: 'Ya existe un cliente con esa identificación' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const { nombre, apellido, identificacion, fecha_nacimiento,
            correo, telefono, provincia, canton, notas } = req.body;
    if (!nombre || !apellido || !identificacion || !telefono)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    await pool.request()
      .input('id',               sql.Int,      req.params.id)
      .input('nombre',           sql.NVarChar, nombre)
      .input('apellido',         sql.NVarChar, apellido)
      .input('identificacion',   sql.NVarChar, identificacion)
      .input('fecha_nacimiento', sql.Date,     fecha_nacimiento || null)
      .input('correo',           sql.NVarChar, correo || null)
      .input('telefono',         sql.NVarChar, telefono)
      .input('provincia',        sql.NVarChar, provincia || null)
      .input('canton',           sql.NVarChar, canton || null)
      .input('notas',            sql.NVarChar, notas || null)
      .query(`
        UPDATE clientes SET
          nombre = @nombre, apellido = @apellido,
          identificacion = @identificacion,
          fecha_nacimiento = @fecha_nacimiento,
          correo = @correo, telefono = @telefono,
          provincia = @provincia, canton = @canton, notas = @notas
        WHERE id_cliente = @id
      `);
    res.json({ ok: true });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ error: 'Ya existe un cliente con esa identificación' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
});

// DELETE /api/clientes/:id 
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM clientes WHERE id_cliente = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
});

module.exports = router;