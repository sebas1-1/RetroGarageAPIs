const test = require('node:test');
const assert = require('node:assert/strict');

const { createFieldCrypto } = require('../src/security');

test('cifra de forma determinista y descifra con la misma clave', () => {
  const cryptoSuite = createFieldCrypto('12345678901234567890123456789012');
  const first = cryptoSuite.encryptField('cliente.correo', 'persona@example.com');
  const second = cryptoSuite.encryptField('cliente.correo', 'persona@example.com');

  assert.equal(first, second);
  assert.match(first, /^enc:v1:/);
  assert.equal(
    cryptoSuite.decryptField('cliente.correo', first),
    'persona@example.com',
  );
});

test('una clave diferente no puede descifrar el dato', () => {
  const oldCrypto = createFieldCrypto('12345678901234567890123456789012');
  const newCrypto = createFieldCrypto('abcdefghijklmnopqrstuvwxyz123456');
  const encrypted = oldCrypto.encryptField('cliente.telefono', '88887777');

  assert.throws(
    () => newCrypto.decryptField('cliente.telefono', encrypted),
    /authenticate data/,
  );
});
