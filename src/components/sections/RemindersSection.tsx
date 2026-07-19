import { useState, type SyntheticEvent } from 'react'
import { getReminderTypeLabel } from '../../app/appHelpers'
import type { Reminder, ReminderInput, ReminderType } from '../../types/domain'

type RemindersSectionProps = {
  hasConfig: boolean
  reminderMessage: string
  reminderError: string
  editingReminderId: number | null
  reminderForm: ReminderInput
  reminders: Reminder[]
  isRemindersLoading: boolean
  pendingRemindersCount: number
  onReminderFormChange: (nextForm: ReminderInput) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (reminder: Reminder) => void
  onMarkAsRead: (reminder: Reminder) => void
  onDismiss: (reminder: Reminder) => void
  onDelete: (reminderId: number) => void
}

export function RemindersSection({
  hasConfig,
  reminderMessage,
  reminderError,
  editingReminderId,
  reminderForm,
  reminders,
  isRemindersLoading,
  pendingRemindersCount,
  onReminderFormChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onMarkAsRead,
  onDismiss,
  onDelete,
}: RemindersSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(editingReminderId !== null)
  const isFormVisible = isFormOpen || editingReminderId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Recordatorios</h2>
        <p className="card__subtitle">Gestiona alertas de pago, corte, suscripciones, prestamos y personalizadas.</p>
      </header>

      {reminderMessage ? <p className="message message--success">{reminderMessage}</p> : null}
      {reminderError ? <p className="message message--error">{reminderError}</p> : null}

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={() => {
          if (editingReminderId !== null) {
            onReset()
            setIsFormOpen(false)
            return
          }
          setIsFormOpen((value) => !value)
        }}>
          {isFormVisible ? 'Ocultar formulario' : 'Nuevo recordatorio'}
        </button>
      </div>

      <div className="phase8-layout">
        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">{editingReminderId === null ? 'Nuevo recordatorio' : 'Editar recordatorio'}</h3>
          </header>

          {isFormVisible ? (
            <div className="section-panel">
              <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="reminderTitle">Titulo</label>
            <input
              id="reminderTitle"
              className="form-grid__input"
              type="text"
              value={reminderForm.title}
              onChange={(event) => {
                onReminderFormChange({ ...reminderForm, title: event.target.value })
              }}
            />

            <label className="form-grid__field" htmlFor="reminderDate">Fecha</label>
            <input
              id="reminderDate"
              className="form-grid__input"
              type="date"
              value={reminderForm.reminderDate}
              onChange={(event) => {
                onReminderFormChange({ ...reminderForm, reminderDate: event.target.value })
              }}
            />

            <label className="form-grid__field" htmlFor="reminderType">Tipo</label>
            <select
              id="reminderType"
              className="form-grid__input"
              value={reminderForm.type}
              onChange={(event) => {
                onReminderFormChange({ ...reminderForm, type: event.target.value as ReminderType })
              }}
            >
              <option value="payment">Pago TDC</option>
              <option value="cutoff">Corte</option>
              <option value="subscription">Suscripcion</option>
              <option value="loan">Prestamo</option>
              <option value="custom">Custom</option>
            </select>

            <label className="form-grid__field" htmlFor="reminderReferenceId">Reference ID (opcional)</label>
            <input
              id="reminderReferenceId"
              className="form-grid__input"
              type="number"
              min={1}
              value={reminderForm.referenceId ?? ''}
              onChange={(event) => {
                const value = event.target.value
                onReminderFormChange({
                  ...reminderForm,
                  referenceId: value ? Number.parseInt(value, 10) : null,
                })
              }}
            />

            <label className="form-grid__field" htmlFor="reminderReferenceType">Reference Type (opcional)</label>
            <input
              id="reminderReferenceType"
              className="form-grid__input"
              type="text"
              value={reminderForm.referenceType}
              onChange={(event) => {
                onReminderFormChange({ ...reminderForm, referenceType: event.target.value })
              }}
            />

            <label className="form-grid__field" htmlFor="reminderDescription">Descripcion</label>
            <textarea
              id="reminderDescription"
              className="form-grid__input"
              rows={3}
              value={reminderForm.description}
              onChange={(event) => {
                onReminderFormChange({ ...reminderForm, description: event.target.value })
              }}
            />

                <div className="form-grid__actions">
                  <button className="button button--primary" type="submit" disabled={!hasConfig || isRemindersLoading}>
                    {editingReminderId === null ? 'Guardar recordatorio' : 'Actualizar recordatorio'}
                  </button>
                  <button className="button button--secondary" type="button" onClick={onReset}>
                    Limpiar
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </article>

        <article className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Pendientes y acciones</h3>
            <p className="mini-card__subtitle">Pendientes no leidos: {pendingRemindersCount}</p>
          </header>

          <div className="form-grid__actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={!hasConfig || isRemindersLoading}
              onClick={onReload}
            >
              {isRemindersLoading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Titulo</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isRemindersLoading ? (
                  <tr>
                    <td colSpan={5}>Cargando recordatorios...</td>
                  </tr>
                ) : null}

                {!isRemindersLoading && reminders.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay recordatorios registrados.</td>
                  </tr>
                ) : null}

                {!isRemindersLoading
                  ? reminders.map((reminder) => (
                    <tr key={reminder.id}>
                      <td>{reminder.reminderDate}</td>
                      <td>
                        <p>{reminder.title}</p>
                        {reminder.description ? <p className="category-card__meta">{reminder.description}</p> : null}
                      </td>
                      <td>{getReminderTypeLabel(reminder.type)}</td>
                      <td>
                        {reminder.isDismissed ? (
                          <span className="badge badge--warning">Descartado</span>
                        ) : reminder.isRead ? (
                          <span className="badge badge--success">Leido</span>
                        ) : (
                          <span className="badge badge--info">Pendiente</span>
                        )}
                      </td>
                      <td>
                        <div className="table__actions">
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => {
                              onEdit(reminder)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="button button--secondary"
                            type="button"
                            disabled={reminder.isRead}
                            onClick={() => {
                              onMarkAsRead(reminder)
                            }}
                          >
                            Marcar leido
                          </button>
                          <button
                            className="button button--secondary"
                            type="button"
                            disabled={reminder.isDismissed}
                            onClick={() => {
                              onDismiss(reminder)
                            }}
                          >
                            Descartar
                          </button>
                          <button
                            className="button button--danger"
                            type="button"
                            onClick={() => {
                              onDelete(reminder.id)
                            }}
                          >
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
