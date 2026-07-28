const crypto = require('crypto');

class BankValidationError extends Error {
  constructor(message, code = 'DATOS_INVALIDOS') {
    super(message);
    this.name = 'BankValidationError';
    this.code = code;
    this.status = 400;
  }
}

const onlyDigits = (value) => String(value ?? '').replace(/[\s-]/g, '');

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest();

const detectCardBrand = (cardNumber) => {
  const normalized = onlyDigits(cardNumber);
  if (!/^\d{16}$/.test(normalized)) return null;
  if (normalized.startsWith('4')) return 'VISA';
  if (normalized.startsWith('5') || normalized.startsWith('2')) return 'MASTERCARD';
  return null;
};

const normalizeExpiry = (value, now = new Date()) => {
  const match = String(value ?? '').trim().match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/);
  if (!match) {
    throw new BankValidationError(
      'La fecha de vencimiento debe tener el formato MM/AA.',
      'VENCIMIENTO_INVALIDO',
    );
  }

  const month = Number(match[1]);
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    throw new BankValidationError('La tarjeta está vencida.', 'TARJETA_VENCIDA');
  }

  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
};

const validateCardDetails = ({ numero_tarjeta, fecha_vencimiento, cvv }, now) => {
  const normalized = onlyDigits(numero_tarjeta);
  if (!/^\d{16}$/.test(normalized)) {
    throw new BankValidationError(
      'El número de tarjeta debe contener exactamente 16 dígitos.',
      'NUMERO_TARJETA_INVALIDO',
    );
  }

  const brand = detectCardBrand(normalized);
  if (!brand) {
    throw new BankValidationError(
      'Solo se aceptan tarjetas Visa que inicien con 4 o Mastercard que inicien con 5 o 2.',
      'MARCA_NO_ADMITIDA',
    );
  }

  const expiry = normalizeExpiry(fecha_vencimiento, now);
  if (!/^\d{3}$/.test(String(cvv ?? ''))) {
    throw new BankValidationError('El CVV debe contener exactamente 3 dígitos.', 'CVV_INVALIDO');
  }

  return {
    brand,
    expiry,
    lastFour: normalized.slice(-4),
    number: normalized,
  };
};

const hashCardNumber = (cardNumber) => sha256(onlyDigits(cardNumber));

const hashCardCvv = (cardNumber, cvv) =>
  sha256(`${onlyDigits(cardNumber)}:${String(cvv ?? '')}`);

const secureBufferEquals = (left, right) => {
  if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
};

const normalizeSinpePhone = (phone) => {
  const normalized = onlyDigits(phone);
  if (!/^\d{8}$/.test(normalized)) {
    throw new BankValidationError(
      'El teléfono SINPE Móvil debe contener exactamente 8 dígitos.',
      'TELEFONO_INVALIDO',
    );
  }
  return normalized;
};

const createAuthorizationCode = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const authorizeCard = (details, amount, now) => {
  const card = validateCardDetails(details, now);
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new BankValidationError('El monto a procesar debe ser mayor que cero.', 'MONTO_INVALIDO');
  }

  if (String(details.cvv) === '000') {
    return {
      approved: false,
      code: null,
      bank: 'Entidad bancaria',
      message: 'Transacción rechazada por la entidad bancaria.',
      ...card,
    };
  }

  return {
    approved: true,
    code: createAuthorizationCode('CARD'),
    bank: 'Entidad bancaria',
    message: 'Tarjeta autorizada correctamente.',
    ...card,
  };
};

module.exports = {
  BankValidationError,
  authorizeCard,
  createAuthorizationCode,
  detectCardBrand,
  hashCardCvv,
  hashCardNumber,
  normalizeExpiry,
  normalizeSinpePhone,
  secureBufferEquals,
  validateCardDetails,
};
