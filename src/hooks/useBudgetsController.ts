import { useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_BUDGET_FORM } from '../app/appHelpers'
import type { Budget, BudgetInput } from '../types/domain'

export function useBudgetsController() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false)
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [budgetForm, setBudgetForm] = useState<BudgetInput>(EMPTY_BUDGET_FORM)
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null)
  const [budgetFilterMonth, setBudgetFilterMonth] = useState(new Date().getMonth() + 1)
  const [budgetFilterYear, setBudgetFilterYear] = useState(new Date().getFullYear())

  const loadBudgets = async (month: number = budgetFilterMonth, year: number = budgetFilterYear): Promise<void> => {
    setIsBudgetsLoading(true)
    setBudgetError('')

    const result = await apiClient.getBudgets(month, year)

    if (!result.success) {
      setBudgetError(result.error ?? 'No se pudieron cargar los presupuestos.')
      setIsBudgetsLoading(false)
      return
    }

    setBudgets(result.data ?? [])
    setIsBudgetsLoading(false)
  }

  const resetBudgetEditor = (): void => {
    setBudgetForm({
      ...EMPTY_BUDGET_FORM,
      month: budgetFilterMonth,
      year: budgetFilterYear,
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

  const handleBudgetSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
    await loadBudgets(budgetFilterMonth, budgetFilterYear)
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
    await loadBudgets(budgetFilterMonth, budgetFilterYear)
  }

  return {
    budgets,
    isBudgetsLoading,
    budgetMessage,
    budgetError,
    budgetForm,
    editingBudgetId,
    budgetFilterMonth,
    budgetFilterYear,
    setBudgetForm,
    setBudgetFilterMonth,
    setBudgetFilterYear,
    loadBudgets,
    resetBudgetEditor,
    startBudgetEdit,
    handleBudgetSubmit,
    handleBudgetDelete,
  }
}
