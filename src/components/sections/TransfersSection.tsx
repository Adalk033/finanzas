import type { SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  FinancialInstrument,
  Transfer,
  TransferInput,
  TransferType,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

type TransfersSectionProps = {
  hasConfig: boolean
  sourceInstruments: FinancialInstrument[]
  destinationInstruments: FinancialInstrument[]
  transfers: Transfer[]
  transferForm: TransferInput
  selectedSourceInstrumentId: number
  selectedDestinationInstrumentId: number
  editingTransferId: number | null
  isLoading: boolean
  message: string
  error: string
  onFormChange: (form: TransferInput) => void
  onTypeChange: (type: TransferType) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (transfer: Transfer) => void
  onDelete: (transferId: number) => void
}

const TRANSFER_TYPE_LABELS: Record<'inter_account' | 'other', string> = {
  inter_account: 'Entre mis cuentas',
  other: 'Otro movimiento',
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function TransfersSection({
  hasConfig,
  sourceInstruments,
  destinationInstruments,
  transfers,
  transferForm,
  selectedSourceInstrumentId,
  selectedDestinationInstrumentId,
  editingTransferId,
  isLoading,
  message,
  error,
  onFormChange,
  onTypeChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onDelete,
}: TransfersSectionProps) {
  const visibleTransfers = transfers.filter(
    (transfer) => transfer.type === 'inter_account' || transfer.type === 'other',
  )

  return (
    <section className="card transfers">
      <header className="card__header transfers__header">
        <div>
          <h2 className="card__title">Transferencias</h2>
          <p className="card__subtitle">
            Mueve dinero entre tus cuentas. Los pagos de tarjeta se registran directamente desde Tarjetas.
          </p>
        </div>
        <button className="button button--secondary" type="button" onClick={onReload}>
          Actualizar
        </button>
      </header>

      <div className="transfers__layout">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">
              {editingTransferId === null ? 'Nueva transferencia' : 'Editar transferencia'}
            </h3>
            <p className="mini-card__subtitle">
              El saldo se descuenta del origen y se aplica al destino en una sola operación.
            </p>
          </header>

          <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="transferType">Tipo</label>
            <select
              id="transferType"
              className="form-grid__input"
              value={transferForm.type === 'other' ? 'other' : 'inter_account'}
              onChange={(event) => onTypeChange(event.target.value as 'inter_account' | 'other')}
            >
              <option value="inter_account">Entre mis cuentas</option>
              <option value="other">Otro movimiento</option>
            </select>

            <label className="form-grid__field" htmlFor="transferSource">Cuenta de origen</label>
            <select
              id="transferSource"
              className="form-grid__input"
              value={selectedSourceInstrumentId}
              onChange={(event) => onFormChange({
                ...transferForm,
                sourceInstrumentId: Number(event.target.value),
                destinationInstrumentId: 0,
              })}
              required
            >
              <option value={0}>Selecciona una cuenta</option>
              {sourceInstruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.name} · {formatCurrency(instrument.currentAmount)}
                </option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transferDestination">Cuenta de destino</label>
            <select
              id="transferDestination"
              className="form-grid__input"
              value={selectedDestinationInstrumentId}
              onChange={(event) => onFormChange({
                ...transferForm,
                destinationInstrumentId: Number(event.target.value),
              })}
              required
            >
              <option value={0}>Selecciona una cuenta</option>
              {destinationInstruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.name}
                </option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="transferAmount">Monto</label>
            <NumberInput
              id="transferAmount"
              className="form-grid__input"
              min={0.01}
              step="0.01"
              value={transferForm.amount}
              emptyValue={0}
              onValueChange={(amount) => onFormChange({
                ...transferForm,
                amount,
              })}
              required
            />

            <label className="form-grid__field" htmlFor="transferDate">Fecha</label>
            <input
              id="transferDate"
              className="form-grid__input"
              type="date"
              value={transferForm.transferDate}
              onChange={(event) => onFormChange({
                ...transferForm,
                transferDate: event.target.value,
              })}
              required
            />

            <label className="form-grid__field" htmlFor="transferDescription">Descripción</label>
            <input
              id="transferDescription"
              className="form-grid__input"
              value={transferForm.description}
              maxLength={255}
              onChange={(event) => onFormChange({
                ...transferForm,
                description: event.target.value,
              })}
              placeholder="Ahorro, fondo de emergencia..."
            />

            <label className="form-grid__field" htmlFor="transferNotes">Notas</label>
            <textarea
              id="transferNotes"
              className="form-grid__input"
              value={transferForm.notes}
              maxLength={2000}
              rows={3}
              onChange={(event) => onFormChange({
                ...transferForm,
                notes: event.target.value,
              })}
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig}>
                {editingTransferId === null ? 'Registrar transferencia' : 'Guardar cambios'}
              </button>
              <button className="button button--secondary" type="button" onClick={onReset}>
                {editingTransferId === null ? 'Limpiar' : 'Cancelar'}
              </button>
            </div>
          </form>

          {error ? <p className="message message--error">{error}</p> : null}
          {message ? <p className="message message--success">{message}</p> : null}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Historial</h3>
            <p className="mini-card__subtitle">
              Editar o eliminar revierte primero el movimiento anterior para mantener los saldos correctos.
            </p>
          </header>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Movimiento</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={5}>Cargando transferencias...</td></tr> : null}
                {!isLoading && visibleTransfers.length === 0
                  ? <tr><td colSpan={5}>Todavía no hay transferencias entre cuentas.</td></tr>
                  : null}
                {!isLoading ? visibleTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{formatDate(transfer.transferDate)}</td>
                    <td>
                      <strong>{transfer.sourceInstrumentName ?? '-'}</strong>
                      <span className="transfers__route">a {transfer.destinationInstrumentName ?? '-'}</span>
                    </td>
                    <td>
                      {transfer.description ?? 'Sin descripción'}
                      <span className="transfers__type">
                        {TRANSFER_TYPE_LABELS[transfer.type as 'inter_account' | 'other']}
                      </span>
                    </td>
                    <td className="table__amount">{formatCurrency(transfer.amount)}</td>
                    <td>
                      <div className="table__actions">
                        <button className="button button--secondary" type="button" onClick={() => onEdit(transfer)}>
                          Editar
                        </button>
                        <button className="button button--danger" type="button" onClick={() => onDelete(transfer.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}
