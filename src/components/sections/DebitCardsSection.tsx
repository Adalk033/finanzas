import { useState, type SyntheticEvent } from 'react'
import { formatCurrency, formatIsoDate } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  ReconciliationInput,
  Transaction,
  TransactionInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

type ActionPanel = 'movement' | 'reconciliation' | null

type DebitCardsSectionProps = {
  hasConfig: boolean
  debitCardInstruments: FinancialInstrument[]
  selectedDebitCardId: number
  selectedDebitCard: FinancialInstrument | null
  debitCardMovements: Transaction[]
  movementForm: TransactionInput
  movementCategories: Category[]
  movementSubcategories: Category['subcategories']
  isDebitCardMovementsLoading: boolean
  message: string
  error: string
  onSelectDebitCard: (cardId: number) => void
  onMovementFormChange: (form: TransactionInput) => void
  onMovementSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<boolean>
  onResetMovement: () => void
  onReconcile: (payload: ReconciliationInput) => Promise<boolean>
  onReload: () => void
}

function todayIso(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function movementTypeLabel(movement: Transaction): string {
  if (movement.sourceType === 'reconciliation') return 'Conciliación'
  return movement.type === 'income' ? 'Ingreso' : 'Gasto'
}

export function DebitCardsSection({
  hasConfig,
  debitCardInstruments,
  selectedDebitCardId,
  selectedDebitCard,
  debitCardMovements,
  movementForm,
  movementCategories,
  movementSubcategories,
  isDebitCardMovementsLoading,
  message,
  error,
  onSelectDebitCard,
  onMovementFormChange,
  onMovementSubmit,
  onResetMovement,
  onReconcile,
  onReload,
}: DebitCardsSectionProps) {
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null)
  const [reconciliationBalance, setReconciliationBalance] = useState('')
  const [reconciliationDate, setReconciliationDate] = useState(todayIso)
  const [reconciliationNotes, setReconciliationNotes] = useState('Conciliación manual')

  const startReconciliation = (): void => {
    if (selectedDebitCard === null) return
    setReconciliationBalance(String(selectedDebitCard.currentAmount ?? 0))
    setReconciliationDate(todayIso())
    setReconciliationNotes('Conciliación manual')
    setActionPanel('reconciliation')
  }

  const submitReconciliation = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const actualBalance = Number(reconciliationBalance)
    if (!Number.isFinite(actualBalance) || actualBalance < 0) return
    const didReconcile = await onReconcile({
      actualBalance,
      reconciliationDate,
      notes: reconciliationNotes,
    })
    if (didReconcile) {
      setActionPanel(null)
    }
  }

  const submitMovement = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    const didCreate = await onMovementSubmit(event)
    if (didCreate) {
      setActionPanel(null)
    }
  }

  return (
    <section className="card debit-cards">
      <header className="card__header debit-cards__header">
        <div>
          <h2 className="card__title">Tarjetas de débito</h2>
          <p className="card__subtitle">Consulta el saldo disponible y concilia cada tarjeta sin pasar por Instrumentos.</p>
        </div>
        <button className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}>
          Actualizar
        </button>
      </header>

      {debitCardInstruments.length === 0 ? (
        <div className="debit-cards__empty">
          <h3>Aún no tienes tarjetas de débito</h3>
          <p>Crea una tarjeta de débito en Instrumentos y aparecerá aquí para su control diario.</p>
        </div>
      ) : (
        <>
          <div className="debit-card-picker" aria-label="Selecciona una tarjeta de débito">
            {debitCardInstruments.map((card) => (
              <button
                key={card.id}
                className={`debit-card-picker__item ${card.id === selectedDebitCardId ? 'debit-card-picker__item--active' : ''}`}
                type="button"
                onClick={() => {
                  onSelectDebitCard(card.id)
                  setActionPanel(null)
                }}
              >
                <span className="debit-card-picker__bank">{card.bankName ?? 'Tarjeta de débito'}</span>
                <strong>{card.name}</strong>
                <span>•••• {card.lastFour ?? '----'}</span>
              </button>
            ))}
          </div>

          {selectedDebitCard ? (
            <>
              <article className="debit-card-overview">
                <div className="debit-card-overview__identity">
                  <span>{selectedDebitCard.bankName ?? 'Tarjeta de débito'}</span>
                  <h3>{selectedDebitCard.name}</h3>
                  <p>Terminación {selectedDebitCard.lastFour ?? 'sin registrar'}</p>
                </div>

                <div className="debit-card-overview__balance">
                  <span>Saldo disponible</span>
                  <strong>{formatCurrency(selectedDebitCard.currentAmount)}</strong>
                  <small>{selectedDebitCard.linkedAccountName
                    ? `Compartido con ${selectedDebitCard.linkedAccountName}`
                    : 'Saldo propio de la tarjeta'}</small>
                </div>

                <dl className="debit-card-overview__details">
                  <div>
                    <dt>Cuenta vinculada</dt>
                    <dd>{selectedDebitCard.linkedAccountName ?? 'Saldo independiente'}</dd>
                  </div>
                  <div>
                    <dt>Estado</dt>
                    <dd>{selectedDebitCard.isActive ? 'Activa' : 'Archivada'}</dd>
                  </div>
                  {selectedDebitCard.notes ? (
                    <div>
                      <dt>Notas</dt>
                      <dd>{selectedDebitCard.notes}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>

              <div className="debit-card-actions">
                <button
                  className="button button--primary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => setActionPanel((current) => current === 'movement' ? null : 'movement')}
                >
                  {actionPanel === 'movement' ? 'Cerrar movimiento' : 'Registrar movimiento'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => {
                    if (actionPanel === 'reconciliation') {
                      setActionPanel(null)
                    } else {
                      startReconciliation()
                    }
                  }}
                >
                  {actionPanel === 'reconciliation' ? 'Cerrar conciliación' : 'Conciliar saldo'}
                </button>
              </div>

              {actionPanel === 'movement' ? (
                <section className="debit-card-movement-form">
                  <header>
                    <h3>Registrar movimiento</h3>
                    <p>
                      {selectedDebitCard.linkedAccountName
                        ? `El movimiento actualizará el saldo compartido con ${selectedDebitCard.linkedAccountName}.`
                        : `El movimiento actualizará el saldo de ${selectedDebitCard.name}.`}
                    </p>
                  </header>
                  <form className="form-grid" onSubmit={(event) => { void submitMovement(event) }}>
                    <label className="form-grid__field" htmlFor="debitMovementType">Tipo</label>
                    <select
                      id="debitMovementType"
                      className="form-grid__input"
                      value={movementForm.type}
                      onChange={(event) => onMovementFormChange({
                        ...movementForm,
                        type: event.target.value as TransactionInput['type'],
                        categoryId: null,
                        subcategoryId: null,
                      })}
                    >
                      <option value="expense">Gasto</option>
                      <option value="income">Ingreso</option>
                    </select>

                    <label className="form-grid__field" htmlFor="debitMovementDescription">Descripción</label>
                    <input
                      id="debitMovementDescription"
                      className="form-grid__input"
                      type="text"
                      maxLength={255}
                      value={movementForm.description}
                      onChange={(event) => onMovementFormChange({ ...movementForm, description: event.target.value })}
                      placeholder="Supermercado, nómina, retiro..."
                      required
                    />

                    <label className="form-grid__field" htmlFor="debitMovementAmount">Monto</label>
                    <NumberInput
                      id="debitMovementAmount"
                      className="form-grid__input"
                      min={0.01}
                      step="0.01"
                      value={movementForm.amount}
                      emptyValue={0}
                      onValueChange={(amount) => onMovementFormChange({ ...movementForm, amount })}
                      required
                    />

                    <label className="form-grid__field" htmlFor="debitMovementDate">Fecha</label>
                    <input
                      id="debitMovementDate"
                      className="form-grid__input"
                      type="date"
                      value={movementForm.transactionDate}
                      onChange={(event) => onMovementFormChange({ ...movementForm, transactionDate: event.target.value })}
                      required
                    />

                    <label className="form-grid__field" htmlFor="debitMovementCategory">Categoría</label>
                    <select
                      id="debitMovementCategory"
                      className="form-grid__input"
                      value={movementForm.categoryId ?? ''}
                      onChange={(event) => onMovementFormChange({
                        ...movementForm,
                        categoryId: event.target.value ? Number(event.target.value) : null,
                        subcategoryId: null,
                      })}
                    >
                      <option value="">Sin categoría</option>
                      {movementCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>

                    <label className="form-grid__field" htmlFor="debitMovementSubcategory">Subcategoría</label>
                    <select
                      id="debitMovementSubcategory"
                      className="form-grid__input"
                      value={movementForm.subcategoryId ?? ''}
                      disabled={movementForm.categoryId === null}
                      onChange={(event) => onMovementFormChange({
                        ...movementForm,
                        subcategoryId: event.target.value ? Number(event.target.value) : null,
                      })}
                    >
                      <option value="">Sin subcategoría</option>
                      {movementSubcategories.map((subcategory) => (
                        <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                      ))}
                    </select>

                    <label className="form-grid__field" htmlFor="debitMovementNotes">Notas</label>
                    <input
                      id="debitMovementNotes"
                      className="form-grid__input"
                      type="text"
                      maxLength={2000}
                      value={movementForm.notes}
                      onChange={(event) => onMovementFormChange({ ...movementForm, notes: event.target.value })}
                    />

                    <div className="form-grid__actions">
                      <button className="button button--primary" type="submit">Guardar movimiento</button>
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => {
                          onResetMovement()
                          setActionPanel(null)
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {actionPanel === 'reconciliation' ? (
                <section className="debit-card-reconciliation">
                  <header>
                    <h3>Conciliar saldo</h3>
                    <p>
                      {selectedDebitCard.linkedAccountName
                        ? `El ajuste se aplicará a la cuenta vinculada (${selectedDebitCard.linkedAccountName}) y conservará el historial.`
                        : 'Registra el saldo real para crear un ajuste que conserve el historial.'}
                    </p>
                  </header>
                  <form className="form-grid" onSubmit={(event) => { void submitReconciliation(event) }}>
                    <label className="form-grid__field" htmlFor="debitReconciliationBalance">Saldo real</label>
                    <input
                      id="debitReconciliationBalance"
                      className="form-grid__input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={reconciliationBalance}
                      onChange={(event) => setReconciliationBalance(event.target.value)}
                      required
                    />

                    <label className="form-grid__field" htmlFor="debitReconciliationDate">Fecha de conciliación</label>
                    <input
                      id="debitReconciliationDate"
                      className="form-grid__input"
                      type="date"
                      value={reconciliationDate}
                      onChange={(event) => setReconciliationDate(event.target.value)}
                      required
                    />

                    <label className="form-grid__field" htmlFor="debitReconciliationNotes">Notas</label>
                    <input
                      id="debitReconciliationNotes"
                      className="form-grid__input"
                      type="text"
                      maxLength={2000}
                      value={reconciliationNotes}
                      onChange={(event) => setReconciliationNotes(event.target.value)}
                    />

                    <div className="form-grid__actions">
                      <button className="button button--primary" type="submit">Aplicar conciliación</button>
                      <button className="button button--secondary" type="button" onClick={() => setActionPanel(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {error ? <p className="message message--error">{error}</p> : null}
              {message ? <p className="message message--success">{message}</p> : null}

              <section className="debit-card-movements">
                <header className="debit-card-movements__header">
                  <div>
                    <h3>Movimientos de la tarjeta</h3>
                    <p>Últimos movimientos registrados directamente con esta tarjeta.</p>
                  </div>
                </header>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Tipo</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isDebitCardMovementsLoading ? <tr><td colSpan={5}>Cargando movimientos...</td></tr> : null}
                      {!isDebitCardMovementsLoading && debitCardMovements.length === 0 ? (
                        <tr><td colSpan={5}>Aún no hay movimientos registrados con esta tarjeta.</td></tr>
                      ) : null}
                      {!isDebitCardMovementsLoading ? debitCardMovements.slice(0, 10).map((movement) => (
                        <tr key={movement.id}>
                          <td>{formatIsoDate(movement.transactionDate)}</td>
                          <td>{movement.description ?? 'Sin descripción'}</td>
                          <td>
                            {movement.categoryName ?? 'Sin categoría'}
                            {movement.subcategoryName ? ` / ${movement.subcategoryName}` : ''}
                          </td>
                          <td>{movementTypeLabel(movement)}</td>
                          <td className={`table__amount ${movement.type === 'income' ? 'table__amount--positive' : ''}`}>
                            {formatCurrency(movement.amount)}
                          </td>
                        </tr>
                      )) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </>
      )}
    </section>
  )
}
