import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('Dashboard Reactivity & Financial Calculation Precision', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with authoritative baseline metrics in demo environment', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    expect(result.current.metrics.totalNetWorth).toBeGreaterThan(0);
    expect(result.current.metrics.liquidCash).toBe(342800.50 + 550000.00); // 892800.50
    expect(result.current.metrics.totalDebt).toBe(24150.00);
    expect(result.current.metrics.totalIncome).toBe(181400.00); // Infosys payroll (175k) + TCS dividends (6.4k)
    expect(result.current.metrics.totalExpenses).toBeGreaterThan(0);
  });

  it('updates totalExpenses, liquidCash, and netSavings immediately when recording an expense', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const initialExpenses = result.current.metrics.totalExpenses;
    const initialLiquid = result.current.metrics.liquidCash;
    const initialNetSavings = result.current.metrics.netSavings;
    const initialHdfcAcc = result.current.accounts.find(a => a.id === 'acc-1')!;
    const initialHdfcBalance = initialHdfcAcc.balance;

    const expenseAmount = 4500.50;

    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        amount: expenseAmount,
        type: 'expense',
        category: 'Dining',
        merchant: 'Olive Bistro Bangalore',
        date: '2026-10-29',
        description: 'Team dinner celebration',
        status: 'posted'
      });
    });

    // Exact numeric assertions
    expect(result.current.metrics.totalExpenses).toBe(Number((initialExpenses + expenseAmount).toFixed(2)));
    expect(result.current.metrics.netSavings).toBe(Number((initialNetSavings - expenseAmount).toFixed(2)));
    
    // Account balance deducted
    const updatedHdfc = result.current.accounts.find(a => a.id === 'acc-1')!;
    expect(updatedHdfc.balance).toBe(Number((initialHdfcBalance - expenseAmount).toFixed(2)));
    expect(result.current.metrics.liquidCash).toBe(Number((initialLiquid - expenseAmount).toFixed(2)));

    // Dynamic category spending updated
    const diningCategory = result.current.categorySpending.find(c => c.name.toLowerCase().includes('dining'));
    expect(diningCategory).toBeDefined();
    expect(diningCategory!.amount).toBeGreaterThanOrEqual(expenseAmount);
  });

  it('updates totalIncome and netSavings immediately when recording an income transaction', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const initialIncome = result.current.metrics.totalIncome;
    const initialNetSavings = result.current.metrics.netSavings;
    const initialLiquid = result.current.metrics.liquidCash;
    const initialNetWorth = result.current.metrics.totalNetWorth;

    const consultingFee = 45000.00;

    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        amount: consultingFee,
        type: 'income',
        category: 'Freelance',
        merchant: 'Acme Advisory Services',
        date: '2026-10-29',
        description: 'Fintech architectural consultation',
        status: 'posted'
      });
    });

    expect(result.current.metrics.totalIncome).toBe(initialIncome + consultingFee);
    expect(result.current.metrics.netSavings).toBe(initialNetSavings + consultingFee);
    expect(result.current.metrics.liquidCash).toBe(initialLiquid + consultingFee);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth + consultingFee);
  });

  it('refund reduces gross expenditures and increases net savings and cash', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const initialExpenses = result.current.metrics.totalExpenses;
    const initialSavings = result.current.metrics.netSavings;
    const refundAmount = 1420.00;

    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        amount: refundAmount,
        type: 'refund',
        category: 'Groceries',
        merchant: 'Nature Basket Refund',
        date: '2026-10-29',
        description: 'Duplicate charge reimbursement',
        status: 'posted'
      });
    });

    expect(result.current.metrics.totalExpenses).toBe(Number((initialExpenses - refundAmount).toFixed(2)));
    expect(result.current.metrics.netSavings).toBe(Number((initialSavings + refundAmount).toFixed(2)));
  });

  it('internal transfers do not inflate income or expenses, and preserve total net worth', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const initialIncome = result.current.metrics.totalIncome;
    const initialExpenses = result.current.metrics.totalExpenses;
    const initialNetWorth = result.current.metrics.totalNetWorth;
    const initialAcc1 = result.current.accounts.find(a => a.id === 'acc-1')!.balance;
    const initialAcc2 = result.current.accounts.find(a => a.id === 'acc-2')!.balance;

    const transferAmount = 25000.00;

    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        destinationAccountId: 'acc-2',
        amount: transferAmount,
        type: 'transfer',
        category: 'Savings',
        merchant: 'Internal HDFC to SBI Transfer',
        date: '2026-10-29',
        description: 'Emergency buffer replenishment',
        status: 'posted'
      });
    });

    // Zero income/expense inflation
    expect(result.current.metrics.totalIncome).toBe(initialIncome);
    expect(result.current.metrics.totalExpenses).toBe(initialExpenses);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);

    // Source account debited, destination credited
    expect(result.current.accounts.find(a => a.id === 'acc-1')!.balance).toBe(initialAcc1 - transferAmount);
    expect(result.current.accounts.find(a => a.id === 'acc-2')!.balance).toBe(initialAcc2 + transferAmount);
  });

  it('investment contribution transfers liquid cash to investment account without reducing total net worth', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const initialNetWorth = result.current.metrics.totalNetWorth;
    const initialInvested = result.current.metrics.totalInvested;
    const initialLiquid = result.current.metrics.liquidCash;
    const initialIncome = result.current.metrics.totalIncome;
    const initialExpenses = result.current.metrics.totalExpenses;

    const sipAmount = 30000.00;

    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        destinationAccountId: 'acc-4', // Zerodha Kite Demat
        amount: sipAmount,
        type: 'investment_contribution',
        category: 'Investments',
        merchant: 'Zerodha Coin Monthly SIP',
        date: '2026-10-29',
        description: 'Nifty 50 Index Fund contribution',
        status: 'posted'
      });
    });

    // Net worth must be strictly preserved
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);
    // Liquid cash drops, invested portfolio increases
    expect(result.current.metrics.liquidCash).toBe(initialLiquid - sipAmount);
    expect(result.current.metrics.totalInvested).toBe(initialInvested + sipAmount);
    // Income and expenses must not be affected
    expect(result.current.metrics.totalIncome).toBe(initialIncome);
    expect(result.current.metrics.totalExpenses).toBe(initialExpenses);
  });

  it('handles credit card positive balance as liquid asset rather than debt', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // Set credit card account to positive balance (+5000 overpayment)
    act(() => {
      result.current.addAccount({
        name: 'Sapphire Preferred',
        institution: 'HDFC Bank',
        type: 'credit',
        balance: 5000.00, // overpayment credit
        currency: 'INR',
        accountNumberMask: '•••• 9999'
      });
    });

    // Total debt should NOT count positive balance as debt
    expect(result.current.metrics.totalDebt).toBe(24150.00); // only the existing negative CC
    // Liquid cash should include the 5000 overpayment credit
    expect(result.current.metrics.liquidCash).toBeGreaterThanOrEqual(892800.50 + 5000.00);
  });

  it('reverses transaction effects on account balance and budget spent when deleted', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    // Find first expense transaction
    const targetTx = result.current.transactions.find(t => t.type === 'expense')!;
    const txAmount = targetTx.amount;
    const targetAcc = result.current.accounts.find(a => a.id === targetTx.accountId)!;
    const initialBalance = targetAcc.balance;
    const initialExpenses = result.current.metrics.totalExpenses;

    act(() => {
      result.current.deleteTransaction(targetTx.id);
    });

    // Account balance credited back
    const updatedAcc = result.current.accounts.find(a => a.id === targetTx.accountId)!;
    expect(updatedAcc.balance).toBe(Number((initialBalance + txAmount).toFixed(2)));
    // Total expenses reduced
    expect(result.current.metrics.totalExpenses).toBe(Number((initialExpenses - txAmount).toFixed(2)));
  });

  it('reconciles account balance and skips duplicates upon CSV statement import', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const targetAccount = result.current.accounts.find(a => a.id === 'acc-1')!;
    const initialBalance = targetAccount.balance;
    const initialTxCount = result.current.transactions.length;

    // Sample statement CSV with 1 salary credit, 1 unique expense, and 1 duplicate existing transaction
    const csvData = `Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
28/10/2026,Infosys Technologies Payroll,UPI-INF-9918,28/10/2026,,175000.00,517800.50
29/10/2026,Apollo Pharmacy Health Meds,UPI-APO-8812,29/10/2026,1250.00,,516550.50
29/10/2026,Client Advisory Retainer,NEFT-ADV-4412,29/10/2026,,50000.00,566550.50`;

    let importResult: any;
    act(() => {
      importResult = result.current.importStatementCsv(csvData, 'acc-1');
    });

    // 1 duplicate skipped (Infosys 175000 on 2026-10-28 already exists in mockData)
    expect(importResult.duplicates).toBe(1);
    expect(importResult.imported).toBe(2);

    // Balance delta: +50,000 - 1,250 = +48,750
    const updatedAccount = result.current.accounts.find(a => a.id === 'acc-1')!;
    expect(updatedAccount.balance).toBe(Number((initialBalance + 48750.00).toFixed(2)));
    expect(result.current.transactions.length).toBe(initialTxCount + 2);
  });
});
