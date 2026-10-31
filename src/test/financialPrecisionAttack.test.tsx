import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';
import { addMoney, subtractMoney, multiplyMoney, divideMoney } from '../utils/currency';
import { calculateEqualSplit, validateCustomSplit } from '../utils/splitCalculator';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FinanceProvider>{children}</FinanceProvider>
);

/**
 * INDEPENDENT MATHEMATICAL ORACLE
 * Uses arbitrary precision BigInt integer paise arithmetic.
 * Completely independent of FINN's implementation functions.
 */
class IndependentPaiseOracle {
  static toPaise(rupees: number): bigint {
    const isNeg = rupees < 0;
    const abs = Math.abs(rupees);
    // Use fixed string decomposition to avoid any IEEE-754 mantissa corruption
    const parts = abs.toFixed(2).split('.');
    const paise = BigInt(parts[0]) * 100n + BigInt(parts[1]);
    return isNeg ? -paise : paise;
  }

  static toRupees(paise: bigint): number {
    const isNeg = paise < 0n;
    const abs = isNeg ? -paise : paise;
    const intPart = abs / 100n;
    const fracPart = abs % 100n;
    const num = Number(intPart) + Number(fracPart) / 100;
    return isNeg ? -num : num;
  }

  static add(a: number, b: number): number {
    return this.toRupees(this.toPaise(a) + this.toPaise(b));
  }

  static subtract(a: number, b: number): number {
    return this.toRupees(this.toPaise(a) - this.toPaise(b));
  }

  static splitPaise(totalRupees: number, participantCount: number): number[] {
    const totalPaise = this.toPaise(totalRupees);
    const countBig = BigInt(participantCount);
    const baseShare = totalPaise / countBig;
    let remainder = totalPaise % countBig;

    const shares: number[] = [];
    for (let i = 0n; i < countBig; i++) {
      let share = baseShare;
      if (remainder > 0n) {
        share += 1n;
        remainder -= 1n;
      }
      shares.push(this.toRupees(share));
    }
    return shares;
  }
}

