## Project Overview

finance-app is a desktop application for personal financial management. Built with Electron + React + TypeScript + Vite. Connects to a remote AWS backend (API Gateway + Lambda + PostgreSQL on RDS). Local SQLite (better-sqlite3) stores only connection configuration (API key, endpoint, region). Designed for a single user consuming data from multiple devices.

### Key Features

- Multi-bank account management (group instruments by bank)
- Credit card tracking (cut-off date, payment due date, credit limit, available credit, current balance)
- Debit card and bank account balance tracking
- Transaction logging (income and expenses) with category/subcategory classification
- MSI (Meses Sin Intereses) purchases with automatic monthly amount calculation based on cut-off cycle
- Loan management with amortization schedules (fixed payment or variable rate)
- Subscription tracking (monthly, yearly, weekly billing cycles)
- Fixed expense management (rent, utilities) with monthly payment history
- Monthly budgets per category with progress indicators
- Financial simulator ("what if" scenarios: can I afford this purchase/loan?)
- Reminders section (payment due dates, cut-off dates, subscriptions, custom)
- Dashboard with financial summary cards and Recharts visualizations
- Credit card statement management with editable payment due dates

---

## Tech Stack

- **Runtime**: Electron
- **Frontend**: React 18+ with TypeScript (strict mode)
- **Bundler**: Vite
- **Styling**: CSS nativo (custom properties, no frameworks)
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP**: fetch nativo (no axios, no libraries)
- **Local config DB**: better-sqlite3 (Electron main process only)
- **Backend**: AWS API Gateway + single Lambda (TypeScript, .mjs)
- **Remote DB**: PostgreSQL 15+ on AWS RDS
- **Currency**: MXN default, multi-currency ready (currencies table)

Do NOT introduce: Tailwind, styled-components, shadcn/ui, any ORM, any CSS framework, axios, any HTTP library, any state management library beyond React built-ins (useState, useReducer, useContext).

---

## Design System

Design tokens are implemented as CSS custom properties in `src/styles/variables.css`. Always reference these variables instead of hardcoding values.

### Color Palette

Define a dark theme by default. All colors must be declared as CSS custom properties:

- `--color-bg`: main background surface
- `--color-card`: card/container background
- `--color-primary`: primary action color (buttons, active nav)
- `--color-text`: primary text
- `--color-text-secondary`: labels, metadata, secondary text
- `--color-border`: borders, dividers
- `--color-success`: positive values, income, available credit
- `--color-warning`: low budget, approaching limits
- `--color-error`: negative balance, overdue, exceeded budget
- `--color-info`: informational highlights, MSI indicators

### Typography

- Font: System font stack or loaded custom font from `/fonts/`
- H1: 24px SemiBold | H2: 18px Medium | Body: 14-16px Regular | Meta/amounts: 12px Regular
- Financial amounts: tabular-nums font-feature for aligned digits

### Spacing and Layout

- Spacing scale: multiples of 8px (8, 16, 24, 32, 48, 64)
- Screen padding: 32px
- Card gap/gutter: 24px
- Sidebar width: 240-280px fixed

### Components

- Border radius: 12px
- Card border: 1px solid `--color-border`
- Card shadow: `0px 4px 6px -1px rgba(0, 0, 0, 0.05)`
- Primary button: bg `--color-primary`, white text, padding 12px 24px
- Secondary button: transparent bg, 1px border `--color-primary`, text `--color-primary`
- Input focus: 2px ring `--color-primary` at 20% opacity
- Icons: Lucide React, stroke 1.5-2px, 20x20px, color `--color-text-secondary`
- Financial amounts: right-aligned, monospace appearance, color-coded (green for positive, red for negative)

---

## Directory Layout

