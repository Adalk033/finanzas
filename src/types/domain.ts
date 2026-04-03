export type InstrumentType = 'credit_card' | 'debit_card' | 'account'
export type CategoryType = 'expense' | 'income' | 'both'
export type TransactionType = 'expense' | 'income'

export interface Bank {
  id: number
  name: string
  shortName: string | null
  color: string | null
  iconName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BankInput {
  name: string
  shortName: string
  color: string
  iconName: string
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
  iconName: string | null
  color: string | null
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
  iconName: string
  color: string
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
}

export interface TransactionFilters {
  fromDate?: string
  toDate?: string
  categoryId?: number
  instrumentId?: number
  type?: TransactionType
  search?: string
}
