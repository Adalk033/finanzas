import { useState } from 'react'
import { getLocalDatabaseBridge } from '../../app/localDatabaseBridge'
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
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [isActionRunning, setIsActionRunning] = useState(false)

  const runFileAction = async (
    action: 'backup' | 'restore' | 'exportCsv' | 'importCsv',
  ): Promise<void> => {
    const bridge = getLocalDatabaseBridge()
    if (!bridge) return
    setIsActionRunning(true)
    setActionMessage('')
    setActionError('')
    const result = await bridge[action]()
    setIsActionRunning(false)
    if (!result.success) {
      setActionError(result.error ?? 'No se pudo completar la operacion.')
      return
    }
    if (result.canceled) return
    if (action === 'backup') setActionMessage('Respaldo creado correctamente.')
    if (action === 'exportCsv') setActionMessage('Movimientos exportados correctamente.')
    if (action === 'importCsv') {
      setActionMessage(`Importacion completada: ${result.imported ?? 0} nuevos, ${result.skipped ?? 0} duplicados.`)
      onRefresh()
    }
    if (action === 'restore') {
      window.location.reload()
    }
  }

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
        <button className="button button--secondary" type="button" disabled={isActionRunning} onClick={() => void runFileAction('backup')}>
          Crear respaldo
        </button>
        <button className="button button--secondary" type="button" disabled={isActionRunning} onClick={() => {
          if (window.confirm('La restauracion reemplazara los datos actuales. Se conservara una copia de seguridad automatica. ¿Continuar?')) {
            void runFileAction('restore')
          }
        }}>
          Restaurar respaldo
        </button>
        <button className="button button--secondary" type="button" disabled={isActionRunning} onClick={() => void runFileAction('exportCsv')}>
          Exportar CSV
        </button>
        <button className="button button--secondary" type="button" disabled={isActionRunning} onClick={() => void runFileAction('importCsv')}>
          Importar CSV
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
      {actionMessage ? <p className="message message--success">{actionMessage}</p> : null}
      {actionError ? <p className="message message--error">{actionError}</p> : null}
      <p className="card__subtitle">
        El CSV usa identificadores de instrumento para evitar asignar movimientos a una cuenta incorrecta.
        Puedes exportar primero una plantilla y editarla antes de importar.
      </p>
    </section>
  )
}
