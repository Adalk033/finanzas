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
  DashboardUpcomingCommitment,
  DashboardUpcomingCommitments,
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
  dashboardUpcomingCommitments: DashboardUpcomingCommitments
  onReload: () => void
}

const COMMITMENT_TYPE_LABELS: Record<DashboardUpcomingCommitment['type'], string> = {
  subscription: 'Suscripcion',
  fixed_expense: 'Gasto fijo',
  loan_payment: 'Prestamo',
  card_payment: 'Tarjeta',
}

function formatCommitmentDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
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
  dashboardUpcomingCommitments,
  onReload,
}: DashboardSectionProps) {
  const nextMonthProjection = dashboardFutureExpenses[0]

  return (
    <section className="card">
      <header className="card__header dashboard-header">
        <div>
          <h2 className="card__title">Dashboard Principal</h2>
          <p className="card__subtitle">Resumen financiero y tendencias clave de tus finanzas.</p>
        </div>
        <button className="button button--secondary dashboard-header__reload" type="button" disabled={!hasConfig || isDashboardLoading} onClick={onReload}>
          {isDashboardLoading ? 'Cargando...' : 'Recargar'}
        </button>
      </header>

      {!hasConfig ? <p className="message message--info">Abre la aplicacion de escritorio para acceder a tus datos locales.</p> : null}
      {isDashboardLoading ? <p className="message message--info">Cargando resumen y graficas del dashboard...</p> : null}
      {dashboardError ? <p className="message message--error">{dashboardError}</p> : null}
      {hasConfig
        && dashboardSummary.totalAvailable === 0
        && dashboardSummary.totalCreditDebt === 0
        && dashboardSummary.totalLoanDebt === 0 ? (
          <p className="message message--info">
            Para comenzar: crea un banco, registra tus cuentas con su saldo inicial y agrega tus movimientos.
            Despues usa Conciliar para ajustar el saldo sin sobrescribir el historial.
          </p>
        ) : null}

      <div className="dashboard-grid">
        <article className="summary-card">
          <p className="summary-card__label">Balance neto</p>
          <p className={`summary-card__value ${dashboardSummary.netBalance >= 0 ? 'summary-card__value--positive' : ''}`}>
            {formatCurrency(dashboardSummary.netBalance)}
          </p>
        </article>
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
      </div>

      <article className="dashboard-commitments">
        <header className="mini-card__header">
          <h3 className="mini-card__title">Proximos 30 dias</h3>
          <p className="mini-card__subtitle">Pagos y cargos programados que conviene tener considerados.</p>
        </header>
        <div className="dashboard-commitments__summary">
          <div>
            <p className="summary-card__label">Compromisos estimados</p>
            <p className="summary-card__value">{formatCurrency(dashboardUpcomingCommitments.total)}</p>
          </div>
          <div>
            <p className="summary-card__label">Disponible despues de compromisos</p>
            <p className={`summary-card__value ${dashboardUpcomingCommitments.availableAfterCommitments >= 0 ? 'summary-card__value--positive' : ''}`}>
              {formatCurrency(dashboardUpcomingCommitments.availableAfterCommitments)}
            </p>
          </div>
        </div>
        {dashboardUpcomingCommitments.items.length === 0 ? (
          <p className="card__subtitle">No hay pagos o cargos programados para los proximos 30 dias.</p>
        ) : (
          <div className="dashboard-commitments__list">
            {dashboardUpcomingCommitments.items.slice(0, 6).map((commitment) => (
              <div key={commitment.id} className="dashboard-commitment">
                <time className="dashboard-commitment__date" dateTime={commitment.date}>{formatCommitmentDate(commitment.date)}</time>
                <div className="dashboard-commitment__details">
                  <p className="dashboard-commitment__name">{commitment.name}</p>
                  <p className="dashboard-commitment__meta">
                    {COMMITMENT_TYPE_LABELS[commitment.type]}{commitment.instrumentName ? ` · ${commitment.instrumentName}` : ''}
                  </p>
                </div>
                <strong className="dashboard-commitment__amount">{formatCurrency(commitment.amount)}</strong>
              </div>
            ))}
            {dashboardUpcomingCommitments.items.length > 6 ? (
              <p className="card__subtitle">Y {dashboardUpcomingCommitments.items.length - 6} compromisos mas en los proximos 30 dias.</p>
            ) : null}
          </div>
        )}
      </article>

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
            <h3 className="mini-card__title">Flujo de efectivo y gasto reconocido</h3>
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
                  <Bar dataKey="expense" fill="var(--color-error)" name="Gasto reconocido" />
                  <Bar dataKey="debtPayments" fill="#E6A23C" name="Pagos de deuda" />
                  <Line type="monotone" dataKey="netCashFlow" stroke="#57A6D8" name="Flujo neto" />
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
            {nextMonthProjection ? (
              <p className="mini-card__subtitle">
                Proximo mes: {nextMonthProjection.month} · {formatCurrency(nextMonthProjection.total)} estimados
              </p>
            ) : null}
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
                  <Area type="monotone" dataKey="fixedExpenses" stackId="1" stroke="#6F86E8" fill="#6F86E8" name="Gastos fijos" />
                  <Area type="monotone" dataKey="loanPayments" stackId="1" stroke="#E6A23C" fill="#E6A23C" name="Pagos prestamos" />
                  <Area type="monotone" dataKey="creditCardInstallments" stackId="1" stroke="#F87171" fill="#F87171" name="Mensualidades MSI" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
