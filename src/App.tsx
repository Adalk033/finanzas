import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { apiClient } from './api/client'
import { useLocalConfig } from './hooks/useLocalConfig'
import type {
  Bank,
  BankInput,
  Category,
  CategoryInput,
  CategoryType,
  CreditCardStatement,
  CreditCardStatementInput,
  CreditCardStatementUpdateInput,
  FinancialInstrument,
  FinancialInstrumentInput,
  InstrumentType,
  Subcategory,
  SubcategoryInput,
  Transfer,
  TransferInput,
  TransferType,
  Transaction,
  TransactionFilters,
  TransactionInput,
  TransactionType,
} from './types/domain'

type AppSection = 'settings' | 'banks' | 'instruments' | 'categories' | 'transactions' | 'creditCards'

const EMPTY_BANK_FORM: BankInput = {
  name: '',
  shortName: '',
  color: '',
  iconName: '',
  isActive: true,
}

const EMPTY_INSTRUMENT_FORM: FinancialInstrumentInput = {
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
  notes: '',
  isActive: true,
}

const EMPTY_CATEGORY_FORM: CategoryInput = {
  name: '',
  iconName: '',
  color: '',
  type: 'expense',
  isActive: true,
}

const EMPTY_SUBCATEGORY_FORM: SubcategoryInput = {
  categoryId: 0,
  name: '',
  iconName: '',
  isActive: true,
}

const TODAY_ISO = new Date().toISOString().slice(0, 10)

const EMPTY_TRANSACTION_FORM: TransactionInput = {
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
}

const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  fromDate: '',
  toDate: '',
  categoryId: undefined,
  instrumentId: undefined,
  type: undefined,
  search: '',
}

const EMPTY_STATEMENT_FORM: CreditCardStatementInput = {
  instrumentId: 0,
  cutOffDate: TODAY_ISO,
  paymentDueDate: '',
  minimumPayment: null,
  noInterestPayment: null,
}

const EMPTY_STATEMENT_UPDATE_FORM: CreditCardStatementUpdateInput = {
  paymentDueDate: '',
  minimumPayment: null,
  noInterestPayment: null,
  isPaid: null,
  paidAmount: null,
  paidDate: '',
}

const EMPTY_TRANSFER_FORM: TransferInput = {
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

const MSI_OPTIONS = [3, 6, 9, 12, 18, 24]

function toEditableBank(bank: Bank): BankInput {
  return {
    name: bank.name,
    shortName: bank.shortName ?? '',
    color: bank.color ?? '',
    iconName: bank.iconName ?? '',
    isActive: bank.isActive,
  }
}

function toEditableInstrument(instrument: FinancialInstrument): FinancialInstrumentInput {
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
    notes: instrument.notes ?? '',
    isActive: instrument.isActive,
  }
}

function toEditableCategory(category: Category): CategoryInput {
  return {
    name: category.name,
    iconName: category.iconName ?? '',
    color: category.color ?? '',
    type: category.type,
    isActive: category.isActive,
  }
}

function toEditableSubcategory(subcategory: Subcategory): SubcategoryInput {
  return {
    categoryId: subcategory.categoryId,
    name: subcategory.name,
    iconName: subcategory.iconName ?? '',
    isActive: subcategory.isActive,
  }
}

