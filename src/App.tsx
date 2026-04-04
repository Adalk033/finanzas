import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { apiClient } from './api/client'
import { useLocalConfig } from './hooks/useLocalConfig'
import { AppSidebar } from './components/AppSidebar'
import { BanksSection } from './components/sections/BanksSection'
import { CategoriesSection } from './components/sections/CategoriesSection'
import { DashboardSection } from './components/sections/DashboardSection'
import { InstrumentsSection } from './components/sections/InstrumentsSection'
import { SettingsSection } from './components/sections/SettingsSection'
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
  formatCurrency,
  getBudgetStatusLabel,
  getReminderTypeLabel,
  getSimulationScenarioLabel,
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
  ReminderType,
} from './types/domain'

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
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Transacciones</h2>
              <p className="card__subtitle">Registro de gastos/ingresos, filtros y vista de MSI activas.</p>
            </header>

            <div className="transaction-layout">
              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nueva transaccion</h3>
                  <p className="mini-card__subtitle">Crea gastos o ingresos asociados a instrumento y categoria.</p>
                </header>

                <form className="form-grid" onSubmit={handleTransactionSubmit}>
                  <label className="form-grid__field" htmlFor="transactionInstrument">Instrumento</label>
                  <select
                    id="transactionInstrument"
                    className="form-grid__input"
                    value={selectedTransactionInstrumentId}
                    onChange={(event) => {
                      setTransactionForm({ ...transactionForm, instrumentId: Number(event.target.value) })
                    }}
                    required
                  >
                    <option value={0}>Selecciona instrumento</option>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="transactionType">Tipo</label>
                  <select
                    id="transactionType"
                    className="form-grid__input"
                    value={transactionForm.type}
                    onChange={(event) => handleTransactionTypeChange(event.target.value as TransactionType)}
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>

                  <label className="form-grid__field" htmlFor="transactionAmount">Monto</label>
                  <input
                    id="transactionAmount"
                    className="form-grid__input"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(event) => setTransactionForm({ ...transactionForm, amount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="transactionDate">Fecha</label>
                  <input
                    id="transactionDate"
                    className="form-grid__input"
                    type="date"
                    value={transactionForm.transactionDate}
                    onChange={(event) => setTransactionForm({ ...transactionForm, transactionDate: event.target.value })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="transactionCategory">Categoria</label>
                  <select
                    id="transactionCategory"
                    className="form-grid__input"
                    value={selectedTransactionCategoryId ?? ''}
                    onChange={(event) => {
                      const nextCategoryId = event.target.value ? Number(event.target.value) : null
                      setTransactionForm({ ...transactionForm, categoryId: nextCategoryId, subcategoryId: null })
                    }}
                  >
                    <option value="">Sin categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="transactionSubcategory">Subcategoria</label>
                  <select
                    id="transactionSubcategory"
                    className="form-grid__input"
                    value={transactionForm.subcategoryId ?? ''}
                    onChange={(event) => {
                      const nextSubcategoryId = event.target.value ? Number(event.target.value) : null
                      setTransactionForm({ ...transactionForm, subcategoryId: nextSubcategoryId })
                    }}
                    disabled={transactionSubcategoryOptions.length === 0}
                  >
                    <option value="">Sin subcategoria</option>
                    {transactionSubcategoryOptions.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="transactionDescription">Descripcion</label>
                  <input
                    id="transactionDescription"
                    className="form-grid__input"
                    type="text"
                    value={transactionForm.description}
                    onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })}
                    placeholder="Supermercado, nomina, etc."
                  />

                  <label className="form-grid__field" htmlFor="transactionNotes">Notas</label>
                  <input
                    id="transactionNotes"
                    className="form-grid__input"
                    type="text"
                    value={transactionForm.notes}
                    onChange={(event) => setTransactionForm({ ...transactionForm, notes: event.target.value })}
                    placeholder="Opcional"
                  />

                  {transactionForm.type === 'expense' && selectedTransactionInstrument?.type === 'credit_card' ? (
                    <>
                      <label className="form-grid__field" htmlFor="transactionIsMsi">MSI</label>
                      <select
                        id="transactionIsMsi"
                        className="form-grid__input"
                        value={transactionForm.isMsi ? 'yes' : 'no'}
                        onChange={(event) => {
                          const enabled = event.target.value === 'yes'
                          setTransactionForm({
                            ...transactionForm,
                            isMsi: enabled,
                            msiMonths: enabled ? (transactionForm.msiMonths ?? MSI_OPTIONS[0]) : null,
                          })
                        }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Si</option>
                      </select>

                      {transactionForm.isMsi ? (
                        <>
                          <label className="form-grid__field" htmlFor="transactionMsiMonths">Meses MSI</label>
                          <select
                            id="transactionMsiMonths"
                            className="form-grid__input"
                            value={transactionForm.msiMonths ?? MSI_OPTIONS[0]}
                            onChange={(event) => {
                              setTransactionForm({ ...transactionForm, msiMonths: Number(event.target.value) })
                            }}
                          >
                            {MSI_OPTIONS.map((months) => (
                              <option key={months} value={months}>{months} meses</option>
                            ))}
                          </select>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}>
                      Crear transaccion
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetTransactionForm}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </section>

              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Filtros</h3>
                  <p className="mini-card__subtitle">Refina por fecha, tipo, categoria, instrumento y texto.</p>
                </header>

                <form className="form-grid" onSubmit={handleTransactionFiltersSubmit}>
                  <label className="form-grid__field" htmlFor="filterFromDate">Desde</label>
                  <input
                    id="filterFromDate"
                    className="form-grid__input"
                    type="date"
                    value={transactionFilters.fromDate ?? ''}
                    onChange={(event) => setTransactionFilters({ ...transactionFilters, fromDate: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="filterToDate">Hasta</label>
                  <input
                    id="filterToDate"
                    className="form-grid__input"
                    type="date"
                    value={transactionFilters.toDate ?? ''}
                    onChange={(event) => setTransactionFilters({ ...transactionFilters, toDate: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="filterType">Tipo</label>
                  <select
                    id="filterType"
                    className="form-grid__input"
                    value={transactionFilters.type ?? ''}
                    onChange={(event) => {
                      const nextType = event.target.value ? (event.target.value as TransactionType) : undefined
                      setTransactionFilters({ ...transactionFilters, type: nextType })
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>

                  <label className="form-grid__field" htmlFor="filterCategory">Categoria</label>
                  <select
                    id="filterCategory"
                    className="form-grid__input"
                    value={transactionFilters.categoryId ?? ''}
                    onChange={(event) => {
                      const nextCategoryId = event.target.value ? Number(event.target.value) : undefined
                      setTransactionFilters({ ...transactionFilters, categoryId: nextCategoryId })
                    }}
                  >
                    <option value="">Todas</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="filterInstrument">Instrumento</label>
                  <select
                    id="filterInstrument"
                    className="form-grid__input"
                    value={transactionFilters.instrumentId ?? ''}
                    onChange={(event) => {
                      const nextInstrumentId = event.target.value ? Number(event.target.value) : undefined
                      setTransactionFilters({ ...transactionFilters, instrumentId: nextInstrumentId })
                    }}
                  >
                    <option value="">Todos</option>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="filterSearch">Busqueda</label>
                  <input
                    id="filterSearch"
                    className="form-grid__input"
                    type="text"
                    value={transactionFilters.search ?? ''}
                    onChange={(event) => setTransactionFilters({ ...transactionFilters, search: event.target.value })}
                    placeholder="Descripcion, categoria o instrumento"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig}>
                      Aplicar filtros
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void clearTransactionFilters()
                      }}
                    >
                      Limpiar filtros
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadTransactions()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {transactionError ? <p className="message message--error">{transactionError}</p> : null}
            {transactionMessage ? <p className="message message--success">{transactionMessage}</p> : null}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Instrumento</th>
                    <th>Categoria</th>
                    <th>MSI</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isTransactionsLoading ? (
                    <tr>
                      <td colSpan={7}>Cargando transacciones...</td>
                    </tr>
                  ) : null}

                  {!isTransactionsLoading && transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No hay transacciones registradas.</td>
                    </tr>
                  ) : null}

                  {!isTransactionsLoading
                    ? transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.transactionDate}</td>
                        <td>{transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                        <td>{formatCurrency(transaction.amount)}</td>
                        <td>{transaction.instrumentName ?? '-'}</td>
                        <td>
                          {transaction.categoryName ?? '-'}
                          {transaction.subcategoryName ? ` / ${transaction.subcategoryName}` : ''}
                        </td>
                        <td>{transaction.isMsi ? `${transaction.msiMonths ?? '-'} meses` : '-'}</td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                void handleTransactionDelete(transaction.id)
                              }}
                            >
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

            <div className="category-list">
              <article className="category-card">
                <header className="category-card__header">
                  <div>
                    <h3 className="category-card__title">Compras MSI activas</h3>
                    <p className="category-card__meta">Desglose de montos mensuales de compras en meses sin intereses.</p>
                  </div>
                </header>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Descripcion</th>
                        <th>Instrumento</th>
                        <th>Monto total</th>
                        <th>Mensual</th>
                        <th>Meses</th>
                        <th>Inicio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeMsiTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6}>No hay compras MSI activas.</td>
                        </tr>
                      ) : null}

                      {activeMsiTransactions.map((transaction) => (
                        <tr key={`msi-${transaction.id}`}>
                          <td>{transaction.description ?? 'Compra MSI'}</td>
                          <td>{transaction.instrumentName ?? '-'}</td>
                          <td>{formatCurrency(transaction.amount)}</td>
                          <td>{formatCurrency(transaction.msiMonthlyAmount)}</td>
                          <td>{transaction.msiRemaining ?? transaction.msiMonths ?? '-'}</td>
                          <td>{transaction.msiStartDate ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activeSection === 'creditCards' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Tarjetas de Credito y Transferencias</h2>
              <p className="card__subtitle">Estados de cuenta por corte y registro de abonos/transferencias.</p>
            </header>

            <div className="summary-grid">
              <article className="summary-card">
                <p className="summary-card__label">Deuda total en tarjetas</p>
                <p className="summary-card__value">{formatCurrency(totalCreditCardDebt)}</p>
              </article>
              <article className="summary-card">
                <p className="summary-card__label">Credito disponible total</p>
                <p className="summary-card__value summary-card__value--positive">{formatCurrency(totalAvailableCredit)}</p>
              </article>
            </div>

            <div className="transaction-layout">
              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nuevo estado de cuenta</h3>
                  <p className="mini-card__subtitle">El total se calcula automaticamente con las compras del periodo.</p>
                </header>

                <form className="form-grid" onSubmit={handleStatementSubmit}>
                  <label className="form-grid__field" htmlFor="statementInstrument">Tarjeta</label>
                  <select
                    id="statementInstrument"
                    className="form-grid__input"
                    value={selectedStatementInstrumentId}
                    onChange={(event) => setStatementForm({ ...statementForm, instrumentId: Number(event.target.value) })}
                    required
                  >
                    <option value={0}>Selecciona tarjeta</option>
                    {creditCardInstruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="statementCutOffDate">Fecha de corte</label>
                  <input
                    id="statementCutOffDate"
                    className="form-grid__input"
                    type="date"
                    value={statementForm.cutOffDate}
                    onChange={(event) => setStatementForm({ ...statementForm, cutOffDate: event.target.value })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="statementPaymentDueDate">Fecha de pago (opcional)</label>
                  <input
                    id="statementPaymentDueDate"
                    className="form-grid__input"
                    type="date"
                    value={statementForm.paymentDueDate}
                    onChange={(event) => setStatementForm({ ...statementForm, paymentDueDate: event.target.value })}
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || creditCardInstruments.length === 0}>
                      Crear estado
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetStatementForm}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadStatements()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>
              </section>

              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nueva transferencia</h3>
                  <p className="mini-card__subtitle">Abona tarjeta o mueve dinero entre cuentas propias.</p>
                </header>

                <form className="form-grid" onSubmit={handleTransferSubmit}>
                  <label className="form-grid__field" htmlFor="transferType">Tipo</label>
                  <select
                    id="transferType"
                    className="form-grid__input"
                    value={transferForm.type}
                    onChange={(event) => handleTransferTypeChange(event.target.value as TransferType)}
                  >
                    <option value="card_payment">Pago de tarjeta</option>
                    <option value="inter_account">Entre cuentas</option>
                    <option value="loan_payment">Pago de prestamo</option>
                    <option value="other">Otro</option>
                  </select>

                  <label className="form-grid__field" htmlFor="transferSource">Origen</label>
                  <select
                    id="transferSource"
                    className="form-grid__input"
                    value={selectedTransferSourceInstrumentId}
                    onChange={(event) => setTransferForm({ ...transferForm, sourceInstrumentId: Number(event.target.value) })}
                    required
                  >
                    <option value={0}>Selecciona origen</option>
                    {sourceTransferInstruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="transferDestination">Destino</label>
                  <select
                    id="transferDestination"
                    className="form-grid__input"
                    value={selectedTransferDestinationInstrumentId}
                    onChange={(event) => setTransferForm({ ...transferForm, destinationInstrumentId: Number(event.target.value) })}
                    required
                  >
                    <option value={0}>Selecciona destino</option>
                    {availableTransferDestinations.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="transferAmount">Monto</label>
                  <input
                    id="transferAmount"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={transferForm.amount}
                    onChange={(event) => setTransferForm({ ...transferForm, amount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="transferDate">Fecha</label>
                  <input
                    id="transferDate"
                    className="form-grid__input"
                    type="date"
                    value={transferForm.transferDate}
                    onChange={(event) => setTransferForm({ ...transferForm, transferDate: event.target.value })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="transferDescription">Descripcion</label>
                  <input
                    id="transferDescription"
                    className="form-grid__input"
                    type="text"
                    value={transferForm.description}
                    onChange={(event) => setTransferForm({ ...transferForm, description: event.target.value })}
                    placeholder="Abono, movimiento interno, etc."
                  />

                  {transferForm.type === 'loan_payment' ? (
                    <>
                      <label className="form-grid__field" htmlFor="transferLoanId">ID de prestamo</label>
                      <input
                        id="transferLoanId"
                        className="form-grid__input"
                        type="number"
                        min={1}
                        value={transferForm.loanId ?? ''}
                        onChange={(event) => {
                          const rawValue = event.target.value
                          setTransferForm({ ...transferForm, loanId: rawValue ? Number(rawValue) : null })
                        }}
                        required
                      />
                    </>
                  ) : null}

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || sourceTransferInstruments.length === 0}>
                      Crear transferencia
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetTransferForm}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadTransfers()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {statementError ? <p className="message message--error">{statementError}</p> : null}
            {statementMessage ? <p className="message message--success">{statementMessage}</p> : null}
            {transferError ? <p className="message message--error">{transferError}</p> : null}
            {transferMessage ? <p className="message message--success">{transferMessage}</p> : null}

            <div className="category-list">
              <article className="category-card">
                <header className="category-card__header">
                  <div>
                    <h3 className="category-card__title">Estados de cuenta</h3>
                    <p className="category-card__meta">Detalle por corte, fecha de pago y montos calculados.</p>
                  </div>
                </header>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tarjeta</th>
                        <th>Corte</th>
                        <th>Pago</th>
                        <th>Total</th>
                        <th>Minimo</th>
                        <th>Sin intereses</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isStatementsLoading ? (
                        <tr>
                          <td colSpan={7}>Cargando estados...</td>
                        </tr>
                      ) : null}

                      {!isStatementsLoading && statements.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No hay estados de cuenta registrados.</td>
                        </tr>
                      ) : null}

                      {!isStatementsLoading
                        ? statements.map((statement) => (
                          <tr key={statement.id}>
                            <td>{statement.instrumentName ?? '-'}</td>
                            <td>{statement.cutOffDate}</td>
                            <td>{statement.paymentDueDate}</td>
                            <td>{formatCurrency(statement.totalAmount)}</td>
                            <td>{formatCurrency(statement.minimumPayment)}</td>
                            <td>{formatCurrency(statement.noInterestPayment)}</td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    void loadStatementMovements(statement)
                                  }}
                                >
                                  Ver movimientos
                                </button>
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    startStatementEdit(statement)
                                  }}
                                >
                                  Editar pago
                                </button>
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleStatementDelete(statement.id)
                                  }}
                                >
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

                {editingStatementId !== null ? (
                  <div className="form-grid statement-edit-form">
                    <label className="form-grid__field" htmlFor="statementEditPaymentDueDate">Nueva fecha de pago</label>
                    <input
                      id="statementEditPaymentDueDate"
                      className="form-grid__input"
                      type="date"
                      value={statementUpdateForm.paymentDueDate}
                      onChange={(event) => setStatementUpdateForm({ ...statementUpdateForm, paymentDueDate: event.target.value })}
                    />
                    <div className="form-grid__actions">
                      <button
                        className="button button--primary"
                        type="button"
                        onClick={() => {
                          void handleStatementUpdate()
                        }}
                      >
                        Guardar fecha
                      </button>
                      <button className="button button--secondary" type="button" onClick={resetStatementUpdateForm}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedStatementDetail !== null ? (
                  <div className="statement-movements">
                    <header className="mini-card__header">
                      <h4 className="mini-card__title">
                        Movimientos del corte {selectedStatementDetail.cutOffDate} · {selectedStatementDetail.instrumentName ?? 'Tarjeta'}
                      </h4>
                      <p className="mini-card__subtitle">Incluye compras e ingresos del periodo del estado de cuenta.</p>
                    </header>

                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Descripcion</th>
                            <th>Categoria</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isStatementMovementsLoading ? (
                            <tr>
                              <td colSpan={5}>Cargando movimientos...</td>
                            </tr>
                          ) : null}

                          {!isStatementMovementsLoading && statementMovements.length === 0 ? (
                            <tr>
                              <td colSpan={5}>No hay movimientos para este estado de cuenta.</td>
                            </tr>
                          ) : null}

                          {!isStatementMovementsLoading
                            ? statementMovements.map((movement) => (
                              <tr key={`statement-movement-${movement.id}`}>
                                <td>{movement.transactionDate}</td>
                                <td>{movement.description ?? 'Sin descripcion'}</td>
                                <td>
                                  {movement.categoryName ?? '-'}
                                  {movement.subcategoryName ? ` / ${movement.subcategoryName}` : ''}
                                </td>
                                <td>{movement.type === 'expense' ? 'Gasto' : 'Ingreso'}</td>
                                <td>{formatCurrency(movement.amount)}</td>
                              </tr>
                            ))
                            : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </article>

              <article className="category-card">
                <header className="category-card__header">
                  <div>
                    <h3 className="category-card__title">Historial de transferencias</h3>
                    <p className="category-card__meta">Pagos y movimientos entre instrumentos propios.</p>
                  </div>
                </header>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Monto</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isTransfersLoading ? (
                        <tr>
                          <td colSpan={6}>Cargando transferencias...</td>
                        </tr>
                      ) : null}

                      {!isTransfersLoading && transfers.length === 0 ? (
                        <tr>
                          <td colSpan={6}>No hay transferencias registradas.</td>
                        </tr>
                      ) : null}

                      {!isTransfersLoading
                        ? transfers.map((transfer) => (
                          <tr key={transfer.id}>
                            <td>{transfer.transferDate}</td>
                            <td>{transfer.type}</td>
                            <td>{transfer.sourceInstrumentName ?? '-'}</td>
                            <td>{transfer.destinationInstrumentName ?? '-'}</td>
                            <td>{formatCurrency(transfer.amount)}</td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleTransferDelete(transfer.id)
                                  }}
                                >
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
              </article>
            </div>
          </section>
        ) : null}

        {activeSection === 'subscriptions' ? (
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

                <form className="form-grid" onSubmit={handleSubscriptionSubmit}>
                  <label className="form-grid__field" htmlFor="subscriptionName">Nombre</label>
                  <input
                    id="subscriptionName"
                    className="form-grid__input"
                    type="text"
                    value={subscriptionForm.name}
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, name: event.target.value })}
                    placeholder="Netflix"
                    required
                  />

                  <label className="form-grid__field" htmlFor="subscriptionInstrument">Instrumento</label>
                  <select
                    id="subscriptionInstrument"
                    className="form-grid__input"
                    value={subscriptionForm.instrumentId}
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, instrumentId: Number(event.target.value) })}
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
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, amount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="subscriptionCycle">Ciclo</label>
                  <select
                    id="subscriptionCycle"
                    className="form-grid__input"
                    value={subscriptionForm.billingCycle}
                    onChange={(event) => handleSubscriptionBillingCycleChange(event.target.value as SubscriptionBillingCycle)}
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
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, billingDay: Number(event.target.value) })}
                  />

                  <label className="form-grid__field" htmlFor="subscriptionNextBilling">Proximo cargo</label>
                  <input
                    id="subscriptionNextBilling"
                    className="form-grid__input"
                    type="date"
                    value={subscriptionForm.nextBilling}
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, nextBilling: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="subscriptionCategory">Categoria</label>
                  <select
                    id="subscriptionCategory"
                    className="form-grid__input"
                    value={subscriptionForm.categoryId ?? ''}
                    onChange={(event) => {
                      const nextCategoryId = event.target.value ? Number(event.target.value) : null
                      setSubscriptionForm({ ...subscriptionForm, categoryId: nextCategoryId, subcategoryId: null })
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
                      setSubscriptionForm({ ...subscriptionForm, subcategoryId: nextSubcategoryId })
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
                    onChange={(event) => setSubscriptionForm({ ...subscriptionForm, notes: event.target.value })}
                    placeholder="Opcional"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || instruments.length === 0}>
                      {editingSubscriptionId === null ? 'Crear suscripcion' : 'Guardar cambios'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetSubscriptionEditor}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadSubscriptions()
                      }}
                    >
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
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => {
                                setEditingSubscriptionId(subscription.id)
                                setSubscriptionForm(toEditableSubscription(subscription))
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                void handleSubscriptionDelete(subscription.id)
                              }}
                            >
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
        ) : null}

        {activeSection === 'fixedExpenses' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Gastos Fijos</h2>
              <p className="card__subtitle">Gestion de gastos recurrentes y registro de pagos mensuales.</p>
            </header>

            <div className="transaction-layout">
              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nuevo gasto fijo</h3>
                  <p className="mini-card__subtitle">Renta, luz, agua, internet y otros compromisos.</p>
                </header>

                <form className="form-grid" onSubmit={handleFixedExpenseSubmit}>
                  <label className="form-grid__field" htmlFor="fixedExpenseName">Nombre</label>
                  <input
                    id="fixedExpenseName"
                    className="form-grid__input"
                    type="text"
                    value={fixedExpenseForm.name}
                    onChange={(event) => setFixedExpenseForm({ ...fixedExpenseForm, name: event.target.value })}
                    placeholder="Renta departamento"
                    required
                  />

                  <label className="form-grid__field" htmlFor="fixedExpenseAmount">Monto estimado</label>
                  <input
                    id="fixedExpenseAmount"
                    className="form-grid__input"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={fixedExpenseForm.estimatedAmount}
                    onChange={(event) => setFixedExpenseForm({ ...fixedExpenseForm, estimatedAmount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="fixedExpenseInstrument">Instrumento (opcional)</label>
                  <select
                    id="fixedExpenseInstrument"
                    className="form-grid__input"
                    value={fixedExpenseForm.instrumentId ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setFixedExpenseForm({ ...fixedExpenseForm, instrumentId: raw ? Number(raw) : null })
                    }}
                  >
                    <option value="">Sin instrumento</option>
                    {instruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="fixedExpenseCategory">Categoria</label>
                  <select
                    id="fixedExpenseCategory"
                    className="form-grid__input"
                    value={fixedExpenseForm.categoryId ?? ''}
                    onChange={(event) => {
                      const nextCategoryId = event.target.value ? Number(event.target.value) : null
                      setFixedExpenseForm({ ...fixedExpenseForm, categoryId: nextCategoryId, subcategoryId: null })
                    }}
                  >
                    <option value="">Sin categoria</option>
                    {expenseCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="fixedExpenseSubcategory">Subcategoria</label>
                  <select
                    id="fixedExpenseSubcategory"
                    className="form-grid__input"
                    value={fixedExpenseForm.subcategoryId ?? ''}
                    onChange={(event) => {
                      const nextSubcategoryId = event.target.value ? Number(event.target.value) : null
                      setFixedExpenseForm({ ...fixedExpenseForm, subcategoryId: nextSubcategoryId })
                    }}
                    disabled={!selectedFixedExpenseCategory}
                  >
                    <option value="">Sin subcategoria</option>
                    {(selectedFixedExpenseCategory?.subcategories ?? []).map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="fixedExpenseIsVariable">Tipo de monto</label>
                  <select
                    id="fixedExpenseIsVariable"
                    className="form-grid__input"
                    value={fixedExpenseForm.isVariable ? 'yes' : 'no'}
                    onChange={(event) => setFixedExpenseForm({ ...fixedExpenseForm, isVariable: event.target.value === 'yes' })}
                  >
                    <option value="no">Fijo</option>
                    <option value="yes">Variable</option>
                  </select>

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentDay">Dia de pago</label>
                  <input
                    id="fixedExpensePaymentDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={fixedExpenseForm.paymentDay ?? 1}
                    onChange={(event) => setFixedExpenseForm({ ...fixedExpenseForm, paymentDay: Number(event.target.value) })}
                  />

                  <label className="form-grid__field" htmlFor="fixedExpenseNotes">Notas</label>
                  <input
                    id="fixedExpenseNotes"
                    className="form-grid__input"
                    type="text"
                    value={fixedExpenseForm.notes}
                    onChange={(event) => setFixedExpenseForm({ ...fixedExpenseForm, notes: event.target.value })}
                    placeholder="Opcional"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig}>
                      {editingFixedExpenseId === null ? 'Crear gasto fijo' : 'Guardar cambios'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetFixedExpenseEditor}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadFixedExpenses()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>
              </section>

              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Registrar pago mensual</h3>
                  <p className="mini-card__subtitle">Selecciona un gasto fijo y registra el pago del periodo.</p>
                </header>

                <form className="form-grid" onSubmit={handleFixedExpensePaymentSubmit}>
                  <label className="form-grid__field" htmlFor="fixedExpenseSelected">Gasto fijo</label>
                  <select
                    id="fixedExpenseSelected"
                    className="form-grid__input"
                    value={selectedFixedExpenseId ?? ''}
                    onChange={(event) => {
                      const nextId = event.target.value ? Number(event.target.value) : null
                      setSelectedFixedExpenseId(nextId)
                      setFixedExpensePayments([])
                      if (nextId) {
                        void loadFixedExpensePayments(nextId)
                      }
                    }}
                  >
                    <option value="">Selecciona gasto fijo</option>
                    {fixedExpenses.map((expense) => (
                      <option key={expense.id} value={expense.id}>{expense.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentAmount">Monto pagado</label>
                  <input
                    id="fixedExpensePaymentAmount"
                    className="form-grid__input"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={fixedExpensePaymentForm.amount}
                    onChange={(event) => setFixedExpensePaymentForm({ ...fixedExpensePaymentForm, amount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentMonth">Mes</label>
                  <input
                    id="fixedExpensePaymentMonth"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={12}
                    value={fixedExpensePaymentForm.periodMonth}
                    onChange={(event) => setFixedExpensePaymentForm({ ...fixedExpensePaymentForm, periodMonth: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentYear">Anio</label>
                  <input
                    id="fixedExpensePaymentYear"
                    className="form-grid__input"
                    type="number"
                    min={2000}
                    max={2200}
                    value={fixedExpensePaymentForm.periodYear}
                    onChange={(event) => setFixedExpensePaymentForm({ ...fixedExpensePaymentForm, periodYear: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentDate">Fecha de pago</label>
                  <input
                    id="fixedExpensePaymentDate"
                    className="form-grid__input"
                    type="date"
                    value={fixedExpensePaymentForm.paymentDate}
                    onChange={(event) => setFixedExpensePaymentForm({ ...fixedExpensePaymentForm, paymentDate: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="fixedExpensePaymentNotes">Notas</label>
                  <input
                    id="fixedExpensePaymentNotes"
                    className="form-grid__input"
                    type="text"
                    value={fixedExpensePaymentForm.notes}
                    onChange={(event) => setFixedExpensePaymentForm({ ...fixedExpensePaymentForm, notes: event.target.value })}
                    placeholder="Opcional"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!selectedFixedExpenseId}>
                      Registrar pago
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetFixedExpensePaymentForm}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {fixedExpenseError ? <p className="message message--error">{fixedExpenseError}</p> : null}
            {fixedExpenseMessage ? <p className="message message--success">{fixedExpenseMessage}</p> : null}

            <div className="category-list">
              <article className="category-card">
                <header className="category-card__header">
                  <div>
                    <h3 className="category-card__title">Listado de gastos fijos</h3>
                    <p className="category-card__meta">Renta, servicios y compromisos mensuales.</p>
                  </div>
                </header>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Monto estimado</th>
                        <th>Variable</th>
                        <th>Dia pago</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isFixedExpensesLoading ? (
                        <tr>
                          <td colSpan={5}>Cargando gastos fijos...</td>
                        </tr>
                      ) : null}

                      {!isFixedExpensesLoading && fixedExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No hay gastos fijos registrados.</td>
                        </tr>
                      ) : null}

                      {!isFixedExpensesLoading
                        ? fixedExpenses.map((expense) => (
                          <tr key={expense.id}>
                            <td>{expense.name}</td>
                            <td>{formatCurrency(expense.estimatedAmount)}</td>
                            <td>{expense.isVariable ? 'Si' : 'No'}</td>
                            <td>{expense.paymentDay ?? '-'}</td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    setEditingFixedExpenseId(expense.id)
                                    setFixedExpenseForm(toEditableFixedExpense(expense))
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    void loadFixedExpensePayments(expense.id)
                                  }}
                                >
                                  Historial
                                </button>
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleFixedExpenseDelete(expense.id)
                                  }}
                                >
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
              </article>

              {selectedFixedExpense !== null ? (
                <article className="category-card">
                  <header className="category-card__header">
                    <div>
                      <h3 className="category-card__title">Historial de pagos · {selectedFixedExpense.name}</h3>
                      <p className="category-card__meta">Pagos registrados por mes y anio.</p>
                    </div>
                  </header>

                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Periodo</th>
                          <th>Monto</th>
                          <th>Fecha pago</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isFixedExpensePaymentsLoading ? (
                          <tr>
                            <td colSpan={5}>Cargando historial de pagos...</td>
                          </tr>
                        ) : null}

                        {!isFixedExpensePaymentsLoading && fixedExpensePayments.length === 0 ? (
                          <tr>
                            <td colSpan={5}>No hay pagos registrados para este gasto fijo.</td>
                          </tr>
                        ) : null}

                        {!isFixedExpensePaymentsLoading
                          ? fixedExpensePayments.map((payment) => (
                            <tr key={payment.id}>
                              <td>{`${payment.periodMonth}/${payment.periodYear}`}</td>
                              <td>{formatCurrency(payment.amount)}</td>
                              <td>{payment.paymentDate ?? '-'}</td>
                              <td>{payment.isPaid ? 'Pagado' : 'Pendiente'}</td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--danger"
                                    type="button"
                                    onClick={() => {
                                      void handleFixedExpensePaymentDelete(payment.id)
                                    }}
                                  >
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
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeSection === 'loans' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Prestamos</h2>
              <p className="card__subtitle">Gestion de prestamos, tabla de amortizacion y registro de cuotas pagadas.</p>
            </header>

            <div className="transaction-layout">
              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nuevo prestamo</h3>
                  <p className="mini-card__subtitle">Configura tipo de pago fijo o variable y genera su calendario.</p>
                </header>

                <form className="form-grid" onSubmit={handleLoanSubmit}>
                  <label className="form-grid__field" htmlFor="loanName">Nombre</label>
                  <input
                    id="loanName"
                    className="form-grid__input"
                    type="text"
                    value={loanForm.name}
                    onChange={(event) => setLoanForm({ ...loanForm, name: event.target.value })}
                    placeholder="Prestamo auto"
                    required
                  />

                  <label className="form-grid__field" htmlFor="loanLender">Acreedor</label>
                  <input
                    id="loanLender"
                    className="form-grid__input"
                    type="text"
                    value={loanForm.lender}
                    onChange={(event) => setLoanForm({ ...loanForm, lender: event.target.value })}
                    placeholder="Banco o financiera"
                  />

                  <label className="form-grid__field" htmlFor="loanInstrument">Cuenta de pago (opcional)</label>
                  <select
                    id="loanInstrument"
                    className="form-grid__input"
                    value={loanForm.instrumentId ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setLoanForm({ ...loanForm, instrumentId: raw ? Number(raw) : null })
                    }}
                  >
                    <option value="">Sin cuenta vinculada</option>
                    {loanPaymentInstruments.map((instrument) => (
                      <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="loanOriginalAmount">Monto original</label>
                  <input
                    id="loanOriginalAmount"
                    className="form-grid__input"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={loanForm.originalAmount}
                    onChange={(event) => setLoanForm({ ...loanForm, originalAmount: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="loanTotalInstallments">Total de cuotas</label>
                  <input
                    id="loanTotalInstallments"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    value={loanForm.totalInstallments}
                    onChange={(event) => setLoanForm({ ...loanForm, totalInstallments: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="loanPaymentType">Tipo de pago</label>
                  <select
                    id="loanPaymentType"
                    className="form-grid__input"
                    value={loanForm.paymentType}
                    onChange={(event) => handleLoanPaymentTypeChange(event.target.value as LoanPaymentType)}
                  >
                    <option value="fixed">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>

                  {loanForm.paymentType === 'fixed' ? (
                    <>
                      <label className="form-grid__field" htmlFor="loanFixedPayment">Pago fijo mensual</label>
                      <input
                        id="loanFixedPayment"
                        className="form-grid__input"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={loanForm.fixedPayment ?? 0}
                        onChange={(event) => setLoanForm({ ...loanForm, fixedPayment: Number(event.target.value) })}
                        required
                      />
                    </>
                  ) : (
                    <>
                      <label className="form-grid__field" htmlFor="loanAnnualRate">Tasa anual (decimal)</label>
                      <input
                        id="loanAnnualRate"
                        className="form-grid__input"
                        type="number"
                        min={0.0001}
                        step="0.0001"
                        value={loanForm.annualRate ?? ''}
                        onChange={(event) => {
                          const raw = event.target.value
                          setLoanForm({ ...loanForm, annualRate: raw ? Number(raw) : null })
                        }}
                        required
                      />
                    </>
                  )}

                  <label className="form-grid__field" htmlFor="loanPaymentDay">Dia de pago</label>
                  <input
                    id="loanPaymentDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={loanForm.paymentDay ?? 1}
                    onChange={(event) => setLoanForm({ ...loanForm, paymentDay: Number(event.target.value) })}
                  />

                  <label className="form-grid__field" htmlFor="loanStartDate">Fecha inicial</label>
                  <input
                    id="loanStartDate"
                    className="form-grid__input"
                    type="date"
                    value={loanForm.startDate}
                    onChange={(event) => setLoanForm({ ...loanForm, startDate: event.target.value })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="loanEndDate">Fecha fin estimada (opcional)</label>
                  <input
                    id="loanEndDate"
                    className="form-grid__input"
                    type="date"
                    value={loanForm.endDate}
                    onChange={(event) => setLoanForm({ ...loanForm, endDate: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="loanNotes">Notas</label>
                  <input
                    id="loanNotes"
                    className="form-grid__input"
                    type="text"
                    value={loanForm.notes}
                    onChange={(event) => setLoanForm({ ...loanForm, notes: event.target.value })}
                    placeholder="Opcional"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig}>
                      {editingLoanId === null ? 'Crear prestamo' : 'Guardar cambios'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetLoanEditor}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        void loadLoans()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>
              </section>

              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Registro de cuota</h3>
                  <p className="mini-card__subtitle">Selecciona un prestamo y registra cuotas pendientes.</p>
                </header>

                <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
                  <label className="form-grid__field" htmlFor="loanRegisterPaidDate">Fecha de pago</label>
                  <input
                    id="loanRegisterPaidDate"
                    className="form-grid__input"
                    type="date"
                    value={loanPaymentRegister.paidDate}
                    onChange={(event) => setLoanPaymentRegister({ ...loanPaymentRegister, paidDate: event.target.value })}
                  />

                  <label className="form-grid__field" htmlFor="loanRegisterAmount">Monto (opcional, debe coincidir)</label>
                  <input
                    id="loanRegisterAmount"
                    className="form-grid__input"
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={loanPaymentRegister.amount ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value
                      setLoanPaymentRegister({ ...loanPaymentRegister, amount: raw ? Number(raw) : null })
                    }}
                  />

                  <label className="form-grid__field" htmlFor="loanRegisterNotes">Notas</label>
                  <input
                    id="loanRegisterNotes"
                    className="form-grid__input"
                    type="text"
                    value={loanPaymentRegister.notes}
                    onChange={(event) => setLoanPaymentRegister({ ...loanPaymentRegister, notes: event.target.value })}
                    placeholder="Comprobante o comentario"
                  />

                  <p className="card__subtitle">
                    Usa el boton Pagar de la tabla para registrar cada cuota pendiente con esta configuracion.
                  </p>
                </form>
              </section>
            </div>

            {loanError ? <p className="message message--error">{loanError}</p> : null}
            {loanMessage ? <p className="message message--success">{loanMessage}</p> : null}

            <div className="category-list">
              <article className="category-card">
                <header className="category-card__header">
                  <div>
                    <h3 className="category-card__title">Listado de prestamos</h3>
                    <p className="category-card__meta">Progreso de pago y acciones por prestamo.</p>
                  </div>
                </header>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Monto original</th>
                        <th>Saldo pendiente</th>
                        <th>Progreso</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoansLoading ? (
                        <tr>
                          <td colSpan={6}>Cargando prestamos...</td>
                        </tr>
                      ) : null}

                      {!isLoansLoading && loans.length === 0 ? (
                        <tr>
                          <td colSpan={6}>No hay prestamos registrados.</td>
                        </tr>
                      ) : null}

                      {!isLoansLoading
                        ? loans.map((loan) => (
                          <tr key={loan.id}>
                            <td>{loan.name}</td>
                            <td>{loan.paymentType === 'fixed' ? 'Fijo' : 'Variable'}</td>
                            <td>{formatCurrency(loan.originalAmount)}</td>
                            <td>{formatCurrency(loan.remainingAmount)}</td>
                            <td>{loan.paidInstallments}/{loan.totalInstallments}</td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    void loadLoanPayments(loan.id)
                                  }}
                                >
                                  Ver detalle
                                </button>
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    startLoanEdit(loan)
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleLoanDelete(loan.id)
                                  }}
                                >
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
              </article>

              {selectedLoan !== null ? (
                <article className="category-card">
                  <header className="category-card__header">
                    <div>
                      <h3 className="category-card__title">Tabla de amortizacion · {selectedLoan.name}</h3>
                      <p className="category-card__meta">
                        {selectedLoan.paymentType === 'fixed' ? 'Pago fijo' : 'Pago variable'} · Saldo pendiente {formatCurrency(selectedLoan.remainingAmount)}
                      </p>
                    </div>
                  </header>

                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Cuota</th>
                          <th>Fecha programada</th>
                          <th>Monto</th>
                          <th>Capital</th>
                          <th>Interes</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoanPaymentsLoading ? (
                          <tr>
                            <td colSpan={7}>Cargando tabla de amortizacion...</td>
                          </tr>
                        ) : null}

                        {!isLoanPaymentsLoading && loanPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7}>No hay cuotas para este prestamo.</td>
                          </tr>
                        ) : null}

                        {!isLoanPaymentsLoading
                          ? loanPayments.map((payment) => (
                            <tr key={payment.id}>
                              <td>{payment.installmentNum}</td>
                              <td>{payment.paymentDate}</td>
                              <td>{formatCurrency(payment.amount)}</td>
                              <td>{formatCurrency(payment.principal)}</td>
                              <td>{formatCurrency(payment.interest)}</td>
                              <td>{payment.isPaid ? `Pagada ${payment.paidDate ?? ''}` : 'Pendiente'}</td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--primary"
                                    type="button"
                                    disabled={payment.isPaid}
                                    onClick={() => {
                                      void handlePayInstallment(payment.installmentNum)
                                    }}
                                  >
                                    Pagar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                          : null}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeSection === 'budgets' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Presupuestos mensuales</h2>
              <p className="card__subtitle">Define topes por categoria y monitorea el avance contra tus gastos reales.</p>
            </header>

            {budgetMessage ? <p className="message message--success">{budgetMessage}</p> : null}
            {budgetError ? <p className="message message--error">{budgetError}</p> : null}

            <div className="phase8-layout">
              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">{editingBudgetId === null ? 'Nuevo presupuesto' : 'Editar presupuesto'}</h3>
                </header>

                <form className="form-grid" onSubmit={handleBudgetSubmit}>
                  <label className="form-grid__field" htmlFor="budgetCategory">Categoria</label>
                  <select
                    id="budgetCategory"
                    className="form-grid__input"
                    value={budgetForm.categoryId ?? 0}
                    onChange={(event) => {
                      const value = Number.parseInt(event.target.value, 10)
                      setBudgetForm((previous) => ({
                        ...previous,
                        categoryId: value === 0 ? null : value,
                      }))
                    }}
                  >
                    <option value={0}>Global (todas las categorias)</option>
                    {expenseCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="budgetAmount">Monto mensual</label>
                  <input
                    id="budgetAmount"
                    className="form-grid__input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={budgetForm.amount}
                    onChange={(event) => {
                      setBudgetForm((previous) => ({ ...previous, amount: Number(event.target.value) }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="budgetMonth">Mes</label>
                  <input
                    id="budgetMonth"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={12}
                    value={budgetForm.month}
                    onChange={(event) => {
                      setBudgetForm((previous) => ({ ...previous, month: Number(event.target.value) }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="budgetYear">Anio</label>
                  <input
                    id="budgetYear"
                    className="form-grid__input"
                    type="number"
                    min={2000}
                    max={2200}
                    value={budgetForm.year}
                    onChange={(event) => {
                      setBudgetForm((previous) => ({ ...previous, year: Number(event.target.value) }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="budgetNotes">Notas</label>
                  <textarea
                    id="budgetNotes"
                    className="form-grid__input"
                    rows={3}
                    value={budgetForm.notes}
                    onChange={(event) => {
                      setBudgetForm((previous) => ({ ...previous, notes: event.target.value }))
                    }}
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || isBudgetsLoading}>
                      {editingBudgetId === null ? 'Guardar presupuesto' : 'Actualizar presupuesto'}
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        resetBudgetEditor()
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </article>

              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Listado y progreso</h3>
                </header>

                <div className="form-grid form-grid--inline">
                  <label className="form-grid__field" htmlFor="budgetFilterMonth">Mes filtro</label>
                  <input
                    id="budgetFilterMonth"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={12}
                    value={budgetFilterMonth}
                    onChange={(event) => {
                      setBudgetFilterMonth(Number(event.target.value))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="budgetFilterYear">Anio filtro</label>
                  <input
                    id="budgetFilterYear"
                    className="form-grid__input"
                    type="number"
                    min={2000}
                    max={2200}
                    value={budgetFilterYear}
                    onChange={(event) => {
                      setBudgetFilterYear(Number(event.target.value))
                    }}
                  />

                  <div className="form-grid__actions">
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!hasConfig || isBudgetsLoading}
                      onClick={() => {
                        void loadBudgets(budgetFilterMonth, budgetFilterYear)
                      }}
                    >
                      {isBudgetsLoading ? 'Cargando...' : 'Aplicar filtro'}
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Periodo</th>
                        <th>Presupuesto</th>
                        <th>Gastado</th>
                        <th>Avance</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isBudgetsLoading ? (
                        <tr>
                          <td colSpan={7}>Cargando presupuestos...</td>
                        </tr>
                      ) : null}

                      {!isBudgetsLoading && budgets.length === 0 ? (
                        <tr>
                          <td colSpan={7}>No hay presupuestos para este periodo.</td>
                        </tr>
                      ) : null}

                      {!isBudgetsLoading
                        ? budgets.map((budget) => (
                          <tr key={budget.id}>
                            <td>{budget.categoryName ?? 'Global'}</td>
                            <td>{String(budget.month).padStart(2, '0')}/{budget.year}</td>
                            <td>{formatCurrency(budget.amount)}</td>
                            <td>{formatCurrency(budget.spentAmount)}</td>
                            <td>
                              <div className="progress">
                                <div
                                  className={`progress__bar ${budget.status === 'exceeded' ? 'progress__bar--error' : budget.status === 'warning' ? 'progress__bar--warning' : 'progress__bar--success'}`}
                                  style={{ width: `${Math.min(100, budget.progressPercent)}%` }}
                                />
                              </div>
                              <p className="category-card__meta">{budget.progressPercent.toFixed(2)}%</p>
                            </td>
                            <td>
                              <span className={`badge ${budget.status === 'exceeded' ? 'badge--warning' : budget.status === 'warning' ? 'badge--info' : 'badge--success'}`}>
                                {getBudgetStatusLabel(budget.status)}
                              </span>
                            </td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    startBudgetEdit(budget)
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleBudgetDelete(budget.id)
                                  }}
                                >
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
              </article>
            </div>
          </section>
        ) : null}

        {activeSection === 'simulator' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Simulador financiero</h2>
              <p className="card__subtitle">Analiza escenarios antes de comprometer tu flujo financiero.</p>
            </header>

            {simulationMessage ? <p className="message message--success">{simulationMessage}</p> : null}
            {simulationError ? <p className="message message--error">{simulationError}</p> : null}

            <div className="phase8-layout">
              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Nueva simulacion</h3>
                </header>

                <form className="form-grid" onSubmit={handleSimulationSubmit}>
                  <label className="form-grid__field" htmlFor="simulationName">Nombre</label>
                  <input
                    id="simulationName"
                    className="form-grid__input"
                    type="text"
                    value={simulationForm.name}
                    onChange={(event) => {
                      setSimulationForm((previous) => ({ ...previous, name: event.target.value }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="simulationDate">Fecha</label>
                  <input
                    id="simulationDate"
                    className="form-grid__input"
                    type="date"
                    value={simulationForm.simulationDate}
                    onChange={(event) => {
                      setSimulationForm((previous) => ({ ...previous, simulationDate: event.target.value }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="simulationType">Escenario</label>
                  <select
                    id="simulationType"
                    className="form-grid__input"
                    value={simulationForm.scenarioType}
                    onChange={(event) => {
                      handleSimulationScenarioTypeChange(event.target.value as SimulationScenarioType)
                    }}
                  >
                    <option value="direct_purchase">Compra directa</option>
                    <option value="msi">Compra MSI</option>
                    <option value="loan">Prestamo</option>
                  </select>

                  {simulationForm.scenarioType !== 'loan' ? (
                    <>
                      <label className="form-grid__field" htmlFor="simulationInstrument">Instrumento</label>
                      <select
                        id="simulationInstrument"
                        className="form-grid__input"
                        value={simulationForm.instrumentId ?? 0}
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value, 10)
                          setSimulationForm((previous) => ({
                            ...previous,
                            instrumentId: value === 0 ? null : value,
                          }))
                        }}
                      >
                        <option value={0}>Seleccionar instrumento</option>
                        {simulationInstrumentOptions.map((instrument) => (
                          <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  <label className="form-grid__field" htmlFor="simulationAmount">Monto</label>
                  <input
                    id="simulationAmount"
                    className="form-grid__input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={simulationForm.amount}
                    onChange={(event) => {
                      setSimulationForm((previous) => ({ ...previous, amount: Number(event.target.value) }))
                    }}
                  />

                  {simulationForm.scenarioType === 'msi' ? (
                    <>
                      <label className="form-grid__field" htmlFor="simulationMsiMonths">Meses MSI</label>
                      <select
                        id="simulationMsiMonths"
                        className="form-grid__input"
                        value={simulationForm.msiMonths ?? MSI_OPTIONS[0]}
                        onChange={(event) => {
                          setSimulationForm((previous) => ({ ...previous, msiMonths: Number.parseInt(event.target.value, 10) }))
                        }}
                      >
                        {MSI_OPTIONS.map((months) => (
                          <option key={months} value={months}>{months} meses</option>
                        ))}
                      </select>
                    </>
                  ) : null}

                  {simulationForm.scenarioType === 'loan' ? (
                    <>
                      <label className="form-grid__field" htmlFor="simulationLoanMonths">Plazo (meses)</label>
                      <input
                        id="simulationLoanMonths"
                        className="form-grid__input"
                        type="number"
                        min={1}
                        max={600}
                        value={simulationForm.loanMonths ?? 12}
                        onChange={(event) => {
                          setSimulationForm((previous) => ({ ...previous, loanMonths: Number(event.target.value) }))
                        }}
                      />

                      <label className="form-grid__field" htmlFor="simulationAnnualRate">Tasa anual (%)</label>
                      <input
                        id="simulationAnnualRate"
                        className="form-grid__input"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={simulationForm.annualRate ?? 0}
                        onChange={(event) => {
                          setSimulationForm((previous) => ({ ...previous, annualRate: Number(event.target.value) }))
                        }}
                      />
                    </>
                  ) : null}

                  <label className="form-grid__field" htmlFor="simulationDescription">Descripcion</label>
                  <textarea
                    id="simulationDescription"
                    className="form-grid__input"
                    rows={3}
                    value={simulationForm.description}
                    onChange={(event) => {
                      setSimulationForm((previous) => ({ ...previous, description: event.target.value }))
                    }}
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || isSimulationsLoading}>
                      Guardar simulacion
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => {
                        resetSimulationForm()
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                </form>
              </article>

              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Historial</h3>
                </header>

                <div className="form-grid__actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={!hasConfig || isSimulationsLoading}
                    onClick={() => {
                      void loadSimulations()
                    }}
                  >
                    {isSimulationsLoading ? 'Cargando...' : 'Recargar historial'}
                  </button>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Nombre</th>
                        <th>Escenario</th>
                        <th>Monto</th>
                        <th>Compromiso mensual</th>
                        <th>Balance neto proyectado</th>
                        <th>Viabilidad</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isSimulationsLoading ? (
                        <tr>
                          <td colSpan={8}>Cargando simulaciones...</td>
                        </tr>
                      ) : null}

                      {!isSimulationsLoading && simulations.length === 0 ? (
                        <tr>
                          <td colSpan={8}>No hay simulaciones registradas.</td>
                        </tr>
                      ) : null}

                      {!isSimulationsLoading
                        ? simulations.map((simulation) => {
                          const result = simulation.resultJson as {
                            scenarioType?: SimulationScenarioType
                            amount?: number
                            monthlyCommitmentIncrease?: number
                            projectedSummary?: {
                              netBalance?: number
                            }
                          }

                          const scenarioType = result.scenarioType ?? 'direct_purchase'
                          const amount = result.amount ?? 0
                          const monthlyCommitmentIncrease = result.monthlyCommitmentIncrease ?? 0
                          const projectedNetBalance = result.projectedSummary?.netBalance ?? 0

                          return (
                            <tr key={simulation.id}>
                              <td>{simulation.simulationDate}</td>
                              <td>{simulation.name}</td>
                              <td>{getSimulationScenarioLabel(scenarioType)}</td>
                              <td>{formatCurrency(amount)}</td>
                              <td>{formatCurrency(monthlyCommitmentIncrease)}</td>
                              <td>{formatCurrency(projectedNetBalance)}</td>
                              <td>
                                <span className={`badge ${simulation.isFavorable ? 'badge--success' : 'badge--warning'}`}>
                                  {simulation.isFavorable ? 'Favorable' : 'No favorable'}
                                </span>
                              </td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--danger"
                                    type="button"
                                    onClick={() => {
                                      void handleSimulationDelete(simulation.id)
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                        : null}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {activeSection === 'reminders' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Recordatorios</h2>
              <p className="card__subtitle">Gestiona alertas de pago, corte, suscripciones, prestamos y personalizadas.</p>
            </header>

            {reminderMessage ? <p className="message message--success">{reminderMessage}</p> : null}
            {reminderError ? <p className="message message--error">{reminderError}</p> : null}

            <div className="phase8-layout">
              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">{editingReminderId === null ? 'Nuevo recordatorio' : 'Editar recordatorio'}</h3>
                </header>

                <form className="form-grid" onSubmit={handleReminderSubmit}>
                  <label className="form-grid__field" htmlFor="reminderTitle">Titulo</label>
                  <input
                    id="reminderTitle"
                    className="form-grid__input"
                    type="text"
                    value={reminderForm.title}
                    onChange={(event) => {
                      setReminderForm((previous) => ({ ...previous, title: event.target.value }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="reminderDate">Fecha</label>
                  <input
                    id="reminderDate"
                    className="form-grid__input"
                    type="date"
                    value={reminderForm.reminderDate}
                    onChange={(event) => {
                      setReminderForm((previous) => ({ ...previous, reminderDate: event.target.value }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="reminderType">Tipo</label>
                  <select
                    id="reminderType"
                    className="form-grid__input"
                    value={reminderForm.type}
                    onChange={(event) => {
                      setReminderForm((previous) => ({ ...previous, type: event.target.value as ReminderType }))
                    }}
                  >
                    <option value="payment">Pago TDC</option>
                    <option value="cutoff">Corte</option>
                    <option value="subscription">Suscripcion</option>
                    <option value="loan">Prestamo</option>
                    <option value="custom">Custom</option>
                  </select>

                  <label className="form-grid__field" htmlFor="reminderReferenceId">Reference ID (opcional)</label>
                  <input
                    id="reminderReferenceId"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    value={reminderForm.referenceId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      setReminderForm((previous) => ({
                        ...previous,
                        referenceId: value ? Number.parseInt(value, 10) : null,
                      }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="reminderReferenceType">Reference Type (opcional)</label>
                  <input
                    id="reminderReferenceType"
                    className="form-grid__input"
                    type="text"
                    value={reminderForm.referenceType}
                    onChange={(event) => {
                      setReminderForm((previous) => ({ ...previous, referenceType: event.target.value }))
                    }}
                  />

                  <label className="form-grid__field" htmlFor="reminderDescription">Descripcion</label>
                  <textarea
                    id="reminderDescription"
                    className="form-grid__input"
                    rows={3}
                    value={reminderForm.description}
                    onChange={(event) => {
                      setReminderForm((previous) => ({ ...previous, description: event.target.value }))
                    }}
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || isRemindersLoading}>
                      {editingReminderId === null ? 'Guardar recordatorio' : 'Actualizar recordatorio'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetReminderEditor}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </article>

              <article className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Pendientes y acciones</h3>
                  <p className="mini-card__subtitle">Pendientes no leidos: {pendingRemindersCount}</p>
                </header>

                <div className="form-grid__actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={!hasConfig || isRemindersLoading}
                    onClick={() => {
                      void loadReminders()
                    }}
                  >
                    {isRemindersLoading ? 'Cargando...' : 'Recargar'}
                  </button>
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Titulo</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isRemindersLoading ? (
                        <tr>
                          <td colSpan={5}>Cargando recordatorios...</td>
                        </tr>
                      ) : null}

                      {!isRemindersLoading && reminders.length === 0 ? (
                        <tr>
                          <td colSpan={5}>No hay recordatorios registrados.</td>
                        </tr>
                      ) : null}

                      {!isRemindersLoading
                        ? reminders.map((reminder) => (
                          <tr key={reminder.id}>
                            <td>{reminder.reminderDate}</td>
                            <td>
                              <p>{reminder.title}</p>
                              {reminder.description ? <p className="category-card__meta">{reminder.description}</p> : null}
                            </td>
                            <td>{getReminderTypeLabel(reminder.type)}</td>
                            <td>
                              {reminder.isDismissed ? (
                                <span className="badge badge--warning">Descartado</span>
                              ) : reminder.isRead ? (
                                <span className="badge badge--success">Leido</span>
                              ) : (
                                <span className="badge badge--info">Pendiente</span>
                              )}
                            </td>
                            <td>
                              <div className="table__actions">
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  onClick={() => {
                                    startReminderEdit(reminder)
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  disabled={reminder.isRead}
                                  onClick={() => {
                                    void handleReminderMarkAsRead(reminder)
                                  }}
                                >
                                  Marcar leido
                                </button>
                                <button
                                  className="button button--secondary"
                                  type="button"
                                  disabled={reminder.isDismissed}
                                  onClick={() => {
                                    void handleReminderDismiss(reminder)
                                  }}
                                >
                                  Descartar
                                </button>
                                <button
                                  className="button button--danger"
                                  type="button"
                                  onClick={() => {
                                    void handleReminderDelete(reminder.id)
                                  }}
                                >
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
              </article>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
