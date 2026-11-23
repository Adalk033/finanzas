import { ActionButton } from '../ActionButton'
import { FilterChips, type FilterChip } from '../FilterChips'
import { FilterOptions } from '../FilterOptions'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { DEFAULT_BUDGET_FILTERS, formatCurrency, formatIsoDate, getBudgetStatusLabel } from '../../app/appHelpers'
import type {
  Budget,
  BudgetFilters,
  BudgetInput,
  Category,
  FinancialInstrument,
  SavingsGoal,
  SavingsGoalInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'UTC' })
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: monthFormatter.format(new Date(Date.UTC(2000, index, 1))),
}))
const defaultYear = DEFAULT_BUDGET_FILTERS.years[0]
const yearOptions = Array.from({ length: 201 }, (_, index) => index + 2000)
  .sort((a, b) => Math.abs(a - defaultYear) - Math.abs(b - defaultYear) || b - a)
  .map((year) => ({ value: year, label: String(year) }))

type BudgetsSectionProps = {
  hasConfig: boolean
  expenseCategoryOptions: Category[]
  budgetMessage: string
  budgetError: string
  editingBudgetId: number | null
  budgetForm: BudgetInput
  isBudgetsLoading: boolean
  budgetFilters: BudgetFilters
  budgets: Budget[]
  onBudgetFormChange: (nextForm: BudgetInput) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onApplyFilters: (filters: BudgetFilters) => Promise<boolean>
  onEditBudget: (budget: Budget) => void
  onDeleteBudget: (budgetId: number) => void
  savingsGoals: SavingsGoal[]
  savingsGoalForm: SavingsGoalInput
  editingSavingsGoalId: number | null
  savingsGoalMessage: string
  savingsGoalError: string
  goalInstruments: FinancialInstrument[]
  onSavingsGoalFormChange: (form: SavingsGoalInput) => void
  onSavingsGoalSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onSavingsGoalReset: () => void
  onSavingsGoalEdit: (goal: SavingsGoal) => void
  onSavingsGoalDelete: (id: number) => void
}

