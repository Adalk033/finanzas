export type InstrumentType = 'credit_card' | 'debit_card' | 'account'
export type CategoryType = 'expense' | 'income' | 'both'
export type TransactionType = 'expense' | 'income'
export type TransferType = 'card_payment' | 'inter_account' | 'loan_payment' | 'other'
export type LoanPaymentType = 'fixed' | 'variable'
export type LoanPaymentFrequency = 'weekly' | 'biweekly' | 'monthly'
export type SubscriptionBillingCycle = 'monthly' | 'yearly' | 'weekly'
export type BudgetStatus = 'under' | 'warning' | 'exceeded'
export type SimulationScenarioType = 'direct_purchase' | 'msi' | 'loan'
export type ReminderType = 'payment' | 'cutoff' | 'subscription' | 'loan' | 'custom'
export type RecurringIncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Bank {
  id: number
  name: string
  shortName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BankInput {
  name: string
  shortName: string
  isActive: boolean
}

export interface FinancialInstrument {
  id: number
  bankId: number
  bankName: string | null
  name: string
  type: InstrumentType
  lastFour: string | null
  currencyId: number
  creditLimit: number | null
  currentBalance: number | null
  availableCredit: number | null
  cutOffDay: number | null
  paymentDueDay: number | null
  annualRate: number | null
  currentAmount: number | null
  linkedAccountId: number | null
  linkedAccountName: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FinancialInstrumentInput {
  bankId: number
  name: string
  type: InstrumentType
  lastFour: string
  currencyId: number
  creditLimit: number | null
  currentBalance: number | null
  availableCredit: number | null
  cutOffDay: number | null
  paymentDueDay: number | null
  annualRate: number | null
  currentAmount: number | null
  linkedAccountId: number | null
  notes: string
  isActive: boolean
}

export interface Subcategory {
  id: number
  categoryId: number
  categoryName: string | null
  name: string
  iconName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: number
  name: string
  type: CategoryType
  isSystem: boolean
  isActive: boolean
  canDelete: boolean
  createdAt: string
  updatedAt: string
  subcategories: Subcategory[]
}

export interface CategoryInput {
  name: string
  type: CategoryType
  isActive: boolean
}

export interface SubcategoryInput {
  categoryId: number
  name: string
  iconName: string
  isActive: boolean
}

export interface Transaction {
  id: number
  instrumentId: number
  instrumentName: string | null
  instrumentType: InstrumentType | null
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  currencyId: number
  type: TransactionType
  amount: number
  description: string | null
  transactionDate: string
  notes: string | null
  isMsi: boolean
  msiMonths: number | null
  msiMonthlyAmount: number | null
  msiStartDate: string | null
  msiRemaining: number | null
  affectsBalance: boolean
  sourceType: string | null
  sourceId: number | null
  createdAt: string
  updatedAt: string
}

export interface TransactionInput {
  instrumentId: number
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  type: TransactionType
  amount: number
  description: string
  transactionDate: string
  notes: string
  isMsi: boolean
  msiMonths: number | null
  affectsBalance: boolean
}

export interface TransactionFilters {
  fromDate?: string
  toDate?: string
  categoryId?: number
  instrumentId?: number
  type?: TransactionType
  search?: string
}

export interface FamilyExpense {
  id: number
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  currencyId: number
  amount: number
  description: string
  expenseDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface FamilyExpenseInput {
  categoryId: number | null
  subcategoryId: number | null
  amount: number
  description: string
  expenseDate: string
  notes: string
}

export interface FamilyExpenseFilters {
  month: string
  categoryId?: number
  search?: string
}

export interface FamilyDashboardSummary {
  total: number
  expenseCount: number
  averageExpense: number
}

export interface FamilyMonthlyExpensePoint {
  month: string
  total: number
}

export interface FamilyDashboard {
  month: string
  summary: FamilyDashboardSummary
  expensesByCategory: DashboardExpenseByCategory[]
  monthlyTrend: FamilyMonthlyExpensePoint[]
}

export interface CreditCardStatement {
  id: number
  instrumentId: number
  instrumentName: string | null
  cutOffDate: string
  paymentDueDate: string
  totalAmount: number
  minimumPayment: number | null
  noInterestPayment: number | null
  isPaid: boolean
  paidAmount: number | null
  outstandingAmount: number
  paidDate: string | null
  createdAt: string
  updatedAt: string
}

export interface CreditCardStatementInput {
  instrumentId: number
  cutOffDate: string
  paymentDueDate: string
  minimumPayment: number | null
  noInterestPayment: number | null
}

export interface CreditCardStatementUpdateInput {
  paymentDueDate: string
  minimumPayment: number | null
  noInterestPayment: number | null
  isPaid: boolean | null
  paidAmount: number | null
  paidDate: string
}

export interface Transfer {
  id: number
  sourceInstrumentId: number
  sourceInstrumentName: string | null
  sourceInstrumentType: InstrumentType | null
  destinationInstrumentId: number
  destinationInstrumentName: string | null
  destinationInstrumentType: InstrumentType | null
  amount: number
  currencyId: number
  transferDate: string
  type: TransferType
  statementId: number | null
  loanId: number | null
  description: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface TransferInput {
  sourceInstrumentId: number
  destinationInstrumentId: number
  amount: number
  currencyId: number
  transferDate: string
  type: TransferType
  statementId: number | null
  loanId: number | null
  description: string
  notes: string
}

export interface Loan {
  id: number
  name: string
  lender: string | null
  currencyId: number
  originalAmount: number
  remainingAmount: number
  annualRate: number | null
  totalInstallments: number
  paidInstallments: number
  paymentType: LoanPaymentType
  fixedPayment: number | null
  paymentDay: number | null
  secondPaymentDay: number | null
  paymentFrequency: LoanPaymentFrequency
  startDate: string
  endDate: string | null
  instrumentId: number | null
  instrumentName: string | null
  affectsInstrumentBalance: boolean
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LoanInput {
  name: string
  lender: string
  currencyId: number
  originalAmount: number
  annualRate: number | null
  totalInstallments: number
  paymentType: LoanPaymentType
  fixedPayment: number | null
  paymentDay: number | null
  secondPaymentDay: number | null
  paymentFrequency: LoanPaymentFrequency
  startDate: string
  endDate: string
  instrumentId: number | null
  affectsInstrumentBalance: boolean
  notes: string
  isActive: boolean
}

export interface LoanPayment {
  id: number
  loanId: number
  installmentNum: number
  amount: number
  principal: number | null
  interest: number | null
  paymentDate: string
  isPaid: boolean
  paidDate: string | null
  notes: string | null
  transactionId: number | null
  affectsInstrumentBalance: boolean
  createdAt: string
  updatedAt: string
}

export interface LoanPaymentRegisterInput {
  paidDate: string
  amount: number | null
  notes: string
}

export interface Subscription {
  id: number
  name: string
  instrumentId: number
  instrumentName: string | null
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  currencyId: number
  amount: number
  billingCycle: SubscriptionBillingCycle
  billingDay: number | null
  nextBilling: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface SubscriptionInput {
  name: string
  instrumentId: number
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  amount: number
  billingCycle: SubscriptionBillingCycle
  billingDay: number | null
  nextBilling: string
  isActive: boolean
  notes: string
}

export interface FixedExpense {
  id: number
  name: string
  instrumentId: number | null
  instrumentName: string | null
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  currencyId: number
  estimatedAmount: number
  isVariable: boolean
  paymentDay: number | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface FixedExpenseInput {
  name: string
  instrumentId: number | null
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  estimatedAmount: number
  isVariable: boolean
  paymentDay: number | null
  isActive: boolean
  notes: string
}

export interface FixedExpensePayment {
  id: number
  fixedExpenseId: number
  fixedExpenseName: string | null
  amount: number
  periodMonth: number
  periodYear: number
  paymentDate: string | null
  isPaid: boolean
  notes: string | null
  transactionId: number | null
  createdAt: string
  updatedAt: string
}

export interface FixedExpensePaymentInput {
  amount: number
  periodMonth: number
  periodYear: number
  paymentDate: string
  isPaid: boolean
  notes: string
}

export interface Budget {
  id: number
  categoryId: number | null
  categoryName: string | null
  currencyId: number
  amount: number
  month: number
  year: number
  notes: string | null
  spentAmount: number
  progressPercent: number
  status: BudgetStatus
  createdAt: string
  updatedAt: string
}

export interface BudgetInput {
  categoryId: number | null
  currencyId: number
  amount: number
  month: number
  year: number
  notes: string
}

export interface Simulation {
  id: number
  name: string
  description: string | null
  simulationDate: string
  snapshotJson: Record<string, unknown>
  resultJson: Record<string, unknown>
  isFavorable: boolean | null
  createdAt: string
}

export interface SimulationInput {
  name: string
  description: string
  simulationDate: string
  scenarioType: SimulationScenarioType
  amount: number
  instrumentId: number | null
  msiMonths: number | null
  loanMonths: number | null
  annualRate: number | null
}

export interface DashboardSummary {
  totalAvailable: number
  totalCreditDebt: number
  totalLoanDebt: number
  totalAvailableCredit: number
  netBalance: number
}

export interface DashboardExpenseByCategory {
  category: string
  total: number
}

export type DashboardExpensePeriod = 'current_month' | 'previous_month' | 'last_3_months' | 'last_year'

export interface DashboardPreferences {
  expensePeriod: DashboardExpensePeriod
}

export interface DashboardCashFlowPoint {
  month: string
  income: number
  expense: number
  debtPayments: number
  netCashFlow: number
}

export interface DashboardBalanceSeries {
  key: string
  label: string
}

export interface DashboardBalancePoint {
  month: string
  [key: string]: string | number
}

export interface DashboardBalanceEvolution {
  series: DashboardBalanceSeries[]
  points: DashboardBalancePoint[]
}

export interface DashboardFutureExpensePoint {
  month: string
  subscriptions: number
  fixedExpenses: number
  loanPayments: number
  creditCardInstallments: number
  total: number
}

export type DashboardUpcomingCommitmentType = 'subscription' | 'fixed_expense' | 'loan_payment' | 'card_payment'

export interface DashboardUpcomingCommitment {
  id: string
  name: string
  date: string
  amount: number
  type: DashboardUpcomingCommitmentType
  instrumentName: string | null
  affectsAvailableBalance: boolean
}

export interface DashboardUpcomingCommitments {
  total: number
  availableAfterCommitments: number
  items: DashboardUpcomingCommitment[]
}

export interface Reminder {
  id: number
  title: string
  description: string | null
  reminderDate: string
  type: ReminderType
  referenceId: number | null
  referenceType: string | null
  isRead: boolean
  isDismissed: boolean
  isAutomatic: boolean
  createdAt: string
  updatedAt: string
}

export interface ReminderInput {
  title: string
  description: string
  reminderDate: string
  type: ReminderType
  referenceId: number | null
  referenceType: string
  isRead: boolean
  isDismissed: boolean
}

export interface ReconciliationInput {
  actualBalance: number
  reconciliationDate: string
  notes: string
}

export interface RecurringIncome {
  id: number
  name: string
  instrumentId: number
  instrumentName: string | null
  categoryId: number | null
  categoryName: string | null
  subcategoryId: number | null
  subcategoryName: string | null
  currencyId: number
  amount: number
  frequency: RecurringIncomeFrequency
  paymentDay: number | null
  secondPaymentDay: number | null
  nextPayment: string
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringIncomeInput {
  name: string
  instrumentId: number
  categoryId: number | null
  subcategoryId: number | null
  currencyId: number
  amount: number
  frequency: RecurringIncomeFrequency
  paymentDay: number | null
  secondPaymentDay: number | null
  nextPayment: string
  isActive: boolean
  notes: string
}

export interface SavingsGoal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  instrumentId: number | null
  instrumentName: string | null
  progressPercent: number
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SavingsGoalInput {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  instrumentId: number | null
  notes: string
  isActive: boolean
}
