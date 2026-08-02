import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_FIXED_EXPENSE_FORM,
  EMPTY_FIXED_EXPENSE_PAYMENT_FORM,
  toEditableFixedExpense,
} from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  FixedExpense,
  FixedExpenseInput,
  FixedExpensePayment,
  FixedExpensePaymentInput,
} from '../types/domain'

type UseFixedExpensesControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
}

export function useFixedExpensesController({
  instruments,
  categories,
}: UseFixedExpensesControllerParams) {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [isFixedExpensesLoading, setIsFixedExpensesLoading] = useState(false)
  const [fixedExpenseMessage, setFixedExpenseMessage] = useState('')
  const [fixedExpenseError, setFixedExpenseError] = useState('')
  const [fixedExpenseForm, setFixedExpenseForm] = useState<FixedExpenseInput>(EMPTY_FIXED_EXPENSE_FORM)
  const [editingFixedExpenseId, setEditingFixedExpenseId] = useState<number | null>(null)
  const [selectedFixedExpenseId, setSelectedFixedExpenseId] = useState<number | null>(null)
  const [fixedExpensePayments, setFixedExpensePayments] = useState<FixedExpensePayment[]>([])
  const [isFixedExpensePaymentsLoading, setIsFixedExpensePaymentsLoading] = useState(false)
  const [fixedExpensePaymentForm, setFixedExpensePaymentForm] = useState<FixedExpensePaymentInput>(EMPTY_FIXED_EXPENSE_PAYMENT_FORM)

  const selectedFixedExpenseCategory = useMemo(() => {
    if (!fixedExpenseForm.categoryId) {
      return null
    }

    return categories.find((category) => category.id === fixedExpenseForm.categoryId) ?? null
  }, [categories, fixedExpenseForm.categoryId])

  const loadFixedExpenses = async (): Promise<void> => {
    setIsFixedExpensesLoading(true)
    setIsFixedExpensePaymentsLoading(true)
    setFixedExpenseError('')

    const [expensesResult, paymentsResult] = await Promise.all([
      apiClient.getFixedExpenses(),
      apiClient.getAllFixedExpensePayments(),
    ])

    if (!expensesResult.success) {
      setFixedExpenseError(expensesResult.error ?? 'No se pudieron cargar los gastos fijos.')
    } else {
      setFixedExpenses(expensesResult.data ?? [])
    }

    if (!paymentsResult.success) {
      setFixedExpenseError(paymentsResult.error ?? 'No se pudo cargar el historial de pagos.')
    } else {
      setFixedExpensePayments(paymentsResult.data ?? [])
    }

    setIsFixedExpensesLoading(false)
    setIsFixedExpensePaymentsLoading(false)
  }

  const resetFixedExpenseEditor = (): void => {
    setFixedExpenseForm({
      ...EMPTY_FIXED_EXPENSE_FORM,
      instrumentId: instruments.find((instrument) => instrument.type !== 'credit_card')?.id ?? null,
      categoryId: null,
      subcategoryId: null,
    })
    setEditingFixedExpenseId(null)
  }

  const startFixedExpenseEdit = (expense: FixedExpense): void => {
    setEditingFixedExpenseId(expense.id)
    setFixedExpenseForm(toEditableFixedExpense(expense))
  }

  const handleFixedExpenseSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setFixedExpenseError('')
    setFixedExpenseMessage('')

    if (fixedExpenseForm.estimatedAmount <= 0) {
      setFixedExpenseError('Ingresa un monto estimado mayor a cero.')
      return
    }

    const payload: FixedExpenseInput = {
      ...fixedExpenseForm,
      name: fixedExpenseForm.name.trim(),
      notes: fixedExpenseForm.notes.trim(),
    }

    if (editingFixedExpenseId === null) {
      const created = await apiClient.createFixedExpense(payload)
      if (!created.success) {
        setFixedExpenseError(created.error ?? 'No se pudo crear el gasto fijo.')
        return
      }
      setFixedExpenseMessage('Gasto fijo creado correctamente.')
    } else {
      const updated = await apiClient.updateFixedExpense(editingFixedExpenseId, payload)
      if (!updated.success) {
        setFixedExpenseError(updated.error ?? 'No se pudo actualizar el gasto fijo.')
        return
      }
      setFixedExpenseMessage('Gasto fijo actualizado correctamente.')
    }

    resetFixedExpenseEditor()
    await loadFixedExpenses()
  }

  const handleFixedExpenseDelete = async (fixedExpenseId: number): Promise<void> => {
    setFixedExpenseError('')
    setFixedExpenseMessage('')

    const deleted = await apiClient.deleteFixedExpense(fixedExpenseId)
    if (!deleted.success) {
      setFixedExpenseError(deleted.error ?? 'No se pudo eliminar el gasto fijo.')
      return
    }

    setFixedExpenseMessage('Gasto fijo eliminado correctamente.')
    if (editingFixedExpenseId === fixedExpenseId) {
      resetFixedExpenseEditor()
    }
    if (selectedFixedExpenseId === fixedExpenseId) {
      setSelectedFixedExpenseId(null)
    }
    await loadFixedExpenses()
  }

  const resetFixedExpensePaymentForm = (): void => {
    const selectedExpense = fixedExpenses.find((expense) => expense.id === selectedFixedExpenseId)
    setFixedExpensePaymentForm({
      ...EMPTY_FIXED_EXPENSE_PAYMENT_FORM,
      amount: selectedExpense?.estimatedAmount ?? 0,
    })
  }

  const handleFixedExpensePaymentSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!selectedFixedExpenseId) {
      setFixedExpenseError('Primero selecciona un gasto fijo.')
      return
    }

    setFixedExpenseError('')
    setFixedExpenseMessage('')

    if (fixedExpensePaymentForm.amount <= 0) {
      setFixedExpenseError('Ingresa un monto de pago mayor a cero.')
      return
    }

    const payload: FixedExpensePaymentInput = {
      ...fixedExpensePaymentForm,
      notes: fixedExpensePaymentForm.notes.trim(),
      paymentDate: fixedExpensePaymentForm.paymentDate.trim(),
    }

    const created = await apiClient.createFixedExpensePayment(selectedFixedExpenseId, payload)
    if (!created.success) {
      setFixedExpenseError(created.error ?? 'No se pudo registrar el pago mensual.')
      return
    }

    setFixedExpenseMessage('Pago mensual registrado correctamente.')
    resetFixedExpensePaymentForm()
    await loadFixedExpenses()
  }

  const handleFixedExpensePaymentDelete = async (fixedExpenseId: number, paymentId: number): Promise<void> => {
    setFixedExpenseError('')
    setFixedExpenseMessage('')

    const deleted = await apiClient.deleteFixedExpensePayment(fixedExpenseId, paymentId)
    if (!deleted.success) {
      setFixedExpenseError(deleted.error ?? 'No se pudo eliminar el pago mensual.')
      return
    }

    setFixedExpenseMessage('Pago mensual eliminado correctamente.')
    await loadFixedExpenses()
  }

  const selectFixedExpense = (fixedExpenseId: number | null): void => {
    setSelectedFixedExpenseId(fixedExpenseId)
    const selectedExpense = fixedExpenses.find((expense) => expense.id === fixedExpenseId)
    if (selectedExpense) {
      setFixedExpensePaymentForm((currentForm) => ({
        ...currentForm,
        amount: selectedExpense.estimatedAmount,
      }))
    }
  }

  return {
    fixedExpenses,
    isFixedExpensesLoading,
    fixedExpenseMessage,
    fixedExpenseError,
    fixedExpenseForm,
    editingFixedExpenseId,
    selectedFixedExpenseId,
    fixedExpensePayments,
    isFixedExpensePaymentsLoading,
    fixedExpensePaymentForm,
    selectedFixedExpenseCategory,
    setFixedExpenseForm,
    setFixedExpensePaymentForm,
    loadFixedExpenses,
    resetFixedExpenseEditor,
    startFixedExpenseEdit,
    handleFixedExpenseSubmit,
    handleFixedExpenseDelete,
    resetFixedExpensePaymentForm,
    handleFixedExpensePaymentSubmit,
    handleFixedExpensePaymentDelete,
    selectFixedExpense,
  }
}
