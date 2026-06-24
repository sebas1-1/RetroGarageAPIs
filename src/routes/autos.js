const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db');

const normalizeAuto = (auto, identificacionFallback = '') => ({
  identificacion: auto.identificacion || identificacionFallback,
  marca: auto.marca || null,
  modelo: auto.modelo || null,
  anio: auto.anio || null,
  placa: auto.placa || null,
});

// GET /api/autos?identificacion=...
router.get('/', async (req, res) => {
  try {
    const { identificacion } = req.query;
    if (!identificacion)
      return res.status(400).json({ error: 'Identificación requerida' });

    const pool = await getPool();
    const result = await pool.request()
      .input('identificacion', sql.NVarChar, identificacion)
      .query(`
        SELECT id_auto, identificacion, marca, modelo, anio, placa
        FROM autos
        WHERE identificacion = @identificacion
        ORDER BY id_auto ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener autos' });
  }
});

// POST /api/autos
router.post('/', async (req, res) => {
  try {
    const auto = normalizeAuto(req.body);
    if (!auto.identificacion)
      return res.status(400).json({ error: 'Identificación requerida' });

    const pool = await getPool();
    const result = await pool.request()
      .input('identificacion', sql.NVarChar, auto.identificacion)
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

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('identificacion', sql.NVarChar, identificacion)
        .query('DELETE FROM autos WHERE identificacion = @identificacion');

      for (const item of autos) {
        const auto = normalizeAuto(item, identificacion);
        const tieneDatos = auto.marca || auto.modelo || auto.anio || auto.placa;
        if (!tieneDatos) continue;

        await new sql.Request(transaction)
          .input('identificacion', sql.NVarChar, identificacion)
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
