import type { SyntheticEvent } from 'react'
import { formatCurrency } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionInput,
} from '../../types/domain'

type SubscriptionsSectionProps = {
  hasConfig: boolean
  instruments: FinancialInstrument[]
  expenseCategoryOptions: Category[]
  selectedSubscriptionCategory: Category | null
  subscriptions: Subscription[]
  isSubscriptionsLoading: boolean
  subscriptionForm: SubscriptionInput
  editingSubscriptionId: number | null
  subscriptionError: string
  subscriptionMessage: string
  onSubscriptionFormChange: (nextForm: SubscriptionInput) => void
  onBillingCycleChange: (billingCycle: SubscriptionBillingCycle) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onReset: () => void
  onReload: () => void
  onEdit: (subscription: Subscription) => void
  onDelete: (subscriptionId: number) => void
}

export function SubscriptionsSection({
  hasConfig,
  instruments,
  expenseCategoryOptions,
  selectedSubscriptionCategory,
  subscriptions,
  isSubscriptionsLoading,
  subscriptionForm,
  editingSubscriptionId,
  subscriptionError,
  subscriptionMessage,
  onSubscriptionFormChange,
  onBillingCycleChange,
  onSubmit,
  onReset,
  onReload,
  onEdit,
  onDelete,
}: SubscriptionsSectionProps) {
  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Suscripciones</h2>
        <p className="card__subtitle">Listado y gestion de cargos recurrentes por instrumento y ciclo.</p>
      </header>

      <div className="transaction-layout">
        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Nueva suscripcion</h3>
            <p className="mini-card__subtitle">Define monto, ciclo y proximo cargo esperado.</p>
          </header>

          <form className="form-grid" onSubmit={onSubmit}>
            <label className="form-grid__field" htmlFor="subscriptionName">Nombre</label>
            <input
              id="subscriptionName"
              className="form-grid__input"
              type="text"
              value={subscriptionForm.name}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, name: event.target.value })}
              placeholder="Netflix"
              required
            />

            <label className="form-grid__field" htmlFor="subscriptionInstrument">Instrumento</label>
            <select
              id="subscriptionInstrument"
              className="form-grid__input"
              value={subscriptionForm.instrumentId}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, instrumentId: Number(event.target.value) })}
              required
            >
              <option value={0}>Selecciona instrumento</option>
              {instruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="subscriptionAmount">Monto</label>
            <input
              id="subscriptionAmount"
              className="form-grid__input"
              type="number"
              min={0.01}
              step="0.01"
              value={subscriptionForm.amount}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, amount: Number(event.target.value) })}
              required
            />

            <label className="form-grid__field" htmlFor="subscriptionCycle">Ciclo</label>
            <select
              id="subscriptionCycle"
              className="form-grid__input"
              value={subscriptionForm.billingCycle}
              onChange={(event) => onBillingCycleChange(event.target.value as SubscriptionBillingCycle)}
            >
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
              <option value="weekly">Semanal</option>
            </select>

            <label className="form-grid__field" htmlFor="subscriptionBillingDay">Dia de cargo</label>
            <input
              id="subscriptionBillingDay"
              className="form-grid__input"
              type="number"
              min={1}
              max={31}
              value={subscriptionForm.billingDay ?? 1}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, billingDay: Number(event.target.value) })}
            />

            <label className="form-grid__field" htmlFor="subscriptionNextBilling">Proximo cargo</label>
            <input
              id="subscriptionNextBilling"
              className="form-grid__input"
              type="date"
              value={subscriptionForm.nextBilling}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, nextBilling: event.target.value })}
            />

            <label className="form-grid__field" htmlFor="subscriptionCategory">Categoria</label>
            <select
              id="subscriptionCategory"
              className="form-grid__input"
              value={subscriptionForm.categoryId ?? ''}
              onChange={(event) => {
                const nextCategoryId = event.target.value ? Number(event.target.value) : null
                onSubscriptionFormChange({ ...subscriptionForm, categoryId: nextCategoryId, subcategoryId: null })
              }}
            >
              <option value="">Sin categoria</option>
              {expenseCategoryOptions.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="subscriptionSubcategory">Subcategoria</label>
            <select
              id="subscriptionSubcategory"
              className="form-grid__input"
              value={subscriptionForm.subcategoryId ?? ''}
              onChange={(event) => {
                const nextSubcategoryId = event.target.value ? Number(event.target.value) : null
                onSubscriptionFormChange({ ...subscriptionForm, subcategoryId: nextSubcategoryId })
              }}
              disabled={!selectedSubscriptionCategory}
            >
              <option value="">Sin subcategoria</option>
              {(selectedSubscriptionCategory?.subcategories ?? []).map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>

            <label className="form-grid__field" htmlFor="subscriptionNotes">Notas</label>
            <input
              id="subscriptionNotes"
              className="form-grid__input"
              type="text"
              value={subscriptionForm.notes}
              onChange={(event) => onSubscriptionFormChange({ ...subscriptionForm, notes: event.target.value })}
              placeholder="Opcional"
            />

            <div className="form-grid__actions">
              <button className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}>
                {editingSubscriptionId === null ? 'Crear suscripcion' : 'Guardar cambios'}
              </button>
              <button className="button button--secondary" type="button" onClick={onReset}>
                Limpiar
              </button>
              <button className="button button--secondary" type="button" onClick={onReload}>
                Recargar
              </button>
            </div>
          </form>
        </section>

        <section className="mini-card">
          <header className="mini-card__header">
            <h3 className="mini-card__title">Resumen</h3>
            <p className="mini-card__subtitle">Vista rapida del comportamiento recurrente.</p>
          </header>

          <div className="summary-grid">
            <article className="summary-card">
              <p className="summary-card__label">Suscripciones activas</p>
              <p className="summary-card__value">{subscriptions.length}</p>
            </article>
            <article className="summary-card">
              <p className="summary-card__label">Total mensual aproximado</p>
              <p className="summary-card__value">{formatCurrency(subscriptions.reduce((total, item) => total + item.amount, 0))}</p>
            </article>
          </div>
        </section>
      </div>

      {subscriptionError ? <p className="message message--error">{subscriptionError}</p> : null}
      {subscriptionMessage ? <p className="message message--success">{subscriptionMessage}</p> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Instrumento</th>
              <th>Monto</th>
              <th>Ciclo</th>
              <th>Proximo cargo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isSubscriptionsLoading ? (
              <tr>
                <td colSpan={6}>Cargando suscripciones...</td>
              </tr>
            ) : null}

            {!isSubscriptionsLoading && subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay suscripciones registradas.</td>
              </tr>
            ) : null}

            {!isSubscriptionsLoading
              ? subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td>{subscription.name}</td>
                  <td>{subscription.instrumentName ?? '-'}</td>
                  <td>{formatCurrency(subscription.amount)}</td>
                  <td>{subscription.billingCycle}</td>
                  <td>{subscription.nextBilling ?? '-'}</td>
                  <td>
                    <div className="table__actions">
                      <button className="button button--secondary" type="button" onClick={() => onEdit(subscription)}>
                        Editar
                      </button>
                      <button className="button button--danger" type="button" onClick={() => onDelete(subscription.id)}>
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
