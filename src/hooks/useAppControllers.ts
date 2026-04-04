import { useLocalConfig } from './useLocalConfig'
import { useTransactionsController } from './useTransactionsController'
import { useSettingsPing } from './useSettingsPing'
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

export function useAppControllers() {
  const configController = useLocalConfig()
  const hasConfig = Boolean(
    configController.config.apiKey.trim()
      && configController.config.apiEndpoint.trim()
      && configController.config.awsRegion.trim(),
  )

  const settingsPingController = useSettingsPing(hasConfig)
  const dashboardController = useDashboardController()
  const instrumentsController = useInstrumentsController()
  const banksController = useBanksController({ loadInstruments: instrumentsController.loadInstruments })
  const categoriesController = useCategoriesController()

  const creditCardsController = useCreditCardsController({
    instruments: instrumentsController.instruments,
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

  const { activeSection, handleSectionChange } = useSectionDataLoader(hasConfig, {
    loadDashboard: dashboardController.loadDashboard,
    loadBanks: banksController.loadBanks,
    loadInstruments: instrumentsController.loadInstruments,
    loadCategories: categoriesController.loadCategories,
    loadTransactions: transactionsController.loadTransactions,
    loadStatements: creditCardsController.loadStatements,
    loadTransfers: creditCardsController.loadTransfers,
    loadSubscriptions: subscriptionsController.loadSubscriptions,
    loadFixedExpenses: fixedExpensesController.loadFixedExpenses,
    loadLoans: loansController.loadLoans,
    loadBudgets: budgetsController.loadBudgets,
    loadReminders: remindersController.loadReminders,
    loadSimulations: simulatorController.loadSimulations,
  })

  const handleSave = async (): Promise<void> => {
    await configController.saveConfig()
    await settingsPingController.refreshCloudConnection()
  }

  return {
    hasConfig,
    activeSection,
    handleSectionChange,
    handleSave,
    configController,
    settingsPingController,
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
  }
}
