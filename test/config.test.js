const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRuntimeConfig,
  parseBoolean,
  parseCorsOrigins,
  parseDatabaseEndpoint,
  validateEnvironment,
} = require('../src/config');

const validProductionEnv = () => ({
  NODE_ENV: 'production',
  RENDER: 'true',
  DB_SERVER: 'sql.ejemplo.com',
  DB_DATABASE: 'RetroGarage',
  DB_USER: 'retrogarage_app',
  DB_PASSWORD: 'secret',
  CORS_ORIGINS: 'https://app.ejemplo.com',
  DATA_ENCRYPTION_KEY: '12345678901234567890123456789012',
  SMTP_HOST: 'smtp.ejemplo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer',
  SMTP_PASS: 'secret',
  SMTP_FROM: 'no-reply@ejemplo.com',
  PAYPAL_MODE: 'sandbox',
  PAYPAL_CLIENT_ID: 'client-id',
  PAYPAL_CLIENT_SECRET: 'client-secret',
  PAYPAL_CRC_PER_USD: '500',
  PAYPAL_RETURN_URL: 'https://app.ejemplo.com/pagos/paypal-retorno',
  PAYPAL_CANCEL_URL: 'https://app.ejemplo.com/pagos/paypal-retorno',
  TIPO_CAMBIO_RESPALDO_CRC_USD: '500',
  TIPO_CAMBIO_API_URL: 'https://api.hacienda.go.cr/indicadores/tc',
});

test('interpreta booleanos y orígenes permitidos', () => {
  assert.equal(parseBoolean('true'), true);
  assert.equal(parseBoolean('false', true), false);
  assert.deepEqual(
    parseCorsOrigins('https://a.example/, https://b.example,https://a.example'),
    ['https://a.example', 'https://b.example'],
  );
});

test('separa el host y una instancia nombrada de SQL Server', () => {
  assert.deepEqual(
    parseDatabaseEndpoint('sql.example.com\\MSSQLSERVER2019'),
    { server: 'sql.example.com', instanceName: 'MSSQLSERVER2019' },
  );
  assert.deepEqual(
    parseDatabaseEndpoint('sql.example.com', 'MSSQLSERVER2019'),
    { server: 'sql.example.com', instanceName: 'MSSQLSERVER2019' },
  );
  assert.deepEqual(
    parseDatabaseEndpoint('sql.example.com'),
    { server: 'sql.example.com', instanceName: null },
  );
});

test('aplica configuración segura por defecto en producción', () => {
  const config = buildRuntimeConfig(validProductionEnv());
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.trustProxyHops, 1);
  assert.equal(config.db.encrypt, true);
  assert.equal(config.db.trustServerCertificate, false);
});

test('acepta una configuración de producción completa', () => {
  assert.doesNotThrow(() => validateEnvironment(validProductionEnv()));
});

test('rechaza localhost y secretos faltantes en Render', () => {
  const env = validProductionEnv();
  env.DB_SERVER = 'localhost';
  delete env.DATA_ENCRYPTION_KEY;

  assert.throws(
    () => validateEnvironment(env),
    /DATA_ENCRYPTION_KEY[\s\S]*DB_SERVER debe ser el host público de Plesk/,
  );
});

test('rechaza booleanos, puertos y orígenes inválidos', () => {
  const env = validProductionEnv();
  env.DB_ENCRYPT = 'yes';
  env.DB_PORT = 'abc';
  env.CORS_ORIGINS = '*';

  assert.throws(
    () => validateEnvironment(env),
    /CORS_ORIGINS[\s\S]*DB_ENCRYPT debe ser true o false[\s\S]*DB_PORT debe ser un número entero/,
  );
});
