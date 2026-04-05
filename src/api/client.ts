import { ENDPOINTS } from './endpoints'
import type { ApiResponse, LocalConfig } from '../types/config'
import {
  getApiProxyBridge,
  getLocalConfigBridge,
  MISSING_ELECTRON_BRIDGE_MESSAGE,
} from '../app/localConfigBridge'
import type {
  Budget,
  BudgetInput,
  Bank,
  BankInput,
  Category,
  CategoryInput,
  CreditCardStatement,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  FinancialInstrumentInput,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentRegisterInput,
  Subscription,
  SubscriptionInput,
  FixedExpense,
  FixedExpenseInput,
  FixedExpensePayment,
  FixedExpensePaymentInput,
  Subcategory,
  SubcategoryInput,
  Simulation,
  SimulationInput,
  DashboardBalanceEvolution,
  DashboardCashFlowPoint,
  DashboardExpenseByCategory,
  DashboardFutureExpensePoint,
  DashboardSummary,
  Reminder,
  ReminderInput,
  Transfer,
  TransferInput,
  Transaction,
  TransactionFilters,
  TransactionInput,
} from '../types/domain'

const CLIENT_VERSION = 'phase0'

function assertHttpsUrl(value: string): void {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('El endpoint no es una URL valida.')
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('El endpoint debe usar HTTPS.')
  }
}

async function getStoredConfig(): Promise<LocalConfig> {
  const bridge = getLocalConfigBridge()

  if (!bridge) {
    throw new Error(MISSING_ELECTRON_BRIDGE_MESSAGE)
  }

  const config = await bridge.getConfig()

  if (!config) {
    throw new Error('Primero configura API Key, endpoint y region en Settings.')
  }

  assertHttpsUrl(config.apiEndpoint)
  return config
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const bridge = getApiProxyBridge()

  if (bridge) {
    try {
      const method = (init.method ?? 'GET').toUpperCase()
      const headers =
        init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)
          ? (init.headers as Record<string, string>)
          : {}
      const body = typeof init.body === 'string' ? init.body : undefined

      const response = await bridge.request({
        path,
        method,
        headers,
        body,
      })

      let data: ApiResponse<T> | null = null

      if (response.bodyText) {
        try {
          data = JSON.parse(response.bodyText) as ApiResponse<T>
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        const apiError =
          data && typeof data === 'object'
            ? (data.error ?? ((data as { message?: string }).message ?? null))
            : null

        return {
          success: false,
          error: apiError ?? `Error HTTP ${response.status} al llamar la API.`,
        }
      }

      if (!data) {
        return {
          success: false,
          error: 'La API respondio en un formato inesperado.',
        }
      }

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de red desconocido.'
      console.error('[apiClient] proxy request failed', { path, error: errorMessage })
      return {
        success: false,
        error: `No se pudo conectar con el API Gateway. ${errorMessage}`,
      }
    }
  }

  const config = await getStoredConfig()
  const baseUrl = config.apiEndpoint.replace(/\/$/, '')

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-client-version': CLIENT_VERSION,
        ...init.headers,
      },
    })

    const rawBody = await response.text()
    let data: ApiResponse<T> | null = null

    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as ApiResponse<T>
      } catch {
        data = null
      }
    }

    if (!response.ok) {
      const apiError =
        data && typeof data === 'object'
          ? (data.error ?? ((data as { message?: string }).message ?? null))
          : null

      return {
        success: false,
        error: apiError ?? `Error HTTP ${response.status} al llamar la API.`,
      }
    }

    if (!data) {
      return {
        success: false,
        error: 'La API respondio en un formato inesperado.',
      }
    }

    return data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error de red desconocido.'
    console.error('[apiClient] request failed', { path, error: errorMessage })
    return {
      success: false,
      error: `No se pudo conectar con el API Gateway. ${errorMessage}`,
    }
  }
}

function setTrimmedIfPresent(target: Record<string, unknown>, key: string, value: string): void {
  const normalized = value.trim()
  if (normalized) {
    target[key] = normalized
  }
}

