import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { apiClient } from './api/client'
import { useLocalConfig } from './hooks/useLocalConfig'
import type {
  Bank,
  BankInput,
  FinancialInstrument,
  FinancialInstrumentInput,
  InstrumentType,
} from './types/domain'

type AppSection = 'settings' | 'banks' | 'instruments'

const EMPTY_BANK_FORM: BankInput = {
  name: '',
  shortName: '',
  color: '',
  iconName: '',
  isActive: true,
}

const EMPTY_INSTRUMENT_FORM: FinancialInstrumentInput = {
  bankId: 0,
  name: '',
  type: 'credit_card',
  lastFour: '',
  currencyId: 1,
  creditLimit: 0,
  currentBalance: 0,
  availableCredit: 0,
  cutOffDay: 1,
  paymentDueDay: 1,
  annualRate: null,
  currentAmount: 0,
  notes: '',
  isActive: true,
}

function toEditableBank(bank: Bank): BankInput {
  return {
    name: bank.name,
    shortName: bank.shortName ?? '',
    color: bank.color ?? '',
    iconName: bank.iconName ?? '',
    isActive: bank.isActive,
  }
}

function toEditableInstrument(instrument: FinancialInstrument): FinancialInstrumentInput {
  return {
    bankId: instrument.bankId,
    name: instrument.name,
    type: instrument.type,
    lastFour: instrument.lastFour ?? '',
    currencyId: instrument.currencyId,
    creditLimit: instrument.creditLimit,
    currentBalance: instrument.currentBalance,
    availableCredit: instrument.availableCredit,
    cutOffDay: instrument.cutOffDay,
    paymentDueDay: instrument.paymentDueDay,
    annualRate: instrument.annualRate,
    currentAmount: instrument.currentAmount,
    notes: instrument.notes ?? '',
    isActive: instrument.isActive,
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null) {
    return '-'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

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
  const [activeSection, setActiveSection] = useState<AppSection>('settings')

  const [banks, setBanks] = useState<Bank[]>([])
  const [isBanksLoading, setIsBanksLoading] = useState(false)
  const [bankMessage, setBankMessage] = useState('')
  const [bankError, setBankError] = useState('')
  const [bankForm, setBankForm] = useState<BankInput>(EMPTY_BANK_FORM)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)

  const [instruments, setInstruments] = useState<FinancialInstrument[]>([])
  const [isInstrumentsLoading, setIsInstrumentsLoading] = useState(false)
  const [instrumentMessage, setInstrumentMessage] = useState('')
  const [instrumentError, setInstrumentError] = useState('')
  const [instrumentForm, setInstrumentForm] = useState<FinancialInstrumentInput>(EMPTY_INSTRUMENT_FORM)
  const [editingInstrumentId, setEditingInstrumentId] = useState<number | null>(null)

  const hasConfig = Boolean(config.apiKey.trim() && config.apiEndpoint.trim() && config.awsRegion.trim())

  const banksById = useMemo(() => {
    return new Map(banks.map((bank) => [bank.id, bank]))
  }, [banks])

  const groupedInstruments = useMemo(() => {
    const groups = new Map<number, FinancialInstrument[]>()

    for (const instrument of instruments) {
      const previous = groups.get(instrument.bankId)
      if (!previous) {
        groups.set(instrument.bankId, [instrument])
      } else {
        previous.push(instrument)
      }
    }

    return Array.from(groups.entries()).map(([bankId, list]) => ({
      bank: banksById.get(bankId),
      instruments: list,
    }))
  }, [banksById, instruments])

  const loadBanks = async (): Promise<void> => {
    setIsBanksLoading(true)
    setBankError('')

    const result = await apiClient.getBanks()

    if (!result.success) {
      setBankError(result.error ?? 'No se pudo cargar bancos.')
      setIsBanksLoading(false)
      return
    }

    setBanks(result.data ?? [])
    setIsBanksLoading(false)
  }

  const loadInstruments = async (): Promise<void> => {
    setIsInstrumentsLoading(true)
    setInstrumentError('')

    const result = await apiClient.getInstruments()

    if (!result.success) {
      setInstrumentError(result.error ?? 'No se pudo cargar instrumentos.')
      setIsInstrumentsLoading(false)
      return
    }

    setInstruments(result.data ?? [])
    setIsInstrumentsLoading(false)
  }

  const selectedBankId = instrumentForm.bankId === 0 ? (banks[0]?.id ?? 0) : instrumentForm.bankId

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

  const resetBankEditor = (): void => {
    setBankForm(EMPTY_BANK_FORM)
    setEditingBankId(null)
  }

  const handleBankSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setBankError('')
    setBankMessage('')

    const payload = {
      ...bankForm,
      name: bankForm.name.trim(),
    }

    if (editingBankId === null) {
      const created = await apiClient.createBank(payload)
      if (!created.success) {
        setBankError(created.error ?? 'No se pudo crear el banco.')
        return
      }

      setBankMessage('Banco creado correctamente.')
    } else {
      const updated = await apiClient.updateBank(editingBankId, payload)
      if (!updated.success) {
        setBankError(updated.error ?? 'No se pudo actualizar el banco.')
        return
      }

      setBankMessage('Banco actualizado correctamente.')
    }

    resetBankEditor()
    await loadBanks()
  }

  const handleBankDelete = async (id: number): Promise<void> => {
    setBankError('')
    setBankMessage('')

    const deleted = await apiClient.deleteBank(id)

    if (!deleted.success) {
      setBankError(deleted.error ?? 'No se pudo eliminar el banco.')
      return
    }

    setBankMessage('Banco eliminado correctamente.')
    if (editingBankId === id) {
      resetBankEditor()
    }
    await loadBanks()
    await loadInstruments()
  }

  const resetInstrumentEditor = (): void => {
    const firstBankId = banks[0]?.id ?? 0
    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
      bankId: firstBankId,
    })
    setEditingInstrumentId(null)
  }

  const handleSectionChange = (nextSection: AppSection): void => {
    setActiveSection(nextSection)

    if (!hasConfig) {
      return
    }

    if (nextSection === 'banks') {
      void loadBanks()
      return
    }

    if (nextSection === 'instruments') {
      void loadBanks()
      void loadInstruments()
    }
  }

  const handleInstrumentTypeChange = (nextType: InstrumentType): void => {
    setInstrumentForm((previous) => ({
      ...previous,
      type: nextType,
      creditLimit: nextType === 'credit_card' ? previous.creditLimit ?? 0 : null,
      currentBalance: nextType === 'credit_card' ? previous.currentBalance ?? 0 : null,
      availableCredit: nextType === 'credit_card' ? previous.availableCredit ?? 0 : null,
      cutOffDay: nextType === 'credit_card' ? previous.cutOffDay ?? 1 : null,
      paymentDueDay: nextType === 'credit_card' ? previous.paymentDueDay ?? 1 : null,
      annualRate: nextType === 'credit_card' ? previous.annualRate : null,
      currentAmount: nextType === 'credit_card' ? null : previous.currentAmount ?? 0,
    }))
  }

  const handleInstrumentSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setInstrumentError('')
    setInstrumentMessage('')

    if (instrumentForm.bankId < 1) {
      setInstrumentError('Selecciona un banco valido.')
      return
    }

    const payload = {
      ...instrumentForm,
      name: instrumentForm.name.trim(),
    }

    if (editingInstrumentId === null) {
      const created = await apiClient.createInstrument(payload)
      if (!created.success) {
        setInstrumentError(created.error ?? 'No se pudo crear el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento creado correctamente.')
    } else {
      const updated = await apiClient.updateInstrument(editingInstrumentId, payload)
      if (!updated.success) {
        setInstrumentError(updated.error ?? 'No se pudo actualizar el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento actualizado correctamente.')
    }

    resetInstrumentEditor()
    await loadInstruments()
  }

  const handleInstrumentDelete = async (id: number): Promise<void> => {
    setInstrumentError('')
    setInstrumentMessage('')

    const deleted = await apiClient.deleteInstrument(id)

    if (!deleted.success) {
      setInstrumentError(deleted.error ?? 'No se pudo eliminar el instrumento.')
      return
    }

    setInstrumentMessage('Instrumento eliminado correctamente.')
    if (editingInstrumentId === id) {
      resetInstrumentEditor()
    }
    await loadInstruments()
  }

  if (isLoading) {
    return (
      <main className="settings-screen settings-screen--centered">
        <p className="settings-screen__status">Cargando configuracion local...</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="app-shell__sidebar">
        <h1 className="app-shell__brand">Finanzas Lit</h1>
        <button
          className={`nav-button ${activeSection === 'settings' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('settings')}
        >
          Settings
        </button>
        <button
          className={`nav-button ${activeSection === 'banks' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('banks')}
        >
          Bancos
        </button>
        <button
          className={`nav-button ${activeSection === 'instruments' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('instruments')}
        >
          Instrumentos
        </button>
      </aside>

      <section className="app-shell__content">
        {activeSection === 'settings' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Configuracion Inicial</h2>
              <p className="card__subtitle">Guarda API Key, endpoint HTTPS y region AWS en SQLite local.</p>
            </header>

            <form className="form-grid" onSubmit={handleSave}>
              <label className="form-grid__field" htmlFor="apiKey">API Key</label>
              <input
                id="apiKey"
                className="form-grid__input"
                type="password"
                value={config.apiKey}
                onChange={(event) => setConfig({ ...config, apiKey: event.target.value })}
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
                onChange={(event) => setConfig({ ...config, apiEndpoint: event.target.value })}
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
                onChange={(event) => setConfig({ ...config, awsRegion: event.target.value })}
                placeholder="us-east-1"
                autoComplete="off"
                required
              />

              <div className="form-grid__actions">
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

            {error ? <p className="message message--error">{error}</p> : null}
            {successMessage ? <p className="message message--success">{successMessage}</p> : null}
            {pingError ? <p className="message message--error">{pingError}</p> : null}
            {pingResponse ? <p className="message message--info">{pingResponse}</p> : null}
          </section>
        ) : null}

        {activeSection === 'banks' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Bancos</h2>
              <p className="card__subtitle">Alta, edicion y baja logica de entidades bancarias.</p>
            </header>

            <form className="form-grid" onSubmit={handleBankSubmit}>
              <label className="form-grid__field" htmlFor="bankName">Nombre del banco</label>
              <input
                id="bankName"
                className="form-grid__input"
                type="text"
                value={bankForm.name}
                onChange={(event) => setBankForm({ ...bankForm, name: event.target.value })}
                placeholder="BBVA"
                required
              />

              <label className="form-grid__field" htmlFor="bankShortName">Nombre corto</label>
              <input
                id="bankShortName"
                className="form-grid__input"
                type="text"
                value={bankForm.shortName}
                onChange={(event) => setBankForm({ ...bankForm, shortName: event.target.value })}
                placeholder="BBVA"
              />

              <label className="form-grid__field" htmlFor="bankColor">Color Hex</label>
              <input
                id="bankColor"
                className="form-grid__input"
                type="text"
                value={bankForm.color}
                onChange={(event) => setBankForm({ ...bankForm, color: event.target.value })}
                placeholder="#0057B8"
              />

              <label className="form-grid__field" htmlFor="bankIcon">Icono (Lucide)</label>
              <input
                id="bankIcon"
                className="form-grid__input"
                type="text"
                value={bankForm.iconName}
                onChange={(event) => setBankForm({ ...bankForm, iconName: event.target.value })}
                placeholder="Landmark"
              />

              <div className="form-grid__actions">
                <button className="button button--primary" type="submit" disabled={!hasConfig}>
                  {editingBankId === null ? 'Crear banco' : 'Guardar cambios'}
                </button>
                <button className="button button--secondary" type="button" onClick={resetBankEditor}>
                  Limpiar
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => {
                    void loadBanks()
                  }}
                >
                  Recargar
                </button>
              </div>
            </form>

            {bankError ? <p className="message message--error">{bankError}</p> : null}
            {bankMessage ? <p className="message message--success">{bankMessage}</p> : null}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Nombre corto</th>
                    <th>Color</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isBanksLoading ? (
                    <tr>
                      <td colSpan={4}>Cargando bancos...</td>
                    </tr>
                  ) : null}
                  {!isBanksLoading && banks.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No hay bancos registrados.</td>
                    </tr>
                  ) : null}
                  {!isBanksLoading
                    ? banks.map((bank) => (
                      <tr key={bank.id}>
                        <td>{bank.name}</td>
                        <td>{bank.shortName ?? '-'}</td>
                        <td>{bank.color ?? '-'}</td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => {
                                setEditingBankId(bank.id)
                                setBankForm(toEditableBank(bank))
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                void handleBankDelete(bank.id)
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === 'instruments' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Instrumentos Financieros</h2>
              <p className="card__subtitle">Gestion de TDC, TDD y cuentas agrupadas por banco.</p>
            </header>

            <form className="form-grid" onSubmit={handleInstrumentSubmit}>
              <label className="form-grid__field" htmlFor="instrumentBank">Banco</label>
              <select
                id="instrumentBank"
                className="form-grid__input"
                value={selectedBankId}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, bankId: Number(event.target.value) })}
                required
              >
                <option value={0}>Selecciona banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>

              <label className="form-grid__field" htmlFor="instrumentName">Nombre del instrumento</label>
              <input
                id="instrumentName"
                className="form-grid__input"
                type="text"
                value={instrumentForm.name}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, name: event.target.value })}
                placeholder="Nu Platinum"
                required
              />

              <label className="form-grid__field" htmlFor="instrumentType">Tipo</label>
              <select
                id="instrumentType"
                className="form-grid__input"
                value={instrumentForm.type}
                onChange={(event) => handleInstrumentTypeChange(event.target.value as InstrumentType)}
              >
                <option value="credit_card">Tarjeta de credito</option>
                <option value="debit_card">Tarjeta de debito</option>
                <option value="account">Cuenta bancaria</option>
              </select>

              <label className="form-grid__field" htmlFor="instrumentLastFour">Ultimos 4 digitos</label>
              <input
                id="instrumentLastFour"
                className="form-grid__input"
                type="text"
                value={instrumentForm.lastFour}
                maxLength={4}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, lastFour: event.target.value })}
                placeholder="1234"
              />

              {instrumentForm.type === 'credit_card' ? (
                <>
                  <label className="form-grid__field" htmlFor="creditLimit">Limite de credito</label>
                  <input
                    id="creditLimit"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.creditLimit ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, creditLimit: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="currentBalance">Saldo actual</label>
                  <input
                    id="currentBalance"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.currentBalance ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, currentBalance: Number(event.target.value) })}
                  />

                  <label className="form-grid__field" htmlFor="cutOffDay">Dia de corte</label>
                  <input
                    id="cutOffDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={instrumentForm.cutOffDay ?? 1}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, cutOffDay: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="paymentDueDay">Dia de pago</label>
                  <input
                    id="paymentDueDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={instrumentForm.paymentDueDay ?? 1}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, paymentDueDay: Number(event.target.value) })}
                    required
                  />
                </>
              ) : (
                <>
                  <label className="form-grid__field" htmlFor="currentAmount">Saldo actual</label>
                  <input
                    id="currentAmount"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.currentAmount ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, currentAmount: Number(event.target.value) })}
                    required
                  />
                </>
              )}

              <label className="form-grid__field" htmlFor="instrumentNotes">Notas</label>
              <input
                id="instrumentNotes"
                className="form-grid__input"
                type="text"
                value={instrumentForm.notes}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, notes: event.target.value })}
                placeholder="Cuenta principal"
              />

              <div className="form-grid__actions">
                <button className="button button--primary" type="submit" disabled={!hasConfig || banks.length === 0}>
                  {editingInstrumentId === null ? 'Crear instrumento' : 'Guardar cambios'}
                </button>
                <button className="button button--secondary" type="button" onClick={resetInstrumentEditor}>
                  Limpiar
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => {
                    void loadInstruments()
                  }}
                >
                  Recargar
                </button>
              </div>
            </form>

            {instrumentError ? <p className="message message--error">{instrumentError}</p> : null}
            {instrumentMessage ? <p className="message message--success">{instrumentMessage}</p> : null}

            <div className="group-list">
              {isInstrumentsLoading ? <p className="card__subtitle">Cargando instrumentos...</p> : null}
              {!isInstrumentsLoading && groupedInstruments.length === 0 ? (
                <p className="card__subtitle">No hay instrumentos registrados.</p>
              ) : null}

              {!isInstrumentsLoading
                ? groupedInstruments.map((group) => (
                  <article key={group.bank?.id ?? `bank-${group.instruments[0].bankId}`} className="group-card">
                    <h3 className="group-card__title">{group.bank?.name ?? 'Banco sin nombre'}</h3>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Instrumento</th>
                            <th>Tipo</th>
                            <th>Detalle</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.instruments.map((instrument) => (
                            <tr key={instrument.id}>
                              <td>{instrument.name}</td>
                              <td>{instrument.type}</td>
                              <td>
                                {instrument.type === 'credit_card'
                                  ? `Corte ${instrument.cutOffDay ?? '-'} / Pago ${instrument.paymentDueDay ?? '-'} / Limite ${formatCurrency(instrument.creditLimit)} / Saldo ${formatCurrency(instrument.currentBalance)}`
                                  : `Saldo ${formatCurrency(instrument.currentAmount)}`}
                              </td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--secondary"
                                    type="button"
                                    onClick={() => {
                                      setEditingInstrumentId(instrument.id)
                                      setInstrumentForm(toEditableInstrument(instrument))
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="button button--danger"
                                    type="button"
                                    onClick={() => {
                                      void handleInstrumentDelete(instrument.id)
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))
                : null}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
