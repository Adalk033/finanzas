import pg from 'pg';

const { Pool } = pg;

const API_KEY_HEADER = 'x-api-key';
const CLIENT_VERSION_HEADER = 'x-client-version';
const VALID_REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'];
const ALLOWED_BANK_ICON_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const ALLOWED_CATEGORY_ICON_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const ALLOWED_HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const ALLOWED_LAST_FOUR_PATTERN = /^\d{4}$/;
const ALLOWED_INSTRUMENT_TYPES = new Set(['credit_card', 'debit_card', 'account']);
const ALLOWED_CATEGORY_TYPES = new Set(['expense', 'income', 'both']);
const ALLOWED_TRANSACTION_TYPES = new Set(['expense', 'income']);
const ALLOWED_MSI_MONTHS = new Set([3, 6, 9, 12, 18, 24]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
  const categoriesWithId = path.match(/^\/categories\/(\d+)$/);
  if (categoriesWithId) {
    return { resource: 'categories', id: Number.parseInt(categoriesWithId[1], 10) };
  }

  if (path === '/categories') {
    return { resource: 'categories', id: null };
  }

  const subcategoriesWithId = path.match(/^\/subcategories\/(\d+)$/);
  if (subcategoriesWithId) {
    return { resource: 'subcategories', id: Number.parseInt(subcategoriesWithId[1], 10) };
  }

  if (path === '/subcategories') {
    return { resource: 'subcategories', id: null };
  }

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

  const transactionsWithId = path.match(/^\/transactions\/(\d+)$/);
  if (transactionsWithId) {
    return { resource: 'transactions', id: Number.parseInt(transactionsWithId[1], 10) };
  }

  if (path === '/transactions') {
    return { resource: 'transactions', id: null };
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

function normalizeNullableDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const raw = String(value).trim();

  if (!ISO_DATE_PATTERN.test(raw)) {
    return null;
  }

  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return raw;
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

function validateCategoryPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const iconName = normalizeNullableText(body.iconName);
  const color = normalizeNullableText(body.color);
  const type = normalizeText(body.type);

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'name debe tener entre 2 y 100 caracteres.' };
  }

  if (iconName && (iconName.length > 50 || !ALLOWED_CATEGORY_ICON_PATTERN.test(iconName))) {
    return { ok: false, error: 'iconName invalido.' };
  }

  if (color && !ALLOWED_HEX_COLOR_PATTERN.test(color)) {
    return { ok: false, error: 'color debe tener formato hexadecimal #RRGGBB.' };
  }

  if (!ALLOWED_CATEGORY_TYPES.has(type)) {
    return { ok: false, error: 'type invalido.' };
  }

  return {
    ok: true,
    value: {
      name,
      iconName,
      color,
      type,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  };
}

function validateSubcategoryPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const categoryId = normalizeNullableInteger(body.categoryId);
  const name = normalizeText(body.name);
  const iconName = normalizeNullableText(body.iconName);

  if (!categoryId || categoryId < 1) {
    return { ok: false, error: 'categoryId invalido.' };
  }

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: 'name debe tener entre 2 y 100 caracteres.' };
  }

  if (iconName && (iconName.length > 50 || !ALLOWED_CATEGORY_ICON_PATTERN.test(iconName))) {
    return { ok: false, error: 'iconName invalido.' };
  }

  return {
    ok: true,
    value: {
      categoryId,
      name,
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

function validateTransactionPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const categoryId = normalizeNullableInteger(body.categoryId);
  const subcategoryId = normalizeNullableInteger(body.subcategoryId);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const type = normalizeText(body.type);
  const amount = normalizeNullableNumber(body.amount);
  const description = normalizeNullableText(body.description);
  const transactionDate = normalizeNullableDate(body.transactionDate);
  const notes = normalizeNullableText(body.notes);
  const isMsi = Boolean(body.isMsi);
  const msiMonths = normalizeNullableInteger(body.msiMonths);

  if (!instrumentId || instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (!ALLOWED_TRANSACTION_TYPES.has(type)) {
    return { ok: false, error: 'type invalido.' };
  }

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (!transactionDate) {
    return { ok: false, error: 'transactionDate invalida. Usa YYYY-MM-DD.' };
  }

  if (description && description.length > 255) {
    return { ok: false, error: 'description no puede exceder 255 caracteres.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  if (subcategoryId && !categoryId) {
    return { ok: false, error: 'subcategoryId requiere categoryId.' };
  }

  if (isMsi && type !== 'expense') {
    return { ok: false, error: 'MSI solo aplica para gastos.' };
  }

  if (isMsi && (!msiMonths || !ALLOWED_MSI_MONTHS.has(msiMonths))) {
    return { ok: false, error: 'msiMonths invalido. Usa 3, 6, 9, 12, 18 o 24.' };
  }

  return {
    ok: true,
    value: {
      instrumentId,
      categoryId,
      subcategoryId,
      currencyId,
      type,
      amount,
      description,
      transactionDate,
      notes,
      isMsi,
      msiMonths: isMsi ? msiMonths : null,
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

function mapSubcategory(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    name: row.name,
    iconName: row.icon_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    iconName: row.icon_name,
    color: row.color,
    type: row.type,
    isSystem: row.is_system,
    isActive: row.is_active,
    canDelete: row.can_delete,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subcategories: Array.isArray(row.subcategories) ? row.subcategories.map(mapSubcategory) : [],
  };
}

function mapTransaction(row) {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    instrumentName: row.instrument_name ?? null,
    instrumentType: row.instrument_type ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name ?? null,
    currencyId: row.currency_id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    transactionDate: row.transaction_date,
    notes: row.notes,
    isMsi: row.is_msi,
    msiMonths: row.msi_months,
    msiMonthlyAmount: row.msi_monthly_amount === null ? null : Number(row.msi_monthly_amount),
    msiStartDate: row.msi_start_date,
    msiRemaining: row.msi_remaining,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function withDbTransaction(work) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function computeMsiStartDate(transactionDate, cutOffDay) {
  const [yearRaw, monthRaw, dayRaw] = transactionDate.split('-').map((value) => Number.parseInt(value, 10));
  const year = yearRaw;
  const month = monthRaw;
  const day = dayRaw;

  const monthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const currentCutOffDay = Math.min(cutOffDay, monthLastDay);

  if (day <= currentCutOffDay) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(currentCutOffDay).padStart(2, '0')}`;
  }

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const nextMonthLastDay = new Date(Date.UTC(nextYear, nextMonth, 0)).getUTCDate();
  const nextCutOffDay = Math.min(cutOffDay, nextMonthLastDay);

  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-${String(nextCutOffDay).padStart(2, '0')}`;
}

async function getInstrumentForUpdate(client, instrumentId) {
  const result = await client.query(
    `
    SELECT id, type, credit_limit, current_balance, available_credit, current_amount, cut_off_day, is_active
    FROM app_gastos.financial_instruments
    WHERE id = $1
    FOR UPDATE
    `,
    [instrumentId],
  );

  return result.rows[0] ?? null;
}

async function applyInstrumentImpact(client, instrument, transactionType, amount, direction) {
  const signedAmount = direction === 'apply' ? amount : -amount;

  if (transactionType === 'expense') {
    if (instrument.type === 'credit_card') {
      await client.query(
        `
        UPDATE app_gastos.financial_instruments
        SET current_balance = COALESCE(current_balance, 0) + $1,
            available_credit = COALESCE(credit_limit, 0) - (COALESCE(current_balance, 0) + $1),
            updated_at = NOW()
        WHERE id = $2
        `,
        [signedAmount, instrument.id],
      );
      return;
    }

    await client.query(
      `
      UPDATE app_gastos.financial_instruments
      SET current_amount = COALESCE(current_amount, 0) - $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [signedAmount, instrument.id],
    );
    return;
  }

  if (instrument.type === 'credit_card') {
    throw new Error('Ingresos no permitidos en tarjetas de credito.');
  }

  await client.query(
    `
    UPDATE app_gastos.financial_instruments
    SET current_amount = COALESCE(current_amount, 0) + $1,
        updated_at = NOW()
    WHERE id = $2
    `,
    [signedAmount, instrument.id],
  );
}

async function validateTransactionReferences(client, payload) {
  const instrument = await getInstrumentForUpdate(client, payload.instrumentId);

  if (!instrument || !instrument.is_active) {
    return { ok: false, error: 'Instrumento no encontrado o inactivo.' };
  }

  if (payload.isMsi && instrument.type !== 'credit_card') {
    return { ok: false, error: 'MSI solo aplica a tarjetas de credito.' };
  }

  if (payload.type === 'income' && instrument.type === 'credit_card') {
    return { ok: false, error: 'No se permiten ingresos en tarjeta de credito.' };
  }

  const currencyCheck = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);
  if (currencyCheck.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  if (payload.categoryId) {
    const categoryCheck = await client.query(
      'SELECT id FROM app_gastos.categories WHERE id = $1 AND is_active = TRUE',
      [payload.categoryId],
    );

    if (categoryCheck.rows.length === 0) {
      return { ok: false, error: 'categoryId no existe o esta inactiva.' };
    }
  }

  if (payload.subcategoryId) {
    const subcategoryCheck = await client.query(
      'SELECT id FROM app_gastos.subcategories WHERE id = $1 AND category_id = $2 AND is_active = TRUE',
      [payload.subcategoryId, payload.categoryId],
    );

    if (subcategoryCheck.rows.length === 0) {
      return { ok: false, error: 'subcategoryId no pertenece a la categoria indicada.' };
    }
  }

  return { ok: true, instrument };
}

function buildMsiData(payload, instrument) {
  if (!payload.isMsi) {
    return {
      msiMonths: null,
      msiStartDate: null,
      msiRemaining: null,
    };
  }

  const msiMonths = payload.msiMonths;
  const cutOffDay = instrument.cut_off_day ?? 1;

  return {
    msiMonths,
    msiStartDate: computeMsiStartDate(payload.transactionDate, cutOffDay),
    msiRemaining: msiMonths,
  };
}

async function listTransactions(filters) {
  const values = [];
  const where = [];

  if (filters.fromDate) {
    values.push(filters.fromDate);
    where.push(`t.transaction_date >= $${values.length}`);
  }

  if (filters.toDate) {
    values.push(filters.toDate);
    where.push(`t.transaction_date <= $${values.length}`);
  }

  if (filters.categoryId) {
    values.push(filters.categoryId);
    where.push(`t.category_id = $${values.length}`);
  }

  if (filters.instrumentId) {
    values.push(filters.instrumentId);
    where.push(`t.instrument_id = $${values.length}`);
  }

  if (filters.type) {
    values.push(filters.type);
    where.push(`t.type = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`(
      COALESCE(t.description, '') ILIKE $${values.length}
      OR COALESCE(c.name, '') ILIKE $${values.length}
      OR COALESCE(sc.name, '') ILIKE $${values.length}
      OR COALESCE(fi.name, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await query(
    `
    SELECT
      t.id,
      t.instrument_id,
      fi.name AS instrument_name,
      fi.type AS instrument_type,
      t.category_id,
      c.name AS category_name,
      t.subcategory_id,
      sc.name AS subcategory_name,
      t.currency_id,
      t.type,
      t.amount,
      t.description,
      t.transaction_date,
      t.notes,
      t.is_msi,
      t.msi_months,
      t.msi_monthly_amount,
      t.msi_start_date,
      t.msi_remaining,
      t.created_at,
      t.updated_at
    FROM app_gastos.transactions t
    INNER JOIN app_gastos.financial_instruments fi ON fi.id = t.instrument_id
    LEFT JOIN app_gastos.categories c ON c.id = t.category_id
    LEFT JOIN app_gastos.subcategories sc ON sc.id = t.subcategory_id
    ${whereClause}
    ORDER BY t.transaction_date DESC, t.id DESC
    `,
    values,
  );

  return result.rows.map(mapTransaction);
}

async function createTransaction(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateTransactionReferences(client, payload);

    if (!references.ok) {
      return { error: references.error, data: null };
    }

    const instrument = references.instrument;
    const msiData = buildMsiData(payload, instrument);

    await applyInstrumentImpact(client, instrument, payload.type, payload.amount, 'apply');

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.transactions (
        instrument_id,
        category_id,
        subcategory_id,
        currency_id,
        type,
        amount,
        description,
        transaction_date,
        notes,
        is_msi,
        msi_months,
        msi_monthly_amount,
        msi_start_date,
        msi_remaining
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        CASE WHEN $10 THEN ROUND(($6::numeric / $11::numeric), 2) ELSE NULL END,
        $12,
        $13
      )
      RETURNING id
      `,
      [
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.type,
        payload.amount,
        payload.description,
        payload.transactionDate,
        payload.notes,
        payload.isMsi,
        msiData.msiMonths,
        msiData.msiStartDate,
        msiData.msiRemaining,
      ],
    );

    const createdId = insertResult.rows[0]?.id;
    const fullResult = await client.query(
      `
      SELECT
        t.id,
        t.instrument_id,
        fi.name AS instrument_name,
        fi.type AS instrument_type,
        t.category_id,
        c.name AS category_name,
        t.subcategory_id,
        sc.name AS subcategory_name,
        t.currency_id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.notes,
        t.is_msi,
        t.msi_months,
        t.msi_monthly_amount,
        t.msi_start_date,
        t.msi_remaining,
        t.created_at,
        t.updated_at
      FROM app_gastos.transactions t
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = t.instrument_id
      LEFT JOIN app_gastos.categories c ON c.id = t.category_id
      LEFT JOIN app_gastos.subcategories sc ON sc.id = t.subcategory_id
      WHERE t.id = $1
      `,
      [createdId],
    );

    return { error: null, data: mapTransaction(fullResult.rows[0]) };
  });
}

async function updateTransaction(transactionId, payload) {
  return withDbTransaction(async (client) => {
    const previousResult = await client.query(
      `
      SELECT id, instrument_id, type, amount
      FROM app_gastos.transactions
      WHERE id = $1
      FOR UPDATE
      `,
      [transactionId],
    );

    if (previousResult.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const previous = previousResult.rows[0];
    const previousInstrument = await getInstrumentForUpdate(client, previous.instrument_id);

    if (!previousInstrument || !previousInstrument.is_active) {
      return { notFound: true, error: null, data: null };
    }

    const references = await validateTransactionReferences(client, payload);

    if (!references.ok) {
      return { notFound: false, error: references.error, data: null };
    }

    const nextInstrument = references.instrument;

    await applyInstrumentImpact(client, previousInstrument, previous.type, Number(previous.amount), 'revert');
    await applyInstrumentImpact(client, nextInstrument, payload.type, payload.amount, 'apply');

    const msiData = buildMsiData(payload, nextInstrument);

    await client.query(
      `
      UPDATE app_gastos.transactions
      SET instrument_id = $1,
          category_id = $2,
          subcategory_id = $3,
          currency_id = $4,
          type = $5,
          amount = $6,
          description = $7,
          transaction_date = $8,
          notes = $9,
          is_msi = $10,
          msi_months = $11,
            msi_monthly_amount = CASE WHEN $10 THEN ROUND(($6::numeric / $11::numeric), 2) ELSE NULL END,
            msi_start_date = $12,
            msi_remaining = $13,
          updated_at = NOW()
          WHERE id = $14
      `,
      [
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.type,
        payload.amount,
        payload.description,
        payload.transactionDate,
        payload.notes,
        payload.isMsi,
        msiData.msiMonths,
        msiData.msiStartDate,
        msiData.msiRemaining,
        transactionId,
      ],
    );

    const fullResult = await client.query(
      `
      SELECT
        t.id,
        t.instrument_id,
        fi.name AS instrument_name,
        fi.type AS instrument_type,
        t.category_id,
        c.name AS category_name,
        t.subcategory_id,
        sc.name AS subcategory_name,
        t.currency_id,
        t.type,
        t.amount,
        t.description,
        t.transaction_date,
        t.notes,
        t.is_msi,
        t.msi_months,
        t.msi_monthly_amount,
        t.msi_start_date,
        t.msi_remaining,
        t.created_at,
        t.updated_at
      FROM app_gastos.transactions t
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = t.instrument_id
      LEFT JOIN app_gastos.categories c ON c.id = t.category_id
      LEFT JOIN app_gastos.subcategories sc ON sc.id = t.subcategory_id
      WHERE t.id = $1
      `,
      [transactionId],
    );

    return { notFound: false, error: null, data: mapTransaction(fullResult.rows[0]) };
  });
}

async function deleteTransaction(transactionId) {
  return withDbTransaction(async (client) => {
    const previousResult = await client.query(
      `
      SELECT id, instrument_id, type, amount
      FROM app_gastos.transactions
      WHERE id = $1
      FOR UPDATE
      `,
      [transactionId],
    );

    if (previousResult.rows.length === 0) {
      return { deleted: false };
    }

    const previous = previousResult.rows[0];
    const previousInstrument = await getInstrumentForUpdate(client, previous.instrument_id);

    if (!previousInstrument || !previousInstrument.is_active) {
      return { deleted: false };
    }

    await applyInstrumentImpact(client, previousInstrument, previous.type, Number(previous.amount), 'revert');

    await client.query('DELETE FROM app_gastos.transactions WHERE id = $1', [transactionId]);

    return { deleted: true };
  });
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

async function listCategories() {
  const result = await query(
    `
    SELECT
      c.id,
      c.name,
      c.icon_name,
      c.color,
      c.type,
      c.is_system,
      c.is_active,
      c.created_at,
      c.updated_at,
      fn_can_delete_category(c.id) AS can_delete,
      COALESCE(subcategories.subcategories, '[]'::json) AS subcategories
    FROM app_gastos.categories c
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', sc.id,
          'category_id', sc.category_id,
          'category_name', c.name,
          'name', sc.name,
          'icon_name', sc.icon_name,
          'is_active', sc.is_active,
          'created_at', sc.created_at,
          'updated_at', sc.updated_at
        ) ORDER BY sc.name ASC
      ) AS subcategories
      FROM app_gastos.subcategories sc
      WHERE sc.category_id = c.id
        AND sc.is_active = TRUE
    ) subcategories ON TRUE
    WHERE c.is_active = TRUE
    ORDER BY c.name ASC
    `,
  );

  return result.rows.map(mapCategory);
}

async function createCategory(payload) {
  const result = await query(
    `
    INSERT INTO app_gastos.categories (name, icon_name, color, type, is_system, is_active)
    VALUES ($1, $2, $3, $4, FALSE, $5)
    RETURNING id, name, icon_name, color, type, is_system, is_active, created_at, updated_at
    `,
    [payload.name, payload.iconName, payload.color, payload.type, payload.isActive],
  );

  return mapCategory({
    ...result.rows[0],
    can_delete: true,
    subcategories: [],
  });
}

async function updateCategory(categoryId, payload) {
  const result = await query(
    `
    UPDATE app_gastos.categories
    SET name = $1,
        icon_name = $2,
        color = $3,
        type = $4,
        is_active = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING id, name, icon_name, color, type, is_system, is_active, created_at, updated_at
    `,
    [payload.name, payload.iconName, payload.color, payload.type, payload.isActive, categoryId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const canDeleteResult = await query('SELECT fn_can_delete_category($1) AS can_delete', [categoryId]);

  return mapCategory({
    ...result.rows[0],
    can_delete: canDeleteResult.rows[0]?.can_delete ?? false,
    subcategories: [],
  });
}

async function softDeleteCategory(categoryId) {
  const canDeleteResult = await query('SELECT fn_can_delete_category($1) AS can_delete', [categoryId]);
  const canDelete = Boolean(canDeleteResult.rows[0]?.can_delete);

  if (!canDelete) {
    return { deleted: false, blocked: true };
  }

  const result = await query(
    `
    UPDATE app_gastos.categories
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [categoryId],
  );

  return { deleted: result.rows.length > 0, blocked: false };
}

async function listSubcategories(categoryId) {
  const values = [];
  let categoryFilter = '';

  if (categoryId) {
    values.push(categoryId);
    categoryFilter = 'AND sc.category_id = $1';
  }

  const result = await query(
    `
    SELECT sc.id, sc.category_id, c.name AS category_name, sc.name, sc.icon_name, sc.is_active, sc.created_at, sc.updated_at
    FROM app_gastos.subcategories sc
    INNER JOIN app_gastos.categories c ON c.id = sc.category_id
    WHERE sc.is_active = TRUE
    ${categoryFilter}
    ORDER BY c.name ASC, sc.name ASC
    `,
    values,
  );

  return result.rows.map(mapSubcategory);
}

async function createSubcategory(payload) {
  const categoryCheck = await query('SELECT id FROM app_gastos.categories WHERE id = $1 AND is_active = TRUE', [payload.categoryId]);

  if (categoryCheck.rows.length === 0) {
    return null;
  }

  const result = await query(
    `
    INSERT INTO app_gastos.subcategories (category_id, name, icon_name, is_active)
    VALUES ($1, $2, $3, $4)
    RETURNING id, category_id, name, icon_name, is_active, created_at, updated_at
    `,
    [payload.categoryId, payload.name, payload.iconName, payload.isActive],
  );

  const categoryResult = await query('SELECT name FROM app_gastos.categories WHERE id = $1', [payload.categoryId]);

  return mapSubcategory({
    ...result.rows[0],
    category_name: categoryResult.rows[0]?.name ?? null,
  });
}

async function updateSubcategory(subcategoryId, payload) {
  const categoryCheck = await query('SELECT id FROM app_gastos.categories WHERE id = $1 AND is_active = TRUE', [payload.categoryId]);

  if (categoryCheck.rows.length === 0) {
    return null;
  }

  const result = await query(
    `
    UPDATE app_gastos.subcategories
    SET category_id = $1,
        name = $2,
        icon_name = $3,
        is_active = $4,
        updated_at = NOW()
    WHERE id = $5
    RETURNING id, category_id, name, icon_name, is_active, created_at, updated_at
    `,
    [payload.categoryId, payload.name, payload.iconName, payload.isActive, subcategoryId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const categoryResult = await query('SELECT name FROM app_gastos.categories WHERE id = $1', [payload.categoryId]);

  return mapSubcategory({
    ...result.rows[0],
    category_name: categoryResult.rows[0]?.name ?? null,
  });
}

async function softDeleteSubcategory(subcategoryId) {
  const result = await query(
    `
    UPDATE app_gastos.subcategories
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [subcategoryId],
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

async function handleCategoriesRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const data = await listCategories();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateCategoryPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createCategory(validated.value);
    return jsonResponse(201, { success: true, data: created });
  }

  if (method === 'PUT' && id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateCategoryPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateCategory(id, validated.value);
    if (!updated) {
      return jsonResponse(404, { success: false, error: 'Categoria no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: updated });
  }

  if (method === 'DELETE' && id !== null) {
    const deletion = await softDeleteCategory(id);

    if (deletion.blocked) {
      return jsonResponse(409, { success: false, error: 'La categoria tiene movimientos asociados o es del sistema.' });
    }

    if (!deletion.deleted) {
      return jsonResponse(404, { success: false, error: 'Categoria no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleSubcategoriesRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const categoryIdRaw = getQueryParam(event, 'category_id');
    const categoryId = categoryIdRaw ? parseInteger(categoryIdRaw) : null;

    if (categoryIdRaw && !categoryId) {
      return jsonResponse(400, { success: false, error: 'category_id invalido.' });
    }

    const data = await listSubcategories(categoryId);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateSubcategoryPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createSubcategory(validated.value);
    if (!created) {
      return jsonResponse(404, { success: false, error: 'Categoria no encontrada.' });
    }

    return jsonResponse(201, { success: true, data: created });
  }

  if (method === 'PUT' && id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateSubcategoryPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateSubcategory(id, validated.value);
    if (!updated) {
      return jsonResponse(404, { success: false, error: 'Subcategoria no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: updated });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await softDeleteSubcategory(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Subcategoria no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleTransactionsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const fromDate = getQueryParam(event, 'from_date');
    const toDate = getQueryParam(event, 'to_date');
    const categoryIdRaw = getQueryParam(event, 'category_id');
    const instrumentIdRaw = getQueryParam(event, 'instrument_id');
    const type = getQueryParam(event, 'type');
    const search = getQueryParam(event, 'search');

    if (fromDate && !normalizeNullableDate(fromDate)) {
      return jsonResponse(400, { success: false, error: 'from_date invalida. Usa YYYY-MM-DD.' });
    }

    if (toDate && !normalizeNullableDate(toDate)) {
      return jsonResponse(400, { success: false, error: 'to_date invalida. Usa YYYY-MM-DD.' });
    }

    const categoryId = categoryIdRaw ? parseInteger(categoryIdRaw) : null;
    if (categoryIdRaw && !categoryId) {
      return jsonResponse(400, { success: false, error: 'category_id invalido.' });
    }

    const instrumentId = instrumentIdRaw ? parseInteger(instrumentIdRaw) : null;
    if (instrumentIdRaw && !instrumentId) {
      return jsonResponse(400, { success: false, error: 'instrument_id invalido.' });
    }

    if (type && !ALLOWED_TRANSACTION_TYPES.has(type)) {
      return jsonResponse(400, { success: false, error: 'type invalido.' });
    }

    const data = await listTransactions({
      fromDate,
      toDate,
      categoryId,
      instrumentId,
      type,
      search: search?.trim() || null,
    });

    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateTransactionPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createTransaction(validated.value);

    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'PUT' && id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateTransactionPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateTransaction(id, validated.value);

    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Transaccion no encontrada.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await deleteTransaction(id);

    if (!deleted.deleted) {
      return jsonResponse(404, { success: false, error: 'Transaccion no encontrada.' });
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
    if (resource === 'categories') {
      const response = await handleCategoriesRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'banks') {
      const response = await handleBanksRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'subcategories') {
      const response = await handleSubcategoriesRoute(method, path, event);
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

    if (resource === 'transactions') {
      const response = await handleTransactionsRoute(method, path, event);
      if (response) {
        return response;
      }
    }
  } catch (error) {
    if (error?.code === '23505') {
      return jsonResponse(409, {
        success: false,
        error: 'Ya existe un registro con esos datos.',
      });
    }

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
