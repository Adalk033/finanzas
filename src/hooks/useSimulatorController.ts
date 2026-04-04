import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_SIMULATION_FORM, MSI_OPTIONS } from '../app/appHelpers'
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
    setSimulationForm({
      ...EMPTY_SIMULATION_FORM,
      instrumentId: instruments[0]?.id ?? null,
    })
  }

  const handleSimulationScenarioTypeChange = (scenarioType: SimulationScenarioType): void => {
    setSimulationForm((previous) => ({
      ...previous,
      scenarioType,
      instrumentId: scenarioType === 'loan' ? null : previous.instrumentId,
      msiMonths: scenarioType === 'msi' ? (previous.msiMonths ?? MSI_OPTIONS[0]) : null,
      loanMonths: scenarioType === 'loan' ? (previous.loanMonths ?? 12) : null,
      annualRate: scenarioType === 'loan' ? (previous.annualRate ?? 0) : null,
    }))
  }

  const handleSimulationSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSimulationError('')
    setSimulationMessage('')

    if (simulationForm.amount <= 0) {
      setSimulationError('Ingresa un monto mayor a cero para simular.')
      return
    }

    if (simulationForm.scenarioType === 'msi') {
      if (!simulationForm.instrumentId) {
        setSimulationError('Selecciona una tarjeta de credito para escenario MSI.')
        return
      }

      if (!simulationForm.msiMonths) {
        setSimulationError('Selecciona los meses MSI.')
        return
      }
    }

    if (simulationForm.scenarioType === 'loan') {
      if (!simulationForm.loanMonths || simulationForm.loanMonths < 1) {
        setSimulationError('Ingresa un plazo de prestamo valido.')
        return
      }

      if (simulationForm.annualRate === null || simulationForm.annualRate < 0) {
        setSimulationError('Ingresa una tasa anual valida para la simulacion de prestamo.')
        return
      }
    }

    const payload: SimulationInput = {
      ...simulationForm,
      name: simulationForm.name.trim(),
      description: simulationForm.description.trim(),
      simulationDate: simulationForm.simulationDate.trim(),
      instrumentId: simulationForm.scenarioType === 'loan' ? null : simulationForm.instrumentId,
    }

    const created = await apiClient.createSimulation(payload)
    if (!created.success) {
      setSimulationError(created.error ?? 'No se pudo crear la simulacion.')
      return
    }

    setSimulationMessage('Simulacion creada correctamente.')
    resetSimulationForm()
    await loadSimulations()
  }

  const handleSimulationDelete = async (simulationId: number): Promise<void> => {
    setSimulationError('')
    setSimulationMessage('')

    const deleted = await apiClient.deleteSimulation(simulationId)
    if (!deleted.success) {
      setSimulationError(deleted.error ?? 'No se pudo eliminar la simulacion.')
      return
    }

    setSimulationMessage('Simulacion eliminada correctamente.')
    await loadSimulations()
  }

  return {
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