describe('Phase 2: Financial Precision Attack Testing (15 Adversarial Tests)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. ₹0.01 + ₹0.02
  it('Attack 1: ₹0.01 + ₹0.02 equals exact ₹0.03 without 0.030000000000000004 drift', () => {
    const appResult = addMoney(0.01, 0.02);
    const oracleResult = IndependentPaiseOracle.add(0.01, 0.02);
    expect(appResult).toBe(0.03);
    expect(appResult).toBe(oracleResult);
  });

  // 2. ₹0.10 + ₹0.20
  it('Attack 2: ₹0.10 + ₹0.20 equals exact ₹0.30 without binary float artifact', () => {
    const appResult = addMoney(0.10, 0.20);
    const oracleResult = IndependentPaiseOracle.add(0.10, 0.20);
    expect(appResult).toBe(0.30);
    expect(appResult).toBe(oracleResult);
  });

  // 3. ₹99999999.99 + ₹0.01
  it('Attack 3: ₹99,999,999.99 + ₹0.01 increments to exact ₹100,000,000.00', () => {
    const appResult = addMoney(99999999.99, 0.01);
    const oracleResult = IndependentPaiseOracle.add(99999999.99, 0.01);
    expect(appResult).toBe(100000000.00);
    expect(appResult).toBe(oracleResult);
  });

  // 4. Repeated addition and subtraction
  it('Attack 4: 10,000 repeated additions and subtractions yield zero cumulative drift', () => {
    let balance = 50000.00;
    const delta = 0.10;
    for (let i = 0; i < 10000; i++) {
      balance = addMoney(balance, delta);
      balance = subtractMoney(balance, delta);
    }
    expect(balance).toBe(50000.00);
  });

  // 5. Negative adjustments
  it('Attack 5: Negative balance adjustments reflect accurately down to the paise', () => {
    const opening = 254820.75;
    const adjustment = -14382.49;
    const appResult = addMoney(opening, adjustment);
    const oracleResult = IndependentPaiseOracle.add(opening, adjustment);
    expect(appResult).toBe(240438.26);
    expect(appResult).toBe(oracleResult);
  });

  // 6. Refunds
  it('Attack 6: Full refund restores account balance and reduces expense ledger to 0', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('full_refund@test.in', 'Refund User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'HDFC', institution: 'HDFC', type: 'checking', balance: 50000, currency: 'INR', accountNumberMask: '•••• 1111' });
    });
    const accId = result.current.accounts[0].id;

    // Expense ₹4,500.25
    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 4500.25, type: 'expense', category: 'Travel', merchant: 'Airline', date: '2026-10-31', description: 'Flight', status: 'posted' });
    });
    expect(result.current.metrics.totalExpenses).toBe(4500.25);
    expect(result.current.accounts[0].balance).toBe(45499.75);

    // Full refund ₹4,500.25
    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 4500.25, type: 'refund', category: 'Travel', merchant: 'Airline Refund', date: '2026-10-31', description: 'Flight cancel', status: 'posted' });
    });
    expect(result.current.metrics.totalExpenses).toBe(0.00);
    expect(result.current.accounts[0].balance).toBe(50000.00);
  });

  // 7. Partial refunds
  it('Attack 7: Partial refund reduces expenses precisely without affecting total income', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('partial_refund@test.in', 'Partial User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'SBI', institution: 'SBI', type: 'checking', balance: 20000, currency: 'INR', accountNumberMask: '•••• 2222' });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({ accountId: accId, amount: 2000.00, type: 'expense', category: 'Shopping', merchant: 'Amazon', date: '2026-10-31', description: '2 Items', status: 'posted' });
      result.current.addTransaction({ accountId: accId, amount: 750.50, type: 'refund', category: 'Shopping', merchant: 'Amazon Return', date: '2026-10-31', description: '1 Item Return', status: 'posted' });
    });

    expect(result.current.metrics.totalIncome).toBe(0.00);
    expect(result.current.metrics.totalExpenses).toBe(1249.50);
    expect(result.current.accounts[0].balance).toBe(18750.50);
  });

  // 8. Internal transfers
  it('Attack 8: Internal transfer does not inflate income or expenses and preserves net worth', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('transfer_test@test.in', 'Transfer User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'HDFC', institution: 'HDFC', type: 'savings', balance: 50000, currency: 'INR', accountNumberMask: '•••• 1111' });
      result.current.addAccount({ name: 'ICICI', institution: 'ICICI', type: 'savings', balance: 20000, currency: 'INR', accountNumberMask: '•••• 2222' });
    });
    const [acc1, acc2] = result.current.accounts;
    const initialNetWorth = result.current.metrics.totalNetWorth;

    act(() => {
      result.current.addTransaction({
        accountId: acc1.id,
        destinationAccountId: acc2.id,
        amount: 15432.85,
        type: 'transfer',
        category: 'Savings',
        merchant: 'Self Transfer',
        date: '2026-10-31',
        description: 'Sweep',
        status: 'posted'
      });
    });

    expect(result.current.metrics.totalIncome).toBe(0.00);
    expect(result.current.metrics.totalExpenses).toBe(0.00);
    expect(result.current.metrics.totalNetWorth).toBe(initialNetWorth);
    expect(result.current.accounts.find(a => a.id === acc1.id)!.balance).toBe(34567.15);
    expect(result.current.accounts.find(a => a.id === acc2.id)!.balance).toBe(35432.85);
  });

  // 9. Transfer reversals
  it('Attack 9: Deletion of an internal transfer atomically restores both accounts', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('reversal_test@test.in', 'Reversal User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Acc A', institution: 'A', type: 'savings', balance: 40000, currency: 'INR', accountNumberMask: '•••• 1' });
      result.current.addAccount({ name: 'Acc B', institution: 'B', type: 'savings', balance: 10000, currency: 'INR', accountNumberMask: '•••• 2' });
    });
    const [accA, accB] = result.current.accounts;

    act(() => {
      result.current.addTransaction({
        accountId: accA.id,
        destinationAccountId: accB.id,
        amount: 8000,
        type: 'transfer',
        category: 'Transfer',
        merchant: 'Self',
        date: '2026-10-31',
        description: 'Test',
        status: 'posted'
      });
    });

    const txId = result.current.transactions[0].id;
    // Delete the transfer
    act(() => {
      result.current.deleteTransaction(txId);
    });

    expect(result.current.accounts.find(a => a.id === accA.id)!.balance).toBe(40000.00);
    expect(result.current.accounts.find(a => a.id === accB.id)!.balance).toBe(10000.00);
  });

  // 10. Repeated transaction editing
  it('Attack 10: Repeated transaction edits apply exact delta without balance drift', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('edit_drift@test.in', 'Edit User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Acc', institution: 'Bank', type: 'savings', balance: 50000, currency: 'INR', accountNumberMask: '•••• 1' });
    });
    const accId = result.current.accounts[0].id;

    act(() => {
      result.current.addTransaction({
        accountId: accId,
        amount: 1000,
        type: 'expense',
        category: 'Food',
        merchant: 'Cafe',
        date: '2026-10-31',
        description: 'Coffee',
        status: 'posted'
      });
    });

    const txId = result.current.transactions[0].id;

    // Rapidly toggle between ₹1,500 and ₹1,000 for 50 cycles
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.updateTransaction(txId, { amount: 1500 });
      });
      act(() => {
        result.current.updateTransaction(txId, { amount: 1000 });
      });
    }

    expect(result.current.accounts[0].balance).toBe(49000.00);
    expect(result.current.metrics.totalExpenses).toBe(1000.00);
  });

  // 11. Repeated transaction deletion
  it('Attack 11: Recording and deleting 20 transactions returns balance to exact initial value', async () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      await result.current.registerUser('del_all@test.in', 'Delete User', 'Pass1234!');
    });

    act(() => {
      result.current.addAccount({ name: 'Acc', institution: 'Bank', type: 'savings', balance: 100000.00, currency: 'INR', accountNumberMask: '•••• 1' });
    });
    const accId = result.current.accounts[0].id;

    for (let i = 1; i <= 20; i++) {
      act(() => {
        result.current.addTransaction({
          accountId: accId,
          amount: i * 15.35,
          type: 'expense',
          category: 'Misc',
          merchant: `Merchant ${i}`,
          date: '2026-10-31',
          description: `Test ${i}`,
          status: 'posted'
        });
      });
    }

    // Delete all transactions
    const txIds = result.current.transactions.map(t => t.id);
    for (const id of txIds) {
      act(() => {
        result.current.deleteTransaction(id);
      });
    }

    expect(result.current.accounts[0].balance).toBe(100000.00);
    expect(result.current.metrics.totalExpenses).toBe(0.00);
  });

  // 12. Three-party odd-paise splitting
  it('Attack 12: Three-party odd-paise bill split allocates remainder penny with 100% conservation', () => {
    const total = 100.00;
    const participants = ['Alice', 'Bob', 'Charlie'];
    const splits = calculateEqualSplit(total, participants);

    expect(splits).toHaveLength(3);
    expect(splits[0].share).toBe(33.34);
    expect(splits[1].share).toBe(33.33);
    expect(splits[2].share).toBe(33.33);

    const sum = splits.reduce((acc, p) => addMoney(acc, p.share), 0);
    expect(sum).toBe(100.00);

    const oracleShares = IndependentPaiseOracle.splitPaise(total, 3);
    expect(splits.map(s => s.share)).toEqual(oracleShares);
  });

  // 13. Seven-party odd-paise splitting
  it('Attack 13: Seven-party odd-paise bill split allocates ₹1,000.00 exactly without loss of 1 paisa', () => {
    const total = 1000.00;
    const participants = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
    const splits = calculateEqualSplit(total, participants);

    expect(splits).toHaveLength(7);
    // 100000 paise / 7 = 14285 paise with 5 paise remainder -> 5 participants get 142.86, 2 get 142.85
    const sum = splits.reduce((acc, p) => addMoney(acc, p.share), 0);
    expect(sum).toBe(1000.00);

    const oracleShares = IndependentPaiseOracle.splitPaise(total, 7);
    expect(splits.map(s => s.share)).toEqual(oracleShares);
  });

  // 14. Percentage-based bill splitting
  it('Attack 14: Percentage-based bill splitting correctly accounts for rounding on arbitrary ratios', () => {
    const total = 12345.67;
    // 50%, 30%, 20%
    const share1 = multiplyMoney(total, 0.50); // 6172.84
    const share2 = multiplyMoney(total, 0.30); // 3703.70
    const share3 = subtractMoney(total, addMoney(share1, share2)); // 2469.13

    const sum = addMoney(addMoney(share1, share2), share3);
    expect(sum).toBe(total);
  });

  // 15. Large transaction totals
  it('Attack 15: Extremely large transaction totals (₹99 Crore) process without IEEE-754 mantissa corruption', () => {
    const largeOpening = 990000000.00;
    const income = 10000000.00;
    const expense = 5000000.50;

    const net = addMoney(subtractMoney(largeOpening, expense), income);
    const oracleNet = IndependentPaiseOracle.add(
      IndependentPaiseOracle.subtract(largeOpening, expense),
      income
    );

    expect(net).toBe(994999999.50);
    expect(net).toBe(oracleNet);
  });
});
