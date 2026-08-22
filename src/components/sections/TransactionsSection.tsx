import { useState, type SyntheticEvent } from 'react'
import { formatCurrency, formatIsoDate } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
  TransferInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

const AUTO_ADJUSTMENT_NOTE_PREFIX = 'AUTO_ADJUSTMENT_TRANSFER:'
const AUTO_ADJUSTMENT_DESCRIPTION = 'Otros (por ajuste)'
const NO_BALANCE_IMPACT_NOTE_PREFIX = 'NO_BALANCE_IMPACT:'

type TransactionsSectionProps = {
  hasConfig: boolean
  instruments: FinancialInstrument[]
  categories: Category[]
  transactionForm: TransactionInput
  editingTransactionId: number | null
  cardPaymentForm: TransferInput
  cardPaymentMessage: string
  cardPaymentError: string
  creditCardInstruments: FinancialInstrument[]
  compatibleCardPaymentSources: FinancialInstrument[]
  selectedCardPaymentCardId: number
  selectedCardPaymentSourceId: number
  selectedTransactionInstrumentId: number
  selectedTransactionCategoryId: number | null
  selectedTransactionInstrument: FinancialInstrument | null
  transactionSubcategoryOptions: Category['subcategories']
  transactionFilters: TransactionFilters
  excludeFromBalance: boolean
  showAutoAdjustmentsOnly: boolean
  transactions: Transaction[]
  activeMsiTransactions: Transaction[]
  transactionPagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  isTransactionsLoading: boolean
  transactionError: string
  transactionMessage: string
  onTransactionFormChange: (nextForm: TransactionInput) => void
  onCardPaymentFormChange: (nextForm: TransferInput) => void
  onCardPaymentDestinationChange: (cardId: number) => void
  onCardPaymentSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onResetCardPayment: () => void
  onTransactionTypeChange: (nextType: TransactionType) => void
  onTransactionSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<boolean>
  onTransactionEdit: (transaction: Transaction) => void
  onTransactionDelete: (transactionId: number) => void
  onResetTransactionForm: () => void
  onFiltersChange: (nextFilters: TransactionFilters) => void
  onSearchChange: (search: string) => void
  onExcludeFromBalanceChange: (nextValue: boolean) => void
  onToggleAutoAdjustmentsOnly: (nextValue: boolean) => void
  onFiltersSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onClearFilters: () => void
  onPageChange: (page: number) => void
  onReload: () => void
}

