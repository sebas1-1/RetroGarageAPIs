const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findApprovalUrl,
  getCaptureMockHeaders,
  resetTokenCache,
} = require('../src/paypalClient');
const { convertCrcToUsd } = require('../src/routes/paypal');

test.afterEach(() => {
  resetTokenCache();
});

test('encuentra el enlace payer-action de una orden PayPal', () => {
  const url = findApprovalUrl({
    links: [
      { rel: 'self', href: 'https://api.example/order' },
      { rel: 'payer-action', href: 'https://sandbox.paypal.com/approve' },
    ],
  });

  assert.equal(url, 'https://sandbox.paypal.com/approve');
});

test('acepta approve como enlace de compatibilidad', () => {
  const url = findApprovalUrl({
    links: [
      { rel: 'approve', href: 'https://sandbox.paypal.com/checkout' },
    ],
  });

  assert.equal(url, 'https://sandbox.paypal.com/checkout');
});

test('devuelve null si PayPal no entrega enlace de aprobacion', () => {
  assert.equal(findApprovalUrl({ links: [] }), null);
});

test('convierte colones a USD con dos decimales', () => {
  assert.equal(convertCrcToUsd(15000, 500), 30);
  assert.equal(convertCrcToUsd(8000, 500), 16);
  assert.equal(convertCrcToUsd(1000, 515), 1.94);
});

test('agrega rechazo simulado solo en PayPal Sandbox', () => {
  const previousMode = process.env.PAYPAL_MODE;
  const previousMock = process.env.PAYPAL_SANDBOX_MOCK_ERROR;
  try {
    process.env.PAYPAL_MODE = 'sandbox';
    process.env.PAYPAL_SANDBOX_MOCK_ERROR = 'INSTRUMENT_DECLINED';
    assert.deepEqual(getCaptureMockHeaders(), {
      'PayPal-Mock-Response':
        '{"mock_application_codes":"INSTRUMENT_DECLINED"}',
    });

    process.env.PAYPAL_MODE = 'live';
    assert.deepEqual(getCaptureMockHeaders(), {});
  } finally {
    process.env.PAYPAL_MODE = previousMode;
    if (previousMock === undefined) {
      delete process.env.PAYPAL_SANDBOX_MOCK_ERROR;
    } else {
      process.env.PAYPAL_SANDBOX_MOCK_ERROR = previousMock;
    }
  }
});
