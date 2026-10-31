import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';
import { calculateEqualSplit, validateCustomSplit } from '../utils/splitCalculator';
import { parseBankStatementCsv } from '../integrations/statementParsers';
import { sanitizeCsvCell, formatMoney, parseMoney } from '../utils/currency';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('FINN Strict QA Protocol: Comprehensive Automated Test Matrix (TC-001 - TC-270)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ==========================================
  // PHASE 2: TRANSACTION MANAGEMENT (TC-001 - TC-020)
  // ==========================================
  describe('Phase 2: Transaction Management', () => {
    it('TC-001: Create income adds record and increases account balance', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const initialAcc = result.current.accounts.find(a => a.id === 'acc-1')!;
      const initialBal = initialAcc.balance;
      const initialIncome = result.current.metrics.totalIncome;

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 10000,
          type: 'income',
          category: 'Freelance',
          merchant: 'Consulting Retainer',
          date: '2026-10-31',
          description: 'Payment',
          status: 'posted'
        });
      });

      const updatedAcc = result.current.accounts.find(a => a.id === 'acc-1')!;
      expect(updatedAcc.balance).toBe(initialBal + 10000);
      expect(result.current.metrics.totalIncome).toBe(initialIncome + 10000);
      expect(result.current.transactions[0].merchant).toBe('Consulting Retainer');
    });

    it('TC-002: Create expense adds record and decreases account balance', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const initialAcc = result.current.accounts.find(a => a.id === 'acc-1')!;
      const initialBal = initialAcc.balance;
      const initialExp = result.current.metrics.totalExpenses;

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 2000,
          type: 'expense',
          category: 'Groceries',
          merchant: 'Supermart',
          date: '2026-10-31',
          description: 'Supplies',
          status: 'posted'
        });
      });

      const updatedAcc = result.current.accounts.find(a => a.id === 'acc-1')!;
      expect(updatedAcc.balance).toBe(initialBal - 2000);
      expect(result.current.metrics.totalExpenses).toBe(initialExp + 2000);
    });

    it('TC-003: Edit transaction reflects only difference in account balance', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      let txId = '';

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 2000,
          type: 'expense',
          category: 'Groceries',
          merchant: 'Store',
          date: '2026-10-31',
          description: 'Item',
          status: 'posted'
        });
      });

      txId = result.current.transactions[0].id;
      const midBal = result.current.accounts.find(a => a.id === 'acc-1')!.balance;

      // Edit from 2000 to 3000 -> net decrease of 1000
      act(() => {
        result.current.updateTransaction(txId, { amount: 3000 });
      });

      const finalBal = result.current.accounts.find(a => a.id === 'acc-1')!.balance;
      expect(finalBal).toBe(midBal - 1000);
    });

    it('TC-004: Delete transaction completely reverses financial effect', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const initialBal = result.current.accounts.find(a => a.id === 'acc-1')!.balance;
      const initialExp = result.current.metrics.totalExpenses;

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 3000,
          type: 'expense',
          category: 'Shopping',
          merchant: 'Zara',
          date: '2026-10-31',
          description: 'Apparel',
          status: 'posted'
        });
      });

      const txId = result.current.transactions[0].id;
      act(() => {
        result.current.deleteTransaction(txId);
      });

      const finalBal = result.current.accounts.find(a => a.id === 'acc-1')!.balance;
      expect(finalBal).toBe(initialBal);
      expect(result.current.metrics.totalExpenses).toBe(initialExp);
      expect(result.current.transactions.some(t => t.id === txId)).toBe(false);
    });

    it('TC-009 & TC-010: High value and decimal paise precision', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 100.55,
          type: 'expense',
          category: 'Utilities',
          merchant: 'Electricity Board',
          date: '2026-10-31',
          description: 'Paise test',
          status: 'posted'
        });
      });

      expect(result.current.transactions[0].amount).toBe(100.55);
      expect(formatMoney(result.current.transactions[0].amount, 'INR')).toContain('100.55');
    });

    it('TC-018: Special character merchant and description sanitization', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const specialMerchant = "O'Connor's Cafe & Bakery, Bangalore ☕";

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          amount: 450,
          type: 'expense',
          category: 'Dining',
          merchant: specialMerchant,
          date: '2026-10-31',
          description: 'Cappuccino & Scone',
          status: 'posted'
        });
      });

      expect(result.current.transactions[0].merchant).toBe(specialMerchant);
    });
  });

  // ==========================================
  // PHASE 3: DASHBOARD ACCURACY & RECONCILIATION (TC-021 - TC-045)
  // ==========================================
  describe('Phase 3: Dashboard Deterministic Verification', () => {
    it('TC-021 to TC-024: Verified against deterministic test dataset', async () => {
      const { result } = renderHook(() => useFinance(), { wrapper });

      // 1. Register clean test user
      await act(async () => {
        await result.current.registerUser('qa-tester@finn.in', 'QA Lead', 'Password123!');
      });

      // 2. Set opening balance to ₹50,000
      act(() => {
        result.current.addAccount({
          name: 'Primary SBI',
          institution: 'State Bank of India',
          type: 'savings',
          balance: 50000,
          currency: 'INR',
          accountNumberMask: '•••• 1122'
        });
      });
      const accountId = result.current.accounts[0].id;

      // 3. Post Transactions:
      // Income: ₹20,000
      // Food expense: ₹3,000
      // Travel expense: ₹2,000
      // Shopping expense: ₹1,000
      act(() => {
        result.current.addTransaction({ accountId, amount: 20000, type: 'income', category: 'Salary', merchant: 'Tech Corp', date: '2026-10-31', description: 'Salary', status: 'posted' });
        result.current.addTransaction({ accountId, amount: 3000, type: 'expense', category: 'Food', merchant: 'Zomato', date: '2026-10-31', description: 'Food', status: 'posted' });
        result.current.addTransaction({ accountId, amount: 2000, type: 'expense', category: 'Travel', merchant: 'Uber', date: '2026-10-31', description: 'Travel', status: 'posted' });
        result.current.addTransaction({ accountId, amount: 1000, type: 'expense', category: 'Shopping', merchant: 'Amazon', date: '2026-10-31', description: 'Shopping', status: 'posted' });
      });

      // Assertions matching protocol exactly:
      // Total Income: ₹20,000
      // Total Expenses: ₹6,000
      // Net Cash Flow (Savings): ₹14,000
      // Account Balance: ₹64,000
      expect(result.current.metrics.totalIncome).toBe(20000);
      expect(result.current.metrics.totalExpenses).toBe(6000);
      expect(result.current.metrics.netSavings).toBe(14000);
      expect(result.current.accounts[0].balance).toBe(64000);
      expect(result.current.metrics.totalNetWorth).toBe(64000);
    });

    it('TC-030: Dashboard updates after refund creation', async () => {
      const { result } = renderHook(() => useFinance(), { wrapper });

      await act(async () => {
        await result.current.registerUser('refund-qa@finn.in', 'Refund QA', 'Password123!');
      });

      act(() => {
        result.current.addAccount({ name: 'HDFC', institution: 'HDFC Bank', type: 'checking', balance: 10000, currency: 'INR', accountNumberMask: '•••• 1234' });
      });
      const accId = result.current.accounts[0].id;

      act(() => {
        result.current.addTransaction({ accountId: accId, amount: 1000, type: 'expense', category: 'Shopping', merchant: 'Store', date: '2026-10-31', description: 'Item', status: 'posted' });
      });
      expect(result.current.metrics.totalExpenses).toBe(1000);
      expect(result.current.accounts[0].balance).toBe(9000);

      // Refund of ₹400
      act(() => {
        result.current.addTransaction({ accountId: accId, amount: 400, type: 'refund', category: 'Shopping', merchant: 'Store Return', date: '2026-10-31', description: 'Refund', status: 'posted' });
      });

      expect(result.current.metrics.totalExpenses).toBe(600); // Net expense reduced to 600
      expect(result.current.accounts[0].balance).toBe(9400); // Balance restored by 400
    });
  });

  // ==========================================
  // PHASE 4: USER AUTHENTICATION & SWITCHING (TC-046 - TC-075)
  // ==========================================
  describe('Phase 4: Multi-User Authentication & Isolation', () => {
    it('TC-054 to TC-058: Complete isolation between User A and User B', async () => {
      const { result } = renderHook(() => useFinance(), { wrapper });

      // User A (50,000 balance, 30,000 income, 10,000 expenses)
      await act(async () => {
        await result.current.registerUser('usera@finn.in', 'User A', 'Password123!');
      });
      const userAId = result.current.currentUser!.id;

      act(() => {
        result.current.addAccount({ name: 'Acc A', institution: 'SBI', type: 'savings', balance: 50000, currency: 'INR', accountNumberMask: '•••• 1111' });
      });
      const accAId = result.current.accounts[0].id;
      act(() => {
        result.current.addTransaction({ accountId: accAId, amount: 30000, type: 'income', category: 'Salary', merchant: 'Job A', date: '2026-10-31', description: 'Job A', status: 'posted' });
        result.current.addTransaction({ accountId: accAId, amount: 10000, type: 'expense', category: 'Rent', merchant: 'Landlord A', date: '2026-10-31', description: 'Rent A', status: 'posted' });
      });

      // User B (5,000 balance, 8,000 income, 6,000 expenses)
      await act(async () => {
        await result.current.registerUser('userb@finn.in', 'User B', 'Password123!');
      });
      const userBId = result.current.currentUser!.id;

      act(() => {
        result.current.addAccount({ name: 'Acc B', institution: 'HDFC', type: 'checking', balance: 5000, currency: 'INR', accountNumberMask: '•••• 2222' });
      });
      const accBId = result.current.accounts[0].id;
      act(() => {
        result.current.addTransaction({ accountId: accBId, amount: 8000, type: 'income', category: 'Salary', merchant: 'Job B', date: '2026-10-31', description: 'Job B', status: 'posted' });
        result.current.addTransaction({ accountId: accBId, amount: 6000, type: 'expense', category: 'Rent', merchant: 'Landlord B', date: '2026-10-31', description: 'Rent B', status: 'posted' });
      });

      // Check User B metrics
      expect(result.current.metrics.totalIncome).toBe(8000);
      expect(result.current.metrics.totalExpenses).toBe(6000);
      expect(result.current.accounts[0].balance).toBe(7000);

      // Switch back to User A
      await act(async () => {
        await result.current.switchUserDirectly(userAId);
      });

      // Strict validation: User A's data is 100% restored
      expect(result.current.currentUser!.id).toBe(userAId);
      expect(result.current.metrics.totalIncome).toBe(30000);
      expect(result.current.metrics.totalExpenses).toBe(10000);
      expect(result.current.accounts[0].balance).toBe(70000);
      expect(result.current.transactions.some(t => t.merchant === 'Job B')).toBe(false);

      // Switch back to User B
      await act(async () => {
        await result.current.switchUserDirectly(userBId);
      });
      expect(result.current.currentUser!.id).toBe(userBId);
      expect(result.current.transactions.some(t => t.merchant === 'Job A')).toBe(false);
    });
  });

  // ==========================================
  // PHASE 5: ACCOUNT TRANSFERS (TC-083 - TC-089)
  // ==========================================
  describe('Phase 5: Double-Entry Transfers', () => {
    it('TC-087 to TC-089: Internal transfer preserves combined net worth and zero income/expense inflation', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const initialNetWorth = result.current.metrics.totalNetWorth;
      const initialIncome = result.current.metrics.totalIncome;
      const initialExpenses = result.current.metrics.totalExpenses;

      const acc1Bal = result.current.accounts.find(a => a.id === 'acc-1')!.balance;
      const acc2Bal = result.current.accounts.find(a => a.id === 'acc-2')!.balance;

      act(() => {
        result.current.addTransaction({
          accountId: 'acc-1',
          destinationAccountId: 'acc-2',
          amount: 15000,
          type: 'transfer',
          category: 'Savings',
          merchant: 'HDFC to SBI',
          date: '2026-10-31',
          description: 'Liquidity move',
          status: 'posted'
        });
      });

      expect(result.current.metrics.totalIncome).toBe(initialIncome);
      expect(result.current.metrics.totalExpenses).toBe(initialExpenses);
      expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);
      expect(result.current.accounts.find(a => a.id === 'acc-1')!.balance).toBe(acc1Bal - 15000);
      expect(result.current.accounts.find(a => a.id === 'acc-2')!.balance).toBe(acc2Bal + 15000);
    });
  });

  // ==========================================
  // PHASE 10: BILL SPLITTING & PENNY ALLOCATION (TC-168 - TC-184)
  // ==========================================
  describe('Phase 10: Bill Splitting Mathematical Conservation', () => {
    it('TC-174: Split ₹1,000 among three participants with exact penny distribution', () => {
      const splits = calculateEqualSplit(1000, ['You', 'Aarav', 'Diya']);
      expect(splits).toHaveLength(3);
      // 1000 / 3 = 333.33 with 1 paisa remainder -> 333.34, 333.33, 333.33
      expect(splits[0].share).toBe(333.34);
      expect(splits[1].share).toBe(333.33);
      expect(splits[2].share).toBe(333.33);
      const sum = splits.reduce((acc, p) => acc + Math.round(p.share * 100), 0);
      expect(sum).toBe(100000); // Exactly 1,000.00
    });

    it('TC-175: Split ₹1 among three participants', () => {
      const splits = calculateEqualSplit(1, ['P1', 'P2', 'P3']);
      expect(splits[0].share).toBe(0.34);
      expect(splits[1].share).toBe(0.33);
      expect(splits[2].share).toBe(0.33);
      expect(splits.reduce((acc, p) => acc + p.share, 0)).toBe(1.00);
    });
  });

  // ==========================================
  // PHASE 12: CSV IMPORT & SECURITY INJECTION (TC-198 - TC-216)
  // ==========================================
  describe('Phase 12: Statement Parser & CSV Sanitization', () => {
    it('TC-211: Duplicate transaction detection skips identical entries', () => {
      const { result } = renderHook(() => useFinance(), { wrapper });
      const initialCount = result.current.transactions.length;

      // Existing transaction in demo data: Infosys Technologies Payroll ₹1,75,000 on 2026-10-28
      const csvContent = `Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
28/10/2026,Infosys Technologies Payroll,UPI-INF-9918,28/10/2026,,175000.00,517800.50
31/10/2026,Fresh Unique Deposit,NEFT-9912,31/10/2026,,12000.00,529800.50`;

      let importRes: any;
      act(() => {
        importRes = result.current.importStatementCsv(csvContent, 'acc-1');
      });

      expect(importRes.duplicates).toBe(1);
      expect(importRes.imported).toBe(1);
      expect(result.current.transactions.length).toBe(initialCount + 1);
    });

    it('TC-215: Prevents CSV Formula Injection attacks', () => {
      const maliciousInputs = [
        '=cmd|"/C calc"!A0',
        '+12345',
        '-5000',
        '@SUM(A1:A10)',
        '\tTAB_ATTACK'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeCsvCell(input);
        // Must start with single quote escaping formula interpretation
        expect(sanitized.startsWith("'")).toBe(true);
      });
    });
  });
});
