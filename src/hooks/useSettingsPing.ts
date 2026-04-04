import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { getLocalConfigBridge } from '../app/localConfigBridge'

export type CloudConnectionStatus = 'unconfigured' | 'checking' | 'connected' | 'disconnected'

export function useSettingsPing() {
  const [pingResponse, setPingResponse] = useState('')
  const [pingError, setPingError] = useState('')
  const [isPinging, setIsPinging] = useState(false)
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<CloudConnectionStatus>('unconfigured')

  const refreshCloudConnection = useCallback(async (): Promise<void> => {
    setPingError('')
    setCloudConnectionStatus('checking')

    let configExists = false

    try {
      const bridge = getLocalConfigBridge()
      configExists = Boolean(await bridge?.getConfig())
    } catch {
      configExists = false
    }

    if (!configExists) {
      setCloudConnectionStatus('unconfigured')
      return
    }

    const healthResult = await apiClient.health()

    if (!healthResult.success) {
      setCloudConnectionStatus('disconnected')
      return
    }

    setCloudConnectionStatus('connected')
  }, [])

  const handlePing = async (): Promise<void> => {
    setIsPinging(true)
    setPingError('')
    setPingResponse('')

    const healthResult = await apiClient.health()

    if (!healthResult.success) {
      setPingError(healthResult.error ?? 'Fallo health check.')
      setCloudConnectionStatus('disconnected')
      setIsPinging(false)
      return
    }

    setCloudConnectionStatus('connected')

    const pingResult = await apiClient.bootstrapPing('conexion inicial ok')

    if (!pingResult.success) {
      setPingError(pingResult.error ?? 'Fallo bootstrap ping.')
      setIsPinging(false)
      return
    }

    setPingResponse(pingResult.data?.message ?? 'Conexion validada.')
    setIsPinging(false)
  }

  useEffect(() => {
    void refreshCloudConnection()

    const intervalId = window.setInterval(() => {
      void refreshCloudConnection()
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [refreshCloudConnection])

  return {
    pingResponse,
    pingError,
    isPinging,
    cloudConnectionStatus,
    refreshCloudConnection,
    handlePing,
  }
}
