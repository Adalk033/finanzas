import type {
  Bank,
  BankInput,
  BudgetInput,
  BudgetStatus,
  Category,
  CategoryInput,
  CategoryType,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  DashboardSummary,
  FinancialInstrument,
  FinancialInstrumentInput,
  FamilyExpenseFilters,
  FamilyExpenseInput,
  FixedExpense,
  FixedExpenseInput,
  FixedExpensePaymentInput,
  LoanInput,
  LoanPaymentRegisterInput,
  ReminderInput,
  ReminderType,
  SimulationInput,
  SimulationScenarioType,
  Subcategory,
  SubcategoryInput,
  Subscription,
  SubscriptionInput,
  TransactionFilters,
  TransactionInput,
  TransferInput,
  RecurringIncomeInput,
  SavingsGoalInput,
} from '../types/domain'

export type AppSection =
  | 'dashboard'
  | 'settings'
  | 'banks'
  | 'instruments'
  | 'categories'
  | 'transactions'
  | 'creditCards'
  | 'transfers'
  | 'subscriptions'
  | 'fixedExpenses'
  | 'loans'
  | 'budgets'
  | 'reminders'
  | 'simulator'
  | 'familyDashboard'
  | 'familyExpenses'

const currentDate = new Date()
const TODAY_ISO = [
  currentDate.getFullYear(),
  String(currentDate.getMonth() + 1).padStart(2, '0'),
  String(currentDate.getDate()).padStart(2, '0'),
].join('-')
export const CURRENT_MONTH_ISO = TODAY_ISO.slice(0, 7)

export const EMPTY_BANK_FORM: BankInput = {
  name: '',
  shortName: '',
  isActive: true,
}

export const EMPTY_INSTRUMENT_FORM: FinancialInstrumentInput = {
  bankId: 0,
  name: '',
  type: 'credit_card',
  lastFour: '',
  currencyId: 1,
  creditLimit: 0,
  currentBalance: 0,
  availableCredit: 0,
  cutOffDay: 1,
  paymentDueDay: 1,
  annualRate: null,
  currentAmount: 0,
  linkedAccountId: null,
  notes: '',
  isActive: true,
}

export const EMPTY_CATEGORY_FORM: CategoryInput = {
  name: '',
  type: 'expense',
  isActive: true,
}

export const EMPTY_SUBCATEGORY_FORM: SubcategoryInput = {
  categoryId: 0,
  name: '',
  iconName: '',
  isActive: true,
}

export const EMPTY_TRANSACTION_FORM: TransactionInput = {
  instrumentId: 0,
  categoryId: null,
  subcategoryId: null,
  currencyId: 1,
  type: 'expense',
  amount: 0,
  description: '',
  transactionDate: TODAY_ISO,
  notes: '',
  isMsi: false,
  msiMonths: null,
  affectsBalance: true,
}

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  fromDate: '',
  toDate: '',
  categoryId: undefined,
  instrumentId: undefined,
  type: undefined,
  search: '',
}

export const EMPTY_FAMILY_EXPENSE_FORM: FamilyExpenseInput = {
  categoryId: null,
  subcategoryId: null,
  amount: 0,
  description: '',
  expenseDate: TODAY_ISO,
  notes: '',
}

export const EMPTY_FAMILY_EXPENSE_FILTERS: FamilyExpenseFilters = {
  month: CURRENT_MONTH_ISO,
  categoryId: undefined,
  search: '',
}

export const EMPTY_STATEMENT_FORM: CreditCardStatementInput = {
  instrumentId: 0,
  cutOffDate: TODAY_ISO,
  paymentDueDate: '',
  minimumPayment: null,
  noInterestPayment: null,
}

export const EMPTY_STATEMENT_UPDATE_FORM: CreditCardStatementUpdateInput = {
  paymentDueDate: '',
  minimumPayment: null,
  noInterestPayment: null,
  isPaid: null,
  paidAmount: null,
  paidDate: '',
}

export const EMPTY_TRANSFER_FORM: TransferInput = {
  sourceInstrumentId: 0,
  destinationInstrumentId: 0,
  amount: 0,
  currencyId: 1,
  transferDate: TODAY_ISO,
  type: 'card_payment',
  statementId: null,
  loanId: null,
  description: '',
  notes: '',
}

export const EMPTY_LOAN_FORM: LoanInput = {
  name: '',
  lender: '',
  currencyId: 1,
  originalAmount: 0,
  annualRate: null,
  totalInstallments: 12,
  paymentType: 'fixed',
  fixedPayment: 0,
  paymentDay: 1,
  secondPaymentDay: null,
  paymentFrequency: 'monthly',
  startDate: TODAY_ISO,
  endDate: '',
  instrumentId: null,
  affectsInstrumentBalance: true,
  notes: '',
  isActive: true,
}

export const EMPTY_LOAN_PAYMENT_REGISTER: LoanPaymentRegisterInput = {
  paidDate: TODAY_ISO,
  amount: null,
  notes: '',
}

export const EMPTY_SUBSCRIPTION_FORM: SubscriptionInput = {
  name: '',
  instrumentId: 0,
  categoryId: null,
  subcategoryId: null,
  currencyId: 1,
  amount: 0,
  billingCycle: 'monthly',
  billingDay: 1,
  nextBilling: TODAY_ISO,
  isActive: true,
  notes: '',
}

export const EMPTY_FIXED_EXPENSE_FORM: FixedExpenseInput = {
  name: '',
  instrumentId: null,
  categoryId: null,
  subcategoryId: null,
  currencyId: 1,
  estimatedAmount: 0,
  isVariable: false,
  paymentDay: 1,
  isActive: true,
  notes: '',
}

