import { useMemo } from 'react'
import type { Bank, Category, FinancialInstrument } from '../types/domain'

type UseFinanceSelectorsParams = {
  banks: Bank[]
  instruments: FinancialInstrument[]
  categories: Category[]
}

export function useFinanceSelectors({
  banks,
  instruments,
  categories,
}: UseFinanceSelectorsParams) {
  const banksById = useMemo(() => {
    return new Map(banks.map((bank) => [bank.id, bank]))
  }, [banks])

  const groupedInstruments = useMemo(() => {
    const groups = new Map<number, FinancialInstrument[]>()

    for (const instrument of instruments) {
      const previous = groups.get(instrument.bankId)
      if (!previous) {
        groups.set(instrument.bankId, [instrument])
      } else {
        previous.push(instrument)
      }
    }

    return Array.from(groups.entries()).map(([bankId, list]) => ({
      bank: banksById.get(bankId),
      instruments: list,
    }))
  }, [banksById, instruments])

  const expenseCategoryOptions = useMemo(() => {
    return categories.filter(
      (category) => category.isActive && (category.type === 'expense' || category.type === 'both'),
    )
  }, [categories])

  return {
    groupedInstruments,
    expenseCategoryOptions,
  }
}