export function BudgetsSection({
  hasConfig,
  expenseCategoryOptions,
  budgetMessage,
  budgetError,
  editingBudgetId,
  budgetForm,
  isBudgetsLoading,
  budgetFilters,
  budgets,
  onBudgetFormChange,
  onSubmit,
  onReset,
  onApplyFilters,
  onEditBudget,
  onDeleteBudget,
  savingsGoals,
  savingsGoalForm,
  editingSavingsGoalId,
  savingsGoalMessage,
  savingsGoalError,
  goalInstruments,
  onSavingsGoalFormChange,
  onSavingsGoalSubmit,
  onSavingsGoalReset,
  onSavingsGoalEdit,
  onSavingsGoalDelete,
}: BudgetsSectionProps) {
  const [isSavingsGoalFormOpen, setIsSavingsGoalFormOpen] = useState(false)
  const [filterDraft, setFilterDraft] = useState<BudgetFilters | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(editingBudgetId !== null)
  const isFormVisible = isFormOpen || editingBudgetId !== null
  const { months, years } = budgetFilters
  const isDefaultMonth = months.length === 1 && months[0] === DEFAULT_BUDGET_FILTERS.months[0]
  const isDefaultYear = years.length === 1 && years[0] === defaultYear
  const activeChips: FilterChip[] = []
  if (!isDefaultMonth) {
    activeChips.push(...months.map((month) => ({
      key: `month-${month}`,
      label: `Mes: ${monthOptions[month - 1].label}`,
      onRemove: () => { void onApplyFilters({ ...budgetFilters, months: months.filter((value) => value !== month) }) },
    })))
  }
  if (!months.length) {
    activeChips.push({
      key: 'all-months',
      label: 'Todos los meses',
      onRemove: () => { void onApplyFilters({ ...budgetFilters, months: DEFAULT_BUDGET_FILTERS.months }) },
    })
  }
  if (!isDefaultYear) {
    activeChips.push(...years.map((year) => ({
      key: `year-${year}`,
      label: `Año: ${year}`,
      onRemove: () => { void onApplyFilters({ ...budgetFilters, years: years.filter((value) => value !== year) }) },
    })))
  }
  if (!years.length) {
    activeChips.push({
      key: 'all-years',
      label: 'Todos los años',
      onRemove: () => { void onApplyFilters({ ...budgetFilters, years: DEFAULT_BUDGET_FILTERS.years }) },
    })
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Presupuestos mensuales</h2>
        <p className="card__subtitle">Define topes por categoria y monitorea el avance contra tus gastos reales.</p>
      </header>

      {budgetMessage ? <p className="message message--success">{budgetMessage}</p> : null}
      {budgetError ? <p className="message message--error">{budgetError}</p> : null}

      <div className="section-toolbar">
        <ActionButton className="button button--primary" type="button" onClick={() => {
          if (editingBudgetId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}
          icon={isFormVisible ? 'close' : 'plus'}
          label={isFormVisible ? 'Ocultar formulario' : 'Nuevo presupuesto'}
        />
      </div>

      <div className="section-stack">
        {isFormVisible ? (
            <FormModal title={editingBudgetId === null ? "Nuevo presupuesto" : "Editar presupuesto"} onClose={() => { onReset(); setIsFormOpen(false) }} error={budgetError} message={budgetMessage}>
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
            <NumberInput
              id="budgetAmount"
              className="form-grid__input"
              min={0}
              step="0.01"
              value={budgetForm.amount}
              emptyValue={0}
              onValueChange={(amount) => {
                onBudgetFormChange({ ...budgetForm, amount })
              }}
            />

            <label className="form-grid__field" htmlFor="budgetMonth">Mes</label>
            <NumberInput
              id="budgetMonth"
              className="form-grid__input"
              min={1}
              max={12}
              value={budgetForm.month}
              emptyValue={0}
              onValueChange={(month) => {
                onBudgetFormChange({ ...budgetForm, month })
              }}
            />

            <label className="form-grid__field" htmlFor="budgetYear">Anio</label>
            <NumberInput
              id="budgetYear"
              className="form-grid__input"
              min={2000}
              max={2200}
              value={budgetForm.year}
              emptyValue={0}
              onValueChange={(year) => {
                onBudgetFormChange({ ...budgetForm, year })
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
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig || isBudgetsLoading}
                    icon={editingBudgetId === null ? 'save' : 'refresh'}
                    label={editingBudgetId === null ? 'Guardar presupuesto' : 'Actualizar presupuesto'}
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Listado y progreso</h3>
          </header>

          <div className="section-toolbar">
            <div className="filter-actions">
              <ActionButton aria-haspopup="dialog" onClick={() => setFilterDraft({ ...budgetFilters })} icon="filter" label="Filtros" />
              <ActionButton onClick={() => { void onApplyFilters(DEFAULT_BUDGET_FILTERS) }} icon="reset" label="Limpiar filtros"
                disabled={!hasConfig || (activeChips.length === 0 && !isBudgetsLoading)} />
            </div>
          </div>
          <FilterChips chips={activeChips} disabled={!hasConfig || isBudgetsLoading} />
          {filterDraft ? (
            <FormModal title="Filtros de presupuestos" onClose={() => setFilterDraft(null)} error={budgetError}>
              <form className="form-grid" onSubmit={(event) => {
                event.preventDefault()
                void onApplyFilters(filterDraft).then((applied) => {
                  if (applied) setFilterDraft((current) => current === filterDraft ? null : current)
                })
              }}>
                <FilterOptions
                  label="Meses"
                  options={monthOptions}
                  selected={filterDraft.months}
                  onChange={(months) => setFilterDraft({ ...filterDraft, months })}
                />
                <FilterOptions
                  label="Años"
                  options={yearOptions}
                  selected={filterDraft.years}
                  onChange={(years) => setFilterDraft({ ...filterDraft, years })}
                />

                <div className="form-grid__actions">
                  <ActionButton
                    className="button button--secondary"
                    type="submit"
                    disabled={!hasConfig || isBudgetsLoading}
                    icon="filter"
                    label={isBudgetsLoading ? 'Cargando...' : 'Aplicar filtros'}
                  />
                </div>
              </form>
            </FormModal>
          ) : null}

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
                          <ActionButton iconOnly
                            className="button button--secondary"
                            type="button"
                            onClick={() => {
                              onEditBudget(budget)
                            }}
                            icon="edit"
                            label="Editar"
                          />
                          <ActionButton iconOnly
                            className="button button--danger"
                            type="button"
                            onClick={() => {
                              onDeleteBudget(budget.id)
                            }}
                            icon="trash"
                            label="Eliminar"
                          />
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

      <article className="mini-card">
        <header className="mini-card__header">
          <h3 className="mini-card__title">Metas de ahorro</h3>
          <p className="mini-card__subtitle">Da seguimiento a tu fondo de emergencia y objetivos personales.</p>
        </header>
        <div className="section-toolbar">
          <ActionButton className="button button--primary" type="button" onClick={() => { onSavingsGoalReset(); setIsSavingsGoalFormOpen(true) }}
            icon="plus"
            label="Nueva meta de ahorro"
          />
        </div>
        {isSavingsGoalFormOpen || editingSavingsGoalId !== null ? (
          <FormModal title={editingSavingsGoalId === null ? "Nueva meta de ahorro" : "Editar meta de ahorro"} onClose={() => { onSavingsGoalReset(); setIsSavingsGoalFormOpen(false) }} error={savingsGoalError} message={savingsGoalMessage}>
          <form className="form-grid" onSubmit={onSavingsGoalSubmit}>
          <label className="form-grid__field" htmlFor="goalName">Meta</label>
          <input id="goalName" className="form-grid__input" value={savingsGoalForm.name} onChange={(event) => onSavingsGoalFormChange({ ...savingsGoalForm, name: event.target.value })} required />
          <label className="form-grid__field" htmlFor="goalTarget">Monto objetivo</label>
          <NumberInput id="goalTarget" className="form-grid__input" min={0.01} step="0.01" value={savingsGoalForm.targetAmount} emptyValue={0} onValueChange={(targetAmount) => onSavingsGoalFormChange({ ...savingsGoalForm, targetAmount })} required />
          <label className="form-grid__field" htmlFor="goalCurrent">Ahorrado</label>
          <NumberInput id="goalCurrent" className="form-grid__input" min={0} step="0.01" value={savingsGoalForm.currentAmount} emptyValue={0} onValueChange={(currentAmount) => onSavingsGoalFormChange({ ...savingsGoalForm, currentAmount })} />
          <label className="form-grid__field" htmlFor="goalDate">Fecha objetivo</label>
          <input id="goalDate" className="form-grid__input" type="date" value={savingsGoalForm.targetDate} onChange={(event) => onSavingsGoalFormChange({ ...savingsGoalForm, targetDate: event.target.value })} />
          <label className="form-grid__field" htmlFor="goalInstrument">Cuenta vinculada</label>
          <select id="goalInstrument" className="form-grid__input" value={savingsGoalForm.instrumentId ?? ''} onChange={(event) => onSavingsGoalFormChange({ ...savingsGoalForm, instrumentId: event.target.value ? Number(event.target.value) : null })}>
            <option value="">Sin cuenta vinculada</option>
            {goalInstruments.map((instrument) => <option key={instrument.id} value={instrument.id}>{instrument.name}</option>)}
          </select>
          <div className="form-grid__actions">
            <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
              icon="save"
              label={editingSavingsGoalId === null ? 'Crear meta' : 'Guardar meta'}
            />
            <ActionButton iconOnly className="button button--secondary" type="button" onClick={onSavingsGoalReset} icon="reset" label="Limpiar" />
          </div>
        </form>
          </FormModal>
        ) : null}
        {savingsGoalError ? <p className="message message--error">{savingsGoalError}</p> : null}
        {savingsGoalMessage ? <p className="message message--success">{savingsGoalMessage}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Meta</th><th>Objetivo</th><th>Ahorrado</th><th>Avance</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>
              {savingsGoals.length === 0 ? <tr><td colSpan={6}>No hay metas registradas.</td></tr> : savingsGoals.map((goal) => (
                <tr key={goal.id}>
                  <td>{goal.name}{goal.isActive ? '' : ' · Archivada'}</td>
                  <td>{formatCurrency(goal.targetAmount)}</td>
                  <td>{formatCurrency(goal.currentAmount)}</td>
                  <td>{goal.progressPercent}%</td>
                  <td>{formatIsoDate(goal.targetDate)}</td>
                  <td><div className="table__actions">
                    <ActionButton iconOnly className="button button--secondary" type="button" onClick={() => onSavingsGoalEdit(goal)}
                      icon="edit"
                      label="Editar"
                    />
                    <ActionButton iconOnly className="button button--danger" type="button" onClick={() => onSavingsGoalDelete(goal.id)}
                      icon="archive"
                      label="Archivar"
                    />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
