import { ActionButton } from '../ActionButton'
import { FilterChips, type FilterChip } from '../FilterChips'
import { FilterOptions } from '../FilterOptions'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { CURRENT_MONTH_ISO, EMPTY_FAMILY_EXPENSE_FILTERS, formatCurrency, formatIsoDate, formatMonth } from '../../app/appHelpers'
import type {
  Category,
  FamilyExpense,
  FamilyExpenseFilters,
  FamilyExpenseInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

type FamilyExpensesSectionProps = {
  hasConfig: boolean
  categories: Category[]
  expenses: FamilyExpense[]
  form: FamilyExpenseInput
  filters: FamilyExpenseFilters
  subcategories: Category['subcategories']
  editingId: number | null
  isLoading: boolean
  error: string
  message: string
  onFormChange: (form: FamilyExpenseInput) => void
  onApplyFilters: (filters: FamilyExpenseFilters) => Promise<boolean>
  onMonthChange: (month: string) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (expense: FamilyExpense) => void
  onDelete: (id: number) => void
}

export function FamilyExpensesSection({
  hasConfig,
  categories,
  expenses,
  form,
  filters,
  subcategories,
  editingId,
  isLoading,
  error,
  message,
  onFormChange,
  onApplyFilters,
  onMonthChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onDelete,
}: FamilyExpensesSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingId !== null)
  const [filterDraft, setFilterDraft] = useState<FamilyExpenseFilters | null>(null)
  const [monthToAdd, setMonthToAdd] = useState('')
  const isFormVisible = isFormOpen || editingId !== null
  const expenseCategories = categories.filter((category) => (
    category.isActive && (category.type === 'expense' || category.type === 'both')
  ))
  const isDefaultMonth = filters.months.length === 1 && filters.months[0] === CURRENT_MONTH_ISO
  const activeChips: FilterChip[] = isDefaultMonth ? [] : filters.months.map((month) => ({
    key: `month-${month}`,
    label: `Mes: ${formatMonth(month)}`,
    onRemove: () => { void onApplyFilters({ ...filters, months: filters.months.filter((value) => value !== month) }) },
  }))
  const categoryIds = filters.categoryIds ?? []
  activeChips.push(...categoryIds.map((id) => ({
    key: `category-${id}`,
    label: `Categoría: ${categories.find((category) => category.id === id)?.name ?? id}`,
    onRemove: () => { void onApplyFilters({ ...filters, categoryIds: categoryIds.filter((value) => value !== id) }) },
  })))
  if (filters.search?.trim()) {
    activeChips.push({
      key: 'search',
      label: `Búsqueda: ${filters.search.trim()}`,
      onRemove: () => { void onApplyFilters({ ...filters, search: '' }) },
    })
  }

  const clearFilters = (): void => {
    if (filterDraft) setFilterDraft(EMPTY_FAMILY_EXPENSE_FILTERS)
    setMonthToAdd('')
    void onApplyFilters(EMPTY_FAMILY_EXPENSE_FILTERS)
  }
  const canAddMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthToAdd) && !filterDraft?.months.includes(monthToAdd)

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Gastos de Familia</h2>
        <p className="card__subtitle">Registro mensual independiente de cuentas, tarjetas y demás instrumentos personales.</p>
      </header>

      <div className="family-month-filter">
        <label className="form-grid__field" htmlFor="familyExpenseMonth">Ir al mes</label>
        <input
          id="familyExpenseMonth"
          className="form-grid__input"
          type="month"
          value={filters.months.length === 1 ? filters.months[0] : ''}
          onChange={(event) => {
            if (event.target.value) onMonthChange(event.target.value)
          }}
        />
      </div>

      <div className="section-toolbar">
        <ActionButton className="button button--primary" type="button" onClick={() => {
          if (editingId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}
          icon={isFormVisible ? 'close' : 'plus'}
          label={isFormVisible ? 'Ocultar formulario' : 'Nuevo gasto familiar'}
        />
        <div className="filter-actions">
          <ActionButton aria-haspopup="dialog" onClick={() => {
            setMonthToAdd('')
            setFilterDraft({ ...filters })
          }} icon="filter" label="Filtros" />
          <ActionButton onClick={clearFilters} icon="reset" label="Limpiar filtros"
            disabled={!hasConfig || (activeChips.length === 0 && !isLoading)} />
        </div>
        <div className="section-toolbar__spacer" />
        <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReload} icon="refresh" label="Recargar" />
      </div>
      <FilterChips chips={activeChips} disabled={!hasConfig || isLoading} />

      <div className="section-stack">
        {isFormVisible ? (
            <FormModal title={editingId === null ? "Nuevo gasto familiar" : "Editar gasto familiar"} onClose={() => { onReset(); setIsFormOpen(false) }} error={error} message={message}>
              <form className="form-grid" onSubmit={onSubmit}>
                <label className="form-grid__field" htmlFor="familyExpenseDescription">Descripcion</label>
                <input
                  id="familyExpenseDescription"
                  className="form-grid__input"
                  type="text"
                  maxLength={255}
                  value={form.description}
                  onChange={(event) => onFormChange({ ...form, description: event.target.value })}
                  placeholder="Despensa, limpieza, reparacion..."
                  required
                />

                <label className="form-grid__field" htmlFor="familyExpenseAmount">Monto</label>
                <NumberInput
                  id="familyExpenseAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={form.amount}
                  emptyValue={0}
                  onValueChange={(amount) => onFormChange({ ...form, amount })}
                  required
                />

                <label className="form-grid__field" htmlFor="familyExpenseDate">Fecha</label>
                <input
                  id="familyExpenseDate"
                  className="form-grid__input"
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) => onFormChange({ ...form, expenseDate: event.target.value })}
                  required
                />

                <label className="form-grid__field" htmlFor="familyExpenseCategory">Categoria</label>
                <select
                  id="familyExpenseCategory"
                  className="form-grid__input"
                  value={form.categoryId ?? ''}
                  onChange={(event) => onFormChange({
                    ...form,
                    categoryId: event.target.value ? Number(event.target.value) : null,
                    subcategoryId: null,
                  })}
                >
                  <option value="">Sin categoria</option>
                  {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>

                <label className="form-grid__field" htmlFor="familyExpenseSubcategory">Subcategoria</label>
                <select
                  id="familyExpenseSubcategory"
                  className="form-grid__input"
                  value={form.subcategoryId ?? ''}
                  onChange={(event) => onFormChange({
                    ...form,
                    subcategoryId: event.target.value ? Number(event.target.value) : null,
                  })}
                  disabled={subcategories.length === 0}
                >
                  <option value="">Sin subcategoria</option>
                  {subcategories.filter((subcategory) => subcategory.isActive).map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="familyExpenseNotes">Notas</label>
                <textarea
                  id="familyExpenseNotes"
                  className="form-grid__input"
                  maxLength={2000}
                  value={form.notes}
                  onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                  placeholder="Opcional"
                />

                <div className="form-grid__actions">
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
                    icon={editingId === null ? 'plus' : 'save'}
                    label={editingId === null ? 'Registrar gasto' : 'Guardar cambios'}
                  />
                  <ActionButton iconOnly className="button button--secondary" type="button" onClick={onReset}
                    icon={editingId === null ? 'reset' : 'close'}
                    label={editingId === null ? 'Limpiar' : 'Cancelar edicion'}
                  />
                </div>
              </form>
            </FormModal>
          ) : null}

        {filterDraft ? (
            <FormModal title="Filtros de gastos familiares" onClose={() => setFilterDraft(null)} error={error}>
              <form className="form-grid" onSubmit={(event) => {
                event.preventDefault()
                const nextFilters = canAddMonth ? { ...filterDraft, months: [...filterDraft.months, monthToAdd] } : filterDraft
                void onApplyFilters(nextFilters).then((applied) => {
                  if (applied) setFilterDraft((current) => current === filterDraft ? null : current)
                })
              }}>
                <fieldset className="filter-options">
                  <legend className="form-grid__field">Meses</legend>
                  <div className="filter-actions">
                    <input
                      className="form-grid__input filter-options__month"
                      type="month"
                      max="9999-12"
                      aria-label="Mes para añadir"
                      value={monthToAdd}
                      onChange={(event) => setMonthToAdd(event.target.value)}
                    />
                    <ActionButton icon="plus" label="Añadir mes" disabled={!canAddMonth} onClick={() => {
                      setFilterDraft({ ...filterDraft, months: [...filterDraft.months, monthToAdd] })
                      setMonthToAdd('')
                    }} />
                  </div>
                  {filterDraft.months.length === 0 ? <p className="filter-options__empty">Mes actual</p> : null}
                  <FilterChips chips={filterDraft.months.map((month) => ({
                    key: month,
                    label: formatMonth(month),
                    onRemove: () => setFilterDraft({ ...filterDraft, months: filterDraft.months.filter((value) => value !== month) }),
                  }))} />
                </fieldset>

                <FilterOptions
                  label="Categorías"
                  options={expenseCategories.map(({ id, name }) => ({ value: id, label: name }))}
                  selected={filterDraft.categoryIds ?? []}
                  onChange={(categoryIds) => setFilterDraft({ ...filterDraft, categoryIds })}
                />

                <label className="form-grid__field" htmlFor="familyExpenseSearch">Búsqueda</label>
                <input
                  id="familyExpenseSearch"
                  className="form-grid__input"
                  type="text"
                  maxLength={100}
                  value={filterDraft.search ?? ''}
                  onChange={(event) => setFilterDraft({ ...filterDraft, search: event.target.value })}
                  placeholder="Descripción o notas"
                />

                <div className="form-grid__actions">
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig || isLoading} icon="filter" label="Aplicar filtros" />
                  <ActionButton iconOnly type="button" onClick={clearFilters} disabled={!hasConfig} icon="reset" label="Limpiar filtros" />
                </div>
              </form>
            </FormModal>
          ) : null}
      </div>

      {error ? <p className="message message--error">{error}</p> : null}
      {message ? <p className="message message--success">{message}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripcion</th>
              <th>Categoria</th>
              <th>Monto</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6}>Cargando gastos familiares...</td></tr> : null}
            {!isLoading && expenses.length === 0 ? <tr><td colSpan={6}>No hay gastos familiares con estos filtros.</td></tr> : null}
            {!isLoading ? expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatIsoDate(expense.expenseDate)}</td>
                <td>{expense.description}</td>
                <td>{expense.categoryName ?? 'Sin categoria'}{expense.subcategoryName ? ` / ${expense.subcategoryName}` : ''}</td>
                <td>{formatCurrency(expense.amount)}</td>
                <td>{expense.notes ?? '-'}</td>
                <td>
                  <div className="table__actions">
                    <ActionButton iconOnly className="button button--secondary button--small" type="button" onClick={() => onEdit(expense)}
                      icon="edit"
                      label="Editar"
                    />
                    <ActionButton iconOnly className="button button--danger button--small" type="button" onClick={() => onDelete(expense.id)}
                      icon="trash"
                      label="Eliminar"
                    />
                  </div>
                </td>
              </tr>
            )) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
