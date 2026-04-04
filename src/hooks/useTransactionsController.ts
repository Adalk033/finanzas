import { useMemo, useState, type SyntheticEvent } from 'react'
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

const AUTO_ADJUSTMENT_NOTE_PREFIX = 'AUTO_ADJUSTMENT_TRANSFER:'
const AUTO_ADJUSTMENT_DESCRIPTION = 'Otros (por ajuste)'

function isAutoAdjustmentTransaction(transaction: Transaction): boolean {
  const notes = transaction.notes ?? ''
  const description = transaction.description ?? ''

  return notes.startsWith(AUTO_ADJUSTMENT_NOTE_PREFIX) || description === AUTO_ADJUSTMENT_DESCRIPTION
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
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null)
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS)
  const [showAutoAdjustmentsOnly, setShowAutoAdjustmentsOnly] = useState(false)

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

  const autoAdjustmentCount = useMemo(() => {
    return transactions.filter(isAutoAdjustmentTransaction).length
  }, [transactions])

  const visibleTransactions = useMemo(() => {
    if (!showAutoAdjustmentsOnly) {
      return transactions
    }

    return transactions.filter(isAutoAdjustmentTransaction)
  }, [showAutoAdjustmentsOnly, transactions])

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
    setEditingTransactionId(null)
    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: instruments[0]?.id ?? 0,
      categoryId: null,
    })
  }

  const startTransactionEdit = (transaction: Transaction): void => {
    setEditingTransactionId(transaction.id)
    setTransactionForm({
      instrumentId: transaction.instrumentId,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      currencyId: transaction.currencyId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description ?? '',
      transactionDate: transaction.transactionDate,
      notes: transaction.notes ?? '',
      isMsi: transaction.isMsi,
      msiMonths: transaction.msiMonths,
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

  const handleTransactionSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
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

    if (editingTransactionId !== null) {
      const updated = await apiClient.updateTransaction(editingTransactionId, payload)

      if (!updated.success) {
        setTransactionError(updated.error ?? 'No se pudo actualizar la transaccion.')
        return
      }

      setTransactionMessage('Transaccion actualizada correctamente.')
      resetTransactionForm()
      await loadInstruments()
      await loadTransactions()
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

  const handleTransactionFiltersSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await loadTransactions(transactionFilters)
  }

  const clearTransactionFilters = async (): Promise<void> => {
    setTransactionFilters(EMPTY_TRANSACTION_FILTERS)
    setShowAutoAdjustmentsOnly(false)
    await loadTransactions(EMPTY_TRANSACTION_FILTERS)
  }

  return {
    transactions: visibleTransactions,
    isTransactionsLoading,
    transactionMessage,
    transactionError,
    transactionForm,
    editingTransactionId,
    transactionFilters,
    selectedTransactionInstrumentId,
    selectedTransactionCategoryId,
    selectedTransactionInstrument,
    transactionSubcategoryOptions,
    activeMsiTransactions,
    autoAdjustmentCount,
    showAutoAdjustmentsOnly,
    setTransactionForm,
    setTransactionFilters,
    setShowAutoAdjustmentsOnly,
    loadTransactions,
    startTransactionEdit,
    resetTransactionForm,
    handleTransactionTypeChange,
    handleTransactionSubmit,
    handleTransactionDelete,
    handleTransactionFiltersSubmit,
    clearTransactionFilters,
  }
}
