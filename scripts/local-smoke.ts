import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { closeLocalDb, initializeLocalDb } from '../electron/local-db.js'
import { handleLocalRequest } from '../electron/local-service.js'

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'finanzas-lit-'))
const databasePath = path.join(tempDirectory, 'smoke.sqlite')

function request<T>(pathValue: string, method = 'GET', body?: Record<string, unknown>): T {
  const response = handleLocalRequest({
    path: pathValue,
    method,
    body: body ? JSON.stringify(body) : undefined,
  })
  assert.equal(response.success, true, response.error)
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
  initializeLocalDb(databasePath)

  const bank = request<{ id: number }>('/banks', 'POST', {
    name: 'Banco local',
    shortName: 'Local',
    color: '#3366FF',
    iconName: 'Landmark',
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
  const category = request<{ id: number }>('/categories', 'POST', {
    name: 'Alimentos',
    type: 'expense',
    color: '#22AA66',
    iconName: 'Utensils',
    isActive: true,
  })

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
  request(`/fixed-expenses/${fixedExpense.id}/payments`, 'POST', {
    amount: 5000,
    periodMonth: 7,
    periodYear: 2026,
    paymentDate: '2026-07-01',
    isPaid: true,
  })
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
  assert.equal(info.schemaVersion, '1')
} finally {
  closeLocalDb()
  fs.rmSync(tempDirectory, { recursive: true, force: true })
}
