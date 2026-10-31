import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense } from '../../types';

export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FinanceRepository {
  // Accounts
  getAccounts(userId: string): Promise<Account[]>;
  saveAccounts(userId: string, accounts: Account[]): Promise<RepositoryResult<Account[]>>;
  addAccount(userId: string, account: Account): Promise<RepositoryResult<Account>>;
  updateAccount(userId: string, accountId: string, updates: Partial<Account>): Promise<RepositoryResult<Account>>;
  deleteAccount(userId: string, accountId: string): Promise<RepositoryResult<void>>;

  // Transactions
  getTransactions(userId: string): Promise<Transaction[]>;
  saveTransactions(userId: string, transactions: Transaction[]): Promise<RepositoryResult<Transaction[]>>;
  addTransaction(userId: string, transaction: Transaction): Promise<RepositoryResult<Transaction>>;
  updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<RepositoryResult<Transaction>>;
  deleteTransaction(userId: string, transactionId: string): Promise<RepositoryResult<void>>;

  // Budgets
  getBudgets(userId: string): Promise<Budget[]>;
  saveBudgets(userId: string, budgets: Budget[]): Promise<RepositoryResult<Budget[]>>;
  addBudget(userId: string, budget: Budget): Promise<RepositoryResult<Budget>>;
  updateBudget(userId: string, budgetId: string, updates: Partial<Budget>): Promise<RepositoryResult<Budget>>;
  deleteBudget(userId: string, budgetId: string): Promise<RepositoryResult<void>>;

  // Savings Goals
  getGoals(userId: string): Promise<SavingsGoal[]>;
  saveGoals(userId: string, goals: SavingsGoal[]): Promise<RepositoryResult<SavingsGoal[]>>;
  addGoal(userId: string, goal: SavingsGoal): Promise<RepositoryResult<SavingsGoal>>;
  updateGoal(userId: string, goalId: string, updates: Partial<SavingsGoal>): Promise<RepositoryResult<SavingsGoal>>;
  deleteGoal(userId: string, goalId: string): Promise<RepositoryResult<void>>;

  // Investments / Holdings
  getHoldings(userId: string): Promise<Holding[]>;
  saveHoldings(userId: string, holdings: Holding[]): Promise<RepositoryResult<Holding[]>>;
  addHolding(userId: string, holding: Holding): Promise<RepositoryResult<Holding>>;
  updateHolding(userId: string, holdingId: string, updates: Partial<Holding>): Promise<RepositoryResult<Holding>>;
  deleteHolding(userId: string, holdingId: string): Promise<RepositoryResult<void>>;

  // Split Expenses
  getSplitExpenses(userId: string): Promise<SplitExpense[]>;
  saveSplitExpenses(userId: string, expenses: SplitExpense[]): Promise<RepositoryResult<SplitExpense[]>>;
  addSplitExpense(userId: string, expense: SplitExpense): Promise<RepositoryResult<SplitExpense>>;
  updateSplitExpense(userId: string, expenseId: string, updates: Partial<SplitExpense>): Promise<RepositoryResult<SplitExpense>>;
  deleteSplitExpense(userId: string, expenseId: string): Promise<RepositoryResult<void>>;

  // Batch operations
  clearUserData(userId: string): Promise<RepositoryResult<void>>;
}
