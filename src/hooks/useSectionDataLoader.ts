import { useState } from 'react'
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
  loadFixedExpenses: () => Promise<void>
  loadLoans: () => Promise<void>
  loadBudgets: () => Promise<void>
  loadReminders: () => Promise<void>
  loadSimulations: () => Promise<void>
}

export function useSectionDataLoader(hasConfig: boolean, loaders: SectionLoaders) {
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')

  const sectionHandlers: Record<AppSection, () => void> = {
    dashboard: () => {
      void loaders.loadDashboard()
    },
    settings: () => {},
    banks: () => {
      void loaders.loadBanks()
    },
    instruments: () => {
      void loaders.loadBanks()
      void loaders.loadInstruments()
    },
    categories: () => {
      void loaders.loadCategories()
    },
    transactions: () => {
      void loaders.loadCategories()
      void loaders.loadInstruments()
      void loaders.loadTransactions()
    },
    creditCards: () => {
      void loaders.loadInstruments()
      void loaders.loadStatements()
      void loaders.loadTransfers()
    },
    subscriptions: () => {
      void loaders.loadInstruments()
      void loaders.loadCategories()
      void loaders.loadSubscriptions()
    },
    fixedExpenses: () => {
      void loaders.loadInstruments()
      void loaders.loadCategories()
      void loaders.loadFixedExpenses()
    },
    loans: () => {
      void loaders.loadInstruments()
      void loaders.loadLoans()
    },
    budgets: () => {
      void loaders.loadCategories()
      void loaders.loadBudgets()
    },
    reminders: () => {
      void loaders.loadReminders()
    },
    simulator: () => {
      void loaders.loadInstruments()
      void loaders.loadSimulations()
    },
  }

  const handleSectionChange = (nextSection: AppSection): void => {
    setActiveSection(nextSection)

    if (!hasConfig) {
      return
    }

    sectionHandlers[nextSection]()
  }

  return {
    activeSection,
    handleSectionChange,
  }
}
