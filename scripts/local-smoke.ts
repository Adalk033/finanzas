import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  backupLocalDb,
  closeLocalDb,
  getDatabase,
  initializeLocalDb,
  restoreLocalDb,
} from '../electron/local-db.js'
import {
  exportTransactionsCsv,
  handleLocalRequest,
  importTransactionsCsv,
} from '../electron/local-service.js'

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-lit-'))
const databasePath = path.join(tempDirectory, 'smoke.sqlite')

function verifyDeprecatedBankColumnsMigration(): void {
  const legacyPath = path.join(tempDirectory, 'legacy.sqlite')
  const legacyDb = new Database(legacyPath)
  legacyDb.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE banks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      color TEXT,
      icon_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO banks (name, short_name, color, icon_name)
    VALUES ('Banco legado', 'Legado', '#123456', 'Landmark');
    CREATE TABLE financial_instruments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_id INTEGER NOT NULL REFERENCES banks(id),
      name TEXT NOT NULL
    );
    INSERT INTO financial_instruments (bank_id, name)
    VALUES (1, 'Cuenta legada');
  `)
  legacyDb.close()

  initializeLocalDb(legacyPath)
  const columns = new Set(
    (getDatabase().prepare('PRAGMA table_info(banks)')
      .all() as Array<{ name: string }>).map((column) => column.name),
  )
  const migratedBank = request<Array<{ name: string; shortName: string }>>('/banks')[0]
  const migratedInstrument = getDatabase()
    .prepare('SELECT bank_id FROM financial_instruments WHERE name = ?')
    .get('Cuenta legada') as { bank_id: number }
  const foreignKeyErrors = getDatabase().prepare('PRAGMA foreign_key_check').all()
  assert.equal(columns.has('color'), false)
  assert.equal(columns.has('icon_name'), false)
  assert.equal(migratedBank?.name, 'Banco legado')
  assert.equal(migratedBank?.shortName, 'Legado')
  assert.equal(migratedInstrument.bank_id, 1)
  assert.deepEqual(foreignKeyErrors, [])
  closeLocalDb()
}

function verifyFixedExpensePaymentsMigration(): void {
  const legacyPath = path.join(tempDirectory, 'legacy-fixed-expense-payments.sqlite')
  const legacyDb = new Database(legacyPath)
  legacyDb.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE currencies (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE CHECK (length(code) = 3),
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO currencies (id, code, name, symbol, is_default)
    VALUES (1, 'MXN', 'Peso Mexicano', '$', 1);
    CREATE TABLE fixed_expenses (
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
    CREATE TABLE fixed_expense_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixed_expense_id INTEGER NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
      period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2200),
      payment_date TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
      notes TEXT,
      transaction_id INTEGER REFERENCES transactions(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fixed_expense_id, period_month, period_year)
    );
    INSERT INTO fixed_expenses (
      id, name, currency_id, estimated_amount_cents
    ) VALUES (1, 'Renta legada', 1, 500000);
    INSERT INTO fixed_expense_payments (
      fixed_expense_id, amount_cents, period_month, period_year, is_paid
    ) VALUES (1, 250000, 8, 2026, 1);
  `)
  legacyDb.close()

  initializeLocalDb(legacyPath)
  getDatabase().prepare(`
    INSERT INTO fixed_expense_payments (
      fixed_expense_id, amount_cents, period_month, period_year, is_paid
    ) VALUES (?, ?, ?, ?, ?)
  `).run(1, 250000, 8, 2026, 1)
  const paymentCount = getDatabase().prepare(`
    SELECT COUNT(*) AS total FROM fixed_expense_payments
    WHERE fixed_expense_id = 1 AND period_month = 8 AND period_year = 2026
  `).get() as { total: number }
  assert.equal(paymentCount.total, 2)
  assert.deepEqual(getDatabase().prepare('PRAGMA foreign_key_check').all(), [])
  closeLocalDb()
}

