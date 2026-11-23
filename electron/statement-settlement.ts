interface DatedAmount {
  date: string
  amountCents: number
}

interface StatementCharge extends DatedAmount {
  id: number
}

interface CardPayment extends DatedAmount {
  id: number
  requestedStatementId: number | null
}

interface SettlementCredit extends DatedAmount {
  transferId: number | null
}

interface StatementSettlement {
  cutOffDate: string
  remainingCents: number
  reconciliationCents: number
  payments: Map<number, number>
  settledDate: string | null
}

type SettlementEvent =
  | { type: 'opening'; entry: DatedAmount }
  | { type: 'cutoff'; entry: StatementCharge }
  | { type: 'reconciliation'; entry: DatedAmount }
  | { type: 'payment'; entry: CardPayment }

export function settleStatements(
  charges: StatementCharge[],
  payments: CardPayment[],
  reconciliations: DatedAmount[],
  openingBalances: DatedAmount[],
): Map<number, StatementSettlement> {
  const settlements = new Map<number, StatementSettlement>(
    charges.map(({ id, date, amountCents }) => [id, {
      cutOffDate: date,
      remainingCents: amountCents,
      reconciliationCents: 0,
      payments: new Map(),
      settledDate: null,
    }]),
  )
  const closedStatementIds: number[] = []
  const unappliedCredits: SettlementCredit[] = []
  let openingBalanceCents = 0
  let firstUnappliedCredit = 0

  const applyToStatement = (credit: SettlementCredit, statementId: number): void => {
    const settlement = settlements.get(statementId)
    if (!settlement) return
    const amount = Math.min(credit.amountCents, settlement.remainingCents)
    if (amount === 0) return
    if (credit.transferId === null) {
      settlement.reconciliationCents += amount
    } else {
      const applied = settlement.payments.get(credit.transferId) ?? 0
      settlement.payments.set(credit.transferId, applied + amount)
    }
    credit.amountCents -= amount
    settlement.remainingCents -= amount
    if (settlement.remainingCents === 0) {
      settlement.settledDate = credit.date < settlement.cutOffDate ? settlement.cutOffDate : credit.date
    }
  }

  const applyAutomaticCredit = (credit: SettlementCredit): void => {
    for (const statementId of closedStatementIds) {
      if (credit.amountCents === 0) break
      applyToStatement(credit, statementId)
    }
    // Opening debt can consume a payment surplus without appearing in the cycle totals.
    const appliedToOpening = Math.min(credit.amountCents, openingBalanceCents)
    openingBalanceCents -= appliedToOpening
    credit.amountCents -= appliedToOpening
  }

  const events: SettlementEvent[] = [
    ...openingBalances.map((entry) => ({ type: 'opening' as const, entry })),
    ...charges.map((entry) => ({ type: 'cutoff' as const, entry })),
    ...reconciliations.map((entry) => ({ type: 'reconciliation' as const, entry })),
    ...payments.map((entry) => ({ type: 'payment' as const, entry })),
  ]
  events.sort((a, b) => a.entry.date.localeCompare(b.entry.date))

  for (const event of events) {
    if (event.type === 'opening' || event.type === 'cutoff') {
      if (event.type === 'opening') {
        openingBalanceCents += event.entry.amountCents
      } else {
        closedStatementIds.push(event.entry.id)
      }
      while (firstUnappliedCredit < unappliedCredits.length) {
        const credit = unappliedCredits[firstUnappliedCredit]
        applyAutomaticCredit(credit)
        if (credit.amountCents > 0) break
        firstUnappliedCredit += 1
      }
      continue
    }
    const credit: SettlementCredit = {
      date: event.entry.date,
      amountCents: event.entry.amountCents,
      transferId: event.type === 'payment' ? event.entry.id : null,
    }
    if (event.type === 'payment' && event.entry.requestedStatementId !== null) {
      applyToStatement(credit, event.entry.requestedStatementId)
    } else {
      applyAutomaticCredit(credit)
      if (credit.amountCents > 0) unappliedCredits.push(credit)
    }
  }
  return settlements
}
