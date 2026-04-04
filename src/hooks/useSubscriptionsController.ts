import { useMemo, useState, type FormEvent } from 'react'
import { apiClient } from '../api/client'
import { EMPTY_SUBSCRIPTION_FORM, toEditableSubscription } from '../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionInput,
} from '../types/domain'

type UseSubscriptionsControllerParams = {
  instruments: FinancialInstrument[]
  categories: Category[]
}

export function useSubscriptionsController({
  instruments,
  categories,
}: UseSubscriptionsControllerParams) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isSubscriptionsLoading, setIsSubscriptionsLoading] = useState(false)
  const [subscriptionMessage, setSubscriptionMessage] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionInput>(EMPTY_SUBSCRIPTION_FORM)
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<number | null>(null)

  const selectedSubscriptionCategory = useMemo(() => {
    if (!subscriptionForm.categoryId) {
      return null
    }

    return categories.find((category) => category.id === subscriptionForm.categoryId) ?? null
  }, [categories, subscriptionForm.categoryId])

  const loadSubscriptions = async (): Promise<void> => {
    setIsSubscriptionsLoading(true)
    setSubscriptionError('')

    const result = await apiClient.getSubscriptions()

    if (!result.success) {
      setSubscriptionError(result.error ?? 'No se pudieron cargar las suscripciones.')
      setIsSubscriptionsLoading(false)
      return
    }

    setSubscriptions(result.data ?? [])
    setIsSubscriptionsLoading(false)
  }

  const resetSubscriptionEditor = (): void => {
    setSubscriptionForm({
      ...EMPTY_SUBSCRIPTION_FORM,
      instrumentId: instruments[0]?.id ?? 0,
      categoryId: null,
      subcategoryId: null,
    })
    setEditingSubscriptionId(null)
  }

  const startSubscriptionEdit = (subscription: Subscription): void => {
    setEditingSubscriptionId(subscription.id)
    setSubscriptionForm(toEditableSubscription(subscription))
  }

  const handleSubscriptionBillingCycleChange = (billingCycle: SubscriptionBillingCycle): void => {
    setSubscriptionForm((previous) => ({
      ...previous,
      billingCycle,
      billingDay: previous.billingDay ?? 1,
    }))
  }

  const handleSubscriptionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSubscriptionError('')
    setSubscriptionMessage('')

    if (subscriptionForm.instrumentId < 1) {
      setSubscriptionError('Selecciona un instrumento valido.')
      return
    }

    if (subscriptionForm.amount <= 0) {
      setSubscriptionError('Ingresa un monto mayor a cero.')
      return
    }

    const payload: SubscriptionInput = {
      ...subscriptionForm,
      name: subscriptionForm.name.trim(),
      notes: subscriptionForm.notes.trim(),
      nextBilling: subscriptionForm.nextBilling.trim(),
    }

    if (editingSubscriptionId === null) {
      const created = await apiClient.createSubscription(payload)
      if (!created.success) {
        setSubscriptionError(created.error ?? 'No se pudo crear la suscripcion.')
        return
      }
      setSubscriptionMessage('Suscripcion creada correctamente.')
    } else {
      const updated = await apiClient.updateSubscription(editingSubscriptionId, payload)
      if (!updated.success) {
        setSubscriptionError(updated.error ?? 'No se pudo actualizar la suscripcion.')
        return
      }
      setSubscriptionMessage('Suscripcion actualizada correctamente.')
    }

    resetSubscriptionEditor()
    await loadSubscriptions()
  }

  const handleSubscriptionDelete = async (subscriptionId: number): Promise<void> => {
    setSubscriptionError('')
    setSubscriptionMessage('')

    const deleted = await apiClient.deleteSubscription(subscriptionId)
    if (!deleted.success) {
      setSubscriptionError(deleted.error ?? 'No se pudo eliminar la suscripcion.')
      return
    }

    setSubscriptionMessage('Suscripcion eliminada correctamente.')
    if (editingSubscriptionId === subscriptionId) {
      resetSubscriptionEditor()
    }
    await loadSubscriptions()
  }

  return {
    subscriptions,
    isSubscriptionsLoading,
    subscriptionMessage,
    subscriptionError,
    subscriptionForm,
    editingSubscriptionId,
    selectedSubscriptionCategory,
    setSubscriptionForm,
    loadSubscriptions,
    resetSubscriptionEditor,
    startSubscriptionEdit,
    handleSubscriptionBillingCycleChange,
    handleSubscriptionSubmit,
    handleSubscriptionDelete,
  }
}
