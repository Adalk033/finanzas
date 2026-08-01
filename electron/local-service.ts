import type Database from 'better-sqlite3'
import { getDatabase, getDatabasePath } from './local-db.js'
import type { ApiResponse, DatabaseInfo } from '../src/types/config.js'

export type LocalRequestPayload = {
  path: string
  method?: string
  body?: string
}

type DbRow = Record<string, unknown>
type Input = Record<string, unknown>
type InstrumentRow = DbRow & {
  id: number
  type: string
  current_amount_cents: number | null
  current_balance_cents: number | null
  credit_limit_cents: number | null
  currency_id: number
  linked_account_id: number | null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const ICON_NAME = /^[A-Za-z][A-Za-z0-9]*$/
const LAST_FOUR = /^\d{4}$/
const INSTRUMENT_TYPES = new Set(['credit_card', 'debit_card', 'account'])
const CATEGORY_TYPES = new Set(['expense', 'income', 'both'])
const TRANSACTION_TYPES = new Set(['expense', 'income'])
const TRANSFER_TYPES = new Set(['card_payment', 'inter_account', 'other'])
const PAYMENT_TYPES = new Set(['fixed', 'variable'])
const LOAN_PAYMENT_FREQUENCIES = new Set(['weekly', 'biweekly', 'monthly'])
const BILLING_CYCLES = new Set(['monthly', 'yearly', 'weekly'])
const SIMULATION_TYPES = new Set(['direct_purchase', 'msi', 'loan'])
const REMINDER_TYPES = new Set(['payment', 'cutoff', 'subscription', 'loan', 'custom'])
const RECURRING_INCOME_FREQUENCIES = new Set(['weekly', 'biweekly', 'monthly', 'yearly'])
const MSI_MONTHS = new Set([3, 6, 9, 12, 18, 24])
const DASHBOARD_EXPENSE_PERIODS = new Set(['current_month', 'previous_month', 'last_3_months', 'last_year'])
const DASHBOARD_EXPENSE_PERIOD_DEFAULT = 'current_month'

class ValidationError extends Error {}
class NotFoundError extends Error {}

function asRow(value: unknown): DbRow {
  return (value ?? {}) as DbRow
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

function toNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : toNumber(value)
}

function toBoolean(value: unknown): boolean {
  return value === true || value === 1
}

function fromCents(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  return toNumber(value) / 100
}

function requiredString(input: Input, key: string, maxLength: number): string {
  const value = typeof input[key] === 'string' ? input[key].trim() : ''
  if (!value || value.length > maxLength) {
    throw new ValidationError(`${key} debe tener entre 1 y ${maxLength} caracteres.`)
  }
  return value
}

function optionalString(input: Input, key: string, maxLength: number): string | null {
  const raw = input[key]
  if (raw === null || raw === undefined || raw === '') {
    return null
  }
  if (typeof raw !== 'string' || raw.trim().length > maxLength) {
    throw new ValidationError(`${key} no es valido.`)
  }
  return raw.trim() || null
}

function requiredInteger(input: Input, key: string, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const value = input[key]
  if (!Number.isInteger(value) || toNumber(value) < min || toNumber(value) > max) {
    throw new ValidationError(`${key} debe ser un entero entre ${min} y ${max}.`)
  }
  return toNumber(value)
}

function optionalInteger(input: Input, key: string, min = 1, max = Number.MAX_SAFE_INTEGER): number | null {
  const value = input[key]
  if (value === null || value === undefined || value === '') {
    return null
  }
  return requiredInteger(input, key, min, max)
}

function requiredBoolean(input: Input, key: string, defaultValue?: boolean): boolean {
  const value = input[key]
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue
  }
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${key} debe ser booleano.`)
  }
  return value
}

function requiredEnum(input: Input, key: string, allowed: Set<string>): string {
  const value = input[key]
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new ValidationError(`${key} no contiene un valor permitido.`)
  }
  return value
}

function requiredDate(input: Input, key: string): string {
  const value = requiredString(input, key, 10)
  if (!ISO_DATE.test(value)) {
    throw new ValidationError(`${key} debe usar el formato AAAA-MM-DD.`)
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${key} no es una fecha valida.`)
  }
  return value
}

function optionalDate(input: Input, key: string): string | null {
  if (input[key] === null || input[key] === undefined || input[key] === '') {
    return null
  }
  return requiredDate(input, key)
}

function moneyToCents(value: unknown, key: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${key} debe ser un monto valido.`)
  }
  const cents = Math.round((value + Number.EPSILON) * 100)
  if (cents < 0 || (!allowZero && cents === 0) || cents > 99_999_999_999) {
    throw new ValidationError(`${key} esta fuera del rango permitido.`)
  }
  return cents
}

function optionalMoneyToCents(input: Input, key: string, allowZero = true): number | null {
  const value = input[key]
  if (value === null || value === undefined || value === '') {
    return null
  }
  return moneyToCents(value, key, allowZero)
}

function optionalRate(input: Input, key: string): number | null {
  const value = input[key]
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1000) {
    throw new ValidationError(`${key} debe estar entre 0 y 1000.`)
  }
  return Math.round(value * 10_000) / 10_000
}

function parseBody(body?: string): Input {
  if (!body) {
    throw new ValidationError('El cuerpo de la solicitud es obligatorio.')
  }
  try {
    const parsed: unknown = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid')
    }
    return parsed as Input
  } catch {
    throw new ValidationError('El cuerpo de la solicitud no contiene JSON valido.')
  }
}

function requireEntity(db: Database.Database, table: string, id: number): DbRow {
  const allowedTables = new Set([
    'banks', 'financial_instruments', 'categories', 'subcategories', 'transactions',
    'credit_card_statements', 'transfers', 'loans', 'subscriptions', 'fixed_expenses',
    'fixed_expense_payments', 'budgets', 'simulations', 'reminders',
    'recurring_incomes', 'savings_goals',
  ])
  if (!allowedTables.has(table)) {
    throw new Error('Tabla interna no permitida.')
  }
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as DbRow | undefined
  if (!row) {
    throw new NotFoundError('El registro solicitado no existe.')
  }
  return row
}

function mapBank(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    shortName: row.short_name ?? null,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapInstrument(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    bankId: toNumber(row.bank_id),
    bankName: row.bank_name ?? null,
    name: row.name,
    type: row.type,
    lastFour: row.last_four ?? null,
    currencyId: toNumber(row.currency_id),
    creditLimit: fromCents(row.credit_limit_cents),
    currentBalance: fromCents(row.current_balance_cents),
    availableCredit: fromCents(row.available_credit_cents),
    cutOffDay: toNullableNumber(row.cut_off_day),
    paymentDueDay: toNullableNumber(row.payment_due_day),
    annualRate: toNullableNumber(row.annual_rate),
    currentAmount: fromCents(row.linked_current_amount_cents ?? row.current_amount_cents),
    linkedAccountId: toNullableNumber(row.linked_account_id),
    linkedAccountName: row.linked_account_name ?? null,
    notes: row.notes ?? null,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSubcategory(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    categoryId: toNumber(row.category_id),
    categoryName: row.category_name ?? null,
    name: row.name,
    iconName: row.icon_name ?? null,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTransaction(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    instrumentId: toNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    instrumentType: row.instrument_type ?? null,
    categoryId: toNullableNumber(row.category_id),
    categoryName: row.category_name ?? null,
    subcategoryId: toNullableNumber(row.subcategory_id),
    subcategoryName: row.subcategory_name ?? null,
    currencyId: toNumber(row.currency_id),
    type: row.type,
    amount: fromCents(row.amount_cents),
    description: row.description ?? null,
    transactionDate: row.transaction_date,
    notes: row.notes ?? null,
    isMsi: toBoolean(row.is_msi),
    msiMonths: toNullableNumber(row.msi_months),
    msiMonthlyAmount: fromCents(row.msi_monthly_amount_cents),
    msiStartDate: row.msi_start_date ?? null,
    msiRemaining: toNullableNumber(row.msi_remaining),
    affectsBalance: row.affects_balance === undefined ? true : toBoolean(row.affects_balance),
    sourceType: row.source_type ?? null,
    sourceId: toNullableNumber(row.source_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapStatement(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    instrumentId: toNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    cutOffDate: row.cut_off_date,
    paymentDueDate: row.payment_due_date,
    totalAmount: fromCents(row.total_amount_cents),
    minimumPayment: fromCents(row.minimum_payment_cents),
    noInterestPayment: fromCents(row.no_interest_payment_cents),
    isPaid: toBoolean(row.is_paid),
    paidAmount: fromCents(row.paid_amount_cents),
    outstandingAmount: Math.max(
      toNumber(row.total_amount_cents) - toNumber(row.paid_amount_cents),
      0,
    ) / 100,
    paidDate: row.paid_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapTransfer(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    sourceInstrumentId: toNumber(row.source_instrument_id),
    sourceInstrumentName: row.source_instrument_name ?? null,
    sourceInstrumentType: row.source_instrument_type ?? null,
    destinationInstrumentId: toNumber(row.destination_instrument_id),
    destinationInstrumentName: row.destination_instrument_name ?? null,
    destinationInstrumentType: row.destination_instrument_type ?? null,
    amount: fromCents(row.amount_cents),
    currencyId: toNumber(row.currency_id),
    transferDate: row.transfer_date,
    type: row.type,
    statementId: toNullableNumber(row.statement_id),
    loanId: toNullableNumber(row.loan_id),
    description: row.description ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLoan(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    lender: row.lender ?? null,
    currencyId: toNumber(row.currency_id),
    originalAmount: fromCents(row.original_amount_cents),
    remainingAmount: fromCents(row.remaining_amount_cents),
    annualRate: toNullableNumber(row.annual_rate),
    totalInstallments: toNumber(row.total_installments),
    paidInstallments: toNumber(row.paid_installments),
    paymentType: row.payment_type,
    fixedPayment: fromCents(row.fixed_payment_cents),
    paymentDay: toNullableNumber(row.payment_day),
    paymentFrequency: row.payment_frequency ?? 'monthly',
    startDate: row.start_date,
    endDate: row.end_date ?? null,
    instrumentId: toNullableNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    affectsInstrumentBalance: toBoolean(row.affects_instrument_balance),
    notes: row.notes ?? null,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapLoanPayment(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    loanId: toNumber(row.loan_id),
    installmentNum: toNumber(row.installment_num),
    amount: fromCents(row.amount_cents),
    principal: fromCents(row.principal_cents),
    interest: fromCents(row.interest_cents),
    paymentDate: row.payment_date,
    isPaid: toBoolean(row.is_paid),
    paidDate: row.paid_date ?? null,
    notes: row.notes ?? null,
    transactionId: toNullableNumber(row.transaction_id),
    affectsInstrumentBalance: toBoolean(row.affects_instrument_balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSubscription(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    instrumentId: toNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    categoryId: toNullableNumber(row.category_id),
    categoryName: row.category_name ?? null,
    subcategoryId: toNullableNumber(row.subcategory_id),
    subcategoryName: row.subcategory_name ?? null,
    currencyId: toNumber(row.currency_id),
    amount: fromCents(row.amount_cents),
    billingCycle: row.billing_cycle,
    billingDay: toNullableNumber(row.billing_day),
    nextBilling: row.next_billing ?? null,
    isActive: toBoolean(row.is_active),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapFixedExpense(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    instrumentId: toNullableNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    categoryId: toNullableNumber(row.category_id),
    categoryName: row.category_name ?? null,
    subcategoryId: toNullableNumber(row.subcategory_id),
    subcategoryName: row.subcategory_name ?? null,
    currencyId: toNumber(row.currency_id),
    estimatedAmount: fromCents(row.estimated_amount_cents),
    isVariable: toBoolean(row.is_variable),
    paymentDay: toNullableNumber(row.payment_day),
    isActive: toBoolean(row.is_active),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapFixedExpensePayment(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    fixedExpenseId: toNumber(row.fixed_expense_id),
    amount: fromCents(row.amount_cents),
    periodMonth: toNumber(row.period_month),
    periodYear: toNumber(row.period_year),
    paymentDate: row.payment_date ?? null,
    isPaid: toBoolean(row.is_paid),
    notes: row.notes ?? null,
    transactionId: toNullableNumber(row.transaction_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapReminder(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    title: row.title,
    description: row.description ?? null,
    reminderDate: row.reminder_date,
    type: row.type,
    referenceId: toNullableNumber(row.reference_id),
    referenceType: row.reference_type ?? null,
    isRead: toBoolean(row.is_read),
    isDismissed: toBoolean(row.is_dismissed),
    isAutomatic: toBoolean(row.is_automatic),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapRecurringIncome(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    instrumentId: toNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    categoryId: toNullableNumber(row.category_id),
    categoryName: row.category_name ?? null,
    subcategoryId: toNullableNumber(row.subcategory_id),
    subcategoryName: row.subcategory_name ?? null,
    currencyId: toNumber(row.currency_id),
    amount: fromCents(row.amount_cents),
    frequency: row.frequency,
    paymentDay: toNullableNumber(row.payment_day),
    secondPaymentDay: toNullableNumber(row.second_payment_day),
    nextPayment: row.next_payment,
    isActive: toBoolean(row.is_active),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSavingsGoal(row: DbRow): Record<string, unknown> {
  const target = toNumber(row.target_amount_cents)
  const current = toNumber(row.current_amount_cents)
  return {
    id: toNumber(row.id),
    name: row.name,
    targetAmount: fromCents(target),
    currentAmount: fromCents(current),
    targetDate: row.target_date ?? null,
    instrumentId: toNullableNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
    progressPercent: target > 0 ? Math.min(100, Math.round((current / target) * 10_000) / 100) : 0,
    notes: row.notes ?? null,
    isActive: toBoolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function instrumentSelect(where = ''): string {
  return `
    SELECT i.*, b.name AS bank_name, linked.name AS linked_account_name,
           linked.current_amount_cents AS linked_current_amount_cents
    FROM financial_instruments i
    JOIN banks b ON b.id = i.bank_id
    LEFT JOIN financial_instruments linked ON linked.id = i.linked_account_id
    ${where}
  `
}

function transactionSelect(where = ''): string {
  return `
    SELECT t.*, i.name AS instrument_name, i.type AS instrument_type,
           c.name AS category_name, s.name AS subcategory_name
    FROM transactions t
    JOIN financial_instruments i ON i.id = t.instrument_id
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN subcategories s ON s.id = t.subcategory_id
    ${where}
  `
}

function statementSelect(where = ''): string {
  return `
    SELECT st.*, i.name AS instrument_name
    FROM credit_card_statements st
    JOIN financial_instruments i ON i.id = st.instrument_id
    ${where}
  `
}

function transferSelect(where = ''): string {
  return `
    SELECT tr.*, source.name AS source_instrument_name, source.type AS source_instrument_type,
           destination.name AS destination_instrument_name, destination.type AS destination_instrument_type
    FROM transfers tr
    JOIN financial_instruments source ON source.id = tr.source_instrument_id
    JOIN financial_instruments destination ON destination.id = tr.destination_instrument_id
    ${where}
  `
}

function loanSelect(where = ''): string {
  return `
    SELECT l.*, i.name AS instrument_name
    FROM loans l
    LEFT JOIN financial_instruments i ON i.id = l.instrument_id
    ${where}
  `
}

function subscriptionSelect(where = ''): string {
  return `
    SELECT s.*, i.name AS instrument_name, c.name AS category_name, sc.name AS subcategory_name
    FROM subscriptions s
    JOIN financial_instruments i ON i.id = s.instrument_id
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN subcategories sc ON sc.id = s.subcategory_id
    ${where}
  `
}

function fixedExpenseSelect(where = ''): string {
  return `
    SELECT f.*, i.name AS instrument_name, c.name AS category_name, s.name AS subcategory_name
    FROM fixed_expenses f
    LEFT JOIN financial_instruments i ON i.id = f.instrument_id
    LEFT JOIN categories c ON c.id = f.category_id
    LEFT JOIN subcategories s ON s.id = f.subcategory_id
    ${where}
  `
}

function getInstrument(db: Database.Database, id: number, requireActive = true): InstrumentRow {
  const row = db.prepare(`
    SELECT * FROM financial_instruments
    WHERE id = ? AND (? = 0 OR is_active = 1)
  `).get(id, Number(requireActive))
  if (!row) {
    throw new ValidationError('El instrumento seleccionado no existe o esta inactivo.')
  }
  return row as InstrumentRow
}

function getBalanceInstrument(db: Database.Database, instrument: InstrumentRow): InstrumentRow {
  const linkedAccountId = toNullableNumber(instrument.linked_account_id)
  if (instrument.type !== 'debit_card' || linkedAccountId === null) {
    return instrument
  }
  return getInstrument(db, linkedAccountId, false)
}

function applyInstrumentImpact(
  db: Database.Database,
  instrument: InstrumentRow,
  type: 'expense' | 'income',
  amountCents: number,
  direction: 1 | -1,
): void {
  instrument = getBalanceInstrument(db, instrument)
  const signed = (type === 'expense' ? 1 : -1) * amountCents * direction
  if (instrument.type === 'credit_card') {
    const balance = toNumber(instrument.current_balance_cents) + signed
    const limit = toNumber(instrument.credit_limit_cents)
    db.prepare(`
      UPDATE financial_instruments
      SET current_balance_cents = ?, available_credit_cents = MAX(? - ?, 0), updated_at = datetime('now')
      WHERE id = ?
    `).run(balance, limit, balance, instrument.id)
    return
  }

  const amount = toNumber(instrument.current_amount_cents) - signed
  db.prepare(`
    UPDATE financial_instruments
    SET current_amount_cents = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(amount, instrument.id)
}

function addMonths(dateValue: string, count: number, preferredDay?: number | null): string {
  const date = new Date(`${dateValue}T00:00:00Z`)
  const targetMonth = date.getUTCMonth() + count
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const day = preferredDay ?? date.getUTCDate()
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))).toISOString().slice(0, 10)
}

