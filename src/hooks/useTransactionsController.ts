import { useMemo, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_TRANSACTION_FILTERS,
  EMPTY_TRANSACTION_FORM,
} from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
} from '../types/domain'

type UseTransactionsControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
  loadInstruments: () => Promise<void>
}

export function useTransactionsController({
  instruments,
  categories,
  loadInstruments,
}: UseTransactionsControllerParams) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [transactionMessage, setTransactionMessage] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionForm, setTransactionForm] = useState<TransactionInput>(EMPTY_TRANSACTION_FORM)
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS)

  const selectedTransactionInstrumentId = transactionForm.instrumentId === 0 ? (instruments[0]?.id ?? 0) : transactionForm.instrumentId
  const selectedTransactionCategoryId = transactionForm.categoryId

  const selectedTransactionInstrument = useMemo(() => {
    return instruments.find((instrument) => instrument.id === selectedTransactionInstrumentId) ?? null
  }, [instruments, selectedTransactionInstrumentId])

  const transactionSubcategoryOptions = useMemo(() => {
    if (!selectedTransactionCategoryId) {
      return []
    }

    return categories.find((category) => category.id === selectedTransactionCategoryId)?.subcategories ?? []
  }, [categories, selectedTransactionCategoryId])

  const activeMsiTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.isMsi && (transaction.msiRemaining ?? 0) > 0)
  }, [transactions])

  const loadTransactions = async (filters: TransactionFilters = transactionFilters): Promise<void> => {
    setIsTransactionsLoading(true)
    setTransactionError('')

    const result = await apiClient.getTransactions(filters)

    if (!result.success) {
      setTransactionError(result.error ?? 'No se pudieron cargar las transacciones.')
      setIsTransactionsLoading(false)
      return
    }

    setTransactions(result.data ?? [])
    setIsTransactionsLoading(false)
  }

  const resetTransactionForm = (): void => {
    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: instruments[0]?.id ?? 0,
      categoryId: null,
    })
  }

  const handleTransactionTypeChange = (nextType: TransactionType): void => {
    setTransactionForm((previous) => ({
      ...previous,
      type: nextType,
      isMsi: nextType === 'expense' ? previous.isMsi : false,
      msiMonths: nextType === 'expense' ? previous.msiMonths : null,
    }))
  }

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setTransactionError('')
    setTransactionMessage('')

    const payload: TransactionInput = {
      ...transactionForm,
      instrumentId: selectedTransactionInstrumentId,
      categoryId: selectedTransactionCategoryId,
      subcategoryId: transactionForm.subcategoryId,
      description: transactionForm.description.trim(),
      notes: transactionForm.notes.trim(),
      isMsi: transactionForm.type === 'expense' ? transactionForm.isMsi : false,
      msiMonths: transactionForm.type === 'expense' && transactionForm.isMsi ? transactionForm.msiMonths : null,
    }

    if (payload.instrumentId < 1) {
      setTransactionError('Selecciona un instrumento valido.')
      return
    }

    if (!payload.transactionDate) {
      setTransactionError('Selecciona una fecha valida.')
      return
    }

    if (payload.amount <= 0) {
      setTransactionError('Ingresa un monto mayor a cero.')
      return
    }

    const created = await apiClient.createTransaction(payload)

    if (!created.success) {
      setTransactionError(created.error ?? 'No se pudo crear la transaccion.')
      return
    }

    setTransactionMessage('Transaccion creada correctamente.')
    resetTransactionForm()
    await loadInstruments()
    await loadTransactions()
  }

  const handleTransactionDelete = async (id: number): Promise<void> => {
    setTransactionError('')
    setTransactionMessage('')

    const deleted = await apiClient.deleteTransaction(id)

    if (!deleted.success) {
      setTransactionError(deleted.error ?? 'No se pudo eliminar la transaccion.')
      return
    }

    setTransactionMessage('Transaccion eliminada correctamente.')
    await loadInstruments()
    await loadTransactions()
  }

  const handleTransactionFiltersSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await loadTransactions(transactionFilters)
  }

  const clearTransactionFilters = async (): Promise<void> => {
    setTransactionFilters(EMPTY_TRANSACTION_FILTERS)
    await loadTransactions(EMPTY_TRANSACTION_FILTERS)
  }

  return {
    transactions,
    isTransactionsLoading,
    transactionMessage,
    transactionError,
    transactionForm,
    transactionFilters,
    selectedTransactionInstrumentId,
    selectedTransactionCategoryId,
    selectedTransactionInstrument,
    transactionSubcategoryOptions,
    activeMsiTransactions,
    setTransactionForm,
    setTransactionFilters,
    loadTransactions,
    resetTransactionForm,
    handleTransactionTypeChange,
    handleTransactionSubmit,
    handleTransactionDelete,
    handleTransactionFiltersSubmit,
    clearTransactionFilters,
  }
}
