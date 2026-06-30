const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');
const { decryptField, encryptField } = require('../security');

const normalizeAuto = (auto) => ({
  marca: auto.marca || null,
  modelo: auto.modelo || null,
  anio: auto.anio || null,
  placa: auto.placa || null,
});

const encryptIdentificacion = (identificacion) =>
  encryptField('cliente.identificacion', identificacion);

const decryptAuto = (auto) => ({
  ...auto,
  identificacion: decryptField('cliente.identificacion', auto.identificacion),
});

// GET /api/autos?identificacion=...
router.get('/', async (req, res) => {
  try {
    const { identificacion } = req.query;
    if (!identificacion)
      return res.status(400).json({ error: 'Identificación requerida' });

    const encryptedIdentificacion = encryptIdentificacion(identificacion);
    const pool = await getPool();
    const result = await pool.request()
      .input('identificacion', sql.NVarChar, encryptedIdentificacion)
      .query(`
        SELECT id_auto, identificacion, marca, modelo, anio, placa
        FROM autos
        WHERE identificacion = @identificacion
        ORDER BY id_auto ASC
      `);

    res.json(result.recordset.map(decryptAuto));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener autos' });
  }
});

// POST /api/autos
router.post('/', async (req, res) => {
  try {
    const { identificacion, ...rest } = req.body;
    const auto = normalizeAuto(rest);
    if (!identificacion)
      return res.status(400).json({ error: 'Identificación requerida' });

    const encryptedIdentificacion = encryptIdentificacion(identificacion);
    const pool = await getPool();
    const result = await pool.request()
      .input('identificacion', sql.NVarChar, encryptedIdentificacion)
      .input('marca',          sql.VarChar,  auto.marca)
      .input('modelo',         sql.VarChar,  auto.modelo)
      .input('anio',           sql.VarChar,  auto.anio)
      .input('placa',          sql.VarChar,  auto.placa)
      .query(`
        INSERT INTO autos (identificacion, marca, modelo, anio, placa)
        OUTPUT INSERTED.id_auto
        VALUES (@identificacion, @marca, @modelo, @anio, @placa)
      `);

    res.status(201).json({ id_auto: result.recordset[0].id_auto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear auto' });
  }
});

// PUT /api/autos/cliente/:identificacion
router.put('/cliente/:identificacion', async (req, res) => {
  const { identificacion } = req.params;
  const autos = Array.isArray(req.body.autos) ? req.body.autos : [];

  // SIEMPRE cifrar la identificación de la URL: nunca confiar en el campo
  // "identificacion" que pueda venir dentro de cada item del array, porque
  // el frontend lo recibe ya desencriptado (texto plano) desde el GET previo.
  const encryptedIdentificacion = encryptIdentificacion(identificacion);

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('identificacion', sql.NVarChar, encryptedIdentificacion)
        .query('DELETE FROM autos WHERE identificacion = @identificacion');

      for (const item of autos) {
        const auto = normalizeAuto(item);
        const tieneDatos = auto.marca || auto.modelo || auto.anio || auto.placa;
        if (!tieneDatos) continue;

        await new sql.Request(transaction)
          .input('identificacion', sql.NVarChar, encryptedIdentificacion)
          .input('marca',          sql.VarChar,  auto.marca)
          .input('modelo',         sql.VarChar,  auto.modelo)
          .input('anio',           sql.VarChar,  auto.anio)
          .input('placa',          sql.VarChar,  auto.placa)
          .query(`
            INSERT INTO autos (identificacion, marca, modelo, anio, placa)
            VALUES (@identificacion, @marca, @modelo, @anio, @placa)
          `);
      }

      await transaction.commit();
      res.json({ ok: true });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar autos del cliente' });
  }
});

module.exports = router;