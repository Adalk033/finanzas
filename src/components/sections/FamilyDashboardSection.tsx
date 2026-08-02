import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DASHBOARD_CHART_COLORS, formatCurrency } from '../../app/appHelpers'
import type { FamilyDashboard } from '../../types/domain'

type FamilyDashboardSectionProps = {
  hasConfig: boolean
  dashboard: FamilyDashboard
  selectedMonth: string
  isLoading: boolean
  error: string
  onMonthChange: (month: string) => void
  onReload: () => void
}

export function FamilyDashboardSection({
  hasConfig,
  dashboard,
  selectedMonth,
  isLoading,
  error,
  onMonthChange,
  onReload,
}: FamilyDashboardSectionProps) {
  return (
    <section className="card">
      <header className="card__header dashboard-header">
        <div>
          <h2 className="card__title">Inicio de Familia</h2>
          <p className="card__subtitle">Resumen mensual de gastos familiares, separado de tus instrumentos personales.</p>
        </div>
        <button className="button button--secondary dashboard-header__reload" type="button" disabled={!hasConfig || isLoading} onClick={onReload}>
          {isLoading ? 'Cargando...' : 'Recargar'}
        </button>
      </header>

      <div className="family-month-filter">
        <label className="form-grid__field" htmlFor="familyDashboardMonth">Mes</label>
        <input
          id="familyDashboardMonth"
          className="form-grid__input"
          type="month"
          value={selectedMonth}
          onChange={(event) => {
            if (event.target.value) onMonthChange(event.target.value)
          }}
          required
        />
      </div>

      {!hasConfig ? <p className="message message--info">Abre la aplicacion de escritorio para acceder a tus datos locales.</p> : null}
      {isLoading ? <p className="message message--info">Cargando gastos del mes...</p> : null}
      {error ? <p className="message message--error">{error}</p> : null}

      <div className="dashboard-grid family-dashboard-grid">
        <article className="summary-card">
          <p className="summary-card__label">Gasto familiar del mes</p>
          <p className="summary-card__value">{formatCurrency(dashboard.summary.total)}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Gastos registrados</p>
          <p className="summary-card__value">{dashboard.summary.expenseCount}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Promedio por gasto</p>
          <p className="summary-card__value">{formatCurrency(dashboard.summary.averageExpense)}</p>
        </article>
      </div>

      <div className="dashboard-charts">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Gasto por categoria</h3>
            <p className="mini-card__subtitle">Distribucion del mes seleccionado.</p>
          </header>
          {dashboard.expensesByCategory.length === 0 ? (
            <p className="card__subtitle">No hay gastos familiares en este mes.</p>
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboard.expensesByCategory} dataKey="total" nameKey="category" outerRadius={90} label>
                    {dashboard.expensesByCategory.map((entry, index) => (
                      <Cell key={`${entry.category}-${index}`} fill={DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Tendencia mensual</h3>
            <p className="mini-card__subtitle">Mes seleccionado y los cinco meses anteriores.</p>
          </header>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.monthlyTrend}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--color-chart-grid)" strokeOpacity={0.72} />
                <XAxis dataKey="month" stroke="var(--color-chart-axis)" tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} tickLine={false} />
                <YAxis stroke="var(--color-chart-axis)" tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total" fill="var(--color-chart-expense)" fillOpacity={0.88} name="Gasto familiar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  )
}
