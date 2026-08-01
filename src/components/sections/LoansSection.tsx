import { useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentFrequency,
  LoanPaymentRegisterInput,
  LoanPaymentType,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

const LOAN_PAYMENT_FREQUENCY_LABELS: Record<LoanPaymentFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

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
}: LoansSectionProps) {
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(editingLoanId !== null)
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false)
  const isLoanFormVisible = isLoanFormOpen || editingLoanId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Prestamos</h2>
        <p className="card__subtitle">Gestion de prestamos, tabla de amortizacion y registro de cuotas pagadas.</p>
      </header>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nuevo prestamo</h3>
            <p className="mini-card__subtitle">Configura tipo de pago fijo o variable y genera su calendario.</p>
          </header>

          <div className="section-toolbar">
            <button className="button button--primary" type="button" onClick={() => {
              if (editingLoanId !== null) {
                onReset()
                setIsLoanFormOpen(false)
                return
              }
              setIsLoanFormOpen((value) => !value)
            }}>
              {isLoanFormVisible ? 'Ocultar formulario' : 'Nuevo prestamo'}
            </button>
            <div className="section-toolbar__spacer" />
            <button className="button button--secondary" type="button" onClick={onReload}>
              Recargar
            </button>
          </div>

          {isLoanFormVisible ? (
            <div className="section-panel">
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
                  {Object.entries(LOAN_PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
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
                  <button className="button button--primary" type="submit" disabled={!hasConfig}>
                    {editingLoanId === null ? 'Crear prestamo' : 'Guardar cambios'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Registro de cuota</h3>
            <p className="mini-card__subtitle">Selecciona un prestamo y registra cuotas pendientes.</p>
          </header>

          <div className="section-toolbar">
            <button className="button button--primary" type="button" onClick={() => setIsRegisterFormOpen((value) => !value)}>
              {isRegisterFormOpen ? 'Ocultar formulario' : 'Registrar cuota'}
            </button>
          </div>

          {isRegisterFormOpen ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
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

                <p className="card__subtitle form-grid__help">
                  Usa el boton Pagar de la tabla para registrar cada cuota pendiente con esta configuracion.
                </p>
              </form>
            </div>
          ) : null}
        </section>
      </div>

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
                        {loan.paymentType === 'fixed' ? 'Fijo' : 'Variable'} · {LOAN_PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency]}
                        {loan.affectsInstrumentBalance ? '' : ' · Descontado del ingreso'}
                      </td>
                      <td>{formatCurrency(loan.originalAmount)}</td>
                      <td>{formatCurrency(loan.remainingAmount)}</td>
                      <td>{loan.paidInstallments}/{loan.totalInstallments}</td>
                      <td>
                        <div className="table__actions">
                          <button className="button button--secondary" type="button" onClick={() => onLoadLoanPayments(loan.id)}>
                            Ver detalle
                          </button>
                          <button className="button button--secondary" type="button" onClick={() => onEditLoan(loan)}>
                            Editar
                          </button>
                          <button className="button button--danger" type="button" onClick={() => onDeleteLoan(loan.id)}>
                            Eliminar
                          </button>
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
                  {selectedLoan.paymentType === 'fixed' ? 'Pago fijo' : 'Pago variable'} · {LOAN_PAYMENT_FREQUENCY_LABELS[selectedLoan.paymentFrequency]} · Saldo pendiente {formatCurrency(selectedLoan.remainingAmount)}
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
                      <td colSpan={7}>No hay cuotas para este prestamo.</td>
                    </tr>
                  ) : null}

                  {!isLoanPaymentsLoading
                    ? loanPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.installmentNum}</td>
                        <td>{payment.paymentDate}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{formatCurrency(payment.principal)}</td>
                        <td>{formatCurrency(payment.interest)}</td>
                        <td>{payment.isPaid ? `Pagada ${payment.paidDate ?? ''}${payment.affectsInstrumentBalance ? '' : ' · Descontada del ingreso'}` : 'Pendiente'}</td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--primary"
                              type="button"
                              disabled={payment.isPaid}
                              onClick={() => onPayInstallment(payment.installmentNum)}
                            >
                              {selectedLoan.affectsInstrumentBalance ? 'Pagar' : 'Registrar descuento'}
                            </button>
                            {payment.isPaid ? (
                              <button
                                className="button button--danger"
                                type="button"
                                onClick={() => onUndoInstallment(payment.installmentNum)}
                              >
                                Revertir
                              </button>
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
