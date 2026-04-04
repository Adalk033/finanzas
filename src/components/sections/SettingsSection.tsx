import { useState, type SyntheticEvent } from 'react'
import type { LocalConfigInput } from '../../types/config'

type SettingsSectionProps = {
  config: LocalConfigInput
  hasElectronBridge: boolean
  isSaving: boolean
  isPinging: boolean
  error: string
  successMessage: string
  pingError: string
  pingResponse: string
  onConfigChange: (nextConfig: LocalConfigInput) => void
  onSave: (event: SyntheticEvent<HTMLFormElement>) => void
  onPing: () => void
}

export function SettingsSection({
  config,
  hasElectronBridge,
  isSaving,
  isPinging,
  error,
  successMessage,
  pingError,
  pingResponse,
  onConfigChange,
  onSave,
  onPing,
}: SettingsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Configuracion Inicial</h2>
        <p className="card__subtitle">Guarda API Key, endpoint HTTPS y region AWS en SQLite local.</p>
      </header>

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => setIsFormOpen((value) => !value)}>
          {isFormOpen ? 'Ocultar formulario' : 'Abrir configuracion'}
        </button>
        <div className="section-toolbar__spacer" />
        <button className="button button--secondary" type="button" disabled={isPinging || !hasElectronBridge} onClick={onPing}>
          {isPinging ? 'Probando...' : 'Probar conexion'}
        </button>
      </div>

      {isFormOpen ? (
        <div className="section-panel">
          <form className="form-grid" onSubmit={onSave}>
            <label className="form-grid__field" htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              className="form-grid__input"
              type="password"
              value={config.apiKey}
              onChange={(event) => onConfigChange({ ...config, apiKey: event.target.value })}
              placeholder="Ingresa tu x-api-key"
              autoComplete="off"
              required
            />

            <label className="form-grid__field" htmlFor="apiEndpoint">API Endpoint (HTTPS)</label>
            <input
              id="apiEndpoint"
              className="form-grid__input"
              type="url"
              value={config.apiEndpoint}
              onChange={(event) => onConfigChange({ ...config, apiEndpoint: event.target.value })}
              placeholder="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"
              autoComplete="off"
              required
            />

            <label className="form-grid__field" htmlFor="awsRegion">AWS Region</label>
            <input
              id="awsRegion"
              className="form-grid__input"
              type="text"
              value={config.awsRegion}
              onChange={(event) => onConfigChange({ ...config, awsRegion: event.target.value })}
              placeholder="us-east-1"
              autoComplete="off"
              required
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={isSaving || !hasElectronBridge}>
                {isSaving ? 'Guardando...' : 'Guardar configuracion'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {!hasElectronBridge ? (
        <p className="message message--warning">
          Esta pantalla requiere la app de escritorio de Electron. Si abriste la URL en navegador, el guardado local no estara disponible.
        </p>
      ) : null}

      {error ? <p className="message message--error">{error}</p> : null}
      {successMessage ? <p className="message message--success">{successMessage}</p> : null}
      {pingError ? <p className="message message--error">{pingError}</p> : null}
      {pingResponse ? <p className="message message--info">{pingResponse}</p> : null}
    </section>
  )
}
