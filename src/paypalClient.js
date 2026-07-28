class PayPalApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = options.status || 502;
    this.code = options.code || 'PAYPAL_ERROR';
    this.debugId = options.debugId || null;
    this.details = options.details || [];
  }
}

let cachedToken = null;
let tokenExpiresAt = 0;

const getConfig = () => {
  const mode = String(process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) {
    throw new PayPalApiError('Faltan las credenciales de PayPal en el servidor.', {
      status: 500,
      code: 'PAYPAL_CONFIG_ERROR',
    });
  }
  if (!['sandbox', 'live'].includes(mode)) {
    throw new PayPalApiError('PAYPAL_MODE debe ser sandbox o live.', {
      status: 500,
      code: 'PAYPAL_CONFIG_ERROR',
    });
  }

  return {
    mode,
    clientId,
    clientSecret,
    baseUrl:
      mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
  };
};

const readJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const config = getConfig();
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
    'utf8',
  ).toString('base64');

  let response;
  try {
    response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new PayPalApiError('No fue posible conectar con PayPal.', {
      code: 'PAYPAL_CONNECTION_ERROR',
      details: [error.message],
    });
  }

  const body = await readJsonSafely(response);
  if (!response.ok || !body.access_token) {
    throw new PayPalApiError('PayPal rechazó las credenciales del servidor.', {
      status: response.status === 401 ? 500 : 502,
      code: 'PAYPAL_AUTH_ERROR',
      debugId: body.debug_id,
      details: body.details,
    });
  }

  cachedToken = body.access_token;
  const validForSeconds = Math.max(Number(body.expires_in) || 0, 120);
  tokenExpiresAt = Date.now() + (validForSeconds - 60) * 1000;
  return cachedToken;
};

const paypalRequest = async (path, options = {}) => {
  const config = getConfig();
  const accessToken = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    throw new PayPalApiError('No fue posible conectar con PayPal.', {
      code: 'PAYPAL_CONNECTION_ERROR',
      details: [error.message],
    });
  }

  const body = await readJsonSafely(response);
  if (!response.ok) {
    throw new PayPalApiError(
      body.message || 'PayPal no pudo procesar la solicitud.',
      {
        status: response.status,
        code: body.name || 'PAYPAL_API_ERROR',
        debugId: body.debug_id,
        details: body.details,
      },
    );
  }

  return body;
};

const createOrder = ({
  value,
  currency = 'USD',
  referenceId,
  description,
  returnUrl,
  cancelUrl,
  requestId,
}) =>
  paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': requestId,
    },
    body: {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: referenceId,
          custom_id: referenceId,
          description,
          amount: {
            currency_code: currency,
            value,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'Retro Garage',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    },
  });

const captureOrder = (orderId, requestId) =>
  paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': requestId,
      ...getCaptureMockHeaders(),
    },
    body: {},
  });

const getOrder = (orderId) =>
  paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);

const getCaptureMockHeaders = () => {
  const mode = String(process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  const mockCode = String(
    process.env.PAYPAL_SANDBOX_MOCK_ERROR || '',
  ).trim();
  if (!mockCode || mode !== 'sandbox') return {};

  const allowedCodes = new Set([
    'INSTRUMENT_DECLINED',
    'TRANSACTION_REFUSED',
    'INTERNAL_SERVER_ERROR',
  ]);
  if (!allowedCodes.has(mockCode)) {
    throw new PayPalApiError(
      'PAYPAL_SANDBOX_MOCK_ERROR no contiene un código permitido.',
      {
        status: 500,
        code: 'PAYPAL_CONFIG_ERROR',
      },
    );
  }

  return {
    'PayPal-Mock-Response': JSON.stringify({
      mock_application_codes: mockCode,
    }),
  };
};

const findApprovalUrl = (order) =>
  order?.links?.find((link) => link.rel === 'payer-action')?.href ||
  order?.links?.find((link) => link.rel === 'approve')?.href ||
  null;

const resetTokenCache = () => {
  cachedToken = null;
  tokenExpiresAt = 0;
};

module.exports = {
  PayPalApiError,
  captureOrder,
  createOrder,
  findApprovalUrl,
  getCaptureMockHeaders,
  getOrder,
  resetTokenCache,
};
