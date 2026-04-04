import { useState, type SyntheticEvent } from 'react'
import { MSI_OPTIONS, formatCurrency, getSimulationScenarioLabel } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Simulation,
  SimulationInput,
  SimulationScenarioType,
} from '../../types/domain'

type SimulatorSectionProps = {
  hasConfig: boolean
  simulationMessage: string
  simulationError: string
  simulationForm: SimulationInput
  simulationInstrumentOptions: FinancialInstrument[]
  simulations: Simulation[]
  isSimulationsLoading: boolean
  onSimulationFormChange: (nextForm: SimulationInput) => void
  onScenarioTypeChange: (scenarioType: SimulationScenarioType) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onDelete: (simulationId: number) => void
}

export function SimulatorSection({
  hasConfig,
  simulationMessage,
  simulationError,
  simulationForm,
  simulationInstrumentOptions,
  simulations,
  isSimulationsLoading,
  onSimulationFormChange,
  onScenarioTypeChange,
  onSubmit,
  onReset,
  onReload,
  onDelete,
}: SimulatorSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Simulador financiero</h2>
        <p className="card__subtitle">Analiza escenarios antes de comprometer tu flujo financiero.</p>
      </header>

      {simulationMessage ? <p className="message message--success">{simulationMessage}</p> : null}
      {simulationError ? <p className="message message--error">{simulationError}</p> : null}

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => setIsFormOpen((value) => !value)}>
          {isFormOpen ? 'Ocultar formulario' : 'Nueva simulacion'}
        </button>
        <div className="section-toolbar__spacer" />
        <button className="button button--secondary" type="button" disabled={!hasConfig || isSimulationsLoading} onClick={onReload}>
          {isSimulationsLoading ? 'Cargando...' : 'Recargar historial'}
        </button>
      </div>

      <div className="phase8-layout">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nueva simulacion</h3>
          </header>

          {isFormOpen ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="simulationName">Nombre</label>
            <input
              id="simulationName"
              className="form-grid__input"
              type="text"
              value={simulationForm.name}
              onChange={(event) => {
                onSimulationFormChange({ ...simulationForm, name: event.target.value })
              }}
            />

            <label className="form-grid__field" htmlFor="simulationDate">Fecha</label>
            <input
              id="simulationDate"
              className="form-grid__input"
              type="date"
              value={simulationForm.simulationDate}
              onChange={(event) => {
                onSimulationFormChange({ ...simulationForm, simulationDate: event.target.value })
              }}
            />

            <label className="form-grid__field" htmlFor="simulationType">Escenario</label>
            <select
              id="simulationType"
              className="form-grid__input"
              value={simulationForm.scenarioType}
              onChange={(event) => {
                onScenarioTypeChange(event.target.value as SimulationScenarioType)
              }}
            >
              <option value="direct_purchase">Compra directa</option>
              <option value="msi">Compra MSI</option>
              <option value="loan">Prestamo</option>
            </select>

            {simulationForm.scenarioType !== 'loan' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationInstrument">Instrumento</label>
                <select
                  id="simulationInstrument"
                  className="form-grid__input"
                  value={simulationForm.instrumentId ?? 0}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10)
                    onSimulationFormChange({
                      ...simulationForm,
                      instrumentId: value === 0 ? null : value,
                    })
                  }}
                >
                  <option value={0}>Seleccionar instrumento</option>
                  {simulationInstrumentOptions.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                  ))}
                </select>
              </>
            ) : null}

            <label className="form-grid__field" htmlFor="simulationAmount">Monto</label>
            <input
              id="simulationAmount"
              className="form-grid__input"
              type="number"
              min={0}
              step="0.01"
              value={simulationForm.amount}
              onChange={(event) => {
                onSimulationFormChange({ ...simulationForm, amount: Number(event.target.value) })
              }}
            />

            {simulationForm.scenarioType === 'msi' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationMsiMonths">Meses MSI</label>
                <select
                  id="simulationMsiMonths"
                  className="form-grid__input"
                  value={simulationForm.msiMonths ?? MSI_OPTIONS[0]}
                  onChange={(event) => {
                    onSimulationFormChange({ ...simulationForm, msiMonths: Number.parseInt(event.target.value, 10) })
                  }}
                >
                  {MSI_OPTIONS.map((months) => (
                    <option key={months} value={months}>{months} meses</option>
                  ))}
                </select>
              </>
            ) : null}

            {simulationForm.scenarioType === 'loan' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationLoanMonths">Plazo (meses)</label>
                <input
                  id="simulationLoanMonths"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  max={600}
                  value={simulationForm.loanMonths ?? 12}
                  onChange={(event) => {
                    onSimulationFormChange({ ...simulationForm, loanMonths: Number(event.target.value) })
                  }}
                />

                <label className="form-grid__field" htmlFor="simulationAnnualRate">Tasa anual (%)</label>
                <input
                  id="simulationAnnualRate"
                  className="form-grid__input"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={simulationForm.annualRate ?? 0}
                  onChange={(event) => {
                    onSimulationFormChange({ ...simulationForm, annualRate: Number(event.target.value) })
                  }}
                />
              </>
            ) : null}

            <label className="form-grid__field" htmlFor="simulationDescription">Descripcion</label>
            <textarea
              id="simulationDescription"
              className="form-grid__input"
              rows={3}
              value={simulationForm.description}
              onChange={(event) => {
                onSimulationFormChange({ ...simulationForm, description: event.target.value })
              }}
            />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig || isSimulationsLoading}>
                    Guardar simulacion
                  </button>
                  <button className="button button--secondary" type="button" onClick={onReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Historial</h3>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Escenario</th>
                  <th>Monto</th>
                  <th>Compromiso mensual</th>
                  <th>Balance neto proyectado</th>
                  <th>Viabilidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isSimulationsLoading ? (
                  <tr>
                    <td colSpan={8}>Cargando simulaciones...</td>
                  </tr>
                ) : null}

                {!isSimulationsLoading && simulations.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No hay simulaciones registradas.</td>
                  </tr>
                ) : null}

                {!isSimulationsLoading
                  ? simulations.map((simulation) => {
                    const result = simulation.resultJson as {
                      scenarioType?: SimulationScenarioType
                      amount?: number
                      monthlyCommitmentIncrease?: number
                      projectedSummary?: {
                        netBalance?: number
                      }
                    }

                    const scenarioType = result.scenarioType ?? 'direct_purchase'
                    const amount = result.amount ?? 0
                    const monthlyCommitmentIncrease = result.monthlyCommitmentIncrease ?? 0
                    const projectedNetBalance = result.projectedSummary?.netBalance ?? 0

                    return (
                      <tr key={simulation.id}>
                        <td>{simulation.simulationDate}</td>
                        <td>{simulation.name}</td>
                        <td>{getSimulationScenarioLabel(scenarioType)}</td>
                        <td>{formatCurrency(amount)}</td>
                        <td>{formatCurrency(monthlyCommitmentIncrease)}</td>
                        <td>{formatCurrency(projectedNetBalance)}</td>
                        <td>
                          <span className={`badge ${simulation.isFavorable ? 'badge--success' : 'badge--warning'}`}>
                            {simulation.isFavorable ? 'Favorable' : 'No favorable'}
                          </span>
                        </td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                onDelete(simulation.id)
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                  : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
