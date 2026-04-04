import { Suspense, lazy } from 'react'
import './App.css'
import { AppSidebar } from './components/AppSidebar'
import { Loader } from './components/Loader'
import { useAppControllers } from './hooks/useAppControllers'

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
const RemindersSection = lazy(() => import('./components/sections/RemindersSection').then((module) => ({ default: module.RemindersSection })) )

export function App() {
  const {
    hasConfig,
    activeSection,
    handleSectionChange,
    isSectionLoading,
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
  } = useAppControllers()

  if (configController.isLoading) {
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
        pendingRemindersCount={remindersController.pendingRemindersCount}
        cloudConnectionStatus={settingsPingController.cloudConnectionStatus}
        onSectionChange={handleSectionChange}
      />

      <section className="app-shell__content">
        {isSectionLoading && <Loader />}
        <Suspense
          fallback={<Loader />}
        >
          {activeSection === 'dashboard' ? (
            <DashboardSection
              hasConfig={hasConfig}
              isDashboardLoading={dashboardController.isDashboardLoading}
              dashboardError={dashboardController.dashboardError}
              dashboardSummary={dashboardController.dashboardSummary}
              dashboardExpensesByCategory={dashboardController.dashboardExpensesByCategory}
              dashboardCashFlow={dashboardController.dashboardCashFlow}
              dashboardBalanceEvolution={dashboardController.dashboardBalanceEvolution}
              dashboardFutureExpenses={dashboardController.dashboardFutureExpenses}
              onReload={() => {
                void dashboardController.loadDashboard()
              }}
            />
          ) : null}

          {activeSection === 'settings' ? (
            <SettingsSection
              config={configController.config}
              hasElectronBridge={configController.hasElectronBridge}
              isSaving={configController.isSaving}
              isPinging={settingsPingController.isPinging}
              error={configController.error}
              successMessage={configController.successMessage}
              pingError={settingsPingController.pingError}
              pingResponse={settingsPingController.pingResponse}
              onConfigChange={configController.setConfig}
              onSave={(event) => {
                event.preventDefault()
                void handleSave()
              }}
              onPing={() => {
                void settingsPingController.handlePing()
              }}
            />
          ) : null}

          {activeSection === 'banks' ? (
            <BanksSection
              hasConfig={hasConfig}
              editingBankId={banksController.editingBankId}
              bankForm={banksController.bankForm}
              isBanksLoading={banksController.isBanksLoading}
              banks={banksController.banks}
              bankError={banksController.bankError}
              bankMessage={banksController.bankMessage}
              onBankFormChange={banksController.setBankForm}
              onSubmit={banksController.handleBankSubmit}
              onReset={banksController.resetBankEditor}
              onReload={() => {
                void banksController.loadBanks()
              }}
              onEdit={banksController.startBankEdit}
              onDelete={(bankId) => {
                void banksController.handleBankDelete(bankId)
              }}
            />
          ) : null}

          {activeSection === 'instruments' ? (
            <InstrumentsSection
              hasConfig={hasConfig}
              editingInstrumentId={instrumentsController.editingInstrumentId}
              instrumentForm={instrumentsController.instrumentForm}
              selectedBankId={instrumentsController.selectedBankId}
              banks={banksController.banks}
              isInstrumentsLoading={instrumentsController.isInstrumentsLoading}
              groupedInstruments={selectors.groupedInstruments}
              instrumentError={instrumentsController.instrumentError}
              instrumentMessage={instrumentsController.instrumentMessage}
              onInstrumentFormChange={instrumentsController.setInstrumentForm}
              onTypeChange={instrumentsController.handleInstrumentTypeChange}
              onSubmit={(event) => {
                void instrumentsController.handleInstrumentSubmit(event, banksController.banks)
              }}
              onReset={() => {
                instrumentsController.resetInstrumentEditor(banksController.banks)
              }}
              onReload={() => {
                void instrumentsController.loadInstruments()
              }}
              onEdit={instrumentsController.startInstrumentEdit}
              onDelete={(instrumentId) => {
                void instrumentsController.handleInstrumentDelete(instrumentId, banksController.banks)
              }}
            />
          ) : null}

          {activeSection === 'categories' ? (
            <CategoriesSection
              hasConfig={hasConfig}
              categories={categoriesController.categories}
              isCategoriesLoading={categoriesController.isCategoriesLoading}
              categoryForm={categoriesController.categoryForm}
              subcategoryForm={categoriesController.subcategoryForm}
              categoryOptions={categoriesController.categoryOptions}
              selectedSubcategoryCategoryId={categoriesController.selectedSubcategoryCategoryId}
              editingCategoryId={categoriesController.editingCategoryId}
              editingSubcategoryId={categoriesController.editingSubcategoryId}
              categoryError={categoriesController.categoryError}
              categoryMessage={categoriesController.categoryMessage}
              subcategoryError={categoriesController.subcategoryError}
              subcategoryMessage={categoriesController.subcategoryMessage}
              onCategoryFormChange={categoriesController.setCategoryForm}
              onSubcategoryFormChange={categoriesController.setSubcategoryForm}
              onCategorySubmit={categoriesController.handleCategorySubmit}
              onSubcategorySubmit={categoriesController.handleSubcategorySubmit}
              onCategoryReset={categoriesController.resetCategoryEditor}
              onSubcategoryReset={categoriesController.resetSubcategoryEditor}
              onReload={() => {
                void categoriesController.loadCategories()
              }}
              onEditCategory={categoriesController.startCategoryEdit}
              onDeleteCategory={(categoryId) => {
                void categoriesController.handleCategoryDelete(categoryId)
              }}
              onEditSubcategory={categoriesController.startSubcategoryEdit}
              onDeleteSubcategory={(subcategoryId) => {
                void categoriesController.handleSubcategoryDelete(subcategoryId)
              }}
            />
          ) : null}

          {activeSection === 'transactions' ? (
            <TransactionsSection
              hasConfig={hasConfig}
              instruments={instrumentsController.instruments}
              categories={categoriesController.categories}
              transactionForm={transactionsController.transactionForm}
              editingTransactionId={transactionsController.editingTransactionId}
              selectedTransactionInstrumentId={transactionsController.selectedTransactionInstrumentId}
              selectedTransactionCategoryId={transactionsController.selectedTransactionCategoryId}
              selectedTransactionInstrument={transactionsController.selectedTransactionInstrument}
              transactionSubcategoryOptions={transactionsController.transactionSubcategoryOptions}
              transactionFilters={transactionsController.transactionFilters}
              showAutoAdjustmentsOnly={transactionsController.showAutoAdjustmentsOnly}
              autoAdjustmentCount={transactionsController.autoAdjustmentCount}
              transactions={transactionsController.transactions}
              activeMsiTransactions={transactionsController.activeMsiTransactions}
              isTransactionsLoading={transactionsController.isTransactionsLoading}
              transactionError={transactionsController.transactionError}
              transactionMessage={transactionsController.transactionMessage}
              onTransactionFormChange={transactionsController.setTransactionForm}
              onTransactionTypeChange={transactionsController.handleTransactionTypeChange}
              onTransactionSubmit={transactionsController.handleTransactionSubmit}
              onTransactionEdit={transactionsController.startTransactionEdit}
              onTransactionDelete={(transactionId) => {
                void transactionsController.handleTransactionDelete(transactionId)
              }}
              onResetTransactionForm={transactionsController.resetTransactionForm}
              onFiltersChange={transactionsController.setTransactionFilters}
              onToggleAutoAdjustmentsOnly={transactionsController.setShowAutoAdjustmentsOnly}
              onFiltersSubmit={transactionsController.handleTransactionFiltersSubmit}
              onClearFilters={() => {
                void transactionsController.clearTransactionFilters()
              }}
              onReload={() => {
                void transactionsController.loadTransactions()
              }}
            />
          ) : null}

          {activeSection === 'creditCards' ? (
            <CreditCardsSection
              hasConfig={hasConfig}
              totalCreditCardDebt={creditCardsController.totalCreditCardDebt}
              totalAvailableCredit={creditCardsController.totalAvailableCredit}
              creditCardInstruments={creditCardsController.creditCardInstruments}
              sourceTransferInstruments={creditCardsController.sourceTransferInstruments}
              availableTransferDestinations={creditCardsController.availableTransferDestinations}
              selectedStatementInstrumentId={creditCardsController.selectedStatementInstrumentId}
              selectedTransferSourceInstrumentId={creditCardsController.selectedTransferSourceInstrumentId}
              selectedTransferDestinationInstrumentId={creditCardsController.selectedTransferDestinationInstrumentId}
              selectedTransferStatementId={creditCardsController.selectedTransferStatementId}
              statementForm={creditCardsController.statementForm}
              transferForm={creditCardsController.transferForm}
              statements={creditCardsController.statements}
              transfers={creditCardsController.transfers}
              statementUpdateForm={creditCardsController.statementUpdateForm}
              editingStatementId={creditCardsController.editingStatementId}
              editingTransferId={creditCardsController.editingTransferId}
              selectedStatementDetail={creditCardsController.selectedStatementDetail}
              statementMovements={creditCardsController.statementMovements}
              isStatementsLoading={creditCardsController.isStatementsLoading}
              isTransfersLoading={creditCardsController.isTransfersLoading}
              isStatementMovementsLoading={creditCardsController.isStatementMovementsLoading}
              statementError={creditCardsController.statementError}
              statementMessage={creditCardsController.statementMessage}
              transferError={creditCardsController.transferError}
              transferMessage={creditCardsController.transferMessage}
              onStatementFormChange={creditCardsController.setStatementForm}
              onTransferFormChange={creditCardsController.setTransferForm}
              onStatementUpdateFormChange={creditCardsController.setStatementUpdateForm}
              onTransferTypeChange={creditCardsController.handleTransferTypeChange}
              onStartTransferEdit={creditCardsController.startTransferEdit}
              onStatementSubmit={creditCardsController.handleStatementSubmit}
              onTransferSubmit={creditCardsController.handleTransferSubmit}
              onResetStatementForm={creditCardsController.resetStatementForm}
              onResetTransferForm={creditCardsController.resetTransferForm}
              onReloadStatements={() => {
                void creditCardsController.loadStatements()
              }}
              onReloadTransfers={() => {
                void creditCardsController.loadTransfers()
              }}
              onLoadStatementMovements={(statement) => {
                void creditCardsController.loadStatementMovements(statement)
              }}
              onStartStatementEdit={creditCardsController.startStatementEdit}
              onDeleteStatement={(statementId) => {
                void creditCardsController.handleStatementDelete(statementId)
              }}
              onSaveStatementUpdate={() => {
                void creditCardsController.handleStatementUpdate()
              }}
              onCancelStatementUpdate={creditCardsController.resetStatementUpdateForm}
              onDeleteTransfer={(transferId) => {
                void creditCardsController.handleTransferDelete(transferId)
              }}
            />
          ) : null}

          {activeSection === 'subscriptions' ? (
            <SubscriptionsSection
              hasConfig={hasConfig}
              instruments={instrumentsController.instruments}
              expenseCategoryOptions={selectors.expenseCategoryOptions}
              selectedSubscriptionCategory={subscriptionsController.selectedSubscriptionCategory}
              subscriptions={subscriptionsController.subscriptions}
              isSubscriptionsLoading={subscriptionsController.isSubscriptionsLoading}
              subscriptionForm={subscriptionsController.subscriptionForm}
              editingSubscriptionId={subscriptionsController.editingSubscriptionId}
              subscriptionError={subscriptionsController.subscriptionError}
              subscriptionMessage={subscriptionsController.subscriptionMessage}
              onSubscriptionFormChange={subscriptionsController.setSubscriptionForm}
              onBillingCycleChange={subscriptionsController.handleSubscriptionBillingCycleChange}
              onSubmit={subscriptionsController.handleSubscriptionSubmit}
              onReset={subscriptionsController.resetSubscriptionEditor}
              onReload={() => {
                void subscriptionsController.loadSubscriptions()
              }}
              onEdit={subscriptionsController.startSubscriptionEdit}
              onDelete={(subscriptionId) => {
                void subscriptionsController.handleSubscriptionDelete(subscriptionId)
              }}
            />
          ) : null}

          {activeSection === 'fixedExpenses' ? (
            <FixedExpensesSection
              hasConfig={hasConfig}
              instruments={instrumentsController.instruments}
              expenseCategoryOptions={selectors.expenseCategoryOptions}
              selectedFixedExpenseCategory={fixedExpensesController.selectedFixedExpenseCategory}
              fixedExpenses={fixedExpensesController.fixedExpenses}
              fixedExpenseForm={fixedExpensesController.fixedExpenseForm}
              editingFixedExpenseId={fixedExpensesController.editingFixedExpenseId}
              fixedExpensePayments={fixedExpensesController.fixedExpensePayments}
              selectedFixedExpenseId={fixedExpensesController.selectedFixedExpenseId}
              selectedFixedExpense={fixedExpensesController.selectedFixedExpense}
              fixedExpensePaymentForm={fixedExpensesController.fixedExpensePaymentForm}
              isFixedExpensesLoading={fixedExpensesController.isFixedExpensesLoading}
              isFixedExpensePaymentsLoading={fixedExpensesController.isFixedExpensePaymentsLoading}
              fixedExpenseError={fixedExpensesController.fixedExpenseError}
              fixedExpenseMessage={fixedExpensesController.fixedExpenseMessage}
              onFixedExpenseFormChange={fixedExpensesController.setFixedExpenseForm}
              onFixedExpensePaymentFormChange={fixedExpensesController.setFixedExpensePaymentForm}
              onFixedExpenseSubmit={fixedExpensesController.handleFixedExpenseSubmit}
              onFixedExpensePaymentSubmit={fixedExpensesController.handleFixedExpensePaymentSubmit}
              onResetFixedExpenseEditor={fixedExpensesController.resetFixedExpenseEditor}
              onResetFixedExpensePaymentForm={fixedExpensesController.resetFixedExpensePaymentForm}
              onReloadFixedExpenses={() => {
                void fixedExpensesController.loadFixedExpenses()
              }}
              onSelectFixedExpense={fixedExpensesController.selectFixedExpense}
              onEditFixedExpense={fixedExpensesController.startFixedExpenseEdit}
              onLoadFixedExpensePayments={(fixedExpenseId) => {
                void fixedExpensesController.loadFixedExpensePayments(fixedExpenseId)
              }}
              onDeleteFixedExpense={(fixedExpenseId) => {
                void fixedExpensesController.handleFixedExpenseDelete(fixedExpenseId)
              }}
              onDeleteFixedExpensePayment={(paymentId) => {
                void fixedExpensesController.handleFixedExpensePaymentDelete(paymentId)
              }}
            />
          ) : null}

          {activeSection === 'loans' ? (
            <LoansSection
              hasConfig={hasConfig}
              loanForm={loansController.loanForm}
              loans={loansController.loans}
              selectedLoan={loansController.selectedLoan}
              loanPayments={loansController.loanPayments}
              loanPaymentRegister={loansController.loanPaymentRegister}
              loanPaymentInstruments={loansController.loanPaymentInstruments}
              editingLoanId={loansController.editingLoanId}
              isLoansLoading={loansController.isLoansLoading}
              isLoanPaymentsLoading={loansController.isLoanPaymentsLoading}
              loanError={loansController.loanError}
              loanMessage={loansController.loanMessage}
              onLoanFormChange={loansController.setLoanForm}
              onLoanPaymentRegisterChange={loansController.setLoanPaymentRegister}
              onLoanPaymentTypeChange={loansController.handleLoanPaymentTypeChange}
              onSubmit={loansController.handleLoanSubmit}
              onReset={loansController.resetLoanEditor}
              onReload={() => {
                void loansController.loadLoans()
              }}
              onLoadLoanPayments={(loanId) => {
                void loansController.loadLoanPayments(loanId)
              }}
              onEditLoan={loansController.startLoanEdit}
              onDeleteLoan={(loanId) => {
                void loansController.handleLoanDelete(loanId)
              }}
              onPayInstallment={(installmentNum) => {
                void loansController.handlePayInstallment(installmentNum)
              }}
            />
          ) : null}

          {activeSection === 'budgets' ? (
            <BudgetsSection
              hasConfig={hasConfig}
              expenseCategoryOptions={selectors.expenseCategoryOptions}
              budgetMessage={budgetsController.budgetMessage}
              budgetError={budgetsController.budgetError}
              editingBudgetId={budgetsController.editingBudgetId}
              budgetForm={budgetsController.budgetForm}
              isBudgetsLoading={budgetsController.isBudgetsLoading}
              budgetFilterMonth={budgetsController.budgetFilterMonth}
              budgetFilterYear={budgetsController.budgetFilterYear}
              budgets={budgetsController.budgets}
              onBudgetFormChange={budgetsController.setBudgetForm}
              onBudgetFilterMonthChange={budgetsController.setBudgetFilterMonth}
              onBudgetFilterYearChange={budgetsController.setBudgetFilterYear}
              onSubmit={budgetsController.handleBudgetSubmit}
              onReset={budgetsController.resetBudgetEditor}
              onApplyFilter={() => {
                void budgetsController.loadBudgets(budgetsController.budgetFilterMonth, budgetsController.budgetFilterYear)
              }}
              onEditBudget={budgetsController.startBudgetEdit}
              onDeleteBudget={(budgetId) => {
                void budgetsController.handleBudgetDelete(budgetId)
              }}
            />
          ) : null}

          {activeSection === 'simulator' ? (
            <SimulatorSection
              hasConfig={hasConfig}
              simulationMessage={simulatorController.simulationMessage}
              simulationError={simulatorController.simulationError}
              simulationForm={simulatorController.simulationForm}
              simulationInstrumentOptions={simulatorController.simulationInstrumentOptions}
              simulations={simulatorController.simulations}
              isSimulationsLoading={simulatorController.isSimulationsLoading}
              onSimulationFormChange={simulatorController.setSimulationForm}
              onScenarioTypeChange={simulatorController.handleSimulationScenarioTypeChange}
              onSubmit={simulatorController.handleSimulationSubmit}
              onReset={simulatorController.resetSimulationForm}
              onReload={() => {
                void simulatorController.loadSimulations()
              }}
              onDelete={(simulationId) => {
                void simulatorController.handleSimulationDelete(simulationId)
              }}
            />
          ) : null}

          {activeSection === 'reminders' ? (
            <RemindersSection
              hasConfig={hasConfig}
              reminderMessage={remindersController.reminderMessage}
              reminderError={remindersController.reminderError}
              editingReminderId={remindersController.editingReminderId}
              reminderForm={remindersController.reminderForm}
              reminders={remindersController.reminders}
              isRemindersLoading={remindersController.isRemindersLoading}
              pendingRemindersCount={remindersController.pendingRemindersCount}
              onReminderFormChange={remindersController.setReminderForm}
              onSubmit={remindersController.handleReminderSubmit}
              onReset={remindersController.resetReminderEditor}
              onReload={() => {
                void remindersController.loadReminders()
              }}
              onEdit={remindersController.startReminderEdit}
              onMarkAsRead={(reminder) => {
                void remindersController.handleReminderMarkAsRead(reminder)
              }}
              onDismiss={(reminder) => {
                void remindersController.handleReminderDismiss(reminder)
              }}
              onDelete={(reminderId) => {
                void remindersController.handleReminderDelete(reminderId)
              }}
            />
          ) : null}
        </Suspense>
      </section>
    </main>
  )
}
