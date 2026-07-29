const DEFAULT_API_URL = 'https://api.hacienda.go.cr/indicadores/tc';
const DEFAULT_CACHE_MS = 30 * 60 * 1000;

class ExchangeRateError extends Error {
  constructor(message, code = 'TIPO_CAMBIO_ERROR') {
    super(message);
    this.name = 'ExchangeRateError';
    this.code = code;
  }
}

let cachedRate = null;

const asValidRate = (value, field) => {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 100 || rate > 2000) {
    throw new ExchangeRateError(
      `El valor de ${field} recibido no es válido.`,
      'TIPO_CAMBIO_RESPUESTA_INVALIDA',
    );
  }
  return rate;
};

const asValidDate = (value) => {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ExchangeRateError(
      'La fecha del tipo de cambio no es válida.',
      'TIPO_CAMBIO_RESPUESTA_INVALIDA',
    );
  }
  return date;
};

const getFallbackRate = () => {
  const rate = Number(process.env.TIPO_CAMBIO_RESPALDO_CRC_USD);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new ExchangeRateError(
      'No existe un tipo de cambio de respaldo configurado.',
      'TIPO_CAMBIO_CONFIG_ERROR',
    );
  }

  return {
    compra: null,
    venta: rate,
    fecha: null,
    fuente: 'CONFIGURACION_RESPALDO',
    es_respaldo: true,
    obtenido_en: new Date().toISOString(),
  };
};

const getCacheDuration = () => {
  const configured = Number(process.env.TIPO_CAMBIO_CACHE_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_CACHE_MS;
};

const getExchangeRate = async ({
  forceRefresh = false,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedRate && cachedRate.expiresAt > now) {
    return { ...cachedRate.value };
  }

  if (typeof fetchImpl !== 'function') {
    return getFallbackRate();
  }

  const apiUrl =
    process.env.TIPO_CAMBIO_API_URL || DEFAULT_API_URL;

  try {
    const response = await fetchImpl(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      throw new ExchangeRateError(
        `Hacienda respondió con estado ${response.status}.`,
        'TIPO_CAMBIO_HTTP_ERROR',
      );
    }

    const body = await response.json();
    const value = {
      compra: asValidRate(body?.dolar?.compra?.valor, 'compra'),
      venta: asValidRate(body?.dolar?.venta?.valor, 'venta'),
      fecha: asValidDate(body?.dolar?.venta?.fecha),
      fuente: 'HACIENDA_BCCR',
      es_respaldo: false,
      obtenido_en: new Date().toISOString(),
    };

    cachedRate = {
      value,
      expiresAt: now + getCacheDuration(),
    };
    return { ...value };
  } catch (error) {
    if (cachedRate) {
      return {
        ...cachedRate.value,
        cache_expirada: true,
      };
    }
    return getFallbackRate();
  }
};

const resetExchangeRateCache = () => {
  cachedRate = null;
};

module.exports = {
  DEFAULT_API_URL,
  ExchangeRateError,
  getExchangeRate,
  resetExchangeRateCache,
};
