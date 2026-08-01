import { useState } from 'react'
import { apiClient } from '../api/client'
import { CURRENT_MONTH_ISO } from '../app/appHelpers'
import type { FamilyDashboard } from '../types/domain'

const EMPTY_FAMILY_DASHBOARD: FamilyDashboard = {
  month: CURRENT_MONTH_ISO,
  summary: { total: 0, expenseCount: 0, averageExpense: 0 },
  expensesByCategory: [],
  monthlyTrend: [],
}

export function useFamilyDashboardController() {
  const [familyDashboard, setFamilyDashboard] = useState<FamilyDashboard>(EMPTY_FAMILY_DASHBOARD)
  const [selectedFamilyMonth, setSelectedFamilyMonth] = useState(CURRENT_MONTH_ISO)
  const [isFamilyDashboardLoading, setIsFamilyDashboardLoading] = useState(false)
  const [familyDashboardError, setFamilyDashboardError] = useState('')

  const loadFamilyDashboard = async (month = selectedFamilyMonth): Promise<void> => {
    setIsFamilyDashboardLoading(true)
    setFamilyDashboardError('')
    const result = await apiClient.getFamilyDashboard(month)
    if (!result.success) {
      setFamilyDashboardError(result.error ?? 'No se pudo cargar el resumen familiar.')
      setIsFamilyDashboardLoading(false)
      return
    }
    setFamilyDashboard(result.data ?? { ...EMPTY_FAMILY_DASHBOARD, month })
    setIsFamilyDashboardLoading(false)
  }

  const changeFamilyMonth = async (month: string): Promise<void> => {
    setSelectedFamilyMonth(month)
    await loadFamilyDashboard(month)
  }

  return {
    familyDashboard,
    selectedFamilyMonth,
    isFamilyDashboardLoading,
    familyDashboardError,
    loadFamilyDashboard,
    changeFamilyMonth,
  }
}
