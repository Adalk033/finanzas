import type { SyntheticEvent } from 'react'
import type { Bank, BankInput } from '../../types/domain'

type BanksSectionProps = {
  hasConfig: boolean
  editingBankId: number | null
  bankForm: BankInput
  isBanksLoading: boolean
  banks: Bank[]
  bankError: string
  bankMessage: string
  onBankFormChange: (nextForm: BankInput) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (bank: Bank) => void
  onDelete: (bankId: number) => void
}

export function BanksSection({
  hasConfig,
  editingBankId,
  bankForm,
  isBanksLoading,
  banks,
  bankError,
  bankMessage,
  onBankFormChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onDelete,
}: BanksSectionProps) {
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Bancos</h2>
        <p className="card__subtitle">Alta, edicion y baja logica de entidades bancarias.</p>
      </header>

      <form className="form-grid" onSubmit={onSubmit}>
        <label className="form-grid__field" htmlFor="bankName">Nombre del banco</label>
        <input
          id="bankName"
          className="form-grid__input"
          type="text"
          value={bankForm.name}
          onChange={(event) => onBankFormChange({ ...bankForm, name: event.target.value })}
          placeholder="BBVA"
          required
        />

        <label className="form-grid__field" htmlFor="bankShortName">Nombre corto</label>
        <input
          id="bankShortName"
          className="form-grid__input"
          type="text"
          value={bankForm.shortName}
          onChange={(event) => onBankFormChange({ ...bankForm, shortName: event.target.value })}
          placeholder="BBVA"
        />

        <label className="form-grid__field" htmlFor="bankColor">Color Hex</label>
        <input
          id="bankColor"
          className="form-grid__input"
          type="text"
          value={bankForm.color}
          onChange={(event) => onBankFormChange({ ...bankForm, color: event.target.value })}
          placeholder="#0057B8"
        />

        <label className="form-grid__field" htmlFor="bankIcon">Icono (Lucide)</label>
        <input
          id="bankIcon"
          className="form-grid__input"
          type="text"
          value={bankForm.iconName}
          onChange={(event) => onBankFormChange({ ...bankForm, iconName: event.target.value })}
          placeholder="Landmark"
        />

        <div className="form-grid__actions">
          <button className="button button--primary" type="submit" disabled={!hasConfig}>
            {editingBankId === null ? 'Crear banco' : 'Guardar cambios'}
          </button>
          <button className="button button--secondary" type="button" onClick={onReset}>
            Limpiar
          </button>
          <button className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload}>
            Recargar
          </button>
        </div>
      </form>

      {bankError ? <p className="message message--error">{bankError}</p> : null}
      {bankMessage ? <p className="message message--success">{bankMessage}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nombre corto</th>
              <th>Color</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isBanksLoading ? (
              <tr>
                <td colSpan={4}>Cargando bancos...</td>
              </tr>
            ) : null}
            {!isBanksLoading && banks.length === 0 ? (
              <tr>
                <td colSpan={4}>No hay bancos registrados.</td>
              </tr>
            ) : null}
            {!isBanksLoading
              ? banks.map((bank) => (
                <tr key={bank.id}>
                  <td>{bank.name}</td>
                  <td>{bank.shortName ?? '-'}</td>
                  <td>{bank.color ?? '-'}</td>
                  <td>
                    <div className="table__actions">
                      <button className="button button--secondary" type="button" onClick={() => onEdit(bank)}>
                        Editar
                      </button>
                      <button className="button button--danger" type="button" onClick={() => onDelete(bank.id)}>
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
    </section>
  )
}
