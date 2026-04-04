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
const ALLOWED_TRANSFER_TYPES = new Set(['card_payment', 'inter_account', 'loan_payment', 'other']);
const ALLOWED_LOAN_PAYMENT_TYPES = new Set(['fixed', 'variable']);
const ALLOWED_SUBSCRIPTION_BILLING_CYCLES = new Set(['monthly', 'yearly', 'weekly']);
const ALLOWED_SIMULATION_SCENARIO_TYPES = new Set(['direct_purchase', 'msi', 'loan']);
const ALLOWED_REMINDER_TYPES = new Set(['payment', 'cutoff', 'subscription', 'loan', 'custom']);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AUTO_ADJUSTMENT_CATEGORY_NAME = 'Otros (por ajuste)';
const AUTO_ADJUSTMENT_DESCRIPTION = 'Otros (por ajuste)';
const AUTO_ADJUSTMENT_TRANSFER_NOTE_PREFIX = 'AUTO_ADJUSTMENT_TRANSFER:';

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

function getRequestId(event) {
  return event?.requestContext?.requestId ?? event?.requestContext?.awsRequestId ?? 'unknown';
}

function logUnhandledError(event, method, path, error) {
  console.error('[lambda] unhandled route error', {
    requestId: getRequestId(event),
    method,
    path,
    errorCode: error?.code,
    errorMessage: error instanceof Error ? error.message : String(error),
  });
}

function createPool() {
  const {
    DATABASE_URL,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  } = process.env;

  const baseConfig = {
    ssl: {
      rejectUnauthorized: false,
    },
    max: 3,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 5000,
  };

  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const port = DB_PORT ? Number.parseInt(DB_PORT, 10) : 5432;

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT invalido.');
    }

    return new Pool({
      ...baseConfig,
      host: DB_HOST,
      port,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
    });
  }

  if (DATABASE_URL) {
    return new Pool({
      ...baseConfig,
      connectionString: DATABASE_URL,
    });
  }

  throw new Error('Configura DB_HOST, DB_NAME, DB_USER y DB_PASSWORD (opcional DB_PORT) o DATABASE_URL.');
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
  if (path === '/dashboard/summary') {
    return { resource: 'dashboardSummary', id: null };
  }

  if (path === '/dashboard/charts/expenses-by-category') {
    return { resource: 'dashboardExpensesByCategory', id: null };
  }

  if (path === '/dashboard/charts/cash-flow') {
    return { resource: 'dashboardCashFlow', id: null };
  }

  if (path === '/dashboard/charts/balance-evolution') {
    return { resource: 'dashboardBalanceEvolution', id: null };
  }

  if (path === '/dashboard/charts/future-expenses') {
    return { resource: 'dashboardFutureExpenses', id: null };
  }

  const statementMovements = path.match(/^\/statements\/(\d+)\/movements$/);
  if (statementMovements) {
    return {
      resource: 'statementMovements',
      id: Number.parseInt(statementMovements[1], 10),
    };
  }

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

  const statementsWithId = path.match(/^\/statements\/(\d+)$/);
  if (statementsWithId) {
    return { resource: 'statements', id: Number.parseInt(statementsWithId[1], 10) };
  }

  if (path === '/statements') {
    return { resource: 'statements', id: null };
  }

  const transfersWithId = path.match(/^\/transfers\/(\d+)$/);
  if (transfersWithId) {
    return { resource: 'transfers', id: Number.parseInt(transfersWithId[1], 10) };
  }

  if (path === '/transfers') {
    return { resource: 'transfers', id: null };
  }

  const loansPaymentAction = path.match(/^\/loans\/(\d+)\/payments\/(\d+)\/pay$/);
  if (loansPaymentAction) {
    return {
      resource: 'loanPaymentAction',
      id: Number.parseInt(loansPaymentAction[1], 10),
      installmentNum: Number.parseInt(loansPaymentAction[2], 10),
    };
  }

  const loansPayments = path.match(/^\/loans\/(\d+)\/payments$/);
  if (loansPayments) {
    return {
      resource: 'loanPayments',
      id: Number.parseInt(loansPayments[1], 10),
    };
  }

  const loansWithId = path.match(/^\/loans\/(\d+)$/);
  if (loansWithId) {
    return { resource: 'loans', id: Number.parseInt(loansWithId[1], 10) };
  }

  if (path === '/loans') {
    return { resource: 'loans', id: null };
  }

  const fixedExpensePaymentWithId = path.match(/^\/fixed-expenses\/(\d+)\/payments\/(\d+)$/);
  if (fixedExpensePaymentWithId) {
    return {
      resource: 'fixedExpensePayment',
      id: Number.parseInt(fixedExpensePaymentWithId[1], 10),
      paymentId: Number.parseInt(fixedExpensePaymentWithId[2], 10),
    };
  }

  const fixedExpensePayments = path.match(/^\/fixed-expenses\/(\d+)\/payments$/);
  if (fixedExpensePayments) {
    return {
      resource: 'fixedExpensePayments',
      id: Number.parseInt(fixedExpensePayments[1], 10),
    };
  }

  const fixedExpensesWithId = path.match(/^\/fixed-expenses\/(\d+)$/);
  if (fixedExpensesWithId) {
    return { resource: 'fixedExpenses', id: Number.parseInt(fixedExpensesWithId[1], 10) };
  }

  if (path === '/fixed-expenses') {
    return { resource: 'fixedExpenses', id: null };
  }

  const subscriptionsWithId = path.match(/^\/subscriptions\/(\d+)$/);
  if (subscriptionsWithId) {
    return { resource: 'subscriptions', id: Number.parseInt(subscriptionsWithId[1], 10) };
  }

  if (path === '/subscriptions') {
    return { resource: 'subscriptions', id: null };
  }

  const budgetsWithId = path.match(/^\/budgets\/(\d+)$/);
  if (budgetsWithId) {
    return { resource: 'budgets', id: Number.parseInt(budgetsWithId[1], 10) };
  }

  if (path === '/budgets') {
    return { resource: 'budgets', id: null };
  }

  const simulationsWithId = path.match(/^\/simulations\/(\d+)$/);
  if (simulationsWithId) {
    return { resource: 'simulations', id: Number.parseInt(simulationsWithId[1], 10) };
  }

  if (path === '/simulations') {
    return { resource: 'simulations', id: null };
  }

  if (path === '/reminders/pending') {
    return { resource: 'remindersPending', id: null };
  }

  const remindersWithId = path.match(/^\/reminders\/(\d+)$/);
  if (remindersWithId) {
    return { resource: 'reminders', id: Number.parseInt(remindersWithId[1], 10) };
  }

  if (path === '/reminders') {
    return { resource: 'reminders', id: null };
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

function validateStatementPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const cutOffDate = normalizeNullableDate(body.cutOffDate);
  const paymentDueDate = normalizeNullableDate(body.paymentDueDate);
  const minimumPayment = normalizeNullableNumber(body.minimumPayment);
  const noInterestPayment = normalizeNullableNumber(body.noInterestPayment);

  if (!instrumentId || instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (!cutOffDate) {
    return { ok: false, error: 'cutOffDate invalida. Usa YYYY-MM-DD.' };
  }

  if (paymentDueDate === null && body.paymentDueDate !== undefined && body.paymentDueDate !== null && body.paymentDueDate !== '') {
    return { ok: false, error: 'paymentDueDate invalida. Usa YYYY-MM-DD.' };
  }

  if (minimumPayment !== null && (minimumPayment < 0 || minimumPayment > 9999999999.99)) {
    return { ok: false, error: 'minimumPayment invalido.' };
  }

  if (noInterestPayment !== null && (noInterestPayment < 0 || noInterestPayment > 9999999999.99)) {
    return { ok: false, error: 'noInterestPayment invalido.' };
  }

  return {
    ok: true,
    value: {
      instrumentId,
      cutOffDate,
      paymentDueDate,
      minimumPayment,
      noInterestPayment,
    },
  };
}

function validateStatementUpdatePayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const paymentDueDate = normalizeNullableDate(body.paymentDueDate);
  const minimumPayment = normalizeNullableNumber(body.minimumPayment);
  const noInterestPayment = normalizeNullableNumber(body.noInterestPayment);
  const paidAmount = normalizeNullableNumber(body.paidAmount);
  const paidDate = normalizeNullableDate(body.paidDate);
  const isPaid = body.isPaid === undefined ? null : Boolean(body.isPaid);

  if (paymentDueDate === null && body.paymentDueDate !== undefined && body.paymentDueDate !== null && body.paymentDueDate !== '') {
    return { ok: false, error: 'paymentDueDate invalida. Usa YYYY-MM-DD.' };
  }

  if (minimumPayment !== null && (minimumPayment < 0 || minimumPayment > 9999999999.99)) {
    return { ok: false, error: 'minimumPayment invalido.' };
  }

  if (noInterestPayment !== null && (noInterestPayment < 0 || noInterestPayment > 9999999999.99)) {
    return { ok: false, error: 'noInterestPayment invalido.' };
  }

  if (paidAmount !== null && (paidAmount < 0 || paidAmount > 9999999999.99)) {
    return { ok: false, error: 'paidAmount invalido.' };
  }

  if (paidDate === null && body.paidDate !== undefined && body.paidDate !== null && body.paidDate !== '') {
    return { ok: false, error: 'paidDate invalida. Usa YYYY-MM-DD.' };
  }

  return {
    ok: true,
    value: {
      paymentDueDate,
      minimumPayment,
      noInterestPayment,
      isPaid,
      paidAmount,
      paidDate,
    },
  };
}

function validateTransferPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const sourceInstrumentId = normalizeNullableInteger(body.sourceInstrumentId);
  const destinationInstrumentId = normalizeNullableInteger(body.destinationInstrumentId);
  const amount = normalizeNullableNumber(body.amount);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const transferDate = normalizeNullableDate(body.transferDate);
  const type = normalizeText(body.type);
  const statementId = normalizeNullableInteger(body.statementId);
  const loanId = normalizeNullableInteger(body.loanId);
  const description = normalizeNullableText(body.description);
  const notes = normalizeNullableText(body.notes);

  if (!sourceInstrumentId || sourceInstrumentId < 1) {
    return { ok: false, error: 'sourceInstrumentId invalido.' };
  }

  if (!destinationInstrumentId || destinationInstrumentId < 1) {
    return { ok: false, error: 'destinationInstrumentId invalido.' };
  }

  if (sourceInstrumentId === destinationInstrumentId) {
    return { ok: false, error: 'sourceInstrumentId y destinationInstrumentId deben ser distintos.' };
  }

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (!transferDate) {
    return { ok: false, error: 'transferDate invalida. Usa YYYY-MM-DD.' };
  }

  if (!ALLOWED_TRANSFER_TYPES.has(type)) {
    return { ok: false, error: 'type invalido.' };
  }

  if (statementId !== null && statementId < 1) {
    return { ok: false, error: 'statementId invalido.' };
  }

  if (loanId !== null && loanId < 1) {
    return { ok: false, error: 'loanId invalido.' };
  }

  if (type === 'loan_payment' && !loanId) {
    return { ok: false, error: 'loanId es requerido para loan_payment.' };
  }

  if (type === 'card_payment' && !statementId) {
    return { ok: false, error: 'statementId es requerido para card_payment.' };
  }

  if (type !== 'card_payment' && statementId) {
    return { ok: false, error: 'statementId solo se permite para card_payment.' };
  }

  if (description && description.length > 255) {
    return { ok: false, error: 'description no puede exceder 255 caracteres.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      sourceInstrumentId,
      destinationInstrumentId,
      amount,
      currencyId,
      transferDate,
      type,
      statementId,
      loanId,
      description,
      notes,
    },
  };
}

function validateLoanPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const lender = normalizeNullableText(body.lender);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const originalAmount = normalizeNullableNumber(body.originalAmount);
  const annualRate = normalizeNullableNumber(body.annualRate);
  const totalInstallments = normalizeNullableInteger(body.totalInstallments);
  const paymentType = normalizeText(body.paymentType);
  const fixedPayment = normalizeNullableNumber(body.fixedPayment);
  const paymentDay = normalizeNullableInteger(body.paymentDay);
  const startDate = normalizeNullableDate(body.startDate);
  const endDate = normalizeNullableDate(body.endDate);
  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const notes = normalizeNullableText(body.notes);

  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: 'name debe tener entre 2 y 150 caracteres.' };
  }

  if (lender && lender.length > 100) {
    return { ok: false, error: 'lender no puede exceder 100 caracteres.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (originalAmount === null || originalAmount <= 0 || originalAmount > 9999999999.99) {
    return { ok: false, error: 'originalAmount invalido.' };
  }

  if (annualRate !== null && (annualRate < 0 || annualRate > 100)) {
    return { ok: false, error: 'annualRate invalido.' };
  }

  if (!totalInstallments || totalInstallments < 1 || totalInstallments > 600) {
    return { ok: false, error: 'totalInstallments invalido.' };
  }

  if (!ALLOWED_LOAN_PAYMENT_TYPES.has(paymentType)) {
    return { ok: false, error: 'paymentType invalido.' };
  }

  if (paymentType === 'fixed' && (fixedPayment === null || fixedPayment <= 0 || fixedPayment > 9999999999.99)) {
    return { ok: false, error: 'fixedPayment invalido para paymentType fixed.' };
  }

  if (paymentType === 'variable' && (annualRate === null || annualRate <= 0)) {
    return { ok: false, error: 'annualRate es requerido para paymentType variable.' };
  }

  if (paymentDay !== null && (paymentDay < 1 || paymentDay > 31)) {
    return { ok: false, error: 'paymentDay invalido.' };
  }

  if (!startDate) {
    return { ok: false, error: 'startDate invalida. Usa YYYY-MM-DD.' };
  }

  if (endDate === null && body.endDate !== undefined && body.endDate !== null && body.endDate !== '') {
    return { ok: false, error: 'endDate invalida. Usa YYYY-MM-DD.' };
  }

  if (instrumentId !== null && instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      name,
      lender,
      currencyId,
      originalAmount,
      annualRate,
      totalInstallments,
      paymentType,
      fixedPayment: paymentType === 'fixed' ? fixedPayment : null,
      paymentDay,
      startDate,
      endDate,
      instrumentId,
      notes,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  };
}

function validateLoanPaymentRegisterPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const paidDate = normalizeNullableDate(body.paidDate);
  const amount = normalizeNullableNumber(body.amount);
  const notes = normalizeNullableText(body.notes);

  if (paidDate === null && body.paidDate !== undefined && body.paidDate !== null && body.paidDate !== '') {
    return { ok: false, error: 'paidDate invalida. Usa YYYY-MM-DD.' };
  }

  if (amount !== null && (amount <= 0 || amount > 9999999999.99)) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      paidDate,
      amount,
      notes,
    },
  };
}

function validateSubscriptionPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const categoryId = normalizeNullableInteger(body.categoryId);
  const subcategoryId = normalizeNullableInteger(body.subcategoryId);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const amount = normalizeNullableNumber(body.amount);
  const billingCycle = normalizeText(body.billingCycle);
  const billingDay = normalizeNullableInteger(body.billingDay);
  const nextBilling = normalizeNullableDate(body.nextBilling);
  const notes = normalizeNullableText(body.notes);

  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: 'name debe tener entre 2 y 150 caracteres.' };
  }

  if (!instrumentId || instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (categoryId !== null && categoryId < 1) {
    return { ok: false, error: 'categoryId invalido.' };
  }

  if (subcategoryId !== null && subcategoryId < 1) {
    return { ok: false, error: 'subcategoryId invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (!ALLOWED_SUBSCRIPTION_BILLING_CYCLES.has(billingCycle)) {
    return { ok: false, error: 'billingCycle invalido.' };
  }

  if (billingDay !== null && (billingDay < 1 || billingDay > 31)) {
    return { ok: false, error: 'billingDay invalido.' };
  }

  if (nextBilling === null && body.nextBilling !== undefined && body.nextBilling !== null && body.nextBilling !== '') {
    return { ok: false, error: 'nextBilling invalida. Usa YYYY-MM-DD.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      name,
      instrumentId,
      categoryId,
      subcategoryId,
      currencyId,
      amount,
      billingCycle,
      billingDay,
      nextBilling,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      notes,
    },
  };
}

function validateFixedExpensePayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const categoryId = normalizeNullableInteger(body.categoryId);
  const subcategoryId = normalizeNullableInteger(body.subcategoryId);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const estimatedAmount = normalizeNullableNumber(body.estimatedAmount);
  const isVariable = Boolean(body.isVariable);
  const paymentDay = normalizeNullableInteger(body.paymentDay);
  const notes = normalizeNullableText(body.notes);

  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: 'name debe tener entre 2 y 150 caracteres.' };
  }

  if (instrumentId !== null && instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (categoryId !== null && categoryId < 1) {
    return { ok: false, error: 'categoryId invalido.' };
  }

  if (subcategoryId !== null && subcategoryId < 1) {
    return { ok: false, error: 'subcategoryId invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (estimatedAmount === null || estimatedAmount <= 0 || estimatedAmount > 9999999999.99) {
    return { ok: false, error: 'estimatedAmount invalido.' };
  }

  if (paymentDay !== null && (paymentDay < 1 || paymentDay > 31)) {
    return { ok: false, error: 'paymentDay invalido.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      name,
      instrumentId,
      categoryId,
      subcategoryId,
      currencyId,
      estimatedAmount,
      isVariable,
      paymentDay,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      notes,
    },
  };
}

function validateFixedExpensePaymentPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const amount = normalizeNullableNumber(body.amount);
  const periodMonth = normalizeNullableInteger(body.periodMonth);
  const periodYear = normalizeNullableInteger(body.periodYear);
  const paymentDate = normalizeNullableDate(body.paymentDate);
  const notes = normalizeNullableText(body.notes);

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (!periodMonth || periodMonth < 1 || periodMonth > 12) {
    return { ok: false, error: 'periodMonth invalido.' };
  }

  if (!periodYear || periodYear < 2000 || periodYear > 2200) {
    return { ok: false, error: 'periodYear invalido.' };
  }

  if (paymentDate === null && body.paymentDate !== undefined && body.paymentDate !== null && body.paymentDate !== '') {
    return { ok: false, error: 'paymentDate invalida. Usa YYYY-MM-DD.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      amount,
      periodMonth,
      periodYear,
      paymentDate,
      isPaid: body.isPaid === undefined ? true : Boolean(body.isPaid),
      notes,
    },
  };
}

function validateBudgetPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const categoryId = normalizeNullableInteger(body.categoryId);
  const currencyId = normalizeNullableInteger(body.currencyId);
  const amount = normalizeNullableNumber(body.amount);
  const month = normalizeNullableInteger(body.month);
  const year = normalizeNullableInteger(body.year);
  const notes = normalizeNullableText(body.notes);

  if (categoryId !== null && categoryId < 1) {
    return { ok: false, error: 'categoryId invalido.' };
  }

  if (!currencyId || currencyId < 1) {
    return { ok: false, error: 'currencyId invalido.' };
  }

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (!month || month < 1 || month > 12) {
    return { ok: false, error: 'month invalido.' };
  }

  if (!year || year < 2000 || year > 2200) {
    return { ok: false, error: 'year invalido.' };
  }

  if (notes && notes.length > 500) {
    return { ok: false, error: 'notes no puede exceder 500 caracteres.' };
  }

  return {
    ok: true,
    value: {
      categoryId,
      currencyId,
      amount,
      month,
      year,
      notes,
    },
  };
}

function validateSimulationPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const name = normalizeText(body.name);
  const description = normalizeNullableText(body.description);
  const simulationDate = normalizeNullableDate(body.simulationDate);
  const scenarioType = normalizeText(body.scenarioType);
  const amount = normalizeNullableNumber(body.amount);
  const instrumentId = normalizeNullableInteger(body.instrumentId);
  const msiMonths = normalizeNullableInteger(body.msiMonths);
  const loanMonths = normalizeNullableInteger(body.loanMonths);
  const annualRate = normalizeNullableNumber(body.annualRate);

  if (name.length < 2 || name.length > 150) {
    return { ok: false, error: 'name debe tener entre 2 y 150 caracteres.' };
  }

  if (description && description.length > 500) {
    return { ok: false, error: 'description no puede exceder 500 caracteres.' };
  }

  if (simulationDate === null && body.simulationDate !== undefined && body.simulationDate !== null && body.simulationDate !== '') {
    return { ok: false, error: 'simulationDate invalida. Usa YYYY-MM-DD.' };
  }

  if (!ALLOWED_SIMULATION_SCENARIO_TYPES.has(scenarioType)) {
    return { ok: false, error: 'scenarioType invalido.' };
  }

  if (amount === null || amount <= 0 || amount > 9999999999.99) {
    return { ok: false, error: 'amount invalido.' };
  }

  if (instrumentId !== null && instrumentId < 1) {
    return { ok: false, error: 'instrumentId invalido.' };
  }

  if (scenarioType === 'msi' && (!msiMonths || !ALLOWED_MSI_MONTHS.has(msiMonths))) {
    return { ok: false, error: 'msiMonths invalido para escenario MSI.' };
  }

  if (scenarioType === 'loan' && (!loanMonths || loanMonths < 1 || loanMonths > 600)) {
    return { ok: false, error: 'loanMonths invalido para escenario Loan.' };
  }

  if (annualRate !== null && (annualRate < 0 || annualRate > 100)) {
    return { ok: false, error: 'annualRate invalido.' };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      simulationDate,
      scenarioType,
      amount,
      instrumentId,
      msiMonths: scenarioType === 'msi' ? msiMonths : null,
      loanMonths: scenarioType === 'loan' ? loanMonths : null,
      annualRate: scenarioType === 'loan' ? annualRate ?? 0 : null,
    },
  };
}

