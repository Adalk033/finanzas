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
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'settings', label: 'Settings' },
  { key: 'banks', label: 'Bancos' },
  { key: 'instruments', label: 'Instrumentos' },
  { key: 'categories', label: 'Categorias' },
  { key: 'transactions', label: 'Transacciones' },
  { key: 'creditCards', label: 'Tarjetas y Transferencias' },
  { key: 'subscriptions', label: 'Suscripciones' },
  { key: 'fixedExpenses', label: 'Gastos fijos' },
  { key: 'loans', label: 'Prestamos' },
  { key: 'budgets', label: 'Presupuestos' },
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
          {item.label}
        </button>
      ))}

      <button
        className={`nav-button ${activeSection === 'reminders' ? 'nav-button--active' : ''}`}
        type="button"
        onClick={() => onSectionChange('reminders')}
      >
        <span className="nav-button__label">Recordatorios</span>
        {pendingRemindersCount > 0 ? <span className="nav-button__badge">{pendingRemindersCount}</span> : null}
      </button>

      <button
        className={`nav-button ${activeSection === 'simulator' ? 'nav-button--active' : ''}`}
        type="button"
        onClick={() => onSectionChange('simulator')}
      >
        Simulador
      </button>
    </aside>
  )
}
