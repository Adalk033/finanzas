import { formatCurrency, formatIsoDate, getSimulationScenarioLabel } from '../app/appHelpers'
import type { Simulation } from '../types/domain'
import { FormModal } from './FormModal'
import './SimulationDetailsModal.css'

type SimulationDetailsModalProps = {
  simulation: Simulation
  onClose: () => void
}

export function SimulationDetailsModal({ simulation, onClose }: SimulationDetailsModalProps) {
  const result = simulation.resultJson as {
    calculationVersion?: number
    reasons?: string[]
    warnings?: string[]
    monthlyImpact?: number
    monthlyDisposable?: number
    projectedAvailable?: number
    projectedCreditAvailable?: number | null
    debtServiceRatio?: number
    projectedCreditUtilization?: number | null
  }
  const snapshot = simulation.snapshotJson as {
    averagePeriodStart?: string
    averagePeriodEndExclusive?: string
    averageMonthlyIncome?: number
    averageMonthlyExpense?: number
    monthlyMsiPayments?: number
    monthlyLoanPayments?: number
    instrument?: { name?: string } | null
  }
  const reasons = result.reasons ?? []
  const warnings = result.warnings ?? []
  const fields = [
    ['Fecha', formatIsoDate(simulation.simulationDate)],
    ['Escenario', getSimulationScenarioLabel(simulation.input.scenarioType)],
    ['Monto', formatCurrency(simulation.input.amount)],
    ['Compromiso mensual', formatCurrency(result.monthlyImpact ?? 0)],
    ['Instrumento', snapshot.instrument?.name ?? 'Sin instrumento'],
    ...(simulation.input.scenarioType === 'msi' ? [
      ['Meses MSI', simulation.input.msiMonths === null ? 'No registrado' : `${simulation.input.msiMonths} meses`],
    ] : []),
    ...(simulation.input.scenarioType === 'loan' ? [
      ['Plazo del préstamo', simulation.input.loanMonths === null ? 'No registrado' : `${simulation.input.loanMonths} meses`],
      ['Tasa anual', simulation.input.annualRate === null ? 'No registrada' : `${simulation.input.annualRate}%`],
    ] : []),
    ['Disponible proyectado', formatCurrency(result.projectedAvailable ?? 0)],
    ['Deuda / ingreso', `${(result.debtServiceRatio ?? 0).toFixed(1)}%`],
    ...(result.projectedCreditAvailable != null ? [['Crédito disponible proyectado', formatCurrency(result.projectedCreditAvailable)]] : []),
    ...(result.projectedCreditUtilization != null ? [['Utilización proyectada', `${result.projectedCreditUtilization.toFixed(2)}%`]] : []),
    ...(result.calculationVersion === 2 ? [
      ['Periodo desde', formatIsoDate(snapshot.averagePeriodStart ?? '')],
      ['Hasta (sin incluir)', formatIsoDate(snapshot.averagePeriodEndExclusive ?? '')],
      ['Ingreso mensual promedio', formatCurrency(snapshot.averageMonthlyIncome ?? 0)],
      ['Gasto ordinario promedio', formatCurrency(snapshot.averageMonthlyExpense ?? 0)],
      ['Pagos MSI vigentes', formatCurrency(snapshot.monthlyMsiPayments ?? 0)],
      ['Pagos de préstamos', formatCurrency(snapshot.monthlyLoanPayments ?? 0)],
      ['Margen mensual previo a la compra', formatCurrency(result.monthlyDisposable ?? 0)],
    ] : []),
    ...(simulation.description ? [['Descripción', simulation.description]] : []),
  ]

  return (
    <FormModal title={`Detalle: ${simulation.name}`} onClose={onClose}>
      <span className={`badge ${simulation.isFavorable && warnings.length === 0 ? 'badge--success' : 'badge--warning'}`}>
        {simulation.isFavorable ? (warnings.length > 0 ? 'Favorable con advertencias' : 'Favorable') : 'No favorable'}
      </span>
      <dl className="simulation-details">
        {fields.map(([label, value]) => (
          <div className="simulation-details__field" key={label}>
            <dt className="simulation-details__label">{label}</dt>
            <dd className="simulation-details__value">{value}</dd>
          </div>
        ))}
      </dl>
      {result.calculationVersion !== 2 ? (
        <p>Evaluación anterior. Edita y guarda para aplicar las reglas actuales.</p>
      ) : (
        <>
          <section className="simulation-details__evaluation" aria-label="Motivos del resultado">
            <h3>Motivos del resultado</h3>
            {reasons.length === 0 ? <p>El compromiso cabe en el margen mensual y cumple las condiciones de liquidez.</p> : (
              <ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            )}
          </section>
          {warnings.length > 0 ? (
            <section className="simulation-details__evaluation" aria-label="Advertencias">
              <h3>Advertencias</h3>
              <ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </section>
          ) : null}
        </>
      )}
    </FormModal>
  )
}
