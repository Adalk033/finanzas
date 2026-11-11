import { ActionButton } from '../ActionButton'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { FREQUENCY_LABELS, formatCurrency, formatIsoDate } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentFrequency,
  LoanPaymentRegisterInput,
  LoanReconciliationInput,
  LoanPaymentType,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

type LoansSectionProps = {
  hasConfig: boolean
  loanForm: LoanInput
  loans: Loan[]
  selectedLoan: Loan | null
  loanPayments: LoanPayment[]
  loanPaymentRegister: LoanPaymentRegisterInput
  loanPaymentInstruments: FinancialInstrument[]
  editingLoanId: number | null
  isLoansLoading: boolean
  isLoanPaymentsLoading: boolean
  loanError: string
  loanMessage: string
  onLoanFormChange: (nextForm: LoanInput) => void
  onLoanPaymentRegisterChange: (nextRegister: LoanPaymentRegisterInput) => void
  onLoanPaymentTypeChange: (nextType: LoanPaymentType) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onLoadLoanPayments: (loanId: number) => void
  onEditLoan: (loan: Loan) => void
  onDeleteLoan: (loanId: number) => void
  onPayInstallment: (installmentNum: number) => void
  onUndoInstallment: (installmentNum: number) => void
  onReconcileLoan: (loanId: number, payload: LoanReconciliationInput) => Promise<boolean>
}

