import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense } from '../../types';
import { FinanceRepository, RepositoryResult } from './FinanceRepository';

export class LocalStorageRepository implements FinanceRepository {
  private getKey(prefix: string, userId: string): string {
    return `finn_${prefix}_${userId}`;
  }

  private loadData<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(`LocalStorageRepository: Failed to parse ${key}`, e);
    }
    return fallback;
  }

  private saveData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`LocalStorageRepository: Failed to save ${key}`, e);
      throw e;
    }
  }

  // --- ACCOUNTS ---
  async getAccounts(userId: string): Promise<Account[]> {
    return this.loadData<Account[]>(this.getKey('accounts', userId), []);
  }

  async saveAccounts(userId: string, accounts: Account[]): Promise<RepositoryResult<Account[]>> {
    try {
      this.saveData(this.getKey('accounts', userId), accounts);
      return { success: true, data: accounts };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save accounts' };
    }
  }

  async addAccount(userId: string, account: Account): Promise<RepositoryResult<Account>> {
    const list = await this.getAccounts(userId);
    const updated = [...list, account];
    const res = await this.saveAccounts(userId, updated);
    return res.success ? { success: true, data: account } : { success: false, error: res.error };
  }

  async updateAccount(userId: string, accountId: string, updates: Partial<Account>): Promise<RepositoryResult<Account>> {
    const list = await this.getAccounts(userId);
    const idx = list.findIndex(a => a.id === accountId);
    if (idx === -1) return { success: false, error: 'Account not found' };
    const updatedAccount = { ...list[idx], ...updates };
    list[idx] = updatedAccount;
    const res = await this.saveAccounts(userId, list);
    return res.success ? { success: true, data: updatedAccount } : { success: false, error: res.error };
  }

  async deleteAccount(userId: string, accountId: string): Promise<RepositoryResult<void>> {
    const list = await this.getAccounts(userId);
    const filtered = list.filter(a => a.id !== accountId);
    const res = await this.saveAccounts(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- TRANSACTIONS ---
  async getTransactions(userId: string): Promise<Transaction[]> {
    return this.loadData<Transaction[]>(this.getKey('transactions', userId), []);
  }

  async saveTransactions(userId: string, transactions: Transaction[]): Promise<RepositoryResult<Transaction[]>> {
    try {
      this.saveData(this.getKey('transactions', userId), transactions);
      return { success: true, data: transactions };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save transactions' };
    }
  }

  async addTransaction(userId: string, transaction: Transaction): Promise<RepositoryResult<Transaction>> {
    const list = await this.getTransactions(userId);
    const updated = [transaction, ...list];
    const res = await this.saveTransactions(userId, updated);
    return res.success ? { success: true, data: transaction } : { success: false, error: res.error };
  }

  async updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<RepositoryResult<Transaction>> {
    const list = await this.getTransactions(userId);
    const idx = list.findIndex(t => t.id === transactionId);
    if (idx === -1) return { success: false, error: 'Transaction not found' };
    const updatedTx = { ...list[idx], ...updates };
    list[idx] = updatedTx;
    const res = await this.saveTransactions(userId, list);
    return res.success ? { success: true, data: updatedTx } : { success: false, error: res.error };
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<RepositoryResult<void>> {
    const list = await this.getTransactions(userId);
    const filtered = list.filter(t => t.id !== transactionId);
    const res = await this.saveTransactions(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- BUDGETS ---
  async getBudgets(userId: string): Promise<Budget[]> {
    return this.loadData<Budget[]>(this.getKey('budgets', userId), []);
  }

  async saveBudgets(userId: string, budgets: Budget[]): Promise<RepositoryResult<Budget[]>> {
    try {
      this.saveData(this.getKey('budgets', userId), budgets);
      return { success: true, data: budgets };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save budgets' };
    }
  }

  async addBudget(userId: string, budget: Budget): Promise<RepositoryResult<Budget>> {
    const list = await this.getBudgets(userId);
    const updated = [...list, budget];
    const res = await this.saveBudgets(userId, updated);
    return res.success ? { success: true, data: budget } : { success: false, error: res.error };
  }

  async updateBudget(userId: string, budgetId: string, updates: Partial<Budget>): Promise<RepositoryResult<Budget>> {
    const list = await this.getBudgets(userId);
    const idx = list.findIndex(b => b.id === budgetId);
    if (idx === -1) return { success: false, error: 'Budget not found' };
    const updatedBudget = { ...list[idx], ...updates };
    list[idx] = updatedBudget;
    const res = await this.saveBudgets(userId, list);
    return res.success ? { success: true, data: updatedBudget } : { success: false, error: res.error };
  }

  async deleteBudget(userId: string, budgetId: string): Promise<RepositoryResult<void>> {
    const list = await this.getBudgets(userId);
    const filtered = list.filter(b => b.id !== budgetId);
    const res = await this.saveBudgets(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- SAVINGS GOALS ---
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    return this.loadData<SavingsGoal[]>(this.getKey('goals', userId), []);
  }

  async saveGoals(userId: string, goals: SavingsGoal[]): Promise<RepositoryResult<SavingsGoal[]>> {
    try {
      this.saveData(this.getKey('goals', userId), goals);
      return { success: true, data: goals };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save goals' };
    }
  }

  async addGoal(userId: string, goal: SavingsGoal): Promise<RepositoryResult<SavingsGoal>> {
    const list = await this.getGoals(userId);
    const updated = [...list, goal];
    const res = await this.saveGoals(userId, updated);
    return res.success ? { success: true, data: goal } : { success: false, error: res.error };
  }

  async updateGoal(userId: string, goalId: string, updates: Partial<SavingsGoal>): Promise<RepositoryResult<SavingsGoal>> {
    const list = await this.getGoals(userId);
    const idx = list.findIndex(g => g.id === goalId);
    if (idx === -1) return { success: false, error: 'Savings goal not found' };
    const updatedGoal = { ...list[idx], ...updates };
    list[idx] = updatedGoal;
    const res = await this.saveGoals(userId, list);
    return res.success ? { success: true, data: updatedGoal } : { success: false, error: res.error };
  }

  async deleteGoal(userId: string, goalId: string): Promise<RepositoryResult<void>> {
    const list = await this.getGoals(userId);
    const filtered = list.filter(g => g.id !== goalId);
    const res = await this.saveGoals(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- HOLDINGS ---
  async getHoldings(userId: string): Promise<Holding[]> {
    return this.loadData<Holding[]>(this.getKey('holdings', userId), []);
  }

  async saveHoldings(userId: string, holdings: Holding[]): Promise<RepositoryResult<Holding[]>> {
    try {
      this.saveData(this.getKey('holdings', userId), holdings);
      return { success: true, data: holdings };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save holdings' };
    }
  }

  async addHolding(userId: string, holding: Holding): Promise<RepositoryResult<Holding>> {
    const list = await this.getHoldings(userId);
    const updated = [...list, holding];
    const res = await this.saveHoldings(userId, updated);
    return res.success ? { success: true, data: holding } : { success: false, error: res.error };
  }

  async updateHolding(userId: string, holdingId: string, updates: Partial<Holding>): Promise<RepositoryResult<Holding>> {
    const list = await this.getHoldings(userId);
    const idx = list.findIndex(h => h.id === holdingId);
    if (idx === -1) return { success: false, error: 'Holding not found' };
    const updatedHolding = { ...list[idx], ...updates };
    list[idx] = updatedHolding;
    const res = await this.saveHoldings(userId, list);
    return res.success ? { success: true, data: updatedHolding } : { success: false, error: res.error };
  }

  async deleteHolding(userId: string, holdingId: string): Promise<RepositoryResult<void>> {
    const list = await this.getHoldings(userId);
    const filtered = list.filter(h => h.id !== holdingId);
    const res = await this.saveHoldings(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- SPLIT EXPENSES ---
  async getSplitExpenses(userId: string): Promise<SplitExpense[]> {
    return this.loadData<SplitExpense[]>(this.getKey('splitExpenses', userId), []);
  }

  async saveSplitExpenses(userId: string, expenses: SplitExpense[]): Promise<RepositoryResult<SplitExpense[]>> {
    try {
      this.saveData(this.getKey('splitExpenses', userId), expenses);
      return { success: true, data: expenses };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save split expenses' };
    }
  }

  async addSplitExpense(userId: string, expense: SplitExpense): Promise<RepositoryResult<SplitExpense>> {
    const list = await this.getSplitExpenses(userId);
    const updated = [...list, expense];
    const res = await this.saveSplitExpenses(userId, updated);
    return res.success ? { success: true, data: expense } : { success: false, error: res.error };
  }

  async updateSplitExpense(userId: string, expenseId: string, updates: Partial<SplitExpense>): Promise<RepositoryResult<SplitExpense>> {
    const list = await this.getSplitExpenses(userId);
    const idx = list.findIndex(s => s.id === expenseId);
    if (idx === -1) return { success: false, error: 'Split expense not found' };
    const updatedSplit = { ...list[idx], ...updates };
    list[idx] = updatedSplit;
    const res = await this.saveSplitExpenses(userId, list);
    return res.success ? { success: true, data: updatedSplit } : { success: false, error: res.error };
  }

  async deleteSplitExpense(userId: string, expenseId: string): Promise<RepositoryResult<void>> {
    const list = await this.getSplitExpenses(userId);
    const filtered = list.filter(s => s.id !== expenseId);
    const res = await this.saveSplitExpenses(userId, filtered);
    return res.success ? { success: true } : { success: false, error: res.error };
  }

  // --- BATCH OPERATIONS ---
  async clearUserData(userId: string): Promise<RepositoryResult<void>> {
    try {
      localStorage.removeItem(this.getKey('accounts', userId));
      localStorage.removeItem(this.getKey('transactions', userId));
      localStorage.removeItem(this.getKey('budgets', userId));
      localStorage.removeItem(this.getKey('goals', userId));
      localStorage.removeItem(this.getKey('holdings', userId));
      localStorage.removeItem(this.getKey('splitExpenses', userId));
      localStorage.removeItem(this.getKey('insights', userId));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to clear user data' };
    }
  }
}
