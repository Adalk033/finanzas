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
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const ICON_NAME = /^[A-Za-z][A-Za-z0-9]*$/
const LAST_FOUR = /^\d{4}$/
const INSTRUMENT_TYPES = new Set(['credit_card', 'debit_card', 'account'])
const CATEGORY_TYPES = new Set(['expense', 'income', 'both'])
const TRANSACTION_TYPES = new Set(['expense', 'income'])
const TRANSFER_TYPES = new Set(['card_payment', 'inter_account', 'loan_payment', 'other'])
const PAYMENT_TYPES = new Set(['fixed', 'variable'])
const BILLING_CYCLES = new Set(['monthly', 'yearly', 'weekly'])
const SIMULATION_TYPES = new Set(['direct_purchase', 'msi', 'loan'])
const REMINDER_TYPES = new Set(['payment', 'cutoff', 'subscription', 'loan', 'custom'])
const MSI_MONTHS = new Set([3, 6, 9, 12, 18, 24])

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

function optionalBoolean(input: Input, key: string): boolean | null {
  const value = input[key]
  if (value === null || value === undefined) {
    return null
  }
  return requiredBoolean(input, key)
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
    color: row.color ?? null,
    iconName: row.icon_name ?? null,
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
    currentAmount: fromCents(row.current_amount_cents),
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
    startDate: row.start_date,
    endDate: row.end_date ?? null,
    instrumentId: toNullableNumber(row.instrument_id),
    instrumentName: row.instrument_name ?? null,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function instrumentSelect(where = ''): string {
  return `
    SELECT i.*, b.name AS bank_name
    FROM financial_instruments i
    JOIN banks b ON b.id = i.bank_id
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

function getInstrument(db: Database.Database, id: number): InstrumentRow {
  const row = db.prepare('SELECT * FROM financial_instruments WHERE id = ? AND is_active = 1').get(id)
  if (!row) {
    throw new ValidationError('El instrumento seleccionado no existe o esta inactivo.')
  }
  return row as InstrumentRow
}

function applyInstrumentImpact(
  db: Database.Database,
  instrument: InstrumentRow,
  type: 'expense' | 'income',
  amountCents: number,
  direction: 1 | -1,
): void {
  const signed = (type === 'expense' ? 1 : -1) * amountCents * direction
  if (instrument.type === 'credit_card') {
    const balance = Math.max(0, toNumber(instrument.current_balance_cents) + signed)
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
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
  const color = optionalString(body, 'color', 7)
  const iconName = optionalString(body, 'iconName', 50)
  const isActive = requiredBoolean(body, 'isActive', true)
  if (color && !HEX_COLOR.test(color)) {
    throw new ValidationError('color debe usar el formato #RRGGBB.')
  }
  if (iconName && !ICON_NAME.test(iconName)) {
    throw new ValidationError('iconName solo admite letras y numeros.')
  }

  if (id) {
    requireEntity(db, 'banks', id)
    db.prepare(`
      UPDATE banks
      SET name = ?, short_name = ?, color = ?, icon_name = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, shortName, color, iconName, Number(isActive), id)
  } else {
    const result = db.prepare(`
      INSERT INTO banks (name, short_name, color, icon_name, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, shortName, color, iconName, Number(isActive))
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
  const availableCredit = input.type === 'credit_card'
    ? Math.max((input.creditLimit ?? 0) - (input.currentBalance ?? 0), 0)
    : null

  if (id) {
    requireEntity(db, 'financial_instruments', id)
    db.prepare(`
      UPDATE financial_instruments
      SET bank_id = ?, name = ?, type = ?, last_four = ?, currency_id = ?,
          credit_limit_cents = ?, current_balance_cents = ?, available_credit_cents = ?,
          cut_off_day = ?, payment_due_day = ?, annual_rate = ?, current_amount_cents = ?,
          notes = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      input.bankId, input.name, input.type, input.lastFour, input.currencyId,
      input.creditLimit, input.currentBalance, availableCredit, input.cutOffDay,
      input.paymentDueDay, input.annualRate, input.currentAmount, input.notes,
      Number(input.isActive), id,
    )
  } else {
    const result = db.prepare(`
      INSERT INTO financial_instruments (
        bank_id, name, type, last_four, currency_id, credit_limit_cents,
        current_balance_cents, available_credit_cents, cut_off_day, payment_due_day,
        annual_rate, current_amount_cents, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.bankId, input.name, input.type, input.lastFour, input.currencyId,
      input.creditLimit, input.currentBalance, availableCredit, input.cutOffDay,
      input.paymentDueDay, input.annualRate, input.currentAmount, input.notes,
      Number(input.isActive),
    )
    id = Number(result.lastInsertRowid)
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
} {
  const instrumentId = requiredInteger(body, 'instrumentId')
  const instrument = getInstrument(db, instrumentId)
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  const type = requiredEnum(body, 'type', TRANSACTION_TYPES) as 'expense' | 'income'
  const amountCents = moneyToCents(body.amount, 'amount')
  const isMsi = requiredBoolean(body, 'isMsi', false)
  const msiMonths = isMsi ? requiredInteger(body, 'msiMonths', 1, 24) : null
  if (isMsi && (!MSI_MONTHS.has(msiMonths ?? 0) || type !== 'expense' || instrument.type !== 'credit_card')) {
    throw new ValidationError('MSI solo admite compras con tarjeta a 3, 6, 9, 12, 18 o 24 meses.')
  }
  const transactionDate = requiredDate(body, 'transactionDate')
  return {
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId: requiredInteger(body, 'currencyId'),
    type,
    amountCents,
    description: optionalString(body, 'description', 255),
    transactionDate,
    notes: optionalString(body, 'notes', 2000),
    isMsi,
    msiMonths,
    msiMonthlyAmountCents: isMsi ? Math.round(amountCents / (msiMonths ?? 1)) : null,
    msiStartDate: isMsi ? computeMsiStartDate(transactionDate, toNumber(instrument.cut_off_day ?? 31)) : null,
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

function saveTransaction(db: Database.Database, body: Input, id?: number): Record<string, unknown> {
  const input = validateTransaction(db, body)
  const operation = db.transaction(() => {
    let previousInstrumentId: number | null = null
    if (id) {
      const previous = requireEntity(db, 'transactions', id)
      previousInstrumentId = toNumber(previous.instrument_id)
      applyInstrumentImpact(
        db,
        getInstrument(db, toNumber(previous.instrument_id)),
        previous.type as 'expense' | 'income',
        toNumber(previous.amount_cents),
        -1,
      )
      db.prepare(`
        UPDATE transactions
        SET instrument_id = ?, category_id = ?, subcategory_id = ?, currency_id = ?, type = ?,
            amount_cents = ?, description = ?, transaction_date = ?, notes = ?, is_msi = ?,
            msi_months = ?, msi_monthly_amount_cents = ?, msi_start_date = ?, msi_remaining = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId, input.type,
        input.amountCents, input.description, input.transactionDate, input.notes, Number(input.isMsi),
        input.msiMonths, input.msiMonthlyAmountCents, input.msiStartDate, input.msiMonths, id,
      )
    } else {
      const result = db.prepare(`
        INSERT INTO transactions (
          instrument_id, category_id, subcategory_id, currency_id, type, amount_cents,
          description, transaction_date, notes, is_msi, msi_months,
          msi_monthly_amount_cents, msi_start_date, msi_remaining
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.instrumentId, input.categoryId, input.subcategoryId, input.currencyId, input.type,
        input.amountCents, input.description, input.transactionDate, input.notes, Number(input.isMsi),
        input.msiMonths, input.msiMonthlyAmountCents, input.msiStartDate, input.msiMonths,
      )
      id = Number(result.lastInsertRowid)
    }
    applyInstrumentImpact(db, getInstrument(db, input.instrumentId), input.type, input.amountCents, 1)
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
    const instrumentId = toNumber(row.instrument_id)
    applyInstrumentImpact(
      db,
      getInstrument(db, instrumentId),
      row.type as 'expense' | 'income',
      toNumber(row.amount_cents),
      -1,
    )
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
  `).get(instrumentId, previous, cutOffDate) as { total: number }
  const msiRows = db.prepare(`
    SELECT msi_start_date, msi_months, msi_monthly_amount_cents
    FROM transactions
    WHERE instrument_id = ? AND is_msi = 1 AND msi_start_date <= ?
  `).all(instrumentId, cutOffDate) as Array<{
    msi_start_date: string
    msi_months: number
    msi_monthly_amount_cents: number
  }>
  let msiTotal = 0
  for (const row of msiRows) {
    const start = new Date(`${row.msi_start_date}T00:00:00Z`)
    const end = new Date(`${cutOffDate}T00:00:00Z`)
    const elapsed = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
      + end.getUTCMonth() - start.getUTCMonth()
    if (elapsed >= 0 && elapsed < row.msi_months) {
      msiTotal += row.msi_monthly_amount_cents
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
    const isPaid = optionalBoolean(body, 'isPaid')
    const paidAmount = body.paidAmount === undefined
      ? toNullableNumber(existing.paid_amount_cents)
      : optionalMoneyToCents(body, 'paidAmount')
    const paidDate = body.paidDate === undefined
      ? (existing.paid_date as string | null)
      : optionalDate(body, 'paidDate')
    db.prepare(`
      UPDATE credit_card_statements
      SET payment_due_date = ?, minimum_payment_cents = ?, no_interest_payment_cents = ?,
          is_paid = COALESCE(?, is_paid), paid_amount_cents = ?, paid_date = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      paymentDueDate, minimumPayment, noInterestPayment,
      isPaid === null ? null : Number(isPaid), paidAmount, paidDate, id,
    )
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
  const linked = db.prepare('SELECT COUNT(*) AS total FROM transfers WHERE statement_id = ?').get(id) as { total: number }
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
    SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transfers WHERE statement_id = ?
  `).get(statementId) as { total: number }
  const paidAmount = toNumber(paid.total)
  const isPaid = paidAmount >= toNumber(statement.total_amount_cents) && toNumber(statement.total_amount_cents) > 0
  db.prepare(`
    UPDATE credit_card_statements
    SET paid_amount_cents = ?, is_paid = ?, paid_date = CASE WHEN ? THEN COALESCE(paid_date, date('now')) ELSE NULL END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(paidAmount, Number(isPaid), Number(isPaid), statementId)
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
  let statementId = optionalInteger(body, 'statementId')
  if (type === 'card_payment' && statementId === null) {
    ensureAutomaticStatements(db)
    const automaticStatement = db.prepare(`
      SELECT id
      FROM credit_card_statements
      WHERE instrument_id = ? AND cut_off_date <= ? AND is_paid = 0
        AND total_amount_cents > COALESCE(paid_amount_cents, 0)
      ORDER BY cut_off_date
      LIMIT 1
    `).get(destinationId, transferDate) as { id: number } | undefined
    statementId = automaticStatement?.id ?? null
  }
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
  return {
    sourceId,
    destinationId,
    amountCents,
    currencyId: requiredInteger(body, 'currencyId'),
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
  let previousStatementId: number | null = null
  const operation = db.transaction(() => {
    if (id) {
      const previous = requireEntity(db, 'transfers', id)
      previousStatementId = toNullableNumber(previous.statement_id)
      applyTransferImpact(
        db,
        getInstrument(db, toNumber(previous.source_instrument_id)),
        getInstrument(db, toNumber(previous.destination_instrument_id)),
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
    refreshStatementPayment(db, previousStatementId)
    refreshStatementPayment(db, input.statementId)
  })
  operation()
  return mapTransfer(asRow(db.prepare(transferSelect('WHERE tr.id = ?')).get(id)))
}

function deleteTransfer(db: Database.Database, id: number): { id: number } {
  const operation = db.transaction(() => {
    const row = requireEntity(db, 'transfers', id)
    const statementId = toNullableNumber(row.statement_id)
    applyTransferImpact(
      db,
      getInstrument(db, toNumber(row.source_instrument_id)),
      getInstrument(db, toNumber(row.destination_instrument_id)),
      toNumber(row.amount_cents),
      -1,
    )
    db.prepare('DELETE FROM transfers WHERE id = ?').run(id)
    refreshStatementPayment(db, statementId)
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
  startDate: string
  endDate: string | null
  instrumentId: number | null
  notes: string | null
  isActive: boolean
} {
  const paymentType = requiredEnum(body, 'paymentType', PAYMENT_TYPES)
  const fixedPaymentCents = optionalMoneyToCents(body, 'fixedPayment')
  const annualRate = optionalRate(body, 'annualRate')
  if (paymentType === 'fixed' && fixedPaymentCents === null) {
    throw new ValidationError('fixedPayment es obligatorio para prestamos de pago fijo.')
  }
  if (paymentType === 'variable' && annualRate === null) {
    throw new ValidationError('annualRate es obligatoria para prestamos de tasa variable.')
  }
  const instrumentId = optionalInteger(body, 'instrumentId')
  if (instrumentId !== null) {
    const instrument = getInstrument(db, instrumentId)
    if (instrument.type === 'credit_card') {
      throw new ValidationError('El instrumento de pago del prestamo debe ser una cuenta o debito.')
    }
  }
  return {
    name: requiredString(body, 'name', 150),
    lender: optionalString(body, 'lender', 100),
    currencyId: requiredInteger(body, 'currencyId'),
    originalAmountCents: moneyToCents(body.originalAmount, 'originalAmount'),
    annualRate,
    totalInstallments: requiredInteger(body, 'totalInstallments', 1, 600),
    paymentType,
    fixedPaymentCents,
    paymentDay: optionalInteger(body, 'paymentDay', 1, 31),
    startDate: requiredDate(body, 'startDate'),
    endDate: optionalDate(body, 'endDate'),
    instrumentId,
    notes: optionalString(body, 'notes', 2000),
    isActive: requiredBoolean(body, 'isActive', true),
  }
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
): void {
  db.prepare('DELETE FROM loan_payments WHERE loan_id = ?').run(loanId)
  const monthlyRate = (annualRate ?? 0) / 100 / 12
  const variablePayment = monthlyRate === 0
    ? Math.round(originalAmountCents / totalInstallments)
    : Math.round(
      originalAmountCents * monthlyRate
      * ((1 + monthlyRate) ** totalInstallments)
      / (((1 + monthlyRate) ** totalInstallments) - 1),
    )
  let remaining = originalAmountCents
  const insert = db.prepare(`
    INSERT INTO loan_payments (
      loan_id, installment_num, amount_cents, principal_cents, interest_cents, payment_date
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)
  for (let installment = 1; installment <= totalInstallments; installment += 1) {
    const interest = paymentType === 'variable' ? Math.round(remaining * monthlyRate) : 0
    const requestedPayment = paymentType === 'fixed' ? (fixedPaymentCents ?? 0) : variablePayment
    const principal = installment === totalInstallments
      ? remaining
      : Math.min(remaining, Math.max(1, requestedPayment - interest))
    const amount = principal + interest
    insert.run(
      loanId,
      installment,
      amount,
      principal,
      interest,
      addMonths(startDate, installment - 1, paymentDay),
    )
    remaining -= principal
  }
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
        ) {
          throw new ValidationError('No se pueden cambiar los terminos de un prestamo con pagos registrados.')
        }
        db.prepare(`
          UPDATE loans
          SET name = ?, lender = ?, annual_rate = ?, fixed_payment_cents = ?, payment_day = ?,
              end_date = ?, instrument_id = ?, notes = ?, is_active = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          input.name, input.lender, input.annualRate, input.fixedPaymentCents, input.paymentDay,
          input.endDate, input.instrumentId, input.notes, Number(input.isActive), id,
        )
        return
      }
      db.prepare(`
        UPDATE loans
        SET name = ?, lender = ?, currency_id = ?, original_amount_cents = ?,
            remaining_amount_cents = ?, annual_rate = ?, total_installments = ?,
            payment_type = ?, fixed_payment_cents = ?, payment_day = ?, start_date = ?,
            end_date = ?, instrument_id = ?, notes = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        input.name, input.lender, input.currencyId, input.originalAmountCents,
        input.originalAmountCents, input.annualRate, input.totalInstallments,
        input.paymentType, input.fixedPaymentCents, input.paymentDay, input.startDate,
        input.endDate, input.instrumentId, input.notes, Number(input.isActive), id,
      )
    } else {
      const result = db.prepare(`
        INSERT INTO loans (
          name, lender, currency_id, original_amount_cents, remaining_amount_cents,
          annual_rate, total_installments, payment_type, fixed_payment_cents,
          payment_day, start_date, end_date, instrument_id, notes, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.name, input.lender, input.currencyId, input.originalAmountCents,
        input.originalAmountCents, input.annualRate, input.totalInstallments,
        input.paymentType, input.fixedPaymentCents, input.paymentDay, input.startDate,
        input.endDate, input.instrumentId, input.notes, Number(input.isActive),
      )
      id = Number(result.lastInsertRowid)
    }
    rebuildLoanSchedule(
      db, id!, input.originalAmountCents, input.annualRate, input.totalInstallments,
      input.paymentType, input.fixedPaymentCents, input.startDate, input.paymentDay,
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
      throw new NotFoundError('La mensualidad solicitada no existe.')
    }
    if (toBoolean(payment.is_paid)) {
      throw new ValidationError('La mensualidad ya esta pagada.')
    }
    const amountCents = body.amount === undefined
      ? toNumber(payment.amount_cents)
      : moneyToCents(body.amount, 'amount')
    const principalCents = Math.min(
      toNumber(loan.remaining_amount_cents),
      toNumber(payment.principal_cents ?? amountCents),
    )
    const instrumentId = toNullableNumber(loan.instrument_id)
    if (instrumentId !== null) {
      const instrument = getInstrument(db, instrumentId)
      if (instrument.type === 'credit_card') {
        throw new ValidationError('El pago del prestamo requiere una cuenta o tarjeta de debito.')
      }
      db.prepare(`
        UPDATE financial_instruments
        SET current_amount_cents = current_amount_cents - ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(amountCents, instrumentId)
    }
    db.prepare(`
      UPDATE loan_payments
      SET amount_cents = ?, is_paid = 1, paid_date = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(amountCents, paidDate, notes, payment.id)
    db.prepare(`
      UPDATE loans
      SET remaining_amount_cents = MAX(remaining_amount_cents - ?, 0),
          paid_installments = paid_installments + 1,
          is_active = CASE WHEN paid_installments + 1 >= total_installments THEN 0 ELSE is_active END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(principalCents, loanId)
  })
  operation()
  const loan = mapLoan(asRow(db.prepare(loanSelect('WHERE l.id = ?')).get(loanId)))
  const payment = mapLoanPayment(asRow(db.prepare(`
    SELECT * FROM loan_payments WHERE loan_id = ? AND installment_num = ?
  `).get(loanId, installmentNum)))
  return { loan, payment }
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
  getInstrument(db, instrumentId)
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  return {
    name: requiredString(body, 'name', 150),
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId: requiredInteger(body, 'currencyId'),
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
    WHERE s.is_active = 1 AND s.next_billing IS NOT NULL AND s.next_billing <= date('now')
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
              amount_cents, description, transaction_date, notes
            ) VALUES (?, ?, ?, ?, 'expense', ?, ?, ?, ?)
          `).run(
            subscription.instrument_id, subscription.category_id, subscription.subcategory_id,
            subscription.currency_id, subscription.amount_cents,
            `Cargo automatico: ${subscription.name}`, chargeDate, note,
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
    }
  })
  operation()
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
  if (instrumentId !== null) {
    getInstrument(db, instrumentId)
  }
  const categoryId = optionalInteger(body, 'categoryId')
  const subcategoryId = optionalInteger(body, 'subcategoryId')
  validateCategoryLinks(db, categoryId, subcategoryId)
  return {
    name: requiredString(body, 'name', 150),
    instrumentId,
    categoryId,
    subcategoryId,
    currencyId: requiredInteger(body, 'currencyId'),
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
  requireEntity(db, 'fixed_expenses', fixedExpenseId)
  const amountCents = moneyToCents(body.amount, 'amount')
  const periodMonth = requiredInteger(body, 'periodMonth', 1, 12)
  const periodYear = requiredInteger(body, 'periodYear', 2000, 2200)
  const paymentDate = optionalDate(body, 'paymentDate')
  const isPaid = requiredBoolean(body, 'isPaid', false)
  const notes = optionalString(body, 'notes', 2000)
  if (paymentId) {
    const payment = requireEntity(db, 'fixed_expense_payments', paymentId)
    if (toNumber(payment.fixed_expense_id) !== fixedExpenseId) {
      throw new ValidationError('El pago no pertenece al gasto fijo indicado.')
    }
    db.prepare(`
      UPDATE fixed_expense_payments
      SET amount_cents = ?, period_month = ?, period_year = ?, payment_date = ?,
          is_paid = ?, notes = ?, updated_at = datetime('now')
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
  db.prepare('DELETE FROM fixed_expense_payments WHERE id = ?').run(paymentId)
  return { id: paymentId }
}

function budgetSpent(db: Database.Database, categoryId: number | null, month: number, year: number): number {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = addMonths(start, 1)
  const row = categoryId === null
    ? db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
        WHERE type = 'expense' AND transaction_date >= ? AND transaction_date < ?
      `).get(start, end)
    : db.prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
        WHERE type = 'expense' AND category_id = ? AND transaction_date >= ? AND transaction_date < ?
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
  }
  const currencyId = requiredInteger(body, 'currencyId')
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
  const favorable = projectedAvailableCents >= 0
    && (creditAvailableCents === null || creditAvailableCents >= 0)
    && projectedAvailableCents >= obligations + monthlyImpact
  const snapshot = {
    summary,
    monthlyObligations: obligations / 100,
    instrument: instrument ? mapInstrument(instrument) : null,
  }
  const resultJson = {
    scenarioType,
    amount: amountCents / 100,
    monthlyImpact: monthlyImpact / 100,
    projectedAvailable: projectedAvailableCents / 100,
    projectedCreditAvailable: creditAvailableCents === null ? null : creditAvailableCents / 100,
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

function getDashboardSummary(db: Database.Database): Record<string, number> {
  const instruments = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type IN ('account', 'debit_card') THEN current_amount_cents ELSE 0 END), 0) AS available,
      COALESCE(SUM(CASE WHEN type = 'credit_card' THEN current_balance_cents ELSE 0 END), 0) AS credit_debt,
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

function getDashboardExpensesByCategory(db: Database.Database): Record<string, unknown>[] {
  const rows = db.prepare(`
    SELECT COALESCE(c.name, 'Sin categoria') AS category, SUM(t.amount_cents) AS total
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense'
      AND t.transaction_date >= date('now', 'start of month')
      AND t.transaction_date < date('now', 'start of month', '+1 month')
    GROUP BY COALESCE(c.name, 'Sin categoria')
    ORDER BY total DESC
  `).all() as Array<{ category: string; total: number }>
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
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END), 0) AS expense
      FROM transactions WHERE transaction_date >= ? AND transaction_date < ?
    `).get(start, end) as { income: number; expense: number }
    return { month: label, income: row.income / 100, expense: row.expense / 100 }
  })
}

