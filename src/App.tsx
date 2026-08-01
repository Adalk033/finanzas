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
const TransfersSection = lazy(() => import('./components/sections/TransfersSection').then((module) => ({ default: module.TransfersSection })))
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
    databaseController,
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
    recurringIncomesController,
    savingsGoalsController,
  } = useAppControllers()

  if (databaseController.isLoading) {
    return (
      <main className="settings-screen settings-screen--centered">
        <p className="settings-screen__status">Abriendo base de datos local...</p>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <AppSidebar
        activeSection={activeSection}
        pendingRemindersCount={remindersController.pendingRemindersCount}
        databaseStatus={databaseController.status}
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
              dashboardExpensePeriod={dashboardController.dashboardExpensePeriod}
              dashboardCashFlow={dashboardController.dashboardCashFlow}
              dashboardBalanceEvolution={dashboardController.dashboardBalanceEvolution}
              dashboardFutureExpenses={dashboardController.dashboardFutureExpenses}
              dashboardUpcomingCommitments={dashboardController.dashboardUpcomingCommitments}
              onReload={() => {
                void dashboardController.loadDashboard()
              }}
              onDashboardExpensePeriodChange={dashboardController.setDashboardExpensePeriod}
            />
          ) : null}

          {activeSection === 'settings' ? (
            <SettingsSection
              info={databaseController.info}
              isLoading={databaseController.isLoading}
              error={databaseController.error}
              onRefresh={() => {
                void databaseController.refreshInfo()
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
                if (window.confirm('¿Archivar este banco y sus instrumentos?')) {
                  void banksController.handleBankDelete(bankId)
                }
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
                if (window.confirm('¿Archivar este instrumento? Sus movimientos se conservaran.')) {
                  void instrumentsController.handleInstrumentDelete(instrumentId, banksController.banks)
                }
              }}
              onReconcile={(instrumentId, payload) => {
                return instrumentsController.handleInstrumentReconcile(instrumentId, payload)
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
                if (window.confirm('¿Archivar esta categoria?')) {
                  void categoriesController.handleCategoryDelete(categoryId)
                }
              }}
              onEditSubcategory={categoriesController.startSubcategoryEdit}
              onDeleteSubcategory={(subcategoryId) => {
                if (window.confirm('¿Archivar esta subcategoria?')) {
                  void categoriesController.handleSubcategoryDelete(subcategoryId)
                }
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
              excludeFromBalance={transactionsController.excludeFromBalance}
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
                if (window.confirm('¿Eliminar este movimiento y revertir su impacto en el saldo?')) {
                  void transactionsController.handleTransactionDelete(transactionId)
                }
              }}
              onResetTransactionForm={transactionsController.resetTransactionForm}
              onFiltersChange={transactionsController.setTransactionFilters}
              onExcludeFromBalanceChange={transactionsController.setExcludeFromBalance}
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
              creditCardInstruments={creditCardsController.creditCardInstruments}
              sourceTransferInstruments={creditCardsController.sourceTransferInstruments}
              selectedCardId={creditCardsController.selectedCardId}
              selectedCard={creditCardsController.selectedCard}
              currentStatement={creditCardsController.currentStatement}
              selectedCardStatements={creditCardsController.selectedCardStatements}
              selectedCardPayments={creditCardsController.selectedCardPayments}
              cardMovements={creditCardsController.cardMovements}
              activeMsiPurchases={creditCardsController.activeMsiPurchases}
              purchaseForm={creditCardsController.purchaseForm}
              purchaseCategoryOptions={creditCardsController.purchaseCategoryOptions}
              purchaseSubcategoryOptions={creditCardsController.purchaseSubcategoryOptions}
              cardPaymentForm={creditCardsController.cardPaymentForm}
              selectedPaymentSourceId={creditCardsController.selectedPaymentSourceId}
              statementUpdateForm={creditCardsController.statementUpdateForm}
              editingStatementId={creditCardsController.editingStatementId}
              selectedStatementDetail={creditCardsController.selectedStatementDetail}
              statementMovements={creditCardsController.statementMovements}
              isStatementsLoading={creditCardsController.isStatementsLoading}
              isCardMovementsLoading={creditCardsController.isCardMovementsLoading}
              isStatementMovementsLoading={creditCardsController.isStatementMovementsLoading}
              actionError={creditCardsController.actionError}
              actionMessage={creditCardsController.actionMessage}
              statementError={creditCardsController.statementError}
              statementMessage={creditCardsController.statementMessage}
              onSelectCard={creditCardsController.selectCard}
              onPurchaseFormChange={creditCardsController.setPurchaseForm}
              onPurchaseSubmit={creditCardsController.handlePurchaseSubmit}
              onResetPurchase={creditCardsController.resetPurchaseForm}
              onPaymentFormChange={creditCardsController.setCardPaymentForm}
              onSetPaymentAmount={creditCardsController.setPaymentAmount}
              onPaymentSubmit={creditCardsController.handleCardPaymentSubmit}
              onResetPayment={creditCardsController.resetCardPaymentForm}
              onStatementUpdateFormChange={creditCardsController.setStatementUpdateForm}
              onLoadStatementMovements={(statement) => {
                void creditCardsController.loadStatementMovements(statement)
              }}
              onStartStatementEdit={creditCardsController.startStatementEdit}
              onSaveStatementUpdate={() => {
                void creditCardsController.handleStatementUpdate()
              }}
              onCancelStatementUpdate={creditCardsController.resetStatementUpdateForm}
              onReload={() => {
                void Promise.all([
                  creditCardsController.loadStatements(),
                  creditCardsController.loadTransfers(),
                  creditCardsController.loadCardMovements(),
                ])
              }}
              onDeletePayment={(transferId) => {
                if (window.confirm('¿Eliminar este pago y restaurar los saldos y estados de cuenta?')) {
                  void creditCardsController.handleTransferDelete(transferId)
                }
              }}
            />
          ) : null}

          {activeSection === 'transfers' ? (
            <TransfersSection
              hasConfig={hasConfig}
              sourceInstruments={creditCardsController.sourceTransferInstruments}
              destinationInstruments={creditCardsController.availableTransferDestinations}
              transfers={creditCardsController.transfers}
              transferForm={creditCardsController.transferForm}
              selectedSourceInstrumentId={creditCardsController.selectedTransferSourceInstrumentId}
              selectedDestinationInstrumentId={creditCardsController.selectedTransferDestinationInstrumentId}
              editingTransferId={creditCardsController.editingTransferId}
              isLoading={creditCardsController.isTransfersLoading}
              message={creditCardsController.transferMessage}
              error={creditCardsController.transferError}
              onFormChange={creditCardsController.setTransferForm}
              onTypeChange={creditCardsController.handleTransferTypeChange}
              onSubmit={creditCardsController.handleTransferSubmit}
              onReset={creditCardsController.resetTransferForm}
              onReload={() => {
                void creditCardsController.loadTransfers()
              }}
              onEdit={creditCardsController.startTransferEdit}
              onDelete={(transferId) => {
                if (window.confirm('¿Eliminar esta transferencia y revertir ambos saldos?')) {
                  void creditCardsController.handleTransferDelete(transferId)
                }
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
                if (window.confirm('¿Archivar esta suscripcion?')) {
                  void subscriptionsController.handleSubscriptionDelete(subscriptionId)
                }
              }}
              recurringIncomes={recurringIncomesController.recurringIncomes}
              recurringIncomeForm={recurringIncomesController.recurringIncomeForm}
              editingRecurringIncomeId={recurringIncomesController.editingRecurringIncomeId}
              recurringIncomeMessage={recurringIncomesController.recurringIncomeMessage}
              recurringIncomeError={recurringIncomesController.recurringIncomeError}
              incomeInstruments={recurringIncomesController.incomeInstruments}
              incomeCategories={recurringIncomesController.incomeCategories}
              onRecurringIncomeFormChange={recurringIncomesController.setRecurringIncomeForm}
              onRecurringIncomeSubmit={recurringIncomesController.handleRecurringIncomeSubmit}
              onRecurringIncomeReset={recurringIncomesController.resetRecurringIncomeForm}
              onRecurringIncomeEdit={recurringIncomesController.startRecurringIncomeEdit}
              onRecurringIncomeDelete={(id) => {
                if (window.confirm('¿Archivar este ingreso recurrente?')) {
                  void recurringIncomesController.handleRecurringIncomeDelete(id)
                }
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
                if (window.confirm('¿Archivar este gasto fijo?')) {
                  void fixedExpensesController.handleFixedExpenseDelete(fixedExpenseId)
                }
              }}
              onDeleteFixedExpensePayment={(paymentId) => {
                if (window.confirm('¿Eliminar este pago y revertir su movimiento asociado?')) {
                  void fixedExpensesController.handleFixedExpensePaymentDelete(paymentId)
                }
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
                if (window.confirm('¿Archivar este prestamo?')) {
                  void loansController.handleLoanDelete(loanId)
                }
              }}
              onPayInstallment={(installmentNum) => {
                void loansController.handlePayInstallment(installmentNum)
              }}
              onUndoInstallment={(installmentNum) => {
                if (window.confirm('¿Revertir este pago y restaurar el saldo de la cuenta?')) {
                  void loansController.handleUndoInstallment(installmentNum)
                }
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
                if (window.confirm('¿Eliminar este presupuesto?')) {
                  void budgetsController.handleBudgetDelete(budgetId)
                }
              }}
              savingsGoals={savingsGoalsController.savingsGoals}
              savingsGoalForm={savingsGoalsController.savingsGoalForm}
              editingSavingsGoalId={savingsGoalsController.editingSavingsGoalId}
              savingsGoalMessage={savingsGoalsController.savingsGoalMessage}
              savingsGoalError={savingsGoalsController.savingsGoalError}
              goalInstruments={savingsGoalsController.goalInstruments}
              onSavingsGoalFormChange={savingsGoalsController.setSavingsGoalForm}
              onSavingsGoalSubmit={savingsGoalsController.handleSavingsGoalSubmit}
              onSavingsGoalReset={savingsGoalsController.resetSavingsGoalForm}
              onSavingsGoalEdit={savingsGoalsController.startSavingsGoalEdit}
              onSavingsGoalDelete={(id) => {
                if (window.confirm('¿Archivar esta meta de ahorro?')) {
                  void savingsGoalsController.handleSavingsGoalDelete(id)
                }
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
                if (window.confirm('¿Eliminar esta simulacion?')) {
                  void simulatorController.handleSimulationDelete(simulationId)
                }
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
              onDismissAll={() => {
                if (window.confirm('¿Descartar todos los recordatorios activos?')) {
                  void remindersController.handleDismissAllReminders()
                }
              }}
              onDeletePending={() => {
                if (window.confirm('¿Vaciar todos los recordatorios pendientes? Los automáticos se descartarán para que no se generen de nuevo.')) {
                  void remindersController.handleDeletePendingReminders()
                }
              }}
              onDeleteDismissed={() => {
                if (window.confirm('¿Eliminar todos los recordatorios descartados? Esta acción no se puede deshacer.')) {
                  void remindersController.handleDeleteDismissedReminders()
                }
              }}
              onDelete={(reminderId) => {
                if (window.confirm('¿Eliminar este recordatorio?')) {
                  void remindersController.handleReminderDelete(reminderId)
                }
              }}
            />
          ) : null}
        </Suspense>
      </section>
    </main>
  )
}
