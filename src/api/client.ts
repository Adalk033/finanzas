import { ENDPOINTS } from './endpoints'
import type { ApiResponse, LocalConfig } from '../types/config'
import type {
  Bank,
  BankInput,
  Category,
  CategoryInput,
  FinancialInstrument,
  FinancialInstrumentInput,
  Subcategory,
  SubcategoryInput,
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
}
