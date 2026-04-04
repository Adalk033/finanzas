import type { LocalConfig, LocalConfigInput } from '../types/config'

export type LocalConfigBridge = {
  getConfig: () => Promise<LocalConfig | null>
  saveConfig: (config: LocalConfigInput) => Promise<LocalConfig>
}

type LegacyWindow = Window & {
  electronAPI?: {
    localConfig?: LocalConfigBridge
  }
  electron?: {
    localConfig?: LocalConfigBridge
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