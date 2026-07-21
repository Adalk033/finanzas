import { useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_SAVINGS_GOAL_FORM } from '../app/appHelpers'
import type {
  FinancialInstrument,
  SavingsGoal,
  SavingsGoalInput,
} from '../types/domain'

export function useSavingsGoalsController(instruments: FinancialInstrument[]) {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [savingsGoalForm, setSavingsGoalForm] = useState<SavingsGoalInput>(
    EMPTY_SAVINGS_GOAL_FORM,
  )
  const [editingSavingsGoalId, setEditingSavingsGoalId] = useState<number | null>(null)
  const [savingsGoalMessage, setSavingsGoalMessage] = useState('')
  const [savingsGoalError, setSavingsGoalError] = useState('')

  const loadSavingsGoals = async (): Promise<void> => {
    const result = await apiClient.getSavingsGoals()
    if (!result.success) {
      setSavingsGoalError(result.error ?? 'No se pudieron cargar las metas.')
      return
    }
    setSavingsGoals(result.data ?? [])
  }

  const resetSavingsGoalForm = (): void => {
    setEditingSavingsGoalId(null)
    setSavingsGoalForm(EMPTY_SAVINGS_GOAL_FORM)
  }

  const startSavingsGoalEdit = (goal: SavingsGoal): void => {
    setEditingSavingsGoalId(goal.id)
    setSavingsGoalForm({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate ?? '',
      instrumentId: goal.instrumentId,
      notes: goal.notes ?? '',
      isActive: goal.isActive,
    })
  }

  const handleSavingsGoalSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    setSavingsGoalError('')
    const result = editingSavingsGoalId === null
      ? await apiClient.createSavingsGoal(savingsGoalForm)
      : await apiClient.updateSavingsGoal(editingSavingsGoalId, savingsGoalForm)
    if (!result.success) {
      setSavingsGoalError(result.error ?? 'No se pudo guardar la meta.')
      return
    }
    setSavingsGoalMessage(editingSavingsGoalId === null ? 'Meta creada.' : 'Meta actualizada.')
    resetSavingsGoalForm()
    await loadSavingsGoals()
  }

  const handleSavingsGoalDelete = async (id: number): Promise<void> => {
    const result = await apiClient.deleteSavingsGoal(id)
    if (!result.success) {
      setSavingsGoalError(result.error ?? 'No se pudo archivar la meta.')
      return
    }
    setSavingsGoalMessage('Meta archivada.')
    await loadSavingsGoals()
  }

  return {
    savingsGoals,
    savingsGoalForm,
    editingSavingsGoalId,
    savingsGoalMessage,
    savingsGoalError,
    goalInstruments: instruments.filter(
      (instrument) => instrument.isActive && instrument.type !== 'credit_card',
    ),
    setSavingsGoalForm,
    loadSavingsGoals,
    resetSavingsGoalForm,
    startSavingsGoalEdit,
    handleSavingsGoalSubmit,
    handleSavingsGoalDelete,
  }
}
