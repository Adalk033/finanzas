import { useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
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
  onFiltersChange: (filters: FamilyExpenseFilters) => void
  onMonthChange: (month: string) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onFiltersSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onClearFilters: () => void
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
  onFiltersChange,
  onMonthChange,
  onSubmit,
  onFiltersSubmit,
  onReset,
  onClearFilters,
  onReload,
  onEdit,
  onDelete,
}: FamilyExpensesSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingId !== null)
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)
  const isFormVisible = isFormOpen || editingId !== null
  const expenseCategories = categories.filter((category) => (
    category.isActive && (category.type === 'expense' || category.type === 'both')
  ))

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Gastos de Familia</h2>
        <p className="card__subtitle">Registro mensual independiente de cuentas, tarjetas y demás instrumentos personales.</p>
      </header>

      <div className="family-month-filter">
        <label className="form-grid__field" htmlFor="familyExpenseMonth">Mes</label>
        <input
          id="familyExpenseMonth"
          className="form-grid__input"
          type="month"
          value={filters.month}
          onChange={(event) => {
            if (event.target.value) onMonthChange(event.target.value)
          }}
          required
        />
      </div>

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => {
          if (editingId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}>
          {isFormVisible ? 'Ocultar formulario' : 'Nuevo gasto familiar'}
        </button>
        <button className="button button--secondary" type="button" onClick={() => setAreFiltersOpen((value) => !value)}>
          {areFiltersOpen ? 'Ocultar filtros' : 'Filtros'}
        </button>
        <div className="section-toolbar__spacer" />
        <button className="button button--secondary" type="button" onClick={onReload}>Recargar</button>
      </div>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">{editingId === null ? 'Nuevo gasto familiar' : 'Editar gasto familiar'}</h3>
          </header>
          {isFormVisible ? (
            <div className="section-panel">
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
                  <button className="button button--primary" type="submit" disabled={!hasConfig}>
                    {editingId === null ? 'Registrar gasto' : 'Guardar cambios'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onReset}>
                    {editingId === null ? 'Limpiar' : 'Cancelar edicion'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Filtros del mes</h3>
          </header>
          {areFiltersOpen ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onFiltersSubmit}>
                <label className="form-grid__field" htmlFor="familyExpenseFilterCategory">Categoria</label>
                <select
                  id="familyExpenseFilterCategory"
                  className="form-grid__input"
                  value={filters.categoryId ?? ''}
                  onChange={(event) => onFiltersChange({
                    ...filters,
                    categoryId: event.target.value ? Number(event.target.value) : undefined,
                  })}
                >
                  <option value="">Todas</option>
                  {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>

                <label className="form-grid__field" htmlFor="familyExpenseSearch">Busqueda</label>
                <input
                  id="familyExpenseSearch"
                  className="form-grid__input"
                  type="text"
                  maxLength={100}
                  value={filters.search ?? ''}
                  onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
                  placeholder="Descripcion o notas"
                />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig}>Aplicar filtros</button>
                  <button className="button button--secondary" type="button" onClick={onClearFilters}>Limpiar</button>
                </div>
              </form>
            </div>
          ) : null}
        </section>
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
            {!isLoading && expenses.length === 0 ? <tr><td colSpan={6}>No hay gastos familiares en este mes.</td></tr> : null}
            {!isLoading ? expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.expenseDate}</td>
                <td>{expense.description}</td>
                <td>{expense.categoryName ?? 'Sin categoria'}{expense.subcategoryName ? ` / ${expense.subcategoryName}` : ''}</td>
                <td>{formatCurrency(expense.amount)}</td>
                <td>{expense.notes ?? '-'}</td>
                <td>
                  <div className="table__actions">
                    <button className="button button--secondary button--small" type="button" onClick={() => onEdit(expense)}>Editar</button>
                    <button className="button button--danger button--small" type="button" onClick={() => onDelete(expense.id)}>Eliminar</button>
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
