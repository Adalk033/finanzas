import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_SIMULATION_FORM } from '../app/appHelpers'
import type {
  FinancialInstrument,
  Simulation,
  SimulationInput,
  SimulationScenarioType,
} from '../types/domain'

type UseSimulatorControllerParams = {
  instruments: FinancialInstrument[]
}

export function useSimulatorController({ instruments }: UseSimulatorControllerParams) {
  const [editingSimulationId, setEditingSimulationId] = useState<number | null>(null)
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [isSimulationsLoading, setIsSimulationsLoading] = useState(false)
  const [simulationMessage, setSimulationMessage] = useState('')
  const [simulationError, setSimulationError] = useState('')
  const [simulationForm, setSimulationForm] = useState<SimulationInput>(EMPTY_SIMULATION_FORM)

  const simulationInstrumentOptions = useMemo(() => {
    if (simulationForm.scenarioType === 'loan') {
      return []
    }

    if (simulationForm.scenarioType === 'msi') {
      return instruments.filter((instrument) => instrument.type === 'credit_card')
    }

    return instruments
  }, [instruments, simulationForm.scenarioType])

  const loadSimulations = async (): Promise<void> => {
    setIsSimulationsLoading(true)
    setSimulationError('')

    const result = await apiClient.getSimulations()

    if (!result.success) {
      setSimulationError(result.error ?? 'No se pudieron cargar las simulaciones.')
      setIsSimulationsLoading(false)
      return
    }

    setSimulations(result.data ?? [])
    setIsSimulationsLoading(false)
  }

  const resetSimulationForm = (): void => {
    setEditingSimulationId(null)
    setSimulationError('')
    setSimulationMessage('')
    setSimulationForm({
      ...EMPTY_SIMULATION_FORM,
      instrumentId: instruments[0]?.id ?? null,
    })
  }

  const handleSimulationEdit = (simulation: Simulation): void => {
    setEditingSimulationId(simulation.id)
    setSimulationForm({ ...simulation.input, creditUtilizationWarningThreshold: simulation.input.creditUtilizationWarningThreshold ?? 50 })
    setSimulationError('')
    setSimulationMessage(
      simulation.input.scenarioType === 'loan' && simulation.input.loanMonths === null
        ? 'Esta simulación antigua no guardó el plazo ni la tasa. Captúralos para recalcular.'
        : '',
    )
  }

  const handleSimulationScenarioTypeChange = (scenarioType: SimulationScenarioType): void => {
    setSimulationForm((previous) => ({
      ...previous,
      scenarioType,
      instrumentId: scenarioType === 'loan' ? null : previous.instrumentId,
      msiMonths: scenarioType === 'msi' ? (previous.msiMonths ?? 2) : null,
      loanMonths: scenarioType === 'loan' ? (previous.loanMonths ?? 12) : null,
      annualRate: scenarioType === 'loan' ? (previous.annualRate ?? 0) : null,
    }))
  }

  const handleSimulationSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<boolean> => {
    event.preventDefault()
    setSimulationError('')
    setSimulationMessage('')

    if (simulationForm.amount <= 0) {
      setSimulationError('Ingresa un monto mayor a cero para simular.')
      return false
    }

    if (simulationForm.scenarioType === 'msi') {
      if (!simulationForm.instrumentId) {
        setSimulationError('Selecciona una tarjeta de credito para escenario MSI.')
        return false
      }

      if (!Number.isSafeInteger(simulationForm.msiMonths) || (simulationForm.msiMonths ?? 0) < 2) {
        setSimulationError('Ingresa un número entero de meses desde 2 para MSI.')
        return false
      }
    }

    if (simulationForm.scenarioType === 'loan') {
      if (!simulationForm.loanMonths || simulationForm.loanMonths < 1) {
        setSimulationError('Ingresa un plazo de prestamo valido.')
        return false
      }

      if (simulationForm.annualRate === null || simulationForm.annualRate < 0) {
        setSimulationError('Ingresa una tasa anual valida para la simulacion de prestamo.')
        return false
      }
    }

    const payload: SimulationInput = {
      ...simulationForm,
      name: simulationForm.name.trim(),
      description: simulationForm.description.trim(),
      simulationDate: simulationForm.simulationDate.trim(),
      instrumentId: simulationForm.scenarioType === 'loan' ? null : simulationForm.instrumentId,
    }

    const created = editingSimulationId === null
      ? await apiClient.createSimulation(payload)
      : await apiClient.updateSimulation(editingSimulationId, payload)
    if (!created.success) {
      setSimulationError(created.error ?? 'No se pudo guardar la simulacion.')
      return false
    }

    const wasEditing = editingSimulationId !== null
    resetSimulationForm()
    setSimulationMessage(wasEditing ? 'Simulación actualizada correctamente.' : 'Simulación creada correctamente.')
    await loadSimulations()
    return true
  }

  const handleSimulationDelete = async (simulationId: number): Promise<void> => {
    setSimulationError('')
    setSimulationMessage('')

    const deleted = await apiClient.deleteSimulation(simulationId)
    if (!deleted.success) {
      setSimulationError(deleted.error ?? 'No se pudo eliminar la simulacion.')
      return
    }

    if (editingSimulationId === simulationId) resetSimulationForm()
    setSimulationMessage('Simulacion eliminada correctamente.')
    await loadSimulations()
  }

  return {
    editingSimulationId,
    handleSimulationEdit,
    simulations,
    isSimulationsLoading,
    simulationMessage,
    simulationError,
    simulationForm,
    simulationInstrumentOptions,
    setSimulationForm,
    loadSimulations,
    resetSimulationForm,
    handleSimulationScenarioTypeChange,
    handleSimulationSubmit,
    handleSimulationDelete,
  }
}
