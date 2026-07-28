const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');
const {
  BankValidationError,
  hashCardCvv,
  hashCardNumber,
  normalizeSinpePhone,
  secureBufferEquals,
  validateCardDetails,
} = require('../bankSimulator');

const respondWithError = (res, error) => {
  if (error instanceof BankValidationError) {
    return res.status(error.status).json({ error: error.message, codigo: error.code });
  }
  console.error(error);
  return res.status(500).json({ error: 'No fue posible comunicarse con la entidad bancaria' });
};

const formatDatabaseExpiry = (date) => {
  const value = new Date(date);
  return `${String(value.getUTCMonth() + 1).padStart(2, '0')}/${String(value.getUTCFullYear()).slice(-2)}`;
};

// Valida que la tarjeta exista y que sus credenciales coincidan.
router.post('/tarjetas/validar', async (req, res) => {
  try {
    const card = validateCardDetails(req.body);
    const pool = await getPool();
    const result = await pool.request()
      .input('numero_hash', sql.VarBinary(32), hashCardNumber(card.number))
      .query(`
        SELECT marca, ultimos_cuatro, banco, fecha_vencimiento, saldo, cvv_hash
        FROM tarjetas_simuladas
        WHERE numero_hash = @numero_hash AND activa = 1
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        valida: false,
        error: 'La tarjeta no está registrada en la entidad bancaria.',
      });
    }

    const account = result.recordset[0];
    if (
      account.marca !== card.brand ||
      formatDatabaseExpiry(account.fecha_vencimiento) !== card.expiry ||
      !secureBufferEquals(account.cvv_hash, hashCardCvv(card.number, req.body.cvv))
    ) {
      return res.status(400).json({
        valida: false,
        error: 'El vencimiento o CVV no coincide con la información bancaria.',
      });
    }

    res.json({
      valida: true,
      marca: card.brand,
      ultimos_cuatro: card.lastFour,
      banco: account.banco,
      mensaje: 'Tarjeta vinculada y datos bancarios válidos.',
    });
  } catch (error) {
    respondWithError(res, error);
  }
});

// Consulta si un teléfono está vinculado, como lo haría una API bancaria.
router.post('/sinpe/validar', async (req, res) => {
  try {
    const telefono = normalizeSinpePhone(req.body.telefono);
    const pool = await getPool();
    const result = await pool.request()
      .input('telefono', sql.Char(8), telefono)
      .query(`
        SELECT telefono, banco
        FROM cuentas_sinpe_simuladas
        WHERE telefono = @telefono AND activo = 1
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        vinculado: false,
        error: 'El teléfono no está vinculado a SINPE Móvil.',
      });
    }

    res.json({
      vinculado: true,
      telefono,
      banco: result.recordset[0].banco,
      mensaje: 'Teléfono vinculado correctamente.',
    });
  } catch (error) {
    respondWithError(res, error);
  }
});

module.exports = router;
