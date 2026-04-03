import { useState, type FormEvent } from 'react'
import './App.css'
import { apiClient } from './api/client'
import { useLocalConfig } from './hooks/useLocalConfig'

export function App() {
  const {
    config,
    isLoading,
    isSaving,
    error,
    successMessage,
    setConfig,
    saveConfig,
  } = useLocalConfig()
  const [pingResponse, setPingResponse] = useState('')
  const [pingError, setPingError] = useState('')
  const [isPinging, setIsPinging] = useState(false)

  const handleSave = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await saveConfig()
  }

  const handlePing = async (): Promise<void> => {
    setIsPinging(true)
    setPingError('')
    setPingResponse('')

    const healthResult = await apiClient.health()

    if (!healthResult.success) {
      setPingError(healthResult.error ?? 'Fallo health check.')
      setIsPinging(false)
      return
    }

    const pingResult = await apiClient.bootstrapPing('conexion inicial ok')

    if (!pingResult.success) {
      setPingError(pingResult.error ?? 'Fallo bootstrap ping.')
      setIsPinging(false)
      return
    }

    setPingResponse(pingResult.data?.message ?? 'Conexion validada.')
    setIsPinging(false)
  }

  if (isLoading) {
    return (
      <main className="settings-screen settings-screen--centered">
        <p className="settings-screen__status">Cargando configuracion local...</p>
      </main>
    )
  }

  return (
    <main className="settings-screen">
      <section className="settings-screen__card">
        <header className="settings-screen__header">
          <h1 className="settings-screen__title">Configuracion Inicial</h1>
          <p className="settings-screen__subtitle">
            Guarda API Key, endpoint HTTPS y region AWS en SQLite local.
          </p>
        </header>

        <form className="settings-form" onSubmit={handleSave}>
          <label className="settings-form__field" htmlFor="apiKey">
            API Key
          </label>
          <input
            id="apiKey"
            className="settings-form__input"
            type="password"
            value={config.apiKey}
            onChange={(event) => setConfig({ ...config, apiKey: event.target.value })}
            placeholder="Ingresa tu x-api-key"
            autoComplete="off"
            required
          />

          <label className="settings-form__field" htmlFor="apiEndpoint">
            API Endpoint (HTTPS)
          </label>
          <input
            id="apiEndpoint"
            className="settings-form__input"
            type="url"
            value={config.apiEndpoint}
            onChange={(event) => setConfig({ ...config, apiEndpoint: event.target.value })}
            placeholder="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"
            autoComplete="off"
            required
          />

          <label className="settings-form__field" htmlFor="awsRegion">
            AWS Region
          </label>
          <input
            id="awsRegion"
            className="settings-form__input"
            type="text"
            value={config.awsRegion}
            onChange={(event) => setConfig({ ...config, awsRegion: event.target.value })}
            placeholder="us-east-1"
            autoComplete="off"
            required
          />

          <div className="settings-form__actions">
            <button className="button button--primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={isPinging}
              onClick={() => {
                void handlePing()
              }}
            >
              {isPinging ? 'Probando...' : 'Probar conexion'}
            </button>
          </div>
        </form>

        {error ? <p className="settings-screen__message settings-screen__message--error">{error}</p> : null}
        {successMessage ? <p className="settings-screen__message settings-screen__message--success">{successMessage}</p> : null}
        {pingError ? <p className="settings-screen__message settings-screen__message--error">{pingError}</p> : null}
        {pingResponse ? <p className="settings-screen__message settings-screen__message--info">{pingResponse}</p> : null}
      </section>
    </main>
  )
}
