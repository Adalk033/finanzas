import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_INSTRUMENT_FORM, toEditableInstrument } from '../app/appHelpers'
import type { Bank, FinancialInstrument, FinancialInstrumentInput, InstrumentType } from '../types/domain'
import type { ReconciliationInput } from '../types/domain'

export function useInstrumentsController() {
  const [instruments, setInstruments] = useState<FinancialInstrument[]>([])
  const [isInstrumentsLoading, setIsInstrumentsLoading] = useState(false)
  const [instrumentMessage, setInstrumentMessage] = useState('')
  const [instrumentError, setInstrumentError] = useState('')
  const [instrumentForm, setInstrumentForm] = useState<FinancialInstrumentInput>(EMPTY_INSTRUMENT_FORM)
  const [editingInstrumentId, setEditingInstrumentId] = useState<number | null>(null)

  const loadInstruments = async (): Promise<void> => {
    setIsInstrumentsLoading(true)
    setInstrumentError('')

    const result = await apiClient.getInstruments()

    if (!result.success) {
      setInstrumentError(result.error ?? 'No se pudo cargar instrumentos.')
      setIsInstrumentsLoading(false)
      return
    }

    setInstruments(result.data ?? [])
    setIsInstrumentsLoading(false)
  }

  const selectedBankId = instrumentForm.bankId === 0 ? 0 : instrumentForm.bankId

  const handleInstrumentTypeChange = (nextType: InstrumentType): void => {
    setInstrumentForm((previous) => ({
      ...previous,
      type: nextType,
      creditLimit: nextType === 'credit_card' ? previous.creditLimit ?? 0 : null,
      currentBalance: nextType === 'credit_card' ? previous.currentBalance ?? 0 : null,
      availableCredit: nextType === 'credit_card' ? previous.availableCredit ?? 0 : null,
      cutOffDay: nextType === 'credit_card' ? previous.cutOffDay ?? 1 : null,
      paymentDueDay: nextType === 'credit_card' ? previous.paymentDueDay ?? 1 : null,
      annualRate: nextType === 'credit_card' ? previous.annualRate : null,
      currentAmount: nextType === 'credit_card' ? null : previous.currentAmount ?? 0,
      linkedAccountId: nextType === 'debit_card' ? previous.linkedAccountId : null,
    }))
  }

  const resetInstrumentEditor = (banks: Bank[]): void => {
    const firstBankId = banks[0]?.id ?? 0
    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
      bankId: firstBankId,
    })
    setEditingInstrumentId(null)
  }

  const startInstrumentEdit = (instrument: FinancialInstrument): void => {
    setEditingInstrumentId(instrument.id)
    setInstrumentForm(toEditableInstrument(instrument))
  }

  const handleInstrumentSubmit = async (event: SyntheticEvent<HTMLFormElement>, banks: Bank[]): Promise<void> => {
    event.preventDefault()
    setInstrumentError('')
    setInstrumentMessage('')

    if (instrumentForm.bankId < 1) {
      setInstrumentError('Selecciona un banco valido.')
      return
    }

    if (instrumentForm.type === 'credit_card') {
      if (typeof instrumentForm.creditLimit !== 'number' || !Number.isFinite(instrumentForm.creditLimit) || instrumentForm.creditLimit < 0) {
        setInstrumentError('Ingresa un limite de credito valido.')
        return
      }

      if (instrumentForm.currentBalance !== null && (typeof instrumentForm.currentBalance !== 'number' || !Number.isFinite(instrumentForm.currentBalance) || instrumentForm.currentBalance < 0)) {
        setInstrumentError('Ingresa un saldo actual valido para la tarjeta.')
        return
      }

      if (
        typeof instrumentForm.cutOffDay !== 'number'
        || !Number.isInteger(instrumentForm.cutOffDay)
        || instrumentForm.cutOffDay < 1
        || instrumentForm.cutOffDay > 31
      ) {
        setInstrumentError('Ingresa un dia de corte valido (1-31).')
        return
      }

      if (
        typeof instrumentForm.paymentDueDay !== 'number'
        || !Number.isInteger(instrumentForm.paymentDueDay)
        || instrumentForm.paymentDueDay < 1
        || instrumentForm.paymentDueDay > 31
      ) {
        setInstrumentError('Ingresa un dia de pago valido (1-31).')
        return
      }
    } else if (
      typeof instrumentForm.currentAmount !== 'number'
      || !Number.isFinite(instrumentForm.currentAmount)
      || instrumentForm.currentAmount < 0
    ) {
      setInstrumentError('Ingresa un saldo actual valido.')
      return
    }

    const payload = {
      ...instrumentForm,
      name: instrumentForm.name.trim(),
    }

    if (editingInstrumentId === null) {
      const created = await apiClient.createInstrument(payload)
      if (!created.success) {
        setInstrumentError(created.error ?? 'No se pudo crear el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento creado correctamente.')
    } else {
      const updated = await apiClient.updateInstrument(editingInstrumentId, payload)
      if (!updated.success) {
        setInstrumentError(updated.error ?? 'No se pudo actualizar el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento actualizado correctamente.')
    }

    resetInstrumentEditor(banks)
    await loadInstruments()
  }

  const handleInstrumentDelete = async (id: number, banks: Bank[]): Promise<void> => {
    setInstrumentError('')
    setInstrumentMessage('')

    const deleted = await apiClient.deleteInstrument(id)

    if (!deleted.success) {
      setInstrumentError(deleted.error ?? 'No se pudo eliminar el instrumento.')
      return
    }

    setInstrumentMessage('Instrumento eliminado correctamente.')
    if (editingInstrumentId === id) {
      resetInstrumentEditor(banks)
    }
    await loadInstruments()
  }

  const handleInstrumentReconcile = async (
    id: number,
    payload: ReconciliationInput,
  ): Promise<void> => {
    setInstrumentError('')
    setInstrumentMessage('')
    const result = await apiClient.reconcileInstrument(id, payload)
    if (!result.success) {
      setInstrumentError(result.error ?? 'No se pudo conciliar el saldo.')
      return
    }
    setInstrumentMessage('Saldo conciliado mediante un ajuste auditable.')
    await loadInstruments()
  }

  const banksById = useMemo(() => {
    return (banks: Bank[]) => new Map(banks.map((bank) => [bank.id, bank]))
  }, [])

  const groupedInstrumentsByBank = useMemo(() => {
    return (banks: Bank[]) => {
      const groups = new Map<number, FinancialInstrument[]>()
      const bankMap = banksById(banks)

      for (const instrument of instruments) {
        const previous = groups.get(instrument.bankId)
        if (!previous) {
          groups.set(instrument.bankId, [instrument])
        } else {
          previous.push(instrument)
        }
      }

      return Array.from(groups.entries()).map(([bankId, list]) => ({
        bank: bankMap.get(bankId),
        instruments: list,
      }))
    }
  }, [banksById, instruments])

  return {
    instruments,
    isInstrumentsLoading,
    instrumentMessage,
    instrumentError,
    instrumentForm,
    editingInstrumentId,
    selectedBankId,
    setInstrumentForm,
    loadInstruments,
    handleInstrumentTypeChange,
    resetInstrumentEditor,
    startInstrumentEdit,
    handleInstrumentSubmit,
    handleInstrumentDelete,
    handleInstrumentReconcile,
    groupedInstrumentsByBank,
  }
}
