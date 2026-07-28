const test = require('node:test');
const assert = require('node:assert/strict');
const {
  authorizeCard,
  detectCardBrand,
  hashCardCvv,
  hashCardNumber,
  normalizeExpiry,
  normalizeSinpePhone,
  secureBufferEquals,
  validateCardDetails,
} = require('../src/bankSimulator');

test('detecta Visa y Mastercard según los prefijos requeridos', () => {
  assert.equal(detectCardBrand('4111111111111111'), 'VISA');
  assert.equal(detectCardBrand('5555555555554444'), 'MASTERCARD');
  assert.equal(detectCardBrand('2223000048400011'), 'MASTERCARD');
});

test('rechaza marcas no admitidas y números con longitud incorrecta', () => {
  assert.equal(detectCardBrand('3111111111111111'), null);
  assert.equal(detectCardBrand('411111111111111'), null);
  assert.throws(
    () => validateCardDetails({
      numero_tarjeta: '3111111111111111',
      fecha_vencimiento: '12/30',
      cvv: '123',
    }),
    /Solo se aceptan/,
  );
});

test('valida vencimiento y CVV', () => {
  assert.equal(normalizeExpiry('07/26', new Date(2026, 6, 1)), '07/26');
  assert.throws(() => normalizeExpiry('06/26', new Date(2026, 6, 1)), /vencida/);
  assert.throws(
    () => validateCardDetails({
      numero_tarjeta: '4111111111111111',
      fecha_vencimiento: '12/30',
      cvv: '12',
    }),
    /3 dígitos/,
  );
});

test('autoriza una tarjeta válida y simula rechazo con CVV 000', () => {
  const approved = authorizeCard({
    numero_tarjeta: '4111111111111111',
    fecha_vencimiento: '12/30',
    cvv: '123',
  }, 1000);
  assert.equal(approved.approved, true);
  assert.match(approved.code, /^CARD-/);

  const rejected = authorizeCard({
    numero_tarjeta: '5555555555554444',
    fecha_vencimiento: '12/30',
    cvv: '000',
  }, 1000);
  assert.equal(rejected.approved, false);
  assert.equal(rejected.code, null);
});

test('normaliza únicamente teléfonos SINPE de 8 dígitos', () => {
  assert.equal(normalizeSinpePhone('8888-7777'), '88887777');
  assert.throws(() => normalizeSinpePhone('8887777'), /8 dígitos/);
});

test('genera hashes deterministas sin guardar número ni CVV en texto plano', () => {
  const cardHash = hashCardNumber('4111 1111 1111 1111');
  const sameCardHash = hashCardNumber('4111111111111111');
  const cvvHash = hashCardCvv('4111111111111111', '123');

  assert.equal(secureBufferEquals(cardHash, sameCardHash), true);
  assert.equal(secureBufferEquals(cardHash, cvvHash), false);
  assert.equal(cardHash.length, 32);
});