function formatCurrency(amount: number | null): string {
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

function getCategoryTypeLabel(type: CategoryType): string {
  if (type === 'income') {
    return 'Ingreso'
  }

  if (type === 'both') {
    return 'Ambos'
  }

  return 'Gasto'
}

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
  const [activeSection, setActiveSection] = useState<AppSection>('settings')

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

  if (isLoading) {
    return (
      <main className="settings-screen settings-screen--centered">
        <p className="settings-screen__status">Cargando configuracion local...</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="app-shell__sidebar">
        <h1 className="app-shell__brand">Finanzas Lit</h1>
        <button
          className={`nav-button ${activeSection === 'settings' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('settings')}
        >
          Settings
        </button>
        <button
          className={`nav-button ${activeSection === 'banks' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('banks')}
        >
          Bancos
        </button>
        <button
          className={`nav-button ${activeSection === 'instruments' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('instruments')}
        >
          Instrumentos
        </button>
        <button
          className={`nav-button ${activeSection === 'categories' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('categories')}
        >
          Categorias
        </button>
        <button
          className={`nav-button ${activeSection === 'transactions' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('transactions')}
        >
          Transacciones
        </button>
        <button
          className={`nav-button ${activeSection === 'creditCards' ? 'nav-button--active' : ''}`}
          type="button"
          onClick={() => handleSectionChange('creditCards')}
        >
          Tarjetas y Transferencias
        </button>
      </aside>

      <section className="app-shell__content">
        {activeSection === 'settings' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Configuracion Inicial</h2>
              <p className="card__subtitle">Guarda API Key, endpoint HTTPS y region AWS en SQLite local.</p>
            </header>

            <form className="form-grid" onSubmit={handleSave}>
              <label className="form-grid__field" htmlFor="apiKey">API Key</label>
              <input
                id="apiKey"
                className="form-grid__input"
                type="password"
                value={config.apiKey}
                onChange={(event) => setConfig({ ...config, apiKey: event.target.value })}
                placeholder="Ingresa tu x-api-key"
                autoComplete="off"
                required
              />

              <label className="form-grid__field" htmlFor="apiEndpoint">API Endpoint (HTTPS)</label>
              <input
                id="apiEndpoint"
                className="form-grid__input"
                type="url"
                value={config.apiEndpoint}
                onChange={(event) => setConfig({ ...config, apiEndpoint: event.target.value })}
                placeholder="https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"
                autoComplete="off"
                required
              />

              <label className="form-grid__field" htmlFor="awsRegion">AWS Region</label>
              <input
                id="awsRegion"
                className="form-grid__input"
                type="text"
                value={config.awsRegion}
                onChange={(event) => setConfig({ ...config, awsRegion: event.target.value })}
                placeholder="us-east-1"
                autoComplete="off"
                required
              />

              <div className="form-grid__actions">
                <button className="button button--primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar configuracion'}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={isPinging}
                  onClick={() => {
                    void handlePing()
                  }}
                >
                  {isPinging ? 'Probando...' : 'Probar conexion'}
                </button>
              </div>
            </form>

            {error ? <p className="message message--error">{error}</p> : null}
            {successMessage ? <p className="message message--success">{successMessage}</p> : null}
            {pingError ? <p className="message message--error">{pingError}</p> : null}
            {pingResponse ? <p className="message message--info">{pingResponse}</p> : null}
          </section>
        ) : null}

        {activeSection === 'banks' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Bancos</h2>
              <p className="card__subtitle">Alta, edicion y baja logica de entidades bancarias.</p>
            </header>

            <form className="form-grid" onSubmit={handleBankSubmit}>
              <label className="form-grid__field" htmlFor="bankName">Nombre del banco</label>
              <input
                id="bankName"
                className="form-grid__input"
                type="text"
                value={bankForm.name}
                onChange={(event) => setBankForm({ ...bankForm, name: event.target.value })}
                placeholder="BBVA"
                required
              />

              <label className="form-grid__field" htmlFor="bankShortName">Nombre corto</label>
              <input
                id="bankShortName"
                className="form-grid__input"
                type="text"
                value={bankForm.shortName}
                onChange={(event) => setBankForm({ ...bankForm, shortName: event.target.value })}
                placeholder="BBVA"
              />

              <label className="form-grid__field" htmlFor="bankColor">Color Hex</label>
              <input
                id="bankColor"
                className="form-grid__input"
                type="text"
                value={bankForm.color}
                onChange={(event) => setBankForm({ ...bankForm, color: event.target.value })}
                placeholder="#0057B8"
              />

              <label className="form-grid__field" htmlFor="bankIcon">Icono (Lucide)</label>
              <input
                id="bankIcon"
                className="form-grid__input"
                type="text"
                value={bankForm.iconName}
                onChange={(event) => setBankForm({ ...bankForm, iconName: event.target.value })}
                placeholder="Landmark"
              />

              <div className="form-grid__actions">
                <button className="button button--primary" type="submit" disabled={!hasConfig}>
                  {editingBankId === null ? 'Crear banco' : 'Guardar cambios'}
                </button>
                <button className="button button--secondary" type="button" onClick={resetBankEditor}>
                  Limpiar
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => {
                    void loadBanks()
                  }}
                >
                  Recargar
                </button>
              </div>
            </form>

            {bankError ? <p className="message message--error">{bankError}</p> : null}
            {bankMessage ? <p className="message message--success">{bankMessage}</p> : null}

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Nombre corto</th>
                    <th>Color</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isBanksLoading ? (
                    <tr>
                      <td colSpan={4}>Cargando bancos...</td>
                    </tr>
                  ) : null}
                  {!isBanksLoading && banks.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No hay bancos registrados.</td>
                    </tr>
                  ) : null}
                  {!isBanksLoading
                    ? banks.map((bank) => (
                      <tr key={bank.id}>
                        <td>{bank.name}</td>
                        <td>{bank.shortName ?? '-'}</td>
                        <td>{bank.color ?? '-'}</td>
                        <td>
                          <div className="table__actions">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() => {
                                setEditingBankId(bank.id)
                                setBankForm(toEditableBank(bank))
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                void handleBankDelete(bank.id)
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

        {activeSection === 'instruments' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Instrumentos Financieros</h2>
              <p className="card__subtitle">Gestion de TDC, TDD y cuentas agrupadas por banco.</p>
            </header>

            <form className="form-grid" onSubmit={handleInstrumentSubmit}>
              <label className="form-grid__field" htmlFor="instrumentBank">Banco</label>
              <select
                id="instrumentBank"
                className="form-grid__input"
                value={selectedBankId}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, bankId: Number(event.target.value) })}
                required
              >
                <option value={0}>Selecciona banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>{bank.name}</option>
                ))}
              </select>

              <label className="form-grid__field" htmlFor="instrumentName">Nombre del instrumento</label>
              <input
                id="instrumentName"
                className="form-grid__input"
                type="text"
                value={instrumentForm.name}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, name: event.target.value })}
                placeholder="Nu Platinum"
                required
              />

              <label className="form-grid__field" htmlFor="instrumentType">Tipo</label>
              <select
                id="instrumentType"
                className="form-grid__input"
                value={instrumentForm.type}
                onChange={(event) => handleInstrumentTypeChange(event.target.value as InstrumentType)}
              >
                <option value="credit_card">Tarjeta de credito</option>
                <option value="debit_card">Tarjeta de debito</option>
                <option value="account">Cuenta bancaria</option>
              </select>

              <label className="form-grid__field" htmlFor="instrumentLastFour">Ultimos 4 digitos</label>
              <input
                id="instrumentLastFour"
                className="form-grid__input"
                type="text"
                value={instrumentForm.lastFour}
                maxLength={4}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, lastFour: event.target.value })}
                placeholder="1234"
              />

              {instrumentForm.type === 'credit_card' ? (
                <>
                  <label className="form-grid__field" htmlFor="creditLimit">Limite de credito</label>
                  <input
                    id="creditLimit"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.creditLimit ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, creditLimit: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="currentBalance">Saldo actual</label>
                  <input
                    id="currentBalance"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.currentBalance ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, currentBalance: Number(event.target.value) })}
                  />

                  <label className="form-grid__field" htmlFor="cutOffDay">Dia de corte</label>
                  <input
                    id="cutOffDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={instrumentForm.cutOffDay ?? 1}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, cutOffDay: Number(event.target.value) })}
                    required
                  />

                  <label className="form-grid__field" htmlFor="paymentDueDay">Dia de pago</label>
                  <input
                    id="paymentDueDay"
                    className="form-grid__input"
                    type="number"
                    min={1}
                    max={31}
                    value={instrumentForm.paymentDueDay ?? 1}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, paymentDueDay: Number(event.target.value) })}
                    required
                  />
                </>
              ) : (
                <>
                  <label className="form-grid__field" htmlFor="currentAmount">Saldo actual</label>
                  <input
                    id="currentAmount"
                    className="form-grid__input"
                    type="number"
                    step="0.01"
                    value={instrumentForm.currentAmount ?? 0}
                    onChange={(event) => setInstrumentForm({ ...instrumentForm, currentAmount: Number(event.target.value) })}
                    required
                  />
                </>
              )}

              <label className="form-grid__field" htmlFor="instrumentNotes">Notas</label>
              <input
                id="instrumentNotes"
                className="form-grid__input"
                type="text"
                value={instrumentForm.notes}
                onChange={(event) => setInstrumentForm({ ...instrumentForm, notes: event.target.value })}
                placeholder="Cuenta principal"
              />

              <div className="form-grid__actions">
                <button className="button button--primary" type="submit" disabled={!hasConfig || banks.length === 0}>
                  {editingInstrumentId === null ? 'Crear instrumento' : 'Guardar cambios'}
                </button>
                <button className="button button--secondary" type="button" onClick={resetInstrumentEditor}>
                  Limpiar
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={!hasConfig}
                  onClick={() => {
                    void loadInstruments()
                  }}
                >
                  Recargar
                </button>
              </div>
            </form>

            {instrumentError ? <p className="message message--error">{instrumentError}</p> : null}
            {instrumentMessage ? <p className="message message--success">{instrumentMessage}</p> : null}

            <div className="group-list">
              {isInstrumentsLoading ? <p className="card__subtitle">Cargando instrumentos...</p> : null}
              {!isInstrumentsLoading && groupedInstruments.length === 0 ? (
                <p className="card__subtitle">No hay instrumentos registrados.</p>
              ) : null}

              {!isInstrumentsLoading
                ? groupedInstruments.map((group) => (
                  <article key={group.bank?.id ?? `bank-${group.instruments[0].bankId}`} className="group-card">
                    <h3 className="group-card__title">{group.bank?.name ?? 'Banco sin nombre'}</h3>
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Instrumento</th>
                            <th>Tipo</th>
                            <th>Detalle</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.instruments.map((instrument) => (
                            <tr key={instrument.id}>
                              <td>{instrument.name}</td>
                              <td>{instrument.type}</td>
                              <td>
                                {instrument.type === 'credit_card'
                                  ? `Corte ${instrument.cutOffDay ?? '-'} / Pago ${instrument.paymentDueDay ?? '-'} / Limite ${formatCurrency(instrument.creditLimit)} / Saldo ${formatCurrency(instrument.currentBalance)}`
                                  : `Saldo ${formatCurrency(instrument.currentAmount)}`}
                              </td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--secondary"
                                    type="button"
                                    onClick={() => {
                                      setEditingInstrumentId(instrument.id)
                                      setInstrumentForm(toEditableInstrument(instrument))
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="button button--danger"
                                    type="button"
                                    onClick={() => {
                                      void handleInstrumentDelete(instrument.id)
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))
                : null}
            </div>
          </section>
        ) : null}

        {activeSection === 'categories' ? (
          <section className="card">
            <header className="card__header">
              <h2 className="card__title">Categorias y Subcategorias</h2>
              <p className="card__subtitle">CRUD de categorias con subcategorias anidadas y control de eliminacion.</p>
            </header>

            <div className="category-layout">
              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Categoria</h3>
                  <p className="mini-card__subtitle">Define el grupo principal que se usara en gastos e ingresos.</p>
                </header>

                <form className="form-grid" onSubmit={handleCategorySubmit}>
                  <label className="form-grid__field" htmlFor="categoryName">Nombre</label>
                  <input
                    id="categoryName"
                    className="form-grid__input"
                    type="text"
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                    placeholder="Alimentacion"
                    required
                  />

                  <label className="form-grid__field" htmlFor="categoryType">Tipo</label>
                  <select
                    id="categoryType"
                    className="form-grid__input"
                    value={categoryForm.type}
                    onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value as CategoryType })}
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                    <option value="both">Ambos</option>
                  </select>

                  <label className="form-grid__field" htmlFor="categoryIcon">Icono (Lucide)</label>
                  <input
                    id="categoryIcon"
                    className="form-grid__input"
                    type="text"
                    value={categoryForm.iconName}
                    onChange={(event) => setCategoryForm({ ...categoryForm, iconName: event.target.value })}
                    placeholder="UtensilsCrossed"
                  />

                  <label className="form-grid__field" htmlFor="categoryColor">Color</label>
                  <input
                    id="categoryColor"
                    className="form-grid__input"
                    type="text"
                    value={categoryForm.color}
                    onChange={(event) => setCategoryForm({ ...categoryForm, color: event.target.value })}
                    placeholder="#2d8f85"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig}>
                      {editingCategoryId === null ? 'Crear categoria' : 'Guardar cambios'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetCategoryEditor}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!hasConfig}
                      onClick={() => {
                        void loadCategories()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>

                {categoryError ? <p className="message message--error">{categoryError}</p> : null}
                {categoryMessage ? <p className="message message--success">{categoryMessage}</p> : null}
              </section>

              <section className="mini-card">
                <header className="mini-card__header">
                  <h3 className="mini-card__title">Subcategoria</h3>
                  <p className="mini-card__subtitle">Cada subcategoria vive dentro de una categoria existente.</p>
                </header>

                <form className="form-grid" onSubmit={handleSubcategorySubmit}>
                  <label className="form-grid__field" htmlFor="subcategoryCategory">Categoria</label>
                  <select
                    id="subcategoryCategory"
                    className="form-grid__input"
                    value={selectedSubcategoryCategoryId}
                    onChange={(event) => setSubcategoryForm({ ...subcategoryForm, categoryId: Number(event.target.value) })}
                    required
                  >
                    <option value={0}>Selecciona categoria</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label className="form-grid__field" htmlFor="subcategoryName">Nombre</label>
                  <input
                    id="subcategoryName"
                    className="form-grid__input"
                    type="text"
                    value={subcategoryForm.name}
                    onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })}
                    placeholder="Despensa"
                    required
                  />

                  <label className="form-grid__field" htmlFor="subcategoryIcon">Icono (Lucide)</label>
                  <input
                    id="subcategoryIcon"
                    className="form-grid__input"
                    type="text"
                    value={subcategoryForm.iconName}
                    onChange={(event) => setSubcategoryForm({ ...subcategoryForm, iconName: event.target.value })}
                    placeholder="ShoppingCart"
                  />

                  <div className="form-grid__actions">
                    <button className="button button--primary" type="submit" disabled={!hasConfig || categories.length === 0}>
                      {editingSubcategoryId === null ? 'Crear subcategoria' : 'Guardar cambios'}
                    </button>
                    <button className="button button--secondary" type="button" onClick={resetSubcategoryEditor}>
                      Limpiar
                    </button>
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={!hasConfig}
                      onClick={() => {
                        void loadCategories()
                      }}
                    >
                      Recargar
                    </button>
                  </div>
                </form>

                {subcategoryError ? <p className="message message--error">{subcategoryError}</p> : null}
                {subcategoryMessage ? <p className="message message--success">{subcategoryMessage}</p> : null}
              </section>
            </div>

            <div className="category-list">
              {isCategoriesLoading ? <p className="card__subtitle">Cargando categorias...</p> : null}
              {!isCategoriesLoading && categories.length === 0 ? (
                <p className="card__subtitle">No hay categorias registradas.</p>
              ) : null}

              {!isCategoriesLoading
                ? categories.map((category) => (
                  <article key={category.id} className="category-card">
                    <header className="category-card__header">
                      <div>
                        <h3 className="category-card__title">{category.name}</h3>
                        <p className="category-card__meta">
                          {getCategoryTypeLabel(category.type)} · {category.subcategories.length} subcategorias
                        </p>
                      </div>
                      <div className="category-card__badges">
                        {category.isSystem ? <span className="badge badge--info">Sistema</span> : null}
                        {category.canDelete ? <span className="badge badge--success">Eliminable</span> : <span className="badge badge--warning">Protegida</span>}
                      </div>
                    </header>

                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Subcategoria</th>
                            <th>Icono</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.subcategories.length === 0 ? (
                            <tr>
                              <td colSpan={3}>No hay subcategorias en esta categoria.</td>
                            </tr>
                          ) : null}
                          {category.subcategories.map((subcategory) => (
                            <tr key={subcategory.id}>
                              <td>{subcategory.name}</td>
                              <td>{subcategory.iconName ?? '-'}</td>
                              <td>
                                <div className="table__actions">
                                  <button
                                    className="button button--secondary"
                                    type="button"
                                    onClick={() => {
                                      setEditingSubcategoryId(subcategory.id)
                                      setSubcategoryForm(toEditableSubcategory(subcategory))
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="button button--danger"
                                    type="button"
                                    onClick={() => {
                                      void handleSubcategoryDelete(subcategory.id)
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="category-card__actions">
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(category.id)
                          setCategoryForm(toEditableCategory(category))
                        }}
                      >
                        Editar categoria
                      </button>
                      <button
                        className="button button--danger"
                        type="button"
                        disabled={!category.canDelete}
                        onClick={() => {
                          void handleCategoryDelete(category.id)
                        }}
                      >
                        Eliminar categoria
                      </button>
                    </div>
                  </article>
                ))
                : null}
            </div>
          </section>
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
      </section>
    </main>
  )
}
