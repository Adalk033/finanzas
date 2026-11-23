import { useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { DEFAULT_BUDGET_FILTERS, EMPTY_BUDGET_FORM } from '../app/appHelpers'
import type { Budget, BudgetFilters, BudgetInput } from '../types/domain'
import { useAppliedFilters } from './useAppliedFilters'

export function useBudgetsController() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false)
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [budgetForm, setBudgetForm] = useState<BudgetInput>(EMPTY_BUDGET_FORM)
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null)
  const { appliedFilters: budgetFilters, getRequestedFilters, runFilterQuery } = useAppliedFilters(DEFAULT_BUDGET_FILTERS)

  const applyBudgetFilters = async (filters: BudgetFilters): Promise<boolean> => {
    setIsBudgetsLoading(true)
    setBudgetError('')

    const result = await runFilterQuery(filters, apiClient.getBudgets)
    if (!result) return false
    setIsBudgetsLoading(false)

    if (!result.success) {
      setBudgetError(result.error ?? 'No se pudieron cargar los presupuestos.')
      return false
    }

    setBudgets(result.data ?? [])
    return true
  }

  const loadBudgets = async (): Promise<void> => {
    await applyBudgetFilters(getRequestedFilters())
  }

  const resetBudgetEditor = (): void => {
    setBudgetForm({
      ...EMPTY_BUDGET_FORM,
      month: budgetFilters.months.length === 1 ? budgetFilters.months[0] : EMPTY_BUDGET_FORM.month,
      year: budgetFilters.years.length === 1 ? budgetFilters.years[0] : EMPTY_BUDGET_FORM.year,
    })
    setEditingBudgetId(null)
  }

  const startBudgetEdit = (budget: Budget): void => {
    setEditingBudgetId(budget.id)
    setBudgetForm({
      categoryId: budget.categoryId,
      currencyId: budget.currencyId,
      amount: budget.amount,
      month: budget.month,
      year: budget.year,
      notes: budget.notes ?? '',
    })
  }

  const handleBudgetSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setBudgetError('')
    setBudgetMessage('')

    if (budgetForm.amount <= 0) {
      setBudgetError('Ingresa un monto de presupuesto mayor a cero.')
      return
    }

    const payload: BudgetInput = {
      ...budgetForm,
      notes: budgetForm.notes.trim(),
    }

    if (editingBudgetId === null) {
      const created = await apiClient.createBudget(payload)
      if (!created.success) {
        setBudgetError(created.error ?? 'No se pudo crear el presupuesto.')
        return
      }
      setBudgetMessage('Presupuesto creado correctamente.')
    } else {
      const updated = await apiClient.updateBudget(editingBudgetId, payload)
      if (!updated.success) {
        setBudgetError(updated.error ?? 'No se pudo actualizar el presupuesto.')
        return
      }
      setBudgetMessage('Presupuesto actualizado correctamente.')
    }

    resetBudgetEditor()
    await loadBudgets()
  }

  const handleBudgetDelete = async (budgetId: number): Promise<void> => {
    setBudgetError('')
    setBudgetMessage('')

    const deleted = await apiClient.deleteBudget(budgetId)
    if (!deleted.success) {
      setBudgetError(deleted.error ?? 'No se pudo eliminar el presupuesto.')
      return
    }

    setBudgetMessage('Presupuesto eliminado correctamente.')
    if (editingBudgetId === budgetId) {
      resetBudgetEditor()
    }
    await loadBudgets()
  }

  return {
    budgets,
    isBudgetsLoading,
    budgetMessage,
    budgetError,
    budgetForm,
    editingBudgetId,
    budgetFilters,
    setBudgetForm,
    applyBudgetFilters,
    loadBudgets,
    resetBudgetEditor,
    startBudgetEdit,
    handleBudgetSubmit,
    handleBudgetDelete,
  }
}
