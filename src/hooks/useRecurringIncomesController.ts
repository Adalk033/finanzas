import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_RECURRING_INCOME_FORM } from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  RecurringIncome,
  RecurringIncomeInput,
} from '../types/domain'

type Params = {
  instruments: FinancialInstrument[]
  categories: Category[]
}

export function useRecurringIncomesController({ instruments, categories }: Params) {
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([])
  const [recurringIncomeForm, setRecurringIncomeForm] = useState<RecurringIncomeInput>(
    EMPTY_RECURRING_INCOME_FORM,
  )
  const [editingRecurringIncomeId, setEditingRecurringIncomeId] = useState<number | null>(null)
  const [recurringIncomeMessage, setRecurringIncomeMessage] = useState('')
  const [recurringIncomeError, setRecurringIncomeError] = useState('')

  const incomeInstruments = useMemo(
    () => instruments.filter((instrument) => instrument.isActive && instrument.type !== 'credit_card'),
    [instruments],
  )
  const incomeCategories = useMemo(
    () => categories.filter(
      (category) => category.isActive && (category.type === 'income' || category.type === 'both'),
    ),
    [categories],
  )

  const loadRecurringIncomes = async (): Promise<void> => {
    const result = await apiClient.getRecurringIncomes()
    if (!result.success) {
      setRecurringIncomeError(result.error ?? 'No se pudieron cargar los ingresos recurrentes.')
      return
    }
    setRecurringIncomes(result.data ?? [])
  }

  const resetRecurringIncomeForm = (): void => {
    setEditingRecurringIncomeId(null)
    setRecurringIncomeForm({
      ...EMPTY_RECURRING_INCOME_FORM,
      instrumentId: incomeInstruments[0]?.id ?? 0,
    })
  }

  const startRecurringIncomeEdit = (income: RecurringIncome): void => {
    setEditingRecurringIncomeId(income.id)
    setRecurringIncomeForm({
      name: income.name,
      instrumentId: income.instrumentId,
      categoryId: income.categoryId,
      subcategoryId: income.subcategoryId,
      currencyId: income.currencyId,
      amount: income.amount,
      frequency: income.frequency,
      paymentDay: income.paymentDay,
      nextPayment: income.nextPayment,
      isActive: income.isActive,
      notes: income.notes ?? '',
    })
  }

  const handleRecurringIncomeSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault()
    setRecurringIncomeError('')
    setRecurringIncomeMessage('')
    const payload = {
      ...recurringIncomeForm,
      name: recurringIncomeForm.name.trim(),
      notes: recurringIncomeForm.notes.trim(),
    }
    const result = editingRecurringIncomeId === null
      ? await apiClient.createRecurringIncome(payload)
      : await apiClient.updateRecurringIncome(editingRecurringIncomeId, payload)
    if (!result.success) {
      setRecurringIncomeError(result.error ?? 'No se pudo guardar el ingreso recurrente.')
      return
    }
    setRecurringIncomeMessage(
      editingRecurringIncomeId === null
        ? 'Ingreso recurrente creado.'
        : 'Ingreso recurrente actualizado.',
    )
    resetRecurringIncomeForm()
    await loadRecurringIncomes()
  }

  const handleRecurringIncomeDelete = async (id: number): Promise<void> => {
    const result = await apiClient.deleteRecurringIncome(id)
    if (!result.success) {
      setRecurringIncomeError(result.error ?? 'No se pudo archivar el ingreso recurrente.')
      return
    }
    setRecurringIncomeMessage('Ingreso recurrente archivado.')
    await loadRecurringIncomes()
  }

  return {
    recurringIncomes,
    recurringIncomeForm,
    editingRecurringIncomeId,
    recurringIncomeMessage,
    recurringIncomeError,
    incomeInstruments,
    incomeCategories,
    setRecurringIncomeForm,
    loadRecurringIncomes,
    resetRecurringIncomeForm,
    startRecurringIncomeEdit,
    handleRecurringIncomeSubmit,
    handleRecurringIncomeDelete,
  }
}
