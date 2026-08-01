import { useState, type SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type { Bank, FinancialInstrument, FinancialInstrumentInput, InstrumentType } from '../../types/domain'
import type { ReconciliationInput } from '../../types/domain'
import { NumberInput } from '../NumberInput'

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
  onReconcile: (instrumentId: number, payload: ReconciliationInput) => Promise<boolean>
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
  onReconcile,
}: InstrumentsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingInstrumentId !== null)
  const [reconciliationInstrument, setReconciliationInstrument] = useState<FinancialInstrument | null>(null)
  const [reconciliationBalance, setReconciliationBalance] = useState('')
  const [reconciliationDate, setReconciliationDate] = useState('')
  const [reconciliationNotes, setReconciliationNotes] = useState('Conciliacion manual')
  const isFormVisible = isFormOpen || editingInstrumentId !== null
  const accountOptions = groupedInstruments
    .flatMap((group) => group.instruments)
    .filter((instrument) => instrument.type === 'account' && instrument.isActive)

  const startReconciliation = (instrument: FinancialInstrument): void => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    setReconciliationInstrument(instrument)
    setReconciliationBalance(String(
      instrument.type === 'credit_card'
        ? (instrument.currentBalance ?? 0)
        : (instrument.currentAmount ?? 0),
    ))
    setReconciliationDate(today)
    setReconciliationNotes('Conciliacion manual')
  }

  const submitReconciliation = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (reconciliationInstrument === null) return
    const actualBalance = Number(reconciliationBalance)
    if (!Number.isFinite(actualBalance) || actualBalance < 0) return
    const reconciled = await onReconcile(reconciliationInstrument.id, {
      actualBalance,
      reconciliationDate,
      notes: reconciliationNotes,
    })
    if (reconciled) {
      setReconciliationInstrument(null)
    }
  }

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
              {banks.filter((bank) => bank.isActive).map((bank) => (
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
                <NumberInput
                  id="creditLimit"
                  className="form-grid__input"
                  step="0.01"
                  value={instrumentForm.creditLimit ?? 0}
                  emptyValue={0}
                  onValueChange={(creditLimit) => onInstrumentFormChange({ ...instrumentForm, creditLimit })}
                  required
                />

                <label className="form-grid__field" htmlFor="currentBalance">Saldo actual</label>
                <NumberInput
                  id="currentBalance"
                  className="form-grid__input"
                  step="0.01"
                  value={instrumentForm.currentBalance ?? 0}
                  emptyValue={0}
                  onValueChange={(currentBalance) => onInstrumentFormChange({ ...instrumentForm, currentBalance })}
                />

                <label className="form-grid__field" htmlFor="cutOffDay">Dia de corte</label>
                <NumberInput
                  id="cutOffDay"
                  className="form-grid__input"
                  min={1}
                  max={31}
                  value={instrumentForm.cutOffDay ?? 1}
                  emptyValue={0}
                  onValueChange={(cutOffDay) => onInstrumentFormChange({ ...instrumentForm, cutOffDay })}
                  required
                />

                <label className="form-grid__field" htmlFor="paymentDueDay">Dia de pago</label>
                <NumberInput
                  id="paymentDueDay"
                  className="form-grid__input"
                  min={1}
                  max={31}
                  value={instrumentForm.paymentDueDay ?? 1}
                  emptyValue={0}
                  onValueChange={(paymentDueDay) => onInstrumentFormChange({ ...instrumentForm, paymentDueDay })}
                  required
                />
              </>
            ) : (
              <>
                <label className="form-grid__field" htmlFor="currentAmount">Saldo actual</label>
                <NumberInput
                  id="currentAmount"
                  className="form-grid__input"
                  step="0.01"
                  value={instrumentForm.currentAmount ?? 0}
                  emptyValue={0}
                  disabled={instrumentForm.type === 'debit_card' && instrumentForm.linkedAccountId !== null}
                  onValueChange={(currentAmount) => onInstrumentFormChange({ ...instrumentForm, currentAmount })}
                  required
                />
                {instrumentForm.type === 'debit_card' ? (
                  <>
                    <label className="form-grid__field" htmlFor="linkedAccount">Cuenta vinculada</label>
                    <select
                      id="linkedAccount"
                      className="form-grid__input"
                      value={instrumentForm.linkedAccountId ?? ''}
                      onChange={(event) => onInstrumentFormChange({
                        ...instrumentForm,
                        linkedAccountId: event.target.value ? Number(event.target.value) : null,
                      })}
                    >
                      <option value="">Saldo independiente</option>
                      {accountOptions.map((account) => (
                        <option key={account.id} value={account.id}>{account.name}</option>
                      ))}
                    </select>
                  </>
                ) : null}
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

      {reconciliationInstrument !== null ? (
        <div className="section-panel">
          <h3 className="card__title">Conciliar {reconciliationInstrument.name}</h3>
          <p className="card__subtitle">Registra el saldo real para crear un ajuste que conserve el historial.</p>
          <form className="form-grid" onSubmit={(event) => { void submitReconciliation(event) }}>
            <label className="form-grid__field" htmlFor="reconciliationBalance">Saldo real</label>
            <input
              id="reconciliationBalance"
              className="form-grid__input"
              type="number"
              min="0"
              step="0.01"
              value={reconciliationBalance}
              onChange={(event) => setReconciliationBalance(event.target.value)}
              required
            />

            <label className="form-grid__field" htmlFor="reconciliationDate">Fecha de conciliacion</label>
            <input
              id="reconciliationDate"
              className="form-grid__input"
              type="date"
              value={reconciliationDate}
              onChange={(event) => setReconciliationDate(event.target.value)}
              required
            />

            <label className="form-grid__field" htmlFor="reconciliationNotes">Notas</label>
            <input
              id="reconciliationNotes"
              className="form-grid__input"
              type="text"
              maxLength={2000}
              value={reconciliationNotes}
              onChange={(event) => setReconciliationNotes(event.target.value)}
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit">Aplicar conciliacion</button>
              <button className="button button--secondary" type="button" onClick={() => setReconciliationInstrument(null)}>
                Cancelar
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
                        <td>{instrument.name}{instrument.isActive ? '' : ' · Archivado'}</td>
                        <td>{instrument.type}</td>
                        <td>
                          {instrument.type === 'credit_card'
                            ? `Corte ${instrument.cutOffDay ?? '-'} / Pago ${instrument.paymentDueDay ?? '-'} / Limite ${formatCurrency(instrument.creditLimit)} / Saldo ${formatCurrency(instrument.currentBalance)}`
                            : `Saldo ${formatCurrency(instrument.currentAmount)}${instrument.linkedAccountName ? ` / Vinculada a ${instrument.linkedAccountName}` : ''}`}
                        </td>
                        <td>
                          <div className="table__actions">
                            <button className="button button--secondary" type="button" onClick={() => onEdit(instrument)}>
                              Editar
                            </button>
                            {instrument.isActive ? (
                              <button className="button button--secondary" type="button" onClick={() => startReconciliation(instrument)}>
                                Conciliar
                              </button>
                            ) : null}
                            <button className="button button--danger" type="button" onClick={() => onDelete(instrument.id)}>
                              Archivar
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