function addDays(dateValue: string, count: number): string {
  const date = new Date(`${dateValue}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function nextMonthlyDateOnOrAfter(dateValue: string, day: number): string {
  const monthStart = `${dateValue.slice(0, 7)}-01`
  const currentMonthDate = addMonths(monthStart, 0, day)
  return currentMonthDate >= dateValue ? currentMonthDate : addMonths(monthStart, 1, day)
}

function todayIso(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function computeMsiStartDate(transactionDate: string, cutOffDay: number): string {
  const date = new Date(`${transactionDate}T00:00:00Z`)
  if (date.getUTCDate() <= cutOffDay) {
    return transactionDate
  }
  return addMonths(transactionDate, 1, cutOffDay)
}

function validateCategoryLinks(
  db: Database.Database,
  categoryId: number | null,
  subcategoryId: number | null,
): void {
  if (categoryId !== null) {
    const category = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(categoryId)
    if (!category) {
      throw new ValidationError('La categoria seleccionada no existe o esta inactiva.')
    }
  }
  if (subcategoryId !== null) {
    const subcategory = db.prepare(
      'SELECT category_id FROM subcategories WHERE id = ? AND is_active = 1',
    ).get(subcategoryId) as { category_id: number } | undefined
    if (!subcategory || categoryId === null || subcategory.category_id !== categoryId) {
      throw new ValidationError('La subcategoria no pertenece a la categoria seleccionada.')
    }
  }
}

function safeError(error: unknown): string {
  if (error instanceof ValidationError || error instanceof NotFoundError) {
    return error.message
  }
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    return 'Ya existe un registro con esos datos.'
  }
  if (error instanceof Error && error.message.includes('FOREIGN KEY constraint failed')) {
    return 'La operacion no puede completarse porque el registro esta en uso.'
  }
  return 'No se pudo completar la operacion en la base de datos local.'
}

function listBanks(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare('SELECT * FROM banks ORDER BY is_active DESC, name').all() as DbRow[]).map(mapBank)
}

function saveBank(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const name = requiredString(body, 'name', 100)
  const shortName = optionalString(body, 'shortName', 20)
  const isActive = requiredBoolean(body, 'isActive', true)

  if (id) {
    requireEntity(db, 'banks', id)
    db.prepare(`
      UPDATE banks
      SET name = ?, short_name = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, shortName, Number(isActive), id)
  } else {
    const result = db.prepare(`
      INSERT INTO banks (name, short_name, is_active)
      VALUES (?, ?, ?)
    `).run(name, shortName, Number(isActive))
    id = Number(result.lastInsertRowid)
  }
  return mapBank(asRow(db.prepare('SELECT * FROM banks WHERE id = ?').get(id)))
}

function deleteBank(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'banks', id)
  db.prepare(`
    UPDATE banks SET is_active = 0, updated_at = datetime('now') WHERE id = ?
  `).run(id)
  db.prepare(`
    UPDATE financial_instruments SET is_active = 0, updated_at = datetime('now') WHERE bank_id = ?
  `).run(id)
  return { id }
}

function validateInstrument(body: Input): {
  bankId: number
  name: string
  type: string
  lastFour: string | null
  currencyId: number
  creditLimit: number | null
  currentBalance: number | null
  cutOffDay: number | null
  paymentDueDay: number | null
  annualRate: number | null
  currentAmount: number | null
  linkedAccountId: number | null
  notes: string | null
  isActive: boolean
} {
  const type = requiredEnum(body, 'type', INSTRUMENT_TYPES)
  const lastFour = optionalString(body, 'lastFour', 4)
  if (lastFour && !LAST_FOUR.test(lastFour)) {
    throw new ValidationError('lastFour debe contener exactamente cuatro digitos.')
  }
  const creditLimit = type === 'credit_card' ? optionalMoneyToCents(body, 'creditLimit') : null
  const currentBalance = type === 'credit_card'
    ? (optionalMoneyToCents(body, 'currentBalance') ?? 0)
    : null
  if (type === 'credit_card' && creditLimit === null) {
    throw new ValidationError('creditLimit es obligatorio para tarjetas de credito.')
  }
  return {
    bankId: requiredInteger(body, 'bankId'),
    name: requiredString(body, 'name', 100),
    type,
    lastFour,
    currencyId: requiredInteger(body, 'currencyId'),
    creditLimit,
    currentBalance,
    cutOffDay: type === 'credit_card' ? optionalInteger(body, 'cutOffDay', 1, 31) : null,
    paymentDueDay: type === 'credit_card' ? optionalInteger(body, 'paymentDueDay', 1, 31) : null,
    annualRate: type === 'credit_card' ? optionalRate(body, 'annualRate') : null,
    currentAmount: type === 'credit_card' ? null : (optionalMoneyToCents(body, 'currentAmount') ?? 0),
    linkedAccountId: type === 'debit_card' ? optionalInteger(body, 'linkedAccountId') : null,
    notes: optionalString(body, 'notes', 2000),
    isActive: requiredBoolean(body, 'isActive', true),
  }
}

function listInstruments(db: Database.Database, bankId?: number): Record<string, unknown>[] {
  const rows = bankId
    ? db.prepare(`${instrumentSelect('WHERE i.bank_id = ?')} ORDER BY i.is_active DESC, i.name`).all(bankId)
    : db.prepare(`${instrumentSelect()} ORDER BY b.name, i.is_active DESC, i.name`).all()
  return (rows as DbRow[]).map(mapInstrument)
}

function saveInstrument(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateInstrument(body)
  const bank = db.prepare('SELECT id FROM banks WHERE id = ? AND is_active = 1').get(input.bankId)
  if (!bank) {
    throw new ValidationError('El banco seleccionado no existe o esta inactivo.')
  }
  const currency = db.prepare('SELECT id FROM currencies WHERE id = ?').get(input.currencyId)
  if (!currency) {
    throw new ValidationError('La moneda seleccionada no existe.')
  }
  if (input.linkedAccountId !== null) {
    if (id === input.linkedAccountId) {
      throw new ValidationError('Una tarjeta de debito no puede vincularse consigo misma.')
    }
    const linked = getInstrument(db, input.linkedAccountId)
    if (linked.type !== 'account' || toNumber(linked.currency_id) !== input.currencyId) {
      throw new ValidationError('La tarjeta de debito debe vincularse a una cuenta activa de la misma moneda.')
    }
    input.currentAmount = 0
  }
  let availableCredit = input.type === 'credit_card'
    ? Math.max((input.creditLimit ?? 0) - (input.currentBalance ?? 0), 0)
    : null

  if (id) {
    const existing = requireEntity(db, 'financial_instruments', id)
    const activity = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM transactions WHERE instrument_id = ?) +
        (SELECT COUNT(*) FROM transfers
          WHERE source_instrument_id = ? OR destination_instrument_id = ?) +
        (SELECT COUNT(*) FROM loans WHERE instrument_id = ?) AS total
    `).get(id, id, id, id) as { total: number }
    if (activity.total > 0) {
      if (
        existing.type !== input.type
        || toNumber(existing.currency_id) !== input.currencyId
        || toNullableNumber(existing.linked_account_id) !== input.linkedAccountId
      ) {
        throw new ValidationError('No se puede cambiar tipo, moneda o cuenta vinculada con movimientos registrados.')
      }
      if (
        (
          input.type === 'credit_card'
          && input.currentBalance !== toNullableNumber(existing.current_balance_cents)
        )
        || (
          input.type !== 'credit_card'
          && input.linkedAccountId === null
          && input.currentAmount !== toNullableNumber(existing.current_amount_cents)
        )
      ) {
        throw new ValidationError('Usa la accion Conciliar para modificar un saldo con historial.')
      }
      input.currentBalance = toNullableNumber(existing.current_balance_cents)
      input.currentAmount = toNullableNumber(existing.current_amount_cents)
      availableCredit = input.type === 'credit_card'
        ? Math.max((input.creditLimit ?? 0) - (input.currentBalance ?? 0), 0)
        : null
    }
    db.prepare(`
      UPDATE financial_instruments
      SET bank_id = ?, name = ?, type = ?, last_four = ?, currency_id = ?,
          credit_limit_cents = ?, current_balance_cents = ?, available_credit_cents = ?,
          cut_off_day = ?, payment_due_day = ?, annual_rate = ?, current_amount_cents = ?,
          linked_account_id = ?, notes = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      input.bankId, input.name, input.type, input.lastFour, input.currencyId,
      input.creditLimit, input.currentBalance, availableCredit, input.cutOffDay,
      input.paymentDueDay, input.annualRate, input.currentAmount, input.linkedAccountId, input.notes,
      Number(input.isActive), id,
    )
  } else {
    const create = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO financial_instruments (
          bank_id, name, type, last_four, currency_id, credit_limit_cents,
          current_balance_cents, available_credit_cents, cut_off_day, payment_due_day,
          annual_rate, current_amount_cents, linked_account_id, notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.bankId, input.name, input.type, input.lastFour, input.currencyId,
        input.creditLimit, input.currentBalance, availableCredit, input.cutOffDay,
        input.paymentDueDay, input.annualRate, input.currentAmount, input.linkedAccountId, input.notes,
        Number(input.isActive),
      )
      const instrumentId = Number(result.lastInsertRowid)
      const openingAmount = input.type === 'credit_card'
        ? toNumber(input.currentBalance)
        : input.linkedAccountId === null
          ? toNumber(input.currentAmount)
          : 0
      if (openingAmount > 0) {
        db.prepare(`
          INSERT INTO transactions (
            instrument_id, currency_id, type, amount_cents, description,
            transaction_date, affects_balance, source_type, source_id
          ) VALUES (?, ?, ?, ?, 'Saldo inicial', ?, 0, 'opening_balance', ?)
        `).run(
          instrumentId,
          input.currencyId,
          input.type === 'credit_card' ? 'expense' : 'income',
          openingAmount,
          todayIso(),
          instrumentId,
        )
      }
      return instrumentId
    })
    id = create()
  }
  return mapInstrument(asRow(db.prepare(instrumentSelect('WHERE i.id = ?')).get(id)))
}

function deleteInstrument(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'financial_instruments', id)
  db.prepare(`
    UPDATE financial_instruments SET is_active = 0, updated_at = datetime('now') WHERE id = ?
  `).run(id)
  return { id }
}

function reconcileInstrument(
  db: Database.Database,
  id: number,
  body: Input,
): Record<string, unknown> {
  const instrument = getInstrument(db, id)
  const balanceInstrument = getBalanceInstrument(db, instrument)
  const actualCents = moneyToCents(body.actualBalance, 'actualBalance', true)
  const reconciliationDate = requiredDate(body, 'reconciliationDate')
  const notes = optionalString(body, 'notes', 2000)
  const currentCents = balanceInstrument.type === 'credit_card'
    ? toNumber(balanceInstrument.current_balance_cents)
    : toNumber(balanceInstrument.current_amount_cents)
  const delta = actualCents - currentCents
  if (delta === 0) {
    throw new ValidationError('El saldo capturado ya coincide con el saldo registrado.')
  }
  const type: 'expense' | 'income' = balanceInstrument.type === 'credit_card'
    ? (delta > 0 ? 'expense' : 'income')
    : (delta > 0 ? 'income' : 'expense')
  const transaction = saveTransaction(db, {
    instrumentId: id,
    currencyId: toNumber(balanceInstrument.currency_id),
    type,
    amount: Math.abs(delta) / 100,
    description: 'Ajuste de conciliacion',
    transactionDate: reconciliationDate,
    notes,
    isMsi: false,
    affectsBalance: true,
    sourceType: 'reconciliation',
  }, undefined, true)
  return {
    instrument: mapInstrument(asRow(db.prepare(instrumentSelect('WHERE i.id = ?')).get(id))),
    transaction,
  }
}

function categoryCanDelete(db: Database.Database, id: number): boolean {
  const category = db.prepare('SELECT is_system FROM categories WHERE id = ?').get(id) as { is_system: number } | undefined
  if (!category || category.is_system === 1) {
    return false
  }
  const count = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE category_id = ?) +
      (SELECT COUNT(*) FROM subscriptions WHERE category_id = ?) +
      (SELECT COUNT(*) FROM fixed_expenses WHERE category_id = ?) AS total
  `).get(id, id, id) as { total: number }
  return count.total === 0
}

function listCategories(db: Database.Database): Record<string, unknown>[] {
  const categories = db.prepare('SELECT * FROM categories ORDER BY is_active DESC, name').all() as DbRow[]
  const subcategories = db.prepare(`
    SELECT s.*, c.name AS category_name
    FROM subcategories s JOIN categories c ON c.id = s.category_id
    ORDER BY s.is_active DESC, s.name
  `).all() as DbRow[]
  const byCategory = new Map<number, Record<string, unknown>[]>()
  for (const row of subcategories) {
    const categoryId = toNumber(row.category_id)
    const current = byCategory.get(categoryId) ?? []
    current.push(mapSubcategory(row))
    byCategory.set(categoryId, current)
  }
  return categories.map((row) => ({
    id: toNumber(row.id),
    name: row.name,
    iconName: row.icon_name ?? null,
    color: row.color ?? null,
    type: row.type,
    isSystem: toBoolean(row.is_system),
    isActive: toBoolean(row.is_active),
    canDelete: categoryCanDelete(db, toNumber(row.id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subcategories: byCategory.get(toNumber(row.id)) ?? [],
  }))
}

function saveCategory(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const name = requiredString(body, 'name', 100)
  const type = requiredEnum(body, 'type', CATEGORY_TYPES)
  const iconName = optionalString(body, 'iconName', 50)
  const color = optionalString(body, 'color', 7)
  const isActive = requiredBoolean(body, 'isActive', true)
  if (iconName && !ICON_NAME.test(iconName)) {
    throw new ValidationError('iconName solo admite letras y numeros.')
  }
  if (color && !HEX_COLOR.test(color)) {
    throw new ValidationError('color debe usar el formato #RRGGBB.')
  }
  if (id) {
    const existing = requireEntity(db, 'categories', id)
    if (toBoolean(existing.is_system)) {
      throw new ValidationError('Las categorias del sistema no se pueden editar.')
    }
    db.prepare(`
      UPDATE categories
      SET name = ?, icon_name = ?, color = ?, type = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, iconName, color, type, Number(isActive), id)
  } else {
    const result = db.prepare(`
      INSERT INTO categories (name, icon_name, color, type, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, iconName, color, type, Number(isActive))
    id = Number(result.lastInsertRowid)
  }
  return listCategories(db).find((category) => category.id === id) ?? {}
}

function deleteCategory(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'categories', id)
  if (!categoryCanDelete(db, id)) {
    throw new ValidationError('La categoria es del sistema o tiene movimientos relacionados.')
  }
  db.prepare('UPDATE categories SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
  db.prepare('UPDATE subcategories SET is_active = 0, updated_at = datetime(\'now\') WHERE category_id = ?').run(id)
  return { id }
}

function listSubcategories(db: Database.Database, categoryId?: number): Record<string, unknown>[] {
  const where = categoryId ? 'WHERE s.category_id = ?' : ''
  const rows = db.prepare(`
    SELECT s.*, c.name AS category_name
    FROM subcategories s JOIN categories c ON c.id = s.category_id
    ${where}
    ORDER BY s.is_active DESC, c.name, s.name
  `).all(...(categoryId ? [categoryId] : [])) as DbRow[]
  return rows.map(mapSubcategory)
}

function saveSubcategory(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const categoryId = requiredInteger(body, 'categoryId')
  const category = db.prepare('SELECT id FROM categories WHERE id = ? AND is_active = 1').get(categoryId)
  if (!category) {
    throw new ValidationError('La categoria seleccionada no existe o esta inactiva.')
  }
  const name = requiredString(body, 'name', 100)
  const iconName = optionalString(body, 'iconName', 50)
  const isActive = requiredBoolean(body, 'isActive', true)
  if (iconName && !ICON_NAME.test(iconName)) {
    throw new ValidationError('iconName solo admite letras y numeros.')
  }
  if (id) {
    requireEntity(db, 'subcategories', id)
    db.prepare(`
      UPDATE subcategories
      SET category_id = ?, name = ?, icon_name = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(categoryId, name, iconName, Number(isActive), id)
  } else {
    const result = db.prepare(`
      INSERT INTO subcategories (category_id, name, icon_name, is_active)
      VALUES (?, ?, ?, ?)
    `).run(categoryId, name, iconName, Number(isActive))
    id = Number(result.lastInsertRowid)
  }
  return listSubcategories(db).find((subcategory) => subcategory.id === id) ?? {}
}

