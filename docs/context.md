## Purpose

This file provides the full project context for AI assistants (Cursor, Copilot, ChatGPT, Claude, etc.). Paste or attach this file at the start of any conversation about finance-app so the assistant understands the architecture, database schema, API contract, TypeScript types, and business rules without needing to re-explain.

---

## 1. Project Summary

- **Name**: finance-app
- **Type**: Desktop application (Windows / macOS)
- **Purpose**: Personal financial management — track bank accounts, credit cards, transactions, loans, subscriptions, fixed expenses, budgets, and run financial simulations.
- **User model**: Single user, multi-device (data lives in the cloud).
- **Language**: Code and comments in English. UI labels and messages in Spanish.

---

## 2. Architecture

- **Local storage** (better-sqlite3): Stores ONLY connection configuration. No financial data.
- **Remote storage** (PostgreSQL on RDS): All financial data. Schema: `app_gastos`.

---

## 3. Tech Stack

- **Frontend**: Electron + React 18+ + TypeScript + Vite + CSS nativo + Recharts + Lucide React + fetch nativo + better-sqlite3 (config only)
- **Backend**: AWS API Gateway + single Lambda (.mjs) + pg (node-postgres) + PostgreSQL 15+ (RDS)
- **Banned**: Tailwind, styled-components, shadcn/ui, any ORM, any CSS framework, axios, any HTTP lib, any state management lib beyond React built-ins

---

## 4. Domain Entities

### 4.1 Currencies

- The system supports multiple currencies but defaults to MXN (Peso Mexicano).
- Every monetary entity references a currency.
- All amounts are stored with 2 decimal places.
- Frontend formatting: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.

### 4.2 Banks

- Represent financial institutions (e.g., BBVA, Banorte, Nu).
- Have a display name, optional short name, color (hex), and icon.
- Can be deactivated (soft-delete via `is_active`).
- A bank groups one or more financial instruments.

### 4.3 Financial Instruments

An instrument is any financial product tied to a bank. Three types exist:

- **Credit card** (`credit_card`): Has a credit limit, current balance (debt), available credit, cut-off day (fixed, does not change), payment due day (default, editable per statement), and annual interest rate.
- **Debit card** (`debit_card`): Has a current amount (balance available).
- **Bank account** (`account`): Same as debit card — tracks current amount.

Key rules:

- `available_credit = credit_limit - current_balance` (always maintained by backend).
- Instruments are grouped by bank in the UI.
- Each instrument stores the last 4 digits for identification.
- Instruments can be soft-deleted (deactivated).

### 4.4 Categories and Subcategories

- Every transaction, subscription, and fixed expense can be classified by category and subcategory.
- Categories have a type: `expense`, `income`, or `both`.
- **System categories** (`is_system = true`) are pre-loaded and cannot be deleted.
- **Custom categories** can be deleted ONLY if no transactions, subscriptions, or fixed expenses reference them.
- Subcategories belong to exactly one category. The name must be unique within its parent.
- Categories and subcategories have an optional icon (Lucide name) and color (hex).

### 4.5 Transactions

A transaction is a single income or expense event.

- **Type**: `expense` or `income`.
- Every transaction is linked to a financial instrument and optionally to a category/subcategory.
- **Balance side effects** (all handled by backend):
    - Expense on credit card: increases `current_balance`, decreases `available_credit`.
    - Expense on debit/account: decreases `current_amount`.
    - Income on debit/account: increases `current_amount`.
    - Deleting a transaction reverses the balance change.
- **Important**: Paying a credit card or moving money between accounts is NOT a transaction — it is a **transfer** (see section 4.13). Transactions are purchases/income; transfers are movements between instruments.

#### MSI (Meses Sin Intereses)

- MSI is only applicable to credit card transactions.
- When a transaction is flagged as MSI, the system calculates: `msi_monthly_amount = ROUND(total / msi_months, 2)`.
- Available MSI options: 3, 6, 9, 12, 18, 24 months.
- `msi_start_date` is derived from the credit card's cut-off day.
- `msi_remaining` tracks how many installments are still pending.
- Each MSI installment appears in the corresponding credit card statement period.

### 4.6 Credit Card Statements

- A statement represents one billing cycle for a credit card.
- One statement per instrument per cut-off period (unique constraint).
- `cut_off_date` is calculated from the card's `cut_off_day`.
- `payment_due_date` defaults from the card's `payment_due_day` but the user can override it per statement.
- Tracks: total amount, minimum payment, no-interest payment, payment status.
- Links to all transactions that fall within that billing period.

### 4.7 Loans

A loan represents a debt with scheduled payments.

- **Fixed payment** (`fixed`): The monthly amount is static and stored in `fixed_payment`.
- **Variable payment** (`variable`): Monthly payment is calculated using the standard amortization formula with `annual_rate`.
- When a loan is created, the system auto-generates the full payment schedule (all installments).
- Each installment tracks: amount, principal portion, interest portion, payment date, and paid status.
- As payments are registered, `remaining_amount` decreases and `paid_installments` increments.
- A loan can be linked to a financial instrument (the account/card from which payments are made).
- Loans can be soft-deleted (deactivated).