function setIfNotNull(target: Record<string, unknown>, key: string, value: unknown): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return
  }

  if (value !== null && value !== undefined) {
    target[key] = value
  }
}

function sanitizeBankPayload(payload: BankInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    isActive: payload.isActive,
  }

  setTrimmedIfPresent(sanitized, 'shortName', payload.shortName)
  setTrimmedIfPresent(sanitized, 'color', payload.color)
  setTrimmedIfPresent(sanitized, 'iconName', payload.iconName)

  return sanitized
}

function sanitizeInstrumentPayload(payload: FinancialInstrumentInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    bankId: payload.bankId,
    name: payload.name.trim(),
    type: payload.type,
    currencyId: payload.currencyId,
    isActive: payload.isActive,
  }

  setTrimmedIfPresent(sanitized, 'lastFour', payload.lastFour)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  if (payload.type === 'credit_card') {
    setIfNotNull(sanitized, 'creditLimit', payload.creditLimit)
    setIfNotNull(sanitized, 'currentBalance', payload.currentBalance)
    setIfNotNull(sanitized, 'availableCredit', payload.availableCredit)
    setIfNotNull(sanitized, 'cutOffDay', payload.cutOffDay)
    setIfNotNull(sanitized, 'paymentDueDay', payload.paymentDueDay)
    setIfNotNull(sanitized, 'annualRate', payload.annualRate)
  } else {
    setIfNotNull(sanitized, 'currentAmount', payload.currentAmount)
  }

  return sanitized
}

function sanitizeInstrumentLegacyPayload(payload: FinancialInstrumentInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    bankId: payload.bankId,
    name: payload.name.trim(),
    type: payload.type,
    currencyId: payload.currencyId,
  }

  setTrimmedIfPresent(sanitized, 'lastFour', payload.lastFour)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  if (payload.type === 'credit_card') {
    setIfNotNull(sanitized, 'creditLimit', payload.creditLimit)
    setIfNotNull(sanitized, 'currentBalance', payload.currentBalance)
    setIfNotNull(sanitized, 'cutOffDay', payload.cutOffDay)
    setIfNotNull(sanitized, 'paymentDueDay', payload.paymentDueDay)
  } else {
    setIfNotNull(sanitized, 'currentAmount', payload.currentAmount)
  }

  return sanitized
}

function isInvalidRequestBodyError(error: string | undefined): boolean {
  return typeof error === 'string' && error.toLowerCase().includes('invalid request body')
}

function sanitizeCategoryPayload(payload: CategoryInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    type: payload.type,
    isActive: payload.isActive,
  }

  setTrimmedIfPresent(sanitized, 'iconName', payload.iconName)
  setTrimmedIfPresent(sanitized, 'color', payload.color)

  return sanitized
}

function sanitizeSubcategoryPayload(payload: SubcategoryInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    categoryId: payload.categoryId,
    name: payload.name.trim(),
    isActive: payload.isActive,
  }

  setTrimmedIfPresent(sanitized, 'iconName', payload.iconName)

  return sanitized
}

function sanitizeTransactionPayload(payload: TransactionInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    instrumentId: payload.instrumentId,
    currencyId: payload.currencyId,
    type: payload.type,
    amount: payload.amount,
    transactionDate: payload.transactionDate,
    isMsi: payload.isMsi,
  }

  if (payload.categoryId !== null && payload.categoryId > 0) {
    sanitized.categoryId = payload.categoryId
  }

  if (payload.subcategoryId !== null && payload.subcategoryId > 0) {
    sanitized.subcategoryId = payload.subcategoryId
  }

  setIfNotNull(sanitized, 'msiMonths', payload.msiMonths)
  setTrimmedIfPresent(sanitized, 'description', payload.description)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeStatementPayload(payload: CreditCardStatementInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    instrumentId: payload.instrumentId,
    cutOffDate: payload.cutOffDate,
  }

  setTrimmedIfPresent(sanitized, 'paymentDueDate', payload.paymentDueDate)
  setIfNotNull(sanitized, 'minimumPayment', payload.minimumPayment)
  setIfNotNull(sanitized, 'noInterestPayment', payload.noInterestPayment)

  return sanitized
}