function deleteSubcategory(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'subcategories', id)
  const used = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE subcategory_id = ?) +
      (SELECT COUNT(*) FROM subscriptions WHERE subcategory_id = ?) +
      (SELECT COUNT(*) FROM fixed_expenses WHERE subcategory_id = ?) AS total
  `).get(id, id, id) as { total: number }
  if (used.total > 0) {
    throw new ValidationError('La subcategoria tiene movimientos relacionados.')
  }
  db.prepare('UPDATE subcategories SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
  return { id }
}

function validateTransaction(db: Database.Database, body: Input): {
  instrumentId: number
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  type: 'expense' | 'income'
  amountCents: number
  description: string | null
  transactionDate: string
  notes: string | null
  isMsi: boolean
  msiMonths: number | null
  msiMonthlyAmountCents: number | null
  msiStartDate: string | null
  affectsBalance: boolean
  sourceType: string | null
  sourceId: number | null
} {
  const instrumentId = requiredInteger(body, 'instrumentId')
  const instrument = getInstrument(db, instrumentId)
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  const type = requiredEnum(body, 'type', TRANSACTION_TYPES) as 'expense' | 'income'
  if (categoryId !== null) {
    const category = db.prepare('SELECT type FROM categories WHERE id = ?').get(categoryId) as { type: string }
    if (category.type !== 'both' && category.type !== type) {
      throw new ValidationError('La categoria seleccionada no corresponde al tipo de movimiento.')
    }
  }
  const amountCents = moneyToCents(body.amount, 'amount')
  const isMsi = requiredBoolean(body, 'isMsi', false)
  const msiMonths = isMsi ? requiredInteger(body, 'msiMonths', 1, 24) : null
  if (isMsi && (!MSI_MONTHS.has(msiMonths ?? 0) || type !== 'expense' || instrument.type !== 'credit_card')) {
    throw new ValidationError('MSI solo admite compras con tarjeta a 3, 6, 9, 12, 18 o 24 meses.')
  }
  const transactionDate = requiredDate(body, 'transactionDate')
  const currencyId = requiredInteger(body, 'currencyId')
  if (currencyId !== toNumber(instrument.currency_id)) {
    throw new ValidationError('La moneda del movimiento debe coincidir con la del instrumento.')
  }
  return {
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId,
    type,
    amountCents,
    description: optionalString(body, 'description', 255),
    transactionDate,
    notes: optionalString(body, 'notes', 2000),
    isMsi,
    msiMonths,
    msiMonthlyAmountCents: isMsi ? Math.round(amountCents / (msiMonths ?? 1)) : null,
    msiStartDate: isMsi ? computeMsiStartDate(transactionDate, toNumber(instrument.cut_off_day ?? 31)) : null,
    affectsBalance: requiredBoolean(body, 'affectsBalance', true),
    sourceType: optionalString(body, 'sourceType', 30),
    sourceId: optionalInteger(body, 'sourceId'),
  }
}

function listTransactions(db: Database.Database, url: URL): Record<string, unknown>[] {
  syncMsiRemaining(db)
  const clauses: string[] = []
  const params: unknown[] = []
  const add = (clause: string, value: unknown): void => {
    clauses.push(clause)
    params.push(value)
  }
  const fromDate = url.searchParams.get('from_date')
  const toDate = url.searchParams.get('to_date')
  const categoryId = Number(url.searchParams.get('category_id'))
  const instrumentId = Number(url.searchParams.get('instrument_id'))
  const type = url.searchParams.get('type')
  const search = url.searchParams.get('search')?.trim()
  if (fromDate) add('t.transaction_date >= ?', fromDate)
  if (toDate) add('t.transaction_date <= ?', toDate)
  if (Number.isInteger(categoryId) && categoryId > 0) add('t.category_id = ?', categoryId)
  if (Number.isInteger(instrumentId) && instrumentId > 0) add('t.instrument_id = ?', instrumentId)
  if (type && TRANSACTION_TYPES.has(type)) add('t.type = ?', type)
  if (search) add('(t.description LIKE ? OR t.notes LIKE ?)', `%${search}%`)
  if (search) params.push(`%${search}%`)
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  return (db.prepare(`${transactionSelect(where)} ORDER BY t.transaction_date DESC, t.id DESC`).all(...params) as DbRow[])
    .map(mapTransaction)
}

function saveTransaction(
  db: Database.Database,
  body: Input,
  id?: number,
  allowInternalSource = false,
): Record<string, unknown> {
  const input = validateTransaction(db, body)
  if (!allowInternalSource) {
    input.sourceType = null
    input.sourceId = null
  }
  const operation = db.transaction(() => {
    let previousInstrumentId: number | null = null
    if (id) {
      const previous = requireEntity(db, 'transactions', id)
      if (previous.source_type === 'loan_interest') {
        throw new ValidationError('El interes se corrige revirtiendo el pago del prestamo.')
      }
      if (previous.source_type === 'opening_balance') {
        throw new ValidationError('El saldo inicial es un asiento protegido del instrumento.')
      }
      if (previous.source_type === 'fixed_expense') {
        throw new ValidationError('Modifica este movimiento desde el pago del gasto fijo.')
      }
      input.sourceType ??= previous.source_type as string | null
      input.sourceId ??= toNullableNumber(previous.source_id)
      previousInstrumentId = toNumber(previous.instrument_id)
      if (previous.affects_balance === undefined || toBoolean(previous.affects_balance)) {
        applyInstrumentImpact(
          db,
          getInstrument(db, toNumber(previous.instrument_id), false),
          previous.type as 'expense' | 'income',
          toNumber(previous.amount_cents),
          -1,
        )
      }
      db.prepare(`
        UPDATE transactions
        SET instrument_id = ?, category_id = ?, subcategory_id = ?, currency_id = ?, type = ?,
            amount_cents = ?, description = ?, transaction_date = ?, notes = ?, is_msi = ?,
            msi_months = ?, msi_monthly_amount_cents = ?, msi_start_date = ?, msi_remaining = ?,
            affects_balance = ?, source_type = ?, source_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId, input.type,
        input.amountCents, input.description, input.transactionDate, input.notes, Number(input.isMsi),
        input.msiMonths, input.msiMonthlyAmountCents, input.msiStartDate, input.msiMonths,
        Number(input.affectsBalance), input.sourceType, input.sourceId, id,
      )
    } else {
      const result = db.prepare(`
        INSERT INTO transactions (
          instrument_id, category_id, subcategory_id, currency_id, type, amount_cents,
          description, transaction_date, notes, is_msi, msi_months,
          msi_monthly_amount_cents, msi_start_date, msi_remaining,
          affects_balance, source_type, source_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId, input.type,
        input.amountCents, input.description, input.transactionDate, input.notes, Number(input.isMsi),
        input.msiMonths, input.msiMonthlyAmountCents, input.msiStartDate, input.msiMonths,
        Number(input.affectsBalance), input.sourceType, input.sourceId,
      )
      id = Number(result.lastInsertRowid)
    }
    if (input.affectsBalance) {
      applyInstrumentImpact(db, getInstrument(db, input.instrumentId), input.type, input.amountCents, 1)
    }
    if (previousInstrumentId !== null && previousInstrumentId !== input.instrumentId) {
      refreshInstrumentStatements(db, previousInstrumentId)
    }
    refreshInstrumentStatements(db, input.instrumentId)
  })
  operation()
  return mapTransaction(asRow(db.prepare(transactionSelect('WHERE t.id = ?')).get(id)))
}

function deleteTransaction(db: Database.Database, id: number): { id: number } {
  const operation = db.transaction(() => {
    const row = requireEntity(db, 'transactions', id)
    if (row.source_type === 'loan_interest') {
      throw new ValidationError('El interes se elimina revirtiendo el pago del prestamo.')
    }
    if (row.source_type === 'opening_balance') {
      throw new ValidationError('El saldo inicial es un asiento protegido del instrumento.')
    }
    if (row.source_type === 'fixed_expense' && row.source_id) {
      db.prepare(`
        UPDATE fixed_expense_payments
        SET is_paid = 0, transaction_id = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(row.source_id)
    }
    const instrumentId = toNumber(row.instrument_id)
    if (row.affects_balance === undefined || toBoolean(row.affects_balance)) {
      applyInstrumentImpact(
        db,
        getInstrument(db, instrumentId, false),
        row.type as 'expense' | 'income',
        toNumber(row.amount_cents),
        -1,
      )
    }
    db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
    refreshInstrumentStatements(db, instrumentId)
  })
  operation()
  return { id }
}

function defaultPaymentDueDate(cutOffDate: string, paymentDueDay: number): string {
  const date = new Date(`${cutOffDate}T00:00:00Z`)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  let candidate = new Date(Date.UTC(year, month, Math.min(paymentDueDay, lastDay)))
  if (candidate.toISOString().slice(0, 10) <= cutOffDate) {
    const nextMonth = month + 1
    const nextYear = year + Math.floor(nextMonth / 12)
    const normalizedMonth = nextMonth % 12
    const nextLastDay = new Date(Date.UTC(nextYear, normalizedMonth + 1, 0)).getUTCDate()
    candidate = new Date(Date.UTC(nextYear, normalizedMonth, Math.min(paymentDueDay, nextLastDay)))
  }
  return candidate.toISOString().slice(0, 10)
}

function previousCutOffDate(cutOffDate: string): string {
  return addMonths(cutOffDate, -1, Number(cutOffDate.slice(8, 10)))
}

function statementMovementRows(
  db: Database.Database,
  instrumentId: number,
  cutOffDate: string,
): DbRow[] {
  const previous = previousCutOffDate(cutOffDate)
  const rows = db.prepare(`
    ${transactionSelect(`
      WHERE t.instrument_id = ?
        AND (
          (t.is_msi = 0 AND t.transaction_date > ? AND t.transaction_date <= ?)
          OR
          (t.is_msi = 1 AND t.msi_start_date <= ?)
        )
    `)}
    ORDER BY t.transaction_date DESC, t.id DESC
  `).all(instrumentId, previous, cutOffDate, cutOffDate) as DbRow[]
  return rows.filter((row) => {
    if (row.source_type === 'opening_balance' || row.source_type === 'reconciliation') {
      return false
    }
    if (!toBoolean(row.is_msi)) {
      return true
    }
    const start = new Date(`${String(row.msi_start_date)}T00:00:00Z`)
    const end = new Date(`${cutOffDate}T00:00:00Z`)
    const elapsed = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
      + end.getUTCMonth() - start.getUTCMonth()
    return elapsed >= 0 && elapsed < toNumber(row.msi_months)
  })
}

