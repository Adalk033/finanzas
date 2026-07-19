import { useCallback, useEffect, useState } from 'react'
import { getLocalDatabaseBridge } from '../app/localDatabaseBridge'
import type { DatabaseInfo } from '../types/config'

export type DatabaseStatus = 'ready' | 'error' | 'checking' | 'unavailable'

export function useLocalDatabase() {
  const initialBridge = getLocalDatabaseBridge()
  const [info, setInfo] = useState<DatabaseInfo | null>(null)
  const [status, setStatus] = useState<DatabaseStatus>(
    initialBridge ? 'checking' : 'unavailable',
  )
  const [error, setError] = useState(
    initialBridge ? '' : 'La base de datos local solo esta disponible en la aplicacion de escritorio.',
  )

  const refreshInfo = useCallback(async (): Promise<void> => {
    const bridge = getLocalDatabaseBridge()
    if (!bridge) {
      setInfo(null)
      setStatus('unavailable')
      setError('La base de datos local solo esta disponible en la aplicacion de escritorio.')
      return
    }
    setStatus('checking')
    setError('')
    try {
      const nextInfo = await bridge.getInfo()
      setInfo(nextInfo)
      setStatus('ready')
    } catch {
      setInfo(null)
      setStatus('error')
      setError('No se pudo abrir la base de datos local.')
    }
  }, [])

  useEffect(() => {
    const bridge = getLocalDatabaseBridge()
    if (!bridge) {
      return
    }
    let active = true
    void bridge.getInfo().then(
      (nextInfo) => {
        if (active) {
          setInfo(nextInfo)
          setStatus('ready')
        }
      },
      () => {
        if (active) {
          setStatus('error')
          setError('No se pudo abrir la base de datos local.')
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  return {
    info,
    status,
    error,
    isLoading: status === 'checking',
    isReady: status === 'ready',
    refreshInfo,
  }
}
