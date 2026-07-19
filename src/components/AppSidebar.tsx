import type { DatabaseStatus } from '../hooks/useLocalDatabase'
import type { AppSection } from '../app/appHelpers'

type AppSidebarProps = {
  activeSection: AppSection
  pendingRemindersCount: number
  databaseStatus: DatabaseStatus
  onSectionChange: (section: AppSection) => void
}

type NavItem = {
  key: AppSection
  label: string
  showPendingBadge?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'transactions', label: 'Transacciones' },
  { key: 'budgets', label: 'Presupuestos' },
  { key: 'simulator', label: 'Simulador' },
  { key: 'banks', label: 'Bancos' },
  { key: 'instruments', label: 'Instrumentos' },
  { key: 'categories', label: 'Categorias' },
  { key: 'creditCards', label: 'Tarjetas' },
  { key: 'transfers', label: 'Transferencias' },
  { key: 'subscriptions', label: 'Suscripciones' },
  { key: 'fixedExpenses', label: 'Gastos fijos' },
  { key: 'loans', label: 'Prestamos' },
  { key: 'reminders', label: 'Recordatorios', showPendingBadge: true },
  { key: 'settings', label: 'Settings' },
]
const DATABASE_STATUS_LABELS: Record<DatabaseStatus, string> = {
  ready: 'Datos locales listos',
  error: 'Error de almacenamiento',
  checking: 'Verificando datos',
  unavailable: 'Escritorio requerido',
}

export function AppSidebar({ activeSection, pendingRemindersCount, databaseStatus, onSectionChange }: AppSidebarProps) {
  return (
    <aside className="app-shell__sidebar">
      <h1 className="app-shell__brand">Finanzas Lit</h1>

      <div className={`app-shell__database-pill app-shell__database-pill--${databaseStatus}`}>
        <span className="app-shell__database-pill-dot" aria-hidden="true" />
        <span>{DATABASE_STATUS_LABELS[databaseStatus]}</span>
      </div>

      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`nav-button ${activeSection === item.key ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => onSectionChange(item.key)}
        >
          {item.showPendingBadge ? <span className="nav-button__label">{item.label}</span> : item.label}
          {item.showPendingBadge && pendingRemindersCount > 0 ? <span className="nav-button__badge">{pendingRemindersCount}</span> : null}
        </button>
      ))}
    </aside>
  )
}