function sanitizeStatementUpdatePayload(payload: CreditCardStatementUpdateInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  setTrimmedIfPresent(sanitized, 'paymentDueDate', payload.paymentDueDate)
  setIfNotNull(sanitized, 'minimumPayment', payload.minimumPayment)
  setIfNotNull(sanitized, 'noInterestPayment', payload.noInterestPayment)
  setIfNotNull(sanitized, 'isPaid', payload.isPaid)
  setIfNotNull(sanitized, 'paidAmount', payload.paidAmount)
  setTrimmedIfPresent(sanitized, 'paidDate', payload.paidDate)

  return sanitized
}

function sanitizeTransferPayload(payload: TransferInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    sourceInstrumentId: payload.sourceInstrumentId,
    destinationInstrumentId: payload.destinationInstrumentId,
    amount: payload.amount,
    currencyId: payload.currencyId,
    transferDate: payload.transferDate,
    type: payload.type,
  }

  setIfNotNull(sanitized, 'statementId', payload.statementId)
  setIfNotNull(sanitized, 'loanId', payload.loanId)
  setTrimmedIfPresent(sanitized, 'description', payload.description)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeLoanPayload(payload: LoanInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    currencyId: payload.currencyId,
    originalAmount: payload.originalAmount,
    totalInstallments: payload.totalInstallments,
    paymentType: payload.paymentType,
    startDate: payload.startDate,
    isActive: payload.isActive,
  }

  setIfNotNull(sanitized, 'annualRate', payload.annualRate)
  setIfNotNull(sanitized, 'fixedPayment', payload.fixedPayment)
  setIfNotNull(sanitized, 'paymentDay', payload.paymentDay)
  setIfNotNull(sanitized, 'instrumentId', payload.instrumentId)
  setTrimmedIfPresent(sanitized, 'lender', payload.lender)
  setTrimmedIfPresent(sanitized, 'endDate', payload.endDate)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeLoanPaymentRegisterPayload(payload: LoanPaymentRegisterInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  setTrimmedIfPresent(sanitized, 'paidDate', payload.paidDate)
  setIfNotNull(sanitized, 'amount', payload.amount)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeSubscriptionPayload(payload: SubscriptionInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    instrumentId: payload.instrumentId,
    currencyId: payload.currencyId,
    amount: payload.amount,
    billingCycle: payload.billingCycle,
    billingDay: payload.billingDay,
    isActive: payload.isActive,
  }

  setIfNotNull(sanitized, 'categoryId', payload.categoryId)
  setIfNotNull(sanitized, 'subcategoryId', payload.subcategoryId)
  setTrimmedIfPresent(sanitized, 'nextBilling', payload.nextBilling)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeFixedExpensePayload(payload: FixedExpenseInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    currencyId: payload.currencyId,
    estimatedAmount: payload.estimatedAmount,
    isVariable: payload.isVariable,
    paymentDay: payload.paymentDay,
    isActive: payload.isActive,
  }

  setIfNotNull(sanitized, 'instrumentId', payload.instrumentId)
  setIfNotNull(sanitized, 'categoryId', payload.categoryId)
  setIfNotNull(sanitized, 'subcategoryId', payload.subcategoryId)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeFixedExpensePaymentPayload(payload: FixedExpensePaymentInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    amount: payload.amount,
    periodMonth: payload.periodMonth,
    periodYear: payload.periodYear,
    isPaid: payload.isPaid,
  }

  setTrimmedIfPresent(sanitized, 'paymentDate', payload.paymentDate)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeBudgetPayload(payload: BudgetInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    currencyId: payload.currencyId,
    amount: payload.amount,
    month: payload.month,
    year: payload.year,
  }

  setIfNotNull(sanitized, 'categoryId', payload.categoryId)
  setTrimmedIfPresent(sanitized, 'notes', payload.notes)

  return sanitized
}

