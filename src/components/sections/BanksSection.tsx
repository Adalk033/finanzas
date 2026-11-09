import { ActionButton } from '../ActionButton'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
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
  const [isFormOpen, setIsFormOpen] = useState(editingBankId !== null)
  const isFormVisible = isFormOpen || editingBankId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Bancos</h2>
        <p className="card__subtitle">Alta, edicion y baja logica de entidades bancarias.</p>
      </header>

      <div className="section-toolbar">
        <ActionButton className="button button--primary" type="button" onClick={() => {
          if (editingBankId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}
          icon={isFormVisible ? 'close' : 'plus'}
          label={isFormVisible ? 'Ocultar formulario' : 'Nuevo banco'}
        />
        <div className="section-toolbar__spacer" />
        <ActionButton className="button button--secondary" type="button" disabled={!hasConfig} onClick={onReload} icon="refresh" label="Recargar" />
      </div>

      {isFormVisible ? (
        <FormModal title={editingBankId === null ? "Nuevo banco" : "Editar banco"} onClose={() => { onReset(); setIsFormOpen(false) }} error={bankError} message={bankMessage}>
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

            <div className="form-grid__actions">
              <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
                icon="save"
                label={editingBankId === null ? 'Crear banco' : 'Guardar cambios'}
              />
              <ActionButton className="button button--secondary" type="button" onClick={onReset} icon="reset" label="Limpiar" />
            </div>
          </form>
        </FormModal>
      ) : null}

      {bankError ? <p className="message message--error">{bankError}</p> : null}
      {bankMessage ? <p className="message message--success">{bankMessage}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Nombre corto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isBanksLoading ? (
              <tr>
                <td colSpan={3}>Cargando bancos...</td>
              </tr>
            ) : null}
            {!isBanksLoading && banks.length === 0 ? (
              <tr>
                <td colSpan={3}>No hay bancos registrados.</td>
              </tr>
            ) : null}
            {!isBanksLoading
              ? banks.map((bank) => (
                <tr key={bank.id}>
                  <td>{bank.name}</td>
                  <td>{bank.shortName ?? '-'}</td>
                  <td>
                    <div className="table__actions">
                      <ActionButton className="button button--secondary" type="button" onClick={() => onEdit(bank)} icon="edit" label="Editar" />
                      <ActionButton className="button button--danger" type="button" onClick={() => onDelete(bank.id)} icon="trash" label="Eliminar" />
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