export const EMPTY_FIXED_EXPENSE_PAYMENT_FORM: FixedExpensePaymentInput = {
  amount: 0,
  periodMonth: new Date().getMonth() + 1,
  periodYear: new Date().getFullYear(),
  paymentDate: TODAY_ISO,
  isPaid: true,
  notes: '',
}

export const EMPTY_BUDGET_FORM: BudgetInput = {
  categoryId: null,
  currencyId: 1,
  amount: 0,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  notes: '',
}

export const EMPTY_SIMULATION_FORM: SimulationInput = {
  name: '',
  description: '',
  simulationDate: TODAY_ISO,
  scenarioType: 'direct_purchase',
  amount: 0,
  instrumentId: null,
  msiMonths: null,
  loanMonths: null,
  annualRate: null,
}

export const EMPTY_REMINDER_FORM: ReminderInput = {
  title: '',
  description: '',
  reminderDate: TODAY_ISO,
  type: 'custom',
  referenceId: null,
  referenceType: '',
  isRead: false,
  isDismissed: false,
}

export const EMPTY_RECURRING_INCOME_FORM: RecurringIncomeInput = {
  name: '',
  instrumentId: 0,
  categoryId: null,
  subcategoryId: null,
  currencyId: 1,
  amount: 0,
  frequency: 'monthly',
  paymentDay: 1,
  secondPaymentDay: null,
  nextPayment: TODAY_ISO,
  isActive: true,
  notes: '',
}

export const EMPTY_SAVINGS_GOAL_FORM: SavingsGoalInput = {
  name: '',
  targetAmount: 0,
  currentAmount: 0,
  targetDate: '',
  instrumentId: null,
  notes: '',
  isActive: true,
}

export const MSI_OPTIONS = [3, 6, 9, 12, 18, 24]
export const DASHBOARD_CHART_COLORS = ['#57A6D8', '#6F86E8', '#F4C95D', '#E6A23C', '#F87171', '#A78BFA']
export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalAvailable: 0,
  totalCreditDebt: 0,
  totalLoanDebt: 0,
  totalAvailableCredit: 0,
  netBalance: 0,
}

export const EMPTY_DASHBOARD_UPCOMING_COMMITMENTS = {
  total: 0,
  availableAfterCommitments: 0,
  items: [],
}

export function toEditableBank(bank: Bank): BankInput {
  return {
    name: bank.name,
    shortName: bank.shortName ?? '',
    isActive: bank.isActive,
  }
}

export function toEditableInstrument(instrument: FinancialInstrument): FinancialInstrumentInput {
  return {
    bankId: instrument.bankId,
    name: instrument.name,
    type: instrument.type,
    lastFour: instrument.lastFour ?? '',
    currencyId: instrument.currencyId,
    creditLimit: instrument.creditLimit,
    currentBalance: instrument.currentBalance,
    availableCredit: instrument.availableCredit,
    cutOffDay: instrument.cutOffDay,
    paymentDueDay: instrument.paymentDueDay,
    annualRate: instrument.annualRate,
    currentAmount: instrument.currentAmount,
    linkedAccountId: instrument.linkedAccountId,
    notes: instrument.notes ?? '',
    isActive: instrument.isActive,
  }
}

export function toEditableCategory(category: Category): CategoryInput {
  return {
    name: category.name,
    type: category.type,
    isActive: category.isActive,
  }
}

export function toEditableSubcategory(subcategory: Subcategory): SubcategoryInput {
  return {
    categoryId: subcategory.categoryId,
    name: subcategory.name,
    iconName: subcategory.iconName ?? '',
    isActive: subcategory.isActive,
  }
}

export function toEditableSubscription(subscription: Subscription): SubscriptionInput {
  return {
    name: subscription.name,
    instrumentId: subscription.instrumentId,
    categoryId: subscription.categoryId,
    subcategoryId: subscription.subcategoryId,
    currencyId: subscription.currencyId,
    amount: subscription.amount,
    billingCycle: subscription.billingCycle,
    billingDay: subscription.billingDay,
    nextBilling: subscription.nextBilling ?? '',
    isActive: subscription.isActive,
    notes: subscription.notes ?? '',
  }
}

export function toEditableFixedExpense(expense: FixedExpense): FixedExpenseInput {
  return {
    name: expense.name,
    instrumentId: expense.instrumentId,
    categoryId: expense.categoryId,
    subcategoryId: expense.subcategoryId,
    currencyId: expense.currencyId,
    estimatedAmount: expense.estimatedAmount,
    isVariable: expense.isVariable,
    paymentDay: expense.paymentDay,
    isActive: expense.isActive,
    notes: expense.notes ?? '',
  }
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) {
    return '-'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getCategoryTypeLabel(type: CategoryType): string {
  if (type === 'income') {
    return 'Ingreso'
  }

  if (type === 'both') {
    return 'Ambos'
  }

  return 'Gasto'
}

export function getBudgetStatusLabel(status: BudgetStatus): string {
  if (status === 'exceeded') {
    return 'Excedido'
  }

  if (status === 'warning') {
    return 'Al limite'
  }

  return 'Bajo control'
}

export function getSimulationScenarioLabel(type: SimulationScenarioType): string {
  if (type === 'msi') {
    return 'MSI'
  }

  if (type === 'loan') {
    return 'Prestamo'
  }

  return 'Compra directa'
}

export function getReminderTypeLabel(type: ReminderType): string {
  if (type === 'payment') {
    return 'Pago'
  }

  if (type === 'cutoff') {
    return 'Corte'
  }

  if (type === 'subscription') {
    return 'Suscripcion'
  }

  if (type === 'loan') {
    return 'Prestamo'
  }

  return 'Custom'
}
