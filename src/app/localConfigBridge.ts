import type { LocalConfig, LocalConfigInput } from '../types/config'

export type LocalConfigBridge = {
  getConfig: () => Promise<LocalConfig | null>
  saveConfig: (config: LocalConfigInput) => Promise<LocalConfig>
}

export type ApiProxyRequestPayload = {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export type ApiProxyResponsePayload = {
  ok: boolean
  status: number
  bodyText: string
}

export type ApiProxyBridge = {
  request: (payload: ApiProxyRequestPayload) => Promise<ApiProxyResponsePayload>
}

type LegacyWindow = Window & {
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

export const MISSING_ELECTRON_BRIDGE_MESSAGE =
  'No se encontro el bridge de Electron para configuracion local. Abre la app de escritorio de Electron para guardar la API Key.'

export function getLocalConfigBridge(): LocalConfigBridge | null {
  const maybeWindow = window as LegacyWindow

  if (maybeWindow.localConfig) {
    return maybeWindow.localConfig
  }

  if (maybeWindow.electronAPI?.localConfig) {
    return maybeWindow.electronAPI.localConfig
  }

  if (maybeWindow.electron?.localConfig) {
    return maybeWindow.electron.localConfig
  }

  return null
}

export function getApiProxyBridge(): ApiProxyBridge | null {
  const maybeWindow = window as LegacyWindow

  if (maybeWindow.apiProxy) {
    return maybeWindow.apiProxy
  }

  if (maybeWindow.electronAPI?.apiProxy) {
    return maybeWindow.electronAPI.apiProxy
  }

  if (maybeWindow.electron?.apiProxy) {
    return maybeWindow.electron.apiProxy
  }

  return null
}