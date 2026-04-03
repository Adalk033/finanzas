import type { LocalConfig, LocalConfigInput } from './config'

declare global {
  interface Window {
    localConfig: {
      getConfig: () => Promise<LocalConfig | null>
      saveConfig: (config: LocalConfigInput) => Promise<LocalConfig>
    }
  }
}

export {}
