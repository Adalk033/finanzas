import { ActionButton } from '../ActionButton'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { formatCurrency, getSimulationScenarioLabel } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Simulation,
  SimulationInput,
  SimulationScenarioType,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'
import { SimulationDetailsModal } from '../SimulationDetailsModal'
import './SimulatorSection.css'

type SimulatorSectionProps = {
  editingSimulationId: number | null
  onEdit: (simulation: Simulation) => void
  hasConfig: boolean
  simulationMessage: string
  simulationError: string
  simulationForm: SimulationInput
  simulationInstrumentOptions: FinancialInstrument[]
  simulations: Simulation[]
  isSimulationsLoading: boolean
  onSimulationFormChange: (nextForm: SimulationInput) => void
  onScenarioTypeChange: (scenarioType: SimulationScenarioType) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<boolean>
  onReset: () => void
  onReload: () => void
  onDelete: (simulationId: number) => void
}

export function SimulatorSection({
  editingSimulationId,
  onEdit,
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
  const [detailSimulationId, setDetailSimulationId] = useState<number | null>(null)
  const detailSimulation = simulations.find((simulation) => simulation.id === detailSimulationId)

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Simulador financiero</h2>
        <p className="card__subtitle">Analiza escenarios antes de comprometer tu flujo financiero.</p>
      </header>

      {simulationMessage ? <p className="message message--success">{simulationMessage}</p> : null}
      {simulationError ? <p className="message message--error">{simulationError}</p> : null}

      <div className="section-toolbar">
        <ActionButton className="button button--primary" type="button" onClick={() => {
          onReset()
          setIsFormOpen((value) => !value)
        }}
          icon={isFormOpen ? 'close' : 'plus'}
          label={isFormOpen ? 'Ocultar formulario' : 'Nueva simulacion'}
        />
        <div className="section-toolbar__spacer" />
        <ActionButton iconOnly className="button button--secondary" type="button" disabled={!hasConfig || isSimulationsLoading} onClick={onReload}
          icon="refresh"
          label={isSimulationsLoading ? 'Cargando...' : 'Recargar historial'}
        />
      </div>

      {detailSimulation ? (
        <SimulationDetailsModal simulation={detailSimulation} onClose={() => setDetailSimulationId(null)} />
      ) : null}

      <div className="section-stack">
        {isFormOpen ? (
            <FormModal title={editingSimulationId === null ? 'Nueva simulación' : 'Editar simulación'} onClose={() => setIsFormOpen(false)} error={simulationError} message={simulationMessage}>
              <p className="card__subtitle">Al guardar se recalcula el escenario con tus datos financieros actuales.</p>
              <form className="form-grid" onSubmit={async (event) => {
                if (await onSubmit(event)) setIsFormOpen(false)
              }}>
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
            <NumberInput
              id="simulationAmount"
              className="form-grid__input"
              min={0}
              step="0.01"
              value={simulationForm.amount}
              emptyValue={0}
              onValueChange={(amount) => {
                onSimulationFormChange({ ...simulationForm, amount })
              }}
            />

            {simulationForm.scenarioType === 'msi' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationMsiMonths">Plazo MSI (meses, mínimo 2)</label>
                <NumberInput
                  id="simulationMsiMonths"
                  className="form-grid__input"
                  min={2}
                  step={1}
                  value={simulationForm.msiMonths}
                  emptyValue={null}
                  onValueChange={(msiMonths) => onSimulationFormChange({ ...simulationForm, msiMonths })}
                  required
                />
              </>
            ) : null}

            {simulationForm.scenarioType === 'loan' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationLoanMonths">Plazo (meses)</label>
                <NumberInput
                  id="simulationLoanMonths"
                  className="form-grid__input"
                  min={1}
                  max={600}
                  value={simulationForm.loanMonths}
                  emptyValue={null}
                  onValueChange={(loanMonths) => {
                    onSimulationFormChange({ ...simulationForm, loanMonths })
                  }}
                />

                <label className="form-grid__field" htmlFor="simulationAnnualRate">Tasa anual (%)</label>
                <NumberInput
                  id="simulationAnnualRate"
                  className="form-grid__input"
                  min={0}
                  max={100}
                  step="0.01"
                  value={simulationForm.annualRate}
                  emptyValue={null}
                  onValueChange={(annualRate) => {
                    onSimulationFormChange({ ...simulationForm, annualRate })
                  }}
                />
              </>
            ) : null}

            {simulationForm.scenarioType !== 'loan' ? (
              <>
                <label className="form-grid__field" htmlFor="simulationCreditThreshold">Advertir utilización mayor a (%)</label>
                <NumberInput
                  id="simulationCreditThreshold"
                  className="form-grid__input"
                  min={1}
                  max={100}
                  step={1}
                  value={simulationForm.creditUtilizationWarningThreshold}
                  emptyValue={50}
                  onValueChange={(creditUtilizationWarningThreshold) => {
                    onSimulationFormChange({ ...simulationForm, creditUtilizationWarningThreshold })
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
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig || isSimulationsLoading}
                    icon="save"
                    label="Guardar simulacion"
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Historial</h3>
          </header>

          <div className="table-wrap">
            <table className="table simulator-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Escenario</th>
                  <th>Monto</th>
                  <th>Pago mensual</th>
                  <th>Resultado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isSimulationsLoading ? (
                  <tr>
                    <td colSpan={6}>Cargando simulaciones...</td>
                  </tr>
                ) : null}

                {!isSimulationsLoading && simulations.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay simulaciones registradas.</td>
                  </tr>
                ) : null}

                {!isSimulationsLoading
                  ? simulations.map((simulation) => {
                    const result = simulation.resultJson as {
                      warnings?: string[]
                      scenarioType?: SimulationScenarioType
                      amount?: number
                      monthlyImpact?: number
                    }
                    const warnings = result.warnings ?? []
                    const scenarioType = result.scenarioType ?? 'direct_purchase'

                    return (
                      <tr key={simulation.id}>
                        <td data-label="Nombre">{simulation.name}</td>
                        <td data-label="Escenario">
                          <div>
                            {getSimulationScenarioLabel(scenarioType)}
                            {scenarioType === 'msi' ? (
                              <span className="simulator-table__term">{simulation.input.msiMonths === null ? 'Plazo no registrado' : `${simulation.input.msiMonths} meses`}</span>
                            ) : null}
                          </div>
                        </td>
                        <td data-label="Monto">{formatCurrency(result.amount ?? 0)}</td>
                        <td data-label="Pago mensual">{formatCurrency(result.monthlyImpact ?? 0)}</td>
                        <td data-label="Resultado">
                          <span className={`badge ${simulation.isFavorable && warnings.length === 0 ? 'badge--success' : 'badge--warning'}`}>
                            {simulation.isFavorable ? (warnings.length > 0 ? 'Favorable con advertencias' : 'Favorable') : 'No favorable'}
                          </span>
                        </td>
                        <td data-label="Acciones">
                          <div className="table__actions">
                            <ActionButton iconOnly
                              className="button button--secondary"
                              type="button"
                              onClick={() => setDetailSimulationId(simulation.id)}
                              icon="eye"
                              label={`Ver detalle de ${simulation.name}`}
                            />
                            <ActionButton iconOnly
                              className="button button--secondary"
                              type="button"
                              onClick={() => {
                                onEdit(simulation)
                                setIsFormOpen(true)
                              }}
                              icon="edit"
                              label="Editar simulación"
                            />
                            <ActionButton iconOnly
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                onDelete(simulation.id)
                              }}
                              icon="trash"
                              label="Eliminar"
                            />
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
