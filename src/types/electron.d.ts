import type { LocalConfig, LocalConfigInput } from './config'

type LocalConfigBridge = {
  getConfig: () => Promise<LocalConfig | null>
  saveConfig: (config: LocalConfigInput) => Promise<LocalConfig>
}

type ApiProxyRequestPayload = {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

type ApiProxyResponsePayload = {
  ok: boolean
  status: number
  bodyText: string
}

type ApiProxyBridge = {
  request: (payload: ApiProxyRequestPayload) => Promise<ApiProxyResponsePayload>
}

declare global {
  interface Window {
    localConfig?: LocalConfigBridge
    apiProxy?: ApiProxyBridge
    electronAPI?: {
      localConfig?: LocalConfigBridge
      apiProxy?: ApiProxyBridge
    }
    electron?: {
      localConfig?: LocalConfigBridge
      apiProxy?: ApiProxyBridge
    }
  }
}

export {}
