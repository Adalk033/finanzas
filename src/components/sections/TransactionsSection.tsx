import type { FormEvent } from 'react'
import { MSI_OPTIONS, formatCurrency } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
} from '../../types/domain'

const AUTO_ADJUSTMENT_NOTE_PREFIX = 'AUTO_ADJUSTMENT_TRANSFER:'
const AUTO_ADJUSTMENT_DESCRIPTION = 'Otros (por ajuste)'

type TransactionsSectionProps = {
  hasConfig: boolean
  instruments: FinancialInstrument[]
  categories: Category[]
  transactionForm: TransactionInput
  editingTransactionId: number | null
  selectedTransactionInstrumentId: number
  selectedTransactionCategoryId: number | null
  selectedTransactionInstrument: FinancialInstrument | null
  transactionSubcategoryOptions: Category['subcategories']
  transactionFilters: TransactionFilters
  showAutoAdjustmentsOnly: boolean
  autoAdjustmentCount: number
  transactions: Transaction[]
  activeMsiTransactions: Transaction[]
  isTransactionsLoading: boolean
  transactionError: string
  transactionMessage: string
  onTransactionFormChange: (nextForm: TransactionInput) => void
  onTransactionTypeChange: (nextType: TransactionType) => void
  onTransactionSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTransactionEdit: (transaction: Transaction) => void
  onTransactionDelete: (transactionId: number) => void
  onResetTransactionForm: () => void
  onFiltersChange: (nextFilters: TransactionFilters) => void
  onToggleAutoAdjustmentsOnly: (nextValue: boolean) => void
  onFiltersSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClearFilters: () => void
  onReload: () => void
}

