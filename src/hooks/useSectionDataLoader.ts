import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { AppSection } from '../app/appHelpers'

type SectionLoaders = {
  loadDashboard: () => Promise<void>
  loadBanks: () => Promise<void>
  loadInstruments: () => Promise<void>
  loadCategories: () => Promise<void>
  loadTransactions: () => Promise<void>
  loadStatements: () => Promise<void>
  loadTransfers: () => Promise<void>
  loadSubscriptions: () => Promise<void>
  loadRecurringIncomes: () => Promise<void>
  loadFixedExpenses: () => Promise<void>
  loadLoans: () => Promise<void>
  loadBudgets: () => Promise<void>
  loadSavingsGoals: () => Promise<void>
  loadReminders: () => Promise<void>
  loadSimulations: () => Promise<void>
}

export function useSectionDataLoader(hasConfig: boolean, loaders: SectionLoaders) {
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')
  const [isSectionLoading, setIsSectionLoading] = useState(false)
  const initialLoadStarted = useRef(false)
  const loadInitialData = useEffectEvent(async (): Promise<void> => {
    setIsSectionLoading(true)
    await Promise.all([
      loaders.loadDashboard(),
      loaders.loadReminders(),
      loaders.loadBanks(),
      loaders.loadInstruments(),
      loaders.loadCategories(),
    ])
    setIsSectionLoading(false)
  })

  useEffect(() => {
    if (!hasConfig || initialLoadStarted.current) return
    initialLoadStarted.current = true
    void Promise.resolve().then(loadInitialData)
  }, [hasConfig])

  const sectionHandlers: Record<AppSection, () => Promise<void>> = {
    dashboard: async () => {
      await loaders.loadDashboard()
    },
    settings: async () => {},
    banks: async () => {
      await loaders.loadBanks()
    },
    instruments: async () => {
      await Promise.all([loaders.loadBanks(), loaders.loadInstruments()])
    },
    categories: async () => {
      await loaders.loadCategories()
    },
    transactions: async () => {
      await Promise.all([loaders.loadCategories(), loaders.loadInstruments(), loaders.loadTransactions()])
    },
    creditCards: async () => {
      await Promise.all([
        loaders.loadCategories(),
        loaders.loadInstruments(),
        loaders.loadStatements(),
        loaders.loadTransfers(),
      ])
    },
    transfers: async () => {
      await Promise.all([loaders.loadInstruments(), loaders.loadTransfers()])
    },
    subscriptions: async () => {
      await Promise.all([
        loaders.loadInstruments(),
        loaders.loadCategories(),
        loaders.loadSubscriptions(),
        loaders.loadRecurringIncomes(),
      ])
    },
    fixedExpenses: async () => {
      await Promise.all([loaders.loadInstruments(), loaders.loadCategories(), loaders.loadFixedExpenses()])
    },
    loans: async () => {
      await Promise.all([loaders.loadInstruments(), loaders.loadLoans()])
    },
    budgets: async () => {
      await Promise.all([
        loaders.loadCategories(),
        loaders.loadInstruments(),
        loaders.loadBudgets(),
        loaders.loadSavingsGoals(),
      ])
    },
    reminders: async () => {
      await loaders.loadReminders()
    },
    simulator: async () => {
      await Promise.all([loaders.loadInstruments(), loaders.loadSimulations()])
    },
  }

  const handleSectionChange = (nextSection: AppSection): void => {
    setActiveSection(nextSection)

    if (!hasConfig) {
      return
    }

    setIsSectionLoading(true)
    void sectionHandlers[nextSection]().finally(() => {
      setIsSectionLoading(false)
    })
  }

  return {
    activeSection,
    handleSectionChange,
    isSectionLoading,
  }
}
