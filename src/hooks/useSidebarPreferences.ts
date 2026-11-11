import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../api/client'
import type { DatabaseStatus } from './useLocalDatabase'
import type { SidebarGroupId, SidebarPreferences } from '../types/navigation'

export function useSidebarPreferences(databaseStatus: DatabaseStatus) {
  const [preferences, setPreferences] = useState<SidebarPreferences | null>(null)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [reloadVersion, setReloadVersion] = useState(0)
  const savingRef = useRef(false)

  useEffect(() => {
    if (databaseStatus !== 'ready') return
    let active = true
    void apiClient.getSidebarPreferences().then((result) => {
      if (!active) return
      if (result.success && result.data) {
        setPreferences(result.data)
        setError('')
      } else {
        setError(result.error ?? 'No se pudieron cargar las preferencias del menú.')
      }
    })
    return () => { active = false }
  }, [databaseStatus, reloadVersion])

  const toggleGroup = async (groupId: SidebarGroupId): Promise<void> => {
    if (!preferences || databaseStatus !== 'ready' || savingRef.current) return
    savingRef.current = true
    setIsSaving(true)
    setError('')
    try {
      const result = await apiClient.updateSidebarPreference({
        groupId,
        collapsed: !preferences.collapsedGroups[groupId],
      })
      if (result.success && result.data) {
        setPreferences(result.data)
      } else {
        setError(result.error ?? 'No se pudo guardar la preferencia del menú. Intenta de nuevo.')
      }
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  return {
    preferences,
    error,
    canToggle: databaseStatus === 'ready' && preferences !== null && !isSaving,
    toggleGroup,
    retryLoad: () => setReloadVersion((version) => version + 1),
  }
}
