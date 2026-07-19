import { useState, type SyntheticEvent } from 'react'
import { formatCurrency, getBudgetStatusLabel } from '../../app/appHelpers'
import type { Budget, BudgetInput, Category } from '../../types/domain'

type BudgetsSectionProps = {
  hasConfig: boolean
  expenseCategoryOptions: Category[]
  budgetMessage: string
  budgetError: string
  editingBudgetId: number | null
  budgetForm: BudgetInput
  isBudgetsLoading: boolean
  budgetFilterMonth: number
  budgetFilterYear: number
  budgets: Budget[]
  onBudgetFormChange: (nextForm: BudgetInput) => void
  onBudgetFilterMonthChange: (month: number) => void
  onBudgetFilterYearChange: (year: number) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onApplyFilter: () => void
  onEditBudget: (budget: Budget) => void
  onDeleteBudget: (budgetId: number) => void
}

export function BudgetsSection({
  hasConfig,
  expenseCategoryOptions,
  budgetMessage,
  budgetError,
  editingBudgetId,
  budgetForm,
  isBudgetsLoading,
  budgetFilterMonth,
  budgetFilterYear,
  budgets,
  onBudgetFormChange,
  onBudgetFilterMonthChange,
  onBudgetFilterYearChange,
  onSubmit,
  onReset,
  onApplyFilter,
  onEditBudget,
  onDeleteBudget,
}: BudgetsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingBudgetId !== null)
  const isFormVisible = isFormOpen || editingBudgetId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Presupuestos mensuales</h2>
        <p className="card__subtitle">Define topes por categoria y monitorea el avance contra tus gastos reales.</p>
      </header>

      {budgetMessage ? <p className="message message--success">{budgetMessage}</p> : null}
      {budgetError ? <p className="message message--error">{budgetError}</p> : null}

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => {
          if (editingBudgetId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}>
          {isFormVisible ? 'Ocultar formulario' : 'Nuevo presupuesto'}
        </button>
      </div>

      <div className="phase8-layout">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">{editingBudgetId === null ? 'Nuevo presupuesto' : 'Editar presupuesto'}</h3>
          </header>

          {isFormVisible ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="budgetCategory">Categoria</label>
            <select
              id="budgetCategory"
              className="form-grid__input"
              value={budgetForm.categoryId ?? 0}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10)
                onBudgetFormChange({
                  ...budgetForm,
                  categoryId: value === 0 ? null : value,
                })
              }}
            >
              <option value={0}>Global (todas las categorias)</option>
              {expenseCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="budgetAmount">Monto mensual</label>
            <input
              id="budgetAmount"
              className="form-grid__input"
              type="number"
              min={0}
              step="0.01"
              value={budgetForm.amount}
              onChange={(event) => {
                onBudgetFormChange({ ...budgetForm, amount: Number(event.target.value) })
              }}
            />

            <label className="form-grid__field" htmlFor="budgetMonth">Mes</label>
            <input
              id="budgetMonth"
              className="form-grid__input"
              type="number"
              min={1}
              max={12}
              value={budgetForm.month}
              onChange={(event) => {
                onBudgetFormChange({ ...budgetForm, month: Number(event.target.value) })
              }}
            />

            <label className="form-grid__field" htmlFor="budgetYear">Anio</label>
            <input
              id="budgetYear"
              className="form-grid__input"
              type="number"
              min={2000}
              max={2200}
              value={budgetForm.year}
              onChange={(event) => {
                onBudgetFormChange({ ...budgetForm, year: Number(event.target.value) })
              }}
            />

            <label className="form-grid__field" htmlFor="budgetNotes">Notas</label>
            <textarea
              id="budgetNotes"
              className="form-grid__input"
              rows={3}
              value={budgetForm.notes}
              onChange={(event) => {
                onBudgetFormChange({ ...budgetForm, notes: event.target.value })
              }}
            />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig || isBudgetsLoading}>
                    {editingBudgetId === null ? 'Guardar presupuesto' : 'Actualizar presupuesto'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Listado y progreso</h3>
          </header>

          <div className="form-grid form-grid--inline">
            <label className="form-grid__field" htmlFor="budgetFilterMonth">Mes filtro</label>
            <input
              id="budgetFilterMonth"
              className="form-grid__input"
              type="number"
              min={1}
              max={12}
              value={budgetFilterMonth}
              onChange={(event) => {
                onBudgetFilterMonthChange(Number(event.target.value))
              }}
            />

            <label className="form-grid__field" htmlFor="budgetFilterYear">Anio filtro</label>
            <input
              id="budgetFilterYear"
              className="form-grid__input"
              type="number"
              min={2000}
              max={2200}
              value={budgetFilterYear}
              onChange={(event) => {
                onBudgetFilterYearChange(Number(event.target.value))
              }}
            />

            <div className="form-grid__actions">
              <button
                className="button button--secondary"
                type="button"
                disabled={!hasConfig || isBudgetsLoading}
                onClick={onApplyFilter}
              >
                {isBudgetsLoading ? 'Cargando...' : 'Aplicar filtro'}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Periodo</th>
                  <th>Presupuesto</th>
                  <th>Gastado</th>
                  <th>Avance</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isBudgetsLoading ? (
                  <tr>
                    <td colSpan={7}>Cargando presupuestos...</td>
                  </tr>
                ) : null}

                {!isBudgetsLoading && budgets.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No hay presupuestos para este periodo.</td>
                  </tr>
                ) : null}

                {!isBudgetsLoading
                  ? budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td>{budget.categoryName ?? 'Global'}</td>
                      <td>{String(budget.month).padStart(2, '0')}/{budget.year}</td>
                      <td>{formatCurrency(budget.amount)}</td>
                      <td>{formatCurrency(budget.spentAmount)}</td>
                      <td>
                        <div className="progress">
                          <div
                            className={`progress__bar ${budget.status === 'exceeded' ? 'progress__bar--error' : budget.status === 'warning' ? 'progress__bar--warning' : 'progress__bar--success'}`}
                            style={{ width: `${Math.min(100, budget.progressPercent)}%` }}
                          />
                        </div>
                        <p className="category-card__meta">{budget.progressPercent.toFixed(2)}%</p>
                      </td>
                      <td>
                        <span className={`badge ${budget.status === 'exceeded' ? 'badge--warning' : budget.status === 'warning' ? 'badge--info' : 'badge--success'}`}>
                          {getBudgetStatusLabel(budget.status)}
                        </span>
                      </td>
                      <td>
                        <div className="table__actions">
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => {
                              onEditBudget(budget)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="button button--danger"
                            type="button"
                            onClick={() => {
                              onDeleteBudget(budget.id)
                            }}
                          >
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
