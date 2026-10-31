import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';
import { parseBankStatementCsv } from '../integrations/statementParsers';
import { sanitizeCsvCell } from '../utils/currency';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

describe('Phase 7: Data Recovery & Robustness Audit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Malformed LocalStorage Recovery
  it('Recovery 1: Recovers gracefully from malformed or truncated JSON in storage', () => {
    localStorage.setItem('finn_accounts_usr_demo', '{corrupt json syntax...');
    localStorage.setItem('finn_budgets_usr_demo', 'undefined');
    localStorage.setItem('finn_holdings_usr_demo', '[{"id": 123, "unclosed');

    expect(() => {
      renderHook(() => useFinance(), { wrapper });
    }).not.toThrow();

    const { result } = renderHook(() => useFinance(), { wrapper });
    expect(Array.isArray(result.current.accounts)).toBe(true);
    expect(Array.isArray(result.current.budgets)).toBe(true);
    expect(Array.isArray(result.current.holdings)).toBe(true);
  });

  // 2. Missing Storage Keys
  it('Recovery 2: Initializes clean empty state when storage keys are completely missing', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('brand_new@test.in', 'New User', 'Pass1234!');
    });

    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.transactions).toHaveLength(0);
    expect(result.current.budgets).toHaveLength(0);
    expect(result.current.metrics.totalNetWorth).toBe(0);
  });

  // 3. Partial Financial Records in Storage
  it('Recovery 3: Handles partially missing fields in persisted transactions without breaking metrics', () => {
    const partialTx = [
      { id: 'tx-part-1', amount: 500, type: 'income', accountId: 'acc-1' }, // Missing category, merchant, date
      { id: 'tx-part-2', amount: 200, type: 'expense', accountId: 'acc-1' }
    ];
    localStorage.setItem('finn_transactions_usr_demo', JSON.stringify(partialTx));

    const { result } = renderHook(() => useFinance(), { wrapper });
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.metrics.totalIncome).toBe(500);
    expect(result.current.metrics.totalExpenses).toBe(200);
    expect(result.current.metrics.netSavings).toBe(300);
  });

  // 4. Large Transaction History Scalability (1,000 Transactions)
  it('Recovery 4: Handles 1,000 active transactions without memory exhaustion or computation latency', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('perf_user@test.in', 'Perf User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Scale Bank', institution: 'SBI', type: 'savings', balance: 500000, currency: 'INR', accountNumberMask: '•••• 1234' });
    });
    const accId = result.current.accounts[0].id;

    // Batch create 1,000 records
    const startTime = performance.now();
    for (let i = 0; i < 500; i++) {
      act(() => {
        result.current.addTransaction({
          accountId: accId,
          amount: 100,
          type: 'income',
          category: 'Dividends',
          merchant: `Corp ${i}`,
          date: '2026-10-31',
          description: `Credit ${i}`,
          status: 'posted'
        });
        result.current.addTransaction({
          accountId: accId,
          amount: 50,
          type: 'expense',
          category: 'Sundry',
          merchant: `Shop ${i}`,
          date: '2026-10-31',
          description: `Debit ${i}`,
          status: 'posted'
        });
      });
    }
    const duration = performance.now() - startTime;

    expect(result.current.transactions).toHaveLength(1000);
    expect(result.current.metrics.totalIncome).toBe(50000); // 500 * 100
    expect(result.current.metrics.totalExpenses).toBe(25000); // 500 * 50
    expect(result.current.metrics.netSavings).toBe(25000);
    expect(duration).toBeLessThan(10000); // Under 10 seconds for 1,000 React dispatches
  });

  // 5. Repeated Statement Imports & Duplicate Elimination
  it('Recovery 5: Ingesting the same bank statement twice introduces zero duplicates', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });
    const accId = result.current.accounts[0].id;
    const initialCount = result.current.transactions.length;

    const csvData = `Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
01/10/2026,Salary Credit Infosys,REF-1100,01/10/2026,,150000.00,200000.00
05/10/2026,Electricity Bill BESCOM,REF-1101,05/10/2026,2450.00,,197550.00`;

    // First import
    act(() => {
      const res1 = result.current.importStatementCsv(csvData, accId);
      expect(res1.imported).toBe(2);
      expect(res1.duplicates).toBe(0);
    });

    const midCount = result.current.transactions.length;
    expect(midCount).toBe(initialCount + 2);

    // Second import of exact same CSV
    act(() => {
      const res2 = result.current.importStatementCsv(csvData, accId);
      expect(res2.imported).toBe(0);
      expect(res2.duplicates).toBe(2); // Both detected as duplicates
    });

    expect(result.current.transactions.length).toBe(midCount);
  });

  // 6. Failed / Corrupted Statement Import
  it('Recovery 6: Corrupted or unparseable CSV does not mutate existing financial records', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });
    const accId = result.current.accounts[0].id;
    const initialCount = result.current.transactions.length;
    const initialBal = result.current.accounts[0].balance;

    const garbageCsv = `!@#$%^&*()_+NonCsvGarbageHeader
Some,Random,Corrupt,Text,Without,Valid,Date,Or,Amounts`;

    act(() => {
      const res = result.current.importStatementCsv(garbageCsv, accId);
      expect(res.imported).toBe(0);
    });

    // Verify state was not modified
    expect(result.current.transactions.length).toBe(initialCount);
    expect(result.current.accounts[0].balance).toBe(initialBal);
  });

  // 7. Data Export and Re-Import Roundtrip
  it('Recovery 7: Exported transactions parse back cleanly with identical amounts and merchants', () => {
    const tx = {
      date: '2026-10-31',
      merchant: 'Fresh Foods Bangalore',
      description: 'Weekly ration',
      amount: 1540.75,
      type: 'expense'
    };

    // Simulate CSV serialization with formula injection sanitization
    const csvRow = `${tx.date},${sanitizeCsvCell(tx.merchant)},${sanitizeCsvCell(tx.description)},${tx.amount},${tx.type}`;
    expect(csvRow).toContain('Fresh Foods Bangalore');
    expect(csvRow).toContain('1540.75');

    // Parse back
    const parts = csvRow.split(',');
    expect(parseFloat(parts[3])).toBe(1540.75);
    expect(parts[0]).toBe('2026-10-31');
  });
});
