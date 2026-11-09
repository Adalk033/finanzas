import { ActionButton } from '../ActionButton'
import { FormModal } from '../FormModal'
import { useState, type SyntheticEvent } from 'react'
import { FREQUENCY_LABELS, formatCurrency, formatIsoDate } from '../../app/appHelpers'
import type {
  Category,
  FinancialInstrument,
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionInput,
  RecurringIncome,
  RecurringIncomeInput,
} from '../../types/domain'
import { NumberInput } from '../NumberInput'

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
  recurringIncomes: RecurringIncome[]
  recurringIncomeForm: RecurringIncomeInput
  editingRecurringIncomeId: number | null
  recurringIncomeMessage: string
  recurringIncomeError: string
  incomeInstruments: FinancialInstrument[]
  incomeCategories: Category[]
  onRecurringIncomeFormChange: (form: RecurringIncomeInput) => void
  onRecurringIncomeSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  onRecurringIncomeReset: () => void
  onRecurringIncomeEdit: (income: RecurringIncome) => void
  onRecurringIncomeDelete: (id: number) => void
}

function formatRecurringIncomeSchedule(income: RecurringIncome): string {
  const label = FREQUENCY_LABELS[income.frequency]
  if (income.frequency === 'biweekly') {
    return income.paymentDay !== null && income.secondPaymentDay !== null
      ? `${label} · dias ${income.paymentDay} y ${income.secondPaymentDay}`
      : `${label} · cada 14 dias`
  }
  if ((income.frequency === 'monthly' || income.frequency === 'yearly') && income.paymentDay !== null) {
    return `${label} · dia ${income.paymentDay}`
  }
  return label
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
  recurringIncomes,
  recurringIncomeForm,
  editingRecurringIncomeId,
  recurringIncomeMessage,
  recurringIncomeError,
  incomeInstruments,
  incomeCategories,
  onRecurringIncomeFormChange,
  onRecurringIncomeSubmit,
  onRecurringIncomeReset,
  onRecurringIncomeEdit,
  onRecurringIncomeDelete,
}: SubscriptionsSectionProps) {
  const [isRecurringIncomeFormOpen, setIsRecurringIncomeFormOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(editingSubscriptionId !== null)
  const isFormVisible = isFormOpen || editingSubscriptionId !== null

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Suscripciones</h2>
        <p className="card__subtitle">Listado y gestion de cargos recurrentes por instrumento y ciclo.</p>
      </header>

      <div className="section-stack">
        <div className="section-toolbar">
            <ActionButton className="button button--primary" type="button" onClick={() => {
              if (editingSubscriptionId !== null) {
                onReset()
                setIsFormOpen(false)
                return
              }
              setIsFormOpen((value) => !value)
            }}
              icon={isFormVisible ? 'close' : 'plus'}
              label={isFormVisible ? 'Ocultar formulario' : 'Nueva suscripcion'}
            />
            <div className="section-toolbar__spacer" />
            <ActionButton className="button button--secondary" type="button" onClick={onReload} icon="refresh" label="Recargar" />
          </div>

          {isFormVisible ? (
            <FormModal title={editingSubscriptionId === null ? "Nueva suscripción" : "Editar suscripción"} onClose={() => { onReset(); setIsFormOpen(false) }} error={subscriptionError} message={subscriptionMessage}>
              <p className="mini-card__subtitle">Define monto, ciclo y proximo cargo esperado.</p>
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
                  {instruments.filter((instrument) => instrument.isActive).map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                  ))}
                </select>

                <label className="form-grid__field" htmlFor="subscriptionAmount">Monto</label>
                <NumberInput
                  id="subscriptionAmount"
                  className="form-grid__input"
                  min={0.01}
                  step="0.01"
                  value={subscriptionForm.amount}
                  emptyValue={0}
                  onValueChange={(amount) => onSubscriptionFormChange({ ...subscriptionForm, amount })}
                  required
                />

                <label className="form-grid__field" htmlFor="subscriptionCycle">Ciclo</label>
                <select
                  id="subscriptionCycle"
                  className="form-grid__input"
                  value={subscriptionForm.billingCycle}
                  onChange={(event) => onBillingCycleChange(event.target.value as SubscriptionBillingCycle)}
                >
                  <option value="monthly">{FREQUENCY_LABELS.monthly}</option>
                  <option value="yearly">{FREQUENCY_LABELS.yearly}</option>
                  <option value="weekly">{FREQUENCY_LABELS.weekly}</option>
                </select>

                <label className="form-grid__field" htmlFor="subscriptionBillingDay">Dia de cargo</label>
                <NumberInput
                  id="subscriptionBillingDay"
                  className="form-grid__input"
                  min={1}
                  max={31}
                  value={subscriptionForm.billingDay ?? 1}
                  emptyValue={0}
                  onValueChange={(billingDay) => onSubscriptionFormChange({ ...subscriptionForm, billingDay })}
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
                  <ActionButton className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}
                    icon="save"
                    label={editingSubscriptionId === null ? 'Crear suscripcion' : 'Guardar cambios'}
                  />
                  <ActionButton className="button button--secondary" type="button" onClick={onReset} icon="reset" label="Limpiar" />
                </div>
              </form>
            </FormModal>
          ) : null}

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
                  <td>{FREQUENCY_LABELS[subscription.billingCycle]}</td>
                  <td>{formatIsoDate(subscription.nextBilling)}</td>
                  <td>
                    <div className="table__actions">
                      <ActionButton className="button button--secondary" type="button" onClick={() => onEdit(subscription)}
                        icon="edit"
                        label="Editar"
                      />
                      <ActionButton className="button button--danger" type="button" onClick={() => onDelete(subscription.id)}
                        icon="trash"
                        label="Eliminar"
                      />
                    </div>
                  </td>
                </tr>
              ))
              : null}
          </tbody>
        </table>
      </div>

      <article className="mini-card">
        <header className="mini-card__header">
          <h3 className="mini-card__title">Ingresos recurrentes</h3>
          <p className="mini-card__subtitle">
            Genera automaticamente nomina, renta u otros ingresos programados.
          </p>
        </header>
        <div className="section-toolbar">
          <ActionButton className="button button--primary" type="button" onClick={() => { onRecurringIncomeReset(); setIsRecurringIncomeFormOpen(true) }}
            icon="plus"
            label="Nuevo ingreso recurrente"
          />
        </div>
        {isRecurringIncomeFormOpen || editingRecurringIncomeId !== null ? (
          <FormModal title={editingRecurringIncomeId === null ? "Nuevo ingreso recurrente" : "Editar ingreso recurrente"} onClose={() => { onRecurringIncomeReset(); setIsRecurringIncomeFormOpen(false) }} error={recurringIncomeError} message={recurringIncomeMessage}>
          <form className="form-grid" onSubmit={onRecurringIncomeSubmit}>
          <label className="form-grid__field" htmlFor="recurringIncomeName">Nombre</label>
          <input
            id="recurringIncomeName"
            className="form-grid__input"
            value={recurringIncomeForm.name}
            onChange={(event) => onRecurringIncomeFormChange({
              ...recurringIncomeForm,
              name: event.target.value,
            })}
            required
          />
          <label className="form-grid__field" htmlFor="recurringIncomeInstrument">Cuenta</label>
          <select
            id="recurringIncomeInstrument"
            className="form-grid__input"
            value={recurringIncomeForm.instrumentId}
            onChange={(event) => onRecurringIncomeFormChange({
              ...recurringIncomeForm,
              instrumentId: Number(event.target.value),
            })}
            required
          >
            <option value={0}>Selecciona una cuenta</option>
            {incomeInstruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
            ))}
          </select>
          <label className="form-grid__field" htmlFor="recurringIncomeCategory">Categoria</label>
          <select
            id="recurringIncomeCategory"
            className="form-grid__input"
            value={recurringIncomeForm.categoryId ?? ''}
            onChange={(event) => onRecurringIncomeFormChange({
              ...recurringIncomeForm,
              categoryId: event.target.value ? Number(event.target.value) : null,
              subcategoryId: null,
            })}
          >
            <option value="">Sin categoria</option>
            {incomeCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <label className="form-grid__field" htmlFor="recurringIncomeAmount">Monto</label>
          <NumberInput
            id="recurringIncomeAmount"
            className="form-grid__input"
            min={0.01}
            step="0.01"
            value={recurringIncomeForm.amount}
            emptyValue={0}
            onValueChange={(amount) => onRecurringIncomeFormChange({
              ...recurringIncomeForm,
              amount,
            })}
            required
          />
          <label className="form-grid__field" htmlFor="recurringIncomeFrequency">Frecuencia</label>
          <select
            id="recurringIncomeFrequency"
            className="form-grid__input"
            value={recurringIncomeForm.frequency}
            onChange={(event) => {
              const frequency = event.target.value as RecurringIncomeInput['frequency']
              onRecurringIncomeFormChange({
                ...recurringIncomeForm,
                frequency,
                paymentDay: frequency === 'biweekly' ? (recurringIncomeForm.paymentDay ?? 1) : recurringIncomeForm.paymentDay,
                secondPaymentDay: frequency === 'biweekly' ? (recurringIncomeForm.secondPaymentDay ?? 15) : null,
              })
            }}
          >
            <option value="weekly">{FREQUENCY_LABELS.weekly}</option>
            <option value="biweekly">{FREQUENCY_LABELS.biweekly}</option>
            <option value="monthly">{FREQUENCY_LABELS.monthly}</option>
            <option value="yearly">{FREQUENCY_LABELS.yearly}</option>
          </select>
          {recurringIncomeForm.frequency === 'biweekly' ? (
            <>
              <label className="form-grid__field" htmlFor="recurringIncomeFirstPaymentDay">Primer dia de pago</label>
              <NumberInput
                id="recurringIncomeFirstPaymentDay"
                className="form-grid__input"
                min={1}
                max={31}
                value={recurringIncomeForm.paymentDay}
                emptyValue={null}
                onValueChange={(paymentDay) => onRecurringIncomeFormChange({
                  ...recurringIncomeForm,
                  paymentDay,
                })}
              />
              <label className="form-grid__field" htmlFor="recurringIncomeSecondPaymentDay">Segundo dia de pago</label>
              <NumberInput
                id="recurringIncomeSecondPaymentDay"
                className="form-grid__input"
                min={1}
                max={31}
                value={recurringIncomeForm.secondPaymentDay}
                emptyValue={null}
                onValueChange={(secondPaymentDay) => onRecurringIncomeFormChange({
                  ...recurringIncomeForm,
                  secondPaymentDay,
                })}
              />
              {recurringIncomeForm.secondPaymentDay === null ? (
                <p className="mini-card__subtitle">Este registro existente seguira repitiendose cada 14 dias hasta que definas ambos dias.</p>
              ) : null}
            </>
          ) : null}
          <label className="form-grid__field" htmlFor="recurringIncomeNext">Proximo ingreso</label>
          <input
            id="recurringIncomeNext"
            className="form-grid__input"
            type="date"
            value={recurringIncomeForm.nextPayment}
            onChange={(event) => onRecurringIncomeFormChange({
              ...recurringIncomeForm,
              nextPayment: event.target.value,
            })}
            required
          />
          <div className="form-grid__actions">
            <ActionButton className="button button--primary" type="submit" disabled={!hasConfig}
              icon="save"
              label={editingRecurringIncomeId === null ? 'Crear ingreso recurrente' : 'Guardar cambios'}
            />
            <ActionButton className="button button--secondary" type="button" onClick={onRecurringIncomeReset} icon="reset" label="Limpiar" />
          </div>
        </form>
          </FormModal>
        ) : null}
        {recurringIncomeError ? <p className="message message--error">{recurringIncomeError}</p> : null}
        {recurringIncomeMessage ? <p className="message message--success">{recurringIncomeMessage}</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Cuenta</th><th>Monto</th><th>Frecuencia</th><th>Proximo</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {recurringIncomes.length === 0 ? (
                <tr><td colSpan={6}>No hay ingresos recurrentes.</td></tr>
              ) : recurringIncomes.map((income) => (
                <tr key={income.id}>
                  <td>{income.name}{income.isActive ? '' : ' · Archivado'}</td>
                  <td>{income.instrumentName ?? '-'}</td>
                  <td>{formatCurrency(income.amount)}</td>
                  <td>{formatRecurringIncomeSchedule(income)}</td>
                  <td>{formatIsoDate(income.nextPayment)}</td>
                  <td>
                    <div className="table__actions">
                      <ActionButton className="button button--secondary" type="button" onClick={() => onRecurringIncomeEdit(income)}
                        icon="edit"
                        label="Editar"
                      />
                      <ActionButton className="button button--danger" type="button" onClick={() => onRecurringIncomeDelete(income.id)}
                        icon="archive"
                        label="Archivar"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