function sanitizeSimulationPayload(payload: SimulationInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: payload.name.trim(),
    scenarioType: payload.scenarioType,
    amount: payload.amount,
  }

  setIfNotNull(sanitized, 'instrumentId', payload.instrumentId)
  setIfNotNull(sanitized, 'msiMonths', payload.msiMonths)
  setIfNotNull(sanitized, 'loanMonths', payload.loanMonths)
  setIfNotNull(sanitized, 'annualRate', payload.annualRate)
  setTrimmedIfPresent(sanitized, 'description', payload.description)
  setTrimmedIfPresent(sanitized, 'simulationDate', payload.simulationDate)

  return sanitized
}

function sanitizeReminderPayload(payload: ReminderInput): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    title: payload.title.trim(),
    reminderDate: payload.reminderDate,
    type: payload.type,
    isRead: payload.isRead,
    isDismissed: payload.isDismissed,
  }

  setIfNotNull(sanitized, 'referenceId', payload.referenceId)
  setTrimmedIfPresent(sanitized, 'description', payload.description)
  setTrimmedIfPresent(sanitized, 'referenceType', payload.referenceType)

  return sanitized
}

function buildTransactionQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams()

  if (filters.fromDate) {
    params.set('from_date', filters.fromDate)
  }

  if (filters.toDate) {
    params.set('to_date', filters.toDate)
  }

  if (filters.categoryId) {
    params.set('category_id', String(filters.categoryId))
  }

  if (filters.instrumentId) {
    params.set('instrument_id', String(filters.instrumentId))
  }

  if (filters.type) {
    params.set('type', filters.type)
  }

  if (filters.search && filters.search.trim().length > 0) {
    params.set('search', filters.search.trim())
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export const apiClient = {
  health: () => request<{ status: string }>(ENDPOINTS.HEALTH, { method: 'GET' }),
  bootstrapPing: async (message: string) => {
    const config = await getStoredConfig()

    const primaryResponse = await request<{ message: string }>(ENDPOINTS.BOOTSTRAP_PING, {
      method: 'POST',
      body: JSON.stringify({
        awsRegion: config.awsRegion,
        message,
      }),
    })

    if (primaryResponse.success) {
      return primaryResponse
    }

    const shouldRetryWithLegacyRegion =
      typeof primaryResponse.error === 'string'
      && primaryResponse.error.toLowerCase().includes('invalid request body')

    if (!shouldRetryWithLegacyRegion) {
      return primaryResponse
    }

    return request<{ message: string }>(ENDPOINTS.BOOTSTRAP_PING, {
      method: 'POST',
      body: JSON.stringify({
        awsRegion: 'us-east-1',
        message,
      }),
    })
  },
  getDashboardSummary: () => request<DashboardSummary>(ENDPOINTS.DASHBOARD_SUMMARY, { method: 'GET' }),
  getDashboardExpensesByCategory: () => request<DashboardExpenseByCategory[]>(ENDPOINTS.DASHBOARD_EXPENSES_BY_CATEGORY, { method: 'GET' }),
  getDashboardCashFlow: () => request<DashboardCashFlowPoint[]>(ENDPOINTS.DASHBOARD_CASH_FLOW, { method: 'GET' }),
  getDashboardBalanceEvolution: () => request<DashboardBalanceEvolution>(ENDPOINTS.DASHBOARD_BALANCE_EVOLUTION, { method: 'GET' }),
  getDashboardFutureExpenses: () => request<DashboardFutureExpensePoint[]>(ENDPOINTS.DASHBOARD_FUTURE_EXPENSES, { method: 'GET' }),
  getBanks: () => request<Bank[]>(ENDPOINTS.BANKS, { method: 'GET' }),
  createBank: (payload: BankInput) =>
    request<Bank>(ENDPOINTS.BANKS, {
      method: 'POST',
      body: JSON.stringify(sanitizeBankPayload(payload)),
    }),
  updateBank: (id: number, payload: BankInput) =>
    request<Bank>(`${ENDPOINTS.BANKS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeBankPayload(payload)),
    }),
  deleteBank: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.BANKS}/${id}`, {
      method: 'DELETE',
    }),
  getCategories: () => request<Category[]>(ENDPOINTS.CATEGORIES, { method: 'GET' }),
  createCategory: (payload: CategoryInput) =>
    request<Category>(ENDPOINTS.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(sanitizeCategoryPayload(payload)),
    }),
  updateCategory: (id: number, payload: CategoryInput) =>
    request<Category>(`${ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeCategoryPayload(payload)),
    }),
  deleteCategory: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'DELETE',
    }),
  getSubcategories: (categoryId?: number) => {
    if (!categoryId) {
      return request<Subcategory[]>(ENDPOINTS.SUBCATEGORIES, { method: 'GET' })
    }

    return request<Subcategory[]>(`${ENDPOINTS.SUBCATEGORIES}?category_id=${categoryId}`, { method: 'GET' })
  },
  createSubcategory: (payload: SubcategoryInput) =>
    request<Subcategory>(ENDPOINTS.SUBCATEGORIES, {
      method: 'POST',
      body: JSON.stringify(sanitizeSubcategoryPayload(payload)),
    }),
  updateSubcategory: (id: number, payload: SubcategoryInput) =>
    request<Subcategory>(`${ENDPOINTS.SUBCATEGORIES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeSubcategoryPayload(payload)),
    }),
  deleteSubcategory: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.SUBCATEGORIES}/${id}`, {
      method: 'DELETE',
    }),
  getInstruments: (bankId?: number) => {
    if (!bankId) {
      return request<FinancialInstrument[]>(ENDPOINTS.INSTRUMENTS, { method: 'GET' })
    }

    return request<FinancialInstrument[]>(`${ENDPOINTS.INSTRUMENTS}?bank_id=${bankId}`, { method: 'GET' })
  },
  createInstrument: (payload: FinancialInstrumentInput) =>
    request<FinancialInstrument>(ENDPOINTS.INSTRUMENTS, {
      method: 'POST',
      body: JSON.stringify(sanitizeInstrumentPayload(payload)),
    }).then((primaryResponse) => {
      if (primaryResponse.success || !isInvalidRequestBodyError(primaryResponse.error)) {
        return primaryResponse
      }

      return request<FinancialInstrument>(ENDPOINTS.INSTRUMENTS, {
        method: 'POST',
        body: JSON.stringify(sanitizeInstrumentLegacyPayload(payload)),
      })
    }),
  updateInstrument: (id: number, payload: FinancialInstrumentInput) =>
    request<FinancialInstrument>(`${ENDPOINTS.INSTRUMENTS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeInstrumentPayload(payload)),
    }).then((primaryResponse) => {
      if (primaryResponse.success || !isInvalidRequestBodyError(primaryResponse.error)) {
        return primaryResponse
      }

      return request<FinancialInstrument>(`${ENDPOINTS.INSTRUMENTS}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(sanitizeInstrumentLegacyPayload(payload)),
      })
    }),
  deleteInstrument: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.INSTRUMENTS}/${id}`, {
      method: 'DELETE',
    }),
  getTransactions: (filters: TransactionFilters = {}) =>
    request<Transaction[]>(`${ENDPOINTS.TRANSACTIONS}${buildTransactionQuery(filters)}`, { method: 'GET' }),
  createTransaction: (payload: TransactionInput) =>
    request<Transaction>(ENDPOINTS.TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(sanitizeTransactionPayload(payload)),
    }),
  updateTransaction: (id: number, payload: TransactionInput) =>
    request<Transaction>(`${ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeTransactionPayload(payload)),
    }),
  deleteTransaction: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'DELETE',
    }),
  getStatements: (instrumentId?: number) => {
    if (!instrumentId) {
      return request<CreditCardStatement[]>(ENDPOINTS.STATEMENTS, { method: 'GET' })
    }

    return request<CreditCardStatement[]>(`${ENDPOINTS.STATEMENTS}?instrument_id=${instrumentId}`, { method: 'GET' })
  },
  createStatement: (payload: CreditCardStatementInput) =>
    request<CreditCardStatement>(ENDPOINTS.STATEMENTS, {
      method: 'POST',
      body: JSON.stringify(sanitizeStatementPayload(payload)),
    }),
  updateStatement: (id: number, payload: CreditCardStatementUpdateInput) =>
    request<CreditCardStatement>(`${ENDPOINTS.STATEMENTS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeStatementUpdatePayload(payload)),
    }),
  getStatementMovements: (statementId: number) =>
    request<Transaction[]>(`${ENDPOINTS.STATEMENTS}/${statementId}/movements`, {
      method: 'GET',
    }),
  deleteStatement: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.STATEMENTS}/${id}`, {
      method: 'DELETE',
    }),
  getTransfers: (instrumentId?: number) => {
    if (!instrumentId) {
      return request<Transfer[]>(ENDPOINTS.TRANSFERS, { method: 'GET' })
    }

    return request<Transfer[]>(`${ENDPOINTS.TRANSFERS}?instrument_id=${instrumentId}`, { method: 'GET' })
  },
  createTransfer: (payload: TransferInput) =>
    request<Transfer>(ENDPOINTS.TRANSFERS, {
      method: 'POST',
      body: JSON.stringify(sanitizeTransferPayload(payload)),
    }),
  updateTransfer: (id: number, payload: TransferInput) =>
    request<Transfer>(`${ENDPOINTS.TRANSFERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeTransferPayload(payload)),
    }),
  deleteTransfer: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.TRANSFERS}/${id}`, {
      method: 'DELETE',
    }),
  getLoans: () => request<Loan[]>(ENDPOINTS.LOANS, { method: 'GET' }),
  createLoan: (payload: LoanInput) =>
    request<Loan>(ENDPOINTS.LOANS, {
      method: 'POST',
      body: JSON.stringify(sanitizeLoanPayload(payload)),
    }),
  updateLoan: (id: number, payload: LoanInput) =>
    request<Loan>(`${ENDPOINTS.LOANS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeLoanPayload(payload)),
    }),
  deleteLoan: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.LOANS}/${id}`, {
      method: 'DELETE',
    }),
  getLoanPayments: (loanId: number) =>
    request<LoanPayment[]>(`${ENDPOINTS.LOANS}/${loanId}/payments`, {
      method: 'GET',
    }),
  payLoanInstallment: (loanId: number, installmentNum: number, payload: LoanPaymentRegisterInput) =>
    request<{ loan: Loan; payment: LoanPayment }>(`${ENDPOINTS.LOANS}/${loanId}/payments/${installmentNum}/pay`, {
      method: 'POST',
      body: JSON.stringify(sanitizeLoanPaymentRegisterPayload(payload)),
    }),
  getSubscriptions: () => request<Subscription[]>(ENDPOINTS.SUBSCRIPTIONS, { method: 'GET' }),
  createSubscription: (payload: SubscriptionInput) =>
    request<Subscription>(ENDPOINTS.SUBSCRIPTIONS, {
      method: 'POST',
      body: JSON.stringify(sanitizeSubscriptionPayload(payload)),
    }),
  updateSubscription: (id: number, payload: SubscriptionInput) =>
    request<Subscription>(`${ENDPOINTS.SUBSCRIPTIONS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeSubscriptionPayload(payload)),
    }),
  deleteSubscription: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.SUBSCRIPTIONS}/${id}`, {
      method: 'DELETE',
    }),
  getFixedExpenses: () => request<FixedExpense[]>(ENDPOINTS.FIXED_EXPENSES, { method: 'GET' }),
  createFixedExpense: (payload: FixedExpenseInput) =>
    request<FixedExpense>(ENDPOINTS.FIXED_EXPENSES, {
      method: 'POST',
      body: JSON.stringify(sanitizeFixedExpensePayload(payload)),
    }),
  updateFixedExpense: (id: number, payload: FixedExpenseInput) =>
    request<FixedExpense>(`${ENDPOINTS.FIXED_EXPENSES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeFixedExpensePayload(payload)),
    }),
  deleteFixedExpense: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.FIXED_EXPENSES}/${id}`, {
      method: 'DELETE',
    }),
  getFixedExpensePayments: (fixedExpenseId: number) =>
    request<FixedExpensePayment[]>(`${ENDPOINTS.FIXED_EXPENSES}/${fixedExpenseId}/payments`, {
      method: 'GET',
    }),
  createFixedExpensePayment: (fixedExpenseId: number, payload: FixedExpensePaymentInput) =>
    request<FixedExpensePayment>(`${ENDPOINTS.FIXED_EXPENSES}/${fixedExpenseId}/payments`, {
      method: 'POST',
      body: JSON.stringify(sanitizeFixedExpensePaymentPayload(payload)),
    }),
  updateFixedExpensePayment: (fixedExpenseId: number, paymentId: number, payload: FixedExpensePaymentInput) =>
    request<FixedExpensePayment>(`${ENDPOINTS.FIXED_EXPENSES}/${fixedExpenseId}/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeFixedExpensePaymentPayload(payload)),
    }),
  deleteFixedExpensePayment: (fixedExpenseId: number, paymentId: number) =>
    request<{ id: number }>(`${ENDPOINTS.FIXED_EXPENSES}/${fixedExpenseId}/payments/${paymentId}`, {
      method: 'DELETE',
    }),
  getBudgets: (month?: number, year?: number) => {
    const params = new URLSearchParams()

    if (month) {
      params.set('month', String(month))
    }

    if (year) {
      params.set('year', String(year))
    }

    const query = params.toString()
    const path = query.length > 0 ? `${ENDPOINTS.BUDGETS}?${query}` : ENDPOINTS.BUDGETS
    return request<Budget[]>(path, { method: 'GET' })
  },
  createBudget: (payload: BudgetInput) =>
    request<Budget>(ENDPOINTS.BUDGETS, {
      method: 'POST',
      body: JSON.stringify(sanitizeBudgetPayload(payload)),
    }),
  updateBudget: (id: number, payload: BudgetInput) =>
    request<Budget>(`${ENDPOINTS.BUDGETS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeBudgetPayload(payload)),
    }),
  deleteBudget: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.BUDGETS}/${id}`, {
      method: 'DELETE',
    }),
  getSimulations: () => request<Simulation[]>(ENDPOINTS.SIMULATIONS, { method: 'GET' }),
  createSimulation: (payload: SimulationInput) =>
    request<Simulation>(ENDPOINTS.SIMULATIONS, {
      method: 'POST',
      body: JSON.stringify(sanitizeSimulationPayload(payload)),
    }),
  deleteSimulation: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.SIMULATIONS}/${id}`, {
      method: 'DELETE',
    }),
  getReminders: () => request<Reminder[]>(ENDPOINTS.REMINDERS, { method: 'GET' }),
  getPendingReminders: () => request<Reminder[]>(ENDPOINTS.REMINDERS_PENDING, { method: 'GET' }),
  createReminder: (payload: ReminderInput) =>
    request<Reminder>(ENDPOINTS.REMINDERS, {
      method: 'POST',
      body: JSON.stringify(sanitizeReminderPayload(payload)),
    }),
  updateReminder: (id: number, payload: ReminderInput) =>
    request<Reminder>(`${ENDPOINTS.REMINDERS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeReminderPayload(payload)),
    }),
  deleteReminder: (id: number) =>
    request<{ id: number }>(`${ENDPOINTS.REMINDERS}/${id}`, {
      method: 'DELETE',
    }),
}
