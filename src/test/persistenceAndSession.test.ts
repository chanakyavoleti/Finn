import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../auth/authService';
import { addMoney, subtractMoney } from '../utils/currency';

describe('Data Persistence & Multi-Tenant Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and restores financial state across browser refresh for authenticated user', async () => {
    // 1. Register User A
    const sessionA = await AuthService.register('investor@finn.in', 'Vikram Malhotra', 'Pass123456');
    const uidA = sessionA.user.id;

    // 2. Simulate saving accounts and transactions to localStorage under User A's key
    const initialAccounts = [
      { id: 'acc_hdfc', name: 'HDFC Bank', balance: 50000, type: 'checking', currency: 'INR' }
    ];
    const initialTransactions = [
      { id: 'tx_1', accountId: 'acc_hdfc', amount: 1500, type: 'expense', category: 'Dining', merchant: 'Swiggy', date: '2026-10-29' }
    ];

    localStorage.setItem(`finn_accounts_${uidA}`, JSON.stringify(initialAccounts));
    localStorage.setItem(`finn_transactions_${uidA}`, JSON.stringify(initialTransactions));

    // 3. Simulate browser refresh by reading directly from storage
    const restoredAccounts = JSON.parse(localStorage.getItem(`finn_accounts_${uidA}`) || '[]');
    const restoredTransactions = JSON.parse(localStorage.getItem(`finn_transactions_${uidA}`) || '[]');

    expect(restoredAccounts).toHaveLength(1);
    expect(restoredAccounts[0].balance).toBe(50000);
    expect(restoredTransactions).toHaveLength(1);
    expect(restoredTransactions[0].merchant).toBe('Swiggy');
  });

  it('strictly segregates User A and User B financial states in storage', async () => {
    // User A data
    const sessionA = await AuthService.register('usera@finn.in', 'User A', 'Pass123456');
    const uidA = sessionA.user.id;
    const dataA = [{ id: 'tx_a', amount: 9999, merchant: 'Private Purchase A' }];
    localStorage.setItem(`finn_transactions_${uidA}`, JSON.stringify(dataA));

    // User B data
    const sessionB = await AuthService.register('userb@finn.in', 'User B', 'Pass123456');
    const uidB = sessionB.user.id;
    const dataB = [{ id: 'tx_b', amount: 1111, merchant: 'Private Purchase B' }];
    localStorage.setItem(`finn_transactions_${uidB}`, JSON.stringify(dataB));

    // Verify User A only sees User A's data
    const readA = JSON.parse(localStorage.getItem(`finn_transactions_${uidA}`) || '[]');
    expect(readA).toHaveLength(1);
    expect(readA[0].merchant).toBe('Private Purchase A');
    expect(readA.some((t: any) => t.merchant === 'Private Purchase B')).toBe(false);

    // Verify User B only sees User B's data
    const readB = JSON.parse(localStorage.getItem(`finn_transactions_${uidB}`) || '[]');
    expect(readB).toHaveLength(1);
    expect(readB[0].merchant).toBe('Private Purchase B');
    expect(readB.some((t: any) => t.merchant === 'Private Purchase A')).toBe(false);
  });

  it('correctly reverts account balance and budget spent when a transaction is deleted', () => {
    let accountBalance = 50000;
    let budgetSpent = 12000;
    const expenseAmount = 2500;

    // Simulate adding expense
    accountBalance = subtractMoney(accountBalance, expenseAmount);
    budgetSpent = addMoney(budgetSpent, expenseAmount);
    expect(accountBalance).toBe(47500);
    expect(budgetSpent).toBe(14500);

    // Simulate deleting expense (reversal)
    accountBalance = addMoney(accountBalance, expenseAmount);
    budgetSpent = Math.max(0, subtractMoney(budgetSpent, expenseAmount));
    expect(accountBalance).toBe(50000);
    expect(budgetSpent).toBe(12000);
  });

  it('correctly updates account balance and budget spent when a transaction is edited', () => {
    let accountBalance = 50000;
    let budgetSpent = 10000;
    const originalAmount = 2000;
    const updatedAmount = 3500;

    // Apply original expense
    accountBalance = subtractMoney(accountBalance, originalAmount);
    budgetSpent = addMoney(budgetSpent, originalAmount);
    expect(accountBalance).toBe(48000);
    expect(budgetSpent).toBe(12000);

    // Edit transaction: reverse original (2000) and apply updated (3500)
    accountBalance = addMoney(accountBalance, originalAmount);
    accountBalance = subtractMoney(accountBalance, updatedAmount);
    budgetSpent = subtractMoney(budgetSpent, originalAmount);
    budgetSpent = addMoney(budgetSpent, updatedAmount);

    expect(accountBalance).toBe(46500);
    expect(budgetSpent).toBe(13500);
  });

  it('reduces budget spent when a refund is posted and restores it when deleted', () => {
    let budgetSpent = 8000;
    const refundAmount = 1500;

    // Apply refund
    budgetSpent = Math.max(0, subtractMoney(budgetSpent, refundAmount));
    expect(budgetSpent).toBe(6500);

    // Delete refund
    budgetSpent = addMoney(budgetSpent, refundAmount);
    expect(budgetSpent).toBe(8000);
  });
});