function validateReminderPayload(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body invalido.' };
  }

  const title = normalizeText(body.title);
  const description = normalizeNullableText(body.description);
  const reminderDate = normalizeNullableDate(body.reminderDate);
  const type = normalizeText(body.type);
  const referenceId = normalizeNullableInteger(body.referenceId);
  const referenceType = normalizeNullableText(body.referenceType);
  const isRead = body.isRead === undefined ? false : Boolean(body.isRead);
  const isDismissed = body.isDismissed === undefined ? false : Boolean(body.isDismissed);

  if (title.length < 2 || title.length > 200) {
    return { ok: false, error: 'title debe tener entre 2 y 200 caracteres.' };
  }

  if (description && description.length > 500) {
    return { ok: false, error: 'description no puede exceder 500 caracteres.' };
  }

  if (!reminderDate) {
    return { ok: false, error: 'reminderDate invalida. Usa YYYY-MM-DD.' };
  }

  if (!ALLOWED_REMINDER_TYPES.has(type)) {
    return { ok: false, error: 'type invalido.' };
  }

  if (referenceId !== null && referenceId < 1) {
    return { ok: false, error: 'referenceId invalido.' };
  }

  if (referenceType && referenceType.length > 30) {
    return { ok: false, error: 'referenceType no puede exceder 30 caracteres.' };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      reminderDate,
      type,
      referenceId,
      referenceType,
      isRead,
      isDismissed,
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

function mapCreditCardStatement(row) {
  return {
    id: row.id,
    instrumentId: row.instrument_id,
    instrumentName: row.instrument_name ?? null,
    cutOffDate: row.cut_off_date,
    paymentDueDate: row.payment_due_date,
    totalAmount: Number(row.total_amount),
    minimumPayment: row.minimum_payment === null ? null : Number(row.minimum_payment),
    noInterestPayment: row.no_interest_payment === null ? null : Number(row.no_interest_payment),
    isPaid: row.is_paid,
    paidAmount: row.paid_amount === null ? null : Number(row.paid_amount),
    paidDate: row.paid_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransfer(row) {
  return {
    id: row.id,
    sourceInstrumentId: row.source_instrument_id,
    sourceInstrumentName: row.source_instrument_name ?? null,
    sourceInstrumentType: row.source_instrument_type ?? null,
    destinationInstrumentId: row.destination_instrument_id,
    destinationInstrumentName: row.destination_instrument_name ?? null,
    destinationInstrumentType: row.destination_instrument_type ?? null,
    amount: Number(row.amount),
    currencyId: row.currency_id,
    transferDate: row.transfer_date,
    type: row.type,
    statementId: row.statement_id,
    loanId: row.loan_id,
    description: row.description,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLoan(row) {
  return {
    id: row.id,
    name: row.name,
    lender: row.lender,
    currencyId: row.currency_id,
    originalAmount: Number(row.original_amount),
    remainingAmount: Number(row.remaining_amount),
    annualRate: row.annual_rate === null ? null : Number(row.annual_rate),
    totalInstallments: row.total_installments,
    paidInstallments: row.paid_installments,
    paymentType: row.payment_type,
    fixedPayment: row.fixed_payment === null ? null : Number(row.fixed_payment),
    paymentDay: row.payment_day,
    startDate: row.start_date,
    endDate: row.end_date,
    instrumentId: row.instrument_id,
    instrumentName: row.instrument_name ?? null,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLoanPayment(row) {
  return {
    id: row.id,
    loanId: row.loan_id,
    installmentNum: row.installment_num,
    amount: Number(row.amount),
    principal: row.principal === null ? null : Number(row.principal),
    interest: row.interest === null ? null : Number(row.interest),
    paymentDate: row.payment_date,
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscription(row) {
  return {
    id: row.id,
    name: row.name,
    instrumentId: row.instrument_id,
    instrumentName: row.instrument_name ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name ?? null,
    currencyId: row.currency_id,
    amount: Number(row.amount),
    billingCycle: row.billing_cycle,
    billingDay: row.billing_day,
    nextBilling: row.next_billing,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFixedExpense(row) {
  return {
    id: row.id,
    name: row.name,
    instrumentId: row.instrument_id,
    instrumentName: row.instrument_name ?? null,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name ?? null,
    currencyId: row.currency_id,
    estimatedAmount: Number(row.estimated_amount),
    isVariable: row.is_variable,
    paymentDay: row.payment_day,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFixedExpensePayment(row) {
  return {
    id: row.id,
    fixedExpenseId: row.fixed_expense_id,
    amount: Number(row.amount),
    periodMonth: row.period_month,
    periodYear: row.period_year,
    paymentDate: row.payment_date,
    isPaid: row.is_paid,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudget(row) {
  const amount = Number(row.amount);
  const spentAmount = Number(row.spent_amount ?? 0);
  const progressPercent = amount > 0 ? Number(((spentAmount / amount) * 100).toFixed(2)) : 0;

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    currencyId: row.currency_id,
    amount,
    month: row.month,
    year: row.year,
    notes: row.notes,
    spentAmount,
    progressPercent,
    status: progressPercent > 100 ? 'exceeded' : (progressPercent >= 80 ? 'warning' : 'under'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSimulation(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    simulationDate: row.simulation_date,
    snapshotJson: row.snapshot_json,
    resultJson: row.result_json,
    isFavorable: row.is_favorable,
    createdAt: row.created_at,
  };
}

function mapReminder(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    reminderDate: row.reminder_date,
    type: row.type,
    referenceId: row.reference_id,
    referenceType: row.reference_type,
    isRead: row.is_read,
    isDismissed: row.is_dismissed,
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

function addMonthsToIsoDate(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function buildAutoAdjustmentTransferNote(transferId) {
  return `${AUTO_ADJUSTMENT_TRANSFER_NOTE_PREFIX}${transferId}`;
}

function getBoundedDayForMonth(year, month, targetDay) {
  const monthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Math.min(targetDay, monthLastDay);
}

function buildDateFromParts(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function computeDefaultPaymentDueDate(cutOffDate, paymentDueDay) {
  const nextMonthDate = new Date(`${addMonthsToIsoDate(cutOffDate, 1)}T00:00:00.000Z`);
  const year = nextMonthDate.getUTCFullYear();
  const month = nextMonthDate.getUTCMonth() + 1;
  const day = getBoundedDayForMonth(year, month, paymentDueDay);
  return buildDateFromParts(year, month, day);
}

async function getCreditCardInstrumentForStatement(client, instrumentId) {
  const result = await client.query(
    `
    SELECT id, type, payment_due_day, is_active
    FROM app_gastos.financial_instruments
    WHERE id = $1
    FOR UPDATE
    `,
    [instrumentId],
  );

  const instrument = result.rows[0] ?? null;

  if (!instrument || !instrument.is_active || instrument.type !== 'credit_card') {
    return null;
  }

  return instrument;
}

async function calculateStatementTotalAmount(client, instrumentId, cutOffDate) {
  const previousCutOffResult = await client.query(
    `
    SELECT MAX(cut_off_date) AS previous_cut_off_date
    FROM app_gastos.credit_card_statements
    WHERE instrument_id = $1
      AND cut_off_date < $2
    `,
    [instrumentId, cutOffDate],
  );

  const previousCutOffDate = previousCutOffResult.rows[0]?.previous_cut_off_date
    ? String(previousCutOffResult.rows[0].previous_cut_off_date)
    : addMonthsToIsoDate(cutOffDate, -1);

  const result = await client.query(
    `
    SELECT COALESCE(SUM(
      CASE WHEN type = 'expense' THEN amount ELSE -amount END
    ), 0) AS total
    FROM app_gastos.transactions
    WHERE instrument_id = $1
      AND transaction_date > $2
      AND transaction_date <= $3
    `,
    [instrumentId, previousCutOffDate, cutOffDate],
  );

  return Number(result.rows[0]?.total ?? 0);
}

async function ensureAutoAdjustmentCategory(client) {
  const existing = await client.query(
    `
    SELECT id
    FROM app_gastos.categories
    WHERE name = $1
      AND is_active = TRUE
    ORDER BY id ASC
    LIMIT 1
    `,
    [AUTO_ADJUSTMENT_CATEGORY_NAME],
  );

  if (existing.rows.length > 0) {
    return Number(existing.rows[0].id);
  }

  const created = await client.query(
    `
    INSERT INTO app_gastos.categories (
      name,
      icon_name,
      color,
      type,
      is_system,
      is_active
    )
    VALUES ($1, NULL, NULL, 'both', FALSE, TRUE)
    RETURNING id
    `,
    [AUTO_ADJUSTMENT_CATEGORY_NAME],
  );

  return Number(created.rows[0].id);
}

async function removeAutoAdjustmentTransaction(client, transferId) {
  const marker = buildAutoAdjustmentTransferNote(transferId);
  const adjustmentResult = await client.query(
    `
    SELECT id, instrument_id, type, amount
    FROM app_gastos.transactions
    WHERE notes = $1
    FOR UPDATE
    `,
    [marker],
  );

  if (adjustmentResult.rows.length === 0) {
    return;
  }

  const adjustment = adjustmentResult.rows[0];
  const instrument = await getInstrumentForUpdate(client, adjustment.instrument_id);

  if (instrument && instrument.is_active) {
    await applyInstrumentImpact(client, instrument, adjustment.type, Number(adjustment.amount), 'revert');
  }

  await client.query('DELETE FROM app_gastos.transactions WHERE id = $1', [adjustment.id]);
}

async function refreshStatementComputedAmounts(client, statementId) {
  const statementResult = await client.query(
    `
    SELECT id, instrument_id, cut_off_date, minimum_payment
    FROM app_gastos.credit_card_statements
    WHERE id = $1
    FOR UPDATE
    `,
    [statementId],
  );

  if (statementResult.rows.length === 0) {
    return;
  }

  const statement = statementResult.rows[0];
  const totalAmount = roundMoney(await calculateStatementTotalAmount(client, statement.instrument_id, String(statement.cut_off_date)));
  const noInterestPayment = Math.max(0, totalAmount);
  const defaultMinimum = Math.max(0, roundMoney(totalAmount * 0.1));

  await client.query(
    `
    UPDATE app_gastos.credit_card_statements
    SET total_amount = $1,
        no_interest_payment = $2,
        minimum_payment = CASE WHEN minimum_payment IS NULL THEN $3 ELSE minimum_payment END,
        updated_at = NOW()
    WHERE id = $4
    `,
    [
      totalAmount,
      noInterestPayment,
      defaultMinimum,
      statementId,
    ],
  );
}

async function syncCardPaymentAdjustment(client, payload, transferId) {
  if (payload.type !== 'card_payment' || !payload.statementId) {
    await removeAutoAdjustmentTransaction(client, transferId);
    return;
  }

  const statementResult = await client.query(
    `
    SELECT id, instrument_id, cut_off_date
    FROM app_gastos.credit_card_statements
    WHERE id = $1
    FOR UPDATE
    `,
    [payload.statementId],
  );

  if (statementResult.rows.length === 0) {
    return;
  }

  const statement = statementResult.rows[0];
  const statementInstrumentId = Number(statement.instrument_id);
  const cutOffDate = String(statement.cut_off_date);

  const previousCutOffResult = await client.query(
    `
    SELECT MAX(cut_off_date) AS previous_cut_off_date
    FROM app_gastos.credit_card_statements
    WHERE instrument_id = $1
      AND cut_off_date < $2
    `,
    [statementInstrumentId, cutOffDate],
  );

  const previousCutOffDate = previousCutOffResult.rows[0]?.previous_cut_off_date
    ? String(previousCutOffResult.rows[0].previous_cut_off_date)
    : addMonthsToIsoDate(cutOffDate, -1);

  const marker = buildAutoAdjustmentTransferNote(transferId);
  const periodTotalResult = await client.query(
    `
    SELECT COALESCE(SUM(
      CASE WHEN type = 'expense' THEN amount ELSE -amount END
    ), 0) AS total
    FROM app_gastos.transactions
    WHERE instrument_id = $1
      AND transaction_date > $2
      AND transaction_date <= $3
      AND COALESCE(notes, '') <> $4
    `,
    [statementInstrumentId, previousCutOffDate, cutOffDate, marker],
  );

  const periodTotal = Number(periodTotalResult.rows[0]?.total ?? 0);
  const rawAdjustment = roundMoney(payload.amount - periodTotal);
  const adjustmentAmount = rawAdjustment > 0 ? rawAdjustment : 0;

  const existingResult = await client.query(
    `
    SELECT id, instrument_id, type, amount
    FROM app_gastos.transactions
    WHERE notes = $1
    FOR UPDATE
    `,
    [marker],
  );

  const existing = existingResult.rows[0] ?? null;

  if (existing) {
    const existingInstrument = await getInstrumentForUpdate(client, existing.instrument_id);

    if (existingInstrument && existingInstrument.is_active) {
      await applyInstrumentImpact(client, existingInstrument, existing.type, Number(existing.amount), 'revert');
    }
  }

  if (adjustmentAmount <= 0) {
    if (existing) {
      await client.query('DELETE FROM app_gastos.transactions WHERE id = $1', [existing.id]);
    }

    await refreshStatementComputedAmounts(client, payload.statementId);
    return;
  }

  const categoryId = await ensureAutoAdjustmentCategory(client);
  const destinationInstrument = await getInstrumentForUpdate(client, statementInstrumentId);

  if (!destinationInstrument || !destinationInstrument.is_active) {
    return;
  }

  await applyInstrumentImpact(client, destinationInstrument, 'expense', adjustmentAmount, 'apply');

  if (existing) {
    await client.query(
      `
      UPDATE app_gastos.transactions
      SET instrument_id = $1,
          category_id = $2,
          subcategory_id = NULL,
          currency_id = $3,
          type = 'expense',
          amount = $4,
          description = $5,
          transaction_date = $6,
          notes = $7,
          is_msi = FALSE,
          msi_months = NULL,
          msi_monthly_amount = NULL,
          msi_start_date = NULL,
          msi_remaining = NULL,
          updated_at = NOW()
      WHERE id = $8
      `,
      [
        statementInstrumentId,
        categoryId,
        payload.currencyId,
        adjustmentAmount,
        AUTO_ADJUSTMENT_DESCRIPTION,
        payload.transferDate,
        marker,
        existing.id,
      ],
    );
  } else {
    await client.query(
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
      VALUES ($1, $2, NULL, $3, 'expense', $4, $5, $6, $7, FALSE, NULL, NULL, NULL, NULL)
      `,
      [
        statementInstrumentId,
        categoryId,
        payload.currencyId,
        adjustmentAmount,
        AUTO_ADJUSTMENT_DESCRIPTION,
        payload.transferDate,
        marker,
      ],
    );
  }

  await refreshStatementComputedAmounts(client, payload.statementId);
}

async function listStatements(instrumentId) {
  const values = [];
  let whereClause = '';

  if (instrumentId) {
    values.push(instrumentId);
    whereClause = 'AND s.instrument_id = $1';
  }

  const result = await query(
    `
    SELECT
      s.id,
      s.instrument_id,
      fi.name AS instrument_name,
      s.cut_off_date,
      s.payment_due_date,
      s.total_amount,
      s.minimum_payment,
      s.no_interest_payment,
      s.is_paid,
      s.paid_amount,
      s.paid_date,
      s.created_at,
      s.updated_at
    FROM app_gastos.credit_card_statements s
    INNER JOIN app_gastos.financial_instruments fi ON fi.id = s.instrument_id
    WHERE fi.is_active = TRUE
      AND fi.type = 'credit_card'
      ${whereClause}
    ORDER BY s.cut_off_date DESC, s.id DESC
    `,
    values,
  );

  return result.rows.map(mapCreditCardStatement);
}

async function listStatementMovements(statementId) {
  const statementResult = await query(
    `
    SELECT id, instrument_id, cut_off_date
    FROM app_gastos.credit_card_statements
    WHERE id = $1
    `,
    [statementId],
  );

  if (statementResult.rows.length === 0) {
    return { notFound: true, data: [] };
  }

  const statement = statementResult.rows[0];
  const instrumentId = Number(statement.instrument_id);
  const cutOffDate = String(statement.cut_off_date);

  const previousCutOffResult = await query(
    `
    SELECT MAX(cut_off_date) AS previous_cut_off_date
    FROM app_gastos.credit_card_statements
    WHERE instrument_id = $1
      AND cut_off_date < $2
    `,
    [instrumentId, cutOffDate],
  );

  const previousCutOffDate = previousCutOffResult.rows[0]?.previous_cut_off_date
    ? String(previousCutOffResult.rows[0].previous_cut_off_date)
    : addMonthsToIsoDate(cutOffDate, -1);

  const movementsResult = await query(
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
    WHERE t.instrument_id = $1
      AND t.transaction_date > $2
      AND t.transaction_date <= $3
    ORDER BY t.transaction_date DESC, t.id DESC
    `,
    [instrumentId, previousCutOffDate, cutOffDate],
  );

  return { notFound: false, data: movementsResult.rows.map(mapTransaction) };
}

async function createStatement(payload) {
  return withDbTransaction(async (client) => {
    const instrument = await getCreditCardInstrumentForStatement(client, payload.instrumentId);

    if (!instrument) {
      return { error: 'Tarjeta de credito no encontrada o inactiva.', data: null };
    }

    const totalAmount = await calculateStatementTotalAmount(client, payload.instrumentId, payload.cutOffDate);
    const minimumPayment = payload.minimumPayment ?? Math.max(0, Number((totalAmount * 0.1).toFixed(2)));
    const noInterestPayment = payload.noInterestPayment ?? Math.max(0, totalAmount);
    const paymentDueDate = payload.paymentDueDate ?? computeDefaultPaymentDueDate(payload.cutOffDate, instrument.payment_due_day ?? 1);

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.credit_card_statements (
        instrument_id,
        cut_off_date,
        payment_due_date,
        total_amount,
        minimum_payment,
        no_interest_payment,
        is_paid,
        paid_amount,
        paid_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NULL, NULL)
      RETURNING id
      `,
      [
        payload.instrumentId,
        payload.cutOffDate,
        paymentDueDate,
        totalAmount,
        minimumPayment,
        noInterestPayment,
      ],
    );

    const createdId = insertResult.rows[0]?.id;
    const fullResult = await client.query(
      `
      SELECT
        s.id,
        s.instrument_id,
        fi.name AS instrument_name,
        s.cut_off_date,
        s.payment_due_date,
        s.total_amount,
        s.minimum_payment,
        s.no_interest_payment,
        s.is_paid,
        s.paid_amount,
        s.paid_date,
        s.created_at,
        s.updated_at
      FROM app_gastos.credit_card_statements s
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = s.instrument_id
      WHERE s.id = $1
      `,
      [createdId],
    );

    return { error: null, data: mapCreditCardStatement(fullResult.rows[0]) };
  });
}

async function updateStatement(statementId, payload) {
  return withDbTransaction(async (client) => {
    const previousResult = await client.query(
      `
      SELECT id, total_amount, minimum_payment, no_interest_payment, is_paid, paid_amount, paid_date, payment_due_date
      FROM app_gastos.credit_card_statements
      WHERE id = $1
      FOR UPDATE
      `,
      [statementId],
    );

    if (previousResult.rows.length === 0) {
      return { notFound: true, data: null };
    }

    const previous = previousResult.rows[0];
    const isPaid = payload.isPaid === null ? previous.is_paid : payload.isPaid;
    const paidAmount = payload.paidAmount === null
      ? (isPaid ? Number(previous.total_amount) : null)
      : payload.paidAmount;
    const paidDate = payload.paidDate === null
      ? (isPaid ? normalizeNullableDate(new Date().toISOString().slice(0, 10)) : null)
      : payload.paidDate;

    await client.query(
      `
      UPDATE app_gastos.credit_card_statements
      SET payment_due_date = COALESCE($1, payment_due_date),
          minimum_payment = COALESCE($2, minimum_payment),
          no_interest_payment = COALESCE($3, no_interest_payment),
          is_paid = $4,
          paid_amount = $5,
          paid_date = $6,
          updated_at = NOW()
      WHERE id = $7
      `,
      [
        payload.paymentDueDate,
        payload.minimumPayment,
        payload.noInterestPayment,
        isPaid,
        paidAmount,
        paidDate,
        statementId,
      ],
    );

    const fullResult = await client.query(
      `
      SELECT
        s.id,
        s.instrument_id,
        fi.name AS instrument_name,
        s.cut_off_date,
        s.payment_due_date,
        s.total_amount,
        s.minimum_payment,
        s.no_interest_payment,
        s.is_paid,
        s.paid_amount,
        s.paid_date,
        s.created_at,
        s.updated_at
      FROM app_gastos.credit_card_statements s
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = s.instrument_id
      WHERE s.id = $1
      `,
      [statementId],
    );

    return { notFound: false, data: mapCreditCardStatement(fullResult.rows[0]) };
  });
}

async function deleteStatement(statementId) {
  const result = await query(
    `
    DELETE FROM app_gastos.credit_card_statements
    WHERE id = $1
    RETURNING id
    `,
    [statementId],
  );

  return result.rows.length > 0;
}

async function validateTransferReferences(client, payload) {
  const currencyResult = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);

  if (currencyResult.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  const source = await getInstrumentForUpdate(client, payload.sourceInstrumentId);
  const destination = await getInstrumentForUpdate(client, payload.destinationInstrumentId);

  if (!source || !source.is_active) {
    return { ok: false, error: 'Instrumento origen no encontrado o inactivo.' };
  }

  if (!destination || !destination.is_active) {
    return { ok: false, error: 'Instrumento destino no encontrado o inactivo.' };
  }

  if (source.type === 'credit_card') {
    return { ok: false, error: 'El instrumento origen no puede ser tarjeta de credito.' };
  }

  if (payload.type === 'card_payment' && destination.type !== 'credit_card') {
    return { ok: false, error: 'card_payment requiere destino de tipo credit_card.' };
  }

  if (payload.type === 'inter_account' && destination.type === 'credit_card') {
    return { ok: false, error: 'inter_account no permite destino credit_card.' };
  }

  if (payload.statementId) {
    const statementResult = await client.query(
      `
      SELECT id, instrument_id
      FROM app_gastos.credit_card_statements
      WHERE id = $1
      `,
      [payload.statementId],
    );

    if (statementResult.rows.length === 0) {
      return { ok: false, error: 'statementId no existe.' };
    }

    const statementInstrumentId = Number(statementResult.rows[0].instrument_id);
    if (statementInstrumentId !== destination.id) {
      return { ok: false, error: 'statementId debe pertenecer al instrumento destino.' };
    }
  }

  if (payload.loanId) {
    const loanResult = await client.query('SELECT id FROM app_gastos.loans WHERE id = $1', [payload.loanId]);
    if (loanResult.rows.length === 0) {
      return { ok: false, error: 'loanId no existe.' };
    }
  }

  if (payload.amount > Number(source.current_amount ?? 0)) {
    return { ok: false, error: 'Saldo insuficiente en instrumento origen.' };
  }

  return { ok: true, source, destination };
}

async function applyTransferImpact(client, source, destination, amount, direction) {
  const signedAmount = direction === 'apply' ? amount : -amount;

  await client.query(
    `
    UPDATE app_gastos.financial_instruments
    SET current_amount = COALESCE(current_amount, 0) - $1,
        updated_at = NOW()
    WHERE id = $2
    `,
    [signedAmount, source.id],
  );

  if (destination.type === 'credit_card') {
    await client.query(
      `
      UPDATE app_gastos.financial_instruments
      SET current_balance = COALESCE(current_balance, 0) - $1,
          available_credit = COALESCE(credit_limit, 0) - (COALESCE(current_balance, 0) - $1),
          updated_at = NOW()
      WHERE id = $2
      `,
      [signedAmount, destination.id],
    );
    return;
  }

  await client.query(
    `
    UPDATE app_gastos.financial_instruments
    SET current_amount = COALESCE(current_amount, 0) + $1,
        updated_at = NOW()
    WHERE id = $2
    `,
    [signedAmount, destination.id],
  );
}

async function listTransfers(instrumentId) {
  const values = [];
  let whereClause = '';

  if (instrumentId) {
    values.push(instrumentId);
    whereClause = `
      AND (t.source_instrument_id = $1 OR t.destination_instrument_id = $1)
    `;
  }

  const result = await query(
    `
    SELECT
      t.id,
      t.source_instrument_id,
      src.name AS source_instrument_name,
      src.type AS source_instrument_type,
      t.destination_instrument_id,
      dst.name AS destination_instrument_name,
      dst.type AS destination_instrument_type,
      t.amount,
      t.currency_id,
      t.transfer_date,
      t.type,
      t.statement_id,
      t.loan_id,
      t.description,
      t.notes,
      t.created_at,
      t.updated_at
    FROM app_gastos.transfers t
    INNER JOIN app_gastos.financial_instruments src ON src.id = t.source_instrument_id
    INNER JOIN app_gastos.financial_instruments dst ON dst.id = t.destination_instrument_id
    WHERE src.is_active = TRUE
      AND dst.is_active = TRUE
      ${whereClause}
    ORDER BY t.transfer_date DESC, t.id DESC
    `,
    values,
  );

  return result.rows.map(mapTransfer);
}

async function createTransfer(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateTransferReferences(client, payload);

    if (!references.ok) {
      return { error: references.error, data: null };
    }

    await applyTransferImpact(client, references.source, references.destination, payload.amount, 'apply');

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.transfers (
        source_instrument_id,
        destination_instrument_id,
        amount,
        currency_id,
        transfer_date,
        type,
        statement_id,
        loan_id,
        description,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        payload.sourceInstrumentId,
        payload.destinationInstrumentId,
        payload.amount,
        payload.currencyId,
        payload.transferDate,
        payload.type,
        payload.statementId,
        payload.loanId,
        payload.description,
        payload.notes,
      ],
    );

    const createdId = insertResult.rows[0]?.id;
    await syncCardPaymentAdjustment(client, payload, createdId);

    const fullResult = await client.query(
      `
      SELECT
        t.id,
        t.source_instrument_id,
        src.name AS source_instrument_name,
        src.type AS source_instrument_type,
        t.destination_instrument_id,
        dst.name AS destination_instrument_name,
        dst.type AS destination_instrument_type,
        t.amount,
        t.currency_id,
        t.transfer_date,
        t.type,
        t.statement_id,
        t.loan_id,
        t.description,
        t.notes,
        t.created_at,
        t.updated_at
      FROM app_gastos.transfers t
      INNER JOIN app_gastos.financial_instruments src ON src.id = t.source_instrument_id
      INNER JOIN app_gastos.financial_instruments dst ON dst.id = t.destination_instrument_id
      WHERE t.id = $1
      `,
      [createdId],
    );

    return { error: null, data: mapTransfer(fullResult.rows[0]) };
  });
}

async function updateTransfer(transferId, payload) {
  return withDbTransaction(async (client) => {
    const previousResult = await client.query(
      `
      SELECT id, source_instrument_id, destination_instrument_id, amount
      FROM app_gastos.transfers
      WHERE id = $1
      FOR UPDATE
      `,
      [transferId],
    );

    if (previousResult.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const previous = previousResult.rows[0];
    const previousSource = await getInstrumentForUpdate(client, previous.source_instrument_id);
    const previousDestination = await getInstrumentForUpdate(client, previous.destination_instrument_id);

    if (!previousSource || !previousDestination) {
      return { notFound: true, error: null, data: null };
    }

    await applyTransferImpact(client, previousSource, previousDestination, Number(previous.amount), 'revert');

    const references = await validateTransferReferences(client, payload);
    if (!references.ok) {
      await applyTransferImpact(client, previousSource, previousDestination, Number(previous.amount), 'apply');
      return { notFound: false, error: references.error, data: null };
    }

    await applyTransferImpact(client, references.source, references.destination, payload.amount, 'apply');

    await client.query(
      `
      UPDATE app_gastos.transfers
      SET source_instrument_id = $1,
          destination_instrument_id = $2,
          amount = $3,
          currency_id = $4,
          transfer_date = $5,
          type = $6,
          statement_id = $7,
          loan_id = $8,
          description = $9,
          notes = $10,
          updated_at = NOW()
      WHERE id = $11
      `,
      [
        payload.sourceInstrumentId,
        payload.destinationInstrumentId,
        payload.amount,
        payload.currencyId,
        payload.transferDate,
        payload.type,
        payload.statementId,
        payload.loanId,
        payload.description,
        payload.notes,
        transferId,
      ],
    );

    await syncCardPaymentAdjustment(client, payload, transferId);

    const fullResult = await client.query(
      `
      SELECT
        t.id,
        t.source_instrument_id,
        src.name AS source_instrument_name,
        src.type AS source_instrument_type,
        t.destination_instrument_id,
        dst.name AS destination_instrument_name,
        dst.type AS destination_instrument_type,
        t.amount,
        t.currency_id,
        t.transfer_date,
        t.type,
        t.statement_id,
        t.loan_id,
        t.description,
        t.notes,
        t.created_at,
        t.updated_at
      FROM app_gastos.transfers t
      INNER JOIN app_gastos.financial_instruments src ON src.id = t.source_instrument_id
      INNER JOIN app_gastos.financial_instruments dst ON dst.id = t.destination_instrument_id
      WHERE t.id = $1
      `,
      [transferId],
    );

    return { notFound: false, error: null, data: mapTransfer(fullResult.rows[0]) };
  });
}

async function deleteTransfer(transferId) {
  return withDbTransaction(async (client) => {
    const previousResult = await client.query(
      `
      SELECT id, source_instrument_id, destination_instrument_id, amount
      FROM app_gastos.transfers
      WHERE id = $1
      FOR UPDATE
      `,
      [transferId],
    );

    if (previousResult.rows.length === 0) {
      return { deleted: false };
    }

    const previous = previousResult.rows[0];
    const previousSource = await getInstrumentForUpdate(client, previous.source_instrument_id);
    const previousDestination = await getInstrumentForUpdate(client, previous.destination_instrument_id);

    if (!previousSource || !previousDestination) {
      return { deleted: false };
    }

    await applyTransferImpact(client, previousSource, previousDestination, Number(previous.amount), 'revert');

    await removeAutoAdjustmentTransaction(client, transferId);

    await client.query('DELETE FROM app_gastos.transfers WHERE id = $1', [transferId]);

    return { deleted: true };
  });
}

function buildInstallmentDate(startDate, paymentDay, monthOffset) {
  const movedDate = new Date(`${addMonthsToIsoDate(startDate, monthOffset)}T00:00:00.000Z`);
  const year = movedDate.getUTCFullYear();
  const month = movedDate.getUTCMonth() + 1;
  const day = getBoundedDayForMonth(year, month, paymentDay);
  return buildDateFromParts(year, month, day);
}

async function getLoanById(client, loanId) {
  const result = await client.query(
    `
    SELECT
      l.id,
      l.name,
      l.lender,
      l.currency_id,
      l.original_amount,
      l.remaining_amount,
      l.annual_rate,
      l.total_installments,
      l.paid_installments,
      l.payment_type,
      l.fixed_payment,
      l.payment_day,
      l.start_date,
      l.end_date,
      l.instrument_id,
      fi.name AS instrument_name,
      l.notes,
      l.is_active,
      l.created_at,
      l.updated_at
    FROM app_gastos.loans l
    LEFT JOIN app_gastos.financial_instruments fi ON fi.id = l.instrument_id
    WHERE l.id = $1
    `,
    [loanId],
  );

  return result.rows[0] ?? null;
}

async function validateLoanReferences(client, payload) {
  const currencyResult = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);
  if (currencyResult.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  if (payload.instrumentId) {
    const instrumentResult = await client.query(
      `
      SELECT id, type, is_active
      FROM app_gastos.financial_instruments
      WHERE id = $1
      `,
      [payload.instrumentId],
    );

    if (instrumentResult.rows.length === 0 || !instrumentResult.rows[0].is_active) {
      return { ok: false, error: 'instrumentId no encontrado o inactivo.' };
    }

    if (instrumentResult.rows[0].type === 'credit_card') {
      return { ok: false, error: 'instrumentId no puede ser una tarjeta de credito.' };
    }
  }

  return { ok: true };
}

async function rebuildLoanSchedule(client, loanId, payload) {
  await client.query('DELETE FROM app_gastos.loan_payments WHERE loan_id = $1', [loanId]);

  const paymentDay = payload.paymentDay ?? Number(payload.startDate.slice(8, 10));
  const monthlyRate = payload.annualRate === null ? 0 : payload.annualRate / 12;

  let remaining = payload.originalAmount;
  let baseVariablePayment = 0;

  if (payload.paymentType === 'variable') {
    if (monthlyRate === 0) {
      baseVariablePayment = roundMoney(payload.originalAmount / payload.totalInstallments);
    } else {
      const factor = Math.pow(1 + monthlyRate, payload.totalInstallments);
      baseVariablePayment = roundMoney(payload.originalAmount * ((monthlyRate * factor) / (factor - 1)));
    }
  }

  for (let installment = 1; installment <= payload.totalInstallments; installment += 1) {
    const paymentDate = buildInstallmentDate(payload.startDate, paymentDay, installment - 1);

    if (payload.paymentType === 'fixed') {
      const fixedAmount = roundMoney(payload.fixedPayment);
      const interest = monthlyRate > 0 ? roundMoney(remaining * monthlyRate) : 0;
      const principal = roundMoney(Math.max(0, fixedAmount - interest));

      await client.query(
        `
        INSERT INTO app_gastos.loan_payments (
          loan_id,
          installment_num,
          amount,
          principal,
          interest,
          payment_date,
          is_paid
        )
        VALUES ($1, $2, $3, $4, $5, $6, FALSE)
        `,
        [loanId, installment, fixedAmount, principal, interest, paymentDate],
      );

      remaining = roundMoney(Math.max(0, remaining - principal));
      continue;
    }

    const interest = roundMoney(remaining * monthlyRate);
    const amount = installment === payload.totalInstallments ? roundMoney(remaining + interest) : baseVariablePayment;
    const principal = roundMoney(Math.max(0, amount - interest));

    await client.query(
      `
      INSERT INTO app_gastos.loan_payments (
        loan_id,
        installment_num,
        amount,
        principal,
        interest,
        payment_date,
        is_paid
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      `,
      [loanId, installment, amount, principal, interest, paymentDate],
    );

    remaining = roundMoney(Math.max(0, remaining - principal));
  }
}

async function listLoans() {
  const result = await query(
    `
    SELECT
      l.id,
      l.name,
      l.lender,
      l.currency_id,
      l.original_amount,
      l.remaining_amount,
      l.annual_rate,
      l.total_installments,
      l.paid_installments,
      l.payment_type,
      l.fixed_payment,
      l.payment_day,
      l.start_date,
      l.end_date,
      l.instrument_id,
      fi.name AS instrument_name,
      l.notes,
      l.is_active,
      l.created_at,
      l.updated_at
    FROM app_gastos.loans l
    LEFT JOIN app_gastos.financial_instruments fi ON fi.id = l.instrument_id
    WHERE l.is_active = TRUE
    ORDER BY l.created_at DESC, l.id DESC
    `,
  );

  return result.rows.map(mapLoan);
}

async function createLoan(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateLoanReferences(client, payload);
    if (!references.ok) {
      return { error: references.error, data: null };
    }

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.loans (
        name,
        lender,
        currency_id,
        original_amount,
        remaining_amount,
        annual_rate,
        total_installments,
        paid_installments,
        payment_type,
        fixed_payment,
        payment_day,
        start_date,
        end_date,
        instrument_id,
        notes,
        is_active
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6, 0, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
      `,
      [
        payload.name,
        payload.lender,
        payload.currencyId,
        payload.originalAmount,
        payload.annualRate,
        payload.totalInstallments,
        payload.paymentType,
        payload.fixedPayment,
        payload.paymentDay,
        payload.startDate,
        payload.endDate,
        payload.instrumentId,
        payload.notes,
        payload.isActive,
      ],
    );

    const loanId = insertResult.rows[0]?.id;
    await rebuildLoanSchedule(client, loanId, payload);

    const createdLoan = await getLoanById(client, loanId);
    return { error: null, data: mapLoan(createdLoan) };
  });
}

async function updateLoan(loanId, payload) {
  return withDbTransaction(async (client) => {
    const existingResult = await client.query(
      `
      SELECT id, paid_installments
      FROM app_gastos.loans
      WHERE id = $1
      FOR UPDATE
      `,
      [loanId],
    );

    if (existingResult.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const references = await validateLoanReferences(client, payload);
    if (!references.ok) {
      return { notFound: false, error: references.error, data: null };
    }

    if (Number(existingResult.rows[0].paid_installments) > 0) {
      return {
        notFound: false,
        error: 'No se puede modificar un prestamo que ya tiene cuotas pagadas.',
        data: null,
      };
    }

    await client.query(
      `
      UPDATE app_gastos.loans
      SET name = $1,
          lender = $2,
          currency_id = $3,
          original_amount = $4,
          remaining_amount = $4,
          annual_rate = $5,
          total_installments = $6,
          paid_installments = 0,
          payment_type = $7,
          fixed_payment = $8,
          payment_day = $9,
          start_date = $10,
          end_date = $11,
          instrument_id = $12,
          notes = $13,
          is_active = $14,
          updated_at = NOW()
      WHERE id = $15
      `,
      [
        payload.name,
        payload.lender,
        payload.currencyId,
        payload.originalAmount,
        payload.annualRate,
        payload.totalInstallments,
        payload.paymentType,
        payload.fixedPayment,
        payload.paymentDay,
        payload.startDate,
        payload.endDate,
        payload.instrumentId,
        payload.notes,
        payload.isActive,
        loanId,
      ],
    );

    await rebuildLoanSchedule(client, loanId, payload);

    const updatedLoan = await getLoanById(client, loanId);
    return { notFound: false, error: null, data: mapLoan(updatedLoan) };
  });
}

async function softDeleteLoan(loanId) {
  const result = await query(
    `
    UPDATE app_gastos.loans
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [loanId],
  );

  return result.rows.length > 0;
}

async function listLoanPayments(loanId) {
  const loanResult = await query('SELECT id FROM app_gastos.loans WHERE id = $1', [loanId]);
  if (loanResult.rows.length === 0) {
    return { notFound: true, data: [] };
  }

  const paymentsResult = await query(
    `
    SELECT
      id,
      loan_id,
      installment_num,
      amount,
      principal,
      interest,
      payment_date,
      is_paid,
      paid_date,
      notes,
      created_at,
      updated_at
    FROM app_gastos.loan_payments
    WHERE loan_id = $1
    ORDER BY installment_num ASC
    `,
    [loanId],
  );

  return { notFound: false, data: paymentsResult.rows.map(mapLoanPayment) };
}

async function payLoanInstallment(loanId, installmentNum, payload) {
  return withDbTransaction(async (client) => {
    const loanResult = await client.query(
      `
      SELECT
        l.id,
        l.name,
        l.lender,
        l.currency_id,
        l.original_amount,
        l.remaining_amount,
        l.annual_rate,
        l.total_installments,
        l.paid_installments,
        l.payment_type,
        l.fixed_payment,
        l.payment_day,
        l.start_date,
        l.end_date,
        l.instrument_id,
        fi.name AS instrument_name,
        l.notes,
        l.is_active,
        l.created_at,
        l.updated_at
      FROM app_gastos.loans l
      LEFT JOIN app_gastos.financial_instruments fi ON fi.id = l.instrument_id
      WHERE l.id = $1
      FOR UPDATE
      `,
      [loanId],
    );

    if (loanResult.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const paymentResult = await client.query(
      `
      SELECT
        id,
        loan_id,
        installment_num,
        amount,
        principal,
        interest,
        payment_date,
        is_paid,
        paid_date,
        notes,
        created_at,
        updated_at
      FROM app_gastos.loan_payments
      WHERE loan_id = $1
        AND installment_num = $2
      FOR UPDATE
      `,
      [loanId, installmentNum],
    );

    if (paymentResult.rows.length === 0) {
      return { notFound: false, error: 'Cuota no encontrada.', data: null };
    }

    const payment = paymentResult.rows[0];

    if (payment.is_paid) {
      return { notFound: false, error: 'La cuota ya fue pagada.', data: null };
    }

    if (payload.amount !== null && Math.abs(payload.amount - Number(payment.amount)) > 0.01) {
      return { notFound: false, error: 'El monto debe coincidir con la cuota programada.', data: null };
    }

    const paidDate = payload.paidDate ?? new Date().toISOString().slice(0, 10);

    await client.query(
      `
      UPDATE app_gastos.loan_payments
      SET is_paid = TRUE,
          paid_date = $1,
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3
      `,
      [paidDate, payload.notes, payment.id],
    );

    await client.query(
      `
      UPDATE app_gastos.loans
      SET remaining_amount = GREATEST(0, remaining_amount - $1),
          paid_installments = paid_installments + 1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [Number(payment.amount), loanId],
    );

    const updatedLoan = await getLoanById(client, loanId);
    const updatedPaymentResult = await client.query(
      `
      SELECT
        id,
        loan_id,
        installment_num,
        amount,
        principal,
        interest,
        payment_date,
        is_paid,
        paid_date,
        notes,
        created_at,
        updated_at
      FROM app_gastos.loan_payments
      WHERE id = $1
      `,
      [payment.id],
    );

    return {
      notFound: false,
      error: null,
      data: {
        loan: mapLoan(updatedLoan),
        payment: mapLoanPayment(updatedPaymentResult.rows[0]),
      },
    };
  });
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

async function validateCategoryLinks(client, categoryId, subcategoryId) {
  if (categoryId !== null) {
    const categoryResult = await client.query(
      'SELECT id FROM app_gastos.categories WHERE id = $1 AND is_active = TRUE',
      [categoryId],
    );

    if (categoryResult.rows.length === 0) {
      return { ok: false, error: 'categoryId no existe o esta inactiva.' };
    }
  }

  if (subcategoryId !== null) {
    if (categoryId === null) {
      return { ok: false, error: 'subcategoryId requiere categoryId.' };
    }

    const subcategoryResult = await client.query(
      'SELECT id FROM app_gastos.subcategories WHERE id = $1 AND category_id = $2 AND is_active = TRUE',
      [subcategoryId, categoryId],
    );

    if (subcategoryResult.rows.length === 0) {
      return { ok: false, error: 'subcategoryId no pertenece a la categoria indicada.' };
    }
  }

  return { ok: true };
}

async function validateSubscriptionReferences(client, payload) {
  const currencyResult = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);
  if (currencyResult.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  const instrumentResult = await client.query(
    'SELECT id FROM app_gastos.financial_instruments WHERE id = $1 AND is_active = TRUE',
    [payload.instrumentId],
  );
  if (instrumentResult.rows.length === 0) {
    return { ok: false, error: 'instrumentId no existe o esta inactivo.' };
  }

  const categoryLinks = await validateCategoryLinks(client, payload.categoryId, payload.subcategoryId);
  if (!categoryLinks.ok) {
    return categoryLinks;
  }

  return { ok: true };
}

async function validateFixedExpenseReferences(client, payload) {
  const currencyResult = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);
  if (currencyResult.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  if (payload.instrumentId !== null) {
    const instrumentResult = await client.query(
      'SELECT id FROM app_gastos.financial_instruments WHERE id = $1 AND is_active = TRUE',
      [payload.instrumentId],
    );
    if (instrumentResult.rows.length === 0) {
      return { ok: false, error: 'instrumentId no existe o esta inactivo.' };
    }
  }

  const categoryLinks = await validateCategoryLinks(client, payload.categoryId, payload.subcategoryId);
  if (!categoryLinks.ok) {
    return categoryLinks;
  }

  return { ok: true };
}

async function getSubscriptionById(client, subscriptionId) {
  const result = await client.query(
    `
    SELECT
      s.id,
      s.name,
      s.instrument_id,
      fi.name AS instrument_name,
      s.category_id,
      c.name AS category_name,
      s.subcategory_id,
      sc.name AS subcategory_name,
      s.currency_id,
      s.amount,
      s.billing_cycle,
      s.billing_day,
      s.next_billing,
      s.is_active,
      s.notes,
      s.created_at,
      s.updated_at
    FROM app_gastos.subscriptions s
    INNER JOIN app_gastos.financial_instruments fi ON fi.id = s.instrument_id
    LEFT JOIN app_gastos.categories c ON c.id = s.category_id
    LEFT JOIN app_gastos.subcategories sc ON sc.id = s.subcategory_id
    WHERE s.id = $1
    `,
    [subscriptionId],
  );

  return result.rows[0] ?? null;
}

async function listSubscriptions() {
  const result = await query(
    `
    SELECT
      s.id,
      s.name,
      s.instrument_id,
      fi.name AS instrument_name,
      s.category_id,
      c.name AS category_name,
      s.subcategory_id,
      sc.name AS subcategory_name,
      s.currency_id,
      s.amount,
      s.billing_cycle,
      s.billing_day,
      s.next_billing,
      s.is_active,
      s.notes,
      s.created_at,
      s.updated_at
    FROM app_gastos.subscriptions s
    INNER JOIN app_gastos.financial_instruments fi ON fi.id = s.instrument_id
    LEFT JOIN app_gastos.categories c ON c.id = s.category_id
    LEFT JOIN app_gastos.subcategories sc ON sc.id = s.subcategory_id
    WHERE s.is_active = TRUE
    ORDER BY s.next_billing ASC NULLS LAST, s.id DESC
    `,
  );

  return result.rows.map(mapSubscription);
}

async function createSubscription(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateSubscriptionReferences(client, payload);
    if (!references.ok) {
      return { error: references.error, data: null };
    }

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.subscriptions (
        name,
        instrument_id,
        category_id,
        subcategory_id,
        currency_id,
        amount,
        billing_cycle,
        billing_day,
        next_billing,
        is_active,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        payload.name,
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.amount,
        payload.billingCycle,
        payload.billingDay,
        payload.nextBilling,
        payload.isActive,
        payload.notes,
      ],
    );

    const created = await getSubscriptionById(client, insertResult.rows[0].id);
    return { error: null, data: mapSubscription(created) };
  });
}

async function updateSubscription(subscriptionId, payload) {
  return withDbTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM app_gastos.subscriptions WHERE id = $1 FOR UPDATE',
      [subscriptionId],
    );

    if (existing.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const references = await validateSubscriptionReferences(client, payload);
    if (!references.ok) {
      return { notFound: false, error: references.error, data: null };
    }

    await client.query(
      `
      UPDATE app_gastos.subscriptions
      SET name = $1,
          instrument_id = $2,
          category_id = $3,
          subcategory_id = $4,
          currency_id = $5,
          amount = $6,
          billing_cycle = $7,
          billing_day = $8,
          next_billing = $9,
          is_active = $10,
          notes = $11,
          updated_at = NOW()
      WHERE id = $12
      `,
      [
        payload.name,
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.amount,
        payload.billingCycle,
        payload.billingDay,
        payload.nextBilling,
        payload.isActive,
        payload.notes,
        subscriptionId,
      ],
    );

    const updated = await getSubscriptionById(client, subscriptionId);
    return { notFound: false, error: null, data: mapSubscription(updated) };
  });
}

async function softDeleteSubscription(subscriptionId) {
  const result = await query(
    `
    UPDATE app_gastos.subscriptions
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [subscriptionId],
  );

  return result.rows.length > 0;
}

async function getFixedExpenseById(client, fixedExpenseId) {
  const result = await client.query(
    `
    SELECT
      fe.id,
      fe.name,
      fe.instrument_id,
      fi.name AS instrument_name,
      fe.category_id,
      c.name AS category_name,
      fe.subcategory_id,
      sc.name AS subcategory_name,
      fe.currency_id,
      fe.estimated_amount,
      fe.is_variable,
      fe.payment_day,
      fe.is_active,
      fe.notes,
      fe.created_at,
      fe.updated_at
    FROM app_gastos.fixed_expenses fe
    LEFT JOIN app_gastos.financial_instruments fi ON fi.id = fe.instrument_id
    LEFT JOIN app_gastos.categories c ON c.id = fe.category_id
    LEFT JOIN app_gastos.subcategories sc ON sc.id = fe.subcategory_id
    WHERE fe.id = $1
    `,
    [fixedExpenseId],
  );

  return result.rows[0] ?? null;
}

async function listFixedExpenses() {
  const result = await query(
    `
    SELECT
      fe.id,
      fe.name,
      fe.instrument_id,
      fi.name AS instrument_name,
      fe.category_id,
      c.name AS category_name,
      fe.subcategory_id,
      sc.name AS subcategory_name,
      fe.currency_id,
      fe.estimated_amount,
      fe.is_variable,
      fe.payment_day,
      fe.is_active,
      fe.notes,
      fe.created_at,
      fe.updated_at
    FROM app_gastos.fixed_expenses fe
    LEFT JOIN app_gastos.financial_instruments fi ON fi.id = fe.instrument_id
    LEFT JOIN app_gastos.categories c ON c.id = fe.category_id
    LEFT JOIN app_gastos.subcategories sc ON sc.id = fe.subcategory_id
    WHERE fe.is_active = TRUE
    ORDER BY fe.payment_day ASC NULLS LAST, fe.id DESC
    `,
  );

  return result.rows.map(mapFixedExpense);
}

async function createFixedExpense(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateFixedExpenseReferences(client, payload);
    if (!references.ok) {
      return { error: references.error, data: null };
    }

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.fixed_expenses (
        name,
        instrument_id,
        category_id,
        subcategory_id,
        currency_id,
        estimated_amount,
        is_variable,
        payment_day,
        is_active,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
      `,
      [
        payload.name,
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.estimatedAmount,
        payload.isVariable,
        payload.paymentDay,
        payload.isActive,
        payload.notes,
      ],
    );

    const created = await getFixedExpenseById(client, insertResult.rows[0].id);
    return { error: null, data: mapFixedExpense(created) };
  });
}

async function updateFixedExpense(fixedExpenseId, payload) {
  return withDbTransaction(async (client) => {
    const existing = await client.query(
      'SELECT id FROM app_gastos.fixed_expenses WHERE id = $1 FOR UPDATE',
      [fixedExpenseId],
    );

    if (existing.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const references = await validateFixedExpenseReferences(client, payload);
    if (!references.ok) {
      return { notFound: false, error: references.error, data: null };
    }

    await client.query(
      `
      UPDATE app_gastos.fixed_expenses
      SET name = $1,
          instrument_id = $2,
          category_id = $3,
          subcategory_id = $4,
          currency_id = $5,
          estimated_amount = $6,
          is_variable = $7,
          payment_day = $8,
          is_active = $9,
          notes = $10,
          updated_at = NOW()
      WHERE id = $11
      `,
      [
        payload.name,
        payload.instrumentId,
        payload.categoryId,
        payload.subcategoryId,
        payload.currencyId,
        payload.estimatedAmount,
        payload.isVariable,
        payload.paymentDay,
        payload.isActive,
        payload.notes,
        fixedExpenseId,
      ],
    );

    const updated = await getFixedExpenseById(client, fixedExpenseId);
    return { notFound: false, error: null, data: mapFixedExpense(updated) };
  });
}

async function softDeleteFixedExpense(fixedExpenseId) {
  const result = await query(
    `
    UPDATE app_gastos.fixed_expenses
    SET is_active = FALSE,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [fixedExpenseId],
  );

  return result.rows.length > 0;
}

async function listFixedExpensePayments(fixedExpenseId) {
  const fixedExpenseResult = await query('SELECT id FROM app_gastos.fixed_expenses WHERE id = $1', [fixedExpenseId]);

  if (fixedExpenseResult.rows.length === 0) {
    return { notFound: true, data: [] };
  }

  const result = await query(
    `
    SELECT
      id,
      fixed_expense_id,
      amount,
      period_month,
      period_year,
      payment_date,
      is_paid,
      notes,
      created_at,
      updated_at
    FROM app_gastos.fixed_expense_payments
    WHERE fixed_expense_id = $1
    ORDER BY period_year DESC, period_month DESC, id DESC
    `,
    [fixedExpenseId],
  );

  return { notFound: false, data: result.rows.map(mapFixedExpensePayment) };
}

async function createFixedExpensePayment(fixedExpenseId, payload) {
  return withDbTransaction(async (client) => {
    const fixedExpenseResult = await client.query(
      'SELECT id FROM app_gastos.fixed_expenses WHERE id = $1 FOR UPDATE',
      [fixedExpenseId],
    );

    if (fixedExpenseResult.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.fixed_expense_payments (
        fixed_expense_id,
        amount,
        period_month,
        period_year,
        payment_date,
        is_paid,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        fixed_expense_id,
        amount,
        period_month,
        period_year,
        payment_date,
        is_paid,
        notes,
        created_at,
        updated_at
      `,
      [
        fixedExpenseId,
        payload.amount,
        payload.periodMonth,
        payload.periodYear,
        payload.paymentDate,
        payload.isPaid,
        payload.notes,
      ],
    );

    return { notFound: false, error: null, data: mapFixedExpensePayment(insertResult.rows[0]) };
  });
}

async function updateFixedExpensePayment(fixedExpenseId, paymentId, payload) {
  return withDbTransaction(async (client) => {
    const previous = await client.query(
      `
      SELECT id
      FROM app_gastos.fixed_expense_payments
      WHERE id = $1
        AND fixed_expense_id = $2
      FOR UPDATE
      `,
      [paymentId, fixedExpenseId],
    );

    if (previous.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    await client.query(
      `
      UPDATE app_gastos.fixed_expense_payments
      SET amount = $1,
          period_month = $2,
          period_year = $3,
          payment_date = $4,
          is_paid = $5,
          notes = $6,
          updated_at = NOW()
      WHERE id = $7
      RETURNING
        id,
        fixed_expense_id,
        amount,
        period_month,
        period_year,
        payment_date,
        is_paid,
        notes,
        created_at,
        updated_at
      `,
      [
        payload.amount,
        payload.periodMonth,
        payload.periodYear,
        payload.paymentDate,
        payload.isPaid,
        payload.notes,
        paymentId,
      ],
    );

    const updated = await client.query(
      `
      SELECT
        id,
        fixed_expense_id,
        amount,
        period_month,
        period_year,
        payment_date,
        is_paid,
        notes,
        created_at,
        updated_at
      FROM app_gastos.fixed_expense_payments
      WHERE id = $1
      `,
      [paymentId],
    );

    return { notFound: false, error: null, data: mapFixedExpensePayment(updated.rows[0]) };
  });
}

async function deleteFixedExpensePayment(fixedExpenseId, paymentId) {
  const result = await query(
    `
    DELETE FROM app_gastos.fixed_expense_payments
    WHERE id = $1
      AND fixed_expense_id = $2
    RETURNING id
    `,
    [paymentId, fixedExpenseId],
  );

  return result.rows.length > 0;
}

async function getBudgetById(client, budgetId) {
  const result = await client.query(
    `
    SELECT
      b.id,
      b.category_id,
      c.name AS category_name,
      b.currency_id,
      b.amount,
      b.month,
      b.year,
      b.notes,
      b.created_at,
      b.updated_at,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS spent_amount
    FROM app_gastos.budgets b
    LEFT JOIN app_gastos.categories c ON c.id = b.category_id
    LEFT JOIN app_gastos.transactions t
      ON (
        (b.category_id IS NULL)
        OR (t.category_id = b.category_id)
      )
      AND EXTRACT(MONTH FROM t.transaction_date)::INT = b.month
      AND EXTRACT(YEAR FROM t.transaction_date)::INT = b.year
    WHERE b.id = $1
    GROUP BY b.id, c.name
    `,
    [budgetId],
  );

  return result.rows[0] ?? null;
}

async function validateBudgetReferences(client, payload) {
  const currencyResult = await client.query('SELECT id FROM app_gastos.currencies WHERE id = $1', [payload.currencyId]);
  if (currencyResult.rows.length === 0) {
    return { ok: false, error: 'currencyId no existe.' };
  }

  if (payload.categoryId !== null) {
    const categoryResult = await client.query(
      'SELECT id FROM app_gastos.categories WHERE id = $1 AND is_active = TRUE',
      [payload.categoryId],
    );

    if (categoryResult.rows.length === 0) {
      return { ok: false, error: 'categoryId no existe o esta inactiva.' };
    }
  }

  return { ok: true };
}

async function ensureBudgetUniqueness(client, payload, budgetId = null) {
  const values = [payload.month, payload.year];
  const clauses = ['month = $1', 'year = $2'];

  if (payload.categoryId === null) {
    clauses.push('category_id IS NULL');
  } else {
    values.push(payload.categoryId);
    clauses.push(`category_id = $${values.length}`);
  }

  if (budgetId !== null) {
    values.push(budgetId);
    clauses.push(`id <> $${values.length}`);
  }

  const result = await client.query(
    `
    SELECT id
    FROM app_gastos.budgets
    WHERE ${clauses.join(' AND ')}
    LIMIT 1
    `,
    values,
  );

  if (result.rows.length > 0) {
    return { ok: false, error: 'Ya existe un presupuesto para esa categoria/mes/anio.' };
  }

  return { ok: true };
}

async function listBudgets(month, year) {
  const values = [];
  const filters = [];

  if (month !== null) {
    values.push(month);
    filters.push(`b.month = $${values.length}`);
  }

  if (year !== null) {
    values.push(year);
    filters.push(`b.year = $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(
    `
    SELECT
      b.id,
      b.category_id,
      c.name AS category_name,
      b.currency_id,
      b.amount,
      b.month,
      b.year,
      b.notes,
      b.created_at,
      b.updated_at,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS spent_amount
    FROM app_gastos.budgets b
    LEFT JOIN app_gastos.categories c ON c.id = b.category_id
    LEFT JOIN app_gastos.transactions t
      ON (
        (b.category_id IS NULL)
        OR (t.category_id = b.category_id)
      )
      AND EXTRACT(MONTH FROM t.transaction_date)::INT = b.month
      AND EXTRACT(YEAR FROM t.transaction_date)::INT = b.year
    ${whereClause}
    GROUP BY b.id, c.name
    ORDER BY b.year DESC, b.month DESC, c.name ASC NULLS FIRST, b.id DESC
    `,
    values,
  );

  return result.rows.map(mapBudget);
}

async function createBudget(payload) {
  return withDbTransaction(async (client) => {
    const references = await validateBudgetReferences(client, payload);
    if (!references.ok) {
      return { error: references.error, data: null };
    }

    const uniqueCheck = await ensureBudgetUniqueness(client, payload);
    if (!uniqueCheck.ok) {
      return { error: uniqueCheck.error, data: null };
    }

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.budgets (category_id, currency_id, amount, month, year, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [payload.categoryId, payload.currencyId, payload.amount, payload.month, payload.year, payload.notes],
    );

    const created = await getBudgetById(client, insertResult.rows[0].id);
    return { error: null, data: mapBudget(created) };
  });
}

async function updateBudget(budgetId, payload) {
  return withDbTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM app_gastos.budgets WHERE id = $1', [budgetId]);
    if (existing.rows.length === 0) {
      return { notFound: true, error: null, data: null };
    }

    const references = await validateBudgetReferences(client, payload);
    if (!references.ok) {
      return { notFound: false, error: references.error, data: null };
    }

    const uniqueCheck = await ensureBudgetUniqueness(client, payload, budgetId);
    if (!uniqueCheck.ok) {
      return { notFound: false, error: uniqueCheck.error, data: null };
    }

    await client.query(
      `
      UPDATE app_gastos.budgets
      SET category_id = $1,
          currency_id = $2,
          amount = $3,
          month = $4,
          year = $5,
          notes = $6,
          updated_at = NOW()
      WHERE id = $7
      `,
      [payload.categoryId, payload.currencyId, payload.amount, payload.month, payload.year, payload.notes, budgetId],
    );

    const updated = await getBudgetById(client, budgetId);
    return { notFound: false, error: null, data: mapBudget(updated) };
  });
}

async function deleteBudget(budgetId) {
  const result = await query(
    `
    DELETE FROM app_gastos.budgets
    WHERE id = $1
    RETURNING id
    `,
    [budgetId],
  );

  return result.rows.length > 0;
}

function calculateLoanMonthlyPayment(amount, annualRate, months) {
  const principal = Number(amount);
  const monthlyRate = (Number(annualRate) / 100) / 12;

  if (monthlyRate <= 0) {
    return Number((principal / months).toFixed(2));
  }

  const growth = (1 + monthlyRate) ** months;
  const payment = principal * ((monthlyRate * growth) / (growth - 1));
  return Number(payment.toFixed(2));
}

async function getCurrentMonthlyObligations() {
  const result = await query(
    `
    WITH subscription_monthly AS (
      SELECT COALESCE(SUM(
        CASE s.billing_cycle
          WHEN 'monthly' THEN s.amount
          WHEN 'yearly' THEN s.amount / 12
          WHEN 'weekly' THEN (s.amount * 52) / 12
          ELSE 0
        END
      ), 0) AS total
      FROM app_gastos.subscriptions s
      WHERE s.is_active = TRUE
    ),
    fixed_monthly AS (
      SELECT COALESCE(SUM(fe.estimated_amount), 0) AS total
      FROM app_gastos.fixed_expenses fe
      WHERE fe.is_active = TRUE
    ),
    loan_monthly AS (
      SELECT COALESCE(SUM(lp.amount), 0) AS total
      FROM app_gastos.loan_payments lp
      INNER JOIN app_gastos.loans l ON l.id = lp.loan_id
      WHERE lp.is_paid = FALSE
        AND l.is_active = TRUE
        AND DATE_TRUNC('month', lp.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
    )
    SELECT
      ROUND(COALESCE(sm.total, 0)::numeric, 2) AS subscriptions,
      ROUND(COALESCE(fm.total, 0)::numeric, 2) AS fixed_expenses,
      ROUND(COALESCE(lm.total, 0)::numeric, 2) AS loan_payments
    FROM subscription_monthly sm
    CROSS JOIN fixed_monthly fm
    CROSS JOIN loan_monthly lm
    `,
  );

  const row = result.rows[0] ?? { subscriptions: 0, fixed_expenses: 0, loan_payments: 0 };
  const subscriptions = Number(row.subscriptions ?? 0);
  const fixedExpenses = Number(row.fixed_expenses ?? 0);
  const loanPayments = Number(row.loan_payments ?? 0);

  return {
    subscriptions,
    fixedExpenses,
    loanPayments,
    total: Number((subscriptions + fixedExpenses + loanPayments).toFixed(2)),
  };
}

async function getSimulationById(simulationId) {
  const result = await query(
    `
    SELECT id, name, description, simulation_date, snapshot_json, result_json, is_favorable, created_at
    FROM app_gastos.simulations
    WHERE id = $1
    `,
    [simulationId],
  );

  return result.rows[0] ?? null;
}

async function listSimulations() {
  const result = await query(
    `
    SELECT id, name, description, simulation_date, snapshot_json, result_json, is_favorable, created_at
    FROM app_gastos.simulations
    ORDER BY created_at DESC, id DESC
    `,
  );

  return result.rows.map(mapSimulation);
}

async function createSimulation(payload) {
  return withDbTransaction(async (client) => {
    let selectedInstrument = null;

    if (payload.instrumentId !== null) {
      const instrumentResult = await client.query(
        'SELECT id, type, name FROM app_gastos.financial_instruments WHERE id = $1 AND is_active = TRUE',
        [payload.instrumentId],
      );

      if (instrumentResult.rows.length === 0) {
        return { error: 'instrumentId no existe o esta inactivo.', data: null };
      }

      selectedInstrument = instrumentResult.rows[0];
    }

    const summary = await getDashboardSummary();
    const obligations = await getCurrentMonthlyObligations();

    let projectedAvailable = summary.totalAvailable;
    let projectedCreditDebt = summary.totalCreditDebt;
    let projectedLoanDebt = summary.totalLoanDebt;
    let projectedAvailableCredit = summary.totalAvailableCredit;
    let monthlyCommitmentIncrease = 0;

    if (payload.scenarioType === 'direct_purchase') {
      if (selectedInstrument?.type === 'credit_card') {
        projectedCreditDebt = Number((projectedCreditDebt + payload.amount).toFixed(2));
        projectedAvailableCredit = Number((projectedAvailableCredit - payload.amount).toFixed(2));
      } else {
        projectedAvailable = Number((projectedAvailable - payload.amount).toFixed(2));
      }
    }

    if (payload.scenarioType === 'msi') {
      if (selectedInstrument?.type !== 'credit_card') {
        return { error: 'Para escenario MSI debes seleccionar una tarjeta de credito.', data: null };
      }

      projectedCreditDebt = Number((projectedCreditDebt + payload.amount).toFixed(2));
      projectedAvailableCredit = Number((projectedAvailableCredit - payload.amount).toFixed(2));
      monthlyCommitmentIncrease = Number((payload.amount / payload.msiMonths).toFixed(2));
    }

    if (payload.scenarioType === 'loan') {
      projectedLoanDebt = Number((projectedLoanDebt + payload.amount).toFixed(2));
      monthlyCommitmentIncrease = calculateLoanMonthlyPayment(payload.amount, payload.annualRate, payload.loanMonths);
    }

    const projectedNetBalance = Number((projectedAvailable - projectedCreditDebt - projectedLoanDebt).toFixed(2));
    const projectedMonthlyObligations = Number((obligations.total + monthlyCommitmentIncrease).toFixed(2));
    const isFavorable = projectedAvailable >= 0
      && projectedNetBalance >= 0
      && projectedMonthlyObligations <= projectedAvailable;

    const snapshotJson = {
      summary,
      obligations,
      selectedInstrument: selectedInstrument
        ? {
          id: selectedInstrument.id,
          type: selectedInstrument.type,
          name: selectedInstrument.name,
        }
        : null,
    };

    const resultJson = {
      scenarioType: payload.scenarioType,
      amount: payload.amount,
      monthlyCommitmentIncrease,
      projectedMonthlyObligations,
      projectedSummary: {
        totalAvailable: projectedAvailable,
        totalCreditDebt: projectedCreditDebt,
        totalLoanDebt: projectedLoanDebt,
        totalAvailableCredit: projectedAvailableCredit,
        netBalance: projectedNetBalance,
      },
    };

    const insertResult = await client.query(
      `
      INSERT INTO app_gastos.simulations (
        name,
        description,
        simulation_date,
        snapshot_json,
        result_json,
        is_favorable
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        payload.name,
        payload.description,
        payload.simulationDate ?? new Date().toISOString().slice(0, 10),
        snapshotJson,
        resultJson,
        isFavorable,
      ],
    );

    const created = await getSimulationById(insertResult.rows[0].id);
    return { error: null, data: mapSimulation(created) };
  });
}

async function deleteSimulation(simulationId) {
  const result = await query(
    `
    DELETE FROM app_gastos.simulations
    WHERE id = $1
    RETURNING id
    `,
    [simulationId],
  );

  return result.rows.length > 0;
}

async function getReminderById(reminderId) {
  const result = await query(
    `
    SELECT
      id,
      title,
      description,
      reminder_date,
      type,
      reference_id,
      reference_type,
      is_read,
      is_dismissed,
      created_at,
      updated_at
    FROM app_gastos.reminders
    WHERE id = $1
    `,
    [reminderId],
  );

  return result.rows[0] ?? null;
}

async function listReminders(pendingOnly = false) {
  const whereClause = pendingOnly
    ? 'WHERE r.is_read = FALSE AND r.is_dismissed = FALSE'
    : '';

  const result = await query(
    `
    SELECT
      r.id,
      r.title,
      r.description,
      r.reminder_date,
      r.type,
      r.reference_id,
      r.reference_type,
      r.is_read,
      r.is_dismissed,
      r.created_at,
      r.updated_at
    FROM app_gastos.reminders r
    ${whereClause}
    ORDER BY r.reminder_date ASC, r.id DESC
    `,
  );

  return result.rows.map(mapReminder);
}

async function createReminder(payload) {
  const insertResult = await query(
    `
    INSERT INTO app_gastos.reminders (
      title,
      description,
      reminder_date,
      type,
      reference_id,
      reference_type,
      is_read,
      is_dismissed
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      payload.title,
      payload.description,
      payload.reminderDate,
      payload.type,
      payload.referenceId,
      payload.referenceType,
      payload.isRead,
      payload.isDismissed,
    ],
  );

  const created = await getReminderById(insertResult.rows[0].id);
  return { error: null, data: mapReminder(created) };
}

async function updateReminder(reminderId, payload) {
  const existing = await getReminderById(reminderId);
  if (!existing) {
    return { notFound: true, error: null, data: null };
  }

  await query(
    `
    UPDATE app_gastos.reminders
    SET title = $1,
        description = $2,
        reminder_date = $3,
        type = $4,
        reference_id = $5,
        reference_type = $6,
        is_read = $7,
        is_dismissed = $8,
        updated_at = NOW()
    WHERE id = $9
    `,
    [
      payload.title,
      payload.description,
      payload.reminderDate,
      payload.type,
      payload.referenceId,
      payload.referenceType,
      payload.isRead,
      payload.isDismissed,
      reminderId,
    ],
  );

  const updated = await getReminderById(reminderId);
  return { notFound: false, error: null, data: mapReminder(updated) };
}

async function deleteReminder(reminderId) {
  const result = await query(
    `
    DELETE FROM app_gastos.reminders
    WHERE id = $1
    RETURNING id
    `,
    [reminderId],
  );

  return result.rows.length > 0;
}

async function getDashboardSummary() {
  const result = await query(
    `
    SELECT
      total_available,
      total_credit_debt,
      total_loan_debt,
      total_available_credit
    FROM app_gastos.v_financial_summary
    LIMIT 1
    `,
  );

  const row = result.rows[0] ?? {
    total_available: 0,
    total_credit_debt: 0,
    total_loan_debt: 0,
    total_available_credit: 0,
  };

  const totalAvailable = Number(row.total_available ?? 0);
  const totalCreditDebt = Number(row.total_credit_debt ?? 0);
  const totalLoanDebt = Number(row.total_loan_debt ?? 0);
  const totalAvailableCredit = Number(row.total_available_credit ?? 0);

  return {
    totalAvailable,
    totalCreditDebt,
    totalLoanDebt,
    totalAvailableCredit,
    netBalance: Number((totalAvailable - totalCreditDebt - totalLoanDebt).toFixed(2)),
  };
}

async function getDashboardExpensesByCategory() {
  const result = await query(
    `
    SELECT
      COALESCE(c.name, 'Sin categoria') AS category,
      COALESCE(SUM(t.amount), 0) AS total
    FROM app_gastos.transactions t
    LEFT JOIN app_gastos.categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY COALESCE(c.name, 'Sin categoria')
    ORDER BY total DESC
    `,
  );

  return result.rows.map((row) => ({
    category: row.category,
    total: Number(row.total),
  }));
}

async function getDashboardCashFlow() {
  const result = await query(
    `
    WITH months AS (
      SELECT DATE_TRUNC('month', CURRENT_DATE) - (INTERVAL '1 month' * gs.idx) AS month_start
      FROM GENERATE_SERIES(5, 0, -1) AS gs(idx)
    )
    SELECT
      TO_CHAR(months.month_start, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense
    FROM months
    LEFT JOIN app_gastos.transactions t
      ON DATE_TRUNC('month', t.transaction_date) = months.month_start
    GROUP BY months.month_start
    ORDER BY months.month_start
    `,
  );

  return result.rows.map((row) => ({
    month: row.month,
    income: Number(row.income),
    expense: Number(row.expense),
  }));
}

async function getDashboardBalanceEvolution() {
  const result = await query(
    `
    WITH months AS (
      SELECT DATE_TRUNC('month', CURRENT_DATE) - (INTERVAL '1 month' * gs.idx) AS month_start
      FROM GENERATE_SERIES(5, 0, -1) AS gs(idx)
    ),
    active_instruments AS (
      SELECT id, name
      FROM app_gastos.financial_instruments
      WHERE is_active = TRUE
        AND type IN ('debit_card', 'account')
    ),
    movement_rows AS (
      SELECT
        t.instrument_id,
        DATE_TRUNC('month', t.transaction_date) AS month_start,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS delta
      FROM app_gastos.transactions t
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = t.instrument_id
      WHERE fi.type IN ('debit_card', 'account')
        AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 month'
      GROUP BY t.instrument_id, DATE_TRUNC('month', t.transaction_date)

      UNION ALL

      SELECT
        tr.source_instrument_id AS instrument_id,
        DATE_TRUNC('month', tr.transfer_date) AS month_start,
        SUM(-tr.amount) AS delta
      FROM app_gastos.transfers tr
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = tr.source_instrument_id
      WHERE fi.type IN ('debit_card', 'account')
        AND tr.transfer_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 month'
      GROUP BY tr.source_instrument_id, DATE_TRUNC('month', tr.transfer_date)

      UNION ALL

      SELECT
        tr.destination_instrument_id AS instrument_id,
        DATE_TRUNC('month', tr.transfer_date) AS month_start,
        SUM(tr.amount) AS delta
      FROM app_gastos.transfers tr
      INNER JOIN app_gastos.financial_instruments fi ON fi.id = tr.destination_instrument_id
      WHERE fi.type IN ('debit_card', 'account')
        AND tr.transfer_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 month'
      GROUP BY tr.destination_instrument_id, DATE_TRUNC('month', tr.transfer_date)
    ),
    monthly_delta AS (
      SELECT instrument_id, month_start, SUM(delta) AS delta
      FROM movement_rows
      GROUP BY instrument_id, month_start
    )
    SELECT
      ai.id AS instrument_id,
      ai.name AS instrument_name,
      TO_CHAR(months.month_start, 'YYYY-MM') AS month,
      SUM(COALESCE(md.delta, 0)) OVER (
        PARTITION BY ai.id
        ORDER BY months.month_start
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS balance
    FROM active_instruments ai
    CROSS JOIN months
    LEFT JOIN monthly_delta md
      ON md.instrument_id = ai.id
      AND md.month_start = months.month_start
    ORDER BY ai.name, months.month_start
    `,
  );

  const series = [];
  const keyByInstrument = new Map();
  const pointsByMonth = new Map();

  for (const row of result.rows) {
    const instrumentId = Number(row.instrument_id);
    const month = String(row.month);
    const instrumentName = String(row.instrument_name);

    if (!keyByInstrument.has(instrumentId)) {
      const key = `instrument_${instrumentId}`;
      keyByInstrument.set(instrumentId, key);
      series.push({ key, label: instrumentName });
    }

    const key = keyByInstrument.get(instrumentId);
    const existingPoint = pointsByMonth.get(month) ?? { month };
    existingPoint[key] = Number(row.balance);
    pointsByMonth.set(month, existingPoint);
  }

  const points = Array.from(pointsByMonth.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));

  return { series, points };
}

async function getDashboardFutureExpenses() {
  const result = await query(
    `
    WITH months AS (
      SELECT DATE_TRUNC('month', CURRENT_DATE) + (INTERVAL '1 month' * gs.idx) AS month_start
      FROM GENERATE_SERIES(0, 5) AS gs(idx)
    ),
    subscription_monthly AS (
      SELECT COALESCE(SUM(
        CASE s.billing_cycle
          WHEN 'monthly' THEN s.amount
          WHEN 'yearly' THEN s.amount / 12
          WHEN 'weekly' THEN (s.amount * 52) / 12
          ELSE 0
        END
      ), 0) AS total
      FROM app_gastos.subscriptions s
      WHERE s.is_active = TRUE
    ),
    fixed_monthly AS (
      SELECT COALESCE(SUM(fe.estimated_amount), 0) AS total
      FROM app_gastos.fixed_expenses fe
      WHERE fe.is_active = TRUE
    ),
    loan_monthly AS (
      SELECT
        DATE_TRUNC('month', lp.payment_date) AS month_start,
        COALESCE(SUM(lp.amount), 0) AS total
      FROM app_gastos.loan_payments lp
      INNER JOIN app_gastos.loans l ON l.id = lp.loan_id
      WHERE lp.is_paid = FALSE
        AND l.is_active = TRUE
        AND lp.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND lp.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '6 month'
      GROUP BY DATE_TRUNC('month', lp.payment_date)
    )
    SELECT
      TO_CHAR(months.month_start, 'YYYY-MM') AS month,
      ROUND(COALESCE(sm.total, 0)::numeric, 2) AS subscriptions,
      ROUND(COALESCE(fm.total, 0)::numeric, 2) AS fixed_expenses,
      ROUND(COALESCE(lm.total, 0)::numeric, 2) AS loan_payments
    FROM months
    CROSS JOIN subscription_monthly sm
    CROSS JOIN fixed_monthly fm
    LEFT JOIN loan_monthly lm ON lm.month_start = months.month_start
    ORDER BY months.month_start
    `,
  );

  return result.rows.map((row) => {
    const subscriptions = Number(row.subscriptions);
    const fixedExpenses = Number(row.fixed_expenses);
    const loanPayments = Number(row.loan_payments);

    return {
      month: row.month,
      subscriptions,
      fixedExpenses,
      loanPayments,
      total: Number((subscriptions + fixedExpenses + loanPayments).toFixed(2)),
    };
  });
}

async function handleDashboardRoute(method, path) {
  const { resource } = parsePathParameters(path);

  if (method === 'GET' && resource === 'dashboardSummary') {
    const data = await getDashboardSummary();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'GET' && resource === 'dashboardExpensesByCategory') {
    const data = await getDashboardExpensesByCategory();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'GET' && resource === 'dashboardCashFlow') {
    const data = await getDashboardCashFlow();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'GET' && resource === 'dashboardBalanceEvolution') {
    const data = await getDashboardBalanceEvolution();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'GET' && resource === 'dashboardFutureExpenses') {
    const data = await getDashboardFutureExpenses();
    return jsonResponse(200, { success: true, data });
  }

  return null;
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

async function handleStatementsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const instrumentIdRaw = getQueryParam(event, 'instrument_id');
    const instrumentId = instrumentIdRaw ? parseInteger(instrumentIdRaw) : null;

    if (instrumentIdRaw && !instrumentId) {
      return jsonResponse(400, { success: false, error: 'instrument_id invalido.' });
    }

    const data = await listStatements(instrumentId);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateStatementPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createStatement(validated.value);
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

    const validated = validateStatementUpdatePayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateStatement(id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Estado de cuenta no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await deleteStatement(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Estado de cuenta no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleStatementMovementsRoute(method, path) {
  const { id } = parsePathParameters(path);

  if (method !== 'GET' || id === null) {
    return null;
  }

  const movements = await listStatementMovements(id);
  if (movements.notFound) {
    return jsonResponse(404, { success: false, error: 'Estado de cuenta no encontrado.' });
  }

  return jsonResponse(200, { success: true, data: movements.data });
}

async function handleTransfersRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const instrumentIdRaw = getQueryParam(event, 'instrument_id');
    const instrumentId = instrumentIdRaw ? parseInteger(instrumentIdRaw) : null;

    if (instrumentIdRaw && !instrumentId) {
      return jsonResponse(400, { success: false, error: 'instrument_id invalido.' });
    }

    const data = await listTransfers(instrumentId);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateTransferPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createTransfer(validated.value);
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

    const validated = validateTransferPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateTransfer(id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Transferencia no encontrada.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await deleteTransfer(id);
    if (!deleted.deleted) {
      return jsonResponse(404, { success: false, error: 'Transferencia no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleSubscriptionsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const data = await listSubscriptions();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateSubscriptionPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createSubscription(validated.value);
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

    const validated = validateSubscriptionPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateSubscription(id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Suscripcion no encontrada.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await softDeleteSubscription(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Suscripcion no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleFixedExpensesRoute(method, path, event) {
  const parsed = parsePathParameters(path);

  if (method === 'GET' && parsed.resource === 'fixedExpenses' && parsed.id === null) {
    const data = await listFixedExpenses();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && parsed.resource === 'fixedExpenses' && parsed.id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateFixedExpensePayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createFixedExpense(validated.value);
    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'PUT' && parsed.resource === 'fixedExpenses' && parsed.id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateFixedExpensePayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateFixedExpense(parsed.id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Gasto fijo no encontrado.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && parsed.resource === 'fixedExpenses' && parsed.id !== null) {
    const deleted = await softDeleteFixedExpense(parsed.id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Gasto fijo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id: parsed.id } });
  }

  if (method === 'GET' && parsed.resource === 'fixedExpensePayments' && parsed.id !== null) {
    const payments = await listFixedExpensePayments(parsed.id);
    if (payments.notFound) {
      return jsonResponse(404, { success: false, error: 'Gasto fijo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: payments.data });
  }

  if (method === 'POST' && parsed.resource === 'fixedExpensePayments' && parsed.id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateFixedExpensePaymentPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createFixedExpensePayment(parsed.id, validated.value);
    if (created.notFound) {
      return jsonResponse(404, { success: false, error: 'Gasto fijo no encontrado.' });
    }

    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'PUT' && parsed.resource === 'fixedExpensePayment' && parsed.id !== null) {
    if (!parsed.paymentId || parsed.paymentId < 1) {
      return jsonResponse(400, { success: false, error: 'paymentId invalido.' });
    }

    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateFixedExpensePaymentPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateFixedExpensePayment(parsed.id, parsed.paymentId, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Pago de gasto fijo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && parsed.resource === 'fixedExpensePayment' && parsed.id !== null) {
    if (!parsed.paymentId || parsed.paymentId < 1) {
      return jsonResponse(400, { success: false, error: 'paymentId invalido.' });
    }

    const deleted = await deleteFixedExpensePayment(parsed.id, parsed.paymentId);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Pago de gasto fijo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id: parsed.paymentId } });
  }

  return null;
}

async function handleLoansRoute(method, path, event) {
  const parsed = parsePathParameters(path);

  if (method === 'GET' && parsed.resource === 'loans' && parsed.id === null) {
    const data = await listLoans();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && parsed.resource === 'loans' && parsed.id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateLoanPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createLoan(validated.value);
    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'PUT' && parsed.resource === 'loans' && parsed.id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateLoanPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateLoan(parsed.id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Prestamo no encontrado.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && parsed.resource === 'loans' && parsed.id !== null) {
    const deleted = await softDeleteLoan(parsed.id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Prestamo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id: parsed.id } });
  }

  if (method === 'GET' && parsed.resource === 'loanPayments' && parsed.id !== null) {
    const payments = await listLoanPayments(parsed.id);
    if (payments.notFound) {
      return jsonResponse(404, { success: false, error: 'Prestamo no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: payments.data });
  }

  if (method === 'POST' && parsed.resource === 'loanPaymentAction' && parsed.id !== null) {
    if (!parsed.installmentNum || parsed.installmentNum < 1) {
      return jsonResponse(400, { success: false, error: 'installmentNum invalido.' });
    }

    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateLoanPaymentRegisterPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const paid = await payLoanInstallment(parsed.id, parsed.installmentNum, validated.value);

    if (paid.notFound) {
      return jsonResponse(404, { success: false, error: 'Prestamo no encontrado.' });
    }

    if (paid.error) {
      return jsonResponse(400, { success: false, error: paid.error });
    }

    return jsonResponse(200, { success: true, data: paid.data });
  }

  return null;
}

async function handleBudgetsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const queryParams = event.queryStringParameters ?? {};
    const month = queryParams.month === undefined ? null : normalizeNullableInteger(queryParams.month);
    const year = queryParams.year === undefined ? null : normalizeNullableInteger(queryParams.year);

    if (queryParams.month !== undefined && month === null) {
      return jsonResponse(400, { success: false, error: 'month invalido.' });
    }

    if (queryParams.year !== undefined && year === null) {
      return jsonResponse(400, { success: false, error: 'year invalido.' });
    }

    if (month !== null && (month < 1 || month > 12)) {
      return jsonResponse(400, { success: false, error: 'month invalido.' });
    }

    if (year !== null && (year < 2000 || year > 2200)) {
      return jsonResponse(400, { success: false, error: 'year invalido.' });
    }

    const data = await listBudgets(month, year);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateBudgetPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createBudget(validated.value);
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

    const validated = validateBudgetPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateBudget(id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Presupuesto no encontrado.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await deleteBudget(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Presupuesto no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleSimulationsRoute(method, path, event) {
  const { id } = parsePathParameters(path);

  if (method === 'GET' && id === null) {
    const data = await listSimulations();
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateSimulationPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createSimulation(validated.value);
    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'DELETE' && id !== null) {
    const deleted = await deleteSimulation(id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Simulacion no encontrada.' });
    }

    return jsonResponse(200, { success: true, data: { id } });
  }

  return null;
}

async function handleRemindersRoute(method, path, event) {
  const parsed = parsePathParameters(path);

  if (method === 'GET' && parsed.resource === 'reminders' && parsed.id === null) {
    const data = await listReminders(false);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'GET' && parsed.resource === 'remindersPending') {
    const data = await listReminders(true);
    return jsonResponse(200, { success: true, data });
  }

  if (method === 'POST' && parsed.resource === 'reminders' && parsed.id === null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateReminderPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const created = await createReminder(validated.value);
    if (created.error) {
      return jsonResponse(400, { success: false, error: created.error });
    }

    return jsonResponse(201, { success: true, data: created.data });
  }

  if (method === 'PUT' && parsed.resource === 'reminders' && parsed.id !== null) {
    const bodyResult = parseJsonBody(event);
    if (!bodyResult.ok) {
      return jsonResponse(400, { success: false, error: bodyResult.error });
    }

    const validated = validateReminderPayload(bodyResult.value);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const updated = await updateReminder(parsed.id, validated.value);
    if (updated.notFound) {
      return jsonResponse(404, { success: false, error: 'Recordatorio no encontrado.' });
    }

    if (updated.error) {
      return jsonResponse(400, { success: false, error: updated.error });
    }

    return jsonResponse(200, { success: true, data: updated.data });
  }

  if (method === 'DELETE' && parsed.resource === 'reminders' && parsed.id !== null) {
    const deleted = await deleteReminder(parsed.id);
    if (!deleted) {
      return jsonResponse(404, { success: false, error: 'Recordatorio no encontrado.' });
    }

    return jsonResponse(200, { success: true, data: { id: parsed.id } });
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
    if (
      resource === 'dashboardSummary'
      || resource === 'dashboardExpensesByCategory'
      || resource === 'dashboardCashFlow'
      || resource === 'dashboardBalanceEvolution'
      || resource === 'dashboardFutureExpenses'
    ) {
      const response = await handleDashboardRoute(method, path);
      if (response) {
        return response;
      }
    }

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

    if (resource === 'statements') {
      const response = await handleStatementsRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'statementMovements') {
      const response = await handleStatementMovementsRoute(method, path);
      if (response) {
        return response;
      }
    }

    if (resource === 'transfers') {
      const response = await handleTransfersRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'subscriptions') {
      const response = await handleSubscriptionsRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'fixedExpenses' || resource === 'fixedExpensePayments' || resource === 'fixedExpensePayment') {
      const response = await handleFixedExpensesRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'loans' || resource === 'loanPayments' || resource === 'loanPaymentAction') {
      const response = await handleLoansRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'budgets') {
      const response = await handleBudgetsRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'simulations') {
      const response = await handleSimulationsRoute(method, path, event);
      if (response) {
        return response;
      }
    }

    if (resource === 'reminders' || resource === 'remindersPending') {
      const response = await handleRemindersRoute(method, path, event);
      if (response) {
        return response;
      }
    }
  } catch (error) {
    logUnhandledError(event, method, path, error);

    if (error?.code === '23505') {
      return jsonResponse(409, {
        success: false,
        error: 'Ya existe un registro con esos datos.',
      });
    }

    return jsonResponse(500, {
      success: false,
      error: 'Error interno al procesar la solicitud.',
      requestId: getRequestId(event),
    });
  }

  return jsonResponse(404, {
    success: false,
    error: 'Ruta no encontrada.',
  });
}
