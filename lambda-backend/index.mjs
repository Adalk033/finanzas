import pg from 'pg';

const { Pool } = pg;

const API_KEY_HEADER = 'x-api-key';
const CLIENT_VERSION_HEADER = 'x-client-version';
const VALID_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'];
const ALLOWED_BANK_ICON_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const ALLOWED_HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const ALLOWED_LAST_FOUR_PATTERN = /^\d{4}$/;
const ALLOWED_INSTRUMENT_TYPES = new Set(['credit_card', 'debit_card', 'account']);

let pool;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,x-api-key,x-client-version',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(payload),
  };
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL no configurada.');
  }

  return new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 3,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 5000,
  });
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

async function query(text, values = []) {
  const db = getPool();
  return db.query(text, values);
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

function parseInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parsePathParameters(path) {
  const banksWithId = path.match(/^\/banks\/(\d+)$/);
  if (banksWithId) {
    return { resource: 'banks', id: Number.parseInt(banksWithId[1], 10) };
  }

  if (path === '/banks') {
    return { resource: 'banks', id: null };
  }

  const instrumentsWithId = path.match(/^\/instruments\/(\d+)$/);
  if (instrumentsWithId) {
    return { resource: 'instruments', id: Number.parseInt(instrumentsWithId[1], 10) };
  }

  if (path === '/instruments') {
    return { resource: 'instruments', id: null };
  }

  return { resource: null, id: null };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric;
}

function normalizeNullableInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseInteger(value);
  return parsed;
}

function validateBankPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const shortName = normalizeNullableText(body.shortName);
  const color = normalizeNullableText(body.color);
  const iconName = normalizeNullableText(body.iconName);

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'name debe tener entre 2 y 100 caracteres.' };
  }

  if (shortName && shortName.length > 20) {
    return { ok: false, error: 'shortName no puede exceder 20 caracteres.' };
  }

  if (color && !ALLOWED_HEX_COLOR_PATTERN.test(color)) {
    return { ok: false, error: 'color debe tener formato hexadecimal #RRGGBB.' };
  }

  if (iconName && (iconName.length > 50 || !ALLOWED_BANK_ICON_PATTERN.test(iconName))) {
    return { ok: false, error: 'iconName invalido.' };
  }

  return {
    ok: true,
    value: {
      name,
      shortName,
      color,
      iconName,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  };
}

function validateInstrumentPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const bankId = normalizeNullableInteger(body.bankId);
  const name = normalizeText(body.name);
  const type = normalizeText(body.type);
  const lastFour = normalizeNullableText(body.lastFour);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const creditLimit = normalizeNullableNumber(body.creditLimit);
  const currentBalance = normalizeNullableNumber(body.currentBalance);
  const availableCredit = normalizeNullableNumber(body.availableCredit);
  const cutOffDay = normalizeNullableInteger(body.cutOffDay);
  const paymentDueDay = normalizeNullableInteger(body.paymentDueDay);
  const annualRate = normalizeNullableNumber(body.annualRate);
  const currentAmount = normalizeNullableNumber(body.currentAmount);
  const notes = normalizeNullableText(body.notes);

  if (!bankId || bankId < 1) {
    return { ok: false, error: 'bankId invalido.' };
  }

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'name debe tener entre 2 y 100 caracteres.' };
  }

  if (!ALLOWED_INSTRUMENT_TYPES.has(type)) {
    return { ok: false, error: 'type invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (lastFour && !ALLOWED_LAST_FOUR_PATTERN.test(lastFour)) {
    return { ok: false, error: 'lastFour debe contener 4 digitos.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  if (type === 'credit_card') {
    if (creditLimit === null || creditLimit < 0 || creditLimit > 9999999999.99) {
      return { ok: false, error: 'creditLimit invalido para tarjeta de credito.' };
    }

    if (currentBalance !== null && (currentBalance < 0 || currentBalance > 9999999999.99)) {
      return { ok: false, error: 'currentBalance invalido.' };
    }

    if (availableCredit !== null && (availableCredit < 0 || availableCredit > 9999999999.99)) {
      return { ok: false, error: 'availableCredit invalido.' };
    }

    if (!cutOffDay || cutOffDay < 1 || cutOffDay > 31) {
      return { ok: false, error: 'cutOffDay invalido.' };
    }

    if (!paymentDueDay || paymentDueDay < 1 || paymentDueDay > 31) {
      return { ok: false, error: 'paymentDueDay invalido.' };
    }
  }

  if (type !== 'credit_card' && currentAmount === null) {
    return { ok: false, error: 'currentAmount es requerido para cuentas y debito.' };
  }

  if (currentAmount !== null && (currentAmount < 0 || currentAmount > 9999999999.99)) {
    return { ok: false, error: 'currentAmount invalido.' };
  }

  return {
    ok: true,
    value: {
      bankId,
      name,
      type,
      lastFour,
      currencyId,
      creditLimit,
      currentBalance: currentBalance ?? 0,
      availableCredit,
      cutOffDay,
      paymentDueDay,
      annualRate,
      currentAmount: currentAmount ?? 0,
      notes,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  };
}

function mapBank(row) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    color: row.color,
    iconName: row.icon_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapInstrument(row) {
  return {
    id: row.id,
    bankId: row.bank_id,
    bankName: row.bank_name,
    name: row.name,
    type: row.type,
    lastFour: row.last_four,
    currencyId: row.currency_id,
    creditLimit: row.credit_limit === null ? null : Number(row.credit_limit),
    currentBalance: row.current_balance === null ? null : Number(row.current_balance),
    availableCredit: row.available_credit === null ? null : Number(row.available_credit),
    cutOffDay: row.cut_off_day,
    paymentDueDay: row.payment_due_day,
    annualRate: row.annual_rate === null ? null : Number(row.annual_rate),
    currentAmount: row.current_amount === null ? null : Number(row.current_amount),
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBanks() {
  const result = await query(
    `
    SELECT id, name, short_name, color, icon_name, is_active, created_at, updated_at
    FROM app_gastos.banks
    WHERE is_active = TRUE
    ORDER BY name ASC
    `,
  );

  return result.rows.map(mapBank);
}

async function createBank(payload) {
  const result = await query(
    `
    INSERT INTO app_gastos.banks (name, short_name, color, icon_name, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, short_name, color, icon_name, is_active, created_at, updated_at
    `,
    [payload.name, payload.shortName, payload.color, payload.iconName, payload.isActive],
  );

  return mapBank(result.rows[0]);
}

async function updateBank(bankId, payload) {
  const result = await query(
    `
    UPDATE app_gastos.banks
    SET name = $1,
        short_name = $2,
        color = $3,
        icon_name = $4,
        is_active = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING id, name, short_name, color, icon_name, is_active, created_at, updated_at
    `,
    [payload.name, payload.shortName, payload.color, payload.iconName, payload.isActive, bankId],
  );

  return result.rows.length > 0 ? mapBank(result.rows[0]) : null;
}

async function softDeleteBank(bankId) {
  const result = await query(
    `
    UPDATE app_gastos.banks
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [bankId],
  );

  return result.rows.length > 0;
}

async function listInstruments(bankId) {
  if (bankId) {
    const result = await query(
      `
      SELECT fi.id, fi.bank_id, b.name AS bank_name, fi.name, fi.type, fi.last_four, fi.currency_id,
             fi.credit_limit, fi.current_balance, fi.available_credit, fi.cut_off_day,
             fi.payment_due_day, fi.annual_rate, fi.current_amount, fi.notes,
             fi.is_active, fi.created_at, fi.updated_at
      FROM app_gastos.financial_instruments fi
      INNER JOIN app_gastos.banks b ON b.id = fi.bank_id
      WHERE fi.is_active = TRUE
        AND fi.bank_id = $1
      ORDER BY b.name ASC, fi.name ASC
      `,
      [bankId],
    );

    return result.rows.map(mapInstrument);
  }

  const result = await query(
    `
    SELECT fi.id, fi.bank_id, b.name AS bank_name, fi.name, fi.type, fi.last_four, fi.currency_id,
           fi.credit_limit, fi.current_balance, fi.available_credit, fi.cut_off_day,
           fi.payment_due_day, fi.annual_rate, fi.current_amount, fi.notes,
           fi.is_active, fi.created_at, fi.updated_at
    FROM app_gastos.financial_instruments fi
    INNER JOIN app_gastos.banks b ON b.id = fi.bank_id
    WHERE fi.is_active = TRUE
    ORDER BY b.name ASC, fi.name ASC
    `,
  );

  return result.rows.map(mapInstrument);
}

async function createInstrument(payload) {
  const result = await query(
    `
    INSERT INTO app_gastos.financial_instruments (
      bank_id,
      name,
      type,
      last_four,
      currency_id,
      credit_limit,
      current_balance,
      available_credit,
      cut_off_day,
      payment_due_day,
      annual_rate,
      current_amount,
      notes,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, $6 - $7), $9, $10, $11, $12, $13, $14)
    RETURNING id, bank_id, name, type, last_four, currency_id,
              credit_limit, current_balance, available_credit, cut_off_day,
              payment_due_day, annual_rate, current_amount, notes,
              is_active, created_at, updated_at
    `,
    [
      payload.bankId,
      payload.name,
      payload.type,
      payload.lastFour,
      payload.currencyId,
      payload.type === 'credit_card' ? payload.creditLimit : null,
      payload.type === 'credit_card' ? payload.currentBalance : null,
      payload.type === 'credit_card' ? payload.availableCredit : null,
      payload.type === 'credit_card' ? payload.cutOffDay : null,
      payload.type === 'credit_card' ? payload.paymentDueDay : null,
      payload.type === 'credit_card' ? payload.annualRate : null,
      payload.type === 'credit_card' ? null : payload.currentAmount,
      payload.notes,
      payload.isActive,
    ],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const bankResult = await query('SELECT name FROM app_gastos.banks WHERE id = $1', [payload.bankId]);
  const bankName = bankResult.rows[0]?.name ?? null;

  return mapInstrument({ ...result.rows[0], bank_name: bankName });
}

async function updateInstrument(instrumentId, payload) {
  const result = await query(
    `
    UPDATE app_gastos.financial_instruments
    SET bank_id = $1,
        name = $2,
        type = $3,
        last_four = $4,
        currency_id = $5,
        credit_limit = $6,
        current_balance = $7,
        available_credit = COALESCE($8, $6 - $7),
        cut_off_day = $9,
        payment_due_day = $10,
        annual_rate = $11,
        current_amount = $12,
        notes = $13,
        is_active = $14,
        updated_at = NOW()
    WHERE id = $15
    RETURNING id, bank_id, name, type, last_four, currency_id,
              credit_limit, current_balance, available_credit, cut_off_day,
              payment_due_day, annual_rate, current_amount, notes,
              is_active, created_at, updated_at
    `,
    [
      payload.bankId,
      payload.name,
      payload.type,
      payload.lastFour,
      payload.currencyId,
      payload.type === 'credit_card' ? payload.creditLimit : null,
      payload.type === 'credit_card' ? payload.currentBalance : null,
      payload.type === 'credit_card' ? payload.availableCredit : null,
      payload.type === 'credit_card' ? payload.cutOffDay : null,
      payload.type === 'credit_card' ? payload.paymentDueDay : null,
      payload.type === 'credit_card' ? payload.annualRate : null,
      payload.type === 'credit_card' ? null : payload.currentAmount,
      payload.notes,
      payload.isActive,
      instrumentId,
    ],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const bankResult = await query('SELECT name FROM app_gastos.banks WHERE id = $1', [payload.bankId]);
  const bankName = bankResult.rows[0]?.name ?? null;

  return mapInstrument({ ...result.rows[0], bank_name: bankName });
}

async function softDeleteInstrument(instrumentId) {
  const result = await query(
    `
    UPDATE app_gastos.financial_instruments
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [instrumentId],
  );

  return result.rows.length > 0;
}

async function handleBanksRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const data = await listBanks();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateBankPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createBank(validated.value);
    return jsonResponse(201, { success: true, data: created });
  }

  if (method === 'PUT' && id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateBankPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateBank(id, validated.value);
    if (!updated) {
      return jsonResponse(404, { success: false, error: 'Banco no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: updated });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await softDeleteBank(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Banco no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

function getQueryParam(event, key) {
  const value = event.queryStringParameters?.[key];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return String(value);
}

async function handleInstrumentsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const bankIdRaw = getQueryParam(event, 'bank_id');
    const bankId = bankIdRaw ? parseInteger(bankIdRaw) : null;

    if (bankIdRaw && !bankId) {
      return jsonResponse(400, { success: false, error: 'bank_id invalido.' });
    }

    const data = await listInstruments(bankId);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateInstrumentPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createInstrument(validated.value);
    return jsonResponse(201, { success: true, data: created });
  }

  if (method === 'PUT' && id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateInstrumentPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateInstrument(id, validated.value);
    if (!updated) {
      return jsonResponse(404, { success: false, error: 'Instrumento no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: updated });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await softDeleteInstrument(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Instrumento no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
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

  const { resource } = parsePathParameters(path);

  try {
    if (resource === 'banks') {
      const response = await handleBanksRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'instruments') {
      const response = await handleInstrumentsRoute(method, path, event);
      if (response) {
        return response;
      }
    }
  } catch {
    return jsonResponse(500, {
      success: false,
      error: 'Error interno al procesar la solicitud.',
    });
  }

  return jsonResponse(404, {
    success: false,
    error: 'Ruta no encontrada.',
  });
}
