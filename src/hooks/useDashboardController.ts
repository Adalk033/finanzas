import { useState } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_DASHBOARD_SUMMARY, EMPTY_DASHBOARD_UPCOMING_COMMITMENTS } from '../app/appHelpers'
import type {
  DashboardBalanceEvolution,
  DashboardCashFlowPoint,
  DashboardExpenseByCategory,
  DashboardFutureExpensePoint,
  DashboardUpcomingCommitments,
  DashboardSummary,
} from '../types/domain'

export function useDashboardController() {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(EMPTY_DASHBOARD_SUMMARY)
  const [dashboardExpensesByCategory, setDashboardExpensesByCategory] = useState<DashboardExpenseByCategory[]>([])
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

  const loadDashboard = async (): Promise<void> => {
    setIsDashboardLoading(true)
    setDashboardError('')

    const [
      summaryResult,
      expensesResult,
      cashFlowResult,
      balanceEvolutionResult,
      futureExpensesResult,
      upcomingCommitmentsResult,
    ] = await Promise.all([
      apiClient.getDashboardSummary(),
      apiClient.getDashboardExpensesByCategory(),
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
    dashboardCashFlow,
    dashboardBalanceEvolution,
    dashboardFutureExpenses,
    dashboardUpcomingCommitments,
    isDashboardLoading,
    dashboardError,
    loadDashboard,
  }
}