export function TransactionsSection({
  hasConfig,
  instruments,
  categories,
  transactionForm,
  editingTransactionId,
  cardPaymentForm,
  cardPaymentMessage,
  cardPaymentError,
  creditCardInstruments,
  compatibleCardPaymentSources,
  selectedCardPaymentCardId,
  selectedCardPaymentSourceId,
  selectedTransactionInstrumentId,
  selectedTransactionCategoryId,
  selectedTransactionInstrument,
  transactionSubcategoryOptions,
  transactionFilters,
  excludeFromBalance,
  showAutoAdjustmentsOnly,
  transactions,
  activeMsiTransactions,
  transactionPagination,
  isTransactionsLoading,
  transactionError,
  transactionMessage,
  onTransactionFormChange,
  onCardPaymentFormChange,
  onCardPaymentDestinationChange,
  onCardPaymentSubmit,
  onResetCardPayment,
  onTransactionTypeChange,
  onTransactionSubmit,
  onTransactionEdit,
  onTransactionDelete,
  onResetTransactionForm,
  onFiltersChange,
  onSearchChange,
  onExcludeFromBalanceChange,
  onToggleAutoAdjustmentsOnly,
  onFiltersSubmit,
  onClearFilters,
  onPageChange,
  onReload,
}: TransactionsSectionProps) {
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(editingTransactionId !== null)
  const [isCardPaymentFormOpen, setIsCardPaymentFormOpen] = useState(false)
  const [isFiltersFormOpen, setIsFiltersFormOpen] = useState(false)
  const isTransactionFormVisible = isTransactionFormOpen || editingTransactionId !== null

  const firstVisibleTransaction = transactionPagination.total === 0
    ? 0
    : ((transactionPagination.page - 1) * transactionPagination.pageSize) + 1
  const lastVisibleTransaction = Math.min(
    transactionPagination.page * transactionPagination.pageSize,
    transactionPagination.total,
  )

  const isAutoAdjustmentTransaction = (transaction: Transaction): boolean => {
    const notes = transaction.notes ?? ''
    const description = transaction.description ?? ''

    return notes.startsWith(AUTO_ADJUSTMENT_NOTE_PREFIX) || description === AUTO_ADJUSTMENT_DESCRIPTION
  }

  const isNoBalanceImpactTransaction = (transaction: Transaction): boolean => {
    return !transaction.affectsBalance
      || (transaction.notes ?? '').startsWith(NO_BALANCE_IMPACT_NOTE_PREFIX)
  }

  const handleCancelTransactionForm = (): void => {
    onResetTransactionForm()
    setIsTransactionFormOpen(false)
  }

  const handleTransactionFormSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    void onTransactionSubmit(event).then((wasSaved) => {
      if (wasSaved) {
        setIsTransactionFormOpen(false)
      }
    })
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Transacciones</h2>
        <p className="card__subtitle">Registro de gastos/ingresos, abonos a TDC, filtros y vista de MSI activas.</p>
      </header>

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => {
          if (editingTransactionId !== null) {
            handleCancelTransactionForm()
            return
          }
          setIsTransactionFormOpen((value) => !value)
        }}>
          {isTransactionFormVisible ? 'Ocultar formulario' : 'Nueva transaccion'}
        </button>
        <button className="button button--secondary" type="button" onClick={() => setIsCardPaymentFormOpen((value) => !value)}>
          {isCardPaymentFormOpen ? 'Ocultar abono' : 'Abonar a tarjeta'}
        </button>
        <button className="button button--secondary" type="button" onClick={() => setIsFiltersFormOpen((value) => !value)}>
          {isFiltersFormOpen ? 'Ocultar filtros' : 'Filtros'}
        </button>
        <div className="section-toolbar__spacer" />
        <button className="button button--secondary" type="button" onClick={onReload}>Recargar</button>
      </div>

      {isCardPaymentFormOpen ? (
        <section className="mini-card transaction-card-payment">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Abonar a tarjeta</h3>
            <p className="mini-card__subtitle">
              Elige la TDC, la cuenta de débito origen y cualquier monto. El movimiento se registrará como transferencia.
            </p>
          </header>

          {creditCardInstruments.length === 0 ? (
            <p className="message message--error">Primero registra una tarjeta de crédito en Instrumentos.</p>
          ) : null}
          {creditCardInstruments.length > 0 && compatibleCardPaymentSources.length === 0 ? (
            <p className="message message--error">No tienes una cuenta o tarjeta de débito en la misma moneda que la TDC seleccionada.</p>
          ) : null}

          <form className="form-grid" onSubmit={onCardPaymentSubmit}>
            <label className="form-grid__field" htmlFor="movementCardPaymentDestination">Tarjeta destino</label>
            <select
              id="movementCardPaymentDestination"
              className="form-grid__input"
              value={selectedCardPaymentCardId}
              onChange={(event) => onCardPaymentDestinationChange(Number(event.target.value))}
              required
            >
              <option value={0}>Selecciona una tarjeta</option>
              {creditCardInstruments.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} · Saldo {formatCurrency(card.currentBalance)}
                </option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="movementCardPaymentSource">Cuenta de débito origen</label>
            <select
              id="movementCardPaymentSource"
              className="form-grid__input"
              value={selectedCardPaymentSourceId}
              onChange={(event) => onCardPaymentFormChange({
                ...cardPaymentForm,
                sourceInstrumentId: Number(event.target.value),
              })}
              required
            >
              <option value={0}>Selecciona una cuenta</option>
              {compatibleCardPaymentSources.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.name} · Disponible {formatCurrency(instrument.currentAmount)}
                </option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="movementCardPaymentAmount">Monto del abono</label>
            <NumberInput
              id="movementCardPaymentAmount"
              className="form-grid__input"
              min={0.01}
              step="0.01"
              value={cardPaymentForm.amount}
              emptyValue={0}
              onValueChange={(amount) => onCardPaymentFormChange({ ...cardPaymentForm, amount })}
              required
            />

            <label className="form-grid__field" htmlFor="movementCardPaymentDate">Fecha</label>
            <input
              id="movementCardPaymentDate"
              className="form-grid__input"
              type="date"
              value={cardPaymentForm.transferDate}
              onChange={(event) => onCardPaymentFormChange({ ...cardPaymentForm, transferDate: event.target.value })}
              required
            />

            <label className="form-grid__field" htmlFor="movementCardPaymentDescription">Descripción</label>
            <input
              id="movementCardPaymentDescription"
              className="form-grid__input"
              value={cardPaymentForm.description}
              maxLength={255}
              onChange={(event) => onCardPaymentFormChange({ ...cardPaymentForm, description: event.target.value })}
              placeholder="Abono a tarjeta"
            />

            <div className="form-grid__actions">
              <button
                className="button button--primary"
                type="submit"
                disabled={!hasConfig || creditCardInstruments.length === 0 || compatibleCardPaymentSources.length === 0}
              >
                Aplicar abono
              </button>
              <button className="button button--secondary" type="button" onClick={onResetCardPayment}>
                Limpiar
              </button>
            </div>
          </form>

          {cardPaymentError ? <p className="message message--error">{cardPaymentError}</p> : null}
          {cardPaymentMessage ? <p className="message message--success">{cardPaymentMessage}</p> : null}
        </section>
      ) : null}

      {isTransactionFormVisible || isFiltersFormOpen ? (
        <div className="transaction-layout">
          {isTransactionFormVisible ? (
            <section className="mini-card">
              <header className="mini-card__header">
                <h3 className="mini-card__title">{editingTransactionId === null ? 'Nueva transaccion' : 'Editar transaccion'}</h3>
                <p className="mini-card__subtitle">Registra primero los datos esenciales; las opciones de tarjeta aparecen solo cuando aplican.</p>
              </header>

              <div className="section-panel">
                <form className="transaction-form" onSubmit={handleTransactionFormSubmit}>
                  <fieldset className="transaction-form__group">
                    <legend className="transaction-form__legend">Datos del movimiento</legend>
                    <p className="transaction-form__group-description">Los campos marcados con * son obligatorios.</p>
                    <div className="transaction-form__fields">
                      <div className="transaction-form__field">
                        <label className="transaction-form__label" htmlFor="transactionInstrument">
                          Instrumento <span className="transaction-form__required" aria-hidden="true">*</span>
                        </label>
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
                          {instruments.filter((instrument) => instrument.isActive).map((instrument) => (
                            <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="transaction-form__field">
                        <label className="transaction-form__label" htmlFor="transactionType">Tipo</label>
                        <select
                          id="transactionType"
                          className="form-grid__input"
                          value={transactionForm.type}
                          onChange={(event) => onTransactionTypeChange(event.target.value as TransactionType)}
                        >
                          <option value="expense">Gasto</option>
                          <option value="income">Ingreso</option>
                        </select>
                      </div>

                      <div className="transaction-form__field transaction-form__field--amount">
                        <label className="transaction-form__label" htmlFor="transactionAmount">
                          Monto <span className="transaction-form__required" aria-hidden="true">*</span>
                        </label>
                        <NumberInput
                          id="transactionAmount"
                          className="form-grid__input"
                          inputMode="decimal"
                          min={0.01}
                          step="0.01"
                          value={transactionForm.amount}
                          emptyValue={0}
                          onValueChange={(amount) => onTransactionFormChange({ ...transactionForm, amount })}
                          required
                        />
                      </div>

                      <div className="transaction-form__field">
                        <label className="transaction-form__label" htmlFor="transactionDate">
                          Fecha <span className="transaction-form__required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="transactionDate"
                          className="form-grid__input"
                          type="date"
                          value={transactionForm.transactionDate}
                          onChange={(event) => onTransactionFormChange({ ...transactionForm, transactionDate: event.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="transaction-form__group">
                    <legend className="transaction-form__legend">Clasificación y detalle</legend>
                    <div className="transaction-form__fields">
                      <div className="transaction-form__field">
                        <label className="transaction-form__label" htmlFor="transactionCategory">Categoria</label>
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
                          {categories.filter((category) => (
                            category.isActive
                            && (category.type === transactionForm.type || category.type === 'both')
                          )).map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="transaction-form__field">
                        <label className="transaction-form__label" htmlFor="transactionSubcategory">Subcategoria</label>
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
                          {transactionSubcategoryOptions.filter((subcategory) => subcategory.isActive).map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="transaction-form__field transaction-form__field--wide">
                        <label className="transaction-form__label" htmlFor="transactionDescription">Descripcion</label>
                        <input
                          id="transactionDescription"
                          className="form-grid__input"
                          type="text"
                          value={transactionForm.description}
                          onChange={(event) => onTransactionFormChange({ ...transactionForm, description: event.target.value })}
                          placeholder="Supermercado, nomina, etc."
                        />
                      </div>

                      <div className="transaction-form__field transaction-form__field--wide">
                        <label className="transaction-form__label" htmlFor="transactionNotes">Notas</label>
                        <textarea
                          id="transactionNotes"
                          className="form-grid__input"
                          value={transactionForm.notes}
                          onChange={(event) => onTransactionFormChange({ ...transactionForm, notes: event.target.value })}
                          placeholder="Opcional"
                          rows={3}
                        />
                      </div>
                    </div>
                  </fieldset>

                  {transactionForm.type === 'expense' && selectedTransactionInstrument?.type === 'credit_card' ? (
                    <fieldset className="transaction-form__group">
                      <legend className="transaction-form__legend">Opciones de tarjeta</legend>
                      <div className="transaction-form__fields">
                        <label className="transaction-form__checkbox" htmlFor="excludeFromBalance">
                          <input
                            id="excludeFromBalance"
                            type="checkbox"
                            checked={excludeFromBalance}
                            onChange={(event) => onExcludeFromBalanceChange(event.target.checked)}
                          />
                          <span>
                            <strong>No afectar saldo actual</strong>
                            <small>Úsalo solo si es un gasto histórico ya incluido en el saldo inicial.</small>
                          </span>
                        </label>

                        <div className="transaction-form__field">
                          <label className="transaction-form__label" htmlFor="transactionIsMsi">¿Es una compra a MSI?</label>
                          <select
                            id="transactionIsMsi"
                            className="form-grid__input"
                            value={transactionForm.isMsi ? 'yes' : 'no'}
                            onChange={(event) => {
                              const enabled = event.target.value === 'yes'
                              onTransactionFormChange({
                                ...transactionForm,
                                isMsi: enabled,
                                msiMonths: enabled ? (transactionForm.msiMonths ?? 3) : null,
                              })
                            }}
                          >
                            <option value="no">No</option>
                            <option value="yes">Si</option>
                          </select>
                        </div>

                        {transactionForm.isMsi ? (
                          <div className="transaction-form__field">
                            <label className="transaction-form__label" htmlFor="transactionMsiMonths">Plazo MSI</label>
                            <select
                              id="transactionMsiMonths"
                              className="form-grid__input"
                              value={transactionForm.msiMonths ?? 3}
                              onChange={(event) => {
                                const value = Number(event.target.value)
                                onTransactionFormChange({ ...transactionForm, msiMonths: value })
                              }}
                            >
                              {[3, 6, 9, 12, 18, 24].map((months) => (
                                <option key={months} value={months}>{months} meses</option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </fieldset>
                  ) : null}

                  <div className="transaction-form__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}>
                      {editingTransactionId === null ? 'Crear transaccion' : 'Guardar cambios'}
                    </button>
                    {editingTransactionId === null ? (
                      <button className="button button--secondary" type="button" onClick={onResetTransactionForm}>
                        Limpiar
                      </button>
                    ) : null}
                    <button className="button button--secondary" type="button" onClick={handleCancelTransactionForm}>
                      {editingTransactionId === null ? 'Cancelar' : 'Cancelar edicion'}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          {isFiltersFormOpen ? (
            <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Filtros</h3>
            <p className="mini-card__subtitle">Refina por fecha, tipo, categoria, instrumento y texto.</p>
          </header>

          <div className="section-panel">
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
                </div>
            </form>
          </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {transactionError ? <p className="message message--error">{transactionError}</p> : null}
      {transactionMessage ? <p className="message message--success">{transactionMessage}</p> : null}
      <div className="transaction-table-toolbar">
        <h3 className="transaction-table-toolbar__title">Movimientos</h3>
        <div className="transaction-search">
          <input
            id="movementSearch"
            className="form-grid__input transaction-search__input"
            type="search"
            value={transactionFilters.search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar"
            aria-label="Buscar movimientos"
            disabled={!hasConfig}
          />
        </div>
      </div>

      <div className="table-wrap transaction-table-wrap">
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
                  <td>{formatIsoDate(transaction.transactionDate)}</td>
                  <td>{transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.instrumentName ?? '-'}</td>
                  <td>
                    {transaction.categoryName ?? '-'}
                    {transaction.subcategoryName ? ` / ${transaction.subcategoryName}` : ''}
                  </td>
                  <td>{transaction.isMsi ? `${transaction.msiMonths ?? '-'} meses` : '-'}</td>
                  <td>
                    {transaction.sourceType === 'opening_balance'
                      ? 'Saldo inicial'
                      : transaction.sourceType === 'reconciliation'
                        ? 'Conciliacion'
                        : isAutoAdjustmentTransaction(transaction)
                      ? 'Ajuste automatico'
                      : isNoBalanceImpactTransaction(transaction)
                        ? 'Historico (sin impacto saldo)'
                        : 'Manual'}
                  </td>
                  <td>
                    {transaction.sourceType === 'opening_balance' ? (
                      <span>Gestionado desde el instrumento</span>
                    ) : (
                      <div className="table__actions">
                        <button className="button button--secondary" type="button" onClick={() => onTransactionEdit(transaction)}>
                          Editar
                        </button>
                        <button className="button button--danger" type="button" onClick={() => onTransactionDelete(transaction.id)}>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
              : null}
          </tbody>
        </table>
      </div>

      <div className="transaction-pagination">
        <p className="card__subtitle">
          {transactionPagination.total === 0
            ? 'No hay movimientos para mostrar.'
            : `Mostrando ${firstVisibleTransaction}-${lastVisibleTransaction} de ${transactionPagination.total} movimientos.`}
        </p>
        <nav className="transaction-pagination__controls" aria-label="Paginación de movimientos">
          <button
            className="button button--secondary"
            type="button"
            disabled={isTransactionsLoading || transactionPagination.page <= 1}
            onClick={() => onPageChange(transactionPagination.page - 1)}
          >
            Anterior
          </button>
          <span className="transaction-pagination__status">
            Página {transactionPagination.page} de {transactionPagination.totalPages}
          </span>
          <button
            className="button button--secondary"
            type="button"
            disabled={isTransactionsLoading || transactionPagination.page >= transactionPagination.totalPages}
            onClick={() => onPageChange(transactionPagination.page + 1)}
          >
            Siguiente
          </button>
        </nav>
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
                    <td>{formatIsoDate(transaction.msiStartDate)}</td>
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
