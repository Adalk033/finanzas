import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_TRANSACTION_FORM } from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  ReconciliationInput,
  Transaction,
  TransactionInput,
} from '../types/domain'

type UseDebitCardsControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
  loadInstruments: () => Promise<void>
}

export function useDebitCardsController({
  instruments,
  categories,
  loadInstruments,
}: UseDebitCardsControllerParams) {
  const [selectedDebitCardId, setSelectedDebitCardId] = useState(0)
  const [debitCardMovements, setDebitCardMovements] = useState<Transaction[]>([])
  const [isDebitCardMovementsLoading, setIsDebitCardMovementsLoading] = useState(false)
  const [debitCardMessage, setDebitCardMessage] = useState('')
  const [debitCardError, setDebitCardError] = useState('')
  const [debitCardMovementForm, setDebitCardMovementForm] = useState<TransactionInput>(
    EMPTY_TRANSACTION_FORM,
  )

  const debitCardInstruments = useMemo(
    () => instruments.filter((instrument) => instrument.type === 'debit_card' && instrument.isActive),
    [instruments],
  )
  const resolvedSelectedDebitCardId = selectedDebitCardId || debitCardInstruments[0]?.id || 0
  const selectedDebitCard = debitCardInstruments.find(
    (card) => card.id === resolvedSelectedDebitCardId,
  ) ?? null
  const debitCardMovementCategories = useMemo(() => {
    return categories.filter((category) => (
      category.isActive
      && (category.type === 'both' || category.type === debitCardMovementForm.type)
    ))
  }, [categories, debitCardMovementForm.type])
  const debitCardMovementSubcategories = useMemo(() => {
    return debitCardMovementCategories.find(
      (category) => category.id === debitCardMovementForm.categoryId,
    )?.subcategories.filter((subcategory) => subcategory.isActive) ?? []
  }, [debitCardMovementCategories, debitCardMovementForm.categoryId])

  const loadDebitCardMovements = async (cardId = resolvedSelectedDebitCardId): Promise<void> => {
    if (cardId < 1) {
      setDebitCardMovements([])
      return
    }

    setIsDebitCardMovementsLoading(true)
    setDebitCardError('')
    const result = await apiClient.getTransactions({ instrumentId: cardId })
    if (!result.success) {
      setDebitCardError(result.error ?? 'No se pudieron cargar los movimientos de la tarjeta.')
    } else {
      setDebitCardMovements(result.data ?? [])
    }
    setIsDebitCardMovementsLoading(false)
  }

  useEffect(() => {
    if (resolvedSelectedDebitCardId < 1) {
      return
    }
    let isCurrent = true
    void apiClient.getTransactions({ instrumentId: resolvedSelectedDebitCardId }).then((result) => {
      if (!isCurrent) return
      if (result.success) {
        setDebitCardMovements(result.data ?? [])
      } else {
        setDebitCardError(result.error ?? 'No se pudieron cargar los movimientos de la tarjeta.')
      }
      setIsDebitCardMovementsLoading(false)
    })
    return () => {
      isCurrent = false
    }
  }, [resolvedSelectedDebitCardId])

  const selectDebitCard = (cardId: number): void => {
    const card = debitCardInstruments.find((item) => item.id === cardId) ?? null
    setSelectedDebitCardId(cardId)
    setDebitCardMovements([])
    setIsDebitCardMovementsLoading(true)
    setDebitCardError('')
    setDebitCardMessage('')
    setDebitCardMovementForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: cardId,
      currencyId: card?.currencyId ?? EMPTY_TRANSACTION_FORM.currencyId,
    })
  }

  const resetDebitCardMovementForm = (): void => {
    setDebitCardMovementForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: resolvedSelectedDebitCardId,
      currencyId: selectedDebitCard?.currencyId ?? EMPTY_TRANSACTION_FORM.currencyId,
    })
  }

  const handleDebitCardMovementSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ): Promise<boolean> => {
    event.preventDefault()
    if (selectedDebitCard === null) {
      setDebitCardError('Selecciona una tarjeta de débito.')
      return false
    }

    setDebitCardError('')
    setDebitCardMessage('')
    const payload: TransactionInput = {
      ...debitCardMovementForm,
      instrumentId: selectedDebitCard.id,
      currencyId: selectedDebitCard.currencyId,
      categoryId: debitCardMovementForm.categoryId,
      subcategoryId: debitCardMovementForm.subcategoryId,
      type: debitCardMovementForm.type,
      description: debitCardMovementForm.description.trim(),
      notes: debitCardMovementForm.notes.trim(),
      isMsi: false,
      msiMonths: null,
      affectsBalance: true,
    }
    if (payload.amount <= 0) {
      setDebitCardError('Ingresa un monto mayor a cero.')
      return false
    }
    if (!payload.transactionDate) {
      setDebitCardError('Selecciona una fecha válida.')
      return false
    }

    const result = await apiClient.createTransaction(payload)
    if (!result.success) {
      setDebitCardError(result.error ?? 'No se pudo registrar el movimiento.')
      return false
    }

    setDebitCardMessage(payload.type === 'income'
      ? 'Ingreso registrado correctamente.'
      : 'Gasto registrado correctamente.')
    resetDebitCardMovementForm()
    await Promise.all([loadInstruments(), loadDebitCardMovements(selectedDebitCard.id)])
    return true
  }

  const reconcileDebitCard = async (payload: ReconciliationInput): Promise<boolean> => {
    if (resolvedSelectedDebitCardId < 1) {
      setDebitCardError('Selecciona una tarjeta de débito.')
      return false
    }

    setDebitCardError('')
    setDebitCardMessage('')
    const result = await apiClient.reconcileInstrument(resolvedSelectedDebitCardId, payload)
    if (!result.success) {
      setDebitCardError(result.error ?? 'No se pudo conciliar el saldo de la tarjeta.')
      return false
    }

    setDebitCardMessage('Saldo conciliado mediante un ajuste auditable.')
    await Promise.all([loadInstruments(), loadDebitCardMovements(resolvedSelectedDebitCardId)])
    return true
  }

  return {
    selectedDebitCardId: resolvedSelectedDebitCardId,
    selectedDebitCard,
    debitCardInstruments,
    debitCardMovements,
    isDebitCardMovementsLoading,
    debitCardMessage,
    debitCardError,
    debitCardMovementForm,
    debitCardMovementCategories,
    debitCardMovementSubcategories,
    selectDebitCard,
    setDebitCardMovementForm,
    resetDebitCardMovementForm,
    handleDebitCardMovementSubmit,
    loadDebitCardMovements,
    reconcileDebitCard,
  }
}