function request<T>(pathValue: string, method = 'GET', body?: Record<string, unknown>): T {
  const response = handleLocalRequest({
    path: pathValue,
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  assert.equal(response.success, true, `${method} ${pathValue}: ${response.error ?? ''}`)
  return response.data as T
}

function requestFailure(
  pathValue: string,
  method: string,
  body: Record<string, unknown>,
): string {
  const response = handleLocalRequest({
    path: pathValue,
    method,
    body: JSON.stringify(body),
  })
  assert.equal(response.success, false)
  return response.error ?? ''
}

try {
  verifyDeprecatedBankColumnsMigration()
  verifyFixedExpensePaymentsMigration()
  initializeLocalDb(databasePath)

  const defaultDashboardPreferences = request<{ expensePeriod: string }>('/dashboard/preferences')
  assert.equal(defaultDashboardPreferences.expensePeriod, 'current_month')
  const savedDashboardPreferences = request<{ expensePeriod: string }>('/dashboard/preferences', 'PUT', {
    expensePeriod: 'last_3_months',
  })
  assert.equal(savedDashboardPreferences.expensePeriod, 'last_3_months')
  const restoredDashboardPreferences = request<{ expensePeriod: string }>('/dashboard/preferences')
  assert.equal(restoredDashboardPreferences.expensePeriod, 'last_3_months')
  const invalidDashboardPeriodError = requestFailure('/dashboard/preferences', 'PUT', {
    expensePeriod: 'all_time',
  })
  assert.match(invalidDashboardPeriodError, /expensePeriod no contiene un valor permitido/)

  const bank = request<{ id: number }>('/banks', 'POST', {
    name: 'Banco local',
    shortName: 'Local',
    isActive: true,
  })
  const debit = request<{ id: number; currentAmount: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Cuenta principal',
    type: 'account',
    lastFour: '1234',
    currencyId: 1,
    currentAmount: 10000,
    isActive: true,
  })
  const credit = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Tarjeta',
    type: 'credit_card',
    lastFour: '5678',
    currencyId: 1,
    creditLimit: 20000,
    currentBalance: 0,
    cutOffDay: 15,
    paymentDueDay: 5,
    annualRate: 40,
    isActive: true,
  })
  const openingCredit = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Tarjeta con saldo inicial',
    type: 'credit_card',
    currencyId: 1,
    creditLimit: 5000,
    currentBalance: 500,
    cutOffDay: 15,
    paymentDueDay: 5,
    isActive: true,
  })
  const category = request<{ id: number }>('/categories', 'POST', {
    name: 'Alimentos',
    type: 'expense',
    color: '#22AA66',
    iconName: 'Utensils',
    isActive: true,
  })
  const openingTransactions = request<Array<{
    id: number
    instrumentId: number
    sourceType: string | null
  }>>('/transactions')
  const debitOpening = openingTransactions.find(
    (item) => item.instrumentId === debit.id && item.sourceType === 'opening_balance',
  )
  assert.ok(debitOpening)
  const openingDeleteError = requestFailure(
    `/transactions/${debitOpening.id}`,
    'DELETE',
    {},
  )
  assert.match(openingDeleteError, /asiento protegido/)
  const zeroOpeningStatement = request<{ totalAmount: number }>('/statements', 'POST', {
    instrumentId: openingCredit.id,
    cutOffDate: '2026-07-31',
  })
  assert.equal(zeroOpeningStatement.totalAmount, 0)
  request(`/instruments/${openingCredit.id}`, 'DELETE')

  request('/transactions', 'POST', {
    instrumentId: debit.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 125.45,
    description: 'Despensa',
    transactionDate: '2026-07-18',
    isMsi: false,
  })
  request('/transactions', 'POST', {
    instrumentId: credit.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 1200,
    description: 'Compra MSI',
    transactionDate: '2026-07-18',
    isMsi: true,
    msiMonths: 6,
  })

  const balancesBeforeFamilyExpenses = request<Array<{
    id: number
    currentAmount: number | null
    currentBalance: number | null
  }>>('/instruments')
  const familyExpense = request<{
    id: number
    amount: number
    categoryName: string
    expenseDate: string
  }>('/family-expenses', 'POST', {
    categoryId: category.id,
    amount: 850.25,
    description: 'Despensa familiar',
    expenseDate: '2026-07-20',
    notes: 'Compra semanal',
  })
  assert.equal(familyExpense.amount, 850.25)
  assert.equal(familyExpense.categoryName, 'Alimentos')
  const familyExpensesForJuly = request<Array<{ id: number }>>('/family-expenses?month=2026-07')
  assert.deepEqual(familyExpensesForJuly.map((expense) => expense.id), [familyExpense.id])
  assert.equal(request<Array<{ id: number }>>('/family-expenses?month=2026-06').length, 0)
  const familyDashboard = request<{
    month: string
    summary: { total: number; expenseCount: number; averageExpense: number }
    expensesByCategory: Array<{ category: string; total: number }>
  }>('/family/dashboard?month=2026-07')
  assert.equal(familyDashboard.month, '2026-07')
  assert.deepEqual(familyDashboard.summary, {
    total: 850.25,
    expenseCount: 1,
    averageExpense: 850.25,
  })
  assert.deepEqual(familyDashboard.expensesByCategory, [{ category: 'Alimentos', total: 850.25 }])
  const balancesAfterFamilyExpense = request<typeof balancesBeforeFamilyExpenses>('/instruments')
  assert.deepEqual(balancesAfterFamilyExpense, balancesBeforeFamilyExpenses)
  const personalCategoryExpenses = request<Array<{ category: string; total: number }>>(
    '/dashboard/charts/expenses-by-category?period=last_3_months',
  )
  assert.equal(personalCategoryExpenses.find((item) => item.category === 'Alimentos')?.total, 1325.45)
  request(`/family-expenses/${familyExpense.id}`, 'PUT', {
    categoryId: category.id,
    amount: 900,
    description: 'Despensa familiar actualizada',
    expenseDate: '2026-07-20',
  })
  assert.equal(request<{ summary: { total: number } }>('/family/dashboard?month=2026-07').summary.total, 900)
  const incomeOnlyCategory = request<{ id: number }>('/categories', 'POST', {
    name: 'Ingreso familiar no permitido',
    type: 'income',
    isActive: true,
  })
  const invalidFamilyCategoryError = requestFailure('/family-expenses', 'POST', {
    categoryId: incomeOnlyCategory.id,
    amount: 100,
    description: 'Categoria incorrecta',
    expenseDate: '2026-07-20',
  })
  assert.match(invalidFamilyCategoryError, /no corresponde a un gasto/)
  const invalidFamilyMonthError = requestFailure('/family/dashboard?month=2026-13', 'GET', {})
  assert.match(invalidFamilyMonthError, /month no es un mes valido/)
  request(`/family-expenses/${familyExpense.id}`, 'DELETE')
  assert.equal(request<Array<{ id: number }>>('/family-expenses?month=2026-07').length, 0)

  request('/transactions', 'POST', {
    instrumentId: credit.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 100,
    description: 'Compra antes del corte',
    transactionDate: '2026-07-10',
    isMsi: false,
  })
  const automaticStatements = request<Array<{
    id: number
    cutOffDate: string
    totalAmount: number
    outstandingAmount: number
  }>>(`/statements?instrument_id=${credit.id}`)
  const automaticStatement = automaticStatements.find((item) => item.cutOffDate === '2026-07-15')
  assert.ok(automaticStatement)
  assert.equal(automaticStatement.totalAmount, 100)
  assert.equal(automaticStatement.outstandingAmount, 100)

  const statement = request<{ id: number; totalAmount: number }>('/statements', 'POST', {
    instrumentId: credit.id,
    cutOffDate: '2026-08-31',
  })
  assert.equal(statement.totalAmount, 200)
  const statementMovements = request<Array<{ description: string }>>(
    `/statements/${statement.id}/movements`,
  )
  assert.equal(statementMovements.length, 1)

  let instruments = request<Array<{ id: number; currentAmount: number | null; currentBalance: number | null }>>('/instruments')
  assert.equal(instruments.find((item) => item.id === debit.id)?.currentAmount, 9874.55)
  assert.equal(instruments.find((item) => item.id === credit.id)?.currentBalance, 1300)

  const overpaymentError = requestFailure('/transfers', 'POST', {
    sourceInstrumentId: debit.id,
    destinationInstrumentId: credit.id,
    amount: 1300.01,
    currencyId: 1,
    transferDate: '2026-07-18',
    type: 'card_payment',
  })
  assert.match(overpaymentError, /no puede superar el saldo actual/)

  const cardPayment = request<{ statementId: number | null }>('/transfers', 'POST', {
    sourceInstrumentId: debit.id,
    destinationInstrumentId: credit.id,
    amount: 100,
    currencyId: 1,
    transferDate: '2026-07-18',
    type: 'card_payment',
  })
  assert.equal(cardPayment.statementId, automaticStatement.id)
  instruments = request('/instruments')
  assert.equal(instruments.find((item) => item.id === debit.id)?.currentAmount, 9774.55)
  assert.equal(instruments.find((item) => item.id === credit.id)?.currentBalance, 1200)
  const paidStatements = request<Array<{
    id: number
    isPaid: boolean
    outstandingAmount: number
  }>>(`/statements?instrument_id=${credit.id}`)
  const paidAutomaticStatement = paidStatements.find((item) => item.id === automaticStatement.id)
  assert.equal(paidAutomaticStatement?.isPaid, true)
  assert.equal(paidAutomaticStatement?.outstandingAmount, 0)

  const adjustedPurchase = request<{ id: number }>('/transactions', 'POST', {
    instrumentId: credit.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 50,
    description: 'Ajuste del corte',
    transactionDate: '2026-07-12',
    isMsi: false,
  })
  const adjustedStatements = request<Array<{
    id: number
    isPaid: boolean
    outstandingAmount: number
  }>>(`/statements?instrument_id=${credit.id}`)
  const adjustedAutomaticStatement = adjustedStatements.find(
    (item) => item.id === automaticStatement.id,
  )
  assert.equal(adjustedAutomaticStatement?.isPaid, false)
  assert.equal(adjustedAutomaticStatement?.outstandingAmount, 50)
  request(`/transactions/${adjustedPurchase.id}`, 'DELETE')

  const budget = request<{ spentAmount: number }>('/budgets', 'POST', {
    categoryId: category.id,
    currencyId: 1,
    amount: 1000,
    month: 7,
    year: 2026,
  })
  assert.equal(budget.spentAmount, 1425.45)

  request('/subscriptions', 'POST', {
    name: 'Servicio',
    instrumentId: credit.id,
    categoryId: category.id,
    currencyId: 1,
    amount: 199,
    billingCycle: 'monthly',
    billingDay: 10,
    nextBilling: '2027-01-10',
    isActive: true,
  })
  const fixedExpense = request<{ id: number }>('/fixed-expenses', 'POST', {
    name: 'Renta',
    instrumentId: debit.id,
    categoryId: category.id,
    currencyId: 1,
    estimatedAmount: 5000,
    isVariable: false,
    paymentDay: 1,
    isActive: true,
  })
  const fixedPayment = request<{ id: number }>(`/fixed-expenses/${fixedExpense.id}/payments`, 'POST', {
    amount: 5000,
    periodMonth: 7,
    periodYear: 2026,
    paymentDate: '2026-07-01',
    isPaid: true,
  })
  instruments = request('/instruments')
  assert.equal(instruments.find((item) => item.id === debit.id)?.currentAmount, 4774.55)
  request(`/fixed-expenses/${fixedExpense.id}/payments/${fixedPayment.id}`, 'DELETE')
  instruments = request('/instruments')
  assert.equal(instruments.find((item) => item.id === debit.id)?.currentAmount, 9774.55)
  request(`/fixed-expenses/${fixedExpense.id}/payments`, 'POST', {
    amount: 5000,
    periodMonth: 7,
    periodYear: 2026,
    paymentDate: '2026-07-01',
    isPaid: true,
  })
  const currentDate = new Date()
  const nextFixedExpenseDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + (currentDate.getDate() > 1 ? 1 : 0),
    1,
  )
  const paidFixedExpensePeriodMonth = nextFixedExpenseDate.getMonth() + 1
  const paidFixedExpensePeriodYear = nextFixedExpenseDate.getFullYear()
  request(`/fixed-expenses/${fixedExpense.id}/payments`, 'POST', {
    amount: 2500,
    periodMonth: paidFixedExpensePeriodMonth,
    periodYear: paidFixedExpensePeriodYear,
    paymentDate: `${paidFixedExpensePeriodYear}-${String(paidFixedExpensePeriodMonth).padStart(2, '0')}-01`,
    isPaid: true,
  })
  const secondFixedExpensePayment = request<{ id: number }>(`/fixed-expenses/${fixedExpense.id}/payments`, 'POST', {
    amount: 2500,
    periodMonth: paidFixedExpensePeriodMonth,
    periodYear: paidFixedExpensePeriodYear,
    paymentDate: `${paidFixedExpensePeriodYear}-${String(paidFixedExpensePeriodMonth).padStart(2, '0')}-02`,
    isPaid: true,
  })
  assert.ok(secondFixedExpensePayment.id > 0)
  const fixedExpensePaymentHistory = request<Array<{
    fixedExpenseId: number
    fixedExpenseName: string | null
  }>>('/fixed-expense-payments')
  assert.equal(
    fixedExpensePaymentHistory.some((payment) => (
      payment.fixedExpenseId === fixedExpense.id && payment.fixedExpenseName === 'Renta'
    )),
    true,
  )
  const upcomingCommitments = request<{
    total: number
    availableAfterCommitments: number
    items: Array<{ name: string; amount: number }>
  }>('/dashboard/upcoming-commitments')
  assert.equal(upcomingCommitments.items.some((item) => item.name === 'Renta'), false)
  const availableBeforeCommitments = request<{ totalAvailable: number }>('/dashboard/summary').totalAvailable
  assert.equal(
    upcomingCommitments.availableAfterCommitments,
    availableBeforeCommitments - upcomingCommitments.total,
  )
  const reminder = request<{ id: number }>('/reminders', 'POST', {
    title: 'Pagar tarjeta',
    reminderDate: '2026-09-05',
    type: 'payment',
    referenceId: statement.id,
    referenceType: 'statement',
    isRead: false,
    isDismissed: false,
  })
  const pendingReminders = request<Array<{ id: number }>>('/reminders/pending')
  assert.equal(pendingReminders.some((item) => item.id === reminder.id), true)

  const loan = request<{ id: number }>('/loans', 'POST', {
    name: 'Prestamo local',
    currencyId: 1,
    originalAmount: 12000,
    annualRate: 12,
    totalInstallments: 12,
    paymentType: 'variable',
    paymentDay: 20,
    startDate: '2026-07-20',
    instrumentId: debit.id,
    isActive: true,
  })
  const payments = request<Array<{ installmentNum: number }>>(`/loans/${loan.id}/payments`)
  assert.equal(payments.length, 12)
  const automaticLoanReminder = request<Array<{
    referenceId: number | null
    referenceType: string | null
    type: string
    isDismissed: boolean
  }>>('/reminders').find((item) => (
    item.type === 'loan' && item.referenceType === 'loan_payment' && !item.isDismissed
  ))
  assert.ok(automaticLoanReminder)
  const dismissedReminders = request<{ dismissedCount: number }>('/reminders/dismiss-all', 'PUT')
  assert.ok(dismissedReminders.dismissedCount > 0)
  const remindersAfterDismissAll = request<Array<{
    referenceId: number | null
    referenceType: string | null
    isDismissed: boolean
  }>>('/reminders')
  assert.equal(remindersAfterDismissAll.some((item) => (
    item.referenceType === automaticLoanReminder.referenceType
    && item.referenceId === automaticLoanReminder.referenceId
    && !item.isDismissed
  )), false)
  const queuedReminder = request<{ id: number }>('/reminders', 'POST', {
    title: 'Recordatorio pendiente para eliminar',
    reminderDate: '2026-09-10',
    type: 'custom',
    isRead: false,
    isDismissed: false,
  })
  const deletedPendingReminders = request<{ deletedCount: number; dismissedCount: number }>('/reminders/pending', 'DELETE')
  assert.equal(deletedPendingReminders.deletedCount, 1)
  assert.equal(deletedPendingReminders.dismissedCount, 0)
  const remindersAfterPendingDeletion = request<Array<{ id: number }>>('/reminders')
  assert.equal(remindersAfterPendingDeletion.some((item) => item.id === queuedReminder.id), false)
  const dismissedManualReminder = request<{ id: number }>('/reminders', 'POST', {
    title: 'Recordatorio descartado para eliminar',
    reminderDate: '2026-09-11',
    type: 'custom',
    isRead: false,
    isDismissed: true,
  })
  const deletedDismissedReminders = request<{ deletedCount: number }>('/reminders/dismissed', 'DELETE')
  assert.ok(deletedDismissedReminders.deletedCount >= 1)
  const remindersAfterDismissedDeletion = request<Array<{
    id: number
    referenceId: number | null
    isAutomatic: boolean
    isDismissed: boolean
  }>>('/reminders')
  assert.equal(remindersAfterDismissedDeletion.some((item) => item.id === dismissedManualReminder.id), false)
  assert.equal(remindersAfterDismissedDeletion.some((item) => (
    item.referenceId === automaticLoanReminder.referenceId && item.isAutomatic && !item.isDismissed
  )), true)
  request(`/loans/${loan.id}/payments/1/pay`, 'POST', { paidDate: '2026-07-20' })

  const summary = request<{ totalAvailable: number; totalCreditDebt: number }>('/dashboard/summary')
  assert.equal(summary.totalCreditDebt, 1200)
  assert.ok(summary.totalAvailable < 9774.55)
  request('/dashboard/charts/expenses-by-category')
  request('/dashboard/charts/cash-flow')
  request('/dashboard/charts/balance-evolution')
  request('/dashboard/charts/future-expenses')

  const simulation = request<{ isFavorable: boolean | null }>('/simulations', 'POST', {
    name: 'Compra de prueba',
    simulationDate: '2026-07-18',
    scenarioType: 'direct_purchase',
    amount: 500,
    instrumentId: debit.id,
  })
  assert.equal(typeof simulation.isFavorable, 'boolean')

  const info = request<{ schemaVersion: string }>('/database/info')
  assert.equal(info.schemaVersion, '7')

  const cardBeforeHistorical = request<Array<{
    id: number
    currentBalance: number
  }>>('/instruments').find((item) => item.id === credit.id)
  const historical = request<{ id: number; sourceType: string | null }>('/transactions', 'POST', {
    instrumentId: credit.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 75,
    description: 'Historico ya incluido',
    transactionDate: '2026-06-10',
    isMsi: false,
    affectsBalance: false,
    sourceType: 'opening_balance',
  })
  assert.equal(historical.sourceType, null)
  const cardAfterHistorical = request<Array<{
    id: number
    currentBalance: number
  }>>('/instruments').find((item) => item.id === credit.id)
  assert.equal(cardAfterHistorical?.currentBalance, cardBeforeHistorical?.currentBalance)
  request(`/transactions/${historical.id}`, 'DELETE')

  const reconciliationAccount = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Cuenta para conciliacion',
    type: 'account',
    currencyId: 1,
    currentAmount: 100,
    isActive: true,
  })
  const reconciliationExpense = request<{ id: number }>('/transactions', 'POST', {
    instrumentId: reconciliationAccount.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 10,
    transactionDate: '2026-07-18',
    isMsi: false,
    affectsBalance: true,
  })
  request(`/instruments/${reconciliationAccount.id}/reconcile`, 'POST', {
    actualBalance: 95,
    reconciliationDate: '2026-07-18',
    notes: 'Prueba',
  })
  let reconciled = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === reconciliationAccount.id)
  assert.equal(reconciled?.currentAmount, 95)
  request(`/instruments/${reconciliationAccount.id}`, 'PUT', {
    bankId: bank.id,
    name: 'Cuenta para conciliacion',
    type: 'account',
    currencyId: 1,
    currentAmount: 95,
    notes: 'Saldo corregido mediante conciliacion',
    isActive: true,
  })
  request(`/instruments/${reconciliationAccount.id}`, 'DELETE')
  request(`/transactions/${reconciliationExpense.id}`, 'DELETE')
  reconciled = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === reconciliationAccount.id)
  assert.equal(reconciled?.currentAmount, 105)

  const availableBeforeLinkedCard = request<{ totalAvailable: number }>('/dashboard/summary').totalAvailable
  request('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Tarjeta vinculada',
    type: 'debit_card',
    currencyId: 1,
    currentAmount: 0,
    linkedAccountId: debit.id,
    isActive: true,
  })
  const availableAfterLinkedCard = request<{ totalAvailable: number }>('/dashboard/summary').totalAvailable
  assert.equal(availableAfterLinkedCard, availableBeforeLinkedCard)

  request('/recurring-incomes', 'POST', {
    name: 'Nomina automatica',
    instrumentId: debit.id,
    currencyId: 1,
    amount: 250,
    frequency: 'monthly',
    paymentDay: 18,
    nextPayment: '2026-07-18',
    isActive: true,
  })
  const recurringTransactions = request<Array<{ description: string | null }>>('/transactions')
  assert.equal(
    recurringTransactions.some((item) => item.description === 'Ingreso automatico: Nomina automatica'),
    true,
  )
  const biweeklyIncome = request<{ paymentDay: number | null; secondPaymentDay: number | null }>('/recurring-incomes', 'POST', {
    name: 'Ingreso quincenal',
    instrumentId: debit.id,
    currencyId: 1,
    amount: 250,
    frequency: 'biweekly',
    paymentDay: 15,
    secondPaymentDay: 30,
    nextPayment: '2099-08-15',
    isActive: true,
  })
  assert.equal(biweeklyIncome.paymentDay, 15)
  assert.equal(biweeklyIncome.secondPaymentDay, 30)

  const goal = request<{ id: number; progressPercent: number }>('/savings-goals', 'POST', {
    name: 'Fondo de emergencia',
    targetAmount: 30000,
    currentAmount: 7500,
    instrumentId: debit.id,
    isActive: true,
  })
  assert.equal(goal.progressPercent, 25)

  const splitCard = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Tarjeta pagos divididos',
    type: 'credit_card',
    currencyId: 1,
    creditLimit: 5000,
    currentBalance: 0,
    cutOffDay: 10,
    paymentDueDay: 20,
    isActive: true,
  })
  request('/transactions', 'POST', {
    instrumentId: splitCard.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 100,
    transactionDate: '2026-01-05',
    isMsi: false,
    affectsBalance: true,
  })
  request('/transactions', 'POST', {
    instrumentId: splitCard.id,
    categoryId: category.id,
    currencyId: 1,
    type: 'expense',
    amount: 150,
    transactionDate: '2026-02-05',
    isMsi: false,
    affectsBalance: true,
  })
  let splitStatements = request<Array<{
    id: number
    cutOffDate: string
    isPaid: boolean
    outstandingAmount: number
  }>>(`/statements?instrument_id=${splitCard.id}`)
  const splitPayment = request<{ id: number }>('/transfers', 'POST', {
    sourceInstrumentId: debit.id,
    destinationInstrumentId: splitCard.id,
    amount: 200,
    currencyId: 1,
    transferDate: '2026-03-01',
    type: 'card_payment',
  })
  splitStatements = request(`/statements?instrument_id=${splitCard.id}`)
  assert.equal(splitStatements.find((item) => item.cutOffDate === '2026-01-10')?.isPaid, true)
  assert.equal(splitStatements.find((item) => item.cutOffDate === '2026-02-10')?.outstandingAmount, 50)

  const lowBalanceSource = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Cuenta sin saldo suficiente',
    type: 'account',
    currencyId: 1,
    currentAmount: 10,
    isActive: true,
  })
  const insufficientPaymentError = requestFailure('/transfers', 'POST', {
    sourceInstrumentId: lowBalanceSource.id,
    destinationInstrumentId: splitCard.id,
    amount: 20,
    currencyId: 1,
    transferDate: '2026-03-01',
    type: 'card_payment',
  })
  assert.match(insufficientPaymentError, /saldo suficiente/)
  request(`/instruments/${lowBalanceSource.id}`, 'DELETE')

  const debitCardSource = request<{ id: number }>('/instruments', 'POST', {
    bankId: bank.id,
    name: 'Tarjeta de débito para abonos',
    type: 'debit_card',
    currencyId: 1,
    currentAmount: 0,
    linkedAccountId: debit.id,
    isActive: true,
  })
  const debitBeforeDebitCardPayment = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === debit.id)?.currentAmount
  const debitCardPayment = request<{ id: number }>('/transfers', 'POST', {
    sourceInstrumentId: debitCardSource.id,
    destinationInstrumentId: splitCard.id,
    amount: 25,
    currencyId: 1,
    transferDate: '2026-03-02',
    type: 'card_payment',
  })
  const debitAfterDebitCardPayment = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === debit.id)?.currentAmount
  assert.equal(debitAfterDebitCardPayment, (debitBeforeDebitCardPayment ?? 0) - 25)
  request(`/transfers/${debitCardPayment.id}`, 'DELETE')
  const debitAfterDebitCardPaymentDelete = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === debit.id)?.currentAmount
  assert.equal(debitAfterDebitCardPaymentDelete, debitBeforeDebitCardPayment)
  request(`/instruments/${debitCardSource.id}`, 'DELETE')

  request(`/transfers/${splitPayment.id}`, 'DELETE')
  splitStatements = request(`/statements?instrument_id=${splitCard.id}`)
  assert.equal(splitStatements.find((item) => item.cutOffDate === '2026-01-10')?.outstandingAmount, 100)
  assert.equal(splitStatements.find((item) => item.cutOffDate === '2026-02-10')?.outstandingAmount, 150)

  const adjustableLoan = request<{ id: number }>('/loans', 'POST', {
    name: 'Prestamo con abono extra',
    currencyId: 1,
    originalAmount: 1000,
    annualRate: 12,
    totalInstallments: 10,
    paymentType: 'variable',
    paymentDay: 18,
    startDate: '2026-07-18',
    instrumentId: debit.id,
    isActive: true,
  })
  const adjustablePaid = request<{ loan: { remainingAmount: number } }>(
    `/loans/${adjustableLoan.id}/payments/1/pay`,
    'POST',
    { paidDate: '2026-07-18', amount: 160 },
  )
  assert.equal(adjustablePaid.loan.remainingAmount, 850)
  const adjustableUndone = request<{ loan: { remainingAmount: number } }>(
    `/loans/${adjustableLoan.id}/payments/1/unpay`,
    'POST',
    {},
  )
  assert.equal(adjustableUndone.loan.remainingAmount, 1000)

  const payrollLoan = request<{ id: number }>('/loans', 'POST', {
    name: 'Prestamo descontado de nomina',
    currencyId: 1,
    originalAmount: 400,
    annualRate: 12,
    totalInstallments: 4,
    paymentType: 'fixed',
    fixedPayment: 110,
    paymentFrequency: 'weekly',
    startDate: '2099-01-01',
    instrumentId: debit.id,
    affectsInstrumentBalance: false,
    isActive: true,
  })
  const payrollSchedule = request<Array<{ paymentDate: string }>>(`/loans/${payrollLoan.id}/payments`)
  assert.equal(payrollSchedule[0]?.paymentDate, '2099-01-01')
  assert.equal(payrollSchedule[1]?.paymentDate, '2099-01-08')

  const scheduledBiweeklyLoan = request<{ id: number; paymentDay: number | null; secondPaymentDay: number | null }>('/loans', 'POST', {
    name: 'Prestamo quincenal con dias fijos',
    currencyId: 1,
    originalAmount: 600,
    annualRate: 12,
    totalInstallments: 4,
    paymentType: 'fixed',
    fixedPayment: 160,
    paymentFrequency: 'biweekly',
    paymentDay: 14,
    secondPaymentDay: 30,
    startDate: '2028-02-01',
    isActive: true,
  })
  assert.equal(scheduledBiweeklyLoan.paymentDay, 14)
  assert.equal(scheduledBiweeklyLoan.secondPaymentDay, 30)
  const scheduledBiweeklyPayments = request<Array<{ paymentDate: string }>>(`/loans/${scheduledBiweeklyLoan.id}/payments`)
  assert.deepEqual(
    scheduledBiweeklyPayments.map((payment) => payment.paymentDate),
    ['2028-02-14', '2028-02-29', '2028-03-14', '2028-03-30'],
  )
  const invalidBiweeklyLoanError = requestFailure('/loans', 'POST', {
    name: 'Prestamo quincenal invalido',
    currencyId: 1,
    originalAmount: 600,
    totalInstallments: 4,
    paymentType: 'fixed',
    fixedPayment: 160,
    paymentFrequency: 'biweekly',
    paymentDay: 30,
    secondPaymentDay: 14,
    startDate: '2028-02-01',
    isActive: true,
  })
  assert.match(invalidBiweeklyLoanError, /segundo dia de pago quincenal debe ser posterior/)
  const balanceBeforePayrollPayment = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === debit.id)?.currentAmount
  const payrollPayment = request<{
    loan: { remainingAmount: number }
    payment: { affectsInstrumentBalance: boolean }
  }>(`/loans/${payrollLoan.id}/payments/1/pay`, 'POST', { paidDate: '2099-01-01' })
  const balanceAfterPayrollPayment = request<Array<{ id: number; currentAmount: number }>>('/instruments')
    .find((item) => item.id === debit.id)?.currentAmount
  assert.equal(balanceAfterPayrollPayment, balanceBeforePayrollPayment)
  assert.ok(payrollPayment.loan.remainingAmount < 400)
  assert.equal(payrollPayment.payment.affectsInstrumentBalance, false)

  const exportedCsv = exportTransactionsCsv()
  const importedCsv = importTransactionsCsv(exportedCsv)
  assert.equal(importedCsv.imported, 0)
  assert.ok(importedCsv.skipped > 0)

  const backupPath = path.join(tempDirectory, 'backup.sqlite')
  await backupLocalDb(backupPath)
  request('/banks', 'POST', {
    name: 'Banco posterior al respaldo',
    isActive: true,
  })
  restoreLocalDb(backupPath)
  const restoredBanks = request<Array<{ name: string }>>('/banks')
  assert.equal(restoredBanks.some((item) => item.name === 'Banco posterior al respaldo'), false)
} finally {
  closeLocalDb()
  fs.rmSync(tempDirectory, { recursive: true, force: true })
}
