import { ENDPOINTS } from './endpoints'
import type { ApiResponse, LocalConfig } from '../types/config'
import type {
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
  Subcategory,
  SubcategoryInput,
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
  if (!window.localConfig) {
    throw new Error('No se encontro la API de configuracion local.')
  }

  const config = await window.localConfig.getConfig()

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

    const data = (await response.json()) as ApiResponse<T>

    if (!response.ok) {
      return {
        success: false,
        error: data.error ?? 'Ocurrio un error al llamar la API.',
      }
    }

    return data
  } catch (error) {
    console.error('[apiClient] request failed', { path, error })
    return {
      success: false,
      error: 'No se pudo conectar con el API Gateway.',
    }
  }
}

function sanitizeBankPayload(payload: BankInput): Omit<BankInput, 'shortName' | 'color' | 'iconName'> & {
  shortName: string | null
  color: string | null
  iconName: string | null
} {
  return {
    ...payload,
    shortName: payload.shortName.trim() || null,
    color: payload.color.trim() || null,
    iconName: payload.iconName.trim() || null,
  }
}

function sanitizeInstrumentPayload(payload: FinancialInstrumentInput): Omit<FinancialInstrumentInput, 'lastFour' | 'notes'> & {
  lastFour: string | null
  notes: string | null
} {
  return {
    ...payload,
    lastFour: payload.lastFour.trim() || null,
    notes: payload.notes.trim() || null,
  }
}

function sanitizeCategoryPayload(payload: CategoryInput): Omit<CategoryInput, 'iconName' | 'color'> & {
  iconName: string | null
  color: string | null
} {
  return {
    ...payload,
    iconName: payload.iconName.trim() || null,
    color: payload.color.trim() || null,
  }
}

function sanitizeSubcategoryPayload(payload: SubcategoryInput): Omit<SubcategoryInput, 'iconName'> & {
  iconName: string | null
} {
  return {
    ...payload,
    iconName: payload.iconName.trim() || null,
  }
}

function sanitizeTransactionPayload(payload: TransactionInput): Omit<TransactionInput, 'description' | 'notes'> & {
  description: string | null
  notes: string | null
} {
  return {
    ...payload,
    description: payload.description.trim() || null,
    notes: payload.notes.trim() || null,
  }
}

function sanitizeStatementPayload(payload: CreditCardStatementInput): {
  instrumentId: number
  cutOffDate: string
  paymentDueDate: string | null
  minimumPayment: number | null
  noInterestPayment: number | null
} {
  return {
    instrumentId: payload.instrumentId,
    cutOffDate: payload.cutOffDate,
    paymentDueDate: payload.paymentDueDate.trim() || null,
    minimumPayment: payload.minimumPayment,
    noInterestPayment: payload.noInterestPayment,
  }
}

function sanitizeStatementUpdatePayload(payload: CreditCardStatementUpdateInput): {
  paymentDueDate: string | null
  minimumPayment: number | null
  noInterestPayment: number | null
  isPaid: boolean | null
  paidAmount: number | null
  paidDate: string | null
} {
  return {
    paymentDueDate: payload.paymentDueDate.trim() || null,
    minimumPayment: payload.minimumPayment,
    noInterestPayment: payload.noInterestPayment,
    isPaid: payload.isPaid,
    paidAmount: payload.paidAmount,
    paidDate: payload.paidDate.trim() || null,
  }
}

function sanitizeTransferPayload(payload: TransferInput): Omit<TransferInput, 'description' | 'notes'> & {
  description: string | null
  notes: string | null
} {
  return {
    ...payload,
    description: payload.description.trim() || null,
    notes: payload.notes.trim() || null,
  }
}

function sanitizeLoanPayload(payload: LoanInput): Omit<LoanInput, 'lender' | 'endDate' | 'notes'> & {
  lender: string | null
  endDate: string | null
  notes: string | null
} {
  return {
    ...payload,
    lender: payload.lender.trim() || null,
    endDate: payload.endDate.trim() || null,
    notes: payload.notes.trim() || null,
  }
}

function sanitizeLoanPaymentRegisterPayload(payload: LoanPaymentRegisterInput): {
  paidDate: string | null
  amount: number | null
  notes: string | null
} {
  return {
    paidDate: payload.paidDate.trim() || null,
    amount: payload.amount,
    notes: payload.notes.trim() || null,
  }
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
  bootstrapPing: (message: string) =>
    request<{ message: string }>(ENDPOINTS.BOOTSTRAP_PING, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
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
    }),
  updateInstrument: (id: number, payload: FinancialInstrumentInput) =>
    request<FinancialInstrument>(`${ENDPOINTS.INSTRUMENTS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sanitizeInstrumentPayload(payload)),
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
}
