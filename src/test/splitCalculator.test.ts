import { describe, it, expect } from 'vitest';
import { 
  calculateEqualSplit, 
  validateCustomSplit, 
  computeGroupBalances 
} from '../utils/splitCalculator';

describe('Bill Splitting & Remainder Allocation Engine', () => {
  it('distributes odd amounts without losing paise or creating negative rounding drift', () => {
    // ₹100.00 split 3 ways: 33.34, 33.33, 33.33 -> Exactly 100.00
    const splits = calculateEqualSplit(100.00, ['Alice', 'Bob', 'Charlie']);
    expect(splits).toHaveLength(3);
    expect(splits[0].share).toBe(33.34);
    expect(splits[1].share).toBe(33.33);
    expect(splits[2].share).toBe(33.33);

    const sum = splits.reduce((acc, s) => acc + s.share, 0);
    expect(Math.round(sum * 100) / 100).toBe(100.00);
  });

  it('splits large bills evenly between multiple participants', () => {
    // ₹12,000 split 4 ways: 3000 each
    const splits = calculateEqualSplit(12000.00, ['A', 'B', 'C', 'D']);
    splits.forEach(s => expect(s.share).toBe(3000.00));
  });

  it('validates custom percentage/exact amount splits against the bill total', () => {
    const validAllocations = [
      { participantName: 'A', share: 500.00 },
      { participantName: 'B', share: 300.00 },
      { participantName: 'C', share: 200.00 },
    ];
    expect(validateCustomSplit(1000.00, validAllocations)).toEqual({ isValid: true, discrepancy: 0 });

    const invalidAllocations = [
      { participantName: 'A', share: 500.00 },
      { participantName: 'B', share: 300.00 },
      { participantName: 'C', share: 150.00 }, // sum 950, 50 missing
    ];
    expect(validateCustomSplit(1000.00, invalidAllocations)).toEqual({ isValid: false, discrepancy: 50 });
  });

  it('computes multi-party balance matrix correctly', () => {
    // Expense: Alice paid ₹3,000 for dinner split equally between Alice, Bob, Charlie (₹1,000 each)
    const expenses = [
      {
        paidBy: 'Alice',
        totalAmount: 3000.00,
        participants: [
          { name: 'Alice', share: 1000.00, hasPaid: true },
          { name: 'Bob', share: 1000.00, hasPaid: false },
          { name: 'Charlie', share: 1000.00, hasPaid: false },
        ]
      }
    ];

    const balances = computeGroupBalances(expenses);
    const alice = balances.find(b => b.participantName === 'Alice');
    const bob = balances.find(b => b.participantName === 'Bob');
    const charlie = balances.find(b => b.participantName === 'Charlie');

    expect(alice?.netBalance).toBe(2000.00); // Alice is owed ₹2,000
    expect(bob?.netBalance).toBe(-1000.00);  // Bob owes ₹1,000
    expect(charlie?.netBalance).toBe(-1000.00); // Charlie owes ₹1,000
  });
});
