import type { FormEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  CreditCardStatement,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  Transfer,
  TransferInput,
  TransferType,
  Transaction,
} from '../../types/domain'

type CreditCardsSectionProps = {
  hasConfig: boolean
  totalCreditCardDebt: number
  totalAvailableCredit: number
  creditCardInstruments: FinancialInstrument[]
  sourceTransferInstruments: FinancialInstrument[]
  availableTransferDestinations: FinancialInstrument[]
  selectedStatementInstrumentId: number
  selectedTransferSourceInstrumentId: number
  selectedTransferDestinationInstrumentId: number
  selectedTransferStatementId: number | null
  statementForm: CreditCardStatementInput
  transferForm: TransferInput
  statements: CreditCardStatement[]
  transfers: Transfer[]
  statementUpdateForm: CreditCardStatementUpdateInput
  editingStatementId: number | null
  editingTransferId: number | null
  selectedStatementDetail: CreditCardStatement | null
  statementMovements: Transaction[]
  isStatementsLoading: boolean
  isTransfersLoading: boolean
  isStatementMovementsLoading: boolean
  statementError: string
  statementMessage: string
  transferError: string
  transferMessage: string
  onStatementFormChange: (nextForm: CreditCardStatementInput) => void
  onTransferFormChange: (nextForm: TransferInput) => void
  onStatementUpdateFormChange: (nextForm: CreditCardStatementUpdateInput) => void
  onTransferTypeChange: (nextType: TransferType) => void
  onStartTransferEdit: (transfer: Transfer) => void
  onStatementSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTransferSubmit: (event: FormEvent<HTMLFormElement>) => void
  onResetStatementForm: () => void
  onResetTransferForm: () => void
  onReloadStatements: () => void
  onReloadTransfers: () => void
  onLoadStatementMovements: (statement: CreditCardStatement) => void
  onStartStatementEdit: (statement: CreditCardStatement) => void
  onDeleteStatement: (statementId: number) => void
  onSaveStatementUpdate: () => void
  onCancelStatementUpdate: () => void
  onDeleteTransfer: (transferId: number) => void
}

