import Database from 'better-sqlite3'

let database: Database.Database | null = null
let databasePath = ''

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE CHECK (length(code) = 3),
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    short_name TEXT CHECK (short_name IS NULL OR length(short_name) <= 20),
    color TEXT,
    icon_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS financial_instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_id INTEGER NOT NULL REFERENCES banks(id),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'account')),
    last_four TEXT CHECK (last_four IS NULL OR last_four GLOB '[0-9][0-9][0-9][0-9]'),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    credit_limit_cents INTEGER,
    current_balance_cents INTEGER DEFAULT 0,
    available_credit_cents INTEGER,
    cut_off_day INTEGER CHECK (cut_off_day IS NULL OR cut_off_day BETWEEN 1 AND 31),
    payment_due_day INTEGER CHECK (payment_due_day IS NULL OR payment_due_day BETWEEN 1 AND 31),
    annual_rate REAL,
    current_amount_cents INTEGER DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    icon_name TEXT,
    color TEXT,
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
    is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    icon_name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(category_id, name)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL REFERENCES financial_instruments(id),
    category_id INTEGER REFERENCES categories(id),
    subcategory_id INTEGER REFERENCES subcategories(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    description TEXT CHECK (description IS NULL OR length(description) <= 255),
    transaction_date TEXT NOT NULL,
    notes TEXT,
    is_msi INTEGER NOT NULL DEFAULT 0 CHECK (is_msi IN (0, 1)),
    msi_months INTEGER,
    msi_monthly_amount_cents INTEGER,
    msi_start_date TEXT,
    msi_remaining INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credit_card_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_id INTEGER NOT NULL REFERENCES financial_instruments(id),
    cut_off_date TEXT NOT NULL,
    payment_due_date TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL DEFAULT 0,
    minimum_payment_cents INTEGER,
    no_interest_payment_cents INTEGER,
    is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
    paid_amount_cents INTEGER,
    paid_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(instrument_id, cut_off_date)
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
    lender TEXT,
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents > 0),
    remaining_amount_cents INTEGER NOT NULL CHECK (remaining_amount_cents >= 0),
    annual_rate REAL,
    total_installments INTEGER NOT NULL CHECK (total_installments > 0),
    paid_installments INTEGER NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('fixed', 'variable')),
    fixed_payment_cents INTEGER,
    payment_day INTEGER CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31),
    start_date TEXT NOT NULL,
    end_date TEXT,
    instrument_id INTEGER REFERENCES financial_instruments(id),
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS loan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_num INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    principal_cents INTEGER,
    interest_cents INTEGER,
    payment_date TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
    paid_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(loan_id, installment_num)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_instrument_id INTEGER NOT NULL REFERENCES financial_instruments(id),
    destination_instrument_id INTEGER NOT NULL REFERENCES financial_instruments(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    transfer_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('card_payment', 'inter_account', 'loan_payment', 'other')),
    statement_id INTEGER REFERENCES credit_card_statements(id),
    loan_id INTEGER REFERENCES loans(id),
    description TEXT CHECK (description IS NULL OR length(description) <= 255),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (source_instrument_id <> destination_instrument_id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
    instrument_id INTEGER NOT NULL REFERENCES financial_instruments(id),
    category_id INTEGER REFERENCES categories(id),
    subcategory_id INTEGER REFERENCES subcategories(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'weekly')),
    billing_day INTEGER CHECK (billing_day IS NULL OR billing_day BETWEEN 1 AND 31),
    next_billing TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
    instrument_id INTEGER REFERENCES financial_instruments(id),
    category_id INTEGER REFERENCES categories(id),
    subcategory_id INTEGER REFERENCES subcategories(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    estimated_amount_cents INTEGER NOT NULL CHECK (estimated_amount_cents > 0),
    is_variable INTEGER NOT NULL DEFAULT 0 CHECK (is_variable IN (0, 1)),
    payment_day INTEGER CHECK (payment_day IS NULL OR payment_day BETWEEN 1 AND 31),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS fixed_expense_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixed_expense_id INTEGER NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2200),
    payment_date TEXT,
    is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(fixed_expense_id, period_month, period_year)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    currency_id INTEGER NOT NULL REFERENCES currencies(id),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique_category
    ON budgets(category_id, month, year) WHERE category_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique_global
    ON budgets(month, year) WHERE category_id IS NULL;

  CREATE TABLE IF NOT EXISTS simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 150),
    description TEXT,
    simulation_date TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    is_favorable INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    description TEXT,
    reminder_date TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('payment', 'cutoff', 'subscription', 'loan', 'custom')),
    reference_id INTEGER,
    reference_type TEXT,
    is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
    is_dismissed INTEGER NOT NULL DEFAULT 0 CHECK (is_dismissed IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_instruments_bank ON financial_instruments(bank_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_instrument_date ON transactions(instrument_id, transaction_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, transaction_date);
  CREATE INDEX IF NOT EXISTS idx_transfers_instruments_date ON transfers(source_instrument_id, destination_instrument_id, transfer_date);
  CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id, installment_num);
  CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders(is_dismissed, is_read, reminder_date);
`

export function initializeLocalDb(dbPath: string): void {
  databasePath = dbPath
  database = new Database(dbPath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.pragma('busy_timeout = 5000')
  database.pragma('synchronous = NORMAL')
  database.exec(SCHEMA)

  database.prepare(`
    INSERT INTO currencies (id, code, name, symbol, is_default)
    VALUES (1, 'MXN', 'Peso Mexicano', '$', 1)
    ON CONFLICT(id) DO NOTHING
  `).run()

  database.prepare(`
    INSERT INTO app_metadata (key, value)
    VALUES ('schema_version', '1')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run()
}

export function getDatabase(): Database.Database {
  if (!database) {
    throw new Error('La base de datos local no esta inicializada.')
  }

  return database
}

export function getDatabasePath(): string {
  return databasePath
}

export function closeLocalDb(): void {
  database?.close()
  database = null
}
