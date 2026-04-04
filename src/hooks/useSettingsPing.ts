import { useState } from 'react'
import { apiClient } from '../api/client'

export function useSettingsPing() {
  const [pingResponse, setPingResponse] = useState('')
  const [pingError, setPingError] = useState('')
  const [isPinging, setIsPinging] = useState(false)

  const handlePing = async (): Promise<void> => {
    setIsPinging(true)
    setPingError('')
    setPingResponse('')

    const healthResult = await apiClient.health()

    if (!healthResult.success) {
      setPingError(healthResult.error ?? 'Fallo health check.')
      setIsPinging(false)
      return
    }

    const pingResult = await apiClient.bootstrapPing('conexion inicial ok')

    if (!pingResult.success) {
      setPingError(pingResult.error ?? 'Fallo bootstrap ping.')
      setIsPinging(false)
      return
    }

    setPingResponse(pingResult.data?.message ?? 'Conexion validada.')
    setIsPinging(false)
  }

  return {
    pingResponse,
    pingError,
    isPinging,
    handlePing,
  }
}
