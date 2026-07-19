import { useState, type SyntheticEvent } from 'react'
import { formatCurrency, MSI_OPTIONS } from '../../app/appHelpers'
import type {
  Category,
  CreditCardStatement,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  Transaction,
  TransactionInput,
  Transfer,
  TransferInput,
} from '../../types/domain'

type CardTab = 'summary' | 'movements' | 'msi' | 'statements'
type ActionPanel = 'purchase' | 'payment' | null

type CreditCardsSectionProps = {
  hasConfig: boolean
  creditCardInstruments: FinancialInstrument[]
  sourceTransferInstruments: FinancialInstrument[]
  selectedCardId: number
  selectedCard: FinancialInstrument | null
  currentStatement: CreditCardStatement | null
  selectedCardStatements: CreditCardStatement[]
  selectedCardPayments: Transfer[]
  cardMovements: Transaction[]
  activeMsiPurchases: Transaction[]
  purchaseForm: TransactionInput
  purchaseCategoryOptions: Category[]
  purchaseSubcategoryOptions: Category['subcategories']
  cardPaymentForm: TransferInput
  selectedPaymentSourceId: number
  editingStatementId: number | null
  statementUpdateForm: CreditCardStatementUpdateInput
  selectedStatementDetail: CreditCardStatement | null
  statementMovements: Transaction[]
  isStatementsLoading: boolean
  isCardMovementsLoading: boolean
  isStatementMovementsLoading: boolean
  actionMessage: string
  actionError: string
  statementMessage: string
  statementError: string
  onSelectCard: (cardId: number) => void
  onPurchaseFormChange: (form: TransactionInput) => void
  onPurchaseSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onResetPurchase: () => void
  onPaymentFormChange: (form: TransferInput) => void
  onSetPaymentAmount: (amount: number | null) => void
  onPaymentSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onResetPayment: () => void
  onStatementUpdateFormChange: (form: CreditCardStatementUpdateInput) => void
  onLoadStatementMovements: (statement: CreditCardStatement) => void
  onStartStatementEdit: (statement: CreditCardStatement) => void
  onSaveStatementUpdate: () => void
  onCancelStatementUpdate: () => void
  onReload: () => void
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getStatementStatus(statement: CreditCardStatement | null): {
  label: string
  modifier: string
} {
  if (!statement) return { label: 'Sin corte pendiente', modifier: 'neutral' }
  if (statement.isPaid || statement.outstandingAmount === 0) {
    return { label: 'Pagado', modifier: 'success' }
  }
  const today = new Date().toISOString().slice(0, 10)
  if (statement.paymentDueDate < today) return { label: 'Vencido', modifier: 'error' }
  return { label: 'Pendiente', modifier: 'warning' }
}

function MovementTable({
  movements,
  isLoading,
  emptyMessage,
}: {
  movements: Transaction[]
  isLoading: boolean
  emptyMessage: string
}) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Categoría</th>
            <th>Plan</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? <tr><td colSpan={5}>Cargando movimientos...</td></tr> : null}
          {!isLoading && movements.length === 0 ? <tr><td colSpan={5}>{emptyMessage}</td></tr> : null}
          {!isLoading ? movements.map((movement) => (
            <tr key={movement.id}>
              <td>{formatDate(movement.transactionDate)}</td>
              <td>{movement.description ?? 'Sin descripción'}</td>
              <td>
                {movement.categoryName ?? 'Sin categoría'}
                {movement.subcategoryName ? ` / ${movement.subcategoryName}` : ''}
              </td>
              <td>{movement.isMsi ? `${movement.msiMonths} MSI` : 'Una exhibicion'}</td>
              <td className="table__amount">{formatCurrency(movement.amount)}</td>
            </tr>
          )) : null}
        </tbody>
      </table>
    </div>
  )
}

