require('dotenv').config({ quiet: true });

const DEFAULT_LOCAL_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseCorsOrigins = (value, isProduction = false) => {
  if (!value) return isProduction ? [] : [...DEFAULT_LOCAL_ORIGINS];
  return [...new Set(
    String(value)
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  )];
};

const parseDatabaseEndpoint = (serverValue, instanceValue) => {
  const rawServer = String(serverValue || '').trim();
  const separatorIndex = rawServer.indexOf('\\');
  const server = separatorIndex >= 0
    ? rawServer.slice(0, separatorIndex).trim()
    : rawServer;
  const embeddedInstance = separatorIndex >= 0
    ? rawServer.slice(separatorIndex + 1).trim()
    : '';

  return {
    server,
    instanceName: String(instanceValue || embeddedInstance).trim() || null,
  };
};

const buildRuntimeConfig = (env = process.env) => {
  const isProduction = env.NODE_ENV === 'production';
  const databaseEndpoint = parseDatabaseEndpoint(env.DB_SERVER, env.DB_INSTANCE);

  return {
    env: env.NODE_ENV || 'development',
    isProduction,
    host: '0.0.0.0',
    port: parsePositiveInteger(env.PORT, 3001),
    trustProxyHops: parsePositiveInteger(env.TRUST_PROXY_HOPS, isProduction ? 1 : 0),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS, isProduction),
    jsonLimit: env.JSON_BODY_LIMIT || '100kb',
    rateLimitWindowMs: parsePositiveInteger(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: parsePositiveInteger(env.RATE_LIMIT_MAX, 300),
    authRateLimitMax: parsePositiveInteger(env.AUTH_RATE_LIMIT_MAX, 20),
    db: {
      server: databaseEndpoint.server,
      instanceName: databaseEndpoint.instanceName,
      database: env.DB_DATABASE,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      port: parsePositiveInteger(env.DB_PORT, 1433),
      encrypt: parseBoolean(env.DB_ENCRYPT, isProduction),
      trustServerCertificate: parseBoolean(
        env.DB_TRUST_SERVER_CERTIFICATE,
        !isProduction,
      ),
      connectionTimeout: parsePositiveInteger(env.DB_CONNECTION_TIMEOUT_MS, 15000),
      requestTimeout: parsePositiveInteger(env.DB_REQUEST_TIMEOUT_MS, 30000),
      poolMax: parsePositiveInteger(env.DB_POOL_MAX, 10),
      poolMin: Number.isInteger(Number(env.DB_POOL_MIN)) && Number(env.DB_POOL_MIN) >= 0
        ? Number(env.DB_POOL_MIN)
        : 0,
      poolIdleTimeout: parsePositiveInteger(env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
    },
  };
};

const validateUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

const validateEnvironment = (env = process.env) => {
  const runtime = buildRuntimeConfig(env);
  const errors = [];
  const required = ['DB_SERVER', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD'];

  if (runtime.isProduction) {
    required.push(
      'CORS_ORIGINS',
      'DATA_ENCRYPTION_KEY',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM',
      'PAYPAL_MODE',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_CRC_PER_USD',
      'PAYPAL_RETURN_URL',
      'PAYPAL_CANCEL_URL',
      'TIPO_CAMBIO_RESPALDO_CRC_USD',
    );
  }

  const missing = required.filter((key) => !String(env[key] || '').trim());
  if (missing.length) errors.push(`Faltan variables obligatorias: ${missing.join(', ')}`);

  if (runtime.isProduction && runtime.corsOrigins.includes('*')) {
    errors.push('CORS_ORIGINS no puede contener * en producción.');
  }

  if (runtime.isProduction && String(env.DATA_ENCRYPTION_KEY || '').length < 32) {
    errors.push('DATA_ENCRYPTION_KEY debe contener al menos 32 caracteres.');
  }

  if (env.RENDER === 'true' && /^(localhost|127\.0\.0\.1)$/i.test(runtime.db.server || '')) {
    errors.push('DB_SERVER debe ser el host público de Plesk, no localhost.');
  }

  if (env.PAYPAL_MODE && !['sandbox', 'live'].includes(String(env.PAYPAL_MODE).toLowerCase())) {
    errors.push('PAYPAL_MODE debe ser sandbox o live.');
  }

  for (const key of ['DB_ENCRYPT', 'DB_TRUST_SERVER_CERTIFICATE', 'SMTP_SECURE']) {
    if (env[key] && !['true', 'false'].includes(String(env[key]).toLowerCase())) {
      errors.push(`${key} debe ser true o false.`);
    }
  }

  for (const key of [
    'DB_PORT',
    'DB_CONNECTION_TIMEOUT_MS',
    'DB_REQUEST_TIMEOUT_MS',
    'DB_POOL_MAX',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX',
    'AUTH_RATE_LIMIT_MAX',
    'SMTP_PORT',
  ]) {
    if (env[key] && (!Number.isInteger(Number(env[key])) || Number(env[key]) <= 0)) {
      errors.push(`${key} debe ser un número entero mayor que cero.`);
    }
  }

  if (
    env.DB_POOL_MIN !== undefined &&
    (!Number.isInteger(Number(env.DB_POOL_MIN)) || Number(env.DB_POOL_MIN) < 0)
  ) {
    errors.push('DB_POOL_MIN debe ser un número entero mayor o igual que cero.');
  }

  for (const origin of runtime.corsOrigins) {
    if (!/^https?:\/\//i.test(origin) || !validateUrl(origin)) {
      errors.push(`Origen CORS inválido: ${origin}.`);
    }
  }

  for (const key of ['PAYPAL_RETURN_URL', 'PAYPAL_CANCEL_URL', 'TIPO_CAMBIO_API_URL']) {
    if (env[key] && !validateUrl(env[key])) errors.push(`${key} no contiene una URL válida.`);
  }

  for (const key of ['PAYPAL_CRC_PER_USD', 'TIPO_CAMBIO_RESPALDO_CRC_USD']) {
    if (env[key] && (!Number.isFinite(Number(env[key])) || Number(env[key]) <= 0)) {
      errors.push(`${key} debe ser un número mayor que cero.`);
    }
  }

  if (errors.length) {
    const error = new Error(`Configuración inválida:\n- ${errors.join('\n- ')}`);
    error.code = 'INVALID_ENVIRONMENT';
    throw error;
  }

  return runtime;
};

const config = buildRuntimeConfig();

module.exports = {
  DEFAULT_LOCAL_ORIGINS,
  buildRuntimeConfig,
  config,
  parseBoolean,
  parseCorsOrigins,
  parseDatabaseEndpoint,
  parsePositiveInteger,
  validateEnvironment,
};