export function TransactionsSection({
  hasConfig,
  instruments,
  categories,
  transactionForm,
  editingTransactionId,
  selectedTransactionInstrumentId,
  selectedTransactionCategoryId,
  selectedTransactionInstrument,
  transactionSubcategoryOptions,
  transactionFilters,
  showAutoAdjustmentsOnly,
  autoAdjustmentCount,
  transactions,
  activeMsiTransactions,
  isTransactionsLoading,
  transactionError,
  transactionMessage,
  onTransactionFormChange,
  onTransactionTypeChange,
  onTransactionSubmit,
  onTransactionEdit,
  onTransactionDelete,
  onResetTransactionForm,
  onFiltersChange,
  onToggleAutoAdjustmentsOnly,
  onFiltersSubmit,
  onClearFilters,
  onReload,
}: TransactionsSectionProps) {
  const isAutoAdjustmentTransaction = (transaction: Transaction): boolean => {
    const notes = transaction.notes ?? ''
    const description = transaction.description ?? ''

    return notes.startsWith(AUTO_ADJUSTMENT_NOTE_PREFIX) || description === AUTO_ADJUSTMENT_DESCRIPTION
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Transacciones</h2>
        <p className="card__subtitle">Registro de gastos/ingresos, filtros y vista de MSI activas.</p>
      </header>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">{editingTransactionId === null ? 'Nueva transaccion' : 'Editar transaccion'}</h3>
            <p className="mini-card__subtitle">Crea gastos o ingresos asociados a instrumento y categoria.</p>
          </header>

          <form className="form-grid" onSubmit={onTransactionSubmit}>
            <label className="form-grid__field" htmlFor="transactionInstrument">Instrumento</label>
            <select
              id="transactionInstrument"
              className="form-grid__input"
              value={selectedTransactionInstrumentId}
              onChange={(event) => {
                onTransactionFormChange({ ...transactionForm, instrumentId: Number(event.target.value) })
              }}
              required
            >
              <option value={0}>Selecciona instrumento</option>
              {instruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transactionType">Tipo</label>
            <select
              id="transactionType"
              className="form-grid__input"
              value={transactionForm.type}
              onChange={(event) => onTransactionTypeChange(event.target.value as TransactionType)}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>

            <label className="form-grid__field" htmlFor="transactionAmount">Monto</label>
            <input
              id="transactionAmount"
              className="form-grid__input"
              type="number"
              min={0.01}
              step="0.01"
              value={transactionForm.amount}
              onChange={(event) => onTransactionFormChange({ ...transactionForm, amount: Number(event.target.value) })}
              required
            />

            <label className="form-grid__field" htmlFor="transactionDate">Fecha</label>
            <input
              id="transactionDate"
              className="form-grid__input"
              type="date"
              value={transactionForm.transactionDate}
              onChange={(event) => onTransactionFormChange({ ...transactionForm, transactionDate: event.target.value })}
              required
            />

            <label className="form-grid__field" htmlFor="transactionCategory">Categoria</label>
            <select
              id="transactionCategory"
              className="form-grid__input"
              value={selectedTransactionCategoryId ?? ''}
              onChange={(event) => {
                const nextCategoryId = event.target.value ? Number(event.target.value) : null
                onTransactionFormChange({ ...transactionForm, categoryId: nextCategoryId, subcategoryId: null })
              }}
            >
              <option value="">Sin categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transactionSubcategory">Subcategoria</label>
            <select
              id="transactionSubcategory"
              className="form-grid__input"
              value={transactionForm.subcategoryId ?? ''}
              onChange={(event) => {
                const nextSubcategoryId = event.target.value ? Number(event.target.value) : null
                onTransactionFormChange({ ...transactionForm, subcategoryId: nextSubcategoryId })
              }}
              disabled={transactionSubcategoryOptions.length === 0}
            >
              <option value="">Sin subcategoria</option>
              {transactionSubcategoryOptions.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transactionDescription">Descripcion</label>
            <input
              id="transactionDescription"
              className="form-grid__input"
              type="text"
              value={transactionForm.description}
              onChange={(event) => onTransactionFormChange({ ...transactionForm, description: event.target.value })}
              placeholder="Supermercado, nomina, etc."
            />

            <label className="form-grid__field" htmlFor="transactionNotes">Notas</label>
            <input
              id="transactionNotes"
              className="form-grid__input"
              type="text"
              value={transactionForm.notes}
              onChange={(event) => onTransactionFormChange({ ...transactionForm, notes: event.target.value })}
              placeholder="Opcional"
            />

            {transactionForm.type === 'expense' && selectedTransactionInstrument?.type === 'credit_card' ? (
              <>
                <label className="form-grid__field" htmlFor="transactionIsMsi">MSI</label>
                <select
                  id="transactionIsMsi"
                  className="form-grid__input"
                  value={transactionForm.isMsi ? 'yes' : 'no'}
                  onChange={(event) => {
                    const enabled = event.target.value === 'yes'
                    onTransactionFormChange({
                      ...transactionForm,
                      isMsi: enabled,
                      msiMonths: enabled ? (transactionForm.msiMonths ?? MSI_OPTIONS[0]) : null,
                    })
                  }}
                >
                  <option value="no">No</option>
                  <option value="yes">Si</option>
                </select>

                {transactionForm.isMsi ? (
                  <>
                    <label className="form-grid__field" htmlFor="transactionMsiMonths">Meses MSI</label>
                    <select
                      id="transactionMsiMonths"
                      className="form-grid__input"
                      value={transactionForm.msiMonths ?? MSI_OPTIONS[0]}
                      onChange={(event) => {
                        onTransactionFormChange({ ...transactionForm, msiMonths: Number(event.target.value) })
                      }}
                    >
                      {MSI_OPTIONS.map((months) => (
                        <option key={months} value={months}>{months} meses</option>
                      ))}
                    </select>
                  </>
                ) : null}
              </>
            ) : null}

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}>
                {editingTransactionId === null ? 'Crear transaccion' : 'Guardar cambios'}
              </button>
              <button className="button button--secondary" type="button" onClick={onResetTransactionForm}>
                {editingTransactionId === null ? 'Limpiar' : 'Cancelar edicion'}
              </button>
            </div>
          </form>
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Filtros</h3>
            <p className="mini-card__subtitle">Refina por fecha, tipo, categoria, instrumento y texto.</p>
          </header>

          <form className="form-grid" onSubmit={onFiltersSubmit}>
            <label className="form-grid__field" htmlFor="filterFromDate">Desde</label>
            <input
              id="filterFromDate"
              className="form-grid__input"
              type="date"
              value={transactionFilters.fromDate ?? ''}
              onChange={(event) => onFiltersChange({ ...transactionFilters, fromDate: event.target.value })}
            />

            <label className="form-grid__field" htmlFor="filterToDate">Hasta</label>
            <input
              id="filterToDate"
              className="form-grid__input"
              type="date"
              value={transactionFilters.toDate ?? ''}
              onChange={(event) => onFiltersChange({ ...transactionFilters, toDate: event.target.value })}
            />

            <label className="form-grid__field" htmlFor="filterType">Tipo</label>
            <select
              id="filterType"
              className="form-grid__input"
              value={transactionFilters.type ?? ''}
              onChange={(event) => {
                const nextType = event.target.value ? (event.target.value as TransactionType) : undefined
                onFiltersChange({ ...transactionFilters, type: nextType })
              }}
            >
              <option value="">Todos</option>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>

            <label className="form-grid__field" htmlFor="filterCategory">Categoria</label>
            <select
              id="filterCategory"
              className="form-grid__input"
              value={transactionFilters.categoryId ?? ''}
              onChange={(event) => {
                const nextCategoryId = event.target.value ? Number(event.target.value) : undefined
                onFiltersChange({ ...transactionFilters, categoryId: nextCategoryId })
              }}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="filterInstrument">Instrumento</label>
            <select
              id="filterInstrument"
              className="form-grid__input"
              value={transactionFilters.instrumentId ?? ''}
              onChange={(event) => {
                const nextInstrumentId = event.target.value ? Number(event.target.value) : undefined
                onFiltersChange({ ...transactionFilters, instrumentId: nextInstrumentId })
              }}
            >
              <option value="">Todos</option>
              {instruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="filterSearch">Busqueda</label>
            <input
              id="filterSearch"
              className="form-grid__input"
              type="text"
              value={transactionFilters.search ?? ''}
              onChange={(event) => onFiltersChange({ ...transactionFilters, search: event.target.value })}
              placeholder="Descripcion, categoria o instrumento"
            />

            <label className="form-grid__field" htmlFor="filterAutoAdjustmentsOnly">Ajustes automáticos</label>
            <label className="form-grid__input" htmlFor="filterAutoAdjustmentsOnly">
              <input
                id="filterAutoAdjustmentsOnly"
                type="checkbox"
                checked={showAutoAdjustmentsOnly}
                onChange={(event) => onToggleAutoAdjustmentsOnly(event.target.checked)}
              />
              {' '}Solo mostrar Otros (por ajuste)
            </label>

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig}>
                Aplicar filtros
              </button>
              <button className="button button--secondary" type="button" onClick={onClearFilters}>
                Limpiar filtros
              </button>
              <button className="button button--secondary" type="button" onClick={onReload}>
                Recargar
              </button>
            </div>
          </form>
        </section>
      </div>

      {transactionError ? <p className="message message--error">{transactionError}</p> : null}
      {transactionMessage ? <p className="message message--success">{transactionMessage}</p> : null}
      <p className="card__subtitle">Ajustes automáticos detectados: {autoAdjustmentCount}</p>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Instrumento</th>
              <th>Categoria</th>
              <th>MSI</th>
              <th>Origen</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isTransactionsLoading ? (
              <tr>
                <td colSpan={8}>Cargando transacciones...</td>
              </tr>
            ) : null}

            {!isTransactionsLoading && transactions.length === 0 ? (
              <tr>
                <td colSpan={8}>No hay transacciones registradas.</td>
              </tr>
            ) : null}

            {!isTransactionsLoading
              ? transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transactionDate}</td>
                  <td>{transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.instrumentName ?? '-'}</td>
                  <td>
                    {transaction.categoryName ?? '-'}
                    {transaction.subcategoryName ? ` / ${transaction.subcategoryName}` : ''}
                  </td>
                  <td>{transaction.isMsi ? `${transaction.msiMonths ?? '-'} meses` : '-'}</td>
                  <td>{isAutoAdjustmentTransaction(transaction) ? 'Ajuste automatico' : 'Manual'}</td>
                  <td>
                    <div className="table__actions">
                      <button className="button button--secondary" type="button" onClick={() => onTransactionEdit(transaction)}>
                        Editar
                      </button>
                      <button className="button button--danger" type="button" onClick={() => onTransactionDelete(transaction.id)}>
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

      <div className="category-list">
        <article className="category-card">
          <header className="category-card__header">
            <div>
              <h3 className="category-card__title">Compras MSI activas</h3>
              <p className="category-card__meta">Desglose de montos mensuales de compras en meses sin intereses.</p>
            </div>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Descripcion</th>
                  <th>Instrumento</th>
                  <th>Monto total</th>
                  <th>Mensual</th>
                  <th>Meses</th>
                  <th>Inicio</th>
                </tr>
              </thead>
              <tbody>
                {activeMsiTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay compras MSI activas.</td>
                  </tr>
                ) : null}

                {activeMsiTransactions.map((transaction) => (
                  <tr key={`msi-${transaction.id}`}>
                    <td>{transaction.description ?? 'Compra MSI'}</td>
                    <td>{transaction.instrumentName ?? '-'}</td>
                    <td>{formatCurrency(transaction.amount)}</td>
                    <td>{formatCurrency(transaction.msiMonthlyAmount)}</td>
                    <td>{transaction.msiRemaining ?? transaction.msiMonths ?? '-'}</td>
                    <td>{transaction.msiStartDate ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