```
finance-app/
├── electron/
│   ├── main.ts                  # Electron main process
│   ├── preload.ts               # Typed bridge (contextBridge)
│   └── local-db.ts              # better-sqlite3: API key, endpoint, region
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Router + layout shell
│   ├── api/
│   │   ├── client.ts            # fetch wrapper (headers, API key, error handling)
│   │   └── endpoints.ts         # Endpoint path constants
│   ├── components/
│   │   ├── ui/                  # Generic: Button, Modal, Input, Card, Badge, Toast
│   │   ├── charts/              # Recharts wrappers (PieChart, BarChart, LineChart, AreaChart)
│   │   └── layout/              # Sidebar, Header, MainContent
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Banks.tsx
│   │   ├── Instruments.tsx
│   │   ├── Transactions.tsx
│   │   ├── CreditCards.tsx
│   │   ├── Loans.tsx
│   │   ├── Subscriptions.tsx
│   │   ├── FixedExpenses.tsx
│   │   ├── Categories.tsx
│   │   ├── Budgets.tsx
│   │   ├── Simulator.tsx
│   │   ├── Reminders.tsx
│   │   └── Settings.tsx
│   ├── hooks/                   # useFetch, useLocalConfig, useToast
│   ├── types/                   # Shared TypeScript interfaces
│   ├── utils/                   # formatCurrency, dateUtils, validators
│   └── styles/
│       ├── global.css            # Reset + base styles
│       ├── variables.css         # CSS custom properties (theme tokens)
│       └── pages/               # Page-specific CSS files
├── package.json
├── vite.config.ts
├── tsconfig.json
└── electron-builder.json
```

---

## Backend Layout (AWS Lambda)

```
lambda-backend/
├── src/
│   ├── handler.mjs              # Lambda entry point
│   ├── router.mjs               # Request routing by path + method
│   ├── db/
│   │   ├── connection.mjs       # PostgreSQL pool (pg)
│   │   └── queries/             # Parameterized queries per module
│   │       ├── banks.mjs
│   │       ├── instruments.mjs
│   │       ├── transactions.mjs
│   │       ├── loans.mjs
│   │       ├── subscriptions.mjs
│   │       ├── categories.mjs
│   │       ├── budgets.mjs
│   │       ├── simulations.mjs
│   │       ├── reminders.mjs
│   │       └── statements.mjs
│   ├── services/                # Business logic
│   │   ├── msi-calculator.mjs
│   │   ├── loan-amortization.mjs
│   │   ├── budget-analyzer.mjs
│   │   └── financial-summary.mjs
│   ├── middleware/
│   │   └── auth.mjs             # API key validation
│   └── types/                   # JSDoc type definitions
├── package.json
└── tsconfig.json
```

---

## Conventions

### Naming

