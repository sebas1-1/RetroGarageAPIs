const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

const getPasswordErrors = (password = '') => {
  const errors = [];
  const numberMatches = password.match(/\d/g) || [];

  if (password.length < 12) errors.push('mínimo 12 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('al menos 1 letra mayúscula');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('al menos 1 carácter especial');
  if (numberMatches.length < 2) errors.push('al menos 2 números');

  return errors;
};

// GET /api/usuarios/roles
router.get('/roles', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT id_rol, nombre FROM roles ORDER BY id_rol');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// GET /api/usuarios?buscar=...
router.get('/', async (req, res) => {
  try {
    const { buscar } = req.query;
    const pool = await getPool();
    const request = pool.request();
    let query = `
      SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
             u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
             u.activo, u.fecha_creacion, u.ultimo_acceso
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.activo = 1
    `;
    if (buscar) {
      request.input('buscar', sql.NVarChar, `%${buscar}%`);
      query += ` AND (u.nombre_usuario LIKE @buscar OR u.nombre_completo LIKE @buscar OR u.correo LIKE @buscar)`;
    }
    query += ' ORDER BY u.fecha_creacion DESC';
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/usuarios/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`
        SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
               u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
               u.activo, u.fecha_creacion, u.ultimo_acceso
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = @id AND u.activo = 1
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
  try {
    const { id_rol, nombre_usuario, nombre_completo, correo, telefono, contrasena } = req.body;
    if (!nombre_usuario || !nombre_completo || !correo || !contrasena)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const passwordErrors = getPasswordErrors(contrasena);
    if (passwordErrors.length)
      return res.status(400).json({ error: `La contraseña debe tener ${passwordErrors.join(', ')}` });

    // Hash
    const contrasena_hash = Buffer.from(contrasena).toString('base64');

    const pool = await getPool();
    const result = await pool.request()
      .input('id_rol',          sql.Int,      id_rol)
      .input('nombre_usuario',  sql.NVarChar, nombre_usuario)
      .input('nombre_completo', sql.NVarChar, nombre_completo)
      .input('correo',          sql.NVarChar, correo)
      .input('telefono',        sql.NVarChar, telefono || null)
      .input('contrasena_hash', sql.NVarChar, contrasena_hash)
      .query(`
        INSERT INTO usuarios (id_rol, nombre_usuario, nombre_completo, correo, telefono, contrasena_hash)
        OUTPUT INSERTED.id_usuario
        VALUES (@id_rol, @nombre_usuario, @nombre_completo, @correo, @telefono, @contrasena_hash)
      `);
    res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// POST /api/usuarios/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena)
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });

    const contrasena_hash = Buffer.from(contrasena).toString('base64');
    const pool = await getPool();
    const result = await pool.request()
      .input('usuario', sql.NVarChar, usuario)
      .input('contrasena_hash', sql.NVarChar, contrasena_hash)
      .query(`
        SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
               u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
               u.activo, u.fecha_creacion, u.ultimo_acceso
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.activo = 1
          AND (u.nombre_usuario = @usuario OR u.correo = @usuario)
          AND u.contrasena_hash = @contrasena_hash
      `);

    if (!result.recordset.length)
      return res.status(401).json({ error: 'Credenciales inválidas' });

    const usuarioEncontrado = result.recordset[0];
    if (!usuarioEncontrado.id_rol)
      return res.status(403).json({ error: 'Tu cuenta está pendiente de asignación de rol' });

    await pool.request()
      .input('id', sql.Int, usuarioEncontrado.id_usuario)
      .query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id_usuario = @id');

    res.json({ usuario: usuarioEncontrado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const { id_rol, nombre_usuario, nombre_completo, correo, telefono, contrasena } = req.body;
    if (!id_rol || !nombre_usuario || !nombre_completo || !correo)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const pool = await getPool();
    const request = pool.request()
      .input('id',             sql.Int,      req.params.id)
      .input('id_rol',         sql.Int,      id_rol)
      .input('nombre_usuario', sql.NVarChar, nombre_usuario)
      .input('nombre_completo',sql.NVarChar, nombre_completo)
      .input('correo',         sql.NVarChar, correo)
      .input('telefono',       sql.NVarChar, telefono || null);

    let query = `
      UPDATE usuarios SET
        id_rol          = @id_rol,
        nombre_usuario  = @nombre_usuario,
        nombre_completo = @nombre_completo,
        correo          = @correo,
        telefono        = @telefono
    `;

    if (contrasena) {
      const passwordErrors = getPasswordErrors(contrasena);
      if (passwordErrors.length)
        return res.status(400).json({ error: `La contraseña debe tener ${passwordErrors.join(', ')}` });

      const contrasena_hash = Buffer.from(contrasena).toString('base64');
      request.input('contrasena_hash', sql.NVarChar, contrasena_hash);
      query += `, contrasena_hash = @contrasena_hash`;
    }

    query += ` WHERE id_usuario = @id`;
    await request.query(query);
    res.json({ ok: true });
  } catch (err) {
    if (err.number === 2627)
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/usuarios/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('UPDATE usuarios SET activo = 0 WHERE id_usuario = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
