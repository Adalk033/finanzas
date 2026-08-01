import { useMemo, useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_LOAN_FORM, EMPTY_LOAN_PAYMENT_REGISTER } from '../app/appHelpers'
import type {
  FinancialInstrument,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentRegisterInput,
  LoanPaymentType,
} from '../types/domain'

type UseLoansControllerParams = {
  instruments: FinancialInstrument[]
}

export function useLoansController({ instruments }: UseLoansControllerParams) {
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoansLoading, setIsLoansLoading] = useState(false)
  const [loanMessage, setLoanMessage] = useState('')
  const [loanError, setLoanError] = useState('')
  const [loanForm, setLoanForm] = useState<LoanInput>(EMPTY_LOAN_FORM)
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null)
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([])
  const [isLoanPaymentsLoading, setIsLoanPaymentsLoading] = useState(false)
  const [loanPaymentRegister, setLoanPaymentRegister] = useState<LoanPaymentRegisterInput>(EMPTY_LOAN_PAYMENT_REGISTER)

  const loanPaymentInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type !== 'credit_card' && instrument.isActive)
  }, [instruments])

  const selectedLoan = useMemo(() => {
    if (!selectedLoanId) {
      return null
    }

    return loans.find((loan) => loan.id === selectedLoanId) ?? null
  }, [loans, selectedLoanId])

  const loadLoans = async (): Promise<void> => {
    setIsLoansLoading(true)
    setLoanError('')

    const result = await apiClient.getLoans()

    if (!result.success) {
      setLoanError(result.error ?? 'No se pudieron cargar los prestamos.')
      setIsLoansLoading(false)
      return
    }

    setLoans(result.data ?? [])
    setIsLoansLoading(false)
  }

  const loadLoanPayments = async (loanId: number): Promise<void> => {
    setIsLoanPaymentsLoading(true)
    setLoanError('')

    const result = await apiClient.getLoanPayments(loanId)

    if (!result.success) {
      setLoanError(result.error ?? 'No se pudo cargar la tabla de amortizacion.')
      setIsLoanPaymentsLoading(false)
      return
    }

    setSelectedLoanId(loanId)
    setLoanPayments(result.data ?? [])
    setIsLoanPaymentsLoading(false)
  }

  const resetLoanEditor = (): void => {
    setLoanForm({
      ...EMPTY_LOAN_FORM,
      instrumentId: loanPaymentInstruments[0]?.id ?? null,
    })
    setEditingLoanId(null)
  }

  const startLoanEdit = (loan: Loan): void => {
    setEditingLoanId(loan.id)
    setLoanForm({
      name: loan.name,
      lender: loan.lender ?? '',
      currencyId: loan.currencyId,
      originalAmount: loan.originalAmount,
      annualRate: loan.annualRate,
      totalInstallments: loan.totalInstallments,
      paymentType: loan.paymentType,
      fixedPayment: loan.fixedPayment,
      paymentDay: loan.paymentDay,
      paymentFrequency: loan.paymentFrequency,
      startDate: loan.startDate,
      endDate: loan.endDate ?? '',
      instrumentId: loan.instrumentId,
      affectsInstrumentBalance: loan.affectsInstrumentBalance,
      notes: loan.notes ?? '',
      isActive: loan.isActive,
    })
  }

  const handleLoanPaymentTypeChange = (nextType: LoanPaymentType): void => {
    setLoanForm((previous) => ({
      ...previous,
      paymentType: nextType,
      fixedPayment: nextType === 'fixed' ? (previous.fixedPayment ?? 0) : null,
      annualRate: nextType === 'variable' ? previous.annualRate : previous.annualRate,
    }))
  }

  const handleLoanSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setLoanError('')
    setLoanMessage('')

    if (loanForm.originalAmount <= 0) {
      setLoanError('Ingresa un monto original mayor a cero.')
      return
    }

    if (loanForm.totalInstallments < 1) {
      setLoanError('Ingresa un total de cuotas valido.')
      return
    }

    if (loanForm.paymentType === 'fixed' && (!loanForm.fixedPayment || loanForm.fixedPayment <= 0)) {
      setLoanError('Ingresa un pago fijo valido.')
      return
    }

    if (loanForm.paymentType === 'variable' && (!loanForm.annualRate || loanForm.annualRate <= 0)) {
      setLoanError('Ingresa una tasa anual valida para pago variable.')
      return
    }

    const payload: LoanInput = {
      ...loanForm,
      name: loanForm.name.trim(),
      lender: loanForm.lender.trim(),
      endDate: loanForm.endDate.trim(),
      notes: loanForm.notes.trim(),
    }

    if (editingLoanId === null) {
      const created = await apiClient.createLoan(payload)
      if (!created.success) {
        setLoanError(created.error ?? 'No se pudo crear el prestamo.')
        return
      }

      setLoanMessage('Prestamo creado correctamente.')
    } else {
      const updated = await apiClient.updateLoan(editingLoanId, payload)
      if (!updated.success) {
        setLoanError(updated.error ?? 'No se pudo actualizar el prestamo.')
        return
      }

      setLoanMessage('Prestamo actualizado correctamente.')
    }

    resetLoanEditor()
    await loadLoans()
  }

  const handleLoanDelete = async (id: number): Promise<void> => {
    setLoanError('')
    setLoanMessage('')

    const deleted = await apiClient.deleteLoan(id)
    if (!deleted.success) {
      setLoanError(deleted.error ?? 'No se pudo eliminar el prestamo.')
      return
    }

    setLoanMessage('Prestamo eliminado correctamente.')
    if (editingLoanId === id) {
      resetLoanEditor()
    }
    if (selectedLoanId === id) {
      setSelectedLoanId(null)
      setLoanPayments([])
    }
    await loadLoans()
  }

  const handlePayInstallment = async (installmentNum: number): Promise<void> => {
    if (!selectedLoanId) {
      return
    }

    setLoanError('')
    setLoanMessage('')

    const paid = await apiClient.payLoanInstallment(selectedLoanId, installmentNum, loanPaymentRegister)
    if (!paid.success) {
      setLoanError(paid.error ?? 'No se pudo registrar el pago de la cuota.')
      return
    }

    setLoanMessage(`Cuota ${installmentNum} pagada correctamente.`)
    setLoanPaymentRegister(EMPTY_LOAN_PAYMENT_REGISTER)
    await loadLoans()
    await loadLoanPayments(selectedLoanId)
  }

  const handleUndoInstallment = async (installmentNum: number): Promise<void> => {
    if (!selectedLoanId) return
    setLoanError('')
    setLoanMessage('')
    const result = await apiClient.undoLoanInstallment(selectedLoanId, installmentNum)
    if (!result.success) {
      setLoanError(result.error ?? 'No se pudo revertir el pago de la cuota.')
      return
    }
    setLoanMessage(`Pago de la cuota ${installmentNum} revertido correctamente.`)
    await loadLoans()
    await loadLoanPayments(selectedLoanId)
  }

  return {
    loans,
    isLoansLoading,
    loanMessage,
    loanError,
    loanForm,
    editingLoanId,
    selectedLoan,
    loanPayments,
    isLoanPaymentsLoading,
    loanPaymentRegister,
    loanPaymentInstruments,
    setLoanForm,
    setLoanPaymentRegister,
    loadLoans,
    loadLoanPayments,
    resetLoanEditor,
    startLoanEdit,
    handleLoanPaymentTypeChange,
    handleLoanSubmit,
    handleLoanDelete,
    handlePayInstallment,
    handleUndoInstallment,
  }
}
