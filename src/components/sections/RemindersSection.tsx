import { type SyntheticEvent } from 'react'
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
  onDismissAll: () => void
  onDeletePending: () => void
  onDeleteDismissed: () => void
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
  onDismissAll,
  onDeletePending,
  onDeleteDismissed,
  onDelete,
}: RemindersSectionProps) {
  const hasDismissedReminders = reminders.some((reminder) => reminder.isDismissed)

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Recordatorios</h2>
        <p className="card__subtitle">Gestiona alertas de pago, corte, suscripciones, prestamos y personalizadas.</p>
      </header>

      {reminderMessage ? <p className="message message--success">{reminderMessage}</p> : null}
      {reminderError ? <p className="message message--error">{reminderError}</p> : null}

      <div className="section-toolbar">
        <button className="button button--primary" type="button" onClick={onReset}>
          Nuevo recordatorio
        </button>
      </div>

      <div className="reminders-layout">
        <article className="mini-card reminders-form-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">{editingReminderId === null ? 'Nuevo recordatorio' : 'Editar recordatorio'}</h3>
            <p className="mini-card__subtitle">Programa una alerta para no perder una fecha importante.</p>
          </header>

          <form className="reminder-form" onSubmit={onSubmit}>
            <label className="reminder-form__field" htmlFor="reminderTitle">
              <span>Título</span>
              <input id="reminderTitle" className="form-grid__input" type="text" value={reminderForm.title} onChange={(event) => onReminderFormChange({ ...reminderForm, title: event.target.value })} />
            </label>
            <div className="reminder-form__row">
              <label className="reminder-form__field" htmlFor="reminderDate">
                <span>Fecha</span>
                <input id="reminderDate" className="form-grid__input" type="date" value={reminderForm.reminderDate} onChange={(event) => onReminderFormChange({ ...reminderForm, reminderDate: event.target.value })} />
              </label>
              <label className="reminder-form__field" htmlFor="reminderType">
                <span>Tipo</span>
                <select id="reminderType" className="form-grid__input" value={reminderForm.type} onChange={(event) => onReminderFormChange({ ...reminderForm, type: event.target.value as ReminderType })}>
                  <option value="payment">Pago TDC</option>
                  <option value="cutoff">Corte</option>
                  <option value="subscription">Suscripción</option>
                  <option value="loan">Préstamo</option>
                  <option value="custom">Personalizado</option>
                </select>
              </label>
            </div>
            <label className="reminder-form__field" htmlFor="reminderDescription">
              <span>Descripción <small>(opcional)</small></span>
              <textarea id="reminderDescription" className="form-grid__input" rows={3} value={reminderForm.description} onChange={(event) => onReminderFormChange({ ...reminderForm, description: event.target.value })} />
            </label>
            <details className="reminder-form__advanced">
              <summary>Vincular a un registro <span>(opcional)</span></summary>
              <div className="reminder-form__row">
                <label className="reminder-form__field" htmlFor="reminderReferenceId">
                  <span>ID de referencia</span>
                  <input id="reminderReferenceId" className="form-grid__input" type="number" min={1} value={reminderForm.referenceId ?? ''} onChange={(event) => {
                    const value = event.target.value
                    onReminderFormChange({ ...reminderForm, referenceId: value ? Number.parseInt(value, 10) : null })
                  }} />
                </label>
                <label className="reminder-form__field" htmlFor="reminderReferenceType">
                  <span>Tipo de referencia</span>
                  <input id="reminderReferenceType" className="form-grid__input" type="text" value={reminderForm.referenceType} onChange={(event) => onReminderFormChange({ ...reminderForm, referenceType: event.target.value })} />
                </label>
              </div>
            </details>
            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || isRemindersLoading}>{editingReminderId === null ? 'Guardar recordatorio' : 'Actualizar recordatorio'}</button>
              <button className="button button--secondary" type="button" onClick={onReset}>Limpiar</button>
            </div>
          </form>
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
            <button
              className="button button--secondary"
              type="button"
              disabled={!hasConfig || isRemindersLoading || !reminders.some((reminder) => !reminder.isDismissed)}
              onClick={onDismissAll}
            >
              Descartar todos
            </button>
            <button
              className="button button--danger"
              type="button"
              disabled={!hasConfig || isRemindersLoading || pendingRemindersCount === 0}
              onClick={onDeletePending}
            >
              Eliminar pendientes
            </button>
            <button
              className="button button--danger"
              type="button"
              disabled={!hasConfig || isRemindersLoading || !hasDismissedReminders}
              onClick={onDeleteDismissed}
            >
              Limpiar descartados
            </button>
          </div>

          <div className="reminders-list" aria-live="polite">
            {isRemindersLoading ? <p className="reminders-list__empty">Cargando recordatorios...</p> : null}
            {!isRemindersLoading && reminders.length === 0 ? <p className="reminders-list__empty">No hay recordatorios registrados.</p> : null}
            {!isRemindersLoading ? reminders.map((reminder) => (
              <article className="reminder-item" key={reminder.id}>
                <div className="reminder-item__content">
                  <div className="reminder-item__meta"><time dateTime={reminder.reminderDate}>{reminder.reminderDate}</time><span>{getReminderTypeLabel(reminder.type)}</span></div>
                  <h4>{reminder.title}</h4>
                  {reminder.description ? <p>{reminder.description}</p> : null}
                </div>
                <div className="reminder-item__status">
                  {reminder.isDismissed ? <span className="badge badge--warning">Descartado</span> : reminder.isRead ? <span className="badge badge--success">Leído</span> : <span className="badge badge--info">Pendiente</span>}
                </div>
                <div className="reminder-item__actions">
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
              </article>
            )) : null}
          </div>
        </article>
      </div>
    </section>
  )
}
