import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('User Switching & Multi-Tenant Workspace Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides verified demo workspace with INR datasets on initial load', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    expect(result.current.currentUser).toBeDefined();
    expect(result.current.currentUser?.id).toBe('usr_demo');
    expect(result.current.currentUser?.email).toBe('chanakya@finn.in');
    expect(result.current.accounts.length).toBeGreaterThan(0);
    expect(result.current.transactions.length).toBeGreaterThan(0);
  });

  it('guarantees clean isolated workspace with 0 demo leakage when new user registers', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('ananya.sharma@fintech.in', 'Ananya Sharma', 'SecurePass123!');
    });

    expect(result.current.currentUser?.email).toBe('ananya.sharma@fintech.in');
    expect(result.current.currentUser?.fullName).toBe('Ananya Sharma');
    
    // Crucial isolation check: New real user MUST have an empty, clean slate, NOT demo data!
    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.budgets).toHaveLength(0);
    expect(result.current.holdings).toHaveLength(0);
    expect(result.current.metrics.totalNetWorth).toBe(0);
    expect(result.current.metrics.liquidCash).toBe(0);
    expect(result.current.metrics.totalIncome).toBe(0);
    expect(result.current.metrics.totalExpenses).toBe(0);
  });

  it('completely isolates financial records between User A and User B without cross-contamination', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // 1. Register User A (Vikram)
    await act(async () => {
      await result.current.registerUser('vikram@investor.in', 'Vikram Malhotra', 'VikramPass123!');
    });
    const userAId = result.current.currentUser!.id;

    // Add account and transaction for User A
    act(() => {
      result.current.addAccount({
        name: 'Kotak Mahindra Wealth',
        institution: 'Kotak Bank',
        type: 'checking',
        balance: 150000.00,
        currency: 'INR',
        accountNumberMask: '•••• 1234'
      });
      result.current.addTransaction({
        accountId: 'acc-vikram-1',
        amount: 85000.00,
        type: 'income',
        category: 'Consulting',
        merchant: 'Venture Capital Dividend',
        date: '2026-10-29',
        description: 'Quarterly board dividend',
        status: 'posted'
      });
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('Kotak Mahindra Wealth');
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].merchant).toBe('Venture Capital Dividend');
    expect(result.current.metrics.totalIncome).toBe(85000.00);

    // 2. Register User B (Priya)
    await act(async () => {
      await result.current.registerUser('priya@tech.in', 'Priya Rao', 'PriyaPass123!');
    });
    const userBId = result.current.currentUser!.id;

    // Verify User B starts with clean workspace and sees NONE of User A's data
    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.metrics.totalIncome).toBe(0);

    // Add private transaction for User B
    act(() => {
      result.current.addAccount({
        name: 'ICICI iMobile Savings',
        institution: 'ICICI Bank',
        type: 'savings',
        balance: 90000.00,
        currency: 'INR',
        accountNumberMask: '•••• 8812'
      });
      result.current.addTransaction({
        accountId: 'acc-priya-1',
        amount: 3200.00,
        type: 'expense',
        category: 'Travel',
        merchant: 'Uber Technologies India',
        date: '2026-10-29',
        description: 'Airport ride',
        status: 'posted'
      });
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('ICICI iMobile Savings');
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].merchant).toBe('Uber Technologies India');
    expect(result.current.metrics.totalExpenses).toBe(3200.00);

    // 3. Switch back to User A
    await act(async () => {
      await result.current.switchUserDirectly(userAId);
    });

    // Verify User A's exact financial state is restored with 100% precision
    expect(result.current.currentUser?.id).toBe(userAId);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('Kotak Mahindra Wealth');
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].merchant).toBe('Venture Capital Dividend');
    expect(result.current.metrics.totalIncome).toBe(85000.00);
    expect(result.current.metrics.totalExpenses).toBe(0); // None of User B's Uber expense

    // 4. Switch back to User B
    await act(async () => {
      await result.current.switchUserDirectly(userBId);
    });

    // Verify User B's state is preserved without User A's data
    expect(result.current.currentUser?.id).toBe(userBId);
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('ICICI iMobile Savings');
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].merchant).toBe('Uber Technologies India');
    expect(result.current.metrics.totalExpenses).toBe(3200.00);
    expect(result.current.metrics.totalIncome).toBe(0);
  });

  it('logs out to guest session and allows re-login without data loss', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // Register user
    await act(async () => {
      await result.current.registerUser('rohit@finance.in', 'Rohit Sharma', 'Rohit12345!');
    });

    // Add account
    act(() => {
      result.current.addAccount({
        name: 'Axis Bank Burgundy',
        institution: 'Axis Bank',
        type: 'checking',
        balance: 275000.00,
        currency: 'INR',
        accountNumberMask: '•••• 5521'
      });
    });

    expect(result.current.accounts).toHaveLength(1);

    // Logout
    act(() => {
      result.current.logoutUser();
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.accounts).toHaveLength(0);

    // Re-login
    await act(async () => {
      await result.current.loginUser('rohit@finance.in', 'Rohit12345!');
    });

    expect(result.current.currentUser?.fullName).toBe('Rohit Sharma');
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].name).toBe('Axis Bank Burgundy');
    expect(result.current.accounts[0].balance).toBe(275000.00);
  });

  it('lists registered profiles for client-side user switching', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('member1@finn.in', 'Member One', 'Password123!');
    });

    const profiles = result.current.registeredUsers;
    expect(profiles.length).toBeGreaterThanOrEqual(2); // Demo + Member One
    expect(profiles.some(p => p.email === 'chanakya@finn.in')).toBe(true);
    expect(profiles.some(p => p.email === 'member1@finn.in')).toBe(true);
  });
});
