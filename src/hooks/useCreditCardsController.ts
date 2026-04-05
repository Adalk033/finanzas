import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import {
  EMPTY_STATEMENT_FORM,
  EMPTY_STATEMENT_UPDATE_FORM,
  EMPTY_TRANSFER_FORM,
} from '../app/appHelpers'
import type {
  CreditCardStatement,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  Transaction,
  Transfer,
  TransferInput,
  TransferType,
} from '../types/domain'

type UseCreditCardsControllerParams = {
  instruments: FinancialInstrument[]
  loadInstruments: () => Promise<void>
}

export function useCreditCardsController({
  instruments,
  loadInstruments,
}: UseCreditCardsControllerParams) {
  const [statements, setStatements] = useState<CreditCardStatement[]>([])
  const [isStatementsLoading, setIsStatementsLoading] = useState(false)
  const [statementMessage, setStatementMessage] = useState('')
  const [statementError, setStatementError] = useState('')
  const [statementForm, setStatementForm] = useState<CreditCardStatementInput>(EMPTY_STATEMENT_FORM)
  const [editingStatementId, setEditingStatementId] = useState<number | null>(null)
  const [statementUpdateForm, setStatementUpdateForm] = useState<CreditCardStatementUpdateInput>(EMPTY_STATEMENT_UPDATE_FORM)

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [isTransfersLoading, setIsTransfersLoading] = useState(false)
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferForm, setTransferForm] = useState<TransferInput>(EMPTY_TRANSFER_FORM)
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null)

  const [selectedStatementDetail, setSelectedStatementDetail] = useState<CreditCardStatement | null>(null)
  const [statementMovements, setStatementMovements] = useState<Transaction[]>([])
  const [isStatementMovementsLoading, setIsStatementMovementsLoading] = useState(false)

  const creditCardInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type === 'credit_card' && instrument.isActive)
  }, [instruments])

  const sourceTransferInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type !== 'credit_card' && instrument.isActive)
  }, [instruments])

  const selectedStatementInstrumentId = statementForm.instrumentId === 0 ? (creditCardInstruments[0]?.id ?? 0) : statementForm.instrumentId
  const selectedTransferSourceInstrumentId = transferForm.sourceInstrumentId === 0 ? (sourceTransferInstruments[0]?.id ?? 0) : transferForm.sourceInstrumentId
  const selectedTransferDestinationInstrumentId = transferForm.destinationInstrumentId === 0 ? (creditCardInstruments[0]?.id ?? 0) : transferForm.destinationInstrumentId
  const selectedTransferType = transferForm.type
  const selectedTransferStatementId = transferForm.statementId

  const availableTransferDestinations = useMemo(() => {
    const sourceId = selectedTransferSourceInstrumentId

    if (selectedTransferType === 'card_payment') {
      return creditCardInstruments.filter((instrument) => instrument.id !== sourceId)
    }

    if (selectedTransferType === 'inter_account') {
      return sourceTransferInstruments.filter((instrument) => instrument.id !== sourceId)
    }

    return instruments.filter((instrument) => instrument.id !== sourceId)
  }, [creditCardInstruments, instruments, selectedTransferSourceInstrumentId, selectedTransferType, sourceTransferInstruments])

  const totalCreditCardDebt = useMemo(() => {
    return creditCardInstruments.reduce((accumulator, instrument) => accumulator + (instrument.currentBalance ?? 0), 0)
  }, [creditCardInstruments])

  const totalAvailableCredit = useMemo(() => {
    return creditCardInstruments.reduce((accumulator, instrument) => {
      return accumulator + ((instrument.creditLimit ?? 0) - (instrument.currentBalance ?? 0))
    }, 0)
  }, [creditCardInstruments])

  const availableStatementsForDestination = useMemo(() => {
    if (selectedTransferType !== 'card_payment') {
      return []
    }

    return statements.filter((statement) => statement.instrumentId === selectedTransferDestinationInstrumentId)
  }, [selectedTransferDestinationInstrumentId, selectedTransferType, statements])

  const loadStatements = async (): Promise<void> => {
    setIsStatementsLoading(true)
    setStatementError('')

    const result = await apiClient.getStatements()

    if (!result.success) {
      setStatementError(result.error ?? 'No se pudieron cargar los estados de cuenta.')
      setIsStatementsLoading(false)
      return
    }

    setStatements(result.data ?? [])
    setIsStatementsLoading(false)
  }

  const loadTransfers = async (): Promise<void> => {
    setIsTransfersLoading(true)
    setTransferError('')

    const result = await apiClient.getTransfers()

    if (!result.success) {
      setTransferError(result.error ?? 'No se pudieron cargar las transferencias.')
      setIsTransfersLoading(false)
      return
    }

    setTransfers(result.data ?? [])
    setIsTransfersLoading(false)
  }

  const loadStatementMovements = async (statement: CreditCardStatement): Promise<void> => {
    setIsStatementMovementsLoading(true)
    setStatementError('')

    const result = await apiClient.getStatementMovements(statement.id)

    if (!result.success) {
      setStatementError(result.error ?? 'No se pudo cargar el detalle de movimientos del estado de cuenta.')
      setIsStatementMovementsLoading(false)
      return
    }

    setSelectedStatementDetail(statement)
    setStatementMovements(result.data ?? [])
    setIsStatementMovementsLoading(false)
  }

  const resetStatementForm = (): void => {
    setStatementForm({
      ...EMPTY_STATEMENT_FORM,
      instrumentId: creditCardInstruments[0]?.id ?? 0,
    })
  }

  const resetStatementUpdateForm = (): void => {
    setEditingStatementId(null)
    setStatementUpdateForm(EMPTY_STATEMENT_UPDATE_FORM)
  }

  const handleStatementSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setStatementError('')
    setStatementMessage('')

    const payload: CreditCardStatementInput = {
      ...statementForm,
      instrumentId: selectedStatementInstrumentId,
      paymentDueDate: statementForm.paymentDueDate.trim(),
    }

    if (payload.instrumentId < 1) {
      setStatementError('Selecciona una tarjeta de credito valida.')
      return
    }

    if (!payload.cutOffDate) {
      setStatementError('Selecciona una fecha de corte valida.')
      return
    }

    const created = await apiClient.createStatement(payload)

    if (!created.success) {
      setStatementError(created.error ?? 'No se pudo crear el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta creado correctamente.')
    resetStatementForm()
    await loadStatements()
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

  const handleStatementUpdate = async (): Promise<void> => {
    if (editingStatementId === null) {
      return
    }

    setStatementError('')
    setStatementMessage('')

    const updated = await apiClient.updateStatement(editingStatementId, statementUpdateForm)

    if (!updated.success) {
      setStatementError(updated.error ?? 'No se pudo actualizar el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta actualizado correctamente.')
    resetStatementUpdateForm()
    await loadStatements()
  }

  const handleStatementDelete = async (id: number): Promise<void> => {
    setStatementError('')
    setStatementMessage('')

    const deleted = await apiClient.deleteStatement(id)

    if (!deleted.success) {
      setStatementError(deleted.error ?? 'No se pudo eliminar el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta eliminado correctamente.')
    if (editingStatementId === id) {
      resetStatementUpdateForm()
    }
    await loadStatements()
  }

  const resetTransferForm = (): void => {
    setEditingTransferId(null)
    setTransferForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: sourceTransferInstruments[0]?.id ?? 0,
      destinationInstrumentId: creditCardInstruments[0]?.id ?? 0,
      statementId: null,
    })
  }

  const handleTransferTypeChange = (nextType: TransferType): void => {
    setTransferForm((previous) => ({
      ...previous,
      type: nextType,
      statementId: nextType === 'card_payment' ? previous.statementId : null,
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
      type: transfer.type,
      statementId: transfer.statementId,
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
      statementId: selectedTransferType === 'card_payment' ? (selectedTransferStatementId ?? null) : null,
      description: transferForm.description.trim(),
      notes: transferForm.notes.trim(),
    }

    if (payload.sourceInstrumentId < 1 || payload.destinationInstrumentId < 1) {
      setTransferError('Selecciona instrumentos validos para la transferencia.')
      return
    }

    if (payload.sourceInstrumentId === payload.destinationInstrumentId) {
      setTransferError('El origen y destino deben ser distintos.')
      return
    }

    if (payload.amount <= 0) {
      setTransferError('Ingresa un monto mayor a cero.')
      return
    }

    if (editingTransferId !== null) {
      const updated = await apiClient.updateTransfer(editingTransferId, payload)

      if (!updated.success) {
        setTransferError(updated.error ?? 'No se pudo actualizar la transferencia.')
        return
      }

      setTransferMessage('Transferencia actualizada correctamente.')
      resetTransferForm()
      await loadInstruments()
      await loadStatements()
      await loadTransfers()
      return
    }

    const created = await apiClient.createTransfer(payload)

    if (!created.success) {
      setTransferError(created.error ?? 'No se pudo crear la transferencia.')
      return
    }

    setTransferMessage('Transferencia registrada correctamente.')
    resetTransferForm()
    await loadInstruments()
    await loadStatements()
    await loadTransfers()
  }

  const handleTransferDelete = async (id: number): Promise<void> => {
    setTransferError('')
    setTransferMessage('')

    const deleted = await apiClient.deleteTransfer(id)

    if (!deleted.success) {
      setTransferError(deleted.error ?? 'No se pudo eliminar la transferencia.')
      return
    }

    setTransferMessage('Transferencia eliminada correctamente.')
    if (editingTransferId === id) {
      resetTransferForm()
    }
    await loadInstruments()
    await loadStatements()
    await loadTransfers()
  }

  return {
    statements,
    isStatementsLoading,
    statementMessage,
    statementError,
    statementForm,
    editingStatementId,
    statementUpdateForm,
    transfers,
    isTransfersLoading,
    transferMessage,
    transferError,
    transferForm,
    editingTransferId,
    selectedTransferStatementId,
    availableStatementsForDestination,
    selectedStatementDetail,
    statementMovements,
    isStatementMovementsLoading,
    creditCardInstruments,
    sourceTransferInstruments,
    availableTransferDestinations,
    totalCreditCardDebt,
    totalAvailableCredit,
    selectedStatementInstrumentId,
    selectedTransferSourceInstrumentId,
    selectedTransferDestinationInstrumentId,
    setStatementForm,
    setStatementUpdateForm,
    setTransferForm,
    loadStatements,
    loadTransfers,
    loadStatementMovements,
    resetStatementForm,
    resetStatementUpdateForm,
    handleStatementSubmit,
    startStatementEdit,
    handleStatementUpdate,
    handleStatementDelete,
    resetTransferForm,
    handleTransferTypeChange,
    startTransferEdit,
    handleTransferSubmit,
    handleTransferDelete,
  }
}
