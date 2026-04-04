import { Suspense, lazy, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { apiClient } from './api/client'
import { useLocalConfig } from './hooks/useLocalConfig'
import { AppSidebar } from './components/AppSidebar'
import {
  EMPTY_BANK_FORM,
  EMPTY_BUDGET_FORM,
  EMPTY_CATEGORY_FORM,
  EMPTY_DASHBOARD_SUMMARY,
  EMPTY_FIXED_EXPENSE_FORM,
  EMPTY_FIXED_EXPENSE_PAYMENT_FORM,
  EMPTY_INSTRUMENT_FORM,
  EMPTY_LOAN_FORM,
  EMPTY_LOAN_PAYMENT_REGISTER,
  EMPTY_REMINDER_FORM,
  EMPTY_SIMULATION_FORM,
  EMPTY_STATEMENT_FORM,
  EMPTY_STATEMENT_UPDATE_FORM,
  EMPTY_SUBCATEGORY_FORM,
  EMPTY_SUBSCRIPTION_FORM,
  EMPTY_TRANSACTION_FILTERS,
  EMPTY_TRANSACTION_FORM,
  EMPTY_TRANSFER_FORM,
  MSI_OPTIONS,
  toEditableBank,
  toEditableCategory,
  toEditableFixedExpense,
  toEditableInstrument,
  toEditableSubcategory,
  toEditableSubscription,
  type AppSection,
} from './app/appHelpers'
import type {
  Budget,
  BudgetInput,
  Bank,
  BankInput,
  Category,
  CategoryInput,
  DashboardBalanceEvolution,
  DashboardCashFlowPoint,
  DashboardExpenseByCategory,
  DashboardFutureExpensePoint,
  DashboardSummary,
  CreditCardStatement,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  FinancialInstrumentInput,
  FixedExpense,
  FixedExpenseInput,
  FixedExpensePayment,
  FixedExpensePaymentInput,
  InstrumentType,
  Loan,
  LoanInput,
  LoanPayment,
  LoanPaymentRegisterInput,
  Reminder,
  ReminderInput,
  LoanPaymentType,
  Subscription,
  SubscriptionBillingCycle,
  SubscriptionInput,
  SubcategoryInput,
  Simulation,
  SimulationInput,
  SimulationScenarioType,
  Transfer,
  TransferInput,
  TransferType,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
} from './types/domain'

const DashboardSection = lazy(() => import('./components/sections/DashboardSection').then((module) => ({ default: module.DashboardSection })))
const SettingsSection = lazy(() => import('./components/sections/SettingsSection').then((module) => ({ default: module.SettingsSection })))
const BanksSection = lazy(() => import('./components/sections/BanksSection').then((module) => ({ default: module.BanksSection })))
const InstrumentsSection = lazy(() => import('./components/sections/InstrumentsSection').then((module) => ({ default: module.InstrumentsSection })))
const CategoriesSection = lazy(() => import('./components/sections/CategoriesSection').then((module) => ({ default: module.CategoriesSection })))
const TransactionsSection = lazy(() => import('./components/sections/TransactionsSection').then((module) => ({ default: module.TransactionsSection })))
const CreditCardsSection = lazy(() => import('./components/sections/CreditCardsSection').then((module) => ({ default: module.CreditCardsSection })))
const SubscriptionsSection = lazy(() => import('./components/sections/SubscriptionsSection').then((module) => ({ default: module.SubscriptionsSection })))
const FixedExpensesSection = lazy(() => import('./components/sections/FixedExpensesSection').then((module) => ({ default: module.FixedExpensesSection })))
const LoansSection = lazy(() => import('./components/sections/LoansSection').then((module) => ({ default: module.LoansSection })))
const BudgetsSection = lazy(() => import('./components/sections/BudgetsSection').then((module) => ({ default: module.BudgetsSection })))
const SimulatorSection = lazy(() => import('./components/sections/SimulatorSection').then((module) => ({ default: module.SimulatorSection })))
const RemindersSection = lazy(() => import('./components/sections/RemindersSection').then((module) => ({ default: module.RemindersSection })))

export function App() {
  const {
    config,
    isLoading,
    isSaving,
    error,
    successMessage,
    setConfig,
    saveConfig,
  } = useLocalConfig()
  const [pingResponse, setPingResponse] = useState('')
  const [pingError, setPingError] = useState('')
  const [isPinging, setIsPinging] = useState(false)
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard')
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(EMPTY_DASHBOARD_SUMMARY)
  const [dashboardExpensesByCategory, setDashboardExpensesByCategory] = useState<DashboardExpenseByCategory[]>([])
  const [dashboardCashFlow, setDashboardCashFlow] = useState<DashboardCashFlowPoint[]>([])
  const [dashboardBalanceEvolution, setDashboardBalanceEvolution] = useState<DashboardBalanceEvolution>({
    series: [],
    points: [],
  })
  const [dashboardFutureExpenses, setDashboardFutureExpenses] = useState<DashboardFutureExpensePoint[]>([])
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')

  const [banks, setBanks] = useState<Bank[]>([])
  const [isBanksLoading, setIsBanksLoading] = useState(false)
  const [bankMessage, setBankMessage] = useState('')
  const [bankError, setBankError] = useState('')
  const [bankForm, setBankForm] = useState<BankInput>(EMPTY_BANK_FORM)
  const [editingBankId, setEditingBankId] = useState<number | null>(null)

  const [instruments, setInstruments] = useState<FinancialInstrument[]>([])
  const [isInstrumentsLoading, setIsInstrumentsLoading] = useState(false)
  const [instrumentMessage, setInstrumentMessage] = useState('')
  const [instrumentError, setInstrumentError] = useState('')
  const [instrumentForm, setInstrumentForm] = useState<FinancialInstrumentInput>(EMPTY_INSTRUMENT_FORM)
  const [editingInstrumentId, setEditingInstrumentId] = useState<number | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [categoryMessage, setCategoryMessage] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryForm, setCategoryForm] = useState<CategoryInput>(EMPTY_CATEGORY_FORM)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)

  const [subcategoryMessage, setSubcategoryMessage] = useState('')
  const [subcategoryError, setSubcategoryError] = useState('')
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryInput>(EMPTY_SUBCATEGORY_FORM)
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [transactionMessage, setTransactionMessage] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [transactionForm, setTransactionForm] = useState<TransactionInput>(EMPTY_TRANSACTION_FORM)
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS)

  const [statements, setStatements] = useState<CreditCardStatement[]>([])
  const [isStatementsLoading, setIsStatementsLoading] = useState(false)
  const [statementMessage, setStatementMessage] = useState('')
  const [statementError, setStatementError] = useState('')
  const [statementForm, setStatementForm] = useState<CreditCardStatementInput>(EMPTY_STATEMENT_FORM)
  const [editingStatementId, setEditingStatementId] = useState<number | null>(null)
  const [statementUpdateForm, setStatementUpdateForm] = useState<CreditCardStatementUpdateInput>(EMPTY_STATEMENT_UPDATE_FORM)

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [isTransfersLoading, setIsTransfersLoading] = useState(false)
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState('')
  const [transferForm, setTransferForm] = useState<TransferInput>(EMPTY_TRANSFER_FORM)

  const [selectedStatementDetail, setSelectedStatementDetail] = useState<CreditCardStatement | null>(null)
  const [statementMovements, setStatementMovements] = useState<Transaction[]>([])
  const [isStatementMovementsLoading, setIsStatementMovementsLoading] = useState(false)

  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoansLoading, setIsLoansLoading] = useState(false)
  const [loanMessage, setLoanMessage] = useState('')
  const [loanError, setLoanError] = useState('')
  const [loanForm, setLoanForm] = useState<LoanInput>(EMPTY_LOAN_FORM)
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null)
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null)
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([])
  const [isLoanPaymentsLoading, setIsLoanPaymentsLoading] = useState(false)
  const [loanPaymentRegister, setLoanPaymentRegister] = useState<LoanPaymentRegisterInput>(EMPTY_LOAN_PAYMENT_REGISTER)

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isSubscriptionsLoading, setIsSubscriptionsLoading] = useState(false)
  const [subscriptionMessage, setSubscriptionMessage] = useState('')
  const [subscriptionError, setSubscriptionError] = useState('')
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionInput>(EMPTY_SUBSCRIPTION_FORM)
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<number | null>(null)

  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [isFixedExpensesLoading, setIsFixedExpensesLoading] = useState(false)
  const [fixedExpenseMessage, setFixedExpenseMessage] = useState('')
  const [fixedExpenseError, setFixedExpenseError] = useState('')
  const [fixedExpenseForm, setFixedExpenseForm] = useState<FixedExpenseInput>(EMPTY_FIXED_EXPENSE_FORM)
  const [editingFixedExpenseId, setEditingFixedExpenseId] = useState<number | null>(null)
  const [selectedFixedExpenseId, setSelectedFixedExpenseId] = useState<number | null>(null)
  const [fixedExpensePayments, setFixedExpensePayments] = useState<FixedExpensePayment[]>([])
  const [isFixedExpensePaymentsLoading, setIsFixedExpensePaymentsLoading] = useState(false)
  const [fixedExpensePaymentForm, setFixedExpensePaymentForm] = useState<FixedExpensePaymentInput>(EMPTY_FIXED_EXPENSE_PAYMENT_FORM)

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false)
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const [budgetForm, setBudgetForm] = useState<BudgetInput>(EMPTY_BUDGET_FORM)
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null)
  const [budgetFilterMonth, setBudgetFilterMonth] = useState(new Date().getMonth() + 1)
  const [budgetFilterYear, setBudgetFilterYear] = useState(new Date().getFullYear())

  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [isSimulationsLoading, setIsSimulationsLoading] = useState(false)
  const [simulationMessage, setSimulationMessage] = useState('')
  const [simulationError, setSimulationError] = useState('')
  const [simulationForm, setSimulationForm] = useState<SimulationInput>(EMPTY_SIMULATION_FORM)

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [isRemindersLoading, setIsRemindersLoading] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderError, setReminderError] = useState('')
  const [reminderForm, setReminderForm] = useState<ReminderInput>(EMPTY_REMINDER_FORM)
  const [editingReminderId, setEditingReminderId] = useState<number | null>(null)
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0)

  const hasConfig = Boolean(config.apiKey.trim() && config.apiEndpoint.trim() && config.awsRegion.trim())

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

  const categoryOptions = useMemo(() => categories.map((category) => ({ id: category.id, name: category.name })), [categories])
  const selectedSubcategoryCategoryId = subcategoryForm.categoryId === 0 ? (categories[0]?.id ?? 0) : subcategoryForm.categoryId
  const selectedTransactionInstrumentId = transactionForm.instrumentId === 0 ? (instruments[0]?.id ?? 0) : transactionForm.instrumentId
  const selectedTransactionCategoryId = transactionForm.categoryId

  const selectedTransactionInstrument = useMemo(() => {
    return instruments.find((instrument) => instrument.id === selectedTransactionInstrumentId) ?? null
  }, [instruments, selectedTransactionInstrumentId])

  const transactionSubcategoryOptions = useMemo(() => {
    if (!selectedTransactionCategoryId) {
      return []
    }

    return categories.find((category) => category.id === selectedTransactionCategoryId)?.subcategories ?? []
  }, [categories, selectedTransactionCategoryId])

  const activeMsiTransactions = useMemo(() => {
    return transactions.filter((transaction) => transaction.isMsi && (transaction.msiRemaining ?? 0) > 0)
  }, [transactions])

  const creditCardInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type === 'credit_card')
  }, [instruments])

  const sourceTransferInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type !== 'credit_card')
  }, [instruments])

  const selectedStatementInstrumentId = statementForm.instrumentId === 0 ? (creditCardInstruments[0]?.id ?? 0) : statementForm.instrumentId
  const selectedTransferSourceInstrumentId = transferForm.sourceInstrumentId === 0 ? (sourceTransferInstruments[0]?.id ?? 0) : transferForm.sourceInstrumentId
  const selectedTransferDestinationInstrumentId = transferForm.destinationInstrumentId === 0 ? (creditCardInstruments[0]?.id ?? 0) : transferForm.destinationInstrumentId
  const selectedTransferType = transferForm.type

  const availableTransferDestinations = useMemo(() => {
    const sourceId = selectedTransferSourceInstrumentId

    if (selectedTransferType === 'card_payment') {
      return creditCardInstruments.filter((instrument) => instrument.id !== sourceId)
    }

    if (selectedTransferType === 'inter_account') {
      return sourceTransferInstruments.filter((instrument) => instrument.id !== sourceId)
    }

    return instruments.filter((instrument) => instrument.id !== sourceId)
  }, [creditCardInstruments, instruments, selectedTransferSourceInstrumentId, selectedTransferType, sourceTransferInstruments])

  const totalCreditCardDebt = useMemo(() => {
    return creditCardInstruments.reduce((accumulator, instrument) => accumulator + (instrument.currentBalance ?? 0), 0)
  }, [creditCardInstruments])

  const totalAvailableCredit = useMemo(() => {
    return creditCardInstruments.reduce((accumulator, instrument) => accumulator + (instrument.availableCredit ?? 0), 0)
  }, [creditCardInstruments])

  const loanPaymentInstruments = useMemo(() => {
    return instruments.filter((instrument) => instrument.type !== 'credit_card')
  }, [instruments])

  const selectedLoan = useMemo(() => {
    if (!selectedLoanId) {
      return null
    }

    return loans.find((loan) => loan.id === selectedLoanId) ?? null
  }, [loans, selectedLoanId])

  const expenseCategoryOptions = useMemo(() => {
    return categories.filter((category) => category.type === 'expense' || category.type === 'both')
  }, [categories])

  const simulationInstrumentOptions = useMemo(() => {
    if (simulationForm.scenarioType === 'loan') {
      return []
    }

    if (simulationForm.scenarioType === 'msi') {
      return instruments.filter((instrument) => instrument.type === 'credit_card')
    }

    return instruments
  }, [instruments, simulationForm.scenarioType])

  const selectedSubscriptionCategory = useMemo(() => {
    if (!subscriptionForm.categoryId) {
      return null
    }

    return categories.find((category) => category.id === subscriptionForm.categoryId) ?? null
  }, [categories, subscriptionForm.categoryId])

  const selectedFixedExpenseCategory = useMemo(() => {
    if (!fixedExpenseForm.categoryId) {
      return null
    }

    return categories.find((category) => category.id === fixedExpenseForm.categoryId) ?? null
  }, [categories, fixedExpenseForm.categoryId])

  const selectedFixedExpense = useMemo(() => {
    if (!selectedFixedExpenseId) {
      return null
    }

    return fixedExpenses.find((expense) => expense.id === selectedFixedExpenseId) ?? null
  }, [fixedExpenses, selectedFixedExpenseId])

  const loadDashboard = async (): Promise<void> => {
    setIsDashboardLoading(true)
    setDashboardError('')

    const [
      summaryResult,
      expensesResult,
      cashFlowResult,
      balanceEvolutionResult,
      futureExpensesResult,
    ] = await Promise.all([
      apiClient.getDashboardSummary(),
      apiClient.getDashboardExpensesByCategory(),
      apiClient.getDashboardCashFlow(),
      apiClient.getDashboardBalanceEvolution(),
      apiClient.getDashboardFutureExpenses(),
    ])

    if (!summaryResult.success) {
      setDashboardError(summaryResult.error ?? 'No se pudo cargar el resumen financiero.')
      setIsDashboardLoading(false)
      return
    }

    if (!expensesResult.success) {
      setDashboardError(expensesResult.error ?? 'No se pudo cargar la grafica de gastos por categoria.')
      setIsDashboardLoading(false)
      return
    }

    if (!cashFlowResult.success) {
      setDashboardError(cashFlowResult.error ?? 'No se pudo cargar la grafica de flujo de efectivo.')
      setIsDashboardLoading(false)
      return
    }

    if (!balanceEvolutionResult.success) {
      setDashboardError(balanceEvolutionResult.error ?? 'No se pudo cargar la grafica de evolucion de saldos.')
      setIsDashboardLoading(false)
      return
    }

    if (!futureExpensesResult.success) {
      setDashboardError(futureExpensesResult.error ?? 'No se pudo cargar la proyeccion de gastos futuros.')
      setIsDashboardLoading(false)
      return
    }

    setDashboardSummary(summaryResult.data ?? EMPTY_DASHBOARD_SUMMARY)
    setDashboardExpensesByCategory(expensesResult.data ?? [])
    setDashboardCashFlow(cashFlowResult.data ?? [])
    setDashboardBalanceEvolution(balanceEvolutionResult.data ?? { series: [], points: [] })
    setDashboardFutureExpenses(futureExpensesResult.data ?? [])
    setIsDashboardLoading(false)
  }

  const loadBanks = async (): Promise<void> => {
    setIsBanksLoading(true)
    setBankError('')

    const result = await apiClient.getBanks()

    if (!result.success) {
      setBankError(result.error ?? 'No se pudo cargar bancos.')
      setIsBanksLoading(false)
      return
    }

    setBanks(result.data ?? [])
    setIsBanksLoading(false)
  }

  const loadInstruments = async (): Promise<void> => {
    setIsInstrumentsLoading(true)
    setInstrumentError('')

    const result = await apiClient.getInstruments()

    if (!result.success) {
      setInstrumentError(result.error ?? 'No se pudo cargar instrumentos.')
      setIsInstrumentsLoading(false)
      return
    }

    setInstruments(result.data ?? [])
    setIsInstrumentsLoading(false)
  }

  const loadCategories = async (): Promise<void> => {
    setIsCategoriesLoading(true)
    setCategoryError('')

    const result = await apiClient.getCategories()

    if (!result.success) {
      setCategoryError(result.error ?? 'No se pudieron cargar las categorias.')
      setIsCategoriesLoading(false)
      return
    }

    setCategories(result.data ?? [])
    setIsCategoriesLoading(false)
  }

  const loadTransactions = async (filters: TransactionFilters = transactionFilters): Promise<void> => {
    setIsTransactionsLoading(true)
    setTransactionError('')

    const result = await apiClient.getTransactions(filters)

    if (!result.success) {
      setTransactionError(result.error ?? 'No se pudieron cargar las transacciones.')
      setIsTransactionsLoading(false)
      return
    }

    setTransactions(result.data ?? [])
    setIsTransactionsLoading(false)
  }

  const loadStatements = async (): Promise<void> => {
    setIsStatementsLoading(true)
    setStatementError('')

    const result = await apiClient.getStatements()

    if (!result.success) {
      setStatementError(result.error ?? 'No se pudieron cargar los estados de cuenta.')
      setIsStatementsLoading(false)
      return
    }

    setStatements(result.data ?? [])
    setIsStatementsLoading(false)
  }

  const loadTransfers = async (): Promise<void> => {
    setIsTransfersLoading(true)
    setTransferError('')

    const result = await apiClient.getTransfers()

    if (!result.success) {
      setTransferError(result.error ?? 'No se pudieron cargar las transferencias.')
      setIsTransfersLoading(false)
      return
    }

    setTransfers(result.data ?? [])
    setIsTransfersLoading(false)
  }

  const loadStatementMovements = async (statement: CreditCardStatement): Promise<void> => {
    setIsStatementMovementsLoading(true)
    setStatementError('')

    const result = await apiClient.getStatementMovements(statement.id)

    if (!result.success) {
      setStatementError(result.error ?? 'No se pudo cargar el detalle de movimientos del estado de cuenta.')
      setIsStatementMovementsLoading(false)
      return
    }

    setSelectedStatementDetail(statement)
    setStatementMovements(result.data ?? [])
    setIsStatementMovementsLoading(false)
  }

  const loadLoans = async (): Promise<void> => {
    setIsLoansLoading(true)
    setLoanError('')

    const result = await apiClient.getLoans()

    if (!result.success) {
      setLoanError(result.error ?? 'No se pudieron cargar los prestamos.')
      setIsLoansLoading(false)
      return
    }

    setLoans(result.data ?? [])
    setIsLoansLoading(false)
  }

  const loadLoanPayments = async (loanId: number): Promise<void> => {
    setIsLoanPaymentsLoading(true)
    setLoanError('')

    const result = await apiClient.getLoanPayments(loanId)

    if (!result.success) {
      setLoanError(result.error ?? 'No se pudo cargar la tabla de amortizacion.')
      setIsLoanPaymentsLoading(false)
      return
    }

    setSelectedLoanId(loanId)
    setLoanPayments(result.data ?? [])
    setIsLoanPaymentsLoading(false)
  }

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

  const loadFixedExpenses = async (): Promise<void> => {
    setIsFixedExpensesLoading(true)
    setFixedExpenseError('')

    const result = await apiClient.getFixedExpenses()

    if (!result.success) {
      setFixedExpenseError(result.error ?? 'No se pudieron cargar los gastos fijos.')
      setIsFixedExpensesLoading(false)
      return
    }

    setFixedExpenses(result.data ?? [])
    setIsFixedExpensesLoading(false)
  }

  const loadFixedExpensePayments = async (fixedExpenseId: number): Promise<void> => {
    setIsFixedExpensePaymentsLoading(true)
    setFixedExpenseError('')

    const result = await apiClient.getFixedExpensePayments(fixedExpenseId)

    if (!result.success) {
      setFixedExpenseError(result.error ?? 'No se pudo cargar el historial de pagos.')
      setIsFixedExpensePaymentsLoading(false)
      return
    }

    setSelectedFixedExpenseId(fixedExpenseId)
    setFixedExpensePayments(result.data ?? [])
    setIsFixedExpensePaymentsLoading(false)
  }

  const loadBudgets = async (month: number = budgetFilterMonth, year: number = budgetFilterYear): Promise<void> => {
    setIsBudgetsLoading(true)
    setBudgetError('')

    const result = await apiClient.getBudgets(month, year)

    if (!result.success) {
      setBudgetError(result.error ?? 'No se pudieron cargar los presupuestos.')
      setIsBudgetsLoading(false)
      return
    }

    setBudgets(result.data ?? [])
    setIsBudgetsLoading(false)
  }

  const loadSimulations = async (): Promise<void> => {
    setIsSimulationsLoading(true)
    setSimulationError('')

    const result = await apiClient.getSimulations()

    if (!result.success) {
      setSimulationError(result.error ?? 'No se pudieron cargar las simulaciones.')
      setIsSimulationsLoading(false)
      return
    }

    setSimulations(result.data ?? [])
    setIsSimulationsLoading(false)
  }

  const loadReminders = async (): Promise<void> => {
    setIsRemindersLoading(true)
    setReminderError('')

    const [allResult, pendingResult] = await Promise.all([
      apiClient.getReminders(),
      apiClient.getPendingReminders(),
    ])

    if (!allResult.success) {
      setReminderError(allResult.error ?? 'No se pudieron cargar los recordatorios.')
      setIsRemindersLoading(false)
      return
    }

    if (!pendingResult.success) {
      setReminderError(pendingResult.error ?? 'No se pudieron cargar los recordatorios pendientes.')
      setIsRemindersLoading(false)
      return
    }

    setReminders(allResult.data ?? [])
    setPendingRemindersCount((pendingResult.data ?? []).length)
    setIsRemindersLoading(false)
  }

  const selectedBankId = instrumentForm.bankId === 0 ? (banks[0]?.id ?? 0) : instrumentForm.bankId

  const handleSave = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await saveConfig()
  }

  const handlePing = async (): Promise<void> => {
    setIsPinging(true)
    setPingError('')
    setPingResponse('')

    const healthResult = await apiClient.health()

    if (!healthResult.success) {
      setPingError(healthResult.error ?? 'Fallo health check.')
      setIsPinging(false)
      return
    }

    const pingResult = await apiClient.bootstrapPing('conexion inicial ok')

    if (!pingResult.success) {
      setPingError(pingResult.error ?? 'Fallo bootstrap ping.')
      setIsPinging(false)
      return
    }

    setPingResponse(pingResult.data?.message ?? 'Conexion validada.')
    setIsPinging(false)
  }

  const resetBankEditor = (): void => {
    setBankForm(EMPTY_BANK_FORM)
    setEditingBankId(null)
  }

  const handleBankSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setBankError('')
    setBankMessage('')

    const payload = {
      ...bankForm,
      name: bankForm.name.trim(),
    }

    if (editingBankId === null) {
      const created = await apiClient.createBank(payload)
      if (!created.success) {
        setBankError(created.error ?? 'No se pudo crear el banco.')
        return
      }

      setBankMessage('Banco creado correctamente.')
    } else {
      const updated = await apiClient.updateBank(editingBankId, payload)
      if (!updated.success) {
        setBankError(updated.error ?? 'No se pudo actualizar el banco.')
        return
      }

      setBankMessage('Banco actualizado correctamente.')
    }

    resetBankEditor()
    await loadBanks()
  }

  const handleBankDelete = async (id: number): Promise<void> => {
    setBankError('')
    setBankMessage('')

    const deleted = await apiClient.deleteBank(id)

    if (!deleted.success) {
      setBankError(deleted.error ?? 'No se pudo eliminar el banco.')
      return
    }

    setBankMessage('Banco eliminado correctamente.')
    if (editingBankId === id) {
      resetBankEditor()
    }
    await loadBanks()
    await loadInstruments()
  }

  const resetInstrumentEditor = (): void => {
    const firstBankId = banks[0]?.id ?? 0
    setInstrumentForm({
      ...EMPTY_INSTRUMENT_FORM,
      bankId: firstBankId,
    })
    setEditingInstrumentId(null)
  }

  const resetCategoryEditor = (): void => {
    setCategoryForm(EMPTY_CATEGORY_FORM)
    setEditingCategoryId(null)
  }

  const resetSubcategoryEditor = (): void => {
    setSubcategoryForm({
      ...EMPTY_SUBCATEGORY_FORM,
      categoryId: categories[0]?.id ?? 0,
    })
    setEditingSubcategoryId(null)
  }

  const handleSectionChange = (nextSection: AppSection): void => {
    setActiveSection(nextSection)

    if (!hasConfig) {
      return
    }

    if (nextSection === 'dashboard') {
      void loadDashboard()
      return
    }

    if (nextSection === 'banks') {
      void loadBanks()
      return
    }

    if (nextSection === 'instruments') {
      void loadBanks()
      void loadInstruments()
      return
    }

    if (nextSection === 'categories') {
      void loadCategories()
      return
    }

    if (nextSection === 'transactions') {
      void loadCategories()
      void loadInstruments()
      void loadTransactions()
      return
    }

    if (nextSection === 'creditCards') {
      void loadInstruments()
      void loadStatements()
      void loadTransfers()
      return
    }

    if (nextSection === 'subscriptions') {
      void loadInstruments()
      void loadCategories()
      void loadSubscriptions()
      return
    }

    if (nextSection === 'fixedExpenses') {
      void loadInstruments()
      void loadCategories()
      void loadFixedExpenses()
      return
    }

    if (nextSection === 'loans') {
      void loadInstruments()
      void loadLoans()
      return
    }

    if (nextSection === 'budgets') {
      void loadCategories()
      void loadBudgets()
      return
    }

    if (nextSection === 'reminders') {
      void loadReminders()
      return
    }

    if (nextSection === 'simulator') {
      void loadInstruments()
      void loadSimulations()
    }
  }

  const handleInstrumentTypeChange = (nextType: InstrumentType): void => {
    setInstrumentForm((previous) => ({
      ...previous,
      type: nextType,
      creditLimit: nextType === 'credit_card' ? previous.creditLimit ?? 0 : null,
      currentBalance: nextType === 'credit_card' ? previous.currentBalance ?? 0 : null,
      availableCredit: nextType === 'credit_card' ? previous.availableCredit ?? 0 : null,
      cutOffDay: nextType === 'credit_card' ? previous.cutOffDay ?? 1 : null,
      paymentDueDay: nextType === 'credit_card' ? previous.paymentDueDay ?? 1 : null,
      annualRate: nextType === 'credit_card' ? previous.annualRate : null,
      currentAmount: nextType === 'credit_card' ? null : previous.currentAmount ?? 0,
    }))
  }

  const handleInstrumentSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setInstrumentError('')
    setInstrumentMessage('')

    if (instrumentForm.bankId < 1) {
      setInstrumentError('Selecciona un banco valido.')
      return
    }

    const payload = {
      ...instrumentForm,
      name: instrumentForm.name.trim(),
    }

    if (editingInstrumentId === null) {
      const created = await apiClient.createInstrument(payload)
      if (!created.success) {
        setInstrumentError(created.error ?? 'No se pudo crear el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento creado correctamente.')
    } else {
      const updated = await apiClient.updateInstrument(editingInstrumentId, payload)
      if (!updated.success) {
        setInstrumentError(updated.error ?? 'No se pudo actualizar el instrumento.')
        return
      }

      setInstrumentMessage('Instrumento actualizado correctamente.')
    }

    resetInstrumentEditor()
    await loadInstruments()
  }

  const handleInstrumentDelete = async (id: number): Promise<void> => {
    setInstrumentError('')
    setInstrumentMessage('')

    const deleted = await apiClient.deleteInstrument(id)

    if (!deleted.success) {
      setInstrumentError(deleted.error ?? 'No se pudo eliminar el instrumento.')
      return
    }

    setInstrumentMessage('Instrumento eliminado correctamente.')
    if (editingInstrumentId === id) {
      resetInstrumentEditor()
    }
    await loadInstruments()
  }

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setCategoryError('')
    setCategoryMessage('')

    const payload = {
      ...categoryForm,
      name: categoryForm.name.trim(),
    }

    if (editingCategoryId === null) {
      const created = await apiClient.createCategory(payload)
      if (!created.success) {
        setCategoryError(created.error ?? 'No se pudo crear la categoria.')
        return
      }

      setCategoryMessage('Categoria creada correctamente.')
    } else {
      const updated = await apiClient.updateCategory(editingCategoryId, payload)
      if (!updated.success) {
        setCategoryError(updated.error ?? 'No se pudo actualizar la categoria.')
        return
      }

      setCategoryMessage('Categoria actualizada correctamente.')
    }

    resetCategoryEditor()
    await loadCategories()
  }

  const handleCategoryDelete = async (id: number): Promise<void> => {
    setCategoryError('')
    setCategoryMessage('')

    const deleted = await apiClient.deleteCategory(id)

    if (!deleted.success) {
      setCategoryError(deleted.error ?? 'No se pudo eliminar la categoria.')
      return
    }

    setCategoryMessage('Categoria eliminada correctamente.')
    if (editingCategoryId === id) {
      resetCategoryEditor()
    }
    if (subcategoryForm.categoryId === id) {
      resetSubcategoryEditor()
    }
    await loadCategories()
  }

  const handleSubcategorySubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSubcategoryError('')
    setSubcategoryMessage('')

    if (subcategoryForm.categoryId < 1) {
      setSubcategoryError('Selecciona una categoria valida.')
      return
    }

    const payload = {
      ...subcategoryForm,
      name: subcategoryForm.name.trim(),
    }

    if (editingSubcategoryId === null) {
      const created = await apiClient.createSubcategory(payload)
      if (!created.success) {
        setSubcategoryError(created.error ?? 'No se pudo crear la subcategoria.')
        return
      }

      setSubcategoryMessage('Subcategoria creada correctamente.')
    } else {
      const updated = await apiClient.updateSubcategory(editingSubcategoryId, payload)
      if (!updated.success) {
        setSubcategoryError(updated.error ?? 'No se pudo actualizar la subcategoria.')
        return
      }

      setSubcategoryMessage('Subcategoria actualizada correctamente.')
    }

    resetSubcategoryEditor()
    await loadCategories()
  }

  const handleSubcategoryDelete = async (id: number): Promise<void> => {
    setSubcategoryError('')
    setSubcategoryMessage('')

    const deleted = await apiClient.deleteSubcategory(id)

    if (!deleted.success) {
      setSubcategoryError(deleted.error ?? 'No se pudo eliminar la subcategoria.')
      return
    }

    setSubcategoryMessage('Subcategoria eliminada correctamente.')
    if (editingSubcategoryId === id) {
      resetSubcategoryEditor()
    }
    await loadCategories()
  }

  const resetTransactionForm = (): void => {
    setTransactionForm({
      ...EMPTY_TRANSACTION_FORM,
      instrumentId: instruments[0]?.id ?? 0,
      categoryId: null,
    })
  }

  const handleTransactionTypeChange = (nextType: TransactionType): void => {
    setTransactionForm((previous) => ({
      ...previous,
      type: nextType,
      isMsi: nextType === 'expense' ? previous.isMsi : false,
      msiMonths: nextType === 'expense' ? previous.msiMonths : null,
    }))
  }

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setTransactionError('')
    setTransactionMessage('')

    const payload: TransactionInput = {
      ...transactionForm,
      instrumentId: selectedTransactionInstrumentId,
      categoryId: selectedTransactionCategoryId,
      subcategoryId: transactionForm.subcategoryId,
      description: transactionForm.description.trim(),
      notes: transactionForm.notes.trim(),
      isMsi: transactionForm.type === 'expense' ? transactionForm.isMsi : false,
      msiMonths: transactionForm.type === 'expense' && transactionForm.isMsi ? transactionForm.msiMonths : null,
    }

    if (payload.instrumentId < 1) {
      setTransactionError('Selecciona un instrumento valido.')
      return
    }

    if (!payload.transactionDate) {
      setTransactionError('Selecciona una fecha valida.')
      return
    }

    if (payload.amount <= 0) {
      setTransactionError('Ingresa un monto mayor a cero.')
      return
    }

    const created = await apiClient.createTransaction(payload)

    if (!created.success) {
      setTransactionError(created.error ?? 'No se pudo crear la transaccion.')
      return
    }

    setTransactionMessage('Transaccion creada correctamente.')
    resetTransactionForm()
    await loadInstruments()
    await loadTransactions()
  }

  const handleTransactionDelete = async (id: number): Promise<void> => {
    setTransactionError('')
    setTransactionMessage('')

    const deleted = await apiClient.deleteTransaction(id)

    if (!deleted.success) {
      setTransactionError(deleted.error ?? 'No se pudo eliminar la transaccion.')
      return
    }

    setTransactionMessage('Transaccion eliminada correctamente.')
    await loadInstruments()
    await loadTransactions()
  }

  const handleTransactionFiltersSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await loadTransactions(transactionFilters)
  }

  const clearTransactionFilters = async (): Promise<void> => {
    setTransactionFilters(EMPTY_TRANSACTION_FILTERS)
    await loadTransactions(EMPTY_TRANSACTION_FILTERS)
  }

  const resetStatementForm = (): void => {
    setStatementForm({
      ...EMPTY_STATEMENT_FORM,
      instrumentId: creditCardInstruments[0]?.id ?? 0,
    })
  }

  const resetStatementUpdateForm = (): void => {
    setEditingStatementId(null)
    setStatementUpdateForm(EMPTY_STATEMENT_UPDATE_FORM)
  }

  const handleStatementSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setStatementError('')
    setStatementMessage('')

    const payload: CreditCardStatementInput = {
      ...statementForm,
      instrumentId: selectedStatementInstrumentId,
      paymentDueDate: statementForm.paymentDueDate.trim(),
    }

    if (payload.instrumentId < 1) {
      setStatementError('Selecciona una tarjeta de credito valida.')
      return
    }

    if (!payload.cutOffDate) {
      setStatementError('Selecciona una fecha de corte valida.')
      return
    }

    const created = await apiClient.createStatement(payload)

    if (!created.success) {
      setStatementError(created.error ?? 'No se pudo crear el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta creado correctamente.')
    resetStatementForm()
    await loadStatements()
  }

  const startStatementEdit = (statement: CreditCardStatement): void => {
    setEditingStatementId(statement.id)
    setStatementUpdateForm({
      paymentDueDate: statement.paymentDueDate,
      minimumPayment: statement.minimumPayment,
      noInterestPayment: statement.noInterestPayment,
      isPaid: statement.isPaid,
      paidAmount: statement.paidAmount,
      paidDate: statement.paidDate ?? '',
    })
  }

  const handleStatementUpdate = async (): Promise<void> => {
    if (editingStatementId === null) {
      return
    }

    setStatementError('')
    setStatementMessage('')

    const updated = await apiClient.updateStatement(editingStatementId, statementUpdateForm)

    if (!updated.success) {
      setStatementError(updated.error ?? 'No se pudo actualizar el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta actualizado correctamente.')
    resetStatementUpdateForm()
    await loadStatements()
  }

  const handleStatementDelete = async (id: number): Promise<void> => {
    setStatementError('')
    setStatementMessage('')

    const deleted = await apiClient.deleteStatement(id)

    if (!deleted.success) {
      setStatementError(deleted.error ?? 'No se pudo eliminar el estado de cuenta.')
      return
    }

    setStatementMessage('Estado de cuenta eliminado correctamente.')
    if (editingStatementId === id) {
      resetStatementUpdateForm()
    }
    await loadStatements()
  }

  const resetTransferForm = (): void => {
    setTransferForm({
      ...EMPTY_TRANSFER_FORM,
      sourceInstrumentId: sourceTransferInstruments[0]?.id ?? 0,
      destinationInstrumentId: creditCardInstruments[0]?.id ?? 0,
    })
  }

  const handleTransferTypeChange = (nextType: TransferType): void => {
    setTransferForm((previous) => ({
      ...previous,
      type: nextType,
      statementId: nextType === 'card_payment' ? previous.statementId : null,
    }))
  }

  const handleTransferSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setTransferError('')
    setTransferMessage('')

    const payload: TransferInput = {
      ...transferForm,
      sourceInstrumentId: selectedTransferSourceInstrumentId,
      destinationInstrumentId: selectedTransferDestinationInstrumentId,
      description: transferForm.description.trim(),
      notes: transferForm.notes.trim(),
    }

    if (payload.sourceInstrumentId < 1 || payload.destinationInstrumentId < 1) {
      setTransferError('Selecciona instrumentos validos para la transferencia.')
      return
    }

    if (payload.sourceInstrumentId === payload.destinationInstrumentId) {
      setTransferError('El origen y destino deben ser distintos.')
      return
    }

    if (payload.amount <= 0) {
      setTransferError('Ingresa un monto mayor a cero.')
      return
    }

    const created = await apiClient.createTransfer(payload)

    if (!created.success) {
      setTransferError(created.error ?? 'No se pudo crear la transferencia.')
      return
    }

    setTransferMessage('Transferencia registrada correctamente.')
    resetTransferForm()
    await loadInstruments()
    await loadTransfers()
  }

  const handleTransferDelete = async (id: number): Promise<void> => {
    setTransferError('')
    setTransferMessage('')

    const deleted = await apiClient.deleteTransfer(id)

    if (!deleted.success) {
      setTransferError(deleted.error ?? 'No se pudo eliminar la transferencia.')
      return
    }

    setTransferMessage('Transferencia eliminada correctamente.')
    await loadInstruments()
    await loadTransfers()
  }

  const resetLoanEditor = (): void => {
    setLoanForm({
      ...EMPTY_LOAN_FORM,
      instrumentId: loanPaymentInstruments[0]?.id ?? null,
    })
    setEditingLoanId(null)
  }

  const startLoanEdit = (loan: Loan): void => {
    setEditingLoanId(loan.id)
    setLoanForm({
      name: loan.name,
      lender: loan.lender ?? '',
      currencyId: loan.currencyId,
      originalAmount: loan.originalAmount,
      annualRate: loan.annualRate,
      totalInstallments: loan.totalInstallments,
      paymentType: loan.paymentType,
      fixedPayment: loan.fixedPayment,
      paymentDay: loan.paymentDay,
      startDate: loan.startDate,
      endDate: loan.endDate ?? '',
      instrumentId: loan.instrumentId,
      notes: loan.notes ?? '',
      isActive: loan.isActive,
    })
  }

  const handleLoanPaymentTypeChange = (nextType: LoanPaymentType): void => {
    setLoanForm((previous) => ({
      ...previous,
      paymentType: nextType,
      fixedPayment: nextType === 'fixed' ? (previous.fixedPayment ?? 0) : null,
      annualRate: nextType === 'variable' ? previous.annualRate : previous.annualRate,
    }))
  }

  const handleLoanSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setLoanError('')
    setLoanMessage('')

    if (loanForm.originalAmount <= 0) {
      setLoanError('Ingresa un monto original mayor a cero.')
      return
    }

    if (loanForm.totalInstallments < 1) {
      setLoanError('Ingresa un total de cuotas valido.')
      return
    }

    if (loanForm.paymentType === 'fixed' && (!loanForm.fixedPayment || loanForm.fixedPayment <= 0)) {
      setLoanError('Ingresa un pago fijo valido.')
      return
    }

    if (loanForm.paymentType === 'variable' && (!loanForm.annualRate || loanForm.annualRate <= 0)) {
      setLoanError('Ingresa una tasa anual valida para pago variable.')
      return
    }

    const payload: LoanInput = {
      ...loanForm,
      name: loanForm.name.trim(),
      lender: loanForm.lender.trim(),
      endDate: loanForm.endDate.trim(),
      notes: loanForm.notes.trim(),
    }

    if (editingLoanId === null) {
      const created = await apiClient.createLoan(payload)
      if (!created.success) {
        setLoanError(created.error ?? 'No se pudo crear el prestamo.')
        return
      }

      setLoanMessage('Prestamo creado correctamente.')
    } else {
      const updated = await apiClient.updateLoan(editingLoanId, payload)
      if (!updated.success) {
        setLoanError(updated.error ?? 'No se pudo actualizar el prestamo.')
        return
      }

      setLoanMessage('Prestamo actualizado correctamente.')
    }

    resetLoanEditor()
    await loadLoans()
  }

  const handleLoanDelete = async (id: number): Promise<void> => {
    setLoanError('')
    setLoanMessage('')

    const deleted = await apiClient.deleteLoan(id)
    if (!deleted.success) {
      setLoanError(deleted.error ?? 'No se pudo eliminar el prestamo.')
      return
    }

    setLoanMessage('Prestamo eliminado correctamente.')
    if (editingLoanId === id) {
      resetLoanEditor()
    }
    if (selectedLoanId === id) {
      setSelectedLoanId(null)
      setLoanPayments([])
    }
    await loadLoans()
  }

  const handlePayInstallment = async (installmentNum: number): Promise<void> => {
    if (!selectedLoanId) {
      return
    }

    setLoanError('')
    setLoanMessage('')

    const paid = await apiClient.payLoanInstallment(selectedLoanId, installmentNum, loanPaymentRegister)
    if (!paid.success) {
      setLoanError(paid.error ?? 'No se pudo registrar el pago de la cuota.')
      return
    }

    setLoanMessage(`Cuota ${installmentNum} pagada correctamente.`)
    setLoanPaymentRegister(EMPTY_LOAN_PAYMENT_REGISTER)
    await loadLoans()
    await loadLoanPayments(selectedLoanId)
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

  const resetFixedExpenseEditor = (): void => {
    setFixedExpenseForm({
      ...EMPTY_FIXED_EXPENSE_FORM,
      instrumentId: instruments.find((instrument) => instrument.type !== 'credit_card')?.id ?? null,
      categoryId: null,
      subcategoryId: null,
    })
    setEditingFixedExpenseId(null)
  }

  const handleFixedExpenseSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setFixedExpenseError('')
    setFixedExpenseMessage('')

    if (fixedExpenseForm.estimatedAmount <= 0) {
      setFixedExpenseError('Ingresa un monto estimado mayor a cero.')
      return
    }

    const payload: FixedExpenseInput = {
      ...fixedExpenseForm,
      name: fixedExpenseForm.name.trim(),
      notes: fixedExpenseForm.notes.trim(),
    }

    if (editingFixedExpenseId === null) {
      const created = await apiClient.createFixedExpense(payload)
      if (!created.success) {
        setFixedExpenseError(created.error ?? 'No se pudo crear el gasto fijo.')
        return
      }
      setFixedExpenseMessage('Gasto fijo creado correctamente.')
    } else {
      const updated = await apiClient.updateFixedExpense(editingFixedExpenseId, payload)
      if (!updated.success) {
        setFixedExpenseError(updated.error ?? 'No se pudo actualizar el gasto fijo.')
        return
      }
      setFixedExpenseMessage('Gasto fijo actualizado correctamente.')
    }

    resetFixedExpenseEditor()
    await loadFixedExpenses()
  }

  const handleFixedExpenseDelete = async (fixedExpenseId: number): Promise<void> => {
    setFixedExpenseError('')
    setFixedExpenseMessage('')

    const deleted = await apiClient.deleteFixedExpense(fixedExpenseId)
    if (!deleted.success) {
      setFixedExpenseError(deleted.error ?? 'No se pudo eliminar el gasto fijo.')
      return
    }

    setFixedExpenseMessage('Gasto fijo eliminado correctamente.')
    if (editingFixedExpenseId === fixedExpenseId) {
      resetFixedExpenseEditor()
    }
    if (selectedFixedExpenseId === fixedExpenseId) {
      setSelectedFixedExpenseId(null)
      setFixedExpensePayments([])
    }
    await loadFixedExpenses()
  }

  const resetFixedExpensePaymentForm = (): void => {
    setFixedExpensePaymentForm(EMPTY_FIXED_EXPENSE_PAYMENT_FORM)
  }

  const handleFixedExpensePaymentSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!selectedFixedExpenseId) {
      setFixedExpenseError('Primero selecciona un gasto fijo.')
      return
    }

    setFixedExpenseError('')
    setFixedExpenseMessage('')

    if (fixedExpensePaymentForm.amount <= 0) {
      setFixedExpenseError('Ingresa un monto de pago mayor a cero.')
      return
    }

    const payload: FixedExpensePaymentInput = {
      ...fixedExpensePaymentForm,
      notes: fixedExpensePaymentForm.notes.trim(),
      paymentDate: fixedExpensePaymentForm.paymentDate.trim(),
    }

    const created = await apiClient.createFixedExpensePayment(selectedFixedExpenseId, payload)
    if (!created.success) {
      setFixedExpenseError(created.error ?? 'No se pudo registrar el pago mensual.')
      return
    }

    setFixedExpenseMessage('Pago mensual registrado correctamente.')
    resetFixedExpensePaymentForm()
    await loadFixedExpensePayments(selectedFixedExpenseId)
  }

  const handleFixedExpensePaymentDelete = async (paymentId: number): Promise<void> => {
    if (!selectedFixedExpenseId) {
      return
    }

    setFixedExpenseError('')
    setFixedExpenseMessage('')

    const deleted = await apiClient.deleteFixedExpensePayment(selectedFixedExpenseId, paymentId)
    if (!deleted.success) {
      setFixedExpenseError(deleted.error ?? 'No se pudo eliminar el pago mensual.')
      return
    }

    setFixedExpenseMessage('Pago mensual eliminado correctamente.')
    await loadFixedExpensePayments(selectedFixedExpenseId)
  }

  const resetBudgetEditor = (): void => {
    setBudgetForm({
      ...EMPTY_BUDGET_FORM,
      month: budgetFilterMonth,
      year: budgetFilterYear,
    })
    setEditingBudgetId(null)
  }

  const startBudgetEdit = (budget: Budget): void => {
    setEditingBudgetId(budget.id)
    setBudgetForm({
      categoryId: budget.categoryId,
      currencyId: budget.currencyId,
      amount: budget.amount,
      month: budget.month,
      year: budget.year,
      notes: budget.notes ?? '',
    })
  }

  const handleBudgetSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setBudgetError('')
    setBudgetMessage('')

    if (budgetForm.amount <= 0) {
      setBudgetError('Ingresa un monto de presupuesto mayor a cero.')
      return
    }

    const payload: BudgetInput = {
      ...budgetForm,
      notes: budgetForm.notes.trim(),
    }

    if (editingBudgetId === null) {
      const created = await apiClient.createBudget(payload)
      if (!created.success) {
        setBudgetError(created.error ?? 'No se pudo crear el presupuesto.')
        return
      }
      setBudgetMessage('Presupuesto creado correctamente.')
    } else {
      const updated = await apiClient.updateBudget(editingBudgetId, payload)
      if (!updated.success) {
        setBudgetError(updated.error ?? 'No se pudo actualizar el presupuesto.')
        return
      }
      setBudgetMessage('Presupuesto actualizado correctamente.')
    }

    resetBudgetEditor()
    await loadBudgets(budgetFilterMonth, budgetFilterYear)
  }

  const handleBudgetDelete = async (budgetId: number): Promise<void> => {
    setBudgetError('')
    setBudgetMessage('')

    const deleted = await apiClient.deleteBudget(budgetId)
    if (!deleted.success) {
      setBudgetError(deleted.error ?? 'No se pudo eliminar el presupuesto.')
      return
    }

    setBudgetMessage('Presupuesto eliminado correctamente.')
    if (editingBudgetId === budgetId) {
      resetBudgetEditor()
    }
    await loadBudgets(budgetFilterMonth, budgetFilterYear)
  }

  const resetSimulationForm = (): void => {
    setSimulationForm({
      ...EMPTY_SIMULATION_FORM,
      instrumentId: instruments[0]?.id ?? null,
    })
  }

  const handleSimulationScenarioTypeChange = (scenarioType: SimulationScenarioType): void => {
    setSimulationForm((previous) => ({
      ...previous,
      scenarioType,
      instrumentId: scenarioType === 'loan' ? null : previous.instrumentId,
      msiMonths: scenarioType === 'msi' ? (previous.msiMonths ?? MSI_OPTIONS[0]) : null,
      loanMonths: scenarioType === 'loan' ? (previous.loanMonths ?? 12) : null,
      annualRate: scenarioType === 'loan' ? (previous.annualRate ?? 0) : null,
    }))
  }

  const handleSimulationSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setSimulationError('')
    setSimulationMessage('')

    if (simulationForm.amount <= 0) {
      setSimulationError('Ingresa un monto mayor a cero para simular.')
      return
    }

    if (simulationForm.scenarioType === 'msi') {
      if (!simulationForm.instrumentId) {
        setSimulationError('Selecciona una tarjeta de credito para escenario MSI.')
        return
      }

      if (!simulationForm.msiMonths) {
        setSimulationError('Selecciona los meses MSI.')
        return
      }
    }

    if (simulationForm.scenarioType === 'loan') {
      if (!simulationForm.loanMonths || simulationForm.loanMonths < 1) {
        setSimulationError('Ingresa un plazo de prestamo valido.')
        return
      }

      if (simulationForm.annualRate === null || simulationForm.annualRate < 0) {
        setSimulationError('Ingresa una tasa anual valida para la simulacion de prestamo.')
        return
      }
    }

    const payload: SimulationInput = {
      ...simulationForm,
      name: simulationForm.name.trim(),
      description: simulationForm.description.trim(),
      simulationDate: simulationForm.simulationDate.trim(),
      instrumentId: simulationForm.scenarioType === 'loan' ? null : simulationForm.instrumentId,
    }

    const created = await apiClient.createSimulation(payload)
    if (!created.success) {
      setSimulationError(created.error ?? 'No se pudo crear la simulacion.')
      return
    }

    setSimulationMessage('Simulacion creada correctamente.')
    resetSimulationForm()
    await loadSimulations()
  }

  const handleSimulationDelete = async (simulationId: number): Promise<void> => {
    setSimulationError('')
    setSimulationMessage('')

    const deleted = await apiClient.deleteSimulation(simulationId)
    if (!deleted.success) {
      setSimulationError(deleted.error ?? 'No se pudo eliminar la simulacion.')
      return
    }

    setSimulationMessage('Simulacion eliminada correctamente.')
    await loadSimulations()
  }

  const resetReminderEditor = (): void => {
    setReminderForm(EMPTY_REMINDER_FORM)
    setEditingReminderId(null)
  }

  const startReminderEdit = (reminder: Reminder): void => {
    setEditingReminderId(reminder.id)
    setReminderForm({
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: reminder.isRead,
      isDismissed: reminder.isDismissed,
    })
  }

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setReminderError('')
    setReminderMessage('')

    if (reminderForm.title.trim().length < 2) {
      setReminderError('El titulo debe tener al menos 2 caracteres.')
      return
    }

    const payload: ReminderInput = {
      ...reminderForm,
      title: reminderForm.title.trim(),
      description: reminderForm.description.trim(),
      referenceType: reminderForm.referenceType.trim(),
    }

    if (editingReminderId === null) {
      const created = await apiClient.createReminder(payload)
      if (!created.success) {
        setReminderError(created.error ?? 'No se pudo crear el recordatorio.')
        return
      }
      setReminderMessage('Recordatorio creado correctamente.')
    } else {
      const updated = await apiClient.updateReminder(editingReminderId, payload)
      if (!updated.success) {
        setReminderError(updated.error ?? 'No se pudo actualizar el recordatorio.')
        return
      }
      setReminderMessage('Recordatorio actualizado correctamente.')
    }

    resetReminderEditor()
    await loadReminders()
  }

  const handleReminderDelete = async (reminderId: number): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const deleted = await apiClient.deleteReminder(reminderId)
    if (!deleted.success) {
      setReminderError(deleted.error ?? 'No se pudo eliminar el recordatorio.')
      return
    }

    setReminderMessage('Recordatorio eliminado correctamente.')
    if (editingReminderId === reminderId) {
      resetReminderEditor()
    }
    await loadReminders()
  }

  const handleReminderMarkAsRead = async (reminder: Reminder): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const updated = await apiClient.updateReminder(reminder.id, {
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: true,
      isDismissed: reminder.isDismissed,
    })

    if (!updated.success) {
      setReminderError(updated.error ?? 'No se pudo marcar como leido.')
      return
    }

    setReminderMessage('Recordatorio marcado como leido.')
    await loadReminders()
  }

  const handleReminderDismiss = async (reminder: Reminder): Promise<void> => {
    setReminderError('')
    setReminderMessage('')

    const updated = await apiClient.updateReminder(reminder.id, {
      title: reminder.title,
      description: reminder.description ?? '',
      reminderDate: reminder.reminderDate,
      type: reminder.type,
      referenceId: reminder.referenceId,
      referenceType: reminder.referenceType ?? '',
      isRead: reminder.isRead,
      isDismissed: true,
    })

    if (!updated.success) {
      setReminderError(updated.error ?? 'No se pudo descartar el recordatorio.')
      return
    }

    setReminderMessage('Recordatorio descartado correctamente.')
    await loadReminders()
  }

  if (isLoading) {
    return (
      <main className="settings-screen settings-screen--centered">
        <p className="settings-screen__status">Cargando configuracion local...</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeSection={activeSection}
        pendingRemindersCount={pendingRemindersCount}
        onSectionChange={handleSectionChange}
      />

      <section className="app-shell__content">
        <Suspense
          fallback={(
            <section className="card">
              <p className="settings-screen__status">Cargando seccion...</p>
            </section>
          )}
        >
        {activeSection === 'dashboard' ? (
          <DashboardSection
            hasConfig={hasConfig}
            isDashboardLoading={isDashboardLoading}
            dashboardError={dashboardError}
            dashboardSummary={dashboardSummary}
            dashboardExpensesByCategory={dashboardExpensesByCategory}
            dashboardCashFlow={dashboardCashFlow}
            dashboardBalanceEvolution={dashboardBalanceEvolution}
            dashboardFutureExpenses={dashboardFutureExpenses}
            onReload={() => {
              void loadDashboard()
            }}
          />
        ) : null}

        {activeSection === 'settings' ? (
          <SettingsSection
            config={config}
            isSaving={isSaving}
            isPinging={isPinging}
            error={error}
            successMessage={successMessage}
            pingError={pingError}
            pingResponse={pingResponse}
            onConfigChange={setConfig}
            onSave={handleSave}
            onPing={() => {
              void handlePing()
            }}
          />
        ) : null}

        {activeSection === 'banks' ? (
          <BanksSection
            hasConfig={hasConfig}
            editingBankId={editingBankId}
            bankForm={bankForm}
            isBanksLoading={isBanksLoading}
            banks={banks}
            bankError={bankError}
            bankMessage={bankMessage}
            onBankFormChange={setBankForm}
            onSubmit={handleBankSubmit}
            onReset={resetBankEditor}
            onReload={() => {
              void loadBanks()
            }}
            onEdit={(bank) => {
              setEditingBankId(bank.id)
              setBankForm(toEditableBank(bank))
            }}
            onDelete={(bankId) => {
              void handleBankDelete(bankId)
            }}
          />
        ) : null}

        {activeSection === 'instruments' ? (
          <InstrumentsSection
            hasConfig={hasConfig}
            editingInstrumentId={editingInstrumentId}
            instrumentForm={instrumentForm}
            selectedBankId={selectedBankId}
            banks={banks}
            isInstrumentsLoading={isInstrumentsLoading}
            groupedInstruments={groupedInstruments}
            instrumentError={instrumentError}
            instrumentMessage={instrumentMessage}
            onInstrumentFormChange={setInstrumentForm}
            onTypeChange={handleInstrumentTypeChange}
            onSubmit={handleInstrumentSubmit}
            onReset={resetInstrumentEditor}
            onReload={() => {
              void loadInstruments()
            }}
            onEdit={(instrument) => {
              setEditingInstrumentId(instrument.id)
              setInstrumentForm(toEditableInstrument(instrument))
            }}
            onDelete={(instrumentId) => {
              void handleInstrumentDelete(instrumentId)
            }}
          />
        ) : null}

        {activeSection === 'categories' ? (
          <CategoriesSection
            hasConfig={hasConfig}
            categories={categories}
            isCategoriesLoading={isCategoriesLoading}
            categoryForm={categoryForm}
            subcategoryForm={subcategoryForm}
            categoryOptions={categoryOptions}
            selectedSubcategoryCategoryId={selectedSubcategoryCategoryId}
            editingCategoryId={editingCategoryId}
            editingSubcategoryId={editingSubcategoryId}
            categoryError={categoryError}
            categoryMessage={categoryMessage}
            subcategoryError={subcategoryError}
            subcategoryMessage={subcategoryMessage}
            onCategoryFormChange={setCategoryForm}
            onSubcategoryFormChange={setSubcategoryForm}
            onCategorySubmit={handleCategorySubmit}
            onSubcategorySubmit={handleSubcategorySubmit}
            onCategoryReset={resetCategoryEditor}
            onSubcategoryReset={resetSubcategoryEditor}
            onReload={() => {
              void loadCategories()
            }}
            onEditCategory={(category) => {
              setEditingCategoryId(category.id)
              setCategoryForm(toEditableCategory(category))
            }}
            onDeleteCategory={(categoryId) => {
              void handleCategoryDelete(categoryId)
            }}
            onEditSubcategory={(subcategory) => {
              setEditingSubcategoryId(subcategory.id)
              setSubcategoryForm(toEditableSubcategory(subcategory))
            }}
            onDeleteSubcategory={(subcategoryId) => {
              void handleSubcategoryDelete(subcategoryId)
            }}
          />
        ) : null}

        {activeSection === 'transactions' ? (
          <TransactionsSection
            hasConfig={hasConfig}
            instruments={instruments}
            categories={categories}
            transactionForm={transactionForm}
            selectedTransactionInstrumentId={selectedTransactionInstrumentId}
            selectedTransactionCategoryId={selectedTransactionCategoryId}
            selectedTransactionInstrument={selectedTransactionInstrument}
            transactionSubcategoryOptions={transactionSubcategoryOptions}
            transactionFilters={transactionFilters}
            transactions={transactions}
            activeMsiTransactions={activeMsiTransactions}
            isTransactionsLoading={isTransactionsLoading}
            transactionError={transactionError}
            transactionMessage={transactionMessage}
            onTransactionFormChange={setTransactionForm}
            onTransactionTypeChange={handleTransactionTypeChange}
            onTransactionSubmit={handleTransactionSubmit}
            onTransactionDelete={(transactionId) => {
              void handleTransactionDelete(transactionId)
            }}
            onResetTransactionForm={resetTransactionForm}
            onFiltersChange={setTransactionFilters}
            onFiltersSubmit={handleTransactionFiltersSubmit}
            onClearFilters={() => {
              void clearTransactionFilters()
            }}
            onReload={() => {
              void loadTransactions()
            }}
          />
        ) : null}

        {activeSection === 'creditCards' ? (
          <CreditCardsSection
            hasConfig={hasConfig}
            totalCreditCardDebt={totalCreditCardDebt}
            totalAvailableCredit={totalAvailableCredit}
            creditCardInstruments={creditCardInstruments}
            sourceTransferInstruments={sourceTransferInstruments}
            availableTransferDestinations={availableTransferDestinations}
            selectedStatementInstrumentId={selectedStatementInstrumentId}
            selectedTransferSourceInstrumentId={selectedTransferSourceInstrumentId}
            selectedTransferDestinationInstrumentId={selectedTransferDestinationInstrumentId}
            statementForm={statementForm}
            transferForm={transferForm}
            statements={statements}
            transfers={transfers}
            statementUpdateForm={statementUpdateForm}
            editingStatementId={editingStatementId}
            selectedStatementDetail={selectedStatementDetail}
            statementMovements={statementMovements}
            isStatementsLoading={isStatementsLoading}
            isTransfersLoading={isTransfersLoading}
            isStatementMovementsLoading={isStatementMovementsLoading}
            statementError={statementError}
            statementMessage={statementMessage}
            transferError={transferError}
            transferMessage={transferMessage}
            onStatementFormChange={setStatementForm}
            onTransferFormChange={setTransferForm}
            onStatementUpdateFormChange={setStatementUpdateForm}
            onTransferTypeChange={handleTransferTypeChange}
            onStatementSubmit={handleStatementSubmit}
            onTransferSubmit={handleTransferSubmit}
            onResetStatementForm={resetStatementForm}
            onResetTransferForm={resetTransferForm}
            onReloadStatements={() => {
              void loadStatements()
            }}
            onReloadTransfers={() => {
              void loadTransfers()
            }}
            onLoadStatementMovements={(statement) => {
              void loadStatementMovements(statement)
            }}
            onStartStatementEdit={startStatementEdit}
            onDeleteStatement={(statementId) => {
              void handleStatementDelete(statementId)
            }}
            onSaveStatementUpdate={() => {
              void handleStatementUpdate()
            }}
            onCancelStatementUpdate={resetStatementUpdateForm}
            onDeleteTransfer={(transferId) => {
              void handleTransferDelete(transferId)
            }}
          />
        ) : null}

        {activeSection === 'subscriptions' ? (
          <SubscriptionsSection
            hasConfig={hasConfig}
            instruments={instruments}
            expenseCategoryOptions={expenseCategoryOptions}
            selectedSubscriptionCategory={selectedSubscriptionCategory}
            subscriptions={subscriptions}
            isSubscriptionsLoading={isSubscriptionsLoading}
            subscriptionForm={subscriptionForm}
            editingSubscriptionId={editingSubscriptionId}
            subscriptionError={subscriptionError}
            subscriptionMessage={subscriptionMessage}
            onSubscriptionFormChange={setSubscriptionForm}
            onBillingCycleChange={handleSubscriptionBillingCycleChange}
            onSubmit={handleSubscriptionSubmit}
            onReset={resetSubscriptionEditor}
            onReload={() => {
              void loadSubscriptions()
            }}
            onEdit={(subscription) => {
              setEditingSubscriptionId(subscription.id)
              setSubscriptionForm(toEditableSubscription(subscription))
            }}
            onDelete={(subscriptionId) => {
              void handleSubscriptionDelete(subscriptionId)
            }}
          />
        ) : null}

        {activeSection === 'fixedExpenses' ? (
          <FixedExpensesSection
            hasConfig={hasConfig}
            instruments={instruments}
            expenseCategoryOptions={expenseCategoryOptions}
            selectedFixedExpenseCategory={selectedFixedExpenseCategory}
            fixedExpenses={fixedExpenses}
            fixedExpenseForm={fixedExpenseForm}
            editingFixedExpenseId={editingFixedExpenseId}
            fixedExpensePayments={fixedExpensePayments}
            selectedFixedExpenseId={selectedFixedExpenseId}
            selectedFixedExpense={selectedFixedExpense}
            fixedExpensePaymentForm={fixedExpensePaymentForm}
            isFixedExpensesLoading={isFixedExpensesLoading}
            isFixedExpensePaymentsLoading={isFixedExpensePaymentsLoading}
            fixedExpenseError={fixedExpenseError}
            fixedExpenseMessage={fixedExpenseMessage}
            onFixedExpenseFormChange={setFixedExpenseForm}
            onFixedExpensePaymentFormChange={setFixedExpensePaymentForm}
            onFixedExpenseSubmit={handleFixedExpenseSubmit}
            onFixedExpensePaymentSubmit={handleFixedExpensePaymentSubmit}
            onResetFixedExpenseEditor={resetFixedExpenseEditor}
            onResetFixedExpensePaymentForm={resetFixedExpensePaymentForm}
            onReloadFixedExpenses={() => {
              void loadFixedExpenses()
            }}
            onSelectFixedExpense={(fixedExpenseId) => {
              setSelectedFixedExpenseId(fixedExpenseId)
              setFixedExpensePayments([])
              if (fixedExpenseId) {
                void loadFixedExpensePayments(fixedExpenseId)
              }
            }}
            onEditFixedExpense={(expense) => {
              setEditingFixedExpenseId(expense.id)
              setFixedExpenseForm(toEditableFixedExpense(expense))
            }}
            onLoadFixedExpensePayments={(fixedExpenseId) => {
              void loadFixedExpensePayments(fixedExpenseId)
            }}
            onDeleteFixedExpense={(fixedExpenseId) => {
              void handleFixedExpenseDelete(fixedExpenseId)
            }}
            onDeleteFixedExpensePayment={(paymentId) => {
              void handleFixedExpensePaymentDelete(paymentId)
            }}
          />
        ) : null}

        {activeSection === 'loans' ? (
          <LoansSection
            hasConfig={hasConfig}
            loanForm={loanForm}
            loans={loans}
            selectedLoan={selectedLoan}
            loanPayments={loanPayments}
            loanPaymentRegister={loanPaymentRegister}
            loanPaymentInstruments={loanPaymentInstruments}
            editingLoanId={editingLoanId}
            isLoansLoading={isLoansLoading}
            isLoanPaymentsLoading={isLoanPaymentsLoading}
            loanError={loanError}
            loanMessage={loanMessage}
            onLoanFormChange={setLoanForm}
            onLoanPaymentRegisterChange={setLoanPaymentRegister}
            onLoanPaymentTypeChange={handleLoanPaymentTypeChange}
            onSubmit={handleLoanSubmit}
            onReset={resetLoanEditor}
            onReload={() => {
              void loadLoans()
            }}
            onLoadLoanPayments={(loanId) => {
              void loadLoanPayments(loanId)
            }}
            onEditLoan={startLoanEdit}
            onDeleteLoan={(loanId) => {
              void handleLoanDelete(loanId)
            }}
            onPayInstallment={(installmentNum) => {
              void handlePayInstallment(installmentNum)
            }}
          />
        ) : null}

        {activeSection === 'budgets' ? (
          <BudgetsSection
            hasConfig={hasConfig}
            expenseCategoryOptions={expenseCategoryOptions}
            budgetMessage={budgetMessage}
            budgetError={budgetError}
            editingBudgetId={editingBudgetId}
            budgetForm={budgetForm}
            isBudgetsLoading={isBudgetsLoading}
            budgetFilterMonth={budgetFilterMonth}
            budgetFilterYear={budgetFilterYear}
            budgets={budgets}
            onBudgetFormChange={setBudgetForm}
            onBudgetFilterMonthChange={setBudgetFilterMonth}
            onBudgetFilterYearChange={setBudgetFilterYear}
            onSubmit={handleBudgetSubmit}
            onReset={resetBudgetEditor}
            onApplyFilter={() => {
              void loadBudgets(budgetFilterMonth, budgetFilterYear)
            }}
            onEditBudget={startBudgetEdit}
            onDeleteBudget={(budgetId) => {
              void handleBudgetDelete(budgetId)
            }}
          />
        ) : null}

        {activeSection === 'simulator' ? (
          <SimulatorSection
            hasConfig={hasConfig}
            simulationMessage={simulationMessage}
            simulationError={simulationError}
            simulationForm={simulationForm}
            simulationInstrumentOptions={simulationInstrumentOptions}
            simulations={simulations}
            isSimulationsLoading={isSimulationsLoading}
            onSimulationFormChange={setSimulationForm}
            onScenarioTypeChange={handleSimulationScenarioTypeChange}
            onSubmit={handleSimulationSubmit}
            onReset={resetSimulationForm}
            onReload={() => {
              void loadSimulations()
            }}
            onDelete={(simulationId) => {
              void handleSimulationDelete(simulationId)
            }}
          />
        ) : null}

        {activeSection === 'reminders' ? (
          <RemindersSection
            hasConfig={hasConfig}
            reminderMessage={reminderMessage}
            reminderError={reminderError}
            editingReminderId={editingReminderId}
            reminderForm={reminderForm}
            reminders={reminders}
            isRemindersLoading={isRemindersLoading}
            pendingRemindersCount={pendingRemindersCount}
            onReminderFormChange={setReminderForm}
            onSubmit={handleReminderSubmit}
            onReset={resetReminderEditor}
            onReload={() => {
              void loadReminders()
            }}
            onEdit={startReminderEdit}
            onMarkAsRead={(reminder) => {
              void handleReminderMarkAsRead(reminder)
            }}
            onDismiss={(reminder) => {
              void handleReminderDismiss(reminder)
            }}
            onDelete={(reminderId) => {
              void handleReminderDelete(reminderId)
            }}
          />
        ) : null}
        </Suspense>
      </section>
    </main>
  )
}
