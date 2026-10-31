import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('Phase 4 Auditor: Data Integrity, Malformed Data & Atomic Recovery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Gracefully recovers from malformed/corrupted JSON in localStorage without application crash', () => {
    // Inject corrupt JSON into storage keys
    localStorage.setItem('finn_accounts_usr_demo', '{corrupt json!!!');
    localStorage.setItem('finn_transactions_usr_demo', '["not closed json');

    // App must not throw uncaught syntax error; it must catch and fallback to defaults cleanly
    expect(() => {
      renderHook(() => useFinance(), { wrapper });
    }).not.toThrow();

    const { result } = renderHook(() => useFinance(), { wrapper });
    expect(result.current.accounts).toBeDefined();
    expect(result.current.transactions).toBeDefined();
  });

  it('Handles atomic reversal on internal transfer without creating phantom money or balance leakage', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    const acc1 = result.current.accounts.find(a => a.id === 'acc-1')!;
    const acc2 = result.current.accounts.find(a => a.id === 'acc-2')!;
    const startBal1 = acc1.balance;
    const startBal2 = acc2.balance;
    const initialNetWorth = result.current.metrics.totalNetWorth;

    const transferAmount = 40000.00;

    // 1. Post Transfer
    act(() => {
      result.current.addTransaction({
        accountId: 'acc-1',
        destinationAccountId: 'acc-2',
        amount: transferAmount,
        type: 'transfer',
        category: 'Savings',
        merchant: 'HDFC to SBI Move',
        date: '2026-10-31',
        description: 'Buffer transfer',
        status: 'posted'
      });
    });

    const transferTxId = result.current.transactions[0].id;
    expect(result.current.accounts.find(a => a.id === 'acc-1')!.balance).toBe(startBal1 - transferAmount);
    expect(result.current.accounts.find(a => a.id === 'acc-2')!.balance).toBe(startBal2 + transferAmount);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);

    // 2. Edit Transfer Amount from 40k to 55k
    act(() => {
      result.current.updateTransaction(transferTxId, {
        amount: 55000.00
      });
    });

    expect(result.current.accounts.find(a => a.id === 'acc-1')!.balance).toBe(startBal1 - 55000.00);
    expect(result.current.accounts.find(a => a.id === 'acc-2')!.balance).toBe(startBal2 + 55000.00);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);

    // 3. Delete Transfer -> Both accounts must be restored to their exact original balances
    act(() => {
      result.current.deleteTransaction(transferTxId);
    });

    expect(result.current.accounts.find(a => a.id === 'acc-1')!.balance).toBe(startBal1);
    expect(result.current.accounts.find(a => a.id === 'acc-2')!.balance).toBe(startBal2);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);
  });
});
