import { ENDPOINTS } from './endpoints'
import type { ApiResponse, LocalConfig } from '../types/config'

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

export const apiClient = {
  health: () => request<{ status: string }>(ENDPOINTS.HEALTH, { method: 'GET' }),
  bootstrapPing: (message: string) =>
    request<{ message: string }>(ENDPOINTS.BOOTSTRAP_PING, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}