export function LoansSection({
  hasConfig,
  loanForm,
  loans,
  selectedLoan,
  loanPayments,
  loanPaymentRegister,
  loanPaymentInstruments,
  editingLoanId,
  isLoansLoading,
  isLoanPaymentsLoading,
  loanError,
  loanMessage,
  onLoanFormChange,
  onLoanPaymentRegisterChange,
  onLoanPaymentTypeChange,
  onSubmit,
  onReset,
  onReload,
  onLoadLoanPayments,
  onEditLoan,
  onDeleteLoan,
  onPayInstallment,
  onUndoInstallment,
  onReconcileLoan,
}: LoansSectionProps) {
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(editingLoanId !== null)
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<number | null>(null)
  const [reconciliationLoan, setReconciliationLoan] = useState<Loan | null>(null)
  const [isSettlement, setIsSettlement] = useState(false)
  const [isReconciling, setIsReconciling] = useState(false)
  const [reconciliationBalance, setReconciliationBalance] = useState('')
  const [reconciliationDate, setReconciliationDate] = useState('')
  const [reconciliationNotes, setReconciliationNotes] = useState('Saldo confirmado con el acreedor')
  const isLoanFormVisible = isLoanFormOpen || editingLoanId !== null

  const startReconciliation = (loan: Loan, settle = false): void => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    setReconciliationLoan(loan)
    setIsSettlement(settle)
    setReconciliationBalance(settle ? '0' : String(loan.remainingAmount))
    setReconciliationDate(today)
    setReconciliationNotes(settle ? 'Liquidación confirmada con el acreedor' : 'Saldo confirmado con el acreedor')
  }

  const submitReconciliation = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (reconciliationLoan === null || isReconciling) return
    const actualBalance = isSettlement ? 0 : Number(reconciliationBalance)
    if (!Number.isFinite(actualBalance) || actualBalance < 0) return

    setIsReconciling(true)
    try {
      const reconciled = await onReconcileLoan(reconciliationLoan.id, {
        actualBalance,
        reconciliationDate,
        notes: reconciliationNotes,
      })
      if (reconciled) {
        setReconciliationLoan(null)
      }
    } finally {
      setIsReconciling(false)
    }
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Prestamos</h2>
        <p className="card__subtitle">Gestion de prestamos, tabla de amortizacion y registro de cuotas pagadas.</p>
      </header>

      <div className="section-stack">
        <div className="section-toolbar">
            <ActionButton className="button button--primary" type="button" onClick={() => {
              if (editingLoanId !== null) {
                onReset()
                setIsLoanFormOpen(false)
                return
              }
              setIsLoanFormOpen((value) => !value)
            }}
              icon={isLoanFormVisible ? 'close' : 'plus'}
              label={isLoanFormVisible ? 'Ocultar formulario' : 'Nuevo prestamo'}
            />
            <ActionButton className="button button--primary" type="button" onClick={() => setIsRegisterFormOpen((value) => !value)}
              icon={isRegisterFormOpen ? 'close' : 'payment'}
              label={isRegisterFormOpen ? 'Ocultar formulario' : 'Registrar cuota'}
            />
            <div className="section-toolbar__spacer" />
            <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReload} icon="refresh" label="Recargar" />
          </div>

          {isLoanFormVisible ? (
            <FormModal title={editingLoanId === null ? "Nuevo préstamo" : "Editar préstamo"} onClose={() => { onReset(); setIsLoanFormOpen(false) }} error={loanError} message={loanMessage}>
              <p className="mini-card__subtitle">Configura tipo de pago fijo o variable y genera su calendario.</p>
              <form className="form-grid" onSubmit={onSubmit}>
                <label className="form-grid__field" htmlFor="loanName">Nombre</label>
                <input
                  id="loanName"
                  className="form-grid__input"
                  type="text"
                  value={loanForm.name}
                  onChange={(event) => onLoanFormChange({ ...loanForm, name: event.target.value })}
                  placeholder="Prestamo auto"
                  required
                />

                <label className="form-grid__field" htmlFor="loanLender">Acreedor</label>
                <input
                  id="loanLender"
                  className="form-grid__input"
                  type="text"
                  value={loanForm.lender}
                  onChange={(event) => onLoanFormChange({ ...loanForm, lender: event.target.value })}
                  placeholder="Banco o financiera"
                />

                <label className="form-grid__field" htmlFor="loanInstrument">Cuenta de pago (opcional)</label>
                <select
                  id="loanInstrument"
                  className="form-grid__input"
                  value={loanForm.instrumentId ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value
                    onLoanFormChange({ ...loanForm, instrumentId: raw ? Number(raw) : null })
                  }}
                >
                  <option value="">Sin cuenta vinculada</option>
                  {loanPaymentInstruments.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="loanOriginalAmount">Monto original</label>
                <NumberInput
                  id="loanOriginalAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={loanForm.originalAmount}
                  emptyValue={0}
                  onValueChange={(originalAmount) => onLoanFormChange({ ...loanForm, originalAmount })}
                  required
                />

                <label className="form-grid__field" htmlFor="loanTotalInstallments">Total de cuotas</label>
                <NumberInput
                  id="loanTotalInstallments"
                  className="form-grid__input"
                  min={1}
                  value={loanForm.totalInstallments}
                  emptyValue={0}
                  onValueChange={(totalInstallments) => onLoanFormChange({ ...loanForm, totalInstallments })}
                  required
                />

                <label className="form-grid__field" htmlFor="loanPaymentType">Tipo de pago</label>
                <select
                  id="loanPaymentType"
                  className="form-grid__input"
                  value={loanForm.paymentType}
                  onChange={(event) => onLoanPaymentTypeChange(event.target.value as LoanPaymentType)}
                >
                  <option value="fixed">Fijo</option>
                  <option value="variable">Variable</option>
                </select>

                <label className="form-grid__field" htmlFor="loanPaymentFrequency">Frecuencia de cuota</label>
                <select
                  id="loanPaymentFrequency"
                  className="form-grid__input"
                  value={loanForm.paymentFrequency}
                  onChange={(event) => {
                    const paymentFrequency = event.target.value as LoanPaymentFrequency
                    onLoanFormChange({
                      ...loanForm,
                      paymentFrequency,
                      paymentDay: paymentFrequency === 'weekly' ? null : (loanForm.paymentDay ?? 1),
                      secondPaymentDay: paymentFrequency === 'biweekly'
                        ? (loanForm.secondPaymentDay ?? 15)
                        : null,
                    })
                  }}
                >
                  {(['weekly', 'biweekly', 'monthly'] as const).map((value) => (
                    <option key={value} value={value}>{FREQUENCY_LABELS[value]}</option>
                  ))}
                </select>

                {loanForm.paymentType === 'fixed' ? (
                  <>
                    <label className="form-grid__field" htmlFor="loanFixedPayment">Pago fijo por cuota</label>
                    <NumberInput
                      id="loanFixedPayment"
                      className="form-grid__input"
                      min={0.01}
                      step="0.01"
                      value={loanForm.fixedPayment ?? 0}
                      emptyValue={0}
                      onValueChange={(fixedPayment) => onLoanFormChange({ ...loanForm, fixedPayment })}
                      required
                    />
                    <label className="form-grid__field" htmlFor="loanAnnualRateFixed">Tasa anual (%)</label>
                    <NumberInput
                      id="loanAnnualRateFixed"
                      className="form-grid__input"
                      min={0}
                      step="0.0001"
                      value={loanForm.annualRate ?? 0}
                      emptyValue={0}
                      onValueChange={(annualRate) => onLoanFormChange({
                        ...loanForm,
                        annualRate,
                      })}
                    />
                  </>
                ) : (
                  <>
                    <label className="form-grid__field" htmlFor="loanAnnualRate">Tasa anual (%)</label>
                    <NumberInput
                      id="loanAnnualRate"
                      className="form-grid__input"
                      min={0.0001}
                      step="0.0001"
                      value={loanForm.annualRate}
                      emptyValue={null}
                      onValueChange={(annualRate) => onLoanFormChange({ ...loanForm, annualRate })}
                      required
                    />
                  </>
                )}

                {loanForm.paymentFrequency === 'monthly' ? (
                  <>
                    <label className="form-grid__field" htmlFor="loanPaymentDay">Dia de pago</label>
                    <NumberInput
                      id="loanPaymentDay"
                      className="form-grid__input"
                      min={1}
                      max={31}
                      value={loanForm.paymentDay ?? 1}
                      emptyValue={0}
                      onValueChange={(paymentDay) => onLoanFormChange({ ...loanForm, paymentDay })}
                    />
                  </>
                ) : loanForm.paymentFrequency === 'biweekly' ? (
                  <>
                    <label className="form-grid__field" htmlFor="loanFirstPaymentDay">Primer dia de cobro</label>
                    <NumberInput
                      id="loanFirstPaymentDay"
                      className="form-grid__input"
                      min={1}
                      max={31}
                      value={loanForm.paymentDay}
                      emptyValue={null}
                      onValueChange={(paymentDay) => onLoanFormChange({ ...loanForm, paymentDay })}
                    />
                    <label className="form-grid__field" htmlFor="loanSecondPaymentDay">Segundo dia de cobro</label>
                    <NumberInput
                      id="loanSecondPaymentDay"
                      className="form-grid__input"
                      min={1}
                      max={31}
                      value={loanForm.secondPaymentDay}
                      emptyValue={null}
                      onValueChange={(secondPaymentDay) => onLoanFormChange({ ...loanForm, secondPaymentDay })}
                    />
                    <p className="card__subtitle form-grid__help">Se cobran dos veces al mes. Si un dia no existe, se usa el ultimo dia del mes.</p>
                  </>
                ) : (
                  <p className="card__subtitle form-grid__help">Las fechas se calculan desde la fecha inicial, cada 7 dias.</p>
                )}

                <label className="form-grid__checkbox" htmlFor="loanAffectsInstrumentBalance">
                  <input
                    id="loanAffectsInstrumentBalance"
                    type="checkbox"
                    checked={loanForm.affectsInstrumentBalance}
                    onChange={(event) => onLoanFormChange({ ...loanForm, affectsInstrumentBalance: event.target.checked })}
                  />
                  Descontar cada cuota del saldo de la cuenta vinculada
                </label>
                {!loanForm.affectsInstrumentBalance ? (
                  <p className="card__subtitle form-grid__help">Usa esta opcion si la cuota ya esta descontada del ingreso de nomina que registras; reducira la deuda sin volver a restar saldo de la cuenta.</p>
                ) : null}

                <label className="form-grid__field" htmlFor="loanStartDate">Fecha inicial</label>
                <input
                  id="loanStartDate"
                  className="form-grid__input"
                  type="date"
                  value={loanForm.startDate}
                  onChange={(event) => onLoanFormChange({ ...loanForm, startDate: event.target.value })}
                  required
                />

                <label className="form-grid__field" htmlFor="loanEndDate">Fecha fin estimada (opcional)</label>
                <input
                  id="loanEndDate"
                  className="form-grid__input"
                  type="date"
                  value={loanForm.endDate}
                  onChange={(event) => onLoanFormChange({ ...loanForm, endDate: event.target.value })}
                />

                <label className="form-grid__field" htmlFor="loanNotes">Notas</label>
                <input
                  id="loanNotes"
                  className="form-grid__input"
                  type="text"
                  value={loanForm.notes}
                  onChange={(event) => onLoanFormChange({ ...loanForm, notes: event.target.value })}
                  placeholder="Opcional"
                />

                <div className="form-grid__actions">
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
                    icon="save"
                    label={editingLoanId === null ? 'Crear prestamo' : 'Guardar cambios'}
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

          {isRegisterFormOpen ? (
            <FormModal title="Registrar cuota" onClose={() => setIsRegisterFormOpen(false)} error={loanError} message={loanMessage}>
              <p className="mini-card__subtitle">Selecciona un préstamo y la cuota pendiente que deseas registrar.</p>
              <form className="form-grid" onSubmit={(event) => {
                event.preventDefault()
                if (selectedInstallment !== null) onPayInstallment(selectedInstallment)
              }}>
                <label className="form-grid__field" htmlFor="loanRegisterLoan">Préstamo</label>
                <select
                  id="loanRegisterLoan"
                  className="form-grid__input"
                  value={selectedLoan?.id ?? ''}
                  disabled={isLoanPaymentsLoading}
                  onChange={(event) => {
                    setSelectedInstallment(null)
                    onLoadLoanPayments(Number(event.target.value))
                  }}
                  required
                >
                  <option value="" disabled>Selecciona un préstamo</option>
                  {loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.name}</option>)}
                </select>
                <label className="form-grid__field" htmlFor="loanRegisterInstallment">Cuota pendiente</label>
                <select
                  id="loanRegisterInstallment"
                  className="form-grid__input"
                  value={selectedInstallment ?? ''}
                  disabled={selectedLoan === null || isLoanPaymentsLoading}
                  onChange={(event) => setSelectedInstallment(Number(event.target.value))}
                  required
                >
                  <option value="" disabled>Selecciona una cuota</option>
                  {loanPayments.filter((payment) => !payment.isPaid).map((payment) => (
                    <option key={payment.id} value={payment.installmentNum}>
                      Cuota {payment.installmentNum} · {formatIsoDate(payment.paymentDate)} · {formatCurrency(payment.amount)}
                    </option>
                  ))}
                </select>
                <label className="form-grid__field" htmlFor="loanRegisterPaidDate">Fecha de pago</label>
                <input
                  id="loanRegisterPaidDate"
                  className="form-grid__input"
                  type="date"
                  value={loanPaymentRegister.paidDate}
                  onChange={(event) => onLoanPaymentRegisterChange({ ...loanPaymentRegister, paidDate: event.target.value })}
                />

                <label className="form-grid__field" htmlFor="loanRegisterAmount">Monto (opcional; acepta abono extra)</label>
                <NumberInput
                  id="loanRegisterAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={loanPaymentRegister.amount}
                  emptyValue={null}
                  onValueChange={(amount) => onLoanPaymentRegisterChange({ ...loanPaymentRegister, amount })}
                />

                <label className="form-grid__field" htmlFor="loanRegisterNotes">Notas</label>
                <input
                  id="loanRegisterNotes"
                  className="form-grid__input"
                  type="text"
                  value={loanPaymentRegister.notes}
                  onChange={(event) => onLoanPaymentRegisterChange({ ...loanPaymentRegister, notes: event.target.value })}
                  placeholder="Comprobante o comentario"
                />

                <div className="form-grid__actions">
                  <ActionButton
                    className="button button--primary"
                    type="submit"
                    disabled={!hasConfig || isLoanPaymentsLoading || !loanPayments.some((payment) => payment.installmentNum === selectedInstallment && !payment.isPaid)}
                    icon="payment"
                    label={selectedLoan?.affectsInstrumentBalance === false ? 'Registrar descuento' : 'Registrar pago'}
                  />
                </div>
              </form>
            </FormModal>
          ) : null}
      </div>

      {reconciliationLoan !== null ? (
        <FormModal title={isSettlement ? 'Liquidar préstamo' : 'Conciliar saldo pendiente'} onClose={() => { if (!isReconciling) setReconciliationLoan(null) }} error={loanError} message={loanMessage}>
          <header className="loan-reconciliation__header form-modal__intro">
            <h3 className="loan-reconciliation__title">{isSettlement ? 'Liquidar préstamo' : 'Conciliar saldo pendiente'} · {reconciliationLoan.name}</h3>
            <p className="loan-reconciliation__description">{isSettlement
              ? `Confirma que el préstamo ya fue liquidado con el acreedor. El saldo registrado de ${formatCurrency(reconciliationLoan.remainingAmount)} quedará en cero y se eliminarán las cuotas pendientes. Se conservarán los pagos anteriores. Esta acción no descuenta dinero de tu cuenta vinculada.`
              : 'Captura el saldo real indicado por el acreedor. La aplicación no modifica tu cuenta vinculada y recalcula las cuotas futuras.'}</p>
          </header>
          <form className="form-grid loan-reconciliation__form" onSubmit={(event) => { void submitReconciliation(event) }}>
            <label className="form-grid__field" htmlFor="loanReconciliationBalance">Saldo pendiente real</label>
            <input
              id="loanReconciliationBalance"
              className="form-grid__input"
              type="number"
              min="0"
              step="0.01"
              value={reconciliationBalance}
              readOnly={isSettlement}
              onChange={(event) => setReconciliationBalance(event.target.value)}
              required
            />

            <label className="form-grid__field" htmlFor="loanReconciliationDate">{isSettlement ? 'Fecha de liquidación' : 'Fecha de conciliacion'}</label>
            <input
              id="loanReconciliationDate"
              className="form-grid__input"
              type="date"
              value={reconciliationDate}
              onChange={(event) => setReconciliationDate(event.target.value)}
              required
            />

            <label className="form-grid__field" htmlFor="loanReconciliationNotes">Notas</label>
            <input
              id="loanReconciliationNotes"
              className="form-grid__input"
              type="text"
              maxLength={2000}
              value={reconciliationNotes}
              onChange={(event) => setReconciliationNotes(event.target.value)}
            />

            <div className="form-grid__actions">
              <ActionButton className="button button--primary" type="submit" icon={isSettlement ? 'check' : 'balance'} label={isSettlement ? 'Confirmar liquidación' : 'Aplicar conciliacion'} disabled={isReconciling} />
              <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => setReconciliationLoan(null)}
                disabled={isReconciling}
                icon="close"
                label="Cancelar"
              />
            </div>
          </form>
        </FormModal>
      ) : null}

      {loanError ? <p className="message message--error">{loanError}</p> : null}
      {loanMessage ? <p className="message message--success">{loanMessage}</p> : null}

      <div className="category-list">
        <article className="category-card">
          <header className="category-card__header">
            <div>
              <h3 className="category-card__title">Listado de prestamos</h3>
              <p className="category-card__meta">Progreso de pago y acciones por prestamo.</p>
            </div>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Monto original</th>
                  <th>Saldo pendiente</th>
                  <th>Progreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoansLoading ? (
                  <tr>
                    <td colSpan={6}>Cargando prestamos...</td>
                  </tr>
                ) : null}

                {!isLoansLoading && loans.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay prestamos registrados.</td>
                  </tr>
                ) : null}

                {!isLoansLoading
                  ? loans.map((loan) => (
                    <tr key={loan.id}>
                      <td>{loan.name}</td>
                      <td>
                        {loan.paymentType === 'fixed' ? 'Fijo' : 'Variable'} · {FREQUENCY_LABELS[loan.paymentFrequency]}
                        {loan.affectsInstrumentBalance ? '' : ' · Descontado del ingreso'}
                      </td>
                      <td>{formatCurrency(loan.originalAmount)}</td>
                      <td>{formatCurrency(loan.remainingAmount)}</td>
                      <td>{loan.remainingAmount === 0 ? 'Liquidado · Sin cuotas pendientes' : `${loan.paidInstallments}/${loan.totalInstallments}${loan.isActive ? '' : ' · Archivado'}`}</td>
                      <td>
                        <div className="table__actions">
                          <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onLoadLoanPayments(loan.id)}
                            icon="eye"
                            label="Ver detalle"
                          />
                          <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onEditLoan(loan)}
                            icon="edit"
                            label="Editar"
                          />
                          {loan.isActive ? (
                            <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => startReconciliation(loan)}
                              icon="balance"
                              label="Conciliar saldo"
                            />
                          ) : null}
                          {loan.remainingAmount > 0 ? (
                            <ActionButton iconOnly className="button button--primary" type="button" onClick={() => startReconciliation(loan, true)}
                              icon="check"
                              label="Liquidar"
                            />
                          ) : null}
                          {loan.isActive ? (
                            <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onDeleteLoan(loan.id)}
                              icon="archive"
                              label="Archivar sin liquidar"
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                  : null}
              </tbody>
            </table>
          </div>
        </article>

        {selectedLoan !== null ? (
          <article className="category-card">
            <header className="category-card__header">
              <div>
                <h3 className="category-card__title">Tabla de amortizacion · {selectedLoan.name}</h3>
                <p className="category-card__meta">
                  {selectedLoan.paymentType === 'fixed' ? 'Pago fijo' : 'Pago variable'} · {FREQUENCY_LABELS[selectedLoan.paymentFrequency]} · Saldo pendiente {formatCurrency(selectedLoan.remainingAmount)}
                </p>
              </div>
            </header>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cuota</th>
                    <th>Fecha programada</th>
                    <th>Monto</th>
                    <th>Capital</th>
                    <th>Interes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoanPaymentsLoading ? (
                    <tr>
                      <td colSpan={7}>Cargando tabla de amortizacion...</td>
                    </tr>
                  ) : null}

                  {!isLoanPaymentsLoading && loanPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7}>{selectedLoan.remainingAmount === 0 ? 'Préstamo liquidado. No hay cuotas pendientes.' : 'No hay cuotas para este prestamo.'}</td>
                    </tr>
                  ) : null}

                  {!isLoanPaymentsLoading
                    ? loanPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.installmentNum}</td>
                        <td>{formatIsoDate(payment.paymentDate)}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{formatCurrency(payment.principal)}</td>
                        <td>{formatCurrency(payment.interest)}</td>
                        <td>{payment.isPaid ? `Pagada${payment.paidDate ? ` ${formatIsoDate(payment.paidDate)}` : ''}${payment.affectsInstrumentBalance ? '' : ' · Descontada del ingreso'}` : 'Pendiente'}</td>
                        <td>
                          <div className="table__actions">
                            <ActionButton iconOnly
                              className="button button--primary"
                              type="button"
                              disabled={payment.isPaid}
                              onClick={() => { setSelectedInstallment(payment.installmentNum); setIsRegisterFormOpen(true) }}
                              icon="payment"
                              label={selectedLoan.affectsInstrumentBalance ? 'Pagar' : 'Registrar descuento'}
                            />
                            {payment.isPaid ? (
                              <ActionButton iconOnly
                                className="button button--danger"
                                type="button"
                                onClick={() => onUndoInstallment(payment.installmentNum)}
                                icon="undo"
                                label="Revertir"
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                    : null}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
