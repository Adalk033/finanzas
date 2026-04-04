import type { CloudConnectionStatus } from '../hooks/useSettingsPing'
import type { AppSection } from '../app/appHelpers'

type AppSidebarProps = {
  activeSection: AppSection
  pendingRemindersCount: number
  cloudConnectionStatus: CloudConnectionStatus
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
  { key: 'creditCards', label: 'Tarjetas y Transferencias' },
  { key: 'subscriptions', label: 'Suscripciones' },
  { key: 'fixedExpenses', label: 'Gastos fijos' },
  { key: 'loans', label: 'Prestamos' },
  { key: 'reminders', label: 'Recordatorios', showPendingBadge: true },
  { key: 'settings', label: 'Settings' },
]
const CLOUD_STATUS_LABELS: Record<CloudConnectionStatus, string> = {
  connected: 'Conectado a la nube',
  disconnected: 'Sin conexión',
  checking: 'Verificando nube',
  unconfigured: 'Sin configurar',
}

export function AppSidebar({ activeSection, pendingRemindersCount, cloudConnectionStatus, onSectionChange }: AppSidebarProps) {
  return (
    <aside className="app-shell__sidebar">
      <h1 className="app-shell__brand">Finanzas Lit</h1>

      <div className={`app-shell__cloud-pill app-shell__cloud-pill--${cloudConnectionStatus}`}>
        <span className="app-shell__cloud-pill-dot" aria-hidden="true" />
        <span>{CLOUD_STATUS_LABELS[cloudConnectionStatus]}</span>
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
