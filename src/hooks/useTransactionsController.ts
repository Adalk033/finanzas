import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_TRANSACTION_FILTERS,
  EMPTY_TRANSACTION_FORM,
  EMPTY_TRANSFER_FORM,
} from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
  TransferInput,
} from '../types/domain'

type UseTransactionsControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
  loadInstruments: () => Promise<void>
}

const NO_BALANCE_IMPACT_NOTE_PREFIX = 'NO_BALANCE_IMPACT:'
const TRANSACTION_SEARCH_DEBOUNCE_MS = 250

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
  const [activeMsiTransactions, setActiveMsiTransactions] = useState<Transaction[]>([])
  const [transactionPagination, setTransactionPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  })
  const [excludeFromBalance, setExcludeFromBalance] = useState(false)
  const [cardPaymentForm, setCardPaymentForm] = useState<TransferInput>({
    ...EMPTY_TRANSFER_FORM,
    type: 'card_payment',
  })
  const [cardPaymentMessage, setCardPaymentMessage] = useState('')
  const [cardPaymentError, setCardPaymentError] = useState('')
  const transactionSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transactionRequestIdRef = useRef(0)

  const clearTransactionSearchTimeout = (): void => {
    if (transactionSearchTimeoutRef.current !== null) {
      clearTimeout(transactionSearchTimeoutRef.current)
      transactionSearchTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (transactionSearchTimeoutRef.current !== null) {
        clearTimeout(transactionSearchTimeoutRef.current)
      }
    }
  }, [])

  const stripNoBalancePrefix = (notes: string): string => {
    if (!notes.startsWith(NO_BALANCE_IMPACT_NOTE_PREFIX)) {
      return notes
    }

    return notes.slice(NO_BALANCE_IMPACT_NOTE_PREFIX.length).trimStart()
  }

  const buildNotesWithBalanceFlag = (notes: string, excluded: boolean): string => {
    const cleanNotes = stripNoBalancePrefix(notes.trim())

    if (!excluded) {
      return cleanNotes
    }

    return cleanNotes.length > 0
      ? `${NO_BALANCE_IMPACT_NOTE_PREFIX} ${cleanNotes}`
      : NO_BALANCE_IMPACT_NOTE_PREFIX
  }

  const isExcludedByNotes = (notes: string | null): boolean => {
    return (notes ?? '').startsWith(NO_BALANCE_IMPACT_NOTE_PREFIX)
  }

  const selectedTransactionInstrumentId = transactionForm.instrumentId === 0 ? (instruments[0]?.id ?? 0) : transactionForm.instrumentId
  const selectedTransactionCategoryId = transactionForm.categoryId

  const selectedTransactionInstrument = useMemo(() => {
    return instruments.find((instrument) => instrument.id === selectedTransactionInstrumentId) ?? null
  }, [instruments, selectedTransactionInstrumentId])

  const creditCardInstruments = useMemo(
    () => instruments.filter((instrument) => instrument.type === 'credit_card' && instrument.isActive),
    [instruments],
  )
  const cardPaymentSourceInstruments = useMemo(
    () => instruments.filter(
      (instrument) => (instrument.type === 'account' || instrument.type === 'debit_card') && instrument.isActive,
    ),
    [instruments],
  )
  const selectedCardPaymentCardId = cardPaymentForm.destinationInstrumentId
    && creditCardInstruments.some((instrument) => instrument.id === cardPaymentForm.destinationInstrumentId)
    ? cardPaymentForm.destinationInstrumentId
    : creditCardInstruments[0]?.id ?? 0
  const selectedCardPaymentCard = creditCardInstruments.find(
    (instrument) => instrument.id === selectedCardPaymentCardId,
  ) ?? null
  const compatibleCardPaymentSources = useMemo(
    () => cardPaymentSourceInstruments.filter(
      (instrument) => selectedCardPaymentCard === null
        || instrument.currencyId === selectedCardPaymentCard.currencyId,
    ),
    [cardPaymentSourceInstruments, selectedCardPaymentCard],
  )
  const selectedCardPaymentSourceId = cardPaymentForm.sourceInstrumentId
    && compatibleCardPaymentSources.some((instrument) => instrument.id === cardPaymentForm.sourceInstrumentId)
    ? cardPaymentForm.sourceInstrumentId
    : compatibleCardPaymentSources[0]?.id ?? 0

  const transactionSubcategoryOptions = useMemo(() => {
    if (!selectedTransactionCategoryId) {
      return []
    }

    return categories.find((category) => category.id === selectedTransactionCategoryId)?.subcategories ?? []
  }, [categories, selectedTransactionCategoryId])

  const loadTransactions = async (
    filters: TransactionFilters = transactionFilters,
    page = transactionPagination.page,
  ): Promise<void> => {
    const requestId = transactionRequestIdRef.current + 1
    transactionRequestIdRef.current = requestId
    setIsTransactionsLoading(true)
    setTransactionError('')

    const result = await apiClient.getTransactionsPage(filters, page)

    if (requestId !== transactionRequestIdRef.current) {
      return
    }

    if (!result.success) {
      setTransactionError(result.error ?? 'No se pudieron cargar las transacciones.')
      setIsTransactionsLoading(false)
      return
    }

    const transactionPage = result.data
    setTransactions(transactionPage?.transactions ?? [])
    setActiveMsiTransactions(transactionPage?.activeMsiTransactions ?? [])
    setTransactionPagination({
      page: transactionPage?.page ?? page,
      pageSize: transactionPage?.pageSize ?? 10,
      total: transactionPage?.total ?? 0,
      totalPages: transactionPage?.totalPages ?? 1,
    })
    setIsTransactionsLoading(false)
  }

  const handleCardPaymentDestinationChange = (cardId: number): void => {
    const card = creditCardInstruments.find((instrument) => instrument.id === cardId) ?? null
    const nextSources = cardPaymentSourceInstruments.filter(
      (instrument) => card === null || instrument.currencyId === card.currencyId,
    )
    setCardPaymentForm((previous) => ({
      ...previous,
      destinationInstrumentId: cardId,
      sourceInstrumentId: nextSources[0]?.id ?? 0,
      currencyId: card?.currencyId ?? EMPTY_TRANSFER_FORM.currencyId,
    }))
  }

  const resetCardPaymentForm = (): void => {
    const card = creditCardInstruments[0] ?? null
    const source = cardPaymentSourceInstruments.find(
      (instrument) => card === null || instrument.currencyId === card.currencyId,
    )
    setCardPaymentForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: source?.id ?? 0,
      destinationInstrumentId: card?.id ?? 0,
      currencyId: card?.currencyId ?? EMPTY_TRANSFER_FORM.currencyId,
      type: 'card_payment',
    })
  }

  const handleCardPaymentSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setCardPaymentError('')
    setCardPaymentMessage('')

    const payload: TransferInput = {
      ...cardPaymentForm,
      sourceInstrumentId: selectedCardPaymentSourceId,
      destinationInstrumentId: selectedCardPaymentCardId,
      currencyId: selectedCardPaymentCard?.currencyId ?? cardPaymentForm.currencyId,
      type: 'card_payment',
      statementId: null,
      loanId: null,
      description: cardPaymentForm.description.trim()
        || `Abono a ${selectedCardPaymentCard?.name ?? 'tarjeta'}`,
      notes: cardPaymentForm.notes.trim(),
    }

    if (payload.sourceInstrumentId < 1 || payload.destinationInstrumentId < 1) {
      setCardPaymentError('Selecciona una cuenta de débito y una tarjeta de crédito.')
      return
    }
    if (payload.amount <= 0 || !payload.transferDate) {
      setCardPaymentError('Captura un monto de abono y una fecha válidos.')
      return
    }

    const result = await apiClient.createTransfer(payload)
    if (!result.success) {
      setCardPaymentError(result.error ?? 'No se pudo registrar el abono.')
      return
    }

    setCardPaymentMessage('Abono registrado y aplicado a la tarjeta.')
    resetCardPaymentForm()
    await Promise.all([loadInstruments(), loadTransactions()])
  }

  const resetTransactionForm = (): void => {
    setEditingTransactionId(null)
    setExcludeFromBalance(false)
    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: instruments[0]?.id ?? 0,
      categoryId: null,
    })
  }

  const startTransactionEdit = (transaction: Transaction): void => {
    setEditingTransactionId(transaction.id)
    setExcludeFromBalance(!transaction.affectsBalance || isExcludedByNotes(transaction.notes))
    setTransactionForm({
      instrumentId: transaction.instrumentId,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId,
      currencyId: transaction.currencyId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description ?? '',
      transactionDate: transaction.transactionDate,
      notes: stripNoBalancePrefix(transaction.notes ?? ''),
      isMsi: transaction.isMsi,
      msiMonths: transaction.msiMonths,
      affectsBalance: transaction.affectsBalance,
    })
  }

  const handleTransactionTypeChange = (nextType: TransactionType): void => {
    setTransactionForm((previous) => ({
      ...previous,
      type: nextType,
      categoryId: null,
      subcategoryId: null,
      isMsi: nextType === 'expense' ? previous.isMsi : false,
      msiMonths: nextType === 'expense' ? previous.msiMonths : null,
    }))

    if (nextType !== 'expense') {
      setExcludeFromBalance(false)
    }
  }

  const handleTransactionSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setTransactionError('')
    setTransactionMessage('')

    const canExcludeFromBalance = transactionForm.type === 'expense' && selectedTransactionInstrument?.type === 'credit_card'

    const payload: TransactionInput = {
      ...transactionForm,
      instrumentId: selectedTransactionInstrumentId,
      categoryId: selectedTransactionCategoryId,
      subcategoryId: transactionForm.subcategoryId,
      description: transactionForm.description.trim(),
      notes: buildNotesWithBalanceFlag(transactionForm.notes, false),
      affectsBalance: !(canExcludeFromBalance && excludeFromBalance),
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
    await loadTransactions(transactionFilters, 1)
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
    clearTransactionSearchTimeout()
    await loadTransactions(transactionFilters, 1)
  }

  const clearTransactionFilters = async (): Promise<void> => {
    clearTransactionSearchTimeout()
    setTransactionFilters(EMPTY_TRANSACTION_FILTERS)
    await loadTransactions(EMPTY_TRANSACTION_FILTERS, 1)
  }

  const handleTransactionSearchChange = (search: string): void => {
    const nextFilters: TransactionFilters = { ...transactionFilters, search }
    setTransactionFilters(nextFilters)
    clearTransactionSearchTimeout()
    transactionSearchTimeoutRef.current = setTimeout(() => {
      transactionSearchTimeoutRef.current = null
      void loadTransactions(nextFilters, 1)
    }, TRANSACTION_SEARCH_DEBOUNCE_MS)
  }

  const setShowAutoAdjustmentsOnly = (nextValue: boolean): void => {
    clearTransactionSearchTimeout()
    const nextFilters: TransactionFilters = {
      ...transactionFilters,
      autoAdjustmentsOnly: nextValue || undefined,
    }
    setTransactionFilters(nextFilters)
    void loadTransactions(nextFilters, 1)
  }

  const changeTransactionPage = (page: number): void => {
    clearTransactionSearchTimeout()
    void loadTransactions(transactionFilters, page)
  }

  return {
    transactions,
    isTransactionsLoading,
    transactionMessage,
    transactionError,
    transactionForm,
    editingTransactionId,
    cardPaymentForm,
    cardPaymentMessage,
    cardPaymentError,
    creditCardInstruments,
    compatibleCardPaymentSources,
    selectedCardPaymentCardId,
    selectedCardPaymentSourceId,
    transactionFilters,
    selectedTransactionInstrumentId,
    selectedTransactionCategoryId,
    selectedTransactionInstrument,
    transactionSubcategoryOptions,
    activeMsiTransactions,
    showAutoAdjustmentsOnly: transactionFilters.autoAdjustmentsOnly ?? false,
    transactionPagination,
    excludeFromBalance,
    setTransactionForm,
    setExcludeFromBalance,
    setTransactionFilters,
    handleTransactionSearchChange,
    setShowAutoAdjustmentsOnly,
    loadTransactions,
    setCardPaymentForm,
    handleCardPaymentDestinationChange,
    handleCardPaymentSubmit,
    resetCardPaymentForm,
    startTransactionEdit,
    resetTransactionForm,
    handleTransactionTypeChange,
    handleTransactionSubmit,
    handleTransactionDelete,
    handleTransactionFiltersSubmit,
    clearTransactionFilters,
    changeTransactionPage,
  }
}
