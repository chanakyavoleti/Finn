import { describe, it, expect } from 'vitest';
import { addMoney, subtractMoney } from '../utils/currency';

describe('Authoritative Financial Calculations & Double-Entry Integrity', () => {
  it('correctly calculates net cash flow excluding internal transfers', () => {
    // User scenario:
    // Income: ₹1,50,000 (Salary)
    // Expense 1: ₹30,000 (Rent)
    // Expense 2: ₹10,000 (Groceries)
    // Transfer: ₹50,000 (Checking to Savings) -> MUST NOT COUNT AS EXPENSE
    const transactions = [
      { type: 'income', amount: 150000 },
      { type: 'expense', amount: 30000 },
      { type: 'expense', amount: 10000 },
      { type: 'transfer', amount: 50000 }
    ];

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => addMoney(sum, t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => addMoney(sum, t.amount), 0);

    const netCashFlow = subtractMoney(totalIncome, totalExpenses);

    expect(totalIncome).toBe(150000);
    expect(totalExpenses).toBe(40000); // Only 30k + 10k, NOT 90k
    expect(netCashFlow).toBe(110000);

    // Savings rate: (net / income) * 100
    const savingsRate = (netCashFlow / totalIncome) * 100;
    expect(savingsRate).toBeCloseTo(73.33, 2);
  });

  it('correctly handles refunds without inflating income or leaving phantom expenses', () => {
    // User bought item for ₹4,500, received full refund of ₹4,500
    const grossExpense = 4500;
    const refund = 4500;

    const netExpense = Math.max(subtractMoney(grossExpense, refund), 0);
    expect(netExpense).toBe(0);

    // Partial refund scenario: ₹2,000 purchase, ₹500 refunded
    const purchase = 2000;
    const partialRefund = 500;
    const effectiveExpense = subtractMoney(purchase, partialRefund);
    expect(effectiveExpense).toBe(1500);
  });

  it('calculates budget utilization and triggers warnings at defined thresholds', () => {
    const budgetLimit = 10000;
    const checkThreshold = (spent: number) => {
      const pct = (spent / budgetLimit) * 100;
      return {
        pct,
        isWarning: pct >= 85 && pct <= 100,
        isExceeded: pct > 100
      };
    };

    expect(checkThreshold(6000)).toEqual({ pct: 60, isWarning: false, isExceeded: false });
    expect(checkThreshold(8500)).toEqual({ pct: 85, isWarning: true, isExceeded: false });
    expect(checkThreshold(9500)).toEqual({ pct: 95, isWarning: true, isExceeded: false });
    expect(checkThreshold(10500)).toEqual({ pct: 105, isWarning: false, isExceeded: true });
  });

  it('ensures investment contributions do not get classified as ordinary consumption expenses', () => {
    // An investment contribution of ₹25,000 into PPFAS Mutual Fund moves money from Bank to Investment.
    // It should decrease liquid checking balance and increase investment balance, but consumption remains untouched.
    let checkingBalance = 100000;
    let portfolioBalance = 500000;
    const sipAmount = 25000;

    // Execute contribution
    checkingBalance = subtractMoney(checkingBalance, sipAmount);
    portfolioBalance = addMoney(portfolioBalance, sipAmount);

    expect(checkingBalance).toBe(75000);
    expect(portfolioBalance).toBe(525000);

    // Total net worth remains invariant during internal re-allocation
    expect(checkingBalance + portfolioBalance).toBe(600000);
  });
});