| Thing | Convention | Example |
| --- | --- | --- |
| React components (file + name) | PascalCase | `TransactionForm.tsx` |
| Variables, functions, hooks | camelCase | `getInstruments`, `useFetch` |
| General folders | camelCase | `hooks/`, `utils/`, `types/` |
| Page component files | PascalCase | `Dashboard.tsx`, `CreditCards.tsx` |
| CSS files | Match page/component | `Dashboard.css`, `variables.css` |
| CSS classes | BEM | `dashboard__card--warning` |
| DB columns (PostgreSQL) | snake_case | `cut_off_day`, `msi_months` |
| DB tables (PostgreSQL) | snake_case plural | `financial_instruments`, `loan_payments` |
| TS interfaces/types | PascalCase | `Bank`, `Transaction`, `LoanPayment` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_CURRENCY`, `MSI_OPTIONS` |
| API endpoints | kebab-case | `/financial-instruments`, `/loan-payments` |
| Code language | English | All identifiers and comments |
| UI text | Spanish | User-facing labels and messages |

### Components

- Functional components only (hooks, no classes).
- Named exports (not default).
- One component per file unless tightly coupled small sub-components.
- Co-locate CSS file next to its component when page-specific.

### Styling

- CSS nativo with `.css` extension (NOT CSS Modules for this project).
- BEM naming convention for class names.
- Global tokens in `src/styles/variables.css` as CSS custom properties.
- No inline styles unless value is truly dynamic (e.g., chart dimensions).
- Dark theme by default.

### Error Handling

- try/catch around all fetch calls to the API.
- Always notify the user on error (toast or notification component). Never fail silently.
- Error Boundaries at route/page level.
- Console.error with context (operation name, endpoint, relevant data).
- API responses must follow a consistent shape: `{ success: boolean, data?: T, error?: string }`.

### Local Database (better-sqlite3)

- Only stores: API key, API endpoint URL, AWS region.
- Accessed exclusively from Electron main process.
- Exposed to renderer via typed preload bridge.
- No financial data stored locally.

### Remote Database (PostgreSQL)

- All financial data lives in PostgreSQL on AWS RDS.
- Schema: `app_gastos`.
- Always use parameterized queries (`$1, $2, ...`). Never concatenate user input.
- `NUMERIC(12,2)` for all monetary values.
- All tables have `created_at` and `updated_at` timestamps with `TIMESTAMPTZ`.
- Foreign keys enforced on all relationships.

### IPC (Electron)

- Typed IPC channels defined as constants in a shared file.
- Preload script exposes a typed API via `contextBridge`.
- Renderer never accesses Node.js, better-sqlite3, or filesystem directly.
- `contextIsolation: true` and `nodeIntegration: false` always.

### API Communication

- All HTTP calls go through `src/api/client.ts`.
- API key sent in `x-api-key` header on every request.
- Base URL and region read from local SQLite config.
- Consistent error handling: network errors, 4xx, 5xx all handled.
- No retry logic unless explicitly requested.

---

## Business Rules

### Currencies

- Default currency: MXN (Mexican Peso).
- `currencies` table supports future multi-currency expansion.
- All amounts displayed with 2 decimal places and `$` symbol.
- Use `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` for formatting.

### Financial Instruments

- Three types: `credit_card`, `debit_card`, `account`.
- Grouped by bank in the UI.
- Credit cards track: `credit_limit`, `current_balance`, `available_credit`, `cut_off_day` (fixed), `payment_due_day` (editable default), `annual_rate`.
- Debit cards and accounts track: `current_amount` (current balance).
- `available_credit = credit_limit - current_balance` (maintained by backend).

### Transactions

- Two types: `expense` and `income`.
- Every transaction is linked to a `financial_instrument` and optionally to a `category`/`subcategory`.
- Creating an expense on a credit card increases `current_balance` and decreases `available_credit`.
- Creating an expense on a debit card/account decreases `current_amount`.
- Income on a debit card/account increases `current_amount`.
- **Paying a credit card or moving money between accounts is a Transfer, not a Transaction.** See Transfers section.

### MSI (Meses Sin Intereses)

- Only applicable to credit card transactions.
- When `is_msi = true`: `msi_monthly_amount = ROUND(amount / msi_months, 2)`.
- `msi_start_date` is derived from the credit card's `cut_off_day`.
- `msi_remaining` tracks how many installments are left.
- MSI options: 3, 6, 9, 12, 18, 24 months.
- Each MSI installment appears in the corresponding credit card statement period.

### Transfers

- Transfers represent money movements between two financial instruments. They are NOT transactions.
- Types: `card_payment` (pay credit card from debit/account), `inter_account` (move between own accounts), `loan_payment` (pay loan installment from account), `other`.
- Creating a transfer updates both instrument balances atomically:
    - Source (debit/account): `current_amount -= amount`.
    - Destination (credit card): `current_balance -= amount`, `available_credit += amount`.
    - Destination (debit/account): `current_amount += amount`.
- Card payments are independent from purchases (MSI, contado, MCI). The user can make partial, total, or advance payments at any time.
- A transfer can optionally link to a `credit_card_statement` (via `statement_id`) or a `loan` (via `loan_id`).
- Deleting a transfer reverses the balance changes on both instruments.
- Source and destination instruments must be different (enforced by CHECK constraint).

### Credit Card Statements

- Linked to a `financial_instrument` (credit card only).
- `cut_off_date` is calculated from the card's `cut_off_day`.
- `payment_due_date` defaults from `payment_due_day` but user can override per statement.
- Tracks: `total_amount`, `minimum_payment`, `no_interest_payment`, payment status.

### Loans

- Two payment types: `fixed` (static monthly payment) and `variable` (calculated from annual rate).
- Fixed: `fixed_payment` field stores the monthly amount.
- Variable: monthly payment calculated using standard amortization formula with `annual_rate`.
- `fn_generate_loan_schedule()` generates the full payment schedule on loan creation.
- `loan_payments` tracks each installment with `principal`, `interest`, and `is_paid` status.
- `remaining_amount` updated when a payment is registered.

### Categories

- Three types: `expense`, `income`, `both`.
- `is_system = true` categories cannot be deleted (seed data).
- Custom categories can only be deleted if no transactions, subscriptions, or fixed expenses reference them (enforced by `fn_can_delete_category()`).
- Subcategories are unique within their parent category.

### Subscriptions

- Linked to a specific financial instrument (the card/account that gets charged).
- Billing cycles: `monthly`, `yearly`, `weekly`.
- `next_billing` tracks the next expected charge date.
- Used in dashboard projections and financial summaries.

### Fixed Expenses

- Recurring obligations: rent, electricity, water, gas, internet.
- `is_variable = true` for expenses that fluctuate (e.g., electricity).
- `estimated_amount` used for projections; actual `amount` recorded per period in `fixed_expense_payments`.
- Unique constraint on `(fixed_expense_id, period_month, period_year)`.

### Budgets

- Monthly budget per category.
- `category_id = NULL` represents a global monthly budget.
- Progress = sum of transactions in that category for that month vs budget amount.
- Visual indicators: green (under budget), yellow (near limit), red (exceeded).

### Simulations

- Snapshot the entire financial state at simulation time (stored as JSONB).
- Input: amount, type (direct purchase, MSI, loan with terms).
- Output: projected balances after the hypothetical transaction.
- `is_favorable`: true if no account goes negative and obligations can still be met.
- Simulations are saved for later review.

### Reminders

- Not push notifications (app is not always open).
- Displayed in a dedicated Reminders section with unread count badge.
- Types: `payment` (TDC due), `cutoff` (TDC cut-off), `subscription`, `loan`, `custom`.
- `reference_id` + `reference_type` link to the related entity.
- User can mark as read or dismiss.

### Dashboard

- Summary cards: total available (all debit/accounts), total credit debt, total loan debt, total available credit, net balance.
- Charts (Recharts):
    - Pie: expenses by category (current month)
    - Bar: monthly income vs expenses (last 6-12 months)
    - Line: balance evolution per account over time
    - Area: projected future expenses (subscriptions + fixed + loan payments)

---

## AI Assistant Rules

1. NO emojis in code, comments, or commit messages.
2. NO new libraries without asking first.
3. NO refactoring code that was not part of the request.
4. NO over-engineering. Keep solutions simple and direct.
5. Output COMPLETE files, not diffs or partial snippets.
6. Follow existing patterns in the codebase.
7. Do not add unrequested features.
8. Write useful comments only (explain WHY, not WHAT).
9. All financial calculations MUST happen on the backend (Lambda). The frontend is display-only.
10. Never store financial data in local SQLite. Local DB is for connection config only.
11. All monetary values use `NUMERIC(12,2)` in PostgreSQL and `number` in TypeScript. Never use floating point for money.
12. Always format currency with `Intl.NumberFormat` in the frontend.

---

## Security Principles

- **Always validate user input.** All data sent from the Electron app to the API must be validated in the Lambda handler before touching PostgreSQL. Do not trust client-side validation alone.
- **Parameterize all SQL queries.** Never concatenate values directly into SQL strings. Use `$1, $2, ...` placeholders with the pg library in every query without exception.
- **API key authentication.** The `x-api-key` header is validated by the Lambda middleware on every request. Invalid or missing keys return 401 immediately.
- **Restrict IPC channels.** Only expose strictly necessary methods in the Electron preload. Do not expose direct access to better-sqlite3, `fs`, `child_process`, or dangerous OS APIs.
- **Disable Node.js integration in the renderer.** Use `contextIsolation: true` and `nodeIntegration: false` in the BrowserWindow configuration. All communication must go through the preload.
- **Validate data on both sides.** Validate in the renderer (UX) and in the Lambda (real security). Renderer validation is cosmetic only; the backend validation is what actually protects.
- **Do not trust renderer content.** Treat IPC messages from the renderer as untrusted input. Validate types, ranges, and formats in every main process handler.
- **Content Security Policy (CSP).** Configure a strict CSP in the renderer HTML to prevent script injection. Do not use `unsafe-inline` or `unsafe-eval` unless absolutely necessary.
- **HTTPS only.** All communication between Electron and API Gateway goes over HTTPS. Never allow HTTP fallback.
- **Do not log sensitive data.** API keys, financial amounts with identifiable context, and endpoint URLs must not be logged to console in production builds.
- **Protect local config.** The better-sqlite3 database storing the API key should have restrictive file permissions. Consider encrypting the API key at rest.

---

## Post-Implementation Security Analysis

After every implementation (feature, fix, or significant change), a security analysis must be performed before the task can be considered done.

Mandatory checklist after every implementation:

- [ ]  **SQL Injection:** Verify that all new or modified queries use parameterized values (`$1, $2`). Look for string concatenations in SQL.
- [ ]  **Input validation:** Confirm that all user input is validated in the Lambda handler (types, ranges, max lengths, allowed characters).
- [ ]  **IPC channels:** Review that no unnecessary new channels were exposed in the Electron preload. Verify that handlers validate their arguments.
- [ ]  **Renderer permissions:** Confirm that `nodeIntegration` was not enabled, `contextIsolation` was not disabled, and `webSecurity: false` was not added.
- [ ]  **API key handling:** Verify the API key is not exposed in renderer code, console logs, or error messages.
- [ ]  **Financial data integrity:** Confirm that price, balance, credit, and loan calculations happen exclusively in the Lambda/PostgreSQL layer. No financial math in the renderer.
- [ ]  **Error handling:** Verify that error messages exposed to the user do not reveal internal structure (table names, SQL errors, stack traces, Lambda ARNs).
- [ ]  **Dependencies:** If any dependency was added or updated, verify it has no known vulnerabilities (`npm audit`).
- [ ]  **HTTPS enforcement:** Confirm all API calls use HTTPS. No HTTP endpoints.

---

## Security Rules for AI Assistants

1. **Never disable Electron protections.** Do not suggest or implement `nodeIntegration: true`, `contextIsolation: false`, or `webSecurity: false` under any circumstances.
2. **Never concatenate input in SQL.** If the proposed solution concatenates any value into a SQL string, the solution is incorrect. Period.
3. **Always validate in the Lambda.** If a Lambda handler receives data and passes it directly to PostgreSQL without validation, the solution is incorrect.
4. **Never expose the API key.** The API key must never appear in frontend source code, console logs, error messages, or network responses.
5. **All financial logic on the backend.** If a calculation involving money (balances, MSI splits, amortization, available credit) is performed in the renderer, the solution is incorrect.
6. **Report security risks.** If an insecure pattern is detected in existing code during an implementation, report it as a comment even if fixing it was not requested.
7. **Security analysis is mandatory.** After completing any implementation, include a brief security analysis at the end stating: what was reviewed, what risks were identified (if any), and confirming that the security checklist was followed.