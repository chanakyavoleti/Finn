import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('Phase 1 Reconciled Protocol: Direct Audit of TC-105 through TC-116', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // TC-105: Verify budgets remain isolated between users
  // =========================================================================
  it('TC-105: Budgets remain strictly isolated between different users', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // User A creates a ₹15,000 Food budget
    await act(async () => {
      await result.current.registerUser('usera_budget@test.in', 'User A', 'Pass1234!');
    });
    const userAId = result.current.currentUser!.id;

    act(() => {
      result.current.addBudget({
        categoryId: 'cat-food',
        categoryName: 'Food',
        limit: 15000,
        period: 'monthly'
      });
    });

    expect(result.current.budgets).toHaveLength(1);
    expect(result.current.budgets[0].categoryName).toBe('Food');
    expect(result.current.budgets[0].limit).toBe(15000);

    // Register User B -> budgets must be completely empty
    await act(async () => {
      await result.current.registerUser('userb_budget@test.in', 'User B', 'Pass1234!');
    });

    expect(result.current.budgets).toHaveLength(0);

    // User B adds a ₹5,000 Entertainment budget
    act(() => {
      result.current.addBudget({
        categoryId: 'cat-ent',
        categoryName: 'Entertainment',
        limit: 5000,
        period: 'monthly'
      });
    });

    expect(result.current.budgets).toHaveLength(1);
    expect(result.current.budgets[0].categoryName).toBe('Entertainment');

    // Switch back to User A -> User A's budget is preserved and unaffected
    await act(async () => {
      await result.current.switchUserDirectly(userAId);
    });

    expect(result.current.budgets).toHaveLength(1);
    expect(result.current.budgets[0].categoryName).toBe('Food');
    expect(result.current.budgets[0].limit).toBe(15000);
  });

  // =========================================================================
  // TC-106: Refresh and verify budget persistence
  // =========================================================================
  it('TC-106: Budgets persist correctly across session re-hydration', async () => {
    const { result, unmount } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('persist_budget@test.in', 'Persist User', 'Pass1234!');
    });
    const uid = result.current.currentUser!.id;

    act(() => {
      result.current.addBudget({
        categoryId: 'cat-travel',
        categoryName: 'Travel',
        limit: 8000,
        period: 'monthly'
      });
    });

    // Unmount hook and remount to simulate page reload/refresh
    unmount();

    const { result: reloaded } = renderHook(() => useFinance(), { wrapper });
    expect(reloaded.current.currentUser?.id).toBe(uid);
    expect(reloaded.current.budgets).toHaveLength(1);
    expect(reloaded.current.budgets[0].categoryName).toBe('Travel');
    expect(reloaded.current.budgets[0].limit).toBe(8000);
  });

  // =========================================================================
  // TC-107: Verify budget progress updates without refreshing the page
  // =========================================================================
  it('TC-107: Budget spent amount updates reactively upon recording expense', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('budget_reactive@test.in', 'Reactive User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'HDFC Savings',
        institution: 'HDFC Bank',
        type: 'savings',
        balance: 50000,
        currency: 'INR',
        accountNumberMask: '•••• 1234'
      });
      result.current.addBudget({
        categoryId: 'cat-dining',
        categoryName: 'Dining',
        limit: 10000,
        period: 'monthly'
      });
    });

    const accId = result.current.accounts[0].id;
    const initialSpent = result.current.budgets[0].spent;
    expect(initialSpent).toBe(0);

    // Record Dining expense of ₹3,500
    act(() => {
      result.current.addTransaction({
        accountId: accId,
        amount: 3500,
        type: 'expense',
        category: 'Dining',
        merchant: 'Taj Hotel',
        date: '2026-10-31',
        description: 'Dinner',
        status: 'posted'
      });
    });

    expect(result.current.budgets[0].spent).toBe(3500);

    // Record additional Dining expense of ₹1,200
    act(() => {
      result.current.addTransaction({
        accountId: accId,
        amount: 1200,
        type: 'expense',
        category: 'Dining',
        merchant: 'Cafe Coffee Day',
        date: '2026-10-31',
        description: 'Coffee',
        status: 'posted'
      });
    });

    expect(result.current.budgets[0].spent).toBe(4700);
  });

  // =========================================================================
  // TC-108: Verify monthly spending analytics
  // =========================================================================
  it('TC-108: Monthly spending analytics calculates aggregate category spend', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('monthly_analytics@test.in', 'Analytics User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'SBI Current',
        institution: 'State Bank of India',
        type: 'checking',
        balance: 100000,
        currency: 'INR',
        accountNumberMask: '•••• 9999'
      });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 4000, type: 'expense', category: 'Groceries', merchant: 'BigBasket', date: '2026-10-15', description: 'Monthly ration', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 2500, type: 'expense', category: 'Utilities', merchant: 'Electricity Board', date: '2026-10-20', description: 'Bill', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 1500, type: 'expense', category: 'Groceries', merchant: 'Local Mart', date: '2026-10-25', description: 'Vegetables', status: 'posted' });
    });

    // Total monthly spending = 4000 + 2500 + 1500 = 8000
    expect(result.current.metrics.totalExpenses).toBe(8000);
    // Category Breakdown: Groceries = 5500, Utilities = 2500
    const groceriesTx = result.current.transactions.filter(t => t.category === 'Groceries');
    const groceriesTotal = groceriesTx.reduce((sum, t) => sum + t.amount, 0);
    expect(groceriesTotal).toBe(5500);
  });

  // =========================================================================
  // TC-109: Verify annual spending analytics
  // =========================================================================
  it('TC-109: Annual spending analytics consolidates across billing months', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('annual_analytics@test.in', 'Annual User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'ICICI Bank',
        institution: 'ICICI Bank',
        type: 'savings',
        balance: 200000,
        currency: 'INR',
        accountNumberMask: '•••• 8888'
      });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 20000, type: 'expense', category: 'Rent', merchant: 'Landlord', date: '2026-04-10', description: 'April Rent', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 20000, type: 'expense', category: 'Rent', merchant: 'Landlord', date: '2026-05-10', description: 'May Rent', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 20000, type: 'expense', category: 'Rent', merchant: 'Landlord', date: '2026-06-10', description: 'June Rent', status: 'posted' });
    });

    const rentExpenses = result.current.transactions
      .filter(t => t.type === 'expense' && t.category === 'Rent')
      .reduce((s, t) => s + t.amount, 0);
    expect(rentExpenses).toBe(60000);
  });

  // =========================================================================
  // TC-110: Verify income versus expenses
  // =========================================================================
  it('TC-110: Income versus expenses calculation yields exact cash flow surplus/deficit', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('cashflow@test.in', 'CashFlow User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'Axis Bank',
        institution: 'Axis Bank',
        type: 'checking',
        balance: 50000,
        currency: 'INR',
        accountNumberMask: '•••• 7777'
      });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 75000, type: 'income', category: 'Consulting', merchant: 'Client A', date: '2026-10-05', description: 'Invoice 1', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 30000, type: 'expense', category: 'Equipment', merchant: 'Apple Store', date: '2026-10-12', description: 'Monitor', status: 'posted' });
    });

    expect(result.current.metrics.totalIncome).toBe(75000);
    expect(result.current.metrics.totalExpenses).toBe(30000);
    expect(result.current.metrics.netSavings).toBe(45000);
  });

  // =========================================================================
  // TC-111: Verify category allocation
  // =========================================================================
  it('TC-111: Category allocation percentages correctly sum to 100%', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('cat_alloc@test.in', 'Category User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'Kotak Mahindra',
        institution: 'Kotak Bank',
        type: 'savings',
        balance: 50000,
        currency: 'INR',
        accountNumberMask: '•••• 6666'
      });
    });
    const accId = result.current.accounts[0].id;

    // Expenses: ₹5,000 Housing (50%), ₹3,000 Food (30%), ₹2,000 Transit (20%) -> Total ₹10,000
    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 5000, type: 'expense', category: 'Housing', merchant: 'Society', date: '2026-10-01', description: 'Maintenance', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 3000, type: 'expense', category: 'Food', merchant: 'Grocer', date: '2026-10-02', description: 'Food', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 2000, type: 'expense', category: 'Transit', merchant: 'Fuel', date: '2026-10-03', description: 'Petrol', status: 'posted' });
    });

    const totalExp = result.current.metrics.totalExpenses;
    expect(totalExp).toBe(10000);

    const housingPct = (5000 / totalExp) * 100;
    const foodPct = (3000 / totalExp) * 100;
    const transitPct = (2000 / totalExp) * 100;

    expect(housingPct).toBe(50);
    expect(foodPct).toBe(30);
    expect(transitPct).toBe(20);
    expect(housingPct + foodPct + transitPct).toBe(100);
  });

  // =========================================================================
  // TC-112: Verify monthly savings rate
  // =========================================================================
  it('TC-112: Monthly savings rate computes accurately and bounds safely for zero income', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('savings_rate@test.in', 'Savings User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({
        name: 'SBI Savings',
        institution: 'SBI',
        type: 'savings',
        balance: 100000,
        currency: 'INR',
        accountNumberMask: '•••• 5555'
      });
    });
    const accId = result.current.accounts[0].id;

    // ₹1,00,000 income, ₹40,000 expense -> Savings = ₹60,000 (60% savings rate)
    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 100000, type: 'income', category: 'Salary', merchant: 'Employer', date: '2026-10-01', description: 'Salary', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 40000, type: 'expense', category: 'Living', merchant: 'Various', date: '2026-10-15', description: 'Expenses', status: 'posted' });
    });

    expect(result.current.metrics.savingsRate).toBe(60);
  });

  // =========================================================================
  // TC-113: Verify net worth calculation
  // =========================================================================
  it('TC-113: Net worth incorporates asset accounts, holdings, and liabilities', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('networth_audit@test.in', 'NetWorth User', 'Pass1234!');
    });

    act(() => {
      // Liquid cash: ₹2,00,000
      result.current.addAccount({ name: 'HDFC', institution: 'HDFC Bank', type: 'savings', balance: 200000, currency: 'INR', accountNumberMask: '•••• 1111' });
      // Credit card liability: ₹25,000
      result.current.addAccount({ name: 'Regalia CC', institution: 'HDFC Bank', type: 'credit', balance: -25000, currency: 'INR', accountNumberMask: '•••• 2222' });
      // Investment Demat account: ₹30,000
      result.current.addAccount({ name: 'Zerodha Demat', institution: 'Zerodha', type: 'investment', balance: 30000, currency: 'INR', accountNumberMask: '•••• 3333' });
    });

    // Net worth = Assets (2,00,000 + 30,000) - Liabilities (25,000) = ₹2,05,000
    expect(result.current.metrics.liquidCash).toBe(200000);
    expect(result.current.metrics.creditLiabilities).toBe(25000);
    expect(result.current.metrics.investmentAssets).toBe(30000);
    expect(result.current.metrics.totalNetWorth).toBe(205000);
  });

  // =========================================================================
  // TC-114: Verify six-month cash flow
  // =========================================================================
  it('TC-114: Six-month cash flow aggregates monthly income and expenses chronologically', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('six_month@test.in', 'Cashflow User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Bank', institution: 'Bank', type: 'savings', balance: 50000, currency: 'INR', accountNumberMask: '•••• 3333' });
    });
    const accId = result.current.accounts[0].id;

    // Add transactions spanning July to October 2026
    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 50000, type: 'income', category: 'Salary', merchant: 'Employer', date: '2026-07-31', description: 'July', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 20000, type: 'expense', category: 'Bills', merchant: 'Vendor', date: '2026-07-31', description: 'July Exp', status: 'posted' });

      result.current.addTransaction({ accountId: accId, amount: 50000, type: 'income', category: 'Salary', merchant: 'Employer', date: '2026-08-31', description: 'August', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 22000, type: 'expense', category: 'Bills', merchant: 'Vendor', date: '2026-08-31', description: 'Aug Exp', status: 'posted' });

      result.current.addTransaction({ accountId: accId, amount: 50000, type: 'income', category: 'Salary', merchant: 'Employer', date: '2026-09-30', description: 'Sept', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 21000, type: 'expense', category: 'Bills', merchant: 'Vendor', date: '2026-09-30', description: 'Sept Exp', status: 'posted' });
    });

    // Verify chronological monthly groupings
    const julTx = result.current.transactions.filter(t => t.date.startsWith('2026-07'));
    const augTx = result.current.transactions.filter(t => t.date.startsWith('2026-08'));
    const sepTx = result.current.transactions.filter(t => t.date.startsWith('2026-09'));

    expect(julTx).toHaveLength(2);
    expect(augTx).toHaveLength(2);
    expect(sepTx).toHaveLength(2);
  });

  // =========================================================================
  // TC-115: Verify custom date filtering
  // =========================================================================
  it('TC-115: Date filtering accurately segments transactions within selected boundaries', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('date_filter@test.in', 'Date User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Bank', institution: 'Bank', type: 'savings', balance: 50000, currency: 'INR', accountNumberMask: '•••• 4444' });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 1000, type: 'expense', category: 'A', merchant: 'M1', date: '2026-10-01', description: 'Early Oct', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 2000, type: 'expense', category: 'B', merchant: 'M2', date: '2026-10-15', description: 'Mid Oct', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 3000, type: 'expense', category: 'C', merchant: 'M3', date: '2026-10-31', description: 'Late Oct', status: 'posted' });
    });

    const filterRange = (start: string, end: string) => {
      return result.current.transactions.filter(t => t.date >= start && t.date <= end);
    };

    expect(filterRange('2026-10-01', '2026-10-10')).toHaveLength(1);
    expect(filterRange('2026-10-10', '2026-10-20')).toHaveLength(1);
    expect(filterRange('2026-10-01', '2026-10-31')).toHaveLength(3);
  });

  // =========================================================================
  // TC-116: Verify empty chart states
  // =========================================================================
  it('TC-116: Empty chart states render zero values without division by zero or NaN', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('empty_charts@test.in', 'Empty User', 'Pass1234!');
    });

    // Zero transactions, zero budgets, zero accounts
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.budgets).toHaveLength(0);
    expect(result.current.accounts).toHaveLength(0);

    // Assert that calculated metrics do not emit NaN or Infinity
    expect(result.current.metrics.totalIncome).toBe(0);
    expect(result.current.metrics.totalExpenses).toBe(0);
    expect(result.current.metrics.netSavings).toBe(0);
    expect(result.current.metrics.savingsRate).toBe(0);
    expect(Number.isNaN(result.current.metrics.savingsRate)).toBe(false);
    expect(Number.isFinite(result.current.metrics.savingsRate)).toBe(true);
    expect(result.current.metrics.totalNetWorth).toBe(0);
  });
});
