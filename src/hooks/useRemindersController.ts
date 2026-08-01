import { useState, type SyntheticEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_REMINDER_FORM } from '../app/appHelpers'
import type { Reminder, ReminderInput } from '../types/domain'

export function useRemindersController() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isRemindersLoading, setIsRemindersLoading] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderError, setReminderError] = useState('')
  const [reminderForm, setReminderForm] = useState<ReminderInput>(EMPTY_REMINDER_FORM)
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null)
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0)

  const loadReminders = async (): Promise<void> => {
    setIsRemindersLoading(true)
    setReminderError('')

    const [allResult, pendingResult] = await Promise.all([
      apiClient.getReminders(),
      apiClient.getPendingReminders(),
    ])

    if (!allResult.success) {
      setReminderError(allResult.error ?? 'No se pudieron cargar los recordatorios.')
      setIsRemindersLoading(false)
      return
    }

    if (!pendingResult.success) {
      setReminderError(pendingResult.error ?? 'No se pudieron cargar los recordatorios pendientes.')
      setIsRemindersLoading(false)
      return
    }

    setReminders(allResult.data ?? [])
    setPendingRemindersCount((pendingResult.data ?? []).length)
    setIsRemindersLoading(false)
  }

  const resetReminderEditor = (): void => {
    setReminderForm(EMPTY_REMINDER_FORM)
    setEditingReminderId(null)
  }

  const startReminderEdit = (reminder: Reminder): void => {
    setEditingReminderId(reminder.id)
    setReminderForm({
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: reminder.isRead,
      isDismissed: reminder.isDismissed,
    })
  }

  const handleReminderSubmit = async (event: SyntheticEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setReminderError('')
    setReminderMessage('')

    if (reminderForm.title.trim().length < 2) {
      setReminderError('El titulo debe tener al menos 2 caracteres.')
      return
    }

    const payload: ReminderInput = {
      ...reminderForm,
      title: reminderForm.title.trim(),
      description: reminderForm.description.trim(),
      referenceType: reminderForm.referenceType.trim(),
    }

    if (editingReminderId === null) {
      const created = await apiClient.createReminder(payload)
      if (!created.success) {
        setReminderError(created.error ?? 'No se pudo crear el recordatorio.')
        return
      }
      setReminderMessage('Recordatorio creado correctamente.')
    } else {
      const updated = await apiClient.updateReminder(editingReminderId, payload)
      if (!updated.success) {
        setReminderError(updated.error ?? 'No se pudo actualizar el recordatorio.')
        return
      }
      setReminderMessage('Recordatorio actualizado correctamente.')
    }

    resetReminderEditor()
    await loadReminders()
  }

  const handleReminderDelete = async (reminderId: number): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const deleted = await apiClient.deleteReminder(reminderId)
    if (!deleted.success) {
      setReminderError(deleted.error ?? 'No se pudo eliminar el recordatorio.')
      return
    }

    setReminderMessage('Recordatorio eliminado correctamente.')
    if (editingReminderId === reminderId) {
      resetReminderEditor()
    }
    await loadReminders()
  }

  const handleReminderMarkAsRead = async (reminder: Reminder): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const updated = await apiClient.updateReminder(reminder.id, {
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: true,
      isDismissed: reminder.isDismissed,
    })

    if (!updated.success) {
      setReminderError(updated.error ?? 'No se pudo marcar como leido.')
      return
    }

    setReminderMessage('Recordatorio marcado como leido.')
    await loadReminders()
  }

  const handleReminderDismiss = async (reminder: Reminder): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const updated = await apiClient.updateReminder(reminder.id, {
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: reminder.isRead,
      isDismissed: true,
    })

    if (!updated.success) {
      setReminderError(updated.error ?? 'No se pudo descartar el recordatorio.')
      return
    }

    setReminderMessage('Recordatorio descartado correctamente.')
    await loadReminders()
  }

  const handleDismissAllReminders = async (): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const result = await apiClient.dismissAllReminders()
    if (!result.success) {
      setReminderError(result.error ?? 'No se pudieron descartar los recordatorios.')
      return
    }

    setReminderMessage(result.data?.dismissedCount === 1
      ? '1 recordatorio descartado correctamente.'
      : `${result.data?.dismissedCount ?? 0} recordatorios descartados correctamente.`)
    await loadReminders()
  }

  const handleDeletePendingReminders = async (): Promise<void> => {
    setReminderError('')
    setReminderMessage('')
    const wasEditingPending = reminders.some((reminder) => (
      reminder.id === editingReminderId && !reminder.isRead && !reminder.isDismissed
    ))

    const result = await apiClient.deletePendingReminders()
    if (!result.success) {
      setReminderError(result.error ?? 'No se pudieron eliminar los recordatorios pendientes.')
      return
    }

    if (wasEditingPending) resetReminderEditor()
    const deletedCount = result.data?.deletedCount ?? 0
    const dismissedCount = result.data?.dismissedCount ?? 0
    const deletedMessage = deletedCount === 1
      ? '1 recordatorio eliminado'
      : `${deletedCount} recordatorios eliminados`
    const dismissedMessage = dismissedCount === 1
      ? '1 automático descartado'
      : `${dismissedCount} automáticos descartados`
    setReminderMessage(dismissedCount > 0
      ? `${deletedMessage} y ${dismissedMessage}.`
      : `${deletedMessage} correctamente.`)
    await loadReminders()
  }

  const handleDeleteDismissedReminders = async (): Promise<void> => {
    setReminderError('')
    setReminderMessage('')
    const wasEditingDismissedReminder = reminders.some((reminder) => (
      reminder.id === editingReminderId && reminder.isDismissed
    ))

    const result = await apiClient.deleteDismissedReminders()
    if (!result.success) {
      setReminderError(result.error ?? 'No se pudieron eliminar los recordatorios descartados.')
      return
    }

    if (wasEditingDismissedReminder) resetReminderEditor()
    setReminderMessage(result.data?.deletedCount === 1
      ? '1 recordatorio descartado eliminado correctamente.'
      : `${result.data?.deletedCount ?? 0} recordatorios descartados eliminados correctamente.`)
    await loadReminders()
  }

  return {
    reminders,
    isRemindersLoading,
    reminderMessage,
    reminderError,
    reminderForm,
    editingReminderId,
    pendingRemindersCount,
    setReminderForm,
    loadReminders,
    resetReminderEditor,
    startReminderEdit,
    handleReminderSubmit,
    handleReminderDelete,
    handleReminderMarkAsRead,
    handleReminderDismiss,
    handleDismissAllReminders,
    handleDeletePendingReminders,
    handleDeleteDismissedReminders,
  }
}
