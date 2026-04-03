const API_KEY_HEADER = 'x-api-key';
const CLIENT_VERSION_HEADER = 'x-client-version';
const VALID_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'];

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,x-api-key,x-client-version',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(payload),
  };
}

function getHeader(event, headerName) {
  const headers = event.headers ?? {};
  const lowerHeaderName = headerName.toLowerCase();

  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerHeaderName);
  return found ? String(found[1]) : '';
}

function authenticate(event) {
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    return { ok: false, error: 'Auth no configurada en el backend.' };
  }

  const apiKey = getHeader(event, API_KEY_HEADER);

  if (!apiKey || apiKey !== expectedKey) {
    return { ok: false, error: 'Unauthorized' };
  }

  return { ok: true };
}

function parseJsonBody(event) {
  if (!event.body) {
    return { ok: false, error: 'Body requerido.' };
  }

  try {
    return { ok: true, value: JSON.parse(event.body) };
  } catch {
    return { ok: false, error: 'Body JSON invalido.' };
  }
}

function validateBootstrapBody(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const { awsRegion, message } = body;

  if (typeof awsRegion !== 'string' || !VALID_REGIONS.includes(awsRegion)) {
    return { ok: false, error: 'awsRegion invalida.' };
  }

  if (typeof message !== 'string' || message.trim().length < 2 || message.length > 120) {
    return { ok: false, error: 'message invalido.' };
  }

  return { ok: true };
}

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, { success: true });
  }

  const auth = authenticate(event);

  if (!auth.ok) {
    return jsonResponse(401, { success: false, error: auth.error });
  }

  const method = event.requestContext?.http?.method ?? event.httpMethod;
  const path = event.requestContext?.http?.path ?? event.path;

  if (method === 'GET' && path === '/health') {
    const clientVersion = getHeader(event, CLIENT_VERSION_HEADER);

    if (!clientVersion) {
      return jsonResponse(400, { success: false, error: 'Header x-client-version requerido.' });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        status: 'ok',
        service: 'finanzas-lambda',
      },
    });
  }

  if (method === 'POST' && path === '/bootstrap/ping') {
    const bodyResult = parseJsonBody(event);

    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const bodyValidation = validateBootstrapBody(bodyResult.value);

    if (!bodyValidation.ok) {
      return jsonResponse(400, { success: false, error: bodyValidation.error });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        message: `Lambda listo en region ${bodyResult.value.awsRegion}: ${bodyResult.value.message.trim()}`,
      },
    });
  }

  return jsonResponse(404, {
    success: false,
    error: 'Ruta no encontrada.',
  });
}
