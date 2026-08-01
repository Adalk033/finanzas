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

type NavGroup = {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { key: 'dashboard', label: 'Resumen' },
      { key: 'transactions', label: 'Movimientos' },
    ],
  },
  {
    label: 'Planificacion',
    items: [
      { key: 'budgets', label: 'Presupuestos' },
      { key: 'fixedExpenses', label: 'Gastos fijos' },
      { key: 'subscriptions', label: 'Suscripciones' },
      { key: 'reminders', label: 'Recordatorios', showPendingBadge: true },
    ],
  },
  {
    label: 'Cuentas y deudas',
    items: [
      { key: 'instruments', label: 'Instrumentos' },
      { key: 'creditCards', label: 'Tarjetas' },
      { key: 'transfers', label: 'Transferencias' },
      { key: 'loans', label: 'Prestamos' },
    ],
  },
  {
    label: 'Organizacion',
    items: [
      { key: 'banks', label: 'Bancos' },
      { key: 'categories', label: 'Categorias' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { key: 'simulator', label: 'Simulador' },
      { key: 'settings', label: 'Configuracion' },
    ],
  },
]
const DATABASE_STATUS_LABELS: Record<DatabaseStatus, string> = {
  ready: 'Datos locales listos',
  error: 'Error de almacenamiento',
  checking: 'Verificando datos',
  unavailable: 'Escritorio requerido',
}

export function AppSidebar({ activeSection, pendingRemindersCount, databaseStatus, onSectionChange }: AppSidebarProps) {
  const shouldShowDatabaseStatus = databaseStatus === 'error' || databaseStatus === 'unavailable'

  return (
    <aside className="app-shell__sidebar">
      <h1 className="app-shell__brand">Finanzas Lit</h1>

      {shouldShowDatabaseStatus ? (
        <div className={`app-shell__database-pill app-shell__database-pill--${databaseStatus}`}>
          <span className="app-shell__database-pill-dot" aria-hidden="true" />
          <span>{DATABASE_STATUS_LABELS[databaseStatus]}</span>
        </div>
      ) : null}

      <nav className="app-sidebar__navigation" aria-label="Navegacion principal">
        {NAV_GROUPS.map((group) => (
          <section key={group.label} className="nav-group" aria-label={group.label}>
            <h2 className="nav-group__title">{group.label}</h2>
            <div className="nav-group__items">
              {group.items.map((item) => (
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
            </div>
          </section>
        ))}
      </nav>
    </aside>
  )
}
