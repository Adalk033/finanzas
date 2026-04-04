import { useEffect, useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentRegisterInput,
  LoanPaymentType,
} from '../../types/domain'

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
}: LoansSectionProps) {
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(editingLoanId !== null)
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false)

  useEffect(() => {
    if (editingLoanId !== null) {
      setIsLoanFormOpen(true)
    }
  }, [editingLoanId])

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
            <button className="button button--primary" type="button" onClick={() => setIsLoanFormOpen((value) => !value)}>
              {isLoanFormOpen ? 'Ocultar formulario' : editingLoanId === null ? 'Nuevo prestamo' : 'Editar prestamo'}
            </button>
            <div className="section-toolbar__spacer" />
            <button className="button button--secondary" type="button" onClick={onReload}>
              Recargar
            </button>
          </div>

          {isLoanFormOpen ? (
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
                <input
                  id="loanOriginalAmount"
                  className="form-grid__input"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={loanForm.originalAmount}
                  onChange={(event) => onLoanFormChange({ ...loanForm, originalAmount: Number(event.target.value) })}
                  required
                />

                <label className="form-grid__field" htmlFor="loanTotalInstallments">Total de cuotas</label>
                <input
                  id="loanTotalInstallments"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  value={loanForm.totalInstallments}
                  onChange={(event) => onLoanFormChange({ ...loanForm, totalInstallments: Number(event.target.value) })}
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

                {loanForm.paymentType === 'fixed' ? (
                  <>
                    <label className="form-grid__field" htmlFor="loanFixedPayment">Pago fijo mensual</label>
                    <input
                      id="loanFixedPayment"
                      className="form-grid__input"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={loanForm.fixedPayment ?? 0}
                      onChange={(event) => onLoanFormChange({ ...loanForm, fixedPayment: Number(event.target.value) })}
                      required
                    />
                  </>
                ) : (
                  <>
                    <label className="form-grid__field" htmlFor="loanAnnualRate">Tasa anual (decimal)</label>
                    <input
                      id="loanAnnualRate"
                      className="form-grid__input"
                      type="number"
                      min={0.0001}
                      step="0.0001"
                      value={loanForm.annualRate ?? ''}
                      onChange={(event) => {
                        const raw = event.target.value
                        onLoanFormChange({ ...loanForm, annualRate: raw ? Number(raw) : null })
                      }}
                      required
                    />
                  </>
                )}

                <label className="form-grid__field" htmlFor="loanPaymentDay">Dia de pago</label>
                <input
                  id="loanPaymentDay"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  max={31}
                  value={loanForm.paymentDay ?? 1}
                  onChange={(event) => onLoanFormChange({ ...loanForm, paymentDay: Number(event.target.value) })}
                />

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

                <label className="form-grid__field" htmlFor="loanRegisterAmount">Monto (opcional, debe coincidir)</label>
                <input
                  id="loanRegisterAmount"
                  className="form-grid__input"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={loanPaymentRegister.amount ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value
                    onLoanPaymentRegisterChange({ ...loanPaymentRegister, amount: raw ? Number(raw) : null })
                  }}
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

                <p className="card__subtitle">
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
                      <td>{loan.paymentType === 'fixed' ? 'Fijo' : 'Variable'}</td>
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
                  {selectedLoan.paymentType === 'fixed' ? 'Pago fijo' : 'Pago variable'} · Saldo pendiente {formatCurrency(selectedLoan.remainingAmount)}
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
                        <td>{payment.isPaid ? `Pagada ${payment.paidDate ?? ''}` : 'Pendiente'}</td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--primary"
                              type="button"
                              disabled={payment.isPaid}
                              onClick={() => onPayInstallment(payment.installmentNum)}
                            >
                              Pagar
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
        ) : null}
      </div>
    </section>
  )
}