export function CreditCardsSection({
  hasConfig,
  creditCardInstruments,
  sourceTransferInstruments,
  selectedCardId,
  selectedCard,
  currentStatement,
  selectedCardStatements,
  selectedCardPayments,
  cardMovements,
  activeMsiPurchases,
  purchaseForm,
  purchaseCategoryOptions,
  purchaseSubcategoryOptions,
  cardPaymentForm,
  selectedPaymentSourceId,
  editingStatementId,
  statementUpdateForm,
  selectedStatementDetail,
  statementMovements,
  isStatementsLoading,
  isCardMovementsLoading,
  isStatementMovementsLoading,
  actionMessage,
  actionError,
  statementMessage,
  statementError,
  onSelectCard,
  onPurchaseFormChange,
  onPurchaseSubmit,
  onResetPurchase,
  onPaymentFormChange,
  onSetPaymentAmount,
  onPaymentSubmit,
  onResetPayment,
  onStatementUpdateFormChange,
  onLoadStatementMovements,
  onStartStatementEdit,
  onSaveStatementUpdate,
  onCancelStatementUpdate,
  onReload,
}: CreditCardsSectionProps) {
  const [activeTab, setActiveTab] = useState<CardTab>('summary')
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null)
  const statementStatus = getStatementStatus(currentStatement)

  const handleActionToggle = (nextPanel: Exclude<ActionPanel, null>): void => {
    setActionPanel((current) => current === nextPanel ? null : nextPanel)
  }

  return (
    <section className="card credit-cards">
      <header className="card__header credit-cards__header">
        <div>
          <h2 className="card__title">Tarjetas de crédito</h2>
          <p className="card__subtitle">Consulta lo que debes, registra compras y paga sin pasos innecesarios.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={onReload}>
          Actualizar
        </button>
      </header>

      {creditCardInstruments.length === 0 ? (
        <div className="credit-cards__empty">
          <h3>Aún no tienes tarjetas</h3>
          <p>Crea una tarjeta de crédito en Instrumentos para comenzar.</p>
        </div>
      ) : (
        <>
          <div className="credit-card-picker" aria-label="Selecciona una tarjeta">
            {creditCardInstruments.map((card) => (
              <button
                key={card.id}
                className={`credit-card-picker__item ${card.id === selectedCardId ? 'credit-card-picker__item--active' : ''}`}
                type="button"
                onClick={() => {
                  onSelectCard(card.id)
                  setActiveTab('summary')
                  setActionPanel(null)
                }}
              >
                <span className="credit-card-picker__bank">{card.bankName ?? 'Tarjeta'}</span>
                <strong>{card.name}</strong>
                <span>•••• {card.lastFour ?? '----'}</span>
              </button>
            ))}
          </div>

          {selectedCard ? (
            <>
              <article className="credit-card-overview">
                <div className="credit-card-overview__identity">
                  <span>{selectedCard.bankName ?? 'Tarjeta de crédito'}</span>
                  <h3>{selectedCard.name}</h3>
                  <p>Terminación {selectedCard.lastFour ?? 'sin registrar'}</p>
                </div>

                <div className="credit-card-overview__metrics">
                  <div>
                    <span>Saldo actual</span>
                    <strong>{formatCurrency(selectedCard.currentBalance)}</strong>
                  </div>
                  <div>
                    <span>Disponible</span>
                    <strong className="credit-cards__positive">{formatCurrency(selectedCard.availableCredit)}</strong>
                  </div>
                  <div>
                    <span>Limite</span>
                    <strong>{formatCurrency(selectedCard.creditLimit)}</strong>
                  </div>
                  <div>
                    <span>Ciclo</span>
                    <strong>Corte día {selectedCard.cutOffDay ?? '-'}</strong>
                    <small>Pago día {selectedCard.paymentDueDay ?? '-'}</small>
                  </div>
                </div>

                <div className="credit-card-overview__statement">
                  <span className={`status-pill status-pill--${statementStatus.modifier}`}>
                    {statementStatus.label}
                  </span>
                  <div>
                    <span>Estado pendiente</span>
                    <strong>{formatCurrency(currentStatement?.outstandingAmount ?? 0)}</strong>
                  </div>
                  <div>
                    <span>Fecha límite</span>
                    <strong>{formatDate(currentStatement?.paymentDueDate ?? null)}</strong>
                  </div>
                </div>
              </article>

              <div className="credit-card-actions">
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => handleActionToggle('purchase')}
                >
                  {actionPanel === 'purchase' ? 'Cerrar compra' : 'Registrar compra'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={sourceTransferInstruments.length === 0}
                  onClick={() => handleActionToggle('payment')}
                >
                  {actionPanel === 'payment' ? 'Cerrar pago' : 'Registrar pago'}
                </button>
              </div>

              {actionError ? <p className="message message--error">{actionError}</p> : null}
              {actionMessage ? <p className="message message--success">{actionMessage}</p> : null}

              {actionPanel === 'purchase' ? (
                <article className="credit-card-form-panel">
                  <header>
                    <h3>Registrar compra</h3>
                    <p>La compra se aplicará directamente al saldo de {selectedCard.name}.</p>
                  </header>
                  <form className="form-grid credit-card-form-panel__form" onSubmit={onPurchaseSubmit}>
                    <label className="form-grid__field" htmlFor="cardPurchaseDescription">Descripción</label>
                    <input
                      id="cardPurchaseDescription"
                      className="form-grid__input"
                      value={purchaseForm.description}
                      maxLength={255}
                      onChange={(event) => onPurchaseFormChange({ ...purchaseForm, description: event.target.value })}
                      placeholder="Supermercado, restaurante, compra en linea..."
                      required
                    />

                    <label className="form-grid__field" htmlFor="cardPurchaseAmount">Monto</label>
                    <input
                      id="cardPurchaseAmount"
                      className="form-grid__input"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={purchaseForm.amount}
                      onChange={(event) => onPurchaseFormChange({ ...purchaseForm, amount: Number(event.target.value) })}
                      required
                    />

                    <label className="form-grid__field" htmlFor="cardPurchaseDate">Fecha</label>
                    <input
                      id="cardPurchaseDate"
                      className="form-grid__input"
                      type="date"
                      value={purchaseForm.transactionDate}
                      onChange={(event) => onPurchaseFormChange({ ...purchaseForm, transactionDate: event.target.value })}
                      required
                    />

                    <label className="form-grid__field" htmlFor="cardPurchaseCategory">Categoría</label>
                    <select
                      id="cardPurchaseCategory"
                      className="form-grid__input"
                      value={purchaseForm.categoryId ?? ''}
                      onChange={(event) => onPurchaseFormChange({
                        ...purchaseForm,
                        categoryId: event.target.value ? Number(event.target.value) : null,
                        subcategoryId: null,
                      })}
                    >
                      <option value="">Sin categoría</option>
                      {purchaseCategoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>

                    {purchaseSubcategoryOptions.length > 0 ? (
                      <>
                        <label className="form-grid__field" htmlFor="cardPurchaseSubcategory">Subcategoría</label>
                        <select
                          id="cardPurchaseSubcategory"
                          className="form-grid__input"
                          value={purchaseForm.subcategoryId ?? ''}
                          onChange={(event) => onPurchaseFormChange({
                            ...purchaseForm,
                            subcategoryId: event.target.value ? Number(event.target.value) : null,
                          })}
                        >
                          <option value="">Sin subcategoría</option>
                          {purchaseSubcategoryOptions.map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                          ))}
                        </select>
                      </>
                    ) : null}

                    <label className="form-grid__checkbox" htmlFor="cardPurchaseMsi">
                      <input
                        id="cardPurchaseMsi"
                        type="checkbox"
                        checked={purchaseForm.isMsi}
                        onChange={(event) => onPurchaseFormChange({
                          ...purchaseForm,
                          isMsi: event.target.checked,
                          msiMonths: event.target.checked ? (purchaseForm.msiMonths ?? 3) : null,
                        })}
                      />
                      Compra a meses sin intereses
                    </label>

                    {purchaseForm.isMsi ? (
                      <>
                        <label className="form-grid__field" htmlFor="cardPurchaseMsiMonths">Plazo</label>
                        <select
                          id="cardPurchaseMsiMonths"
                          className="form-grid__input"
                          value={purchaseForm.msiMonths ?? 3}
                          onChange={(event) => onPurchaseFormChange({
                            ...purchaseForm,
                            msiMonths: Number(event.target.value),
                          })}
                        >
                          {MSI_OPTIONS.map((months) => (
                            <option key={months} value={months}>{months} meses</option>
                          ))}
                        </select>
                      </>
                    ) : null}

                    <div className="form-grid__actions">
                      <button className="button button--primary" type="submit" disabled={!hasConfig}>
                        Guardar compra
                      </button>
                      <button className="button button--secondary" type="button" onClick={onResetPurchase}>
                        Limpiar
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}

              {actionPanel === 'payment' ? (
                <article className="credit-card-form-panel">
                  <header>
                    <h3>Registrar pago</h3>
                    <p>El pago se asociará automáticamente al estado pendiente correspondiente.</p>
                  </header>
                  <div className="payment-presets">
                    <button type="button" onClick={() => onSetPaymentAmount(currentStatement?.minimumPayment ?? null)}>
                      <span>Mínimo</span>
                      <strong>{formatCurrency(currentStatement?.minimumPayment ?? null)}</strong>
                    </button>
                    <button type="button" onClick={() => onSetPaymentAmount(currentStatement?.noInterestPayment ?? null)}>
                      <span>Sin intereses</span>
                      <strong>{formatCurrency(currentStatement?.noInterestPayment ?? null)}</strong>
                    </button>
                    <button type="button" onClick={() => onSetPaymentAmount(currentStatement?.outstandingAmount ?? null)}>
                      <span>Estado pendiente</span>
                      <strong>{formatCurrency(currentStatement?.outstandingAmount ?? null)}</strong>
                    </button>
                    <button type="button" onClick={() => onSetPaymentAmount(selectedCard.currentBalance)}>
                      <span>Saldo total</span>
                      <strong>{formatCurrency(selectedCard.currentBalance)}</strong>
                    </button>
                  </div>
                  <form className="form-grid credit-card-form-panel__form" onSubmit={onPaymentSubmit}>
                    <label className="form-grid__field" htmlFor="cardPaymentSource">Pagar desde</label>
                    <select
                      id="cardPaymentSource"
                      className="form-grid__input"
                      value={selectedPaymentSourceId}
                      onChange={(event) => onPaymentFormChange({
                        ...cardPaymentForm,
                        sourceInstrumentId: Number(event.target.value),
                      })}
                      required
                    >
                      <option value={0}>Selecciona una cuenta</option>
                      {sourceTransferInstruments.map((instrument) => (
                        <option key={instrument.id} value={instrument.id}>
                          {instrument.name} · {formatCurrency(instrument.currentAmount)}
                        </option>
                      ))}
                    </select>

                    <label className="form-grid__field" htmlFor="cardPaymentAmount">Monto</label>
                    <input
                      id="cardPaymentAmount"
                      className="form-grid__input"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={cardPaymentForm.amount}
                      onChange={(event) => onPaymentFormChange({
                        ...cardPaymentForm,
                        amount: Number(event.target.value),
                      })}
                      required
                    />

                    <label className="form-grid__field" htmlFor="cardPaymentDate">Fecha</label>
                    <input
                      id="cardPaymentDate"
                      className="form-grid__input"
                      type="date"
                      value={cardPaymentForm.transferDate}
                      onChange={(event) => onPaymentFormChange({
                        ...cardPaymentForm,
                        transferDate: event.target.value,
                      })}
                      required
                    />

                    <div className="form-grid__actions">
                      <button className="button button--primary" type="submit" disabled={!hasConfig}>
                        Aplicar pago
                      </button>
                      <button className="button button--secondary" type="button" onClick={onResetPayment}>
                        Limpiar
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}

              <nav className="credit-card-tabs" aria-label="Detalle de tarjeta">
                {([
                  ['summary', 'Resumen'],
                  ['movements', 'Movimientos'],
                  ['msi', `MSI (${activeMsiPurchases.length})`],
                  ['statements', 'Estados'],
                ] as Array<[CardTab, string]>).map(([key, label]) => (
                  <button
                    key={key}
                    className={activeTab === key ? 'credit-card-tabs__item--active' : ''}
                    type="button"
                    onClick={() => setActiveTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {activeTab === 'summary' ? (
                <div className="credit-card-tab-content">
                  <div className="credit-card-summary-grid">
                    <article className="mini-card">
                      <h3 className="mini-card__title">Próximo pago</h3>
                      <dl className="credit-card-detail-list">
                        <div><dt>Corte</dt><dd>{formatDate(currentStatement?.cutOffDate ?? null)}</dd></div>
                        <div><dt>Fecha límite</dt><dd>{formatDate(currentStatement?.paymentDueDate ?? null)}</dd></div>
                        <div><dt>Pago mínimo</dt><dd>{formatCurrency(currentStatement?.minimumPayment ?? null)}</dd></div>
                        <div><dt>Sin intereses</dt><dd>{formatCurrency(currentStatement?.noInterestPayment ?? null)}</dd></div>
                        <div><dt>Pendiente</dt><dd>{formatCurrency(currentStatement?.outstandingAmount ?? 0)}</dd></div>
                      </dl>
                    </article>
                    <article className="mini-card">
                      <h3 className="mini-card__title">Actividad reciente</h3>
                      <MovementTable
                        movements={cardMovements.slice(0, 5)}
                        isLoading={isCardMovementsLoading}
                        emptyMessage="Todavía no hay compras en esta tarjeta."
                      />
                    </article>
                  </div>
                </div>
              ) : null}

              {activeTab === 'movements' ? (
                <div className="credit-card-tab-content">
                  <article className="mini-card">
                    <h3 className="mini-card__title">Compras y devoluciones</h3>
                    <MovementTable
                      movements={cardMovements}
                      isLoading={isCardMovementsLoading}
                      emptyMessage="No hay movimientos para esta tarjeta."
                    />
                  </article>
                  <article className="mini-card">
                    <h3 className="mini-card__title">Pagos realizados</h3>
                    <div className="table-wrap">
                      <table className="table">
                        <thead><tr><th>Fecha</th><th>Cuenta origen</th><th>Descripción</th><th>Monto</th></tr></thead>
                        <tbody>
                          {selectedCardPayments.length === 0
                            ? <tr><td colSpan={4}>No hay pagos registrados.</td></tr>
                            : selectedCardPayments.map((payment) => (
                              <tr key={payment.id}>
                                <td>{formatDate(payment.transferDate)}</td>
                                <td>{payment.sourceInstrumentName ?? '-'}</td>
                                <td>{payment.description ?? 'Pago de tarjeta'}</td>
                                <td className="table__amount table__amount--positive">{formatCurrency(payment.amount)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>
              ) : null}

              {activeTab === 'msi' ? (
                <div className="credit-card-tab-content">
                  <article className="mini-card">
                    <h3 className="mini-card__title">Compras a meses activas</h3>
                    <p className="mini-card__subtitle">Consulta la mensualidad y el plazo restante de cada compra.</p>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr><th>Compra</th><th>Fecha</th><th>Original</th><th>Mensualidad</th><th>Restantes</th></tr>
                        </thead>
                        <tbody>
                          {activeMsiPurchases.length === 0
                            ? <tr><td colSpan={5}>No tienes compras MSI activas.</td></tr>
                            : activeMsiPurchases.map((purchase) => (
                              <tr key={purchase.id}>
                                <td>{purchase.description ?? 'Compra MSI'}</td>
                                <td>{formatDate(purchase.transactionDate)}</td>
                                <td className="table__amount">{formatCurrency(purchase.amount)}</td>
                                <td className="table__amount">{formatCurrency(purchase.msiMonthlyAmount)}</td>
                                <td>{purchase.msiRemaining ?? purchase.msiMonths} de {purchase.msiMonths}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>
              ) : null}

              {activeTab === 'statements' ? (
                <div className="credit-card-tab-content">
                  {statementError ? <p className="message message--error">{statementError}</p> : null}
                  {statementMessage ? <p className="message message--success">{statementMessage}</p> : null}
                  <article className="mini-card">
                    <header className="mini-card__header">
                      <h3 className="mini-card__title">Historial de estados</h3>
                      <p className="mini-card__subtitle">Se generan automáticamente con el día de corte de la tarjeta.</p>
                    </header>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr><th>Corte</th><th>Fecha límite</th><th>Total</th><th>Pagado</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody>
                          {isStatementsLoading ? <tr><td colSpan={6}>Generando estados...</td></tr> : null}
                          {!isStatementsLoading && selectedCardStatements.length === 0
                            ? <tr><td colSpan={6}>El primer estado aparecerá después del corte.</td></tr>
                            : selectedCardStatements.map((statement) => {
                              const status = getStatementStatus(statement)
                              return (
                                <tr key={statement.id}>
                                  <td>{formatDate(statement.cutOffDate)}</td>
                                  <td>{formatDate(statement.paymentDueDate)}</td>
                                  <td className="table__amount">{formatCurrency(statement.totalAmount)}</td>
                                  <td className="table__amount">{formatCurrency(statement.paidAmount ?? 0)}</td>
                                  <td><span className={`status-pill status-pill--${status.modifier}`}>{status.label}</span></td>
                                  <td>
                                    <div className="table__actions">
                                      <button className="button button--secondary" type="button" onClick={() => onLoadStatementMovements(statement)}>
                                        Detalle
                                      </button>
                                      <button className="button button--secondary" type="button" onClick={() => onStartStatementEdit(statement)}>
                                        Ajustar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>

                    {editingStatementId !== null ? (
                      <div className="credit-card-statement-edit">
                        <h4>Ajustar datos del estado bancario</h4>
                        <div className="form-grid">
                          <label className="form-grid__field" htmlFor="statementDueDate">Fecha límite</label>
                          <input
                            id="statementDueDate"
                            className="form-grid__input"
                            type="date"
                            value={statementUpdateForm.paymentDueDate}
                            onChange={(event) => onStatementUpdateFormChange({
                              ...statementUpdateForm,
                              paymentDueDate: event.target.value,
                            })}
                          />
                          <label className="form-grid__field" htmlFor="statementMinimum">Pago minimo</label>
                          <input
                            id="statementMinimum"
                            className="form-grid__input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={statementUpdateForm.minimumPayment ?? ''}
                            onChange={(event) => onStatementUpdateFormChange({
                              ...statementUpdateForm,
                              minimumPayment: event.target.value ? Number(event.target.value) : null,
                            })}
                          />
                          <label className="form-grid__field" htmlFor="statementNoInterest">Para no generar intereses</label>
                          <input
                            id="statementNoInterest"
                            className="form-grid__input"
                            type="number"
                            min={0}
                            step="0.01"
                            value={statementUpdateForm.noInterestPayment ?? ''}
                            onChange={(event) => onStatementUpdateFormChange({
                              ...statementUpdateForm,
                              noInterestPayment: event.target.value ? Number(event.target.value) : null,
                            })}
                          />
                          <div className="form-grid__actions">
                            <button className="button button--primary" type="button" onClick={onSaveStatementUpdate}>
                              Guardar ajustes
                            </button>
                            <button className="button button--secondary" type="button" onClick={onCancelStatementUpdate}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedStatementDetail ? (
                      <div className="statement-movements">
                        <h4>Movimientos del corte {formatDate(selectedStatementDetail.cutOffDate)}</h4>
                        <MovementTable
                          movements={statementMovements}
                          isLoading={isStatementMovementsLoading}
                          emptyMessage="No hay movimientos en este estado."
                        />
                      </div>
                    ) : null}
                  </article>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  )
}
