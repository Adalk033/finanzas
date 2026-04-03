export type InstrumentType = 'credit_card' | 'debit_card' | 'account'

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
