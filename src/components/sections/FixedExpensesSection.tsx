import { useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  FixedExpense,
  FixedExpenseInput,
  FixedExpensePayment,
  FixedExpensePaymentInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

type FixedExpensesSectionProps = {
  hasConfig: boolean
  instruments: FinancialInstrument[]
  expenseCategoryOptions: Category[]
  selectedFixedExpenseCategory: Category | null
  fixedExpenses: FixedExpense[]
  fixedExpenseForm: FixedExpenseInput
  editingFixedExpenseId: number | null
  fixedExpensePayments: FixedExpensePayment[]
  selectedFixedExpenseId: number | null
  fixedExpensePaymentForm: FixedExpensePaymentInput
  isFixedExpensesLoading: boolean
  isFixedExpensePaymentsLoading: boolean
  fixedExpenseError: string
  fixedExpenseMessage: string
  onFixedExpenseFormChange: (nextForm: FixedExpenseInput) => void
  onFixedExpensePaymentFormChange: (nextForm: FixedExpensePaymentInput) => void
  onFixedExpenseSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onFixedExpensePaymentSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onResetFixedExpenseEditor: () => void
  onResetFixedExpensePaymentForm: () => void
  onReloadFixedExpenses: () => void
  onSelectFixedExpense: (fixedExpenseId: number | null) => void
  onEditFixedExpense: (expense: FixedExpense) => void
  onDeleteFixedExpense: (fixedExpenseId: number) => void
  onDeleteFixedExpensePayment: (fixedExpenseId: number, paymentId: number) => void
}

export function FixedExpensesSection({
  hasConfig,
  instruments,
  expenseCategoryOptions,
  selectedFixedExpenseCategory,
  fixedExpenses,
  fixedExpenseForm,
  editingFixedExpenseId,
  fixedExpensePayments,
  selectedFixedExpenseId,
  fixedExpensePaymentForm,
  isFixedExpensesLoading,
  isFixedExpensePaymentsLoading,
  fixedExpenseError,
  fixedExpenseMessage,
  onFixedExpenseFormChange,
  onFixedExpensePaymentFormChange,
  onFixedExpenseSubmit,
  onFixedExpensePaymentSubmit,
  onResetFixedExpenseEditor,
  onResetFixedExpensePaymentForm,
  onReloadFixedExpenses,
  onSelectFixedExpense,
  onEditFixedExpense,
  onDeleteFixedExpense,
  onDeleteFixedExpensePayment,
}: FixedExpensesSectionProps) {
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(editingFixedExpenseId !== null)
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(selectedFixedExpenseId !== null)
  const isExpenseFormVisible = isExpenseFormOpen || editingFixedExpenseId !== null
  const isPaymentFormVisible = isPaymentFormOpen || selectedFixedExpenseId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Gastos Fijos</h2>
        <p className="card__subtitle">Gestión de gastos recurrentes, pagos y abonos asociados a cada instrumento.</p>
      </header>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nuevo gasto fijo</h3>
            <p className="mini-card__subtitle">Renta, luz, agua, internet y otros compromisos.</p>
          </header>

          <div className="section-toolbar">
            <button className="button button--primary" type="button" onClick={() => {
              if (editingFixedExpenseId !== null) {
                onResetFixedExpenseEditor()
                setIsExpenseFormOpen(false)
                return
              }
              setIsExpenseFormOpen((value) => !value)
            }}>
              {isExpenseFormVisible ? 'Ocultar formulario' : 'Nuevo gasto fijo'}
            </button>
            <div className="section-toolbar__spacer" />
            <button className="button button--secondary" type="button" onClick={onReloadFixedExpenses}>
              Recargar
            </button>
          </div>

          {isExpenseFormVisible ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onFixedExpenseSubmit}>
                <label className="form-grid__field" htmlFor="fixedExpenseName">Nombre</label>
                <input
                  id="fixedExpenseName"
                  className="form-grid__input"
                  type="text"
                  value={fixedExpenseForm.name}
                  onChange={(event) => onFixedExpenseFormChange({ ...fixedExpenseForm, name: event.target.value })}
                  placeholder="Renta departamento"
                  required
                />

                <label className="form-grid__field" htmlFor="fixedExpenseAmount">Monto estimado</label>
                <NumberInput
                  id="fixedExpenseAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={fixedExpenseForm.estimatedAmount}
                  emptyValue={0}
                  onValueChange={(estimatedAmount) => onFixedExpenseFormChange({ ...fixedExpenseForm, estimatedAmount })}
                  required
                />

                <label className="form-grid__field" htmlFor="fixedExpenseInstrument">Instrumento (opcional)</label>
                <select
                  id="fixedExpenseInstrument"
                  className="form-grid__input"
                  value={fixedExpenseForm.instrumentId ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value
                    onFixedExpenseFormChange({ ...fixedExpenseForm, instrumentId: raw ? Number(raw) : null })
                  }}
                >
                  <option value="">Sin instrumento</option>
                  {instruments.filter((instrument) => instrument.isActive).map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="fixedExpenseCategory">Categoría</label>
                <select
                  id="fixedExpenseCategory"
                  className="form-grid__input"
                  value={fixedExpenseForm.categoryId ?? ''}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value ? Number(event.target.value) : null
                    onFixedExpenseFormChange({ ...fixedExpenseForm, categoryId: nextCategoryId, subcategoryId: null })
                  }}
                >
                  <option value="">Sin categoría</option>
                  {expenseCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="fixedExpenseSubcategory">Subcategoría</label>
                <select
                  id="fixedExpenseSubcategory"
                  className="form-grid__input"
                  value={fixedExpenseForm.subcategoryId ?? ''}
                  onChange={(event) => {
                    const nextSubcategoryId = event.target.value ? Number(event.target.value) : null
                    onFixedExpenseFormChange({ ...fixedExpenseForm, subcategoryId: nextSubcategoryId })
                  }}
                  disabled={!selectedFixedExpenseCategory}
                >
                  <option value="">Sin subcategoría</option>
                  {(selectedFixedExpenseCategory?.subcategories ?? []).map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="fixedExpenseIsVariable">Tipo de monto</label>
                <select
                  id="fixedExpenseIsVariable"
                  className="form-grid__input"
                  value={fixedExpenseForm.isVariable ? 'yes' : 'no'}
                  onChange={(event) => onFixedExpenseFormChange({ ...fixedExpenseForm, isVariable: event.target.value === 'yes' })}
                >
                  <option value="no">Fijo</option>
                  <option value="yes">Variable</option>
                </select>

                <label className="form-grid__field" htmlFor="fixedExpensePaymentDay">Día de pago</label>
                <NumberInput
                  id="fixedExpensePaymentDay"
                  className="form-grid__input"
                  min={1}
                  max={31}
                  value={fixedExpenseForm.paymentDay ?? 1}
                  emptyValue={0}
                  onValueChange={(paymentDay) => onFixedExpenseFormChange({ ...fixedExpenseForm, paymentDay })}
                />

                <label className="form-grid__field" htmlFor="fixedExpenseNotes">Notas</label>
                <input
                  id="fixedExpenseNotes"
                  className="form-grid__input"
                  type="text"
                  value={fixedExpenseForm.notes}
                  onChange={(event) => onFixedExpenseFormChange({ ...fixedExpenseForm, notes: event.target.value })}
                  placeholder="Opcional"
                />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig}>
                    {editingFixedExpenseId === null ? 'Crear gasto fijo' : 'Guardar cambios'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onResetFixedExpenseEditor}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Registrar pago o abono</h3>
            <p className="mini-card__subtitle">Puedes registrar varios pagos para un mismo periodo; cada uno se carga al instrumento del gasto fijo.</p>
          </header>

          <div className="section-toolbar">
            <button className="button button--primary" type="button" onClick={() => {
              if (selectedFixedExpenseId !== null) {
                onResetFixedExpensePaymentForm()
                onSelectFixedExpense(null)
                setIsPaymentFormOpen(false)
                return
              }
              setIsPaymentFormOpen((value) => !value)
            }}>
              {isPaymentFormVisible ? 'Ocultar formulario' : 'Nuevo pago'}
            </button>
          </div>

          {isPaymentFormVisible ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onFixedExpensePaymentSubmit}>
                <label className="form-grid__field" htmlFor="fixedExpenseSelected">Gasto fijo</label>
                <select
                  id="fixedExpenseSelected"
                  className="form-grid__input"
                  value={selectedFixedExpenseId ?? ''}
                  onChange={(event) => {
                    const nextId = event.target.value ? Number(event.target.value) : null
                    onSelectFixedExpense(nextId)
                  }}
                >
                  <option value="">Selecciona gasto fijo</option>
                  {fixedExpenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>{expense.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="fixedExpensePaymentAmount">Monto pagado</label>
                <NumberInput
                  id="fixedExpensePaymentAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={fixedExpensePaymentForm.amount}
                  emptyValue={0}
                  onValueChange={(amount) => onFixedExpensePaymentFormChange({ ...fixedExpensePaymentForm, amount })}
                  required
                />

                <label className="form-grid__field" htmlFor="fixedExpensePaymentMonth">Mes</label>
                <NumberInput
                  id="fixedExpensePaymentMonth"
                  className="form-grid__input"
                  min={1}
                  max={12}
                  value={fixedExpensePaymentForm.periodMonth}
                  emptyValue={0}
                  onValueChange={(periodMonth) => onFixedExpensePaymentFormChange({ ...fixedExpensePaymentForm, periodMonth })}
                  required
                />

                <label className="form-grid__field" htmlFor="fixedExpensePaymentYear">Año</label>
                <NumberInput
                  id="fixedExpensePaymentYear"
                  className="form-grid__input"
                  min={2000}
                  max={2200}
                  value={fixedExpensePaymentForm.periodYear}
                  emptyValue={0}
                  onValueChange={(periodYear) => onFixedExpensePaymentFormChange({ ...fixedExpensePaymentForm, periodYear })}
                  required
                />

                <label className="form-grid__field" htmlFor="fixedExpensePaymentDate">Fecha de pago</label>
                <input
                  id="fixedExpensePaymentDate"
                  className="form-grid__input"
                  type="date"
                  value={fixedExpensePaymentForm.paymentDate}
                  onChange={(event) => onFixedExpensePaymentFormChange({ ...fixedExpensePaymentForm, paymentDate: event.target.value })}
                />

                <label className="form-grid__field" htmlFor="fixedExpensePaymentNotes">Notas</label>
                <input
                  id="fixedExpensePaymentNotes"
                  className="form-grid__input"
                  type="text"
                  value={fixedExpensePaymentForm.notes}
                  onChange={(event) => onFixedExpensePaymentFormChange({ ...fixedExpensePaymentForm, notes: event.target.value })}
                  placeholder="Opcional"
                />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!selectedFixedExpenseId}>
                    Registrar pago
                  </button>
                  <button className="button button--secondary" type="button" onClick={onResetFixedExpensePaymentForm}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>
      </div>

      {fixedExpenseError ? <p className="message message--error">{fixedExpenseError}</p> : null}
      {fixedExpenseMessage ? <p className="message message--success">{fixedExpenseMessage}</p> : null}

      <div className="category-list">
        <article className="category-card">
          <header className="category-card__header">
            <div>
              <h3 className="category-card__title">Listado de gastos fijos</h3>
              <p className="category-card__meta">Renta, servicios y compromisos mensuales.</p>
            </div>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Instrumento</th>
                  <th>Monto estimado</th>
                  <th>Variable</th>
                  <th>Día de pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isFixedExpensesLoading ? (
                  <tr>
                  <td colSpan={6}>Cargando gastos fijos...</td>
                  </tr>
                ) : null}

                {!isFixedExpensesLoading && fixedExpenses.length === 0 ? (
                  <tr>
                  <td colSpan={6}>No hay gastos fijos registrados.</td>
                  </tr>
                ) : null}

                {!isFixedExpensesLoading
                  ? fixedExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.name}</td>
                      <td>{expense.instrumentName ?? 'Sin instrumento'}</td>
                      <td>{formatCurrency(expense.estimatedAmount)}</td>
                      <td>{expense.isVariable ? 'Sí' : 'No'}</td>
                      <td>{expense.paymentDay ?? '-'}</td>
                      <td>
                        <div className="table__actions">
                          <button className="button button--secondary" type="button" onClick={() => onEditFixedExpense(expense)}>
                            Editar
                          </button>
                          <button className="button button--danger" type="button" onClick={() => onDeleteFixedExpense(expense.id)}>
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

        <article className="category-card">
            <header className="category-card__header">
              <div>
                <h3 className="category-card__title">Historial de pagos</h3>
                <p className="category-card__meta">Pagos registrados de todos los gastos fijos.</p>
              </div>
            </header>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Gasto fijo</th>
                    <th>Periodo</th>
                    <th>Monto</th>
                    <th>Fecha pago</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isFixedExpensePaymentsLoading ? (
                    <tr>
                      <td colSpan={6}>Cargando historial de pagos...</td>
                    </tr>
                  ) : null}

                  {!isFixedExpensePaymentsLoading && fixedExpensePayments.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No hay pagos registrados.</td>
                    </tr>
                  ) : null}

                  {!isFixedExpensePaymentsLoading
                    ? fixedExpensePayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.fixedExpenseName ?? 'Gasto fijo eliminado'}</td>
                        <td>{`${payment.periodMonth}/${payment.periodYear}`}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.paymentDate ?? '-'}</td>
                        <td>{payment.isPaid ? 'Pagado' : 'Pendiente'}</td>
                        <td>
                          <div className="table__actions">
                            <button className="button button--danger" type="button" onClick={() => onDeleteFixedExpensePayment(payment.fixedExpenseId, payment.id)}>
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
      </div>
    </section>
  )
}
