import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DASHBOARD_CHART_COLORS, formatCurrency } from '../../app/appHelpers'
import type {
  DashboardBalanceEvolution,
  DashboardCashFlowPoint,
  DashboardExpenseByCategory,
  DashboardFutureExpensePoint,
  DashboardSummary,
} from '../../types/domain'

type DashboardSectionProps = {
  hasConfig: boolean
  isDashboardLoading: boolean
  dashboardError: string
  dashboardSummary: DashboardSummary
  dashboardExpensesByCategory: DashboardExpenseByCategory[]
  dashboardCashFlow: DashboardCashFlowPoint[]
  dashboardBalanceEvolution: DashboardBalanceEvolution
  dashboardFutureExpenses: DashboardFutureExpensePoint[]
  onReload: () => void
}

export function DashboardSection({
  hasConfig,
  isDashboardLoading,
  dashboardError,
  dashboardSummary,
  dashboardExpensesByCategory,
  dashboardCashFlow,
  dashboardBalanceEvolution,
  dashboardFutureExpenses,
  onReload,
}: DashboardSectionProps) {
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Dashboard Principal</h2>
        <p className="card__subtitle">Resumen financiero y tendencias clave de tus finanzas.</p>
      </header>

      <div className="form-grid__actions">
        <button className="button button--secondary" type="button" disabled={!hasConfig || isDashboardLoading} onClick={onReload}>
          {isDashboardLoading ? 'Cargando...' : 'Recargar dashboard'}
        </button>
      </div>

      {!hasConfig ? <p className="message message--info">Configura API Key, endpoint y region en Settings para cargar datos.</p> : null}
      {isDashboardLoading ? <p className="message message--info">Cargando resumen y graficas del dashboard...</p> : null}
      {dashboardError ? <p className="message message--error">{dashboardError}</p> : null}

      <div className="dashboard-grid">
        <article className="summary-card">
          <p className="summary-card__label">Dinero disponible total</p>
          <p className="summary-card__value summary-card__value--positive">{formatCurrency(dashboardSummary.totalAvailable)}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Deuda total en TDC</p>
          <p className="summary-card__value">{formatCurrency(dashboardSummary.totalCreditDebt)}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Deuda total en prestamos</p>
          <p className="summary-card__value">{formatCurrency(dashboardSummary.totalLoanDebt)}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Credito disponible total</p>
          <p className="summary-card__value summary-card__value--positive">{formatCurrency(dashboardSummary.totalAvailableCredit)}</p>
        </article>
        <article className="summary-card dashboard-grid__item--full">
          <p className="summary-card__label">Balance neto</p>
          <p className={`summary-card__value ${dashboardSummary.netBalance >= 0 ? 'summary-card__value--positive' : ''}`}>
            {formatCurrency(dashboardSummary.netBalance)}
          </p>
        </article>
      </div>

      <div className="dashboard-charts">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Gasto por categoria</h3>
          </header>
          {dashboardExpensesByCategory.length === 0 ? (
            <p className="card__subtitle">Sin datos para el mes actual.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboardExpensesByCategory} dataKey="total" nameKey="category" outerRadius={90} label>
                    {dashboardExpensesByCategory.map((entry, index) => (
                      <Cell key={`${entry.category}-${index}`} fill={DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Flujo mensual: ingresos vs egresos</h3>
          </header>
          {dashboardCashFlow.length === 0 ? (
            <p className="card__subtitle">No hay datos suficientes para el flujo mensual.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardCashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" />
                  <YAxis stroke="var(--color-text-secondary)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="var(--color-success)" name="Ingresos" />
                  <Bar dataKey="expense" fill="var(--color-error)" name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Evolucion de saldo por cuenta</h3>
          </header>
          {dashboardBalanceEvolution.series.length === 0 ? (
            <p className="card__subtitle">No hay cuentas de debito/cuenta para graficar.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardBalanceEvolution.points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" />
                  <YAxis stroke="var(--color-text-secondary)" />
                  <Tooltip />
                  <Legend />
                  {dashboardBalanceEvolution.series.map((series, index) => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Proyeccion de gastos futuros</h3>
          </header>
          {dashboardFutureExpenses.length === 0 ? (
            <p className="card__subtitle">No hay proyecciones disponibles por ahora.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardFutureExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" />
                  <YAxis stroke="var(--color-text-secondary)" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="subscriptions" stackId="1" stroke="#57A6D8" fill="#57A6D8" name="Suscripciones" />
                  <Area type="monotone" dataKey="fixedExpenses" stackId="1" stroke="#2D8F85" fill="#2D8F85" name="Gastos fijos" />
                  <Area type="monotone" dataKey="loanPayments" stackId="1" stroke="#E6A23C" fill="#E6A23C" name="Pagos prestamos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
