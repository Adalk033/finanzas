import { useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type { Bank, FinancialInstrument, FinancialInstrumentInput, InstrumentType } from '../../types/domain'

type InstrumentGroup = {
  bank: Bank | undefined
  instruments: FinancialInstrument[]
}

type InstrumentsSectionProps = {
  hasConfig: boolean
  editingInstrumentId: number | null
  instrumentForm: FinancialInstrumentInput
  selectedBankId: number
  banks: Bank[]
  isInstrumentsLoading: boolean
  groupedInstruments: InstrumentGroup[]
  instrumentError: string
  instrumentMessage: string
  onInstrumentFormChange: (nextForm: FinancialInstrumentInput) => void
  onTypeChange: (nextType: InstrumentType) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (instrument: FinancialInstrument) => void
  onDelete: (instrumentId: number) => void
}

export function InstrumentsSection({
  hasConfig,
  editingInstrumentId,
  instrumentForm,
  selectedBankId,
  banks,
  isInstrumentsLoading,
  groupedInstruments,
  instrumentError,
  instrumentMessage,
  onInstrumentFormChange,
  onTypeChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onDelete,
}: InstrumentsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingInstrumentId !== null)
  const isFormVisible = isFormOpen || editingInstrumentId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Instrumentos Financieros</h2>
        <p className="card__subtitle">Gestion de TDC, TDD y cuentas agrupadas por banco.</p>
      </header>

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => {
          if (editingInstrumentId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}>
          {isFormVisible ? 'Ocultar formulario' : 'Nuevo instrumento'}
        </button>
        <div className="section-toolbar__spacer" />
        <button className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}>
          Recargar
        </button>
      </div>

      {isFormVisible ? (
        <div className="section-panel">
          <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="instrumentBank">Banco</label>
            <select
              id="instrumentBank"
              className="form-grid__input"
              value={selectedBankId}
              onChange={(event) => onInstrumentFormChange({ ...instrumentForm, bankId: Number(event.target.value) })}
              required
            >
              <option value={0}>Selecciona banco</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="instrumentName">Nombre del instrumento</label>
            <input
              id="instrumentName"
              className="form-grid__input"
              type="text"
              value={instrumentForm.name}
              onChange={(event) => onInstrumentFormChange({ ...instrumentForm, name: event.target.value })}
              placeholder="Nu Platinum"
              required
            />

            <label className="form-grid__field" htmlFor="instrumentType">Tipo</label>
            <select
              id="instrumentType"
              className="form-grid__input"
              value={instrumentForm.type}
              onChange={(event) => onTypeChange(event.target.value as InstrumentType)}
            >
              <option value="credit_card">Tarjeta de credito</option>
              <option value="debit_card">Tarjeta de debito</option>
              <option value="account">Cuenta bancaria</option>
            </select>

            <label className="form-grid__field" htmlFor="instrumentLastFour">Ultimos 4 digitos</label>
            <input
              id="instrumentLastFour"
              className="form-grid__input"
              type="text"
              value={instrumentForm.lastFour}
              maxLength={4}
              onChange={(event) => onInstrumentFormChange({ ...instrumentForm, lastFour: event.target.value })}
              placeholder="1234"
            />

            {instrumentForm.type === 'credit_card' ? (
              <>
                <label className="form-grid__field" htmlFor="creditLimit">Limite de credito</label>
                <input
                  id="creditLimit"
                  className="form-grid__input"
                  type="number"
                  step="0.01"
                  value={instrumentForm.creditLimit ?? 0}
                  onChange={(event) => onInstrumentFormChange({ ...instrumentForm, creditLimit: Number(event.target.value) })}
                  required
                />

                <label className="form-grid__field" htmlFor="currentBalance">Saldo actual</label>
                <input
                  id="currentBalance"
                  className="form-grid__input"
                  type="number"
                  step="0.01"
                  value={instrumentForm.currentBalance ?? 0}
                  onChange={(event) => onInstrumentFormChange({ ...instrumentForm, currentBalance: Number(event.target.value) })}
                />

                <label className="form-grid__field" htmlFor="cutOffDay">Dia de corte</label>
                <input
                  id="cutOffDay"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  max={31}
                  value={instrumentForm.cutOffDay ?? 1}
                  onChange={(event) => onInstrumentFormChange({ ...instrumentForm, cutOffDay: Number(event.target.value) })}
                  required
                />

                <label className="form-grid__field" htmlFor="paymentDueDay">Dia de pago</label>
                <input
                  id="paymentDueDay"
                  className="form-grid__input"
                  type="number"
                  min={1}
                  max={31}
                  value={instrumentForm.paymentDueDay ?? 1}
                  onChange={(event) => onInstrumentFormChange({ ...instrumentForm, paymentDueDay: Number(event.target.value) })}
                  required
                />
              </>
            ) : (
              <>
                <label className="form-grid__field" htmlFor="currentAmount">Saldo actual</label>
                <input
                  id="currentAmount"
                  className="form-grid__input"
                  type="number"
                  step="0.01"
                  value={instrumentForm.currentAmount ?? 0}
                  onChange={(event) => onInstrumentFormChange({ ...instrumentForm, currentAmount: Number(event.target.value) })}
                  required
                />
              </>
            )}

            <label className="form-grid__field" htmlFor="instrumentNotes">Notas</label>
            <input
              id="instrumentNotes"
              className="form-grid__input"
              type="text"
              value={instrumentForm.notes}
              onChange={(event) => onInstrumentFormChange({ ...instrumentForm, notes: event.target.value })}
              placeholder="Cuenta principal"
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || banks.length === 0}>
                {editingInstrumentId === null ? 'Crear instrumento' : 'Guardar cambios'}
              </button>
              <button className="button button--secondary" type="button" onClick={onReset}>
                Limpiar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {instrumentError ? <p className="message message--error">{instrumentError}</p> : null}
      {instrumentMessage ? <p className="message message--success">{instrumentMessage}</p> : null}

      <div className="group-list">
        {isInstrumentsLoading ? <p className="card__subtitle">Cargando instrumentos...</p> : null}
        {!isInstrumentsLoading && groupedInstruments.length === 0 ? (
          <p className="card__subtitle">No hay instrumentos registrados.</p>
        ) : null}

        {!isInstrumentsLoading
          ? groupedInstruments.map((group) => (
            <article key={group.bank?.id ?? `bank-${group.instruments[0].bankId}`} className="group-card">
              <h3 className="group-card__title">{group.bank?.name ?? 'Banco sin nombre'}</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Instrumento</th>
                      <th>Tipo</th>
                      <th>Detalle</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.instruments.map((instrument) => (
                      <tr key={instrument.id}>
                        <td>{instrument.name}</td>
                        <td>{instrument.type}</td>
                        <td>
                          {instrument.type === 'credit_card'
                            ? `Corte ${instrument.cutOffDay ?? '-'} / Pago ${instrument.paymentDueDay ?? '-'} / Limite ${formatCurrency(instrument.creditLimit)} / Saldo ${formatCurrency(instrument.currentBalance)}`
                            : `Saldo ${formatCurrency(instrument.currentAmount)}`}
                        </td>
                        <td>
                          <div className="table__actions">
                            <button className="button button--secondary" type="button" onClick={() => onEdit(instrument)}>
                              Editar
                            </button>
                            <button className="button button--danger" type="button" onClick={() => onDelete(instrument.id)}>
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))
          : null}
      </div>
    </section>
  )
}
