const express = require('express');
const crypto = require('crypto');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { sendRecoveryCode } = require('../mail');
const {
  buildOtpAuthUrl,
  decryptField,
  encryptField,
  generateOtpSecret,
  hashPassword,
  verifyTotp,
  verifyPassword,
} = require('../security');

const getPasswordErrors = (password = '') => {
  const errors = [];

  if (password.length < 8) errors.push('mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('al menos 1 letra mayúscula');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('al menos 1 carácter especial');
  if (!/\d/.test(password)) errors.push('al menos 1 número');

  return errors;
};

const getUsernameErrors = (username = '') => {
  const errors = [];

  if (username.length < 4 || username.length > 50)
    errors.push('entre 4 y 50 caracteres');
  if (!/^[A-Za-z0-9]/.test(username))
    errors.push('empezar con letra o número');
  if (!/^[A-Za-z0-9._]+$/.test(username))
    errors.push('solo letras, números, punto o guion bajo');
  if (/\s/.test(username)) errors.push('sin espacios');

  return errors;
};

const generateRecoveryCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const OTP_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const pendingOtpChallenges = new Map();

const createOtpChallenge = (usuario, setupRequired = false) => {
  const tempToken = crypto.randomBytes(32).toString('hex');
  pendingOtpChallenges.set(tempToken, {
    id_usuario: usuario.id_usuario,
    setupRequired,
    expiresAt: Date.now() + OTP_CHALLENGE_TTL_MS,
  });

  const response = {
    requiresOtp: true,
    tempToken,
    setupRequired,
  };

  if (setupRequired) {
    const decrypted = decryptUsuario(usuario);
    response.secret = usuario.otp_secret;
    response.otpauthUrl = buildOtpAuthUrl({
      account: decrypted.correo || decrypted.nombre_usuario || `usuario-${usuario.id_usuario}`,
      secret: usuario.otp_secret,
    });
  }

  return response;
};

const consumeOtpChallenge = (tempToken) => {
  const challenge = pendingOtpChallenges.get(tempToken);
  pendingOtpChallenges.delete(tempToken);

  if (!challenge || challenge.expiresAt < Date.now()) return null;
  return challenge;
};

const encryptUsuario = (usuario) => ({
  ...usuario,
  correo: encryptField('usuario.correo', usuario.correo),
  telefono: encryptField('usuario.telefono', usuario.telefono),
});

const decryptUsuario = (usuario) => ({
  ...usuario,
  correo: decryptField('usuario.correo', usuario.correo),
  telefono: decryptField('usuario.telefono', usuario.telefono),
});

const publicUsuario = (usuario) => {
  const { contrasena_hash, otp_secret, ...safeUsuario } = decryptUsuario(usuario);
  return safeUsuario;
};

const matchesUsuarioSearch = (usuario, buscar = '') => {
  if (!buscar) return true;
  const term = String(buscar).trim().toLowerCase();
  return [
    usuario.nombre_usuario,
    usuario.nombre_completo,
    usuario.correo,
    usuario.telefono,
  ].some((value) => String(value || '').toLowerCase().includes(term));
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
    let query = `
      SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
             u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
             u.activo, u.fecha_creacion, u.ultimo_acceso
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.activo = 1
    `;
    query += ' ORDER BY u.fecha_creacion DESC';
    const result = await pool.request().query(query);
    const usuarios = result.recordset
      .map(publicUsuario)
      .filter((usuario) => matchesUsuarioSearch(usuario, buscar));
    res.json(usuarios);
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
               u.contrasena_hash, u.activo, u.fecha_creacion, u.ultimo_acceso
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = @id AND u.activo = 1
      `);
    if (!result.recordset.length)
      return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(publicUsuario(result.recordset[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/usuarios
router.post('/', async (req, res) => {
  let transaction;
  try {
    const {
      id_rol,
      nombre_usuario,
      nombre_completo,
      correo,
      telefono,
      contrasena,
      respuesta1,
      respuesta2,
    } = req.body;
    if (
      !nombre_usuario ||
      !nombre_completo ||
      !correo ||
      !contrasena ||
      !respuesta1 ||
      !respuesta2
    )
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const usernameErrors = getUsernameErrors(nombre_usuario);
    if (usernameErrors.length)
      return res.status(400).json({ error: `El nombre de usuario debe tener ${usernameErrors.join(', ')}` });

    const passwordErrors = getPasswordErrors(contrasena);
    if (passwordErrors.length)
      return res.status(400).json({ error: `La contraseña debe tener ${passwordErrors.join(', ')}` });

    const encrypted = encryptUsuario({ correo, telefono });
    const contrasena_hash = hashPassword(contrasena);

    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const result = await new sql.Request(transaction)
      .input('id_rol',          sql.Int,      id_rol)
      .input('nombre_usuario',  sql.NVarChar, nombre_usuario)
      .input('nombre_completo', sql.NVarChar, nombre_completo)
      .input('correo',          sql.NVarChar, encrypted.correo)
      .input('telefono',        sql.NVarChar, encrypted.telefono || null)
      .input('contrasena_hash', sql.NVarChar, contrasena_hash)
      .query(`
        INSERT INTO usuarios (id_rol, nombre_usuario, nombre_completo, correo, telefono, contrasena_hash)
        OUTPUT INSERTED.id_usuario
        VALUES (@id_rol, @nombre_usuario, @nombre_completo, @correo, @telefono, @contrasena_hash)
      `);

    await new sql.Request(transaction)
      .input('nombre_usuario', sql.NVarChar, nombre_usuario)
      .input('respuesta1', sql.VarChar, respuesta1)
      .input('respuesta2', sql.VarChar, respuesta2)
      .query(`
        INSERT INTO RespuestaSeguridad (nombre_usuario, Respuesta1, Respuesta2)
        VALUES (@nombre_usuario, @respuesta1, @respuesta2)
      `);

    await transaction.commit();
    transaction = null;
    res.status(201).json({ id_usuario: result.recordset[0].id_usuario });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error(rollbackErr);
      }
    }
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

    const pool = await getPool();
    const result = await pool.request()
      .input('usuario', sql.NVarChar, usuario)
      .query(`
        SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
               u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
               u.contrasena_hash, u.activo, u.fecha_creacion, u.ultimo_acceso,
               u.otp_secret, u.otp_habilitado
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.activo = 1
          AND (u.nombre_usuario = @usuario OR u.correo = @usuario)
      `);

    let usuarioEncontrado = result.recordset.find((item) =>
      verifyPassword(contrasena, item.contrasena_hash),
    );

    if (!usuarioEncontrado) {
      const encryptedCorreo = encryptField('usuario.correo', usuario);
      const emailResult = await pool.request()
        .input('correo', sql.NVarChar, encryptedCorreo)
        .query(`
          SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
                 u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
                 u.contrasena_hash, u.activo, u.fecha_creacion, u.ultimo_acceso,
                 u.otp_secret, u.otp_habilitado
          FROM usuarios u
          LEFT JOIN roles r ON u.id_rol = r.id_rol
          WHERE u.activo = 1 AND u.correo = @correo
        `);

      usuarioEncontrado = emailResult.recordset.find((item) =>
        verifyPassword(contrasena, item.contrasena_hash),
      );
    }

    if (!usuarioEncontrado)
      return res.status(401).json({ error: 'Credenciales inválidas' });
    if (!usuarioEncontrado.id_rol)
      return res.status(403).json({ error: 'Tu cuenta está pendiente de asignación de rol' });

    if (!usuarioEncontrado.otp_secret) {
      usuarioEncontrado.otp_secret = generateOtpSecret();
      usuarioEncontrado.otp_habilitado = false;

      await pool.request()
        .input('id', sql.Int, usuarioEncontrado.id_usuario)
        .input('otp_secret', sql.NVarChar, usuarioEncontrado.otp_secret)
        .query(`
          UPDATE usuarios
          SET otp_secret = @otp_secret, otp_habilitado = 0
          WHERE id_usuario = @id
        `);
    }

    if (!usuarioEncontrado.otp_habilitado) {
      return res.json(createOtpChallenge(usuarioEncontrado, true));
    }

    return res.json(createOtpChallenge(usuarioEncontrado, false));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /api/usuarios/login/otp
router.post('/login/otp', async (req, res) => {
  try {
    const { tempToken, codigo } = req.body;
    if (!tempToken || !codigo)
      return res.status(400).json({ error: 'Código de verificación obligatorio' });

    const challenge = consumeOtpChallenge(tempToken);
    if (!challenge)
      return res.status(400).json({ error: 'La verificación expiró. Inicie sesión nuevamente.' });

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, challenge.id_usuario)
      .query(`
        SELECT u.id_usuario, u.id_rol, r.nombre AS rol,
               u.nombre_usuario, u.nombre_completo, u.correo, u.telefono,
               u.contrasena_hash, u.activo, u.fecha_creacion, u.ultimo_acceso,
               u.otp_secret, u.otp_habilitado
        FROM usuarios u
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = @id AND u.activo = 1
      `);

    const usuarioEncontrado = result.recordset[0];
    if (!usuarioEncontrado || !usuarioEncontrado.otp_secret)
      return res.status(401).json({ error: 'Verificación inválida' });

    if (!verifyTotp(usuarioEncontrado.otp_secret, codigo))
      return res.status(401).json({ error: 'Código de autenticación inválido' });

    await pool.request()
      .input('id', sql.Int, usuarioEncontrado.id_usuario)
      .query(`
        UPDATE usuarios
        SET ultimo_acceso = GETDATE(), otp_habilitado = 1
        WHERE id_usuario = @id
      `);

    usuarioEncontrado.otp_habilitado = true;
    usuarioEncontrado.ultimo_acceso = new Date();
    res.json({ usuario: publicUsuario(usuarioEncontrado) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar código' });
  }
});

// POST /api/usuarios/recuperacion/solicitar
router.post('/recuperacion/solicitar', async (req, res) => {
  try {
    const { correo, pregunta, respuesta } = req.body;
    const genericResponse = {
      message: 'Si los datos son correctos, se enviará un código de recuperación.',
    };

    if (!correo || !pregunta || !respuesta) return res.json(genericResponse);

    const answerColumn = Number(pregunta) === 2 ? 'Respuesta2' : 'Respuesta1';
    const encryptedCorreo = encryptField('usuario.correo', correo);
    const pool = await getPool();
    const userResult = await pool.request()
      .input('correo', sql.NVarChar, encryptedCorreo)
      .input('respuesta', sql.VarChar, respuesta.trim().toLowerCase())
      .query(`
        SELECT u.id_usuario
        FROM usuarios u
        INNER JOIN RespuestaSeguridad rs ON u.nombre_usuario = rs.nombre_usuario
        WHERE u.activo = 1
          AND u.correo = @correo
          AND LOWER(LTRIM(RTRIM(rs.${answerColumn}))) = @respuesta
      `);

    if (!userResult.recordset.length) return res.json(genericResponse);

    const code = generateRecoveryCode();
    const codigo_hash = Buffer.from(code).toString('base64');
    const id_usuario = userResult.recordset[0].id_usuario;

    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .query(`
        UPDATE recuperacion_contrasena
        SET usado = 1
        WHERE id_usuario = @id_usuario AND usado = 0
      `);

    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('codigo_hash', sql.NVarChar, codigo_hash)
      .input('ip_solicitud', sql.NVarChar, req.ip || null)
      .query(`
        INSERT INTO recuperacion_contrasena
          (id_usuario, codigo_hash, fecha_expiracion, usado, ip_solicitud)
        VALUES
          (@id_usuario, @codigo_hash, DATEADD(MINUTE, 15, GETDATE()), 0, @ip_solicitud)
      `);

    await sendRecoveryCode({ to: correo, code });

    res.json(genericResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al solicitar recuperación' });
  }
});

// POST /api/usuarios/recuperacion/confirmar
router.post('/recuperacion/confirmar', async (req, res) => {
  try {
    const { correo, codigo, nueva_contrasena } = req.body;
    if (!correo || !codigo || !nueva_contrasena)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const passwordErrors = getPasswordErrors(nueva_contrasena);
    if (passwordErrors.length)
      return res.status(400).json({ error: `La contraseña debe tener ${passwordErrors.join(', ')}` });

    const encryptedCorreo = encryptField('usuario.correo', correo);
    const nueva_contrasena_hash = hashPassword(nueva_contrasena);
    const codigo_hash = Buffer.from(codigo).toString('base64');
    const pool = await getPool();
    const recoveryResult = await pool.request()
      .input('correo', sql.NVarChar, encryptedCorreo)
      .input('codigo_hash', sql.NVarChar, codigo_hash)
      .query(`
        SELECT TOP 1
          r.id_recuperacion,
          u.id_usuario,
          u.contrasena_hash
        FROM recuperacion_contrasena r
        INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
        WHERE u.activo = 1
          AND u.correo = @correo
          AND r.codigo_hash = @codigo_hash
          AND r.usado = 0
          AND r.fecha_expiracion > GETDATE()
        ORDER BY r.fecha_solicitud DESC
      `);

    if (!recoveryResult.recordset.length)
      return res.status(400).json({ error: 'Código inválido o vencido' });

    const recovery = recoveryResult.recordset[0];
    if (verifyPassword(nueva_contrasena, recovery.contrasena_hash))
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la anterior' });

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('id_usuario', sql.Int, recovery.id_usuario)
        .input('contrasena_hash', sql.NVarChar, nueva_contrasena_hash)
        .query(`
          UPDATE usuarios
          SET contrasena_hash = @contrasena_hash
          WHERE id_usuario = @id_usuario
        `);

      await new sql.Request(transaction)
        .input('id_recuperacion', sql.Int, recovery.id_recuperacion)
        .query(`
          UPDATE recuperacion_contrasena
          SET usado = 1
          WHERE id_recuperacion = @id_recuperacion
        `);

      await transaction.commit();
      res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Error al actualizar contraseña' });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const { id_rol, nombre_usuario, nombre_completo, correo, telefono, contrasena } = req.body;
    if (!id_rol || !nombre_usuario || !nombre_completo || !correo)
      return res.status(400).json({ error: 'Faltan campos obligatorios' });

    const usernameErrors = getUsernameErrors(nombre_usuario);
    if (usernameErrors.length)
      return res.status(400).json({ error: `El nombre de usuario debe tener ${usernameErrors.join(', ')}` });

    const encrypted = encryptUsuario({ correo, telefono });
    const pool = await getPool();
    const request = pool.request()
      .input('id',             sql.Int,      req.params.id)
      .input('id_rol',         sql.Int,      id_rol)
      .input('nombre_usuario', sql.NVarChar, nombre_usuario)
      .input('nombre_completo',sql.NVarChar, nombre_completo)
      .input('correo',         sql.NVarChar, encrypted.correo)
      .input('telefono',       sql.NVarChar, encrypted.telefono || null);

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

      const contrasena_hash = hashPassword(contrasena);
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
