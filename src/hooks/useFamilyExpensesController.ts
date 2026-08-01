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

export function useFamilyExpensesController(categories: Category[]) {
  const [familyExpenses, setFamilyExpenses] = useState<FamilyExpense[]>([])
  const [familyExpenseForm, setFamilyExpenseForm] = useState<FamilyExpenseInput>(EMPTY_FAMILY_EXPENSE_FORM)
  const [familyExpenseFilters, setFamilyExpenseFilters] = useState<FamilyExpenseFilters>(EMPTY_FAMILY_EXPENSE_FILTERS)
  const [editingFamilyExpenseId, setEditingFamilyExpenseId] = useState<number | null>(null)
  const [isFamilyExpensesLoading, setIsFamilyExpensesLoading] = useState(false)
  const [familyExpenseError, setFamilyExpenseError] = useState('')
  const [familyExpenseMessage, setFamilyExpenseMessage] = useState('')

  const familyExpenseSubcategories = useMemo(() => {
    if (!familyExpenseForm.categoryId) return []
    return categories.find((category) => category.id === familyExpenseForm.categoryId)?.subcategories ?? []
  }, [categories, familyExpenseForm.categoryId])

  const loadFamilyExpenses = async (filters = familyExpenseFilters): Promise<void> => {
    setIsFamilyExpensesLoading(true)
    setFamilyExpenseError('')
    const result = await apiClient.getFamilyExpenses(filters)
    if (!result.success) {
      setFamilyExpenseError(result.error ?? 'No se pudieron cargar los gastos familiares.')
      setIsFamilyExpensesLoading(false)
      return
    }
    setFamilyExpenses(result.data ?? [])
    setIsFamilyExpensesLoading(false)
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
    const nextFilters = { ...familyExpenseFilters, month }
    setFamilyExpenseFilters(nextFilters)
    setFamilyExpenseMessage(editingFamilyExpenseId === null
      ? 'Gasto familiar registrado correctamente.'
      : 'Gasto familiar actualizado correctamente.')
    resetFamilyExpenseForm()
    await loadFamilyExpenses(nextFilters)
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

  const applyFamilyExpenseFilters = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await loadFamilyExpenses(familyExpenseFilters)
  }

  const clearFamilyExpenseFilters = async (): Promise<void> => {
    const nextFilters = { ...EMPTY_FAMILY_EXPENSE_FILTERS, month: familyExpenseFilters.month }
    setFamilyExpenseFilters(nextFilters)
    await loadFamilyExpenses(nextFilters)
  }

  const changeFamilyExpenseMonth = async (month: string): Promise<void> => {
    const nextFilters = { ...familyExpenseFilters, month }
    setFamilyExpenseFilters(nextFilters)
    await loadFamilyExpenses(nextFilters)
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
    setFamilyExpenseFilters,
    loadFamilyExpenses,
    resetFamilyExpenseForm,
    startFamilyExpenseEdit,
    handleFamilyExpenseSubmit,
    handleFamilyExpenseDelete,
    applyFamilyExpenseFilters,
    clearFamilyExpenseFilters,
    changeFamilyExpenseMonth,
  }
}
