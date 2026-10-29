/**
 * Bill Splitting & Remainder Allocation Engine
 * Handles exact penny/paise distribution, preventing rounding discrepancies,
 * negative residuals, or floating point leaks.
 */

export interface SplitItem {
  participantName: string;
  share: number;
}

/**
 * Divide an amount equally among participants with exact paise allocation.
 * e.g., ₹100.00 split among 3 people -> [₹33.34, ₹33.33, ₹33.33] (Sum = exactly 100.00)
 */
export function calculateEqualSplit(totalAmount: number, participantNames: string[]): SplitItem[] {
  if (participantNames.length === 0) {
    throw new Error('Must provide at least one participant.');
  }
  if (totalAmount <= 0) {
    throw new Error('Total amount must be greater than zero.');
  }

  // Convert to integer paise to ensure absolute precision
  const totalPaise = Math.round(totalAmount * 100);
  const count = participantNames.length;

  const basePaise = Math.floor(totalPaise / count);
  const remainderPaise = totalPaise % count;

  return participantNames.map((name, index) => {
    // Distribute remainder 1 paise at a time to early participants
    const sharePaise = basePaise + (index < remainderPaise ? 1 : 0);
    return {
      participantName: name,
      share: sharePaise / 100,
    };
  });
}

/**
 * Validate that custom manual allocations add up exactly to the total amount.
 */
export function validateCustomSplit(
  totalAmount: number,
  allocations: { participantName: string; share: number }[]
): { isValid: boolean; discrepancy: number } {
  const sum = allocations.reduce((acc, a) => acc + Math.round(a.share * 100), 0);
  const expected = Math.round(totalAmount * 100);
  const diffPaise = expected - sum;

  return {
    isValid: diffPaise === 0,
    discrepancy: diffPaise / 100,
  };
}

/**
 * Calculate multi-person balance matrix ("Who Owes Whom").
 */
export interface BalanceSummary {
  participantName: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export function computeGroupBalances(
  expenses: {
    paidBy: string;
    totalAmount: number;
    participants: { name: string; share: number; hasPaid: boolean }[];
  }[]
): BalanceSummary[] {
  const balanceMap: Record<string, { totalPaid: number; totalShare: number }> = {};

  expenses.forEach(exp => {
    // Creditor: person who paid
    if (!balanceMap[exp.paidBy]) {
      balanceMap[exp.paidBy] = { totalPaid: 0, totalShare: 0 };
    }
    balanceMap[exp.paidBy].totalPaid += exp.totalAmount;

    // Debtors: participants' allocated shares
    exp.participants.forEach(p => {
      if (!balanceMap[p.name]) {
        balanceMap[p.name] = { totalPaid: 0, totalShare: 0 };
      }
      balanceMap[p.name].totalShare += p.share;
    });
  });

  return Object.entries(balanceMap).map(([name, data]) => ({
    participantName: name,
    totalPaid: Math.round(data.totalPaid * 100) / 100,
    totalShare: Math.round(data.totalShare * 100) / 100,
    netBalance: Math.round((data.totalPaid - data.totalShare) * 100) / 100,
  }));
}