### 4.8 Subscriptions

- A subscription is a recurring charge (e.g., Netflix, Spotify, iCloud).
- Linked to a specific financial instrument (the card/account that gets charged).
- Billing cycles: `monthly`, `yearly`, or `weekly`.
- `billing_day` indicates the day of the month/week the charge occurs.
- `next_billing` tracks the next expected charge date.
- Used in dashboard projections and financial summaries.
- Can be soft-deleted (deactivated).

### 4.9 Fixed Expenses

- Fixed expenses are recurring obligations with predictable amounts (rent, electricity, water, gas, internet).
- `is_variable = true` for expenses that fluctuate month to month (e.g., electricity, water).
- `estimated_amount` is used for projections; the actual amount is recorded per period when paid.
- Payment history is tracked per month/year, with a unique constraint to prevent duplicate entries.
- Optionally linked to a financial instrument and category/subcategory.

### 4.10 Budgets

- A budget sets a spending cap for a specific category in a specific month.
- `category_id = NULL` represents a global monthly budget (all categories combined).
- **Progress calculation**: sum of expense transactions in that category for that month vs. the budget amount.
- **Visual indicators**: green (under budget), yellow (near limit, >80%), red (exceeded).
- One budget per category per month (unique constraint).

### 4.11 Simulations

- The simulator answers the question: "What happens to my finances if I make this purchase / take this loan?"
- When running a simulation, the system snapshots the user's entire financial state as JSON.
- Input: hypothetical amount + type (direct purchase, MSI purchase, new loan with terms).
- Output: projected balances across all instruments after the hypothetical action.
- `is_favorable = true` if no account/instrument goes negative and all existing obligations can still be met.
- Simulations are saved for later review.

### 4.13 Transfers (Pagos y Movimientos entre Instrumentos)

A transfer represents a movement of money between two financial instruments. This is the mechanism for card payments, inter-account transfers, and loan payments.

- **Source instrument**: the account/debit card from which money leaves (`current_amount` decreases).
- **Destination instrument**: the account or credit card that receives the money.
    - If destination is a credit card: `current_balance` decreases, `available_credit` increases.
    - If destination is a debit/account: `current_amount` increases.
- **Types**:
    - `card_payment` — paying a credit card bill (partial, total, or advance payment). Optionally linked to a specific statement via `statement_id`.
    - `inter_account` — moving money between own accounts (e.g., savings → checking).
    - `loan_payment` — paying a loan installment from a specific account. Linked to a loan via `loan_id`.
    - `other` — any other inter-instrument movement.
- **Independence from transactions**: Transfers are NOT transactions. A credit card payment is independent from the purchases (cash, MSI, MCI) that generated the debt. The user can make partial payments, advance payments, or arbitrary adjustments at any time.
- **Constraint**: source and destination instruments must be different.
- Both instrument balances are updated atomically by the backend.

### 4.12 Reminders

- Reminders are NOT push notifications (the app is not always open).
- Displayed in a dedicated Reminders section within the app, with an unread count badge in the sidebar.
- Types: `payment` (TDC due date), `cutoff` (TDC cut-off), `subscription` (upcoming charge), `loan` (installment due), `custom` (user-created).
- Each reminder can optionally reference a related entity (instrument, loan, subscription).
- User can mark reminders as read or dismiss them.

---

## 5. Dashboard

- **Summary cards**: total available cash (all debit/accounts), total credit card debt, total loan debt, total available credit, net balance (available minus all debts).
- **Charts**:
    - Pie: expenses by category for the current month.
    - Bar: monthly income vs. expenses (last 6-12 months).
    - Line: balance evolution per account over time.
    - Area: projected future expenses (subscriptions + fixed expenses + loan payments).

---

## 6. API Contract

All endpoints go through API Gateway to a single Lambda. Auth via `x-api-key` header.

Response shape (always):

```tsx
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### 6.1 Endpoints

```jsx
Banks:           CRUD  /banks
Instruments:     CRUD  /instruments         (soft-delete)
Categories:      CRUD  /categories          (delete checks dependencies)
Subcategories:   CRUD  /subcategories       (filtered by category_id)
Transactions:    CRUD  /transactions         (auto-updates balances)
Statements:      CRUD  /statements          (filtered by instrument_id)
Loans:           CRUD  /loans               (auto-generates schedule)
                 POST  /loans/:id/payments/:num/pay
Subscriptions:   CRUD  /subscriptions       (soft-delete)
Fixed expenses:  CRUD  /fixed-expenses      (soft-delete)
                 CRUD  /fixed-expenses/:id/payments
Budgets:         CRUD  /budgets             (filtered by month/year)
                 GET   /budgets/progress
Simulations:     CRD   /simulations
Transfers:       CRUD  /transfers           (auto-updates both instrument balances)
                 GET   /transfers?instrument_id=&type=&date_from=&date_to=
Reminders:       CRUD  /reminders           (filtered by is_read)
Dashboard:       GET   /dashboard/summary
                 GET   /dashboard/expenses-by-category
                 GET   /dashboard/monthly-flow
                 GET   /dashboard/balance-history
                 GET   /dashboard/projections
