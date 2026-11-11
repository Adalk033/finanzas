import { useState } from 'react'
import type { DatabaseStatus } from '../hooks/useLocalDatabase'
import type { AppSection } from '../app/appHelpers'
import { filterNavigationGroups } from '../app/navigation'
import { useSidebarPreferences } from '../hooks/useSidebarPreferences'
import './AppSidebar.css'

type AppSidebarProps = {
  activeSection: AppSection
  pendingRemindersCount: number
  databaseStatus: DatabaseStatus
  onSectionChange: (section: AppSection) => void
}

const DATABASE_STATUS_LABELS: Record<DatabaseStatus, string> = {
  ready: 'Datos locales listos',
  error: 'Error de almacenamiento',
  checking: 'Verificando datos',
  unavailable: 'Escritorio requerido',
}

export function AppSidebar({ activeSection, pendingRemindersCount, databaseStatus, onSectionChange }: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { preferences, error, canToggle, toggleGroup, retryLoad } = useSidebarPreferences(databaseStatus)
  const groups = filterNavigationGroups(searchQuery)
  const isSearching = searchQuery.trim().length > 0
  const resultCount = groups.reduce((count, group) => count + group.items.length, 0)
  const shouldShowDatabaseStatus = databaseStatus === 'error' || databaseStatus === 'unavailable'

  return (
    <aside className="app-shell__sidebar">
      <div className="app-shell__brand-wrap">
        <h1 className="app-shell__brand">Mis Finanzas</h1>
        <div className="app-sidebar__search" role="search" aria-label="Buscar en el menú">
          <label className="app-sidebar__search-label" htmlFor="menuSearch">Buscar menú</label>
          <input
            id="menuSearch"
            className="app-sidebar__search-input"
            type="search"
            placeholder="Ej. renta, MSI, respaldo…"
            value={searchQuery}
            maxLength={200}
            autoComplete="off"
            spellCheck={false}
            aria-controls="sidebarNavigation"
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchQuery('')
            }}
          />
          {isSearching ? (
            <button className="app-sidebar__text-action" type="button" onClick={() => setSearchQuery('')}>
              Limpiar búsqueda
            </button>
          ) : null}
        </div>
      </div>

      {shouldShowDatabaseStatus ? (
        <div className={`app-shell__database-pill app-shell__database-pill--${databaseStatus}`}>
          <span className="app-shell__database-pill-dot" aria-hidden="true" />
          <span>{DATABASE_STATUS_LABELS[databaseStatus]}</span>
        </div>
      ) : null}

      {error ? (
        <div className="app-sidebar__error" role="alert">
          <p>{error}</p>
          {!preferences ? (
            <button className="app-sidebar__text-action" type="button" onClick={retryLoad}>Reintentar</button>
          ) : null}
        </div>
      ) : null}

      <p className="app-sidebar__search-status" role="status" aria-live="polite" aria-atomic="true">
        {isSearching ? `${resultCount} ${resultCount === 1 ? 'menú encontrado' : 'menús encontrados'}. Las secciones se muestran expandidas durante la búsqueda.` : ''}
      </p>

      <nav id="sidebarNavigation" className="app-sidebar__navigation" aria-label="Navegación principal">
        {groups.map((group) => {
          const isExpanded = isSearching || !preferences?.collapsedGroups[group.id]
          return (
            <section key={group.id} className="nav-group" aria-label={group.label}>
              <h2 className="nav-group__title">
                <button
                  className="nav-group__toggle"
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`navGroup-${group.id}`}
                  disabled={isSearching || !canToggle}
                  onClick={() => { void toggleGroup(group.id) }}
                >
                  <span>{group.label}</span>
                  <span className={`nav-group__chevron ${isExpanded ? 'nav-group__chevron--expanded' : ''}`} aria-hidden="true" />
                </button>
              </h2>
              <div id={`navGroup-${group.id}`} className="nav-group__items" hidden={!isExpanded}>
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    className={`nav-button ${activeSection === item.key ? 'nav-button--active' : ''}`}
                    type="button"
                    aria-current={activeSection === item.key ? 'page' : undefined}
                    title={item.description}
                    onClick={() => onSectionChange(item.key)}
                  >
                    <span className="nav-button__label">
                      <span>{item.label}</span>
                      {isSearching ? <span className="nav-button__description">{item.description}</span> : null}
                    </span>
                    {item.showPendingBadge && pendingRemindersCount > 0 ? <span className="nav-button__badge">{pendingRemindersCount}</span> : null}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
        {isSearching && resultCount === 0 ? (
          <p className="app-sidebar__empty">No se encontraron menús. Prueba con otra palabra, como «pagos», «tarjetas» o «respaldo».</p>
        ) : null}
      </nav>
    </aside>
  )
}
