import { useCallback, useEffect, useState } from 'react'
import type { LocalConfig, LocalConfigInput } from '../types/config'
import {
  getLocalConfigBridge,
  MISSING_ELECTRON_BRIDGE_MESSAGE,
} from '../app/localConfigBridge'

interface UseLocalConfigResult {
  config: LocalConfigInput
  hasElectronBridge: boolean
  isLoading: boolean
  isSaving: boolean
  error: string
  successMessage: string
  setConfig: (next: LocalConfigInput) => void
  loadConfig: () => Promise<void>
  saveConfig: () => Promise<void>
}

const EMPTY_CONFIG: LocalConfigInput = {
  apiKey: '',
  apiEndpoint: '',
  awsRegion: '',
}

function toInput(config: LocalConfig | null): LocalConfigInput {
  if (!config) {
    return EMPTY_CONFIG
  }

  return {
    apiKey: config.apiKey,
    apiEndpoint: config.apiEndpoint,
    awsRegion: config.awsRegion,
  }
}

export function useLocalConfig(): UseLocalConfigResult {
  const hasElectronBridge = Boolean(getLocalConfigBridge())
  const [config, setConfig] = useState<LocalConfigInput>(EMPTY_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadConfig = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError('')

    try {
      const bridge = getLocalConfigBridge()

      if (!bridge) {
        setConfig(EMPTY_CONFIG)
        return
      }

      const currentConfig = await bridge.getConfig()
      setConfig(toInput(currentConfig))
    } catch (loadError) {
      if (!(loadError instanceof Error && loadError.message.includes('bridge'))) {
        setError('No se pudo leer la configuracion local.')
      }

      setConfig(EMPTY_CONFIG)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(async (): Promise<void> => {
    const bridge = getLocalConfigBridge()

    if (!bridge) {
      setError(MISSING_ELECTRON_BRIDGE_MESSAGE)
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const saved = await bridge.saveConfig(config)
      setConfig(toInput(saved))
      setSuccessMessage('Configuracion guardada correctamente.')
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'No se pudo guardar la configuracion.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }, [config])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  return {
    config,
    hasElectronBridge,
    isLoading,
    isSaving,
    error,
    successMessage,
    setConfig,
    loadConfig,
    saveConfig: save,
  }
}
