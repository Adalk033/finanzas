import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_STATEMENT_UPDATE_FORM,
  EMPTY_TRANSACTION_FORM,
  EMPTY_TRANSFER_FORM,
} from '../app/appHelpers'
import type {
  Category,
  CreditCardStatement,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  Transaction,
  TransactionInput,
  Transfer,
  TransferInput,
  TransferType,
} from '../types/domain'

type UseCreditCardsControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
  loadInstruments: () => Promise<void>
}

export function useCreditCardsController({
  instruments,
  categories,
  loadInstruments,
}: UseCreditCardsControllerParams) {
  const [selectedCardId, setSelectedCardId] = useState(0)
  const [statements, setStatements] = useState<CreditCardStatement[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [cardMovements, setCardMovements] = useState<Transaction[]>([])
  const [isStatementsLoading, setIsStatementsLoading] = useState(false)
  const [isTransfersLoading, setIsTransfersLoading] = useState(false)
  const [isCardMovementsLoading, setIsCardMovementsLoading] = useState(false)
  const [statementMessage, setStatementMessage] = useState('')
  const [statementError, setStatementError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const [purchaseForm, setPurchaseForm] = useState<TransactionInput>(EMPTY_TRANSACTION_FORM)
  const [cardPaymentForm, setCardPaymentForm] = useState<TransferInput>(EMPTY_TRANSFER_FORM)
  const [editingStatementId, setEditingStatementId] = useState<number | null>(null)
  const [statementUpdateForm, setStatementUpdateForm] = useState<CreditCardStatementUpdateInput>(
    EMPTY_STATEMENT_UPDATE_FORM,
  )
  const [selectedStatementDetail, setSelectedStatementDetail] = useState<CreditCardStatement | null>(null)
  const [statementMovements, setStatementMovements] = useState<Transaction[]>([])
  const [isStatementMovementsLoading, setIsStatementMovementsLoading] = useState(false)

  const [transferForm, setTransferForm] = useState<TransferInput>({
    ...EMPTY_TRANSFER_FORM,
    type: 'inter_account',
  })
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null)
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState('')

  const creditCardInstruments = useMemo(
    () => instruments.filter((instrument) => instrument.type === 'credit_card' && instrument.isActive),
    [instruments],
  )
  const sourceTransferInstruments = useMemo(
    () => instruments.filter(
      (instrument) => (instrument.type === 'account' || instrument.type === 'debit_card') && instrument.isActive,
    ),
    [instruments],
  )
  const resolvedSelectedCardId = selectedCardId || creditCardInstruments[0]?.id || 0
  const selectedCard = creditCardInstruments.find((card) => card.id === resolvedSelectedCardId) ?? null
  const paymentSourceInstruments = useMemo(
    () => sourceTransferInstruments.filter(
      (instrument) => selectedCard === null || instrument.currencyId === selectedCard.currencyId,
    ),
    [selectedCard, sourceTransferInstruments],
  )
  const selectedPaymentSourceId = cardPaymentForm.sourceInstrumentId
    && paymentSourceInstruments.some((instrument) => instrument.id === cardPaymentForm.sourceInstrumentId)
    ? cardPaymentForm.sourceInstrumentId
    : paymentSourceInstruments[0]?.id || 0
  const selectedTransferSourceInstrumentId = transferForm.sourceInstrumentId || sourceTransferInstruments[0]?.id || 0
  const selectedTransferDestinationInstrumentId = transferForm.destinationInstrumentId
    || sourceTransferInstruments.find((instrument) => instrument.id !== selectedTransferSourceInstrumentId)?.id
    || 0

  const purchaseCategoryOptions = useMemo(
    () => categories.filter(
      (category) => category.isActive && (category.type === 'expense' || category.type === 'both'),
    ),
    [categories],
  )
  const purchaseSubcategoryOptions = useMemo(() => {
    return purchaseCategoryOptions.find((category) => category.id === purchaseForm.categoryId)?.subcategories
      .filter((subcategory) => subcategory.isActive) ?? []
  }, [purchaseCategoryOptions, purchaseForm.categoryId])

  const selectedCardStatements = useMemo(
    () => statements
      .filter((statement) => statement.instrumentId === resolvedSelectedCardId)
      .sort((a, b) => b.cutOffDate.localeCompare(a.cutOffDate)),
    [resolvedSelectedCardId, statements],
  )
  const currentStatement = useMemo(() => {
    const pending = selectedCardStatements
      .filter((statement) => !statement.isPaid && statement.outstandingAmount > 0)
      .sort((a, b) => a.paymentDueDate.localeCompare(b.paymentDueDate))
    return pending[0] ?? selectedCardStatements[0] ?? null
  }, [selectedCardStatements])
  const selectedCardPayments = useMemo(
    () => transfers
      .filter(
        (transfer) => transfer.type === 'card_payment'
          && transfer.destinationInstrumentId === resolvedSelectedCardId,
      )
      .sort((a, b) => b.transferDate.localeCompare(a.transferDate)),
    [resolvedSelectedCardId, transfers],
  )
  const activeMsiPurchases = useMemo(
    () => cardMovements.filter(
      (movement) => movement.isMsi && (movement.msiRemaining ?? movement.msiMonths ?? 0) > 0,
    ),
    [cardMovements],
  )

  const availableTransferDestinations = useMemo(() => {
    return sourceTransferInstruments.filter(
      (instrument) => instrument.id !== selectedTransferSourceInstrumentId,
    )
  }, [selectedTransferSourceInstrumentId, sourceTransferInstruments])

  const loadStatements = async (): Promise<void> => {
    setIsStatementsLoading(true)
    setStatementError('')
    const result = await apiClient.getStatements()
    if (!result.success) {
      setStatementError(result.error ?? 'No se pudieron cargar los estados de cuenta.')
    } else {
      setStatements(result.data ?? [])
    }
    setIsStatementsLoading(false)
  }

  const loadTransfers = async (): Promise<void> => {
    setIsTransfersLoading(true)
    setTransferError('')
    const result = await apiClient.getTransfers()
    if (!result.success) {
      setTransferError(result.error ?? 'No se pudieron cargar las transferencias.')
    } else {
      setTransfers(result.data ?? [])
    }
    setIsTransfersLoading(false)
  }

  const loadCardMovements = async (cardId = resolvedSelectedCardId): Promise<void> => {
    if (cardId < 1) {
      setCardMovements([])
      return
    }
    setIsCardMovementsLoading(true)
    const result = await apiClient.getTransactions({ instrumentId: cardId })
    if (!result.success) {
      setActionError(result.error ?? 'No se pudieron cargar los movimientos de la tarjeta.')
    } else {
      setCardMovements(result.data ?? [])
    }
    setIsCardMovementsLoading(false)
  }

  useEffect(() => {
    if (resolvedSelectedCardId < 1) {
      return
    }
    let active = true
    void apiClient.getTransactions({ instrumentId: resolvedSelectedCardId }).then((result) => {
      if (!active) return
      if (result.success) {
        setCardMovements(result.data ?? [])
      } else {
        setActionError(result.error ?? 'No se pudieron cargar los movimientos de la tarjeta.')
      }
    })
    return () => {
      active = false
    }
  }, [resolvedSelectedCardId])

  const selectCard = (cardId: number): void => {
    const nextCard = creditCardInstruments.find((card) => card.id === cardId) ?? null
    const nextPaymentSources = sourceTransferInstruments.filter(
      (instrument) => nextCard === null || instrument.currencyId === nextCard.currencyId,
    )
    setSelectedCardId(cardId)
    setActionError('')
    setActionMessage('')
    setPurchaseForm({ ...EMPTY_TRANSACTION_FORM, instrumentId: cardId })
    setCardPaymentForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: nextPaymentSources[0]?.id ?? 0,
      destinationInstrumentId: cardId,
      currencyId: nextCard?.currencyId ?? EMPTY_TRANSFER_FORM.currencyId,
      type: 'card_payment',
    })
    setSelectedStatementDetail(null)
    setStatementMovements([])
  }

  const resetPurchaseForm = (): void => {
    setPurchaseForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: resolvedSelectedCardId,
    })
  }

  const handlePurchaseSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setActionError('')
    setActionMessage('')
    const payload: TransactionInput = {
      ...purchaseForm,
      instrumentId: resolvedSelectedCardId,
      type: 'expense',
      description: purchaseForm.description.trim(),
      notes: purchaseForm.notes.trim(),
      msiMonths: purchaseForm.isMsi ? purchaseForm.msiMonths : null,
    }
    if (payload.instrumentId < 1) {
      setActionError('Selecciona una tarjeta.')
      return
    }
    if (payload.amount <= 0 || !payload.transactionDate) {
      setActionError('Captura un monto y una fecha válidos.')
      return
    }
    if (payload.isMsi && !payload.msiMonths) {
      setActionError('Selecciona el plazo de la compra a MSI.')
      return
    }
    const result = await apiClient.createTransaction(payload)
    if (!result.success) {
      setActionError(result.error ?? 'No se pudo registrar la compra.')
      return
    }
    setActionMessage('Compra registrada correctamente.')
    resetPurchaseForm()
    await Promise.all([loadInstruments(), loadStatements(), loadCardMovements(payload.instrumentId)])
  }

  const setPaymentAmount = (amount: number | null): void => {
    if (amount === null || amount <= 0) return
    setCardPaymentForm((previous) => ({ ...previous, amount }))
  }

  const resetCardPaymentForm = (): void => {
    setCardPaymentForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: paymentSourceInstruments[0]?.id ?? 0,
      destinationInstrumentId: resolvedSelectedCardId,
      currencyId: selectedCard?.currencyId ?? EMPTY_TRANSFER_FORM.currencyId,
      type: 'card_payment',
    })
  }

  const handleCardPaymentSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setActionError('')
    setActionMessage('')
    const payload: TransferInput = {
      ...cardPaymentForm,
      sourceInstrumentId: selectedPaymentSourceId,
      destinationInstrumentId: resolvedSelectedCardId,
      currencyId: selectedCard?.currencyId ?? cardPaymentForm.currencyId,
      type: 'card_payment',
      statementId: null,
      loanId: null,
      description: cardPaymentForm.description.trim() || `Abono a ${selectedCard?.name ?? 'tarjeta'}`,
      notes: cardPaymentForm.notes.trim(),
    }
    if (payload.sourceInstrumentId < 1 || payload.destinationInstrumentId < 1) {
      setActionError('Selecciona la cuenta de débito desde la que realizarás el abono.')
      return
    }
    if (payload.amount <= 0 || !payload.transferDate) {
      setActionError('Captura un monto de abono y una fecha válidos.')
      return
    }
    const result = await apiClient.createTransfer(payload)
    if (!result.success) {
      setActionError(result.error ?? 'No se pudo registrar el abono.')
      return
    }
    setActionMessage('Abono registrado y aplicado a la tarjeta.')
    resetCardPaymentForm()
    await Promise.all([loadInstruments(), loadStatements(), loadTransfers()])
  }

  const loadStatementMovements = async (statement: CreditCardStatement): Promise<void> => {
    setIsStatementMovementsLoading(true)
    setStatementError('')
    const result = await apiClient.getStatementMovements(statement.id)
    if (!result.success) {
      setStatementError(result.error ?? 'No se pudo cargar el detalle del estado.')
    } else {
      setSelectedStatementDetail(statement)
      setStatementMovements(result.data ?? [])
    }
    setIsStatementMovementsLoading(false)
  }

  const startStatementEdit = (statement: CreditCardStatement): void => {
    setEditingStatementId(statement.id)
    setStatementUpdateForm({
      paymentDueDate: statement.paymentDueDate,
      minimumPayment: statement.minimumPayment,
      noInterestPayment: statement.noInterestPayment,
      isPaid: statement.isPaid,
      paidAmount: statement.paidAmount,
      paidDate: statement.paidDate ?? '',
    })
  }

  const resetStatementUpdateForm = (): void => {
    setEditingStatementId(null)
    setStatementUpdateForm(EMPTY_STATEMENT_UPDATE_FORM)
  }

  const handleStatementUpdate = async (): Promise<void> => {
    if (editingStatementId === null) return
    setStatementError('')
    setStatementMessage('')
    const result = await apiClient.updateStatement(editingStatementId, statementUpdateForm)
    if (!result.success) {
      setStatementError(result.error ?? 'No se pudo actualizar el estado de cuenta.')
      return
    }
    setStatementMessage('Datos del estado actualizados.')
    resetStatementUpdateForm()
    await loadStatements()
  }

  const resetTransferForm = (): void => {
    const sourceId = sourceTransferInstruments[0]?.id ?? 0
    setEditingTransferId(null)
    setTransferForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: sourceId,
      destinationInstrumentId: sourceTransferInstruments.find(
        (instrument) => instrument.id !== sourceId,
      )?.id ?? 0,
      type: 'inter_account',
    })
  }

  const handleTransferTypeChange = (nextType: TransferType): void => {
    setTransferForm((previous) => ({
      ...previous,
      type: nextType === 'card_payment' ? 'inter_account' : nextType,
      statementId: null,
      loanId: nextType === 'loan_payment' ? previous.loanId : null,
    }))
  }

  const startTransferEdit = (transfer: Transfer): void => {
    setEditingTransferId(transfer.id)
    setTransferForm({
      sourceInstrumentId: transfer.sourceInstrumentId,
      destinationInstrumentId: transfer.destinationInstrumentId,
      amount: transfer.amount,
      currencyId: transfer.currencyId,
      transferDate: transfer.transferDate,
      type: transfer.type === 'card_payment' ? 'other' : transfer.type,
      statementId: null,
      loanId: transfer.loanId,
      description: transfer.description ?? '',
      notes: transfer.notes ?? '',
    })
  }

  const handleTransferSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setTransferError('')
    setTransferMessage('')
    const payload: TransferInput = {
      ...transferForm,
      sourceInstrumentId: selectedTransferSourceInstrumentId,
      destinationInstrumentId: selectedTransferDestinationInstrumentId,
      statementId: null,
      description: transferForm.description.trim(),
      notes: transferForm.notes.trim(),
    }
    if (payload.sourceInstrumentId < 1 || payload.destinationInstrumentId < 1) {
      setTransferError('Selecciona una cuenta de origen y una de destino.')
      return
    }
    if (payload.sourceInstrumentId === payload.destinationInstrumentId || payload.amount <= 0) {
      setTransferError('Elige cuentas diferentes y un monto mayor a cero.')
      return
    }
    const result = editingTransferId === null
      ? await apiClient.createTransfer(payload)
      : await apiClient.updateTransfer(editingTransferId, payload)
    if (!result.success) {
      setTransferError(result.error ?? 'No se pudo guardar la transferencia.')
      return
    }
    setTransferMessage(
      editingTransferId === null ? 'Transferencia registrada.' : 'Transferencia actualizada.',
    )
    resetTransferForm()
    await Promise.all([loadInstruments(), loadTransfers()])
  }

  const handleTransferDelete = async (id: number): Promise<void> => {
    setTransferError('')
    setTransferMessage('')
    const result = await apiClient.deleteTransfer(id)
    if (!result.success) {
      setTransferError(result.error ?? 'No se pudo eliminar la transferencia.')
      return
    }
    setTransferMessage('Transferencia eliminada y saldos revertidos.')
    if (editingTransferId === id) resetTransferForm()
    await Promise.all([loadInstruments(), loadTransfers()])
  }

  return {
    selectedCardId: resolvedSelectedCardId,
    selectedCard,
    creditCardInstruments,
    sourceTransferInstruments,
    paymentSourceInstruments,
    statements,
    selectedCardStatements,
    currentStatement,
    transfers,
    selectedCardPayments,
    cardMovements,
    activeMsiPurchases,
    isStatementsLoading,
    isTransfersLoading,
    isCardMovementsLoading,
    actionMessage,
    actionError,
    statementMessage,
    statementError,
    purchaseForm,
    purchaseCategoryOptions,
    purchaseSubcategoryOptions,
    cardPaymentForm,
    selectedPaymentSourceId,
    editingStatementId,
    statementUpdateForm,
    selectedStatementDetail,
    statementMovements,
    isStatementMovementsLoading,
    transferForm,
    editingTransferId,
    transferMessage,
    transferError,
    selectedTransferSourceInstrumentId,
    selectedTransferDestinationInstrumentId,
    availableTransferDestinations,
    selectCard,
    setPurchaseForm,
    resetPurchaseForm,
    handlePurchaseSubmit,
    setCardPaymentForm,
    setPaymentAmount,
    resetCardPaymentForm,
    handleCardPaymentSubmit,
    setStatementUpdateForm,
    loadStatements,
    loadTransfers,
    loadCardMovements,
    loadStatementMovements,
    startStatementEdit,
    resetStatementUpdateForm,
    handleStatementUpdate,
    setTransferForm,
    resetTransferForm,
    handleTransferTypeChange,
    startTransferEdit,
    handleTransferSubmit,
    handleTransferDelete,
  }
}
