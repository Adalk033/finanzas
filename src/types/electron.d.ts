import type { LocalConfig, LocalConfigInput } from './config'

type LocalConfigBridge = {
  getConfig: () => Promise<LocalConfig | null>
  saveConfig: (config: LocalConfigInput) => Promise<LocalConfig>
}

declare global {
  interface Window {
    localConfig?: LocalConfigBridge
    electronAPI?: {
      localConfig?: LocalConfigBridge
    }
    electron?: {
      localConfig?: LocalConfigBridge
    }
  }
}

export {}
