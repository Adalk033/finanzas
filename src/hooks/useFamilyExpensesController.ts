import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_FAMILY_EXPENSE_FILTERS,
  EMPTY_FAMILY_EXPENSE_FORM,
} from '../app/appHelpers'
import type {
  Category,
  FamilyExpense,
  FamilyExpenseFilters,
  FamilyExpenseInput,
} from '../types/domain'
import { useAppliedFilters } from './useAppliedFilters'

export function useFamilyExpensesController(categories: Category[]) {
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([])
  const [familyExpenseForm, setFamilyExpenseForm] = useState<FamilyExpenseInput>(EMPTY_FAMILY_EXPENSE_FORM)
  const { appliedFilters: familyExpenseFilters, getRequestedFilters, runFilterQuery } = useAppliedFilters(EMPTY_FAMILY_EXPENSE_FILTERS)
  const [editingFamilyExpenseId, setEditingFamilyExpenseId] = useState<number | null>(null)
  const [isFamilyExpensesLoading, setIsFamilyExpensesLoading] = useState(false)
  const [familyExpenseError, setFamilyExpenseError] = useState('')
  const [familyExpenseMessage, setFamilyExpenseMessage] = useState('')

  const familyExpenseSubcategories = useMemo(() => {
    if (!familyExpenseForm.categoryId) return []
    return categories.find((category) => category.id === familyExpenseForm.categoryId)?.subcategories ?? []
  }, [categories, familyExpenseForm.categoryId])

  const applyFamilyExpenseFilters = async (filters: FamilyExpenseFilters): Promise<boolean> => {
    setIsFamilyExpensesLoading(true)
    setFamilyExpenseError('')
    const query = filters.months.length ? filters : { ...filters, months: EMPTY_FAMILY_EXPENSE_FILTERS.months }
    const result = await runFilterQuery(query, apiClient.getFamilyExpenses)
    if (!result) return false
    setIsFamilyExpensesLoading(false)
    if (!result.success) {
      setFamilyExpenseError(result.error ?? 'No se pudieron cargar los gastos familiares.')
      return false
    }
    setFamilyExpenses(result.data ?? [])
    return true
  }

  const loadFamilyExpenses = async (): Promise<void> => {
    await applyFamilyExpenseFilters(getRequestedFilters())
  }

  const resetFamilyExpenseForm = (): void => {
    setEditingFamilyExpenseId(null)
    setFamilyExpenseForm(EMPTY_FAMILY_EXPENSE_FORM)
  }

  const startFamilyExpenseEdit = (expense: FamilyExpense): void => {
    setEditingFamilyExpenseId(expense.id)
    setFamilyExpenseForm({
      categoryId: expense.categoryId,
      subcategoryId: expense.subcategoryId,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
      notes: expense.notes ?? '',
    })
  }

  const handleFamilyExpenseSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setFamilyExpenseError('')
    setFamilyExpenseMessage('')
    const payload = {
      ...familyExpenseForm,
      description: familyExpenseForm.description.trim(),
      notes: familyExpenseForm.notes.trim(),
    }
    if (payload.amount <= 0) {
      setFamilyExpenseError('Ingresa un monto mayor a cero.')
      return
    }
    if (!payload.description) {
      setFamilyExpenseError('Agrega una descripcion para el gasto.')
      return
    }
    const result = editingFamilyExpenseId === null
      ? await apiClient.createFamilyExpense(payload)
      : await apiClient.updateFamilyExpense(editingFamilyExpenseId, payload)
    if (!result.success) {
      setFamilyExpenseError(result.error ?? 'No se pudo guardar el gasto familiar.')
      return
    }
    const month = payload.expenseDate.slice(0, 7)
    setFamilyExpenseMessage(editingFamilyExpenseId === null
      ? 'Gasto familiar registrado correctamente.'
      : 'Gasto familiar actualizado correctamente.')
    resetFamilyExpenseForm()
    const filters = getRequestedFilters()
    await applyFamilyExpenseFilters(filters.months.includes(month) ? filters : { ...filters, months: [month] })
  }

  const handleFamilyExpenseDelete = async (id: number): Promise<void> => {
    setFamilyExpenseError('')
    setFamilyExpenseMessage('')
    const result = await apiClient.deleteFamilyExpense(id)
    if (!result.success) {
      setFamilyExpenseError(result.error ?? 'No se pudo eliminar el gasto familiar.')
      return
    }
    setFamilyExpenseMessage('Gasto familiar eliminado correctamente.')
    await loadFamilyExpenses()
  }

  const changeFamilyExpenseMonth = async (month: string): Promise<void> => {
    await applyFamilyExpenseFilters({ ...getRequestedFilters(), months: [month] })
  }

  return {
    familyExpenses,
    familyExpenseForm,
    familyExpenseFilters,
    editingFamilyExpenseId,
    familyExpenseSubcategories,
    isFamilyExpensesLoading,
    familyExpenseError,
    familyExpenseMessage,
    setFamilyExpenseForm,
    loadFamilyExpenses,
    resetFamilyExpenseForm,
    startFamilyExpenseEdit,
    handleFamilyExpenseSubmit,
    handleFamilyExpenseDelete,
    applyFamilyExpenseFilters,
    changeFamilyExpenseMonth,
  }
}
