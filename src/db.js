const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port:     parseInt(process.env.DB_PORT),
  options: {
    encrypt:               false,
    trustServerCertificate: true,
  },
};

let pool;

async function getPool() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}

module.exports = { getPool, sql };