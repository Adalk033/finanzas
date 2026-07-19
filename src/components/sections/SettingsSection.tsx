import type { DatabaseInfo } from '../../types/config'

type SettingsSectionProps = {
  info: DatabaseInfo | null
  isLoading: boolean
  error: string
  onRefresh: () => void
}

export function SettingsSection({
  info,
  isLoading,
  error,
  onRefresh,
}: SettingsSectionProps) {
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Base de datos local</h2>
        <p className="card__subtitle">
          Toda la informacion financiera se guarda exclusivamente en este dispositivo.
        </p>
      </header>

      <div className="section-toolbar">
        <button
          className="button button--secondary"
          type="button"
          disabled={isLoading}
          onClick={onRefresh}
        >
          {isLoading ? 'Verificando...' : 'Actualizar estado'}
        </button>
      </div>

      {info ? (
        <dl className="settings-database">
          <div className="settings-database__row">
            <dt>Estado</dt>
            <dd>Lista para usarse</dd>
          </div>
          <div className="settings-database__row">
            <dt>Archivo</dt>
            <dd>{info.path}</dd>
          </div>
          <div className="settings-database__row">
            <dt>Version del esquema</dt>
            <dd>{info.schemaVersion}</dd>
          </div>
          <div className="settings-database__row">
            <dt>Modo de escritura</dt>
            <dd>{info.journalMode.toUpperCase()}</dd>
          </div>
          <div className="settings-database__row">
            <dt>Registros principales</dt>
            <dd>
              {info.banks} bancos, {info.instruments} instrumentos, {info.transactions} movimientos
            </dd>
          </div>
        </dl>
      ) : null}

      {error ? <p className="message message--error">{error}</p> : null}
    </section>
  )
}
