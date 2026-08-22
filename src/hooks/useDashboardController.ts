import { useState } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_DASHBOARD_SUMMARY, EMPTY_DASHBOARD_UPCOMING_COMMITMENTS } from '../app/appHelpers'
import type {
  DashboardBalanceEvolution,
  DashboardBalanceEvolutionPeriod,
  DashboardCashFlowPoint,
  DashboardExpenseByCategory,
  DashboardExpensePeriod,
  DashboardFutureExpensePoint,
  DashboardPreferences,
  DashboardUpcomingCommitments,
  DashboardSummary,
} from '../types/domain'

export function useDashboardController() {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(EMPTY_DASHBOARD_SUMMARY)
  const [dashboardExpensesByCategory, setDashboardExpensesByCategory] = useState<DashboardExpenseByCategory[]>([])
  const [dashboardExpensePeriod, setDashboardExpensePeriod] = useState<DashboardExpensePeriod>('current_month')
  const [dashboardBalanceEvolutionPeriod, setDashboardBalanceEvolutionPeriod] = useState<DashboardBalanceEvolutionPeriod>('one_month')
  const [dashboardCashFlow, setDashboardCashFlow] = useState<DashboardCashFlowPoint[]>([])
  const [dashboardBalanceEvolution, setDashboardBalanceEvolution] = useState<DashboardBalanceEvolution>({
    series: [],
    points: [],
  })
  const [dashboardFutureExpenses, setDashboardFutureExpenses] = useState<DashboardFutureExpensePoint[]>([])
  const [dashboardUpcomingCommitments, setDashboardUpcomingCommitments] = useState<DashboardUpcomingCommitments>(
    EMPTY_DASHBOARD_UPCOMING_COMMITMENTS,
  )
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  const loadDashboard = async (preferences?: DashboardPreferences): Promise<void> => {
    setIsDashboardLoading(true)
    setDashboardError('')

    let selectedPreferences = preferences
    if (!selectedPreferences) {
      const preferencesResult = await apiClient.getDashboardPreferences()
      if (!preferencesResult.success) {
        setDashboardError(preferencesResult.error ?? 'No se pudieron cargar las preferencias del dashboard.')
        setIsDashboardLoading(false)
        return
      }
      selectedPreferences = preferencesResult.data ?? {
        expensePeriod: 'current_month',
        balanceEvolutionPeriod: 'one_month',
      }
    }
    setDashboardExpensePeriod(selectedPreferences.expensePeriod)
    setDashboardBalanceEvolutionPeriod(selectedPreferences.balanceEvolutionPeriod)

    const [
      summaryResult,
      expensesResult,
      cashFlowResult,
      balanceEvolutionResult,
      futureExpensesResult,
      upcomingCommitmentsResult,
    ] = await Promise.all([
      apiClient.getDashboardSummary(),
      apiClient.getDashboardExpensesByCategory(selectedPreferences.expensePeriod),
      apiClient.getDashboardCashFlow(),
      apiClient.getDashboardBalanceEvolution(),
      apiClient.getDashboardFutureExpenses(),
      apiClient.getDashboardUpcomingCommitments(),
    ])

    if (!summaryResult.success) {
      setDashboardError(summaryResult.error ?? 'No se pudo cargar el resumen financiero.')
      setIsDashboardLoading(false)
      return
    }

    if (!expensesResult.success) {
      setDashboardError(expensesResult.error ?? 'No se pudo cargar la grafica de gastos por categoria.')
      setIsDashboardLoading(false)
      return
    }

    if (!cashFlowResult.success) {
      setDashboardError(cashFlowResult.error ?? 'No se pudo cargar la grafica de flujo de efectivo.')
      setIsDashboardLoading(false)
      return
    }

    if (!balanceEvolutionResult.success) {
      setDashboardError(balanceEvolutionResult.error ?? 'No se pudo cargar la grafica de evolucion de saldos.')
      setIsDashboardLoading(false)
      return
    }

    if (!futureExpensesResult.success) {
      setDashboardError(futureExpensesResult.error ?? 'No se pudo cargar la proyeccion de gastos futuros.')
      setIsDashboardLoading(false)
      return
    }

    if (!upcomingCommitmentsResult.success) {
      setDashboardError(upcomingCommitmentsResult.error ?? 'No se pudieron cargar los compromisos proximos.')
      setIsDashboardLoading(false)
      return
    }

    setDashboardSummary(summaryResult.data ?? EMPTY_DASHBOARD_SUMMARY)
    setDashboardExpensesByCategory(expensesResult.data ?? [])
    setDashboardCashFlow(cashFlowResult.data ?? [])
    setDashboardBalanceEvolution(balanceEvolutionResult.data ?? { series: [], points: [] })
    setDashboardFutureExpenses(futureExpensesResult.data ?? [])
    setDashboardUpcomingCommitments(upcomingCommitmentsResult.data ?? EMPTY_DASHBOARD_UPCOMING_COMMITMENTS)
    setIsDashboardLoading(false)
  }

  return {
    dashboardSummary,
    dashboardExpensesByCategory,
    dashboardExpensePeriod,
    dashboardBalanceEvolutionPeriod,
    dashboardCashFlow,
    dashboardBalanceEvolution,
    dashboardFutureExpenses,
    dashboardUpcomingCommitments,
    isDashboardLoading,
    dashboardError,
    loadDashboard,
    setDashboardExpensePeriod: async (period: DashboardExpensePeriod): Promise<void> => {
      setIsDashboardLoading(true)
      setDashboardError('')
      const preferencesResult = await apiClient.updateDashboardPreferences({ expensePeriod: period })
      if (!preferencesResult.success) {
        setDashboardError(preferencesResult.error ?? 'No se pudo guardar el periodo de gastos.')
        setIsDashboardLoading(false)
        return
      }
      await loadDashboard(preferencesResult.data)
    },
    setDashboardBalanceEvolutionPeriod: async (period: DashboardBalanceEvolutionPeriod): Promise<void> => {
      setIsDashboardLoading(true)
      setDashboardError('')
      const preferencesResult = await apiClient.updateDashboardPreferences({ balanceEvolutionPeriod: period })
      if (!preferencesResult.success) {
        setDashboardError(preferencesResult.error ?? 'No se pudo guardar el periodo de evolucion de saldo.')
        setIsDashboardLoading(false)
        return
      }
      await loadDashboard(preferencesResult.data)
    },
  }
}
