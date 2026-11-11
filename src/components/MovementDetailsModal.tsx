import type { ReactNode } from 'react'
import { formatCurrency, formatIsoDate } from '../app/appHelpers'
import type { Movement, Transaction } from '../types/domain'
import { FormModal } from './FormModal'
import './MovementDetailsModal.css'

type MovementDetailsModalProps = {
  movement: Movement
  onClose: () => void
}

function getTransactionOrigin(transaction: Transaction): string {
  if (transaction.sourceType === 'opening_balance') return 'Saldo inicial'
  if (transaction.sourceType === 'reconciliation') return 'Conciliación'
  if ((transaction.notes ?? '').startsWith('AUTO_ADJUSTMENT_TRANSFER:')
    || transaction.description === 'Otros (por ajuste)') return 'Ajuste automático'
  if (!transaction.affectsBalance || (transaction.notes ?? '').startsWith('NO_BALANCE_IMPACT:')) {
    return 'Histórico (sin impacto en saldo)'
  }
  if (transaction.sourceType === 'fixed_expense') return 'Gasto fijo'
  if (transaction.sourceType === 'loan_interest') return 'Intereses de préstamo'
  if (transaction.sourceType === 'csv_import') return 'Importación de CSV'
  return 'Manual'
}

export function MovementDetailsModal({ movement, onClose }: MovementDetailsModalProps) {
  const isCardPayment = 'transferDate' in movement
  const fields: Array<[string, ReactNode]> = [
    ['Fecha', formatIsoDate(isCardPayment ? movement.transferDate : movement.transactionDate)],
    ['Tipo', isCardPayment ? 'Abono a TDC' : movement.type === 'expense' ? 'Gasto' : 'Ingreso'],
    ['Monto', formatCurrency(movement.amount)],
    ['Descripción', movement.description?.trim() || 'Sin descripción'],
  ]

  if (isCardPayment) {
    fields.push(
      ['Cuenta de origen', movement.sourceInstrumentName ?? '-'],
      ['Tarjeta destino', movement.destinationInstrumentName ?? '-'],
      ['Origen', 'Transferencia'],
      ['Impacto en saldos', 'Disminuye el saldo de la cuenta de origen y la deuda de la tarjeta.'],
    )
  } else {
    fields.push(
      ['Instrumento', movement.instrumentName ?? '-'],
      ['Categoría', movement.categoryName ?? 'Sin categoría'],
      ['Subcategoría', movement.subcategoryName ?? 'Sin subcategoría'],
      ['Origen', getTransactionOrigin(movement)],
      ['Afecta el saldo', movement.affectsBalance ? 'Sí' : 'No'],
      ['Meses sin intereses', movement.isMsi ? 'Sí' : 'No'],
    )
    if (movement.isMsi) {
      fields.push(
        ['Plazo', `${movement.msiMonths ?? '-'} meses`],
        ['Monto mensual', formatCurrency(movement.msiMonthlyAmount)],
        ['Inicio de MSI', formatIsoDate(movement.msiStartDate)],
        ['Meses restantes', movement.msiRemaining ?? '-'],
      )
    }
  }
  const notes = (movement.notes ?? '').replace(/^NO_BALANCE_IMPACT:\s*/, '').trim()
  fields.push(['Notas', notes || 'Sin notas'])

  return (
    <FormModal title="Detalle del movimiento" onClose={onClose}>
      <dl className="movement-details">
        {fields.map(([label, value]) => (
          <div className="movement-details__field" key={label}>
            <dt className="movement-details__label">{label}</dt>
            <dd className="movement-details__value">{value}</dd>
          </div>
        ))}
      </dl>
    </FormModal>
  )
}