function getDashboardBalanceEvolution(db: Database.Database): Record<string, unknown> {
  const instruments = db.prepare(`
    SELECT id, name, current_amount_cents
    FROM financial_instruments
    WHERE is_active = 1 AND type IN ('account', 'debit_card')
    ORDER BY name
  `).all() as Array<{ id: number; name: string; current_amount_cents: number }>
  const months = monthSequence(6)
  const series = instruments.map((instrument) => ({
    key: `instrument_${instrument.id}`,
    label: instrument.name,
  }))
  const points = months.map(({ start, label }) => {
    const end = addMonths(start, 1)
    const point: Record<string, string | number> = { month: label }
    for (const instrument of instruments) {
      const laterTransactions = db.prepare(`
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents ELSE -amount_cents END), 0) AS net
        FROM transactions WHERE instrument_id = ? AND transaction_date >= ?
      `).get(instrument.id, end) as { net: number }
      const laterTransfers = db.prepare(`
        SELECT
          COALESCE(SUM(CASE
            WHEN destination_instrument_id = ? THEN amount_cents
            WHEN source_instrument_id = ? THEN -amount_cents
            ELSE 0
          END), 0) AS net
        FROM transfers WHERE transfer_date >= ?
      `).get(instrument.id, instrument.id, end) as { net: number }
      point[`instrument_${instrument.id}`] = (
        instrument.current_amount_cents - laterTransactions.net - laterTransfers.net
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
    WHERE p.is_paid = 0 AND l.is_active = 1
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
      WHERE p.is_paid = 0 AND l.is_active = 1 AND p.payment_date >= ? AND p.payment_date < ?
    `).get(start, end) as { total: number }
    const subscriptionAmount = Math.round(subscriptions.total) / 100
    const fixedAmount = fixed.total / 100
    const loanAmount = loans.total / 100
    return {
      month: label,
      subscriptions: subscriptionAmount,
      fixedExpenses: fixedAmount,
      loanPayments: loanAmount,
      total: subscriptionAmount + fixedAmount + loanAmount,
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
  if (path === '/dashboard/charts/expenses-by-category' && method === 'GET') return getDashboardExpensesByCategory(db)
  if (path === '/dashboard/charts/cash-flow' && method === 'GET') return getDashboardCashFlow(db)
  if (path === '/dashboard/charts/balance-evolution' && method === 'GET') return getDashboardBalanceEvolution(db)
  if (path === '/dashboard/charts/future-expenses' && method === 'GET') return getDashboardFutureExpenses(db)

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

  if (path === '/simulations' && method === 'GET') return listSimulations(db)
  if (path === '/simulations' && method === 'POST') return saveSimulation(db, input())
  const simulation = path.match(/^\/simulations\/(\d+)$/)
  if (simulation && method === 'DELETE') return deleteSimulation(db, requireId(simulation))

  if (path === '/reminders/pending' && method === 'GET') return listReminders(db, true)
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
    processDueSubscriptions(db)
    const url = new URL(payload.path, 'local://finanzas')
    return { success: true, data: routeRequest(db, url, method, payload.body) }
  } catch (error) {
    return { success: false, error: safeError(error) }
  }
}

export function getLocalDatabaseInfo(): DatabaseInfo {
  return databaseInfo(getDatabase())
}
