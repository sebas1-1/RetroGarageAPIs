const { getPool, sql } = require('./db');

const ignoredPaths = [
  /^\/api\/usuarios\/login$/,
  /^\/api\/usuarios\/login\/otp$/,
  /^\/api\/usuarios\/recuperacion\//,
  /^\/health$/,
];

const actionByMethod = {
  POST: 'registró',
  PUT: 'modificó',
  PATCH: 'actualizó',
  DELETE: 'eliminó',
};

const resourceLabels = {
  autos: 'auto',
  categorias: 'categoría',
  citas: 'cita',
  clientes: 'cliente',
  pagos: 'pago',
  productos: 'producto',
  servicios: 'servicio',
  usuarios: 'usuario',
};

const sensitiveFields = new Set([
  'contrasena',
  'nueva_contrasena',
  'respuesta',
  'respuesta1',
  'respuesta2',
  'correo',
  'telefono',
  'identificacion',
]);

// Debe coincidir EXACTAMENTE con el tamaño de la columna auditoria.movimiento
// (actualmente VARCHAR(300) tras el ALTER TABLE). Si cambias el tamaño de la
// columna en la base de datos, actualiza este valor también.
const MOVIMIENTO_MAX_LENGTH = 300;

const getActorId = (req) => {
  const rawId =
    req.headers['x-user-id'] ||
    req.body?.id_usuario_admin ||
    req.body?.id_admin ||
    req.body?.id_usuario;
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getResourceName = (req) => {
  const parts = req.path.split('/').filter(Boolean);
  return parts[1] || parts[0] || 'recurso';
};

const getResourceLabel = (resource) => resourceLabels[resource] || resource;

const getRouteTarget = (req) => {
  if (req.params?.id) return ` ID ${req.params.id}`;
  if (req.params?.identificacion) return ' del cliente indicado';
  return '';
};

const summarizeValue = (key, value) => {
  if (value === null || value === undefined || value === '') return null;
  if (sensitiveFields.has(key)) return `${key}: [protegido]`;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `${key}: ${value.length} elemento(s)`;
    return null;
  }
  return `${key}: ${String(value).slice(0, 40)}`;
};

const summarizeBody = (body = {}, preferredFields = []) => {
  const fields = preferredFields.length ? preferredFields : Object.keys(body);
  const summary = fields
    .map((field) => summarizeValue(field, body[field]))
    .filter(Boolean);

  return summary.length ? ` (${summary.join(', ')})` : '';
};

const getActionDetail = (req, resource) => {
  if (resource === 'citas' && req.path.endsWith('/estado')) {
    return `actualizó el estado de la cita ID ${req.params.id}${summarizeBody(req.body, ['estado'])}`;
  }

  if (resource === 'productos' && req.path.endsWith('/agotado')) {
    return `marcó como agotado el producto ID ${req.params.id}`;
  }

  if (resource === 'autos' && req.params?.identificacion) {
    return `actualizó los autos asociados a un cliente (${(req.body?.autos || []).length} auto(s))`;
  }

  return null;
};

const buildMovement = (req) => {
  const resource = getResourceName(req);
  const detail = getActionDetail(req, resource);
  if (detail) return detail.slice(0, MOVIMIENTO_MAX_LENGTH);

  const action = actionByMethod[req.method] || req.method.toLowerCase();
  const label = getResourceLabel(resource);
  const target = getRouteTarget(req);

  const summaryByResource = {
    autos: ['marca', 'modelo', 'anio', 'placa'],
    categorias: ['nombre', 'tipo'],
    citas: ['id_cliente', 'id_servicio', 'fecha', 'hora', 'estado'],
    clientes: ['nombre', 'apellido', 'identificacion'],
    pagos: ['numero_factura', 'id_cita', 'monto', 'estado_pago'],
    productos: ['nombre', 'sku', 'stock_actual', 'precio_venta'],
    servicios: ['nombre', 'id_categoria', 'precio_base'],
    usuarios: ['nombre_usuario', 'nombre_completo', 'id_rol'],
  };

  const summary = summarizeBody(req.body, summaryByResource[resource] || []);
  return `El administrador ${action} ${label}${target}${summary}`.slice(0, MOVIMIENTO_MAX_LENGTH);
};

const shouldAudit = (req, res) =>
  Boolean(actionByMethod[req.method]) &&
  res.statusCode >= 200 &&
  res.statusCode < 400 &&
  !ignoredPaths.some((pattern) => pattern.test(req.path));

const registerAudit = async (req, res) => {
  if (!shouldAudit(req, res)) return;

  const idUsuario = getActorId(req);
  if (!idUsuario) {
    console.warn(`Auditoria omitida sin x-user-id: ${req.method} ${req.originalUrl}`);
    return;
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('id_usuario', sql.Int, idUsuario)
      .input('movimiento', sql.NVarChar, buildMovement(req))
      .query(`
        INSERT INTO auditoria (id_usuario, movimiento, fecha_movimiento)
        VALUES (@id_usuario, @movimiento, GETDATE())
      `);
  } catch (err) {
    console.error('Error al registrar auditoria:', err);
  }
};

const auditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    registerAudit(req, res);
  });
  next();
};

module.exports = auditMiddleware;