function calculateStatementTotal(
  db: Database.Database,
  instrumentId: number,
  cutOffDate: string,
): number {
  const previous = previousCutOffDate(cutOffDate)
  const regular = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE -amount_cents END), 0) AS total
    FROM transactions
    WHERE instrument_id = ? AND is_msi = 0 AND transaction_date > ? AND transaction_date <= ?
      AND COALESCE(source_type, '') NOT IN ('opening_balance', 'reconciliation')
  `).get(instrumentId, previous, cutOffDate) as { total: number }
  const msiRows = db.prepare(`
    SELECT amount_cents, msi_start_date, msi_months, msi_monthly_amount_cents
    FROM transactions
    WHERE instrument_id = ? AND is_msi = 1 AND msi_start_date <= ?
  `).all(instrumentId, cutOffDate) as Array<{
    msi_start_date: string
    msi_months: number
    msi_monthly_amount_cents: number
    amount_cents: number
  }>
  let msiTotal = 0
  for (const row of msiRows) {
    const start = new Date(`${row.msi_start_date}T00:00:00Z`)
    const end = new Date(`${cutOffDate}T00:00:00Z`)
    const elapsed = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
      + end.getUTCMonth() - start.getUTCMonth()
    if (elapsed >= 0 && elapsed < row.msi_months) {
      msiTotal += elapsed === row.msi_months - 1
        ? row.amount_cents - row.msi_monthly_amount_cents * (row.msi_months - 1)
        : row.msi_monthly_amount_cents
    }
  }
  return Math.max(0, toNumber(regular.total) + msiTotal)
}

function boundedDate(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10)
}

function latestCutOffDate(referenceDate: string, cutOffDay: number): string {
  const reference = new Date(`${referenceDate}T00:00:00Z`)
  let candidate = boundedDate(reference.getUTCFullYear(), reference.getUTCMonth(), cutOffDay)
  if (candidate > referenceDate) {
    candidate = addMonths(candidate, -1, cutOffDay)
  }
  return candidate
}

function refreshInstrumentStatements(db: Database.Database, instrumentId: number): void {
  const rows = db.prepare(`
    SELECT id, cut_off_date FROM credit_card_statements WHERE instrument_id = ?
  `).all(instrumentId) as Array<{ id: number; cut_off_date: string }>
  const update = db.prepare(`
    UPDATE credit_card_statements
    SET total_amount_cents = ?, updated_at = datetime('now')
    WHERE id = ?
  `)
  for (const row of rows) {
    update.run(calculateStatementTotal(db, instrumentId, row.cut_off_date), row.id)
    refreshStatementPayment(db, row.id)
  }
}

function syncMsiRemaining(db: Database.Database): void {
  const rows = db.prepare(`
    SELECT t.id, t.msi_start_date, t.msi_months, i.cut_off_day
    FROM transactions t
    JOIN financial_instruments i ON i.id = t.instrument_id
    WHERE t.is_msi = 1 AND t.msi_start_date IS NOT NULL
  `).all() as Array<{
    id: number
    msi_start_date: string
    msi_months: number
    cut_off_day: number | null
  }>
  const update = db.prepare(`
    UPDATE transactions SET msi_remaining = ?, updated_at = datetime('now') WHERE id = ?
  `)
  for (const row of rows) {
    const latestCutOff = latestCutOffDate(todayIso(), row.cut_off_day ?? 31)
    const start = new Date(`${row.msi_start_date}T00:00:00Z`)
    const end = new Date(`${latestCutOff}T00:00:00Z`)
    const elapsed = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
      + end.getUTCMonth() - start.getUTCMonth()
    const processed = latestCutOff >= row.msi_start_date ? elapsed + 1 : 0
    update.run(Math.max(row.msi_months - processed, 0), row.id)
  }
}

function ensureAutomaticStatements(db: Database.Database): void {
  const cards = db.prepare(`
    SELECT id, cut_off_day, payment_due_day
    FROM financial_instruments
    WHERE type = 'credit_card' AND is_active = 1
      AND cut_off_day IS NOT NULL AND payment_due_day IS NOT NULL
  `).all() as Array<{ id: number; cut_off_day: number; payment_due_day: number }>
  const earliestTransaction = db.prepare(`
    SELECT MIN(transaction_date) AS first_date FROM transactions WHERE instrument_id = ?
  `)
  const insert = db.prepare(`
    INSERT OR IGNORE INTO credit_card_statements (
      instrument_id, cut_off_date, payment_due_date, total_amount_cents
    ) VALUES (?, ?, ?, ?)
  `)
  for (const card of cards) {
    const latest = latestCutOffDate(todayIso(), card.cut_off_day)
    const earliest = earliestTransaction.get(card.id) as { first_date: string | null }
    let candidate = latest
    if (earliest.first_date) {
      const first = new Date(`${earliest.first_date}T00:00:00Z`)
      candidate = boundedDate(first.getUTCFullYear(), first.getUTCMonth(), card.cut_off_day)
      if (candidate < earliest.first_date) {
        candidate = addMonths(candidate, 1, card.cut_off_day)
      }
    }
    let generated = 0
    while (candidate <= latest && generated < 60) {
      insert.run(
        card.id,
        candidate,
        defaultPaymentDueDate(candidate, card.payment_due_day),
        calculateStatementTotal(db, card.id, candidate),
      )
      candidate = addMonths(candidate, 1, card.cut_off_day)
      generated += 1
    }
    refreshInstrumentStatements(db, card.id)
  }
  syncMsiRemaining(db)
}

function listStatements(db: Database.Database, instrumentId?: number): Record<string, unknown>[] {
  ensureAutomaticStatements(db)
  const rows = instrumentId
    ? db.prepare(`${statementSelect('WHERE st.instrument_id = ?')} ORDER BY st.cut_off_date DESC`).all(instrumentId)
    : db.prepare(`${statementSelect()} ORDER BY st.cut_off_date DESC, st.id DESC`).all()
  return (rows as DbRow[]).map(mapStatement)
}

function saveStatement(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  if (id) {
    const existing = requireEntity(db, 'credit_card_statements', id)
    const paymentDueDate = optionalDate(body, 'paymentDueDate') ?? String(existing.payment_due_date)
    const minimumPayment = body.minimumPayment === undefined
      ? toNullableNumber(existing.minimum_payment_cents)
      : optionalMoneyToCents(body, 'minimumPayment')
    const noInterestPayment = body.noInterestPayment === undefined
      ? toNullableNumber(existing.no_interest_payment_cents)
      : optionalMoneyToCents(body, 'noInterestPayment')
    db.prepare(`
      UPDATE credit_card_statements
      SET payment_due_date = ?, minimum_payment_cents = ?, no_interest_payment_cents = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      paymentDueDate, minimumPayment, noInterestPayment, id,
    )
    refreshStatementPayment(db, id)
  } else {
    const instrumentId = requiredInteger(body, 'instrumentId')
    const instrument = getInstrument(db, instrumentId)
    if (instrument.type !== 'credit_card') {
      throw new ValidationError('Los estados de cuenta solo aplican a tarjetas de credito.')
    }
    const cutOffDate = requiredDate(body, 'cutOffDate')
    const paymentDueDate = optionalDate(body, 'paymentDueDate')
      ?? defaultPaymentDueDate(cutOffDate, toNumber(instrument.payment_due_day ?? 1))
    const result = db.prepare(`
      INSERT INTO credit_card_statements (
        instrument_id, cut_off_date, payment_due_date, total_amount_cents,
        minimum_payment_cents, no_interest_payment_cents
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      instrumentId, cutOffDate, paymentDueDate,
      calculateStatementTotal(db, instrumentId, cutOffDate),
      optionalMoneyToCents(body, 'minimumPayment'),
      optionalMoneyToCents(body, 'noInterestPayment'),
    )
    id = Number(result.lastInsertRowid)
  }
  return mapStatement(asRow(db.prepare(statementSelect('WHERE st.id = ?')).get(id)))
}

function deleteStatement(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'credit_card_statements', id)
  const linked = db.prepare(`
    SELECT COUNT(*) AS total FROM statement_payment_allocations WHERE statement_id = ?
  `).get(id) as { total: number }
  if (linked.total > 0) {
    throw new ValidationError('No se puede eliminar un estado de cuenta con pagos relacionados.')
  }
  db.prepare('DELETE FROM credit_card_statements WHERE id = ?').run(id)
  return { id }
}

function listStatementMovements(db: Database.Database, statementId: number): Record<string, unknown>[] {
  const statement = requireEntity(db, 'credit_card_statements', statementId)
  return statementMovementRows(
    db,
    toNumber(statement.instrument_id),
    String(statement.cut_off_date),
  ).map(mapTransaction)
}

function applyTransferImpact(
  db: Database.Database,
  source: InstrumentRow,
  destination: InstrumentRow,
  amountCents: number,
  direction: 1 | -1,
): void {
  source = getBalanceInstrument(db, source)
  destination = getBalanceInstrument(db, destination)
  if (source.type === 'credit_card') {
    throw new ValidationError('El origen de una transferencia debe ser una cuenta o tarjeta de debito.')
  }
  const sourceAmount = toNumber(source.current_amount_cents) - amountCents * direction
  db.prepare(`
    UPDATE financial_instruments
    SET current_amount_cents = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(sourceAmount, source.id)

  if (destination.type === 'credit_card') {
    const balance = Math.max(0, toNumber(destination.current_balance_cents) - amountCents * direction)
    const limit = toNumber(destination.credit_limit_cents)
    db.prepare(`
      UPDATE financial_instruments
      SET current_balance_cents = ?, available_credit_cents = MAX(? - ?, 0),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(balance, limit, balance, destination.id)
  } else {
    const destinationAmount = toNumber(destination.current_amount_cents) + amountCents * direction
    db.prepare(`
      UPDATE financial_instruments
      SET current_amount_cents = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(destinationAmount, destination.id)
  }
}

function refreshStatementPayment(db: Database.Database, statementId: number | null): void {
  if (statementId === null) {
    return
  }
  const statement = requireEntity(db, 'credit_card_statements', statementId)
  const paid = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS total
    FROM statement_payment_allocations
    WHERE statement_id = ?
  `).get(statementId) as { total: number }
  const paidAmount = toNumber(paid.total)
  const isPaid = paidAmount >= toNumber(statement.total_amount_cents) && toNumber(statement.total_amount_cents) > 0
  db.prepare(`
    UPDATE credit_card_statements
    SET paid_amount_cents = ?, is_paid = ?, paid_date = CASE WHEN ? THEN COALESCE(paid_date, date('now', 'localtime')) ELSE NULL END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(paidAmount, Number(isPaid), Number(isPaid), statementId)
  if (isPaid) {
    db.prepare(`
      UPDATE reminders
      SET is_dismissed = 1, updated_at = datetime('now')
      WHERE reference_type = 'statement' AND reference_id = ?
    `).run(statementId)
  }
}

function allocateCardPayment(
  db: Database.Database,
  transferId: number,
  instrumentId: number,
  amountCents: number,
  transferDate: string,
  requestedStatementId: number | null,
): number[] {
  const candidates = requestedStatementId === null
    ? db.prepare(`
        SELECT st.id, st.total_amount_cents,
          COALESCE(SUM(a.amount_cents), 0) AS allocated_cents
        FROM credit_card_statements st
        LEFT JOIN statement_payment_allocations a ON a.statement_id = st.id
        WHERE st.instrument_id = ? AND st.cut_off_date <= ?
        GROUP BY st.id
        HAVING st.total_amount_cents > allocated_cents
        ORDER BY st.cut_off_date, st.id
      `).all(instrumentId, transferDate) as Array<{
        id: number
        total_amount_cents: number
        allocated_cents: number
      }>
    : db.prepare(`
        SELECT st.id, st.total_amount_cents,
          COALESCE(SUM(a.amount_cents), 0) AS allocated_cents
        FROM credit_card_statements st
        LEFT JOIN statement_payment_allocations a ON a.statement_id = st.id
        WHERE st.id = ?
        GROUP BY st.id
      `).all(requestedStatementId) as Array<{
        id: number
        total_amount_cents: number
        allocated_cents: number
      }>
  let remaining = amountCents
  const affected: number[] = []
  const insert = db.prepare(`
    INSERT INTO statement_payment_allocations (transfer_id, statement_id, amount_cents)
    VALUES (?, ?, ?)
  `)
  for (const statement of candidates) {
    if (remaining <= 0) break
    const outstanding = Math.max(
      toNumber(statement.total_amount_cents) - toNumber(statement.allocated_cents),
      0,
    )
    const allocation = Math.min(remaining, outstanding)
    if (allocation <= 0) continue
    insert.run(transferId, statement.id, allocation)
    affected.push(statement.id)
    remaining -= allocation
  }
  db.prepare('UPDATE transfers SET statement_id = ? WHERE id = ?').run(affected[0] ?? null, transferId)
  return affected
}

function validateTransfer(db: Database.Database, body: Input, transferId?: number): {
  sourceId: number
  destinationId: number
  amountCents: number
  currencyId: number
  transferDate: string
  type: string
  statementId: number | null
  loanId: number | null
  description: string | null
  notes: string | null
} {
  const sourceId = requiredInteger(body, 'sourceInstrumentId')
  const destinationId = requiredInteger(body, 'destinationInstrumentId')
  if (sourceId === destinationId) {
    throw new ValidationError('El origen y el destino deben ser diferentes.')
  }
  const source = getInstrument(db, sourceId)
  const destination = getInstrument(db, destinationId)
  const sourceBalanceInstrument = getBalanceInstrument(db, source)
  const destinationBalanceInstrument = getBalanceInstrument(db, destination)
  if (sourceBalanceInstrument.id === destinationBalanceInstrument.id) {
    throw new ValidationError('El origen y el destino representan la misma cuenta.')
  }
  if (source.type === 'credit_card') {
    throw new ValidationError('El origen debe ser una cuenta o tarjeta de debito.')
  }
  const type = requiredEnum(body, 'type', TRANSFER_TYPES)
  if (type === 'card_payment' && destination.type !== 'credit_card') {
    throw new ValidationError('Un pago de tarjeta debe tener una tarjeta de crédito como destino.')
  }
  if (destination.type === 'credit_card' && type !== 'card_payment') {
    throw new ValidationError('Los movimientos hacia una tarjeta deben registrarse como pagos de tarjeta.')
  }
  const amountCents = moneyToCents(body.amount, 'amount')
  if (type === 'card_payment') {
    let payableBalance = toNumber(destination.current_balance_cents)
    if (transferId) {
      const previous = requireEntity(db, 'transfers', transferId)
      if (
        previous.type === 'card_payment'
        && toNumber(previous.destination_instrument_id) === destinationId
      ) {
        payableBalance += toNumber(previous.amount_cents)
      }
    }
    if (amountCents > payableBalance) {
      throw new ValidationError('El pago no puede superar el saldo actual de la tarjeta.')
    }
  }
  const transferDate = requiredDate(body, 'transferDate')
  const statementId = optionalInteger(body, 'statementId')
  if (type === 'card_payment') ensureAutomaticStatements(db)
  if (statementId !== null) {
    const statement = requireEntity(db, 'credit_card_statements', statementId)
    if (toNumber(statement.instrument_id) !== destinationId) {
      throw new ValidationError('El estado de cuenta no pertenece a la tarjeta de destino.')
    }
  }
  const loanId = optionalInteger(body, 'loanId')
  if (loanId !== null) {
    requireEntity(db, 'loans', loanId)
  }
  const currencyId = requiredInteger(body, 'currencyId')
  if (
    currencyId !== toNumber(sourceBalanceInstrument.currency_id)
    || currencyId !== toNumber(destinationBalanceInstrument.currency_id)
  ) {
    throw new ValidationError('Las transferencias solo se permiten entre instrumentos de la misma moneda.')
  }
  if (type === 'loan_payment' && loanId === null) {
    throw new ValidationError('Un pago de prestamo debe indicar el prestamo relacionado.')
  }
  return {
    sourceId,
    destinationId,
    amountCents,
    currencyId,
    transferDate,
    type,
    statementId,
    loanId,
    description: optionalString(body, 'description', 255),
    notes: optionalString(body, 'notes', 2000),
  }
}

function listTransfers(db: Database.Database, instrumentId?: number): Record<string, unknown>[] {
  const rows = instrumentId
    ? db.prepare(`${transferSelect('WHERE tr.source_instrument_id = ? OR tr.destination_instrument_id = ?')} ORDER BY tr.transfer_date DESC, tr.id DESC`)
      .all(instrumentId, instrumentId)
    : db.prepare(`${transferSelect()} ORDER BY tr.transfer_date DESC, tr.id DESC`).all()
  return (rows as DbRow[]).map(mapTransfer)
}

function saveTransfer(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateTransfer(db, body, id)
  const affectedStatements = new Set<number>()
  const operation = db.transaction(() => {
    if (id) {
      const previous = requireEntity(db, 'transfers', id)
      const previousAllocations = db.prepare(`
        SELECT statement_id FROM statement_payment_allocations WHERE transfer_id = ?
      `).all(id) as Array<{ statement_id: number }>
      previousAllocations.forEach((item) => affectedStatements.add(item.statement_id))
      db.prepare('DELETE FROM statement_payment_allocations WHERE transfer_id = ?').run(id)
      applyTransferImpact(
        db,
        getInstrument(db, toNumber(previous.source_instrument_id), false),
        getInstrument(db, toNumber(previous.destination_instrument_id), false),
        toNumber(previous.amount_cents),
        -1,
      )
      db.prepare(`
        UPDATE transfers
        SET source_instrument_id = ?, destination_instrument_id = ?, amount_cents = ?,
            currency_id = ?, transfer_date = ?, type = ?, statement_id = ?, loan_id = ?,
            description = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        input.sourceId, input.destinationId, input.amountCents, input.currencyId,
        input.transferDate, input.type, input.statementId, input.loanId,
        input.description, input.notes, id,
      )
    } else {
      const result = db.prepare(`
        INSERT INTO transfers (
          source_instrument_id, destination_instrument_id, amount_cents, currency_id,
          transfer_date, type, statement_id, loan_id, description, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.sourceId, input.destinationId, input.amountCents, input.currencyId,
        input.transferDate, input.type, input.statementId, input.loanId,
        input.description, input.notes,
      )
      id = Number(result.lastInsertRowid)
    }
    applyTransferImpact(
      db,
      getInstrument(db, input.sourceId),
      getInstrument(db, input.destinationId),
      input.amountCents,
      1,
    )
    if (input.type === 'card_payment') {
      const allocatedStatements = allocateCardPayment(
        db,
        id!,
        input.destinationId,
        input.amountCents,
        input.transferDate,
        input.statementId,
      )
      allocatedStatements.forEach((statementId) => affectedStatements.add(statementId))
    }
    affectedStatements.forEach((statementId) => refreshStatementPayment(db, statementId))
  })
  operation()
  return mapTransfer(asRow(db.prepare(transferSelect('WHERE tr.id = ?')).get(id)))
}

function deleteTransfer(db: Database.Database, id: number): { id: number } {
  const operation = db.transaction(() => {
    const row = requireEntity(db, 'transfers', id)
    const statements = db.prepare(`
      SELECT statement_id FROM statement_payment_allocations WHERE transfer_id = ?
    `).all(id) as Array<{ statement_id: number }>
    applyTransferImpact(
      db,
      getInstrument(db, toNumber(row.source_instrument_id), false),
      getInstrument(db, toNumber(row.destination_instrument_id), false),
      toNumber(row.amount_cents),
      -1,
    )
    db.prepare('DELETE FROM transfers WHERE id = ?').run(id)
    statements.forEach((item) => refreshStatementPayment(db, item.statement_id))
  })
  operation()
  return { id }
}

function validateLoan(db: Database.Database, body: Input): {
  name: string
  lender: string | null
  currencyId: number
  originalAmountCents: number
  annualRate: number | null
  totalInstallments: number
  paymentType: string
  fixedPaymentCents: number | null
  paymentDay: number | null
  paymentFrequency: string
  startDate: string
  endDate: string | null
  instrumentId: number | null
  affectsInstrumentBalance: boolean
  notes: string | null
  isActive: boolean
} {
  const paymentType = requiredEnum(body, 'paymentType', PAYMENT_TYPES)
  const paymentFrequency = body.paymentFrequency === undefined
    ? 'monthly'
    : requiredEnum(body, 'paymentFrequency', LOAN_PAYMENT_FREQUENCIES)
  const fixedPaymentCents = optionalMoneyToCents(body, 'fixedPayment')
  const annualRate = optionalRate(body, 'annualRate')
  if (paymentType === 'fixed' && fixedPaymentCents === null) {
    throw new ValidationError('fixedPayment es obligatorio para prestamos de pago fijo.')
  }
  if (paymentType === 'variable' && annualRate === null) {
    throw new ValidationError('annualRate es obligatoria para prestamos de tasa variable.')
  }
  const instrumentId = optionalInteger(body, 'instrumentId')
  const currencyId = requiredInteger(body, 'currencyId')
  if (instrumentId !== null) {
    const instrument = getInstrument(db, instrumentId)
    if (instrument.type === 'credit_card') {
      throw new ValidationError('El instrumento de pago del prestamo debe ser una cuenta o debito.')
    }
    if (currencyId !== toNumber(instrument.currency_id)) {
      throw new ValidationError('La moneda del prestamo debe coincidir con la cuenta de pago.')
    }
  }
  return {
    name: requiredString(body, 'name', 150),
    lender: optionalString(body, 'lender', 100),
    currencyId,
    originalAmountCents: moneyToCents(body.originalAmount, 'originalAmount'),
    annualRate,
    totalInstallments: requiredInteger(body, 'totalInstallments', 1, 600),
    paymentType,
    fixedPaymentCents,
    paymentDay: paymentFrequency === 'monthly' ? optionalInteger(body, 'paymentDay', 1, 31) : null,
    paymentFrequency,
    startDate: requiredDate(body, 'startDate'),
    endDate: optionalDate(body, 'endDate'),
    instrumentId,
    affectsInstrumentBalance: requiredBoolean(body, 'affectsInstrumentBalance', true),
    notes: optionalString(body, 'notes', 2000),
    isActive: requiredBoolean(body, 'isActive', true),
  }
}

function loanPaymentsPerYear(paymentFrequency: string): number {
  if (paymentFrequency === 'weekly') return 52
  if (paymentFrequency === 'biweekly') return 26
  return 12
}

function loanPaymentDate(
  startDate: string,
  installment: number,
  paymentFrequency: string,
  paymentDay: number | null,
): string {
  if (paymentFrequency === 'weekly') return addDays(startDate, (installment - 1) * 7)
  if (paymentFrequency === 'biweekly') return addDays(startDate, (installment - 1) * 14)
  return addMonths(startDate, installment - 1, paymentDay)
}

function rebuildLoanSchedule(
  db: Database.Database,
  loanId: number,
  originalAmountCents: number,
  annualRate: number | null,
  totalInstallments: number,
  paymentType: string,
  fixedPaymentCents: number | null,
  startDate: string,
  paymentDay: number | null,
  paymentFrequency: string,
): void {
  db.prepare('DELETE FROM loan_payments WHERE loan_id = ?').run(loanId)
  const periodRate = (annualRate ?? 0) / 100 / loanPaymentsPerYear(paymentFrequency)
  const variablePayment = Math.round(originalAmountCents / totalInstallments)
  let remaining = originalAmountCents
  const insert = db.prepare(`
    INSERT INTO loan_payments (
      loan_id, installment_num, amount_cents, principal_cents, interest_cents, payment_date
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)
  for (let installment = 1; installment <= totalInstallments; installment += 1) {
    const interest = Math.round(remaining * periodRate)
    const requestedPayment = paymentType === 'fixed'
      ? (fixedPaymentCents ?? 0)
      : variablePayment
    if (paymentType === 'fixed' && requestedPayment <= interest) {
      throw new ValidationError('El pago fijo debe ser mayor al interes inicial del periodo.')
    }
    const equalPrincipal = Math.round(originalAmountCents / totalInstallments)
    const principal = installment === totalInstallments
      ? remaining
      : paymentType === 'variable'
        ? Math.min(remaining, equalPrincipal)
        : Math.min(remaining, Math.max(1, requestedPayment - interest))
    const amount = principal + interest
    insert.run(
      loanId,
      installment,
      amount,
      principal,
      interest,
      loanPaymentDate(startDate, installment, paymentFrequency, paymentDay),
    )
    remaining -= principal
  }
}

function rebuildRemainingLoanSchedule(db: Database.Database, loanId: number): void {
  const loan = requireEntity(db, 'loans', loanId)
  const pending = db.prepare(`
    SELECT id FROM loan_payments
    WHERE loan_id = ? AND is_paid = 0
    ORDER BY installment_num
  `).all(loanId) as Array<{ id: number }>
  if (pending.length === 0) return
  const paymentFrequency = String(loan.payment_frequency ?? 'monthly')
  const periodRate = (toNumber(loan.annual_rate) || 0) / 100 / loanPaymentsPerYear(paymentFrequency)
  const paymentType = String(loan.payment_type)
  const fixedPayment = toNullableNumber(loan.fixed_payment_cents) ?? 0
  let remaining = toNumber(loan.remaining_amount_cents)
  const equalPrincipal = Math.round(remaining / pending.length)
  const update = db.prepare(`
    UPDATE loan_payments
    SET amount_cents = ?, principal_cents = ?, interest_cents = ?, updated_at = datetime('now')
    WHERE id = ?
  `)
  pending.forEach((payment, index) => {
    const interest = Math.round(remaining * periodRate)
    if (paymentType === 'fixed' && fixedPayment <= interest) {
      throw new ValidationError('El pago fijo ya no cubre el interes del saldo pendiente del periodo.')
    }
    const principal = index === pending.length - 1
      ? remaining
      : paymentType === 'variable'
        ? Math.min(remaining, equalPrincipal)
        : Math.min(remaining, Math.max(1, fixedPayment - interest))
    update.run(principal + interest, principal, interest, payment.id)
    remaining -= principal
  })
}

function listLoans(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare(`${loanSelect()} ORDER BY l.is_active DESC, l.start_date DESC, l.id DESC`).all() as DbRow[])
    .map(mapLoan)
}

function saveLoan(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateLoan(db, body)
  const operation = db.transaction(() => {
    if (id) {
      const previous = requireEntity(db, 'loans', id)
      if (toNumber(previous.paid_installments) > 0) {
        if (
          toNumber(previous.original_amount_cents) !== input.originalAmountCents
          || toNumber(previous.total_installments) !== input.totalInstallments
          || previous.payment_type !== input.paymentType
          || previous.payment_frequency !== input.paymentFrequency
        ) {
          throw new ValidationError('No se pueden cambiar los terminos de un prestamo con pagos registrados.')
        }
        db.prepare(`
          UPDATE loans
          SET name = ?, lender = ?, annual_rate = ?, fixed_payment_cents = ?, payment_day = ?,
              end_date = ?, instrument_id = ?, affects_instrument_balance = ?, notes = ?, is_active = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          input.name, input.lender, input.annualRate, input.fixedPaymentCents, input.paymentDay,
          input.endDate, input.instrumentId, Number(input.affectsInstrumentBalance), input.notes, Number(input.isActive), id,
        )
        rebuildRemainingLoanSchedule(db, id)
        return
      }
      db.prepare(`
        UPDATE loans
        SET name = ?, lender = ?, currency_id = ?, original_amount_cents = ?,
            remaining_amount_cents = ?, annual_rate = ?, total_installments = ?,
            payment_type = ?, fixed_payment_cents = ?, payment_day = ?, payment_frequency = ?, start_date = ?,
            end_date = ?, instrument_id = ?, affects_instrument_balance = ?, notes = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        input.name, input.lender, input.currencyId, input.originalAmountCents,
        input.originalAmountCents, input.annualRate, input.totalInstallments,
        input.paymentType, input.fixedPaymentCents, input.paymentDay, input.paymentFrequency, input.startDate,
        input.endDate, input.instrumentId, Number(input.affectsInstrumentBalance), input.notes, Number(input.isActive), id,
      )
    } else {
      const result = db.prepare(`
        INSERT INTO loans (
          name, lender, currency_id, original_amount_cents, remaining_amount_cents,
          annual_rate, total_installments, payment_type, fixed_payment_cents,
          payment_day, payment_frequency, start_date, end_date, instrument_id, affects_instrument_balance, notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.name, input.lender, input.currencyId, input.originalAmountCents,
        input.originalAmountCents, input.annualRate, input.totalInstallments,
        input.paymentType, input.fixedPaymentCents, input.paymentDay, input.paymentFrequency, input.startDate,
        input.endDate, input.instrumentId, Number(input.affectsInstrumentBalance), input.notes, Number(input.isActive),
      )
      id = Number(result.lastInsertRowid)
    }
    rebuildLoanSchedule(
      db, id!, input.originalAmountCents, input.annualRate, input.totalInstallments,
      input.paymentType, input.fixedPaymentCents, input.startDate, input.paymentDay, input.paymentFrequency,
    )
  })
  operation()
  return mapLoan(asRow(db.prepare(loanSelect('WHERE l.id = ?')).get(id)))
}

function deleteLoan(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'loans', id)
  db.prepare('UPDATE loans SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
  return { id }
}

function listLoanPayments(db: Database.Database, loanId: number): Record<string, unknown>[] {
  requireEntity(db, 'loans', loanId)
  return (db.prepare('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY installment_num').all(loanId) as DbRow[])
    .map(mapLoanPayment)
}

