import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense } from '../../types';
import { FinanceRepository, RepositoryResult } from './FinanceRepository';
import { SupabaseClientAdapter, defaultSupabaseClient } from '../supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureValidUuid(id?: string): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SupabaseRepository implements FinanceRepository {
  private client: SupabaseClientAdapter;

  constructor(client?: SupabaseClientAdapter) {
    this.client = client || defaultSupabaseClient;
  }

  // --- ACCOUNTS ---
  async getAccounts(userId: string): Promise<Account[]> {
    const res = await this.client.query<any[]>('accounts', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}`, is_active: 'eq.true' }
    });

    if (res.error || !res.data) {
      console.warn('SupabaseRepository.getAccounts failed:', res.error?.message);
      return [];
    }

    return res.data.map(r => ({
      id: r.id,
      name: r.account_name,
      institution: r.institution_name,
      type: r.account_type === 'current' ? 'checking' : (r.account_type === 'credit_card' ? 'credit' : r.account_type),
      balance: Number(r.current_balance),
      currency: r.currency,
      lastSynced: r.last_synced_at || new Date().toISOString(),
      accountNumberMask: r.account_number_mask || '',
      status: 'synced'
    }));
  }

  async saveAccounts(userId: string, accounts: Account[]): Promise<RepositoryResult<Account[]>> {
    try {
      for (const acc of accounts) {
        await this.addAccount(userId, acc);
      }
      return { success: true, data: accounts };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to batch save accounts' };
    }
  }

  async addAccount(userId: string, account: Account): Promise<RepositoryResult<Account>> {
    const accId = ensureValidUuid(account.id);
    const dbAccountType = account.type === 'checking' ? 'current' : (account.type === 'credit' ? 'credit_card' : account.type);
    const payload = {
      id: accId,
      user_id: userId,
      account_name: account.name,
      institution_name: account.institution,
      account_type: dbAccountType,
      currency: account.currency || 'INR',
      opening_balance: account.balance,
      current_balance: account.balance,
      account_number_mask: account.accountNumberMask,
      is_active: true,
      connection_mode: 'manual'
    };

    const res = await this.client.query('accounts', 'POST', {
      body: payload
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true, data: { ...account, id: accId } };
  }

  async updateAccount(userId: string, accountId: string, updates: Partial<Account>): Promise<RepositoryResult<Account>> {
    const patchBody: Record<string, any> = {};
    if (updates.name !== undefined) patchBody.account_name = updates.name;
    if (updates.institution !== undefined) patchBody.institution_name = updates.institution;
    if (updates.balance !== undefined) patchBody.current_balance = updates.balance;
    if (updates.accountNumberMask !== undefined) patchBody.account_number_mask = updates.accountNumberMask;

    const res = await this.client.query('accounts', 'PATCH', {
      filters: { id: `eq.${accountId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true, data: updates as Account };
  }

  async deleteAccount(userId: string, accountId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('accounts', 'DELETE', {
      filters: { id: `eq.${accountId}`, user_id: `eq.${userId}` }
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true };
  }

  // --- TRANSACTIONS ---
  async getTransactions(userId: string): Promise<Transaction[]> {
    const res = await this.client.query<any[]>('transactions', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}` }
    });

    if (res.error || !res.data) {
      console.warn('SupabaseRepository.getTransactions failed:', res.error?.message);
      return [];
    }

    return res.data.map(r => ({
      id: r.id,
      accountId: r.account_id,
      accountName: r.account_name || 'Account',
      destinationAccountId: r.destination_account_id,
      originalTransactionId: r.original_transaction_id,
      date: r.transaction_date,
      amount: Number(r.amount),
      currency: r.currency || 'INR',
      type: r.transaction_type,
      category: r.category_name,
      merchant: r.merchant || r.title || 'Unknown',
      description: r.notes || r.description || '',
      status: r.status,
      paymentMethod: r.payment_method,
      upiId: r.upi_vpa || r.upi_id,
      utrNumber: r.upi_utr_number || r.utr_number,
      tags: r.tags || []
    }));
  }

  async saveTransactions(userId: string, transactions: Transaction[]): Promise<RepositoryResult<Transaction[]>> {
    try {
      for (const tx of transactions) {
        await this.addTransaction(userId, tx);
      }
      return { success: true, data: transactions };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save transactions' };
    }
  }

  async addTransaction(userId: string, transaction: Transaction): Promise<RepositoryResult<Transaction>> {
    const txId = ensureValidUuid(transaction.id);
    const accId = ensureValidUuid(transaction.accountId);
    const payload = {
      id: txId,
      user_id: userId,
      account_id: accId,
      destination_account_id: transaction.destinationAccountId ? ensureValidUuid(transaction.destinationAccountId) : null,
      original_transaction_id: transaction.originalTransactionId ? ensureValidUuid(transaction.originalTransactionId) : null,
      title: transaction.merchant || transaction.description || 'Transaction',
      merchant: transaction.merchant || 'Unknown',
      transaction_date: transaction.date,
      amount: transaction.amount,
      currency: transaction.currency || 'INR',
      transaction_type: transaction.type,
      category_name: transaction.category,
      payment_method: transaction.paymentMethod || 'other',
      upi_vpa: transaction.upiId || null,
      upi_utr_number: transaction.utrNumber || null,
      notes: transaction.description || '',
      tags: transaction.tags || [],
      status: transaction.status || 'posted'
    };

    const res = await this.client.query('transactions', 'POST', {
      body: payload
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true, data: { ...transaction, id: txId } };
  }

  async updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<RepositoryResult<Transaction>> {
    const patchBody: Record<string, any> = {};
    if (updates.amount !== undefined) patchBody.amount = updates.amount;
    if (updates.date !== undefined) patchBody.transaction_date = updates.date;
    if (updates.category !== undefined) patchBody.category_name = updates.category;
    if (updates.merchant !== undefined) patchBody.merchant = updates.merchant;
    if (updates.description !== undefined) patchBody.description = updates.description;
    if (updates.status !== undefined) patchBody.status = updates.status;

    const res = await this.client.query('transactions', 'PATCH', {
      filters: { id: `eq.${transactionId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true, data: updates as Transaction };
  }

  async deleteTransaction(userId: string, transactionId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('transactions', 'DELETE', {
      filters: { id: `eq.${transactionId}`, user_id: `eq.${userId}` }
    });

    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true };
  }

  // --- BUDGETS ---
  async getBudgets(userId: string): Promise<Budget[]> {
    const res = await this.client.query<any[]>('budgets', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}` }
    });

    if (res.error || !res.data) {
      return [];
    }

    return res.data.map(r => ({
      id: r.id,
      categoryId: r.category_id || r.id,
      categoryName: r.category_name,
      limit: Number(r.monthly_limit),
      spent: Number(r.spent_amount || 0),
      period: 'monthly'
    }));
  }

  async saveBudgets(userId: string, budgets: Budget[]): Promise<RepositoryResult<Budget[]>> {
    try {
      for (const b of budgets) {
        await this.addBudget(userId, b);
      }
      return { success: true, data: budgets };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save budgets' };
    }
  }

  async addBudget(userId: string, budget: Budget): Promise<RepositoryResult<Budget>> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

    const budgetId = ensureValidUuid(budget.id);
    const categoryId = ensureValidUuid(budget.categoryId);
    const categoryName = budget.categoryName || 'General';

    // Ensure category exists in public.categories so foreign key constraint is satisfied
    try {
      await this.client.query('categories', 'POST', {
        body: {
          id: categoryId,
          user_id: userId,
          name: categoryName,
          icon: 'tag',
          category_group: 'wants',
          is_custom: true
        }
      });
    } catch {
      // Ignore if category already exists
    }

    const payload = {
      id: budgetId,
      user_id: userId,
      category_id: categoryId,
      category_name: categoryName,
      monthly_limit: budget.limit,
      start_date: startDate,
      end_date: endDate,
      period: 'monthly'
    };

    const res = await this.client.query('budgets', 'POST', { body: payload });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: { ...budget, id: budgetId, categoryId } };
  }

  async updateBudget(userId: string, budgetId: string, updates: Partial<Budget>): Promise<RepositoryResult<Budget>> {
    const patchBody: Record<string, any> = {};
    if (updates.limit !== undefined) patchBody.monthly_limit = updates.limit;
    if (updates.spent !== undefined) patchBody.spent_amount = updates.spent;

    const res = await this.client.query('budgets', 'PATCH', {
      filters: { id: `eq.${budgetId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: updates as Budget };
  }

  async deleteBudget(userId: string, budgetId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('budgets', 'DELETE', {
      filters: { id: `eq.${budgetId}`, user_id: `eq.${userId}` }
    });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true };
  }

  // --- SAVINGS GOALS ---
  async getGoals(userId: string): Promise<SavingsGoal[]> {
    const res = await this.client.query<any[]>('savings_goals', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}` }
    });

    if (res.error || !res.data) return [];

    return res.data.map(r => ({
      id: r.id,
      name: r.name,
      targetAmount: Number(r.target_amount),
      currentAmount: Number(r.current_amount),
      targetDate: r.target_date,
      monthlyContribution: Number(r.monthly_contribution || 0),
      category: r.category || 'General',
      notes: r.notes || ''
    }));
  }

  async saveGoals(userId: string, goals: SavingsGoal[]): Promise<RepositoryResult<SavingsGoal[]>> {
    try {
      for (const g of goals) {
        await this.addGoal(userId, g);
      }
      return { success: true, data: goals };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save goals' };
    }
  }

  async addGoal(userId: string, goal: SavingsGoal): Promise<RepositoryResult<SavingsGoal>> {
    const validCategories = ['emergency_fund', 'retirement', 'home_purchase', 'vehicle', 'education', 'travel', 'general', 'other'];
    const rawCat = (goal.category || 'general').toLowerCase().replace(/[\s-]+/g, '_');
    const dbCategory = validCategories.includes(rawCat) ? rawCat : 'general';
    const goalId = ensureValidUuid(goal.id);

    const payload = {
      id: goalId,
      user_id: userId,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount,
      target_date: goal.targetDate,
      monthly_contribution: goal.monthlyContribution,
      category: dbCategory,
      notes: goal.notes || ''
    };

    const res = await this.client.query('savings_goals', 'POST', { body: payload });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: { ...goal, id: goalId } };
  }

  async updateGoal(userId: string, goalId: string, updates: Partial<SavingsGoal>): Promise<RepositoryResult<SavingsGoal>> {
    const patchBody: Record<string, any> = {};
    if (updates.currentAmount !== undefined) patchBody.current_amount = updates.currentAmount;
    if (updates.targetAmount !== undefined) patchBody.target_amount = updates.targetAmount;
    if (updates.targetDate !== undefined) patchBody.target_date = updates.targetDate;

    const res = await this.client.query('savings_goals', 'PATCH', {
      filters: { id: `eq.${goalId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: updates as SavingsGoal };
  }

  async deleteGoal(userId: string, goalId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('savings_goals', 'DELETE', {
      filters: { id: `eq.${goalId}`, user_id: `eq.${userId}` }
    });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true };
  }

  // --- HOLDINGS ---
  async getHoldings(userId: string): Promise<Holding[]> {
    const res = await this.client.query<any[]>('investments', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}` }
    });

    if (res.error || !res.data) return [];

    const mapAssetTypeToClass = (at: string): any => {
      if (at === 'equity_us') return 'us_stocks';
      if (at === 'crypto') return 'crypto';
      if (at === 'fixed_deposit' || at === 'bonds') return 'fixed_income';
      if (at === 'real_estate') return 'real_estate';
      return 'intl_stocks';
    };

    return res.data.map(r => ({
      id: r.id,
      symbol: r.symbol,
      name: r.asset_name,
      assetClass: mapAssetTypeToClass(r.asset_type || r.asset_class),
      shares: Number(r.quantity),
      avgCost: Number(r.average_cost_basis || r.average_buy_price || 0),
      currentPrice: Number(r.current_market_price || r.current_price || 0),
      dayChangePct: Number(r.day_change_pct || 0),
      currency: r.currency || 'INR',
      lastUpdated: r.last_price_updated_at || new Date().toISOString()
    }));
  }

  async saveHoldings(userId: string, holdings: Holding[]): Promise<RepositoryResult<Holding[]>> {
    try {
      for (const h of holdings) {
        await this.addHolding(userId, h);
      }
      return { success: true, data: holdings };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save holdings' };
    }
  }

  async addHolding(userId: string, holding: Holding): Promise<RepositoryResult<Holding>> {
    const mapAssetClassToType = (ac: string): string => {
      if (ac === 'us_stocks') return 'equity_us';
      if (ac === 'intl_stocks') return 'equity_in';
      if (ac === 'crypto') return 'crypto';
      if (ac === 'fixed_income') return 'fixed_deposit';
      if (ac === 'real_estate') return 'real_estate';
      return 'mutual_fund';
    };

    const payload = {
      id: holding.id,
      user_id: userId,
      symbol: holding.symbol,
      asset_name: holding.name,
      asset_type: mapAssetClassToType(holding.assetClass),
      quantity: holding.shares,
      average_cost_basis: holding.avgCost,
      current_market_price: holding.currentPrice,
      currency: holding.currency || 'INR'
    };

    const res = await this.client.query('investments', 'POST', { body: payload });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: holding };
  }

  async updateHolding(userId: string, holdingId: string, updates: Partial<Holding>): Promise<RepositoryResult<Holding>> {
    const patchBody: Record<string, any> = {};
    if (updates.shares !== undefined) patchBody.quantity = updates.shares;
    if (updates.currentPrice !== undefined) patchBody.current_price = updates.currentPrice;
    if (updates.avgCost !== undefined) patchBody.average_buy_price = updates.avgCost;
    if (updates.dayChangePct !== undefined) patchBody.day_change_pct = updates.dayChangePct;

    const res = await this.client.query('investments', 'PATCH', {
      filters: { id: `eq.${holdingId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: updates as Holding };
  }

  async deleteHolding(userId: string, holdingId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('investments', 'DELETE', {
      filters: { id: `eq.${holdingId}`, user_id: `eq.${userId}` }
    });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true };
  }

  // --- SPLIT EXPENSES ---
  async getSplitExpenses(userId: string): Promise<SplitExpense[]> {
    const res = await this.client.query<any[]>('bill_splits', 'GET', {
      select: '*',
      filters: { user_id: `eq.${userId}` }
    });

    if (res.error || !res.data) return [];

    return res.data.map(r => ({
      id: r.id,
      title: r.title,
      totalAmount: Number(r.total_amount),
      paidBy: r.paid_by_name,
      date: r.split_date,
      category: r.category,
      status: r.settlement_status || 'unsettled',
      participants: typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : (r.participants_json || []),
      notes: r.notes || ''
    }));
  }

  async saveSplitExpenses(userId: string, expenses: SplitExpense[]): Promise<RepositoryResult<SplitExpense[]>> {
    try {
      for (const s of expenses) {
        await this.addSplitExpense(userId, s);
      }
      return { success: true, data: expenses };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save split expenses' };
    }
  }

  async addSplitExpense(userId: string, expense: SplitExpense): Promise<RepositoryResult<SplitExpense>> {
    const payload = {
      id: expense.id,
      user_id: userId,
      title: expense.title,
      total_amount: expense.totalAmount,
      paid_by_name: expense.paidBy,
      split_date: expense.date,
      category: expense.category,
      settlement_status: expense.status,
      participants_json: expense.participants,
      notes: expense.notes || ''
    };

    const res = await this.client.query('bill_splits', 'POST', { body: payload });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: expense };
  }

  async updateSplitExpense(userId: string, expenseId: string, updates: Partial<SplitExpense>): Promise<RepositoryResult<SplitExpense>> {
    const patchBody: Record<string, any> = {};
    if (updates.status !== undefined) patchBody.settlement_status = updates.status;
    if (updates.participants !== undefined) patchBody.participants_json = updates.participants;

    const res = await this.client.query('bill_splits', 'PATCH', {
      filters: { id: `eq.${expenseId}`, user_id: `eq.${userId}` },
      body: patchBody
    });

    if (res.error) return { success: false, error: res.error.message };
    return { success: true, data: updates as SplitExpense };
  }

  async deleteSplitExpense(userId: string, expenseId: string): Promise<RepositoryResult<void>> {
    const res = await this.client.query('bill_splits', 'DELETE', {
      filters: { id: `eq.${expenseId}`, user_id: `eq.${userId}` }
    });
    if (res.error) return { success: false, error: res.error.message };
    return { success: true };
  }

  // --- BATCH CLEAR ---
  async clearUserData(userId: string): Promise<RepositoryResult<void>> {
    try {
      await this.client.query('transactions', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      await this.client.query('budgets', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      await this.client.query('savings_goals', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      await this.client.query('investments', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      await this.client.query('bill_splits', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      await this.client.query('accounts', 'DELETE', { filters: { user_id: `eq.${userId}` } });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to clear user data' };
    }
  }
}