export function CreditCardsSection({
  hasConfig,
  totalCreditCardDebt,
  totalAvailableCredit,
  creditCardInstruments,
  sourceTransferInstruments,
  availableTransferDestinations,
  selectedStatementInstrumentId,
  selectedTransferSourceInstrumentId,
  selectedTransferDestinationInstrumentId,
  selectedTransferStatementId,
  statementForm,
  transferForm,
  statements,
  transfers,
  statementUpdateForm,
  editingStatementId,
  editingTransferId,
  selectedStatementDetail,
  statementMovements,
  isStatementsLoading,
  isTransfersLoading,
  isStatementMovementsLoading,
  statementError,
  statementMessage,
  transferError,
  transferMessage,
  onStatementFormChange,
  onTransferFormChange,
  onStatementUpdateFormChange,
  onTransferTypeChange,
  onStartTransferEdit,
  onStatementSubmit,
  onTransferSubmit,
  onResetStatementForm,
  onResetTransferForm,
  onReloadStatements,
  onReloadTransfers,
  onLoadStatementMovements,
  onStartStatementEdit,
  onDeleteStatement,
  onSaveStatementUpdate,
  onCancelStatementUpdate,
  onDeleteTransfer,
}: CreditCardsSectionProps) {
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Tarjetas de Credito y Transferencias</h2>
        <p className="card__subtitle">Estados de cuenta por corte y registro de abonos/transferencias.</p>
      </header>

      <div className="summary-grid">
        <article className="summary-card">
          <p className="summary-card__label">Deuda total en tarjetas</p>
          <p className="summary-card__value">{formatCurrency(totalCreditCardDebt)}</p>
        </article>
        <article className="summary-card">
          <p className="summary-card__label">Credito disponible total</p>
          <p className="summary-card__value summary-card__value--positive">{formatCurrency(totalAvailableCredit)}</p>
        </article>
      </div>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nuevo estado de cuenta</h3>
            <p className="mini-card__subtitle">El total se calcula automaticamente con las compras del periodo.</p>
          </header>

          <form className="form-grid" onSubmit={onStatementSubmit}>
            <label className="form-grid__field" htmlFor="statementInstrument">Tarjeta</label>
            <select
              id="statementInstrument"
              className="form-grid__input"
              value={selectedStatementInstrumentId}
              onChange={(event) => onStatementFormChange({ ...statementForm, instrumentId: Number(event.target.value) })}
              required
            >
              <option value={0}>Selecciona tarjeta</option>
              {creditCardInstruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="statementCutOffDate">Fecha de corte</label>
            <input
              id="statementCutOffDate"
              className="form-grid__input"
              type="date"
              value={statementForm.cutOffDate}
              onChange={(event) => onStatementFormChange({ ...statementForm, cutOffDate: event.target.value })}
              required
            />

            <label className="form-grid__field" htmlFor="statementPaymentDueDate">Fecha de pago (opcional)</label>
            <input
              id="statementPaymentDueDate"
              className="form-grid__input"
              type="date"
              value={statementForm.paymentDueDate}
              onChange={(event) => onStatementFormChange({ ...statementForm, paymentDueDate: event.target.value })}
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || creditCardInstruments.length === 0}>
                Crear estado
              </button>
              <button className="button button--secondary" type="button" onClick={onResetStatementForm}>
                Limpiar
              </button>
              <button className="button button--secondary" type="button" onClick={onReloadStatements}>
                Recargar
              </button>
            </div>
          </form>
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nueva transferencia</h3>
            <p className="mini-card__subtitle">Abona tarjeta o mueve dinero entre cuentas propias.</p>
          </header>

          <form className="form-grid" onSubmit={onTransferSubmit}>
            <label className="form-grid__field" htmlFor="transferType">Tipo</label>
            <select
              id="transferType"
              className="form-grid__input"
              value={transferForm.type}
              onChange={(event) => onTransferTypeChange(event.target.value as TransferType)}
            >
              <option value="card_payment">Pago de tarjeta</option>
              <option value="inter_account">Entre cuentas</option>
              <option value="loan_payment">Pago de prestamo</option>
              <option value="other">Otro</option>
            </select>

            <label className="form-grid__field" htmlFor="transferSource">Origen</label>
            <select
              id="transferSource"
              className="form-grid__input"
              value={selectedTransferSourceInstrumentId}
              onChange={(event) => onTransferFormChange({ ...transferForm, sourceInstrumentId: Number(event.target.value) })}
              required
            >
              <option value={0}>Selecciona origen</option>
              {sourceTransferInstruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transferDestination">Destino</label>
            <select
              id="transferDestination"
              className="form-grid__input"
              value={selectedTransferDestinationInstrumentId}
              onChange={(event) => onTransferFormChange({ ...transferForm, destinationInstrumentId: Number(event.target.value) })}
              required
            >
              <option value={0}>Selecciona destino</option>
              {availableTransferDestinations.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            {transferForm.type === 'card_payment' ? (
              <>
                <label className="form-grid__field" htmlFor="transferStatement">Estado de cuenta</label>
                <select
                  id="transferStatement"
                  className="form-grid__input"
                  value={selectedTransferStatementId ?? ''}
                  onChange={(event) => {
                    const rawValue = event.target.value
                    onTransferFormChange({ ...transferForm, statementId: rawValue ? Number(rawValue) : null })
                  }}
                  required
                >
                  <option value="">Selecciona estado</option>
                  {statements
                    .filter((statement) => statement.instrumentId === selectedTransferDestinationInstrumentId)
                    .map((statement) => (
                      <option key={statement.id} value={statement.id}>
                        {statement.instrumentName ?? 'Tarjeta'} · Corte {statement.cutOffDate} · {formatCurrency(statement.totalAmount)}
                      </option>
                    ))}
                </select>
              </>
            ) : null}

            <label className="form-grid__field" htmlFor="transferAmount">Monto</label>
            <input
              id="transferAmount"
              className="form-grid__input"
              type="number"
              step="0.01"
              min={0.01}
              value={transferForm.amount}
              onChange={(event) => onTransferFormChange({ ...transferForm, amount: Number(event.target.value) })}
              required
            />

            <label className="form-grid__field" htmlFor="transferDate">Fecha</label>
            <input
              id="transferDate"
              className="form-grid__input"
              type="date"
              value={transferForm.transferDate}
              onChange={(event) => onTransferFormChange({ ...transferForm, transferDate: event.target.value })}
              required
            />

            <label className="form-grid__field" htmlFor="transferDescription">Descripcion</label>
            <input
              id="transferDescription"
              className="form-grid__input"
              type="text"
              value={transferForm.description}
              onChange={(event) => onTransferFormChange({ ...transferForm, description: event.target.value })}
              placeholder="Abono, movimiento interno, etc."
            />

            {transferForm.type === 'loan_payment' ? (
              <>
                <label className="form-grid__field" htmlFor="transferLoanId">ID de prestamo</label>
                <input
                  id="transferLoanId"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  value={transferForm.loanId ?? ''}
                  onChange={(event) => {
                    const rawValue = event.target.value
                    onTransferFormChange({ ...transferForm, loanId: rawValue ? Number(rawValue) : null })
                  }}
                  required
                />
              </>
            ) : null}

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || sourceTransferInstruments.length === 0}>
                {editingTransferId === null ? 'Crear transferencia' : 'Guardar transferencia'}
              </button>
              <button className="button button--secondary" type="button" onClick={onResetTransferForm}>
                {editingTransferId === null ? 'Limpiar' : 'Cancelar edicion'}
              </button>
              <button className="button button--secondary" type="button" onClick={onReloadTransfers}>
                Recargar
              </button>
            </div>
          </form>
        </section>
      </div>

      {statementError ? <p className="message message--error">{statementError}</p> : null}
      {statementMessage ? <p className="message message--success">{statementMessage}</p> : null}
      {transferError ? <p className="message message--error">{transferError}</p> : null}
      {transferMessage ? <p className="message message--success">{transferMessage}</p> : null}

      <div className="category-list">
        <article className="category-card">
          <header className="category-card__header">
            <div>
              <h3 className="category-card__title">Estados de cuenta</h3>
              <p className="category-card__meta">Detalle por corte, fecha de pago y montos calculados.</p>
            </div>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tarjeta</th>
                  <th>Corte</th>
                  <th>Pago</th>
                  <th>Total</th>
                  <th>Minimo</th>
                  <th>Sin intereses</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isStatementsLoading ? (
                  <tr>
                    <td colSpan={7}>Cargando estados...</td>
                  </tr>
                ) : null}

                {!isStatementsLoading && statements.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No hay estados de cuenta registrados.</td>
                  </tr>
                ) : null}

                {!isStatementsLoading
                  ? statements.map((statement) => (
                    <tr key={statement.id}>
                      <td>{statement.instrumentName ?? '-'}</td>
                      <td>{statement.cutOffDate}</td>
                      <td>{statement.paymentDueDate}</td>
                      <td>{formatCurrency(statement.totalAmount)}</td>
                      <td>{formatCurrency(statement.minimumPayment)}</td>
                      <td>{formatCurrency(statement.noInterestPayment)}</td>
                      <td>
                        <div className="table__actions">
                          <button className="button button--secondary" type="button" onClick={() => onLoadStatementMovements(statement)}>
                            Ver movimientos
                          </button>
                          <button className="button button--secondary" type="button" onClick={() => onStartStatementEdit(statement)}>
                            Editar pago
                          </button>
                          <button className="button button--danger" type="button" onClick={() => onDeleteStatement(statement.id)}>
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

          {editingStatementId !== null ? (
            <div className="form-grid statement-edit-form">
              <label className="form-grid__field" htmlFor="statementEditPaymentDueDate">Nueva fecha de pago</label>
              <input
                id="statementEditPaymentDueDate"
                className="form-grid__input"
                type="date"
                value={statementUpdateForm.paymentDueDate}
                onChange={(event) => onStatementUpdateFormChange({ ...statementUpdateForm, paymentDueDate: event.target.value })}
              />
              <div className="form-grid__actions">
                <button className="button button--primary" type="button" onClick={onSaveStatementUpdate}>
                  Guardar fecha
                </button>
                <button className="button button--secondary" type="button" onClick={onCancelStatementUpdate}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {selectedStatementDetail !== null ? (
            <div className="statement-movements">
              <header className="mini-card__header">
                <h4 className="mini-card__title">
                  Movimientos del corte {selectedStatementDetail.cutOffDate} · {selectedStatementDetail.instrumentName ?? 'Tarjeta'}
                </h4>
                <p className="mini-card__subtitle">Incluye compras e ingresos del periodo del estado de cuenta.</p>
              </header>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripcion</th>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isStatementMovementsLoading ? (
                      <tr>
                        <td colSpan={5}>Cargando movimientos...</td>
                      </tr>
                    ) : null}

                    {!isStatementMovementsLoading && statementMovements.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No hay movimientos para este estado de cuenta.</td>
                      </tr>
                    ) : null}

                    {!isStatementMovementsLoading
                      ? statementMovements.map((movement) => (
                        <tr key={`statement-movement-${movement.id}`}>
                          <td>{movement.transactionDate}</td>
                          <td>{movement.description ?? 'Sin descripcion'}</td>
                          <td>
                            {movement.categoryName ?? '-'}
                            {movement.subcategoryName ? ` / ${movement.subcategoryName}` : ''}
                          </td>
                          <td>{movement.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                          <td>{formatCurrency(movement.amount)}</td>
                        </tr>
                      ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </article>

        <article className="category-card">
          <header className="category-card__header">
            <div>
              <h3 className="category-card__title">Historial de transferencias</h3>
              <p className="category-card__meta">Pagos y movimientos entre instrumentos propios.</p>
            </div>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isTransfersLoading ? (
                  <tr>
                    <td colSpan={6}>Cargando transferencias...</td>
                  </tr>
                ) : null}

                {!isTransfersLoading && transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay transferencias registradas.</td>
                  </tr>
                ) : null}

                {!isTransfersLoading
                  ? transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td>{transfer.transferDate}</td>
                      <td>{transfer.type}</td>
                      <td>{transfer.sourceInstrumentName ?? '-'}</td>
                      <td>{transfer.destinationInstrumentName ?? '-'}</td>
                      <td>{formatCurrency(transfer.amount)}</td>
                      <td>
                        <div className="table__actions">
                          <button className="button button--secondary" type="button" onClick={() => onStartTransferEdit(transfer)}>
                            Editar
                          </button>
                          <button className="button button--danger" type="button" onClick={() => onDeleteTransfer(transfer.id)}>
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
