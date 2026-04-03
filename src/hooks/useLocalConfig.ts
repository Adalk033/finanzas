import { useCallback, useEffect, useState } from 'react'
import type { LocalConfig, LocalConfigInput } from '../types/config'

interface UseLocalConfigResult {
  config: LocalConfigInput
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
  const [config, setConfig] = useState<LocalConfigInput>(EMPTY_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadConfig = useCallback(async (): Promise<void> => {
    if (!window.localConfig) {
      setError('No se encontro el bridge de Electron para configuracion local.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const currentConfig = await window.localConfig.getConfig()
      setConfig(toInput(currentConfig))
    } catch {
      setError('No se pudo leer la configuracion local.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(async (): Promise<void> => {
    if (!window.localConfig) {
      setError('No se encontro el bridge de Electron para configuracion local.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMessage('')

    try {
      const saved = await window.localConfig.saveConfig(config)
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
    isLoading,
    isSaving,
    error,
    successMessage,
    setConfig,
    loadConfig,
    saveConfig: save,
  }
}
