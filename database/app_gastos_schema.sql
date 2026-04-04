-- ============================================
-- app_gastos schema for PostgreSQL 15+
-- Execute this file as a single script
-- ============================================

CREATE SCHEMA IF NOT EXISTS app_gastos;
SET search_path TO app_gastos;

CREATE TABLE IF NOT EXISTS currencies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(5) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies (code, name, symbol, is_default)
VALUES ('MXN', 'Peso Mexicano', '$', TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(20),
  color VARCHAR(7),
  icon_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_instruments (
  id SERIAL PRIMARY KEY,
  bank_id INT NOT NULL REFERENCES banks(id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'account')),
  last_four VARCHAR(4),
  currency_id INT NOT NULL REFERENCES currencies(id),
  credit_limit NUMERIC(12,2),
  current_balance NUMERIC(12,2) DEFAULT 0,
  available_credit NUMERIC(12,2),
  cut_off_day INT CHECK (cut_off_day BETWEEN 1 AND 31),
  payment_due_day INT CHECK (payment_due_day BETWEEN 1 AND 31),
  annual_rate NUMERIC(6,4),
  current_amount NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instruments_bank ON financial_instruments(bank_id);
CREATE INDEX IF NOT EXISTS idx_instruments_type ON financial_instruments(type);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon_name VARCHAR(50),
  color VARCHAR(7),
  type VARCHAR(10) NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  name VARCHAR(100) NOT NULL,
  icon_name VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  instrument_id INT NOT NULL REFERENCES financial_instruments(id),
  category_id INT REFERENCES categories(id),
  subcategory_id INT REFERENCES subcategories(id),
  currency_id INT NOT NULL REFERENCES currencies(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC(12,2) NOT NULL,
  description VARCHAR(255),
  transaction_date DATE NOT NULL,
  notes TEXT,
  is_msi BOOLEAN NOT NULL DEFAULT FALSE,
  msi_months INT,
  msi_monthly_amount NUMERIC(12,2),
  msi_start_date DATE,
  msi_remaining INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_instrument ON transactions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_msi ON transactions(is_msi);

CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  lender VARCHAR(100),
  currency_id INT NOT NULL REFERENCES currencies(id),
  original_amount NUMERIC(12,2) NOT NULL,
  remaining_amount NUMERIC(12,2) NOT NULL,
  annual_rate NUMERIC(6,4),
  total_installments INT NOT NULL,
  paid_installments INT NOT NULL DEFAULT 0,
  payment_type VARCHAR(15) NOT NULL CHECK (payment_type IN ('fixed', 'variable')),
  fixed_payment NUMERIC(12,2),
  payment_day INT CHECK (payment_day BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  instrument_id INT REFERENCES financial_instruments(id),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_payments (
  id SERIAL PRIMARY KEY,
  loan_id INT NOT NULL REFERENCES loans(id),
  installment_num INT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  principal NUMERIC(12,2),
  interest NUMERIC(12,2),
  payment_date DATE NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  instrument_id INT NOT NULL REFERENCES financial_instruments(id),
  category_id INT REFERENCES categories(id),
  subcategory_id INT REFERENCES subcategories(id),
  currency_id INT NOT NULL REFERENCES currencies(id),
  amount NUMERIC(12,2) NOT NULL,
  billing_cycle VARCHAR(10) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'weekly')),
  billing_day INT CHECK (billing_day BETWEEN 1 AND 31),
  next_billing DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_instrument ON subscriptions(instrument_id);

CREATE TABLE IF NOT EXISTS subscription_jobs (
  subscription_id INT PRIMARY KEY REFERENCES subscriptions(id) ON DELETE CASCADE,
  next_run_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_jobs_next_run ON subscription_jobs(next_run_date);

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  instrument_id INT REFERENCES financial_instruments(id),
  category_id INT REFERENCES categories(id),
  subcategory_id INT REFERENCES subcategories(id),
  currency_id INT NOT NULL REFERENCES currencies(id),
  estimated_amount NUMERIC(12,2) NOT NULL,
  is_variable BOOLEAN NOT NULL DEFAULT FALSE,
  payment_day INT CHECK (payment_day BETWEEN 1 AND 31),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fixed_expense_payments (
  id SERIAL PRIMARY KEY,
  fixed_expense_id INT NOT NULL REFERENCES fixed_expenses(id),
  amount NUMERIC(12,2) NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  payment_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(fixed_expense_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES categories(id),
  currency_id INT NOT NULL REFERENCES currencies(id),
  amount NUMERIC(12,2) NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, month, year)
);

CREATE TABLE IF NOT EXISTS simulations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  simulation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_json JSONB NOT NULL,
  result_json JSONB NOT NULL,
  is_favorable BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  reminder_date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('payment', 'cutoff', 'subscription', 'loan', 'custom')),
  reference_id INT,
  reference_type VARCHAR(30),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_unread ON reminders(is_read);

CREATE TABLE IF NOT EXISTS credit_card_statements (
  id SERIAL PRIMARY KEY,
  instrument_id INT NOT NULL REFERENCES financial_instruments(id),
  cut_off_date DATE NOT NULL,
  payment_due_date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  minimum_payment NUMERIC(12,2),
  no_interest_payment NUMERIC(12,2),
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_amount NUMERIC(12,2),
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instrument_id, cut_off_date)
);

CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  source_instrument_id INT NOT NULL REFERENCES financial_instruments(id),
  destination_instrument_id INT NOT NULL REFERENCES financial_instruments(id),
  amount NUMERIC(12,2) NOT NULL,
  currency_id INT NOT NULL REFERENCES currencies(id),
  transfer_date DATE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('card_payment', 'inter_account', 'loan_payment', 'other')),
  statement_id INT REFERENCES credit_card_statements(id),
  loan_id INT REFERENCES loans(id),
  description VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_instrument_id <> destination_instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_source ON transfers(source_instrument_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON transfers(destination_instrument_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON transfers(type);

CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  COALESCE(SUM(CASE WHEN fi.type IN ('account', 'debit_card') THEN fi.current_amount ELSE 0 END), 0) AS total_available,
  COALESCE(SUM(CASE WHEN fi.type = 'credit_card' THEN fi.current_balance ELSE 0 END), 0) AS total_credit_debt,
  COALESCE((SELECT SUM(remaining_amount) FROM loans WHERE is_active = TRUE), 0) AS total_loan_debt,
  COALESCE(SUM(CASE WHEN fi.type = 'credit_card' THEN fi.available_credit ELSE 0 END), 0) AS total_available_credit
FROM financial_instruments fi
WHERE fi.is_active = TRUE;

CREATE OR REPLACE FUNCTION fn_calculate_msi(
  p_total NUMERIC,
  p_months INT
) RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(p_total / p_months, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_can_delete_category(p_category_id INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM transactions WHERE category_id = p_category_id
    UNION ALL
    SELECT 1 FROM subscriptions WHERE category_id = p_category_id
    UNION ALL
    SELECT 1 FROM fixed_expenses WHERE category_id = p_category_id
  ) AND NOT (SELECT is_system FROM categories WHERE id = p_category_id);
END;
$$ LANGUAGE plpgsql;