```

---

## 7. TypeScript Interfaces (Shared)

```tsx
interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

interface Bank {
  id: number;
  name: string;
  shortName?: string;
  color?: string;
  iconName?: string;
  isActive: boolean;
}

interface FinancialInstrument {
  id: number;
  bankId: number;
  name: string;
  type: 'credit_card' | 'debit_card' | 'account';
  lastFour?: string;
  currencyId: number;
  creditLimit?: number;
  currentBalance?: number;
  availableCredit?: number;
  cutOffDay?: number;
  paymentDueDay?: number;
  annualRate?: number;
  currentAmount?: number;
  isActive: boolean;
  notes?: string;
}

interface Category {
  id: number;
  name: string;
  iconName?: string;
  color?: string;
  type: 'expense' | 'income' | 'both';
  isSystem: boolean;
  isActive: boolean;
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  iconName?: string;
  isActive: boolean;
}

interface Transaction {
  id: number;
  instrumentId: number;
  categoryId?: number;
  subcategoryId?: number;
  currencyId: number;
  type: 'expense' | 'income';
  amount: number;
  description?: string;
  transactionDate: string;
  notes?: string;
  isMsi: boolean;
  msiMonths?: number;
  msiMonthlyAmount?: number;
  msiStartDate?: string;
  msiRemaining?: number;
}

interface Loan {
  id: number;
  name: string;
  lender?: string;
  currencyId: number;
  originalAmount: number;
  remainingAmount: number;
  annualRate?: number;
  totalInstallments: number;
  paidInstallments: number;
  paymentType: 'fixed' | 'variable';
  fixedPayment?: number;
  paymentDay?: number;
  startDate: string;
  endDate?: string;
  instrumentId?: number;
  notes?: string;
  isActive: boolean;
}

interface LoanPayment {
  id: number;
  loanId: number;
  installmentNum: number;
  amount: number;
  principal?: number;
  interest?: number;
  paymentDate: string;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
}

interface Subscription {
  id: number;
  name: string;
  instrumentId: number;
  categoryId?: number;
  subcategoryId?: number;
  currencyId: number;
  amount: number;
  billingCycle: 'monthly' | 'yearly' | 'weekly';
  billingDay?: number;
  nextBilling?: string;
  isActive: boolean;
  notes?: string;
}

interface FixedExpense {
  id: number;
  name: string;
  instrumentId?: number;
  categoryId?: number;
  subcategoryId?: number;
  currencyId: number;
  estimatedAmount: number;
  isVariable: boolean;
  paymentDay?: number;
  isActive: boolean;
  notes?: string;
}

interface FixedExpensePayment {
  id: number;
  fixedExpenseId: number;
  amount: number;
  periodMonth: number;
  periodYear: number;
  paymentDate?: string;
  isPaid: boolean;
  notes?: string;
}

interface Budget {
  id: number;
  categoryId?: number;
  currencyId: number;
  amount: number;
  month: number;
  year: number;
  notes?: string;
}

interface Simulation {
  id: number;
  name: string;
  description?: string;
  simulationDate: string;
  snapshotJson: object;
  resultJson: object;
  isFavorable?: boolean;
}

interface Reminder {
  id: number;
  title: string;
  description?: string;
  reminderDate: string;
  type: 'payment' | 'cutoff' | 'subscription' | 'loan' | 'custom';
  referenceId?: number;
  referenceType?: string;
  isRead: boolean;
  isDismissed: boolean;
}

interface Transfer {
  id: number;
  sourceInstrumentId: number;
  destinationInstrumentId: number;
  amount: number;
  currencyId: number;
  transferDate: string;
  type: 'card_payment' | 'inter_account' | 'loan_payment' | 'other';
  statementId?: number;
  loanId?: number;
  description?: string;
  notes?: string;
}

interface CreditCardStatement {
  id: number;
  instrumentId: number;
  cutOffDate: string;
  paymentDueDate: string;
  totalAmount: number;
  minimumPayment?: number;
  noInterestPayment?: number;
  isPaid: boolean;
  paidAmount?: number;
  paidDate?: string;
}

interface FinancialSummary {
  totalAvailable: number;
  totalCreditDebt: number;
  totalLoanDebt: number;
  totalAvailableCredit: number;
  netBalance: number;
}

interface BudgetProgress {
  categoryId: number | null;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentUsed: number;
  status: 'under' | 'near' | 'exceeded';
}

interface MonthlyFlow {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
}
```

---

## 8. Key Constraints

1. All financial math runs on the backend (Lambda/PostgreSQL). Frontend is display-only.
2. All monetary values: `NUMERIC(12,2)` in PostgreSQL, `number` in TypeScript.
3. Local SQLite stores ONLY: api_key, api_endpoint, aws_region. No financial data.
4. API response shape is always: `{ success, data?, error? }`.
5. Dark theme by default. CSS custom properties for all design tokens.
6. No libraries beyond: React, Vite, Recharts, Lucide React, better-sqlite3, pg.