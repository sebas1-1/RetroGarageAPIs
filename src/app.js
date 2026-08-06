const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');

const { config } = require('./config');
const { checkDatabaseConnection } = require('./db');
const auditMiddleware = require('./audit');
const autos = require('./routes/autos');
const bancoSimulado = require('./routes/bancoSimulado');
const categoriasRouter = require('./routes/categorias');
const citas = require('./routes/citas');
const clientes = require('./routes/clientes');
const geografia = require('./routes/geografia');
const pagos = require('./routes/pagos');
const paypal = require('./routes/paypal');
const productos = require('./routes/productos');
const servicios = require('./routes/servicios');
const usuarios = require('./routes/usuarios');

const app = express();

app.disable('x-powered-by');
if (config.trustProxyHops > 0) app.set('trust proxy', config.trustProxyHops);

app.use(helmet());
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }

    const error = new Error('Origen no autorizado por CORS.');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id', 'x-user-id'],
  exposedHeaders: ['x-request-id'],
  maxAge: 86400,
}));

app.use(express.json({ limit: config.jsonLimit }));

const limiterOptions = {
  windowMs: config.rateLimitWindowMs,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
};

const apiLimiter = rateLimit({
  ...limiterOptions,
  limit: config.rateLimitMax,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' },
});

const authLimiter = rateLimit({
  ...limiterOptions,
  limit: config.authRateLimitMax,
  message: { error: 'Demasiados intentos. Intente nuevamente más tarde.' },
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'retrogarage-api',
    environment: config.env,
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    console.error('Comprobación de disponibilidad fallida:', error.message);
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

app.use('/api/usuarios/login', authLimiter);
app.use('/api/usuarios/recuperacion', authLimiter);
app.use('/api', apiLimiter);
app.use(auditMiddleware);

app.use('/api/clientes', clientes);
app.use('/api/usuarios', usuarios);
app.use('/api/servicios', servicios);
app.use('/api/citas', citas);
app.use('/api/categorias', categoriasRouter);
app.use('/api/productos', productos);
app.use('/api/pagos/paypal', paypal);
app.use('/api/pagos', pagos);
app.use('/api/banco-simulado', bancoSimulado);
app.use('/api/autos', autos);
app.use('/api/geografia', geografia);

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada.',
    request_id: req.requestId,
  });
});

app.use((error, req, res, _next) => {
  const invalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const status = invalidJson ? 400 : Number(error.status) || 500;

  if (status >= 500) {
    console.error('Error HTTP no controlado:', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      message: error.message,
    });
  }

  res.status(status).json({
    error: invalidJson
      ? 'El cuerpo de la solicitud no contiene JSON válido.'
      : status >= 500
        ? 'Error interno del servidor.'
        : error.message,
    request_id: req.requestId,
  });
});

module.exports = app;
