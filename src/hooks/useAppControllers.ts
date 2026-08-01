import { useLocalDatabase } from './useLocalDatabase'
import { useTransactionsController } from './useTransactionsController'
import { useDashboardController } from './useDashboardController'
import { useInstrumentsController } from './useInstrumentsController'
import { useBanksController } from './useBanksController'
import { useCategoriesController } from './useCategoriesController'
import { useCreditCardsController } from './useCreditCardsController'
import { useLoansController } from './useLoansController'
import { useSubscriptionsController } from './useSubscriptionsController'
import { useFixedExpensesController } from './useFixedExpensesController'
import { useBudgetsController } from './useBudgetsController'
import { useSimulatorController } from './useSimulatorController'
import { useRemindersController } from './useRemindersController'
import { useSectionDataLoader } from './useSectionDataLoader'
import { useFinanceSelectors } from './useFinanceSelectors'
import { useRecurringIncomesController } from './useRecurringIncomesController'
import { useSavingsGoalsController } from './useSavingsGoalsController'
import { useFamilyDashboardController } from './useFamilyDashboardController'
import { useFamilyExpensesController } from './useFamilyExpensesController'

export function useAppControllers() {
  const databaseController = useLocalDatabase()
  const hasConfig = databaseController.isReady
  const dashboardController = useDashboardController()
  const instrumentsController = useInstrumentsController()
  const banksController = useBanksController({ loadInstruments: instrumentsController.loadInstruments })
  const categoriesController = useCategoriesController()
  const familyDashboardController = useFamilyDashboardController()
  const familyExpensesController = useFamilyExpensesController(categoriesController.categories)

  const creditCardsController = useCreditCardsController({
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
    loadInstruments: instrumentsController.loadInstruments,
  })

  const loansController = useLoansController({ instruments: instrumentsController.instruments })

  const subscriptionsController = useSubscriptionsController({
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
  })

  const fixedExpensesController = useFixedExpensesController({
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
  })

  const budgetsController = useBudgetsController()
  const simulatorController = useSimulatorController({ instruments: instrumentsController.instruments })
  const remindersController = useRemindersController()
  const recurringIncomesController = useRecurringIncomesController({
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
  })
  const savingsGoalsController = useSavingsGoalsController(instrumentsController.instruments)

  const selectors = useFinanceSelectors({
    banks: banksController.banks,
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
  })

  const transactionsController = useTransactionsController({
    instruments: instrumentsController.instruments,
    categories: categoriesController.categories,
    loadInstruments: instrumentsController.loadInstruments,
  })

  const { activeSection, handleSectionChange, isSectionLoading } = useSectionDataLoader(hasConfig, {
    loadDashboard: dashboardController.loadDashboard,
    loadBanks: banksController.loadBanks,
    loadInstruments: instrumentsController.loadInstruments,
    loadCategories: categoriesController.loadCategories,
    loadTransactions: transactionsController.loadTransactions,
    loadStatements: creditCardsController.loadStatements,
    loadTransfers: creditCardsController.loadTransfers,
    loadSubscriptions: subscriptionsController.loadSubscriptions,
    loadRecurringIncomes: recurringIncomesController.loadRecurringIncomes,
    loadFixedExpenses: fixedExpensesController.loadFixedExpenses,
    loadLoans: loansController.loadLoans,
    loadBudgets: budgetsController.loadBudgets,
    loadSavingsGoals: savingsGoalsController.loadSavingsGoals,
    loadReminders: remindersController.loadReminders,
    loadSimulations: simulatorController.loadSimulations,
    loadFamilyDashboard: familyDashboardController.loadFamilyDashboard,
    loadFamilyExpenses: familyExpensesController.loadFamilyExpenses,
  })

  return {
    hasConfig,
    activeSection,
    handleSectionChange,
    isSectionLoading,
    databaseController,
    dashboardController,
    instrumentsController,
    banksController,
    categoriesController,
    creditCardsController,
    loansController,
    subscriptionsController,
    fixedExpensesController,
    budgetsController,
    simulatorController,
    remindersController,
    selectors,
    transactionsController,
    recurringIncomesController,
    savingsGoalsController,
    familyDashboardController,
    familyExpensesController,
  }
}
