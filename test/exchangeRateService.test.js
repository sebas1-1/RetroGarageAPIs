const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_API_URL,
  getExchangeRate,
  resetExchangeRateCache,
} = require('../src/exchangeRateService');

test.afterEach(() => {
  resetExchangeRateCache();
});

test('obtiene y valida compra y venta del dolar', async () => {
  let requestedUrl = null;
  const result = await getExchangeRate({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          dolar: {
            venta: { fecha: '2026-07-28', valor: 454.34 },
            compra: { fecha: '2026-07-28', valor: 449.82 },
          },
        }),
      };
    },
  });

  assert.equal(requestedUrl, DEFAULT_API_URL);
  assert.equal(result.venta, 454.34);
  assert.equal(result.compra, 449.82);
  assert.equal(result.fecha, '2026-07-28');
  assert.equal(result.fuente, 'HACIENDA_BCCR');
  assert.equal(result.es_respaldo, false);
});

test('reutiliza la respuesta almacenada en cache', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        dolar: {
          venta: { fecha: '2026-07-28', valor: 454.34 },
          compra: { fecha: '2026-07-28', valor: 449.82 },
        },
      }),
    };
  };

  await getExchangeRate({ fetchImpl });
  await getExchangeRate({ fetchImpl });
  assert.equal(calls, 1);
});

test('utiliza la tasa configurada si Hacienda no responde', async () => {
  const previousRate = process.env.PAYPAL_CRC_PER_USD;
  try {
    process.env.PAYPAL_CRC_PER_USD = '500';
    const result = await getExchangeRate({
      fetchImpl: async () => {
        throw new Error('Sin conexión');
      },
    });

    assert.equal(result.venta, 500);
    assert.equal(result.compra, null);
    assert.equal(result.fuente, 'CONFIGURACION_RESPALDO');
    assert.equal(result.es_respaldo, true);
  } finally {
    if (previousRate === undefined) {
      delete process.env.PAYPAL_CRC_PER_USD;
    } else {
      process.env.PAYPAL_CRC_PER_USD = previousRate;
    }
  }
});
