const sql = require('mssql');
const { config: runtimeConfig } = require('./config');

const config = {
  server: runtimeConfig.db.server,
  database: runtimeConfig.db.database,
  user: runtimeConfig.db.user,
  password: runtimeConfig.db.password,
  connectionTimeout: runtimeConfig.db.connectionTimeout,
  requestTimeout: runtimeConfig.db.requestTimeout,
  pool: {
    max: runtimeConfig.db.poolMax,
    min: runtimeConfig.db.poolMin,
    idleTimeoutMillis: runtimeConfig.db.poolIdleTimeout,
  },
  options: {
    encrypt: runtimeConfig.db.encrypt,
    trustServerCertificate: runtimeConfig.db.trustServerCertificate,
    enableArithAbort: true,
    appName: 'RetroGarageAPI',
  },
};

if (runtimeConfig.db.instanceName) {
  config.options.instanceName = runtimeConfig.db.instanceName;
} else {
  config.port = runtimeConfig.db.port;
}

let pool;
let poolPromise;

async function getPool() {
  if (pool?.connected) return pool;
  if (poolPromise) return poolPromise;

  pool = new sql.ConnectionPool(config);
  pool.on('error', (error) => {
    console.error('Error en el pool de SQL Server:', error.message);
  });

  poolPromise = pool.connect()
    .then((connectedPool) => connectedPool)
    .catch((error) => {
      pool = null;
      throw error;
    })
    .finally(() => {
      poolPromise = null;
    });

  return poolPromise;
}

async function checkDatabaseConnection() {
  const activePool = await getPool();
  await activePool.request().query('SELECT 1 AS ok');
  return true;
}

async function closePool() {
  if (!pool) return;
  const activePool = pool;
  pool = null;
  poolPromise = null;
  await activePool.close();
}

module.exports = {
  checkDatabaseConnection,
  closePool,
  getPool,
  sql,
};