function payLoanInstallment(
  db: Database.Database,
  loanId: number,
  installmentNum: number,
  body: Input,
): Record<string, unknown> {
  const paidDate = optionalDate(body, 'paidDate') ?? todayIso()
  const notes = optionalString(body, 'notes', 2000)
  const operation = db.transaction(() => {
    const loan = requireEntity(db, 'loans', loanId)
    const payment = db.prepare(`
      SELECT * FROM loan_payments WHERE loan_id = ? AND installment_num = ?
    `).get(loanId, installmentNum) as DbRow | undefined
    if (!payment) {
      throw new NotFoundError('La cuota solicitada no existe.')
    }
    if (toBoolean(payment.is_paid)) {
      throw new ValidationError('La cuota ya esta pagada.')
    }
    const amountCents = body.amount === undefined
      ? toNumber(payment.amount_cents)
      : moneyToCents(body.amount, 'amount')
    const interestCents = toNumber(payment.interest_cents)
    if (amountCents <= interestCents) {
      throw new ValidationError('El pago debe cubrir el interes y una parte del capital.')
    }
    const principalCents = Math.min(
      toNumber(loan.remaining_amount_cents),
      amountCents - interestCents,
    )
    const instrumentId = toNullableNumber(loan.instrument_id)
    const affectsInstrumentBalance = toBoolean(loan.affects_instrument_balance)
    if (affectsInstrumentBalance && instrumentId !== null) {
      const instrument = getInstrument(db, instrumentId)
      if (instrument.type === 'credit_card') {
        throw new ValidationError('El pago del prestamo requiere una cuenta o tarjeta de debito.')
      }
      const balanceInstrument = getBalanceInstrument(db, instrument)
      db.prepare(`
        UPDATE financial_instruments
        SET current_amount_cents = current_amount_cents - ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(amountCents, balanceInstrument.id)
    }
    let transactionId: number | null = null
    if (affectsInstrumentBalance && interestCents > 0 && instrumentId !== null) {
      const transaction = db.prepare(`
        INSERT INTO transactions (
          instrument_id, currency_id, type, amount_cents, description,
          transaction_date, notes, affects_balance, source_type, source_id
        ) VALUES (?, ?, 'expense', ?, ?, ?, ?, 0, 'loan_interest', ?)
      `).run(
        instrumentId,
        loan.currency_id,
        interestCents,
        `Interes de ${String(loan.name)}`,
        paidDate,
        notes,
        payment.id,
      )
      transactionId = Number(transaction.lastInsertRowid)
    }
    db.prepare(`
      UPDATE loan_payments
      SET amount_cents = ?, principal_cents = ?, interest_cents = ?, is_paid = 1,
          paid_date = ?, notes = ?, transaction_id = ?, affects_instrument_balance = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      amountCents, principalCents, interestCents, paidDate, notes, transactionId,
      Number(affectsInstrumentBalance), payment.id,
    )
    db.prepare(`
      UPDATE loans
      SET remaining_amount_cents = MAX(remaining_amount_cents - ?, 0),
          paid_installments = paid_installments + 1,
          is_active = CASE WHEN paid_installments + 1 >= total_installments THEN 0 ELSE is_active END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(principalCents, loanId)
    db.prepare(`
      UPDATE reminders
      SET is_dismissed = 1, updated_at = datetime('now')
      WHERE reference_type = 'loan_payment' AND reference_id = ?
    `).run(payment.id)
    rebuildRemainingLoanSchedule(db, loanId)
  })
  operation()
  const loan = mapLoan(asRow(db.prepare(loanSelect('WHERE l.id = ?')).get(loanId)))
  const payment = mapLoanPayment(asRow(db.prepare(`
    SELECT * FROM loan_payments WHERE loan_id = ? AND installment_num = ?
  `).get(loanId, installmentNum)))
  return { loan, payment }
}

function undoLoanInstallment(
  db: Database.Database,
  loanId: number,
  installmentNum: number,
): Record<string, unknown> {
  const operation = db.transaction(() => {
    const loan = requireEntity(db, 'loans', loanId)
    const payment = db.prepare(`
      SELECT * FROM loan_payments WHERE loan_id = ? AND installment_num = ?
    `).get(loanId, installmentNum) as DbRow | undefined
    if (!payment || !toBoolean(payment.is_paid)) {
      throw new ValidationError('La cuota no esta pagada.')
    }
    const instrumentId = toNullableNumber(loan.instrument_id)
    if (toBoolean(payment.affects_instrument_balance) && instrumentId !== null) {
      const instrument = getBalanceInstrument(db, getInstrument(db, instrumentId, false))
      db.prepare(`
        UPDATE financial_instruments
        SET current_amount_cents = current_amount_cents + ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(toNumber(payment.amount_cents), instrument.id)
    }
    const transactionId = toNullableNumber(payment.transaction_id)
    db.prepare(`
      UPDATE loan_payments
      SET is_paid = 0, paid_date = NULL, notes = NULL, transaction_id = NULL,
          affects_instrument_balance = 1,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(payment.id)
    if (transactionId !== null) {
      db.prepare('DELETE FROM transactions WHERE id = ?').run(transactionId)
    }
    const paid = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(principal_cents), 0) AS principal
      FROM loan_payments WHERE loan_id = ? AND is_paid = 1
    `).get(loanId) as { count: number; principal: number }
    db.prepare(`
      UPDATE loans
      SET remaining_amount_cents = MAX(original_amount_cents - ?, 0),
          paid_installments = ?, is_active = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(paid.principal, paid.count, loanId)
    rebuildRemainingLoanSchedule(db, loanId)
  })
  operation()
  return {
    loan: mapLoan(asRow(db.prepare(loanSelect('WHERE l.id = ?')).get(loanId))),
    payment: mapLoanPayment(asRow(db.prepare(`
      SELECT * FROM loan_payments WHERE loan_id = ? AND installment_num = ?
    `).get(loanId, installmentNum))),
  }
}

function validateSubscription(db: Database.Database, body: Input): {
  name: string
  instrumentId: number
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  amountCents: number
  billingCycle: string
  billingDay: number | null
  nextBilling: string | null
  isActive: boolean
  notes: string | null
} {
  const instrumentId = requiredInteger(body, 'instrumentId')
  const instrument = getInstrument(db, instrumentId)
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  if (categoryId !== null) {
    const category = requireEntity(db, 'categories', categoryId)
    if (category.type !== 'expense' && category.type !== 'both') {
      throw new ValidationError('La suscripcion requiere una categoria de gasto.')
    }
  }
  const currencyId = requiredInteger(body, 'currencyId')
  if (currencyId !== toNumber(instrument.currency_id)) {
    throw new ValidationError('La moneda debe coincidir con la del instrumento.')
  }
  return {
    name: requiredString(body, 'name', 150),
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId,
    amountCents: moneyToCents(body.amount, 'amount'),
    billingCycle: requiredEnum(body, 'billingCycle', BILLING_CYCLES),
    billingDay: optionalInteger(body, 'billingDay', 1, 31),
    nextBilling: optionalDate(body, 'nextBilling'),
    isActive: requiredBoolean(body, 'isActive', true),
    notes: optionalString(body, 'notes', 2000),
  }
}

function listSubscriptions(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare(`${subscriptionSelect()} ORDER BY s.is_active DESC, s.next_billing, s.name`).all() as DbRow[])
    .map(mapSubscription)
}

function saveSubscription(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateSubscription(db, body)
  if (id) {
    requireEntity(db, 'subscriptions', id)
    db.prepare(`
      UPDATE subscriptions
      SET name = ?, instrument_id = ?, category_id = ?, subcategory_id = ?, currency_id = ?,
          amount_cents = ?, billing_cycle = ?, billing_day = ?, next_billing = ?,
          is_active = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      input.name, input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId,
      input.amountCents, input.billingCycle, input.billingDay, input.nextBilling,
      Number(input.isActive), input.notes, id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO subscriptions (
        name, instrument_id, category_id, subcategory_id, currency_id, amount_cents,
        billing_cycle, billing_day, next_billing, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name, input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId,
      input.amountCents, input.billingCycle, input.billingDay, input.nextBilling,
      Number(input.isActive), input.notes,
    )
    id = Number(result.lastInsertRowid)
  }
  return mapSubscription(asRow(db.prepare(subscriptionSelect('WHERE s.id = ?')).get(id)))
}

function deleteSubscription(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'subscriptions', id)
  db.prepare('UPDATE subscriptions SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
  return { id }
}

function nextSubscriptionDate(current: string, cycle: string, billingDay: number | null): string {
  if (cycle === 'weekly') {
    return addDays(current, 7)
  }
  if (cycle === 'yearly') {
    return addMonths(current, 12, billingDay)
  }
  return addMonths(current, 1, billingDay)
}

function processDueSubscriptions(db: Database.Database): void {
  const due = db.prepare(`
    SELECT s.* FROM subscriptions s
    JOIN financial_instruments i ON i.id = s.instrument_id AND i.is_active = 1
    WHERE s.is_active = 1 AND s.next_billing IS NOT NULL AND s.next_billing <= date('now', 'localtime')
    ORDER BY s.next_billing
    LIMIT 100
  `).all() as DbRow[]
  if (due.length === 0) {
    return
  }
  const operation = db.transaction(() => {
    for (const subscription of due) {
      let chargeDate = String(subscription.next_billing)
      let processed = 0
      while (chargeDate <= todayIso() && processed < 24) {
        const note = `LOCAL_SUBSCRIPTION:${subscription.id}:${chargeDate}`
        const exists = db.prepare('SELECT id FROM transactions WHERE notes = ?').get(note)
        if (!exists) {
          const result = db.prepare(`
            INSERT INTO transactions (
              instrument_id, category_id, subcategory_id, currency_id, type,
              amount_cents, description, transaction_date, notes,
              affects_balance, source_type, source_id
            ) VALUES (?, ?, ?, ?, 'expense', ?, ?, ?, ?, 1, 'subscription', ?)
          `).run(
            subscription.instrument_id, subscription.category_id, subscription.subcategory_id,
            subscription.currency_id, subscription.amount_cents,
            `Cargo automatico: ${subscription.name}`, chargeDate, note, subscription.id,
          )
          if (result.changes > 0) {
            const instrumentId = toNumber(subscription.instrument_id)
            applyInstrumentImpact(
              db,
              getInstrument(db, instrumentId),
              'expense',
              toNumber(subscription.amount_cents),
              1,
            )
            refreshInstrumentStatements(db, instrumentId)
          }
        }
        chargeDate = nextSubscriptionDate(
          chargeDate,
          String(subscription.billing_cycle),
          toNullableNumber(subscription.billing_day),
        )
        processed += 1
      }
      db.prepare(`
        UPDATE subscriptions SET next_billing = ?, updated_at = datetime('now') WHERE id = ?
      `).run(chargeDate, subscription.id)
      db.prepare(`
        UPDATE reminders
        SET is_dismissed = 1, updated_at = datetime('now')
        WHERE reference_type = 'subscription' AND reference_id = ? AND reminder_date < ?
      `).run(subscription.id, chargeDate)
    }
  })
  operation()
}

function recurringIncomeSelect(where = ''): string {
  return `
    SELECT r.*, i.name AS instrument_name, c.name AS category_name,
           s.name AS subcategory_name
    FROM recurring_incomes r
    JOIN financial_instruments i ON i.id = r.instrument_id
    LEFT JOIN categories c ON c.id = r.category_id
    LEFT JOIN subcategories s ON s.id = r.subcategory_id
    ${where}
  `
}

function nextRecurringIncomeDate(
  current: string,
  frequency: string,
  paymentDay: number | null,
  secondPaymentDay: number | null,
): string {
  if (frequency === 'weekly') return addDays(current, 7)
  if (frequency === 'biweekly') {
    if (paymentDay === null || secondPaymentDay === null) return addDays(current, 14)
    const monthStart = `${current.slice(0, 7)}-01`
    const firstPayment = addMonths(monthStart, 0, paymentDay)
    const secondPayment = addMonths(monthStart, 0, secondPaymentDay)
    if (current < firstPayment) return firstPayment
    if (current < secondPayment) return secondPayment
    return addMonths(monthStart, 1, paymentDay)
  }
  if (frequency === 'yearly') return addMonths(current, 12, paymentDay)
  return addMonths(current, 1, paymentDay)
}

function listRecurringIncomes(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare(`
    ${recurringIncomeSelect()}
    ORDER BY r.is_active DESC, r.next_payment, r.name
  `).all() as DbRow[]).map(mapRecurringIncome)
}

function saveRecurringIncome(
  db: Database.Database,
  body: Input,
  id?: number,
): Record<string, unknown> {
  const instrumentId = requiredInteger(body, 'instrumentId')
  const instrument = getInstrument(db, instrumentId)
  if (instrument.type === 'credit_card') {
    throw new ValidationError('Un ingreso recurrente requiere una cuenta o tarjeta de debito.')
  }
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  if (categoryId !== null) {
    const category = requireEntity(db, 'categories', categoryId)
    if (category.type !== 'income' && category.type !== 'both') {
      throw new ValidationError('El ingreso recurrente requiere una categoria de ingreso.')
    }
  }
  const currencyId = requiredInteger(body, 'currencyId')
  if (currencyId !== toNumber(instrument.currency_id)) {
    throw new ValidationError('La moneda debe coincidir con la del instrumento.')
  }
  const frequency = requiredEnum(body, 'frequency', RECURRING_INCOME_FREQUENCIES)
  const paymentDay = optionalInteger(body, 'paymentDay', 1, 31)
  const secondPaymentDay = frequency === 'biweekly'
    ? optionalInteger(body, 'secondPaymentDay', 1, 31)
    : null
  if (frequency === 'biweekly' && (paymentDay === null) !== (secondPaymentDay === null)) {
    throw new ValidationError('Un ingreso quincenal con dias fijos requiere ambos dias de pago.')
  }
  if (paymentDay !== null && secondPaymentDay !== null && paymentDay >= secondPaymentDay) {
    throw new ValidationError('El segundo dia de pago quincenal debe ser posterior al primero.')
  }
  if (id === undefined && frequency === 'biweekly' && paymentDay === null && secondPaymentDay === null) {
    throw new ValidationError('Define los dos dias de pago para un ingreso quincenal nuevo.')
  }
  const values = {
    name: requiredString(body, 'name', 150),
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId,
    amountCents: moneyToCents(body.amount, 'amount'),
    frequency,
    paymentDay,
    secondPaymentDay,
    nextPayment: requiredDate(body, 'nextPayment'),
    isActive: requiredBoolean(body, 'isActive', true),
    notes: optionalString(body, 'notes', 2000),
  }
  if (id) {
    requireEntity(db, 'recurring_incomes', id)
    db.prepare(`
      UPDATE recurring_incomes
      SET name = ?, instrument_id = ?, category_id = ?, subcategory_id = ?,
          currency_id = ?, amount_cents = ?, frequency = ?, payment_day = ?, second_payment_day = ?,
          next_payment = ?, is_active = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      values.name, values.instrumentId, values.categoryId, values.subcategoryId,
      values.currencyId, values.amountCents, values.frequency, values.paymentDay, values.secondPaymentDay,
      values.nextPayment, Number(values.isActive), values.notes, id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO recurring_incomes (
        name, instrument_id, category_id, subcategory_id, currency_id,
        amount_cents, frequency, payment_day, second_payment_day, next_payment, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      values.name, values.instrumentId, values.categoryId, values.subcategoryId,
      values.currencyId, values.amountCents, values.frequency, values.paymentDay, values.secondPaymentDay,
      values.nextPayment, Number(values.isActive), values.notes,
    )
    id = Number(result.lastInsertRowid)
  }
  return mapRecurringIncome(asRow(
    db.prepare(recurringIncomeSelect('WHERE r.id = ?')).get(id),
  ))
}

function deleteRecurringIncome(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'recurring_incomes', id)
  db.prepare(`
    UPDATE recurring_incomes
    SET is_active = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run(id)
  return { id }
}

function processDueRecurringIncomes(db: Database.Database): void {
  const due = db.prepare(`
    SELECT r.* FROM recurring_incomes r
    JOIN financial_instruments i ON i.id = r.instrument_id AND i.is_active = 1
    WHERE r.is_active = 1 AND r.next_payment <= ?
    ORDER BY r.next_payment
    LIMIT 100
  `).all(todayIso()) as DbRow[]
  if (due.length === 0) return
  const operation = db.transaction(() => {
    for (const income of due) {
      let paymentDate = String(income.next_payment)
      let processed = 0
      while (paymentDate <= todayIso() && processed < 24) {
        const note = `LOCAL_RECURRING_INCOME:${income.id}:${paymentDate}`
        const exists = db.prepare('SELECT id FROM transactions WHERE notes = ?').get(note)
        if (!exists) {
          const result = db.prepare(`
            INSERT INTO transactions (
              instrument_id, category_id, subcategory_id, currency_id, type,
              amount_cents, description, transaction_date, notes, affects_balance,
              source_type, source_id
            ) VALUES (?, ?, ?, ?, 'income', ?, ?, ?, ?, 1, 'recurring_income', ?)
          `).run(
            income.instrument_id, income.category_id, income.subcategory_id,
            income.currency_id, income.amount_cents,
            `Ingreso automatico: ${String(income.name)}`, paymentDate, note, income.id,
          )
          if (result.changes > 0) {
            applyInstrumentImpact(
              db,
              getInstrument(db, toNumber(income.instrument_id)),
              'income',
              toNumber(income.amount_cents),
              1,
            )
          }
        }
        paymentDate = nextRecurringIncomeDate(
          paymentDate,
          String(income.frequency),
          toNullableNumber(income.payment_day),
          toNullableNumber(income.second_payment_day),
        )
        processed += 1
      }
      db.prepare(`
        UPDATE recurring_incomes
        SET next_payment = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(paymentDate, income.id)
    }
  })
  operation()
}

function listSavingsGoals(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare(`
    SELECT g.*, i.name AS instrument_name
    FROM savings_goals g
    LEFT JOIN financial_instruments i ON i.id = g.instrument_id
    ORDER BY g.is_active DESC, g.target_date, g.name
  `).all() as DbRow[]).map(mapSavingsGoal)
}

function saveSavingsGoal(
  db: Database.Database,
  body: Input,
  id?: number,
): Record<string, unknown> {
  const instrumentId = optionalInteger(body, 'instrumentId')
  if (instrumentId !== null) {
    const instrument = getInstrument(db, instrumentId)
    if (instrument.type === 'credit_card') {
      throw new ValidationError('Una meta debe vincularse a una cuenta de ahorro.')
    }
  }
  const values = {
    name: requiredString(body, 'name', 150),
    targetAmountCents: moneyToCents(body.targetAmount, 'targetAmount'),
    currentAmountCents: moneyToCents(body.currentAmount, 'currentAmount', true),
    targetDate: optionalDate(body, 'targetDate'),
    instrumentId,
    notes: optionalString(body, 'notes', 2000),
    isActive: requiredBoolean(body, 'isActive', true),
  }
  if (id) {
    requireEntity(db, 'savings_goals', id)
    db.prepare(`
      UPDATE savings_goals
      SET name = ?, target_amount_cents = ?, current_amount_cents = ?,
          target_date = ?, instrument_id = ?, notes = ?, is_active = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      values.name, values.targetAmountCents, values.currentAmountCents,
      values.targetDate, values.instrumentId, values.notes, Number(values.isActive), id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO savings_goals (
        name, target_amount_cents, current_amount_cents, target_date,
        instrument_id, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      values.name, values.targetAmountCents, values.currentAmountCents,
      values.targetDate, values.instrumentId, values.notes, Number(values.isActive),
    )
    id = Number(result.lastInsertRowid)
  }
  return mapSavingsGoal(asRow(db.prepare(`
    SELECT g.*, i.name AS instrument_name
    FROM savings_goals g
    LEFT JOIN financial_instruments i ON i.id = g.instrument_id
    WHERE g.id = ?
  `).get(id)))
}

function deleteSavingsGoal(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'savings_goals', id)
  db.prepare(`
    UPDATE savings_goals SET is_active = 0, updated_at = datetime('now') WHERE id = ?
  `).run(id)
  return { id }
}

function validateFixedExpense(db: Database.Database, body: Input): {
  name: string
  instrumentId: number | null
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  estimatedAmountCents: number
  isVariable: boolean
  paymentDay: number | null
  isActive: boolean
  notes: string | null
} {
  const instrumentId = optionalInteger(body, 'instrumentId')
  const instrument = instrumentId === null ? null : getInstrument(db, instrumentId)
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  if (categoryId !== null) {
    const category = requireEntity(db, 'categories', categoryId)
    if (category.type !== 'expense' && category.type !== 'both') {
      throw new ValidationError('El gasto fijo requiere una categoria de gasto.')
    }
  }
  const currencyId = requiredInteger(body, 'currencyId')
  if (instrument && currencyId !== toNumber(instrument.currency_id)) {
    throw new ValidationError('La moneda debe coincidir con la del instrumento.')
  }
  return {
    name: requiredString(body, 'name', 150),
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId,
    estimatedAmountCents: moneyToCents(body.estimatedAmount, 'estimatedAmount'),
    isVariable: requiredBoolean(body, 'isVariable', false),
    paymentDay: optionalInteger(body, 'paymentDay', 1, 31),
    isActive: requiredBoolean(body, 'isActive', true),
    notes: optionalString(body, 'notes', 2000),
  }
}

function listFixedExpenses(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare(`${fixedExpenseSelect()} ORDER BY f.is_active DESC, f.payment_day, f.name`).all() as DbRow[])
    .map(mapFixedExpense)
}

function saveFixedExpense(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateFixedExpense(db, body)
  if (id) {
    requireEntity(db, 'fixed_expenses', id)
    db.prepare(`
      UPDATE fixed_expenses
      SET name = ?, instrument_id = ?, category_id = ?, subcategory_id = ?, currency_id = ?,
          estimated_amount_cents = ?, is_variable = ?, payment_day = ?, is_active = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      input.name, input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId,
      input.estimatedAmountCents, Number(input.isVariable), input.paymentDay,
      Number(input.isActive), input.notes, id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO fixed_expenses (
        name, instrument_id, category_id, subcategory_id, currency_id,
        estimated_amount_cents, is_variable, payment_day, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name, input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId,
      input.estimatedAmountCents, Number(input.isVariable), input.paymentDay,
      Number(input.isActive), input.notes,
    )
    id = Number(result.lastInsertRowid)
  }
  return mapFixedExpense(asRow(db.prepare(fixedExpenseSelect('WHERE f.id = ?')).get(id)))
}

function deleteFixedExpense(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'fixed_expenses', id)
  db.prepare('UPDATE fixed_expenses SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(id)
  return { id }
}

function listFixedExpensePayments(db: Database.Database, fixedExpenseId: number): Record<string, unknown>[] {
  requireEntity(db, 'fixed_expenses', fixedExpenseId)
  return (db.prepare(`
    SELECT * FROM fixed_expense_payments
    WHERE fixed_expense_id = ?
    ORDER BY period_year DESC, period_month DESC
  `).all(fixedExpenseId) as DbRow[]).map(mapFixedExpensePayment)
}

function saveFixedExpensePayment(
  db: Database.Database,
  fixedExpenseId: number,
  body: Input,
  paymentId?: number,
): Record<string, unknown> {
  const fixedExpense = requireEntity(db, 'fixed_expenses', fixedExpenseId)
  const amountCents = moneyToCents(body.amount, 'amount')
  const periodMonth = requiredInteger(body, 'periodMonth', 1, 12)
  const periodYear = requiredInteger(body, 'periodYear', 2000, 2200)
  const paymentDate = optionalDate(body, 'paymentDate')
  const isPaid = requiredBoolean(body, 'isPaid', false)
  const notes = optionalString(body, 'notes', 2000)
  const operation = db.transaction(() => {
    if (paymentId) {
      const payment = requireEntity(db, 'fixed_expense_payments', paymentId)
      if (toNumber(payment.fixed_expense_id) !== fixedExpenseId) {
        throw new ValidationError('El pago no pertenece al gasto fijo indicado.')
      }
      const transactionId = toNullableNumber(payment.transaction_id)
      if (transactionId !== null) {
        db.prepare(`
          UPDATE fixed_expense_payments SET transaction_id = NULL WHERE id = ?
        `).run(paymentId)
        deleteTransaction(db, transactionId)
      }
      db.prepare(`
        UPDATE fixed_expense_payments
        SET amount_cents = ?, period_month = ?, period_year = ?, payment_date = ?,
            is_paid = ?, notes = ?, transaction_id = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(amountCents, periodMonth, periodYear, paymentDate, Number(isPaid), notes, paymentId)
    } else {
      const result = db.prepare(`
        INSERT INTO fixed_expense_payments (
          fixed_expense_id, amount_cents, period_month, period_year, payment_date, is_paid, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(fixedExpenseId, amountCents, periodMonth, periodYear, paymentDate, Number(isPaid), notes)
      paymentId = Number(result.lastInsertRowid)
    }
    const instrumentId = toNullableNumber(fixedExpense.instrument_id)
    if (isPaid && instrumentId !== null) {
      const transaction = saveTransaction(db, {
        instrumentId,
        categoryId: toNullableNumber(fixedExpense.category_id),
        subcategoryId: toNullableNumber(fixedExpense.subcategory_id),
        currencyId: toNumber(fixedExpense.currency_id),
        type: 'expense',
        amount: amountCents / 100,
        description: `Pago de ${String(fixedExpense.name)}`,
        transactionDate: paymentDate ?? `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
        notes,
        isMsi: false,
        affectsBalance: true,
        sourceType: 'fixed_expense',
        sourceId: paymentId,
      }, undefined, true)
      db.prepare(`
        UPDATE fixed_expense_payments SET transaction_id = ? WHERE id = ?
      `).run(toNumber(transaction.id), paymentId)
    }
  })
  operation()
  return mapFixedExpensePayment(asRow(
    db.prepare('SELECT * FROM fixed_expense_payments WHERE id = ?').get(paymentId),
  ))
}

function deleteFixedExpensePayment(
  db: Database.Database,
  fixedExpenseId: number,
  paymentId: number,
): { id: number } {
  const payment = requireEntity(db, 'fixed_expense_payments', paymentId)
  if (toNumber(payment.fixed_expense_id) !== fixedExpenseId) {
    throw new ValidationError('El pago no pertenece al gasto fijo indicado.')
  }
  const operation = db.transaction(() => {
    const transactionId = toNullableNumber(payment.transaction_id)
    if (transactionId !== null) {
      db.prepare(`
        UPDATE fixed_expense_payments SET transaction_id = NULL WHERE id = ?
      `).run(paymentId)
      deleteTransaction(db, transactionId)
    }
    db.prepare('DELETE FROM fixed_expense_payments WHERE id = ?').run(paymentId)
  })
  operation()
  return { id: paymentId }
}

function budgetSpent(db: Database.Database, categoryId: number | null, month: number, year: number): number {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = addMonths(start, 1)
  const row = categoryId === null
    ? db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
        WHERE type = 'expense' AND transaction_date >= ? AND transaction_date < ?
          AND COALESCE(source_type, '') NOT IN ('reconciliation', 'opening_balance')
      `).get(start, end)
    : db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
        WHERE type = 'expense' AND category_id = ? AND transaction_date >= ? AND transaction_date < ?
          AND COALESCE(source_type, '') NOT IN ('reconciliation', 'opening_balance')
      `).get(categoryId, start, end)
  return toNumber(asRow(row).total)
}

function mapBudget(db: Database.Database, row: DbRow): Record<string, unknown> {
  const amountCents = toNumber(row.amount_cents)
  const spentCents = budgetSpent(
    db,
    toNullableNumber(row.category_id),
    toNumber(row.month),
    toNumber(row.year),
  )
  const progress = amountCents > 0 ? Math.round((spentCents / amountCents) * 10_000) / 100 : 0
  return {
    id: toNumber(row.id),
    categoryId: toNullableNumber(row.category_id),
    categoryName: row.category_name ?? null,
    currencyId: toNumber(row.currency_id),
    amount: fromCents(amountCents),
    month: toNumber(row.month),
    year: toNumber(row.year),
    notes: row.notes ?? null,
    spentAmount: fromCents(spentCents),
    progressPercent: progress,
    status: progress >= 100 ? 'exceeded' : progress >= 80 ? 'warning' : 'under',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function listBudgets(db: Database.Database, url: URL): Record<string, unknown>[] {
  const clauses: string[] = []
  const params: number[] = []
  const month = Number(url.searchParams.get('month'))
  const year = Number(url.searchParams.get('year'))
  if (Number.isInteger(month) && month >= 1 && month <= 12) {
    clauses.push('b.month = ?')
    params.push(month)
  }
  if (Number.isInteger(year) && year >= 2000 && year <= 2200) {
    clauses.push('b.year = ?')
    params.push(year)
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db.prepare(`
    SELECT b.*, c.name AS category_name
    FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
    ${where}
    ORDER BY b.year DESC, b.month DESC, c.name
  `).all(...params) as DbRow[]
  return rows.map((row) => mapBudget(db, row))
}

function saveBudget(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const categoryId = optionalInteger(body, 'categoryId')
  if (categoryId !== null) {
    validateCategoryLinks(db, categoryId, null)
    const category = requireEntity(db, 'categories', categoryId)
    if (category.type !== 'expense' && category.type !== 'both') {
      throw new ValidationError('El presupuesto requiere una categoria de gasto.')
    }
  }
  const currencyId = requiredInteger(body, 'currencyId')
  if (!db.prepare('SELECT id FROM currencies WHERE id = ?').get(currencyId)) {
    throw new ValidationError('La moneda seleccionada no existe.')
  }
  const amountCents = moneyToCents(body.amount, 'amount')
  const month = requiredInteger(body, 'month', 1, 12)
  const year = requiredInteger(body, 'year', 2000, 2200)
  const notes = optionalString(body, 'notes', 2000)
  if (id) {
    requireEntity(db, 'budgets', id)
    db.prepare(`
      UPDATE budgets
      SET category_id = ?, currency_id = ?, amount_cents = ?, month = ?, year = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(categoryId, currencyId, amountCents, month, year, notes, id)
  } else {
    const result = db.prepare(`
      INSERT INTO budgets (category_id, currency_id, amount_cents, month, year, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(categoryId, currencyId, amountCents, month, year, notes)
    id = Number(result.lastInsertRowid)
  }
  const row = asRow(db.prepare(`
    SELECT b.*, c.name AS category_name
    FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.id = ?
  `).get(id))
  return mapBudget(db, row)
}

function deleteBudget(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'budgets', id)
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id)
  return { id }
}

function mapSimulation(row: DbRow): Record<string, unknown> {
  return {
    id: toNumber(row.id),
    name: row.name,
    description: row.description ?? null,
    simulationDate: row.simulation_date,
    snapshotJson: JSON.parse(String(row.snapshot_json)) as Record<string, unknown>,
    resultJson: JSON.parse(String(row.result_json)) as Record<string, unknown>,
    isFavorable: row.is_favorable === null ? null : toBoolean(row.is_favorable),
    createdAt: row.created_at,
  }
}

function listSimulations(db: Database.Database): Record<string, unknown>[] {
  return (db.prepare('SELECT * FROM simulations ORDER BY simulation_date DESC, id DESC').all() as DbRow[])
    .map(mapSimulation)
}

function saveSimulation(db: Database.Database, body: Input): Record<string, unknown> {
  const name = requiredString(body, 'name', 150)
  const description = optionalString(body, 'description', 2000)
  const simulationDate = optionalDate(body, 'simulationDate') ?? todayIso()
  const scenarioType = requiredEnum(body, 'scenarioType', SIMULATION_TYPES)
  const amountCents = moneyToCents(body.amount, 'amount')
  const instrumentId = optionalInteger(body, 'instrumentId')
  const instrument = instrumentId === null ? null : getInstrument(db, instrumentId)
  const msiMonths = optionalInteger(body, 'msiMonths', 1, 24)
  const loanMonths = optionalInteger(body, 'loanMonths', 1, 600)
  const annualRate = optionalRate(body, 'annualRate')
  if (scenarioType === 'msi' && (!msiMonths || !MSI_MONTHS.has(msiMonths))) {
    throw new ValidationError('La simulacion MSI requiere un plazo permitido.')
  }
  if (scenarioType === 'loan' && !loanMonths) {
    throw new ValidationError('La simulacion de prestamo requiere el numero de meses.')
  }
  const summary = getDashboardSummary(db)
  const obligations = getMonthlyObligationsCents(db)
  const threeMonthsAgo = addMonths(`${todayIso().slice(0, 7)}-01`, -3)
  const averages = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) / 3 AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) / 3 AS expense
    FROM transactions
    WHERE transaction_date >= ?
      AND COALESCE(source_type, '') NOT IN ('reconciliation', 'opening_balance')
  `).get(threeMonthsAgo) as { income: number; expense: number }
  let monthlyImpact = amountCents
  if (scenarioType === 'msi') {
    monthlyImpact = Math.round(amountCents / (msiMonths ?? 1))
  } else if (scenarioType === 'loan') {
    const rate = (annualRate ?? 0) / 100 / 12
    monthlyImpact = rate === 0
      ? Math.round(amountCents / (loanMonths ?? 1))
      : Math.round(amountCents * rate * ((1 + rate) ** (loanMonths ?? 1)) / (((1 + rate) ** (loanMonths ?? 1)) - 1))
  }
  const projectedAvailableCents = Math.round(toNumber(summary.totalAvailable) * 100)
    - (scenarioType === 'direct_purchase' && instrument?.type !== 'credit_card' ? amountCents : 0)
  const creditAvailableCents = instrument?.type === 'credit_card'
    ? toNumber(instrument.credit_limit_cents) - toNumber(instrument.current_balance_cents) - amountCents
    : null
  const averageIncomeCents = Math.round(toNumber(averages.income))
  const averageExpenseCents = Math.round(toNumber(averages.expense))
  const monthlyDisposableCents = averageIncomeCents - Math.max(averageExpenseCents, obligations)
  const emergencyReserveCents = averageExpenseCents * 3
  const debtServiceRatio = averageIncomeCents > 0
    ? (obligations + monthlyImpact) / averageIncomeCents
    : 1
  const projectedCreditUtilization = instrument?.type === 'credit_card'
    ? (
        toNumber(instrument.current_balance_cents) + amountCents
      ) / Math.max(toNumber(instrument.credit_limit_cents), 1)
    : null
  const favorable = projectedAvailableCents >= 0
    && (creditAvailableCents === null || creditAvailableCents >= 0)
    && monthlyDisposableCents >= monthlyImpact
    && debtServiceRatio <= 0.4
    && (projectedCreditUtilization === null || projectedCreditUtilization <= 0.5)
    && (
      scenarioType !== 'direct_purchase'
      || instrument?.type === 'credit_card'
      || projectedAvailableCents >= emergencyReserveCents
    )
  const snapshot = {
    summary,
    monthlyObligations: obligations / 100,
    averageMonthlyIncome: averageIncomeCents / 100,
    averageMonthlyExpense: averageExpenseCents / 100,
    emergencyReserveTarget: emergencyReserveCents / 100,
    instrument: instrument ? mapInstrument(instrument) : null,
  }
  const resultJson = {
    scenarioType,
    amount: amountCents / 100,
    monthlyImpact: monthlyImpact / 100,
    projectedAvailable: projectedAvailableCents / 100,
    projectedCreditAvailable: creditAvailableCents === null ? null : creditAvailableCents / 100,
    monthlyDisposable: monthlyDisposableCents / 100,
    debtServiceRatio: Math.round(debtServiceRatio * 10_000) / 100,
    projectedCreditUtilization: projectedCreditUtilization === null
      ? null
      : Math.round(projectedCreditUtilization * 10_000) / 100,
    isFavorable: favorable,
  }
  const result = db.prepare(`
    INSERT INTO simulations (
      name, description, simulation_date, snapshot_json, result_json, is_favorable
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, description, simulationDate, JSON.stringify(snapshot), JSON.stringify(resultJson), Number(favorable))
  return mapSimulation(asRow(db.prepare('SELECT * FROM simulations WHERE id = ?').get(result.lastInsertRowid)))
}

function deleteSimulation(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'simulations', id)
  db.prepare('DELETE FROM simulations WHERE id = ?').run(id)
  return { id }
}

function listReminders(db: Database.Database, pendingOnly: boolean): Record<string, unknown>[] {
  const where = pendingOnly ? 'WHERE is_read = 0 AND is_dismissed = 0' : ''
  return (db.prepare(`
    SELECT * FROM reminders ${where}
    ORDER BY is_dismissed, is_read, reminder_date, id
  `).all() as DbRow[]).map(mapReminder)
}

function saveReminder(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const title = requiredString(body, 'title', 200)
  const description = optionalString(body, 'description', 2000)
  const reminderDate = requiredDate(body, 'reminderDate')
  const type = requiredEnum(body, 'type', REMINDER_TYPES)
  const referenceId = optionalInteger(body, 'referenceId')
  const referenceType = optionalString(body, 'referenceType', 30)
  const isRead = requiredBoolean(body, 'isRead', false)
  const isDismissed = requiredBoolean(body, 'isDismissed', false)
  if (id) {
    requireEntity(db, 'reminders', id)
    db.prepare(`
      UPDATE reminders
      SET title = ?, description = ?, reminder_date = ?, type = ?, reference_id = ?,
          reference_type = ?, is_read = ?, is_dismissed = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title, description, reminderDate, type, referenceId, referenceType,
      Number(isRead), Number(isDismissed), id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO reminders (
        title, description, reminder_date, type, reference_id, reference_type,
        is_read, is_dismissed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description, reminderDate, type, referenceId, referenceType,
      Number(isRead), Number(isDismissed),
    )
    id = Number(result.lastInsertRowid)
  }
  return mapReminder(asRow(db.prepare('SELECT * FROM reminders WHERE id = ?').get(id)))
}

function deleteReminder(db: Database.Database, id: number): { id: number } {
  requireEntity(db, 'reminders', id)
  db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
  return { id }
}

function deletePendingReminders(db: Database.Database): { deletedCount: number; dismissedCount: number } {
  const operation = db.transaction(() => {
    const dismissed = db.prepare(`
      UPDATE reminders
      SET is_dismissed = 1, updated_at = datetime('now')
      WHERE is_read = 0 AND is_dismissed = 0 AND is_automatic = 1
    `).run()
    const deleted = db.prepare(`
      DELETE FROM reminders
      WHERE is_read = 0 AND is_dismissed = 0
    `).run()
    return { deletedCount: deleted.changes, dismissedCount: dismissed.changes }
  })
  return operation()
}

function deleteDismissedReminders(db: Database.Database): { deletedCount: number } {
  const result = db.prepare(`
    DELETE FROM reminders
    WHERE is_dismissed = 1
  `).run()
  return { deletedCount: result.changes }
}

function dismissAllReminders(db: Database.Database): { dismissedCount: number } {
  const result = db.prepare(`
    UPDATE reminders
    SET is_dismissed = 1, updated_at = datetime('now')
    WHERE is_dismissed = 0
  `).run()
  return { dismissedCount: result.changes }
}

function ensureAutomaticReminders(db: Database.Database): void {
  const until = addDays(todayIso(), 7)
  const exists = db.prepare(`
    SELECT id FROM reminders
    WHERE type = ? AND reference_type = ? AND reference_id = ? AND reminder_date = ?
    LIMIT 1
  `)
  const insert = db.prepare(`
    INSERT INTO reminders (
      title, description, reminder_date, type, reference_id, reference_type, is_automatic
    ) VALUES (?, ?, ?, ?, ?, ?, 1)
  `)
  const statements = db.prepare(`
    SELECT st.id, st.payment_due_date, i.name
    FROM credit_card_statements st
    JOIN financial_instruments i ON i.id = st.instrument_id
    WHERE st.is_paid = 0
      AND st.total_amount_cents > COALESCE(st.paid_amount_cents, 0)
      AND st.payment_due_date <= ?
  `).all(until) as Array<{ id: number; payment_due_date: string; name: string }>
  for (const statement of statements) {
    if (!exists.get('payment', 'statement', statement.id, statement.payment_due_date)) {
      insert.run(
        `Pago de tarjeta: ${statement.name}`,
        'Tienes un estado de cuenta pendiente.',
        statement.payment_due_date,
        'payment',
        statement.id,
        'statement',
      )
    }
  }
  const loanPayments = db.prepare(`
    SELECT p.id, p.payment_date, l.name
    FROM loan_payments p
    JOIN loans l ON l.id = p.loan_id
    WHERE p.is_paid = 0 AND l.is_active = 1 AND p.payment_date <= ?
  `).all(until) as Array<{ id: number; payment_date: string; name: string }>
  for (const payment of loanPayments) {
    if (!exists.get('loan', 'loan_payment', payment.id, payment.payment_date)) {
      insert.run(
        `Cuota de prestamo: ${payment.name}`,
        'Tienes una cuota de prestamo proxima.',
        payment.payment_date,
        'loan',
        payment.id,
        'loan_payment',
      )
    }
  }
  const subscriptions = db.prepare(`
    SELECT id, name, next_billing
    FROM subscriptions
    WHERE is_active = 1 AND next_billing IS NOT NULL AND next_billing <= ?
  `).all(until) as Array<{ id: number; name: string; next_billing: string }>
  for (const subscription of subscriptions) {
    if (!exists.get('subscription', 'subscription', subscription.id, subscription.next_billing)) {
      insert.run(
        `Suscripcion: ${subscription.name}`,
        'Se aproxima un cargo recurrente.',
        subscription.next_billing,
        'subscription',
        subscription.id,
        'subscription',
      )
    }
  }
}

function getDashboardSummary(db: Database.Database): Record<string, number> {
  const instruments = db.prepare(`
    SELECT
      COALESCE(SUM(CASE
        WHEN type = 'account' OR (type = 'debit_card' AND linked_account_id IS NULL)
        THEN current_amount_cents ELSE 0 END), 0) AS available,
      COALESCE(SUM(CASE WHEN type = 'credit_card' THEN MAX(current_balance_cents, 0) ELSE 0 END), 0) AS credit_debt,
      COALESCE(SUM(CASE WHEN type = 'credit_card' THEN available_credit_cents ELSE 0 END), 0) AS available_credit
    FROM financial_instruments WHERE is_active = 1
  `).get() as { available: number; credit_debt: number; available_credit: number }
  const loans = db.prepare(`
    SELECT COALESCE(SUM(remaining_amount_cents), 0) AS total FROM loans WHERE is_active = 1
  `).get() as { total: number }
  const totalAvailable = toNumber(instruments.available) / 100
  const totalCreditDebt = toNumber(instruments.credit_debt) / 100
  const totalLoanDebt = toNumber(loans.total) / 100
  return {
    totalAvailable,
    totalCreditDebt,
    totalLoanDebt,
    totalAvailableCredit: toNumber(instruments.available_credit) / 100,
    netBalance: totalAvailable - totalCreditDebt - totalLoanDebt,
  }
}

function getDashboardUpcomingCommitments(db: Database.Database): Record<string, unknown> {
  const startDate = todayIso()
  const endDate = addDays(startDate, 30)
  type Commitment = {
    id: string
    name: string
    date: string
    amountCents: number
    type: 'subscription' | 'fixed_expense' | 'loan_payment' | 'card_payment'
    instrumentName: string | null
    affectsAvailableBalance: boolean
  }
  const commitments: Commitment[] = []

  const subscriptions = db.prepare(`
    SELECT s.id, s.name, s.next_billing, s.amount_cents, i.name AS instrument_name
    FROM subscriptions s
    JOIN financial_instruments i ON i.id = s.instrument_id
    WHERE s.is_active = 1 AND s.next_billing BETWEEN ? AND ?
  `).all(startDate, endDate) as Array<{
    id: number
    name: string
    next_billing: string
    amount_cents: number
    instrument_name: string | null
  }>
  for (const subscription of subscriptions) {
    commitments.push({
      id: `subscription-${subscription.id}`,
      name: subscription.name,
      date: subscription.next_billing,
      amountCents: toNumber(subscription.amount_cents),
      type: 'subscription',
      instrumentName: subscription.instrument_name,
      affectsAvailableBalance: true,
    })
  }

  const fixedExpenses = db.prepare(`
    SELECT f.id, f.name, f.payment_day, f.estimated_amount_cents, i.name AS instrument_name
    FROM fixed_expenses f
    LEFT JOIN financial_instruments i ON i.id = f.instrument_id
    WHERE f.is_active = 1 AND f.payment_day IS NOT NULL
  `).all() as Array<{
    id: number
    name: string
    payment_day: number
    estimated_amount_cents: number
    instrument_name: string | null
  }>
  for (const expense of fixedExpenses) {
    const paymentDate = nextMonthlyDateOnOrAfter(startDate, toNumber(expense.payment_day))
    if (paymentDate <= endDate) {
      commitments.push({
        id: `fixed-expense-${expense.id}-${paymentDate}`,
        name: expense.name,
        date: paymentDate,
        amountCents: toNumber(expense.estimated_amount_cents),
        type: 'fixed_expense',
        instrumentName: expense.instrument_name,
        affectsAvailableBalance: true,
      })
    }
  }

  const loanPayments = db.prepare(`
    SELECT p.id, l.name, p.payment_date, p.amount_cents, l.affects_instrument_balance,
           i.name AS instrument_name
    FROM loan_payments p
    JOIN loans l ON l.id = p.loan_id
    LEFT JOIN financial_instruments i ON i.id = l.instrument_id
    WHERE p.is_paid = 0 AND l.is_active = 1 AND p.payment_date BETWEEN ? AND ?
  `).all(startDate, endDate) as Array<{
    id: number
    name: string
    payment_date: string
    amount_cents: number
    affects_instrument_balance: number
    instrument_name: string | null
  }>
  for (const payment of loanPayments) {
    commitments.push({
      id: `loan-payment-${payment.id}`,
      name: payment.name,
      date: payment.payment_date,
      amountCents: toNumber(payment.amount_cents),
      type: 'loan_payment',
      instrumentName: payment.instrument_name,
      affectsAvailableBalance: toBoolean(payment.affects_instrument_balance),
    })
  }

  const cardPayments = db.prepare(`
    SELECT st.id, i.name, st.payment_due_date,
           MAX(st.total_amount_cents - COALESCE(st.paid_amount_cents, 0), 0) AS amount_cents
    FROM credit_card_statements st
    JOIN financial_instruments i ON i.id = st.instrument_id
    WHERE st.is_paid = 0 AND st.payment_due_date BETWEEN ? AND ?
      AND st.total_amount_cents > COALESCE(st.paid_amount_cents, 0)
  `).all(startDate, endDate) as Array<{
    id: number
    name: string
    payment_due_date: string
    amount_cents: number
  }>
  for (const payment of cardPayments) {
    commitments.push({
      id: `card-payment-${payment.id}`,
      name: `Pago de tarjeta: ${payment.name}`,
      date: payment.payment_due_date,
      amountCents: toNumber(payment.amount_cents),
      type: 'card_payment',
      instrumentName: payment.name,
      affectsAvailableBalance: true,
    })
  }

  commitments.sort((first, second) => first.date.localeCompare(second.date) || first.name.localeCompare(second.name))
  const totalCents = commitments.reduce(
    (sum, commitment) => sum + (commitment.affectsAvailableBalance ? commitment.amountCents : 0),
    0,
  )
  const summary = getDashboardSummary(db)
  return {
    total: totalCents / 100,
    availableAfterCommitments: summary.totalAvailable - totalCents / 100,
    items: commitments.map(({ amountCents, ...commitment }) => ({
      ...commitment,
      amount: amountCents / 100,
    })),
  }
}

function getDashboardExpensePeriod(db: Database.Database): string {
  const row = db.prepare(`
    SELECT value FROM app_metadata WHERE key = 'dashboard_expense_period'
  `).get() as { value: string } | undefined
  return row && DASHBOARD_EXPENSE_PERIODS.has(row.value) ? row.value : DASHBOARD_EXPENSE_PERIOD_DEFAULT
}

function getDashboardPreferences(db: Database.Database): Record<string, unknown> {
  return { expensePeriod: getDashboardExpensePeriod(db) }
}

function saveDashboardPreferences(db: Database.Database, body: Input): Record<string, unknown> {
  const expensePeriod = requiredEnum(body, 'expensePeriod', DASHBOARD_EXPENSE_PERIODS)
  db.prepare(`
    INSERT INTO app_metadata (key, value)
    VALUES ('dashboard_expense_period', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(expensePeriod)
  return { expensePeriod }
}

function getDashboardExpensesByCategory(db: Database.Database, period: string): Record<string, unknown>[] {
  if (!DASHBOARD_EXPENSE_PERIODS.has(period)) {
    throw new ValidationError('El periodo de gastos no es valido.')
  }
  const currentMonth = `${todayIso().slice(0, 7)}-01`
  const periods: Record<string, { start: string; end: string }> = {
    current_month: { start: currentMonth, end: addMonths(currentMonth, 1) },
    previous_month: { start: addMonths(currentMonth, -1), end: currentMonth },
    last_3_months: { start: addMonths(currentMonth, -2), end: addMonths(currentMonth, 1) },
    last_year: { start: addMonths(currentMonth, -11), end: addMonths(currentMonth, 1) },
  }
  const selectedPeriod = periods[period]
  const rows = db.prepare(`
    SELECT COALESCE(c.name, 'Sin categoria') AS category, SUM(t.amount_cents) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND COALESCE(t.source_type, '') NOT IN ('reconciliation', 'opening_balance')
      AND t.transaction_date >= ?
      AND t.transaction_date < ?
    GROUP BY COALESCE(c.name, 'Sin categoria')
    ORDER BY total DESC
  `).all(selectedPeriod.start, selectedPeriod.end) as Array<{ category: string; total: number }>
  return rows.map((row) => ({ category: row.category, total: row.total / 100 }))
}

function monthSequence(count: number, includeCurrent = true): Array<{ start: string; label: string }> {
  const current = `${todayIso().slice(0, 7)}-01`
  const months: Array<{ start: string; label: string }> = []
  const firstOffset = includeCurrent ? -(count - 1) : 1
  for (let index = 0; index < count; index += 1) {
    const start = addMonths(current, firstOffset + index)
    const date = new Date(`${start}T00:00:00Z`)
    const label = new Intl.DateTimeFormat('es-MX', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(date)
    months.push({ start, label })
  }
  return months
}

function getDashboardCashFlow(db: Database.Database): Record<string, unknown>[] {
  return monthSequence(6).map(({ start, label }) => {
    const end = addMonths(start, 1)
    const row = db.prepare(`
      SELECT
        COALESCE(SUM(CASE
          WHEN t.type = 'income' AND t.affects_balance = 1
            AND i.type IN ('account', 'debit_card')
          THEN t.amount_cents ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount_cents ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE
          WHEN t.affects_balance = 1 AND t.type = 'expense'
            AND i.type IN ('account', 'debit_card')
          THEN t.amount_cents ELSE 0 END), 0) AS cash_expenses
      FROM transactions t
      JOIN financial_instruments i ON i.id = t.instrument_id
      WHERE t.transaction_date >= ? AND t.transaction_date < ?
        AND COALESCE(t.source_type, '') NOT IN ('reconciliation', 'opening_balance')
    `).get(start, end) as { income: number; expense: number; cash_expenses: number }
    const debt = db.prepare(`
      SELECT
        (SELECT COALESCE(SUM(amount_cents), 0)
          FROM transfers
          WHERE type = 'card_payment' AND transfer_date >= ? AND transfer_date < ?) +
        (SELECT COALESCE(SUM(p.amount_cents), 0)
          FROM loan_payments p
          JOIN loans l ON l.id = p.loan_id
          WHERE p.is_paid = 1 AND p.affects_instrument_balance = 1 AND l.instrument_id IS NOT NULL
            AND p.paid_date >= ? AND p.paid_date < ?) AS total
    `).get(start, end, start, end) as { total: number }
    const income = toNumber(row.income) / 100
    const expense = toNumber(row.expense) / 100
    const debtPayments = toNumber(debt.total) / 100
    const cashExpenses = toNumber(row.cash_expenses) / 100
    return {
      month: label,
      income,
      expense,
      debtPayments,
      netCashFlow: income - cashExpenses - debtPayments,
    }
  })
}

function getDashboardBalanceEvolution(db: Database.Database): Record<string, unknown> {
  const instruments = db.prepare(`
    SELECT
      id,
      name,
      current_amount_cents,
      (
        SELECT MIN(t.transaction_date)
        FROM transactions t
        WHERE t.instrument_id = financial_instruments.id
          AND t.source_type = 'opening_balance'
      ) AS opening_date
    FROM financial_instruments
    WHERE is_active = 1
      AND (type = 'account' OR (type = 'debit_card' AND linked_account_id IS NULL))
    ORDER BY name
  `).all() as Array<{
    id: number
    name: string
    current_amount_cents: number
    opening_date: string | null
  }>
  const months = monthSequence(6)
  const series = instruments.map((instrument) => ({
    key: `instrument_${instrument.id}`,
    label: instrument.name,
  }))
  const points = months.map(({ start, label }) => {
    const end = addMonths(start, 1)
    const point: Record<string, string | number> = { month: label }
    for (const instrument of instruments) {
      if (instrument.opening_date !== null && end <= instrument.opening_date) {
        point[`instrument_${instrument.id}`] = 0
        continue
      }
      const laterTransactions = db.prepare(`
        SELECT COALESCE(SUM(CASE
          WHEN t.type = 'income' THEN t.amount_cents ELSE -t.amount_cents END), 0) AS net
        FROM transactions t
        JOIN financial_instruments movement_instrument ON movement_instrument.id = t.instrument_id
        WHERE (t.instrument_id = ? OR movement_instrument.linked_account_id = ?)
          AND t.affects_balance = 1 AND t.transaction_date >= ?
      `).get(instrument.id, instrument.id, end) as { net: number }
      const laterTransfers = db.prepare(`
        SELECT
          COALESCE(SUM(CASE
            WHEN destination_instrument_id = ? OR destination.linked_account_id = ? THEN amount_cents
            WHEN source_instrument_id = ? OR source.linked_account_id = ? THEN -amount_cents
            ELSE 0
          END), 0) AS net
        FROM transfers
        JOIN financial_instruments source ON source.id = source_instrument_id
        JOIN financial_instruments destination ON destination.id = destination_instrument_id
        WHERE transfer_date >= ?
      `).get(
        instrument.id, instrument.id, instrument.id, instrument.id, end,
      ) as { net: number }
      const laterLoanPayments = db.prepare(`
        SELECT COALESCE(SUM(-p.amount_cents), 0) AS net
        FROM loan_payments p
        JOIN loans l ON l.id = p.loan_id
        LEFT JOIN financial_instruments payment_instrument ON payment_instrument.id = l.instrument_id
        WHERE p.is_paid = 1 AND p.paid_date >= ?
          AND p.affects_instrument_balance = 1
          AND (l.instrument_id = ? OR payment_instrument.linked_account_id = ?)
      `).get(end, instrument.id, instrument.id) as { net: number }
      point[`instrument_${instrument.id}`] = (
        instrument.current_amount_cents
        - laterTransactions.net
        - laterTransfers.net
        - laterLoanPayments.net
      ) / 100
    }
    return point
  })
  return { series, points }
}

function getMonthlyObligationsCents(db: Database.Database): number {
  const subscriptions = db.prepare(`
    SELECT COALESCE(SUM(CASE
      WHEN billing_cycle = 'weekly' THEN amount_cents * 52 / 12
      WHEN billing_cycle = 'yearly' THEN amount_cents / 12
      ELSE amount_cents
    END), 0) AS total
    FROM subscriptions WHERE is_active = 1
  `).get() as { total: number }
  const fixed = db.prepare(`
    SELECT COALESCE(SUM(estimated_amount_cents), 0) AS total
    FROM fixed_expenses WHERE is_active = 1
  `).get() as { total: number }
  const loans = db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS total
    FROM loan_payments p
    JOIN loans l ON l.id = p.loan_id
    WHERE p.is_paid = 0 AND l.is_active = 1 AND l.affects_instrument_balance = 1
      AND p.installment_num = (
        SELECT MIN(next_payment.installment_num)
        FROM loan_payments next_payment
        WHERE next_payment.loan_id = p.loan_id AND next_payment.is_paid = 0
      )
  `).get() as { total: number }
  return Math.round(toNumber(subscriptions.total) + toNumber(fixed.total) + toNumber(loans.total))
}

function getDashboardFutureExpenses(db: Database.Database): Record<string, unknown>[] {
  return monthSequence(6, false).map(({ start, label }) => {
    const end = addMonths(start, 1)
    const subscriptions = db.prepare(`
      SELECT COALESCE(SUM(CASE
        WHEN billing_cycle = 'weekly' THEN amount_cents * 52 / 12
        WHEN billing_cycle = 'yearly' AND next_billing >= ? AND next_billing < ? THEN amount_cents
        WHEN billing_cycle = 'monthly' THEN amount_cents
        ELSE 0
      END), 0) AS total
      FROM subscriptions WHERE is_active = 1
    `).get(start, end) as { total: number }
    const fixed = db.prepare(`
      SELECT COALESCE(SUM(estimated_amount_cents), 0) AS total
      FROM fixed_expenses WHERE is_active = 1
    `).get() as { total: number }
    const loans = db.prepare(`
      SELECT COALESCE(SUM(p.amount_cents), 0) AS total
    FROM loan_payments p JOIN loans l ON l.id = p.loan_id
      WHERE p.is_paid = 0 AND l.is_active = 1 AND l.affects_instrument_balance = 1
        AND p.payment_date >= ? AND p.payment_date < ?
    `).get(start, end) as { total: number }
    const msiRows = db.prepare(`
      SELECT amount_cents, msi_months, msi_monthly_amount_cents, msi_start_date
      FROM transactions
      WHERE is_msi = 1 AND msi_start_date IS NOT NULL
    `).all() as Array<{
      amount_cents: number
      msi_months: number
      msi_monthly_amount_cents: number
      msi_start_date: string
    }>
    const pointDate = new Date(`${start}T00:00:00Z`)
    let creditCardInstallmentsCents = 0
    for (const msi of msiRows) {
      const msiDate = new Date(`${msi.msi_start_date}T00:00:00Z`)
      const elapsed = (pointDate.getUTCFullYear() - msiDate.getUTCFullYear()) * 12
        + pointDate.getUTCMonth() - msiDate.getUTCMonth()
      if (elapsed >= 0 && elapsed < msi.msi_months) {
        creditCardInstallmentsCents += elapsed === msi.msi_months - 1
          ? msi.amount_cents - msi.msi_monthly_amount_cents * (msi.msi_months - 1)
          : msi.msi_monthly_amount_cents
      }
    }
    const subscriptionAmount = Math.round(subscriptions.total) / 100
    const fixedAmount = fixed.total / 100
    const loanAmount = loans.total / 100
    const creditCardInstallments = creditCardInstallmentsCents / 100
    return {
      month: label,
      subscriptions: subscriptionAmount,
      fixedExpenses: fixedAmount,
      loanPayments: loanAmount,
      creditCardInstallments,
      total: subscriptionAmount + fixedAmount + loanAmount + creditCardInstallments,
    }
  })
}

function databaseInfo(db: Database.Database): DatabaseInfo {
  const schema = db.prepare(`
    SELECT value FROM app_metadata WHERE key = 'schema_version'
  `).get() as { value: string } | undefined
  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM banks) AS banks,
      (SELECT COUNT(*) FROM financial_instruments) AS instruments,
      (SELECT COUNT(*) FROM transactions) AS transactions
  `).get() as { banks: number; instruments: number; transactions: number }
  return {
    path: getDatabasePath(),
    schemaVersion: schema?.value ?? '1',
    journalMode: String(db.pragma('journal_mode', { simple: true })),
    banks: counts.banks,
    instruments: counts.instruments,
    transactions: counts.transactions,
  }
}

function requireId(match: RegExpMatchArray | null): number {
  if (!match) {
    throw new NotFoundError('La ruta local solicitada no existe.')
  }
  const id = Number(match[1])
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('El identificador no es valido.')
  }
  return id
}

function routeRequest(
  db: Database.Database,
  url: URL,
  method: string,
  body?: string,
): unknown {
  const path = url.pathname
  const input = (): Input => parseBody(body)
  const entityRoute = (
    collection: string,
    list: () => unknown,
    create: (value: Input) => unknown,
    update: (id: number, value: Input) => unknown,
    remove: (id: number) => unknown,
  ): unknown | undefined => {
    if (path === collection && method === 'GET') return list()
    if (path === collection && method === 'POST') return create(input())
    const match = path.match(new RegExp(`^${collection}/(\\d+)$`))
    if (match && method === 'PUT') return update(requireId(match), input())
    if (match && method === 'DELETE') return remove(requireId(match))
    return undefined
  }

  if (path === '/health' && method === 'GET') return { status: 'ready' }
  if (path === '/database/info' && method === 'GET') return databaseInfo(db)
  if (path === '/dashboard/summary' && method === 'GET') return getDashboardSummary(db)
  if (path === '/dashboard/charts/expenses-by-category' && method === 'GET') {
    return getDashboardExpensesByCategory(db, url.searchParams.get('period') ?? DASHBOARD_EXPENSE_PERIOD_DEFAULT)
  }
  if (path === '/dashboard/preferences' && method === 'GET') return getDashboardPreferences(db)
  if (path === '/dashboard/preferences' && method === 'PUT') return saveDashboardPreferences(db, input())
  if (path === '/dashboard/charts/cash-flow' && method === 'GET') return getDashboardCashFlow(db)
  if (path === '/dashboard/charts/balance-evolution' && method === 'GET') return getDashboardBalanceEvolution(db)
  if (path === '/dashboard/charts/future-expenses' && method === 'GET') return getDashboardFutureExpenses(db)
  if (path === '/dashboard/upcoming-commitments' && method === 'GET') return getDashboardUpcomingCommitments(db)

  const bankResult = entityRoute(
    '/banks',
    () => listBanks(db),
    (value) => saveBank(db, value),
    (id, value) => saveBank(db, value, id),
    (id) => deleteBank(db, id),
  )
  if (bankResult !== undefined) return bankResult

  if (path === '/instruments' && method === 'GET') {
    const bankId = Number(url.searchParams.get('bank_id'))
    return listInstruments(db, Number.isInteger(bankId) && bankId > 0 ? bankId : undefined)
  }
  const reconciliation = path.match(/^\/instruments\/(\d+)\/reconcile$/)
  if (reconciliation && method === 'POST') {
    return reconcileInstrument(db, requireId(reconciliation), input())
  }
  const instrumentResult = entityRoute(
    '/instruments',
    () => listInstruments(db),
    (value) => saveInstrument(db, value),
    (id, value) => saveInstrument(db, value, id),
    (id) => deleteInstrument(db, id),
  )
  if (instrumentResult !== undefined) return instrumentResult

  const categoryResult = entityRoute(
    '/categories',
    () => listCategories(db),
    (value) => saveCategory(db, value),
    (id, value) => saveCategory(db, value, id),
    (id) => deleteCategory(db, id),
  )
  if (categoryResult !== undefined) return categoryResult

  if (path === '/subcategories' && method === 'GET') {
    const categoryId = Number(url.searchParams.get('category_id'))
    return listSubcategories(db, Number.isInteger(categoryId) && categoryId > 0 ? categoryId : undefined)
  }
  const subcategoryResult = entityRoute(
    '/subcategories',
    () => listSubcategories(db),
    (value) => saveSubcategory(db, value),
    (id, value) => saveSubcategory(db, value, id),
    (id) => deleteSubcategory(db, id),
  )
  if (subcategoryResult !== undefined) return subcategoryResult

  if (path === '/transactions' && method === 'GET') return listTransactions(db, url)
  const transactionResult = entityRoute(
    '/transactions',
    () => listTransactions(db, url),
    (value) => saveTransaction(db, value),
    (id, value) => saveTransaction(db, value, id),
    (id) => deleteTransaction(db, id),
  )
  if (transactionResult !== undefined) return transactionResult

  const statementMovements = path.match(/^\/statements\/(\d+)\/movements$/)
  if (statementMovements && method === 'GET') {
    return listStatementMovements(db, requireId(statementMovements))
  }
  if (path === '/statements' && method === 'GET') {
    const instrumentId = Number(url.searchParams.get('instrument_id'))
    return listStatements(db, Number.isInteger(instrumentId) && instrumentId > 0 ? instrumentId : undefined)
  }
  const statementResult = entityRoute(
    '/statements',
    () => listStatements(db),
    (value) => saveStatement(db, value),
    (id, value) => saveStatement(db, value, id),
    (id) => deleteStatement(db, id),
  )
  if (statementResult !== undefined) return statementResult

  if (path === '/transfers' && method === 'GET') {
    const instrumentId = Number(url.searchParams.get('instrument_id'))
    return listTransfers(db, Number.isInteger(instrumentId) && instrumentId > 0 ? instrumentId : undefined)
  }
  const transferResult = entityRoute(
    '/transfers',
    () => listTransfers(db),
    (value) => saveTransfer(db, value),
    (id, value) => saveTransfer(db, value, id),
    (id) => deleteTransfer(db, id),
  )
  if (transferResult !== undefined) return transferResult

  const payLoan = path.match(/^\/loans\/(\d+)\/payments\/(\d+)\/pay$/)
  if (payLoan && method === 'POST') {
    return payLoanInstallment(db, Number(payLoan[1]), Number(payLoan[2]), input())
  }
  const undoLoanPayment = path.match(/^\/loans\/(\d+)\/payments\/(\d+)\/unpay$/)
  if (undoLoanPayment && method === 'POST') {
    return undoLoanInstallment(
      db,
      Number(undoLoanPayment[1]),
      Number(undoLoanPayment[2]),
    )
  }
  const loanPayments = path.match(/^\/loans\/(\d+)\/payments$/)
  if (loanPayments && method === 'GET') return listLoanPayments(db, requireId(loanPayments))
  const loanResult = entityRoute(
    '/loans',
    () => listLoans(db),
    (value) => saveLoan(db, value),
    (id, value) => saveLoan(db, value, id),
    (id) => deleteLoan(db, id),
  )
  if (loanResult !== undefined) return loanResult

  const subscriptionResult = entityRoute(
    '/subscriptions',
    () => listSubscriptions(db),
    (value) => saveSubscription(db, value),
    (id, value) => saveSubscription(db, value, id),
    (id) => deleteSubscription(db, id),
  )
  if (subscriptionResult !== undefined) return subscriptionResult

  const recurringIncomeResult = entityRoute(
    '/recurring-incomes',
    () => listRecurringIncomes(db),
    (value) => saveRecurringIncome(db, value),
    (id, value) => saveRecurringIncome(db, value, id),
    (id) => deleteRecurringIncome(db, id),
  )
  if (recurringIncomeResult !== undefined) return recurringIncomeResult

  const fixedPayment = path.match(/^\/fixed-expenses\/(\d+)\/payments\/(\d+)$/)
  if (fixedPayment && method === 'PUT') {
    return saveFixedExpensePayment(db, Number(fixedPayment[1]), input(), Number(fixedPayment[2]))
  }
  if (fixedPayment && method === 'DELETE') {
    return deleteFixedExpensePayment(db, Number(fixedPayment[1]), Number(fixedPayment[2]))
  }
  const fixedPayments = path.match(/^\/fixed-expenses\/(\d+)\/payments$/)
  if (fixedPayments && method === 'GET') return listFixedExpensePayments(db, requireId(fixedPayments))
  if (fixedPayments && method === 'POST') return saveFixedExpensePayment(db, requireId(fixedPayments), input())
  const fixedResult = entityRoute(
    '/fixed-expenses',
    () => listFixedExpenses(db),
    (value) => saveFixedExpense(db, value),
    (id, value) => saveFixedExpense(db, value, id),
    (id) => deleteFixedExpense(db, id),
  )
  if (fixedResult !== undefined) return fixedResult

  if (path === '/budgets' && method === 'GET') return listBudgets(db, url)
  const budgetResult = entityRoute(
    '/budgets',
    () => listBudgets(db, url),
    (value) => saveBudget(db, value),
    (id, value) => saveBudget(db, value, id),
    (id) => deleteBudget(db, id),
  )
  if (budgetResult !== undefined) return budgetResult

  const savingsGoalResult = entityRoute(
    '/savings-goals',
    () => listSavingsGoals(db),
    (value) => saveSavingsGoal(db, value),
    (id, value) => saveSavingsGoal(db, value, id),
    (id) => deleteSavingsGoal(db, id),
  )
  if (savingsGoalResult !== undefined) return savingsGoalResult

  if (path === '/simulations' && method === 'GET') return listSimulations(db)
  if (path === '/simulations' && method === 'POST') return saveSimulation(db, input())
  const simulation = path.match(/^\/simulations\/(\d+)$/)
  if (simulation && method === 'DELETE') return deleteSimulation(db, requireId(simulation))

  if (path === '/reminders/pending' && method === 'GET') return listReminders(db, true)
  if (path === '/reminders/pending' && method === 'DELETE') return deletePendingReminders(db)
  if (path === '/reminders/dismissed' && method === 'DELETE') return deleteDismissedReminders(db)
  if (path === '/reminders/dismiss-all' && method === 'PUT') return dismissAllReminders(db)
  const reminderResult = entityRoute(
    '/reminders',
    () => listReminders(db, false),
    (value) => saveReminder(db, value),
    (id, value) => saveReminder(db, value, id),
    (id) => deleteReminder(db, id),
  )
  if (reminderResult !== undefined) return reminderResult

  throw new NotFoundError('La operacion local solicitada no existe.')
}

export function handleLocalRequest(payload: LocalRequestPayload): ApiResponse<unknown> {
  try {
    if (!payload || typeof payload !== 'object' || typeof payload.path !== 'string') {
      throw new ValidationError('La solicitud local no es valida.')
    }
    const method = (payload.method ?? 'GET').toUpperCase()
    if (!new Set(['GET', 'POST', 'PUT', 'DELETE']).has(method)) {
      throw new ValidationError('El metodo solicitado no esta permitido.')
    }
    if (payload.path.length > 500 || !payload.path.startsWith('/')) {
      throw new ValidationError('La ruta local no es valida.')
    }
    const db = getDatabase()
    const url = new URL(payload.path, 'local://finanzas')
    const data = routeRequest(db, url, method, payload.body)
    if (method !== 'GET') {
      processDueSubscriptions(db)
      processDueRecurringIncomes(db)
      ensureAutomaticReminders(db)
    }
    return { success: true, data }
  } catch (error) {
    return { success: false, error: safeError(error) }
  }
}

export function getLocalDatabaseInfo(): DatabaseInfo {
  return databaseInfo(getDatabase())
}

export function runLocalMaintenance(): void {
  const db = getDatabase()
  ensureAutomaticStatements(db)
  processDueSubscriptions(db)
  processDueRecurringIncomes(db)
  ensureAutomaticReminders(db)
}

export function getDueReminderNotifications(): Array<{ id: number; title: string; body: string }> {
  const db = getDatabase()
  return (db.prepare(`
    SELECT id, title, COALESCE(description, '') AS body
    FROM reminders
    WHERE is_read = 0 AND is_dismissed = 0 AND reminder_date <= ?
    ORDER BY reminder_date, id
    LIMIT 10
  `).all(todayIso()) as Array<{ id: number; title: string; body: string }>)
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (character === ',' && !quoted) {
      row.push(current)
      current = ''
      continue
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && content[index + 1] === '\n') index += 1
      row.push(current)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      current = ''
      continue
    }
    current += character
  }
  row.push(current)
  if (row.some((value) => value.trim())) rows.push(row)
  if (quoted) {
    throw new ValidationError('El CSV contiene una comilla sin cerrar.')
  }
  return rows
}

export function exportTransactionsCsv(): string {
  const db = getDatabase()
  const headers = [
    'date',
    'type',
    'amount',
    'instrument_id',
    'instrument',
    'category_id',
    'subcategory_id',
    'description',
    'notes',
    'affects_balance',
  ]
  const rows = db.prepare(`
    SELECT t.*, i.name AS instrument_name
    FROM transactions t
    JOIN financial_instruments i ON i.id = t.instrument_id
    ORDER BY t.transaction_date, t.id
  `).all() as DbRow[]
  return [
    headers.join(','),
    ...rows.map((row) => [
      row.transaction_date,
      row.type,
      toNumber(row.amount_cents) / 100,
      row.instrument_id,
      row.instrument_name,
      row.category_id ?? '',
      row.subcategory_id ?? '',
      row.description ?? '',
      row.notes ?? '',
      row.affects_balance,
    ].map(escapeCsv).join(',')),
  ].join('\n')
}

export function importTransactionsCsv(content: string): { imported: number; skipped: number } {
  const rows = parseCsvRows(content)
  if (rows.length < 2 || rows.length > 50_001) {
    throw new ValidationError('El CSV debe contener entre 1 y 50000 movimientos.')
  }
  const headers = rows[0]
  const requiredHeaders = ['date', 'type', 'amount', 'instrument_id']
  if (!requiredHeaders.every((header) => headers.includes(header))) {
    throw new ValidationError('El CSV no contiene las columnas obligatorias.')
  }
  const indexOf = (header: string): number => headers.indexOf(header)
  const db = getDatabase()
  let imported = 0
  let skipped = 0
  const operation = db.transaction(() => {
    for (const values of rows.slice(1)) {
      const instrumentId = Number(values[indexOf('instrument_id')])
      const amount = Number(values[indexOf('amount')])
      const transactionDate = values[indexOf('date')]
      const type = values[indexOf('type')]
      const descriptionIndex = indexOf('description')
      const description = descriptionIndex >= 0 ? values[descriptionIndex] : ''
      const amountCents = moneyToCents(amount, 'amount')
      const duplicate = db.prepare(`
        SELECT id FROM transactions
        WHERE instrument_id = ? AND transaction_date = ? AND type = ?
          AND amount_cents = ? AND COALESCE(description, '') = ?
        LIMIT 1
      `).get(instrumentId, transactionDate, type, amountCents, description)
      if (duplicate) {
        skipped += 1
        continue
      }
      const categoryIndex = indexOf('category_id')
      const subcategoryIndex = indexOf('subcategory_id')
      const notesIndex = indexOf('notes')
      const affectsIndex = indexOf('affects_balance')
      const instrument = getInstrument(db, instrumentId)
      saveTransaction(db, {
        instrumentId,
        categoryId: categoryIndex >= 0 && values[categoryIndex]
          ? Number(values[categoryIndex])
          : null,
        subcategoryId: subcategoryIndex >= 0 && values[subcategoryIndex]
          ? Number(values[subcategoryIndex])
          : null,
        currencyId: toNumber(instrument.currency_id),
        type,
        amount,
        description,
        transactionDate,
        notes: notesIndex >= 0 ? values[notesIndex] : '',
        isMsi: false,
        affectsBalance: affectsIndex < 0 || values[affectsIndex] !== '0',
        sourceType: 'csv_import',
      }, undefined, true)
      imported += 1
    }
  })
  operation()
  return { imported, skipped }
}
