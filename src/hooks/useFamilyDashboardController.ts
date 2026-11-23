import { useState } from 'react'
import { apiClient } from '../api/client'
import { CURRENT_MONTH_ISO } from '../app/appHelpers'
import type { FamilyDashboard } from '../types/domain'
import { useAppliedFilters } from './useAppliedFilters'

const EMPTY_FAMILY_DASHBOARD: FamilyDashboard = {
  month: CURRENT_MONTH_ISO,
  summary: { total: 0, expenseCount: 0, averageExpense: 0 },
  expensesByCategory: [],
  monthlyTrend: [],
}

export function useFamilyDashboardController() {
  const [familyDashboard, setFamilyDashboard] = useState<FamilyDashboard>(EMPTY_FAMILY_DASHBOARD)
  const { appliedFilters: selectedFamilyMonth, getRequestedFilters, runFilterQuery } = useAppliedFilters(CURRENT_MONTH_ISO)
  const [isFamilyDashboardLoading, setIsFamilyDashboardLoading] = useState(false)
  const [familyDashboardError, setFamilyDashboardError] = useState('')

  const loadFamilyDashboard = async (month = getRequestedFilters()): Promise<void> => {
    setIsFamilyDashboardLoading(true)
    setFamilyDashboardError('')
    const result = await runFilterQuery(month, apiClient.getFamilyDashboard)
    if (!result) return
    if (!result.success) {
      setFamilyDashboardError(result.error ?? 'No se pudo cargar el resumen familiar.')
      setIsFamilyDashboardLoading(false)
      return
    }
    setFamilyDashboard(result.data ?? { ...EMPTY_FAMILY_DASHBOARD, month })
    setIsFamilyDashboardLoading(false)
  }

  return {
    familyDashboard,
    selectedFamilyMonth,
    isFamilyDashboardLoading,
    familyDashboardError,
    loadFamilyDashboard,
  }
}
