import { describe, it, expect } from 'vitest';
import { 
  formatMoney, 
  parseMoney, 
  addMoney, 
  subtractMoney, 
  multiplyMoney, 
  divideMoney,
  sanitizeCsvCell 
} from '../utils/currency';
import { calculateEqualSplit, validateCustomSplit, computeGroupBalances } from '../utils/splitCalculator';
import { calculateFireProjections } from '../utils/fireCalculator';
import { estimateIndianCapitalGainsTax, executePositionSale, addBuyLot } from '../utils/investmentCalculator';
import { parseBankStatementCsv } from '../integrations/statementParsers';
import { AuthService } from '../auth/authService';

describe('Comprehensive Financial Math & Regression Suite', () => {

  // --- 1. Currency Precision & IEEE 754 Floating Point Rounding ---
  describe('Double-Entry Paise Precision & Math', () => {
    it('accurately resolves 0.1 + 0.2 floating point anomaly', () => {
      expect(addMoney(0.1, 0.2)).toBe(0.3);
      expect(0.1 + 0.2).not.toBe(0.3); // Demonstrates raw JS floating point flaw
    });

    it('correctly adds and subtracts paise without fractional drift', () => {
      let balance = 1000.00;
      balance = subtractMoney(balance, 199.99);
      expect(balance).toBe(800.01);
      balance = addMoney(balance, 49.99);
      expect(balance).toBe(850.00);
      balance = subtractMoney(balance, 850.00);
      expect(balance).toBe(0.00);
    });

    it('correctly handles zero and negative numbers in operations', () => {
      expect(addMoney(0, 0)).toBe(0);
      expect(subtractMoney(0, 50)).toBe(-50);
      expect(addMoney(-50, 100)).toBe(50);
      expect(multiplyMoney(100.55, 0)).toBe(0);
      expect(divideMoney(100.55, 1)).toBe(100.55);
      expect(divideMoney(100, 0)).toBe(0); // Safe division by zero
    });

    it('handles large numbers up to Crores without overflow', () => {
      const tenCrores = 100000000.00;
      const twentyCrores = addMoney(tenCrores, tenCrores);
      expect(twentyCrores).toBe(200000000.00);
      expect(multiplyMoney(tenCrores, 1.12)).toBe(112000000.00);
    });
  });

  // --- 2. Indian Currency Formatting (Lakhs & Crores) ---
  describe('Indian Number Formatting & Currency Representation', () => {
    it('formats numbers in Indian grouping system (2,2,3)', () => {
      // INR formatting in India uses 1,00,000 for 1 Lakh and 1,00,00,000 for 1 Crore
      const oneLakh = formatMoney(100000, 'INR');
      expect(oneLakh).toContain('1,00,000');
      expect(oneLakh).toContain('₹');

      const tenLakhs = formatMoney(1000000, 'INR');
      expect(tenLakhs).toContain('10,00,000');

      const oneCrore = formatMoney(10000000, 'INR');
      expect(oneCrore).toContain('1,00,00,000');
    });

    it('formats compact representations correctly', () => {
      const formattedLakh = formatMoney(150000, 'INR', { compact: true });
      expect(formattedLakh).toMatch(/1\.50 L|1\.5L/i);
      const formattedCrore = formatMoney(25000000, 'INR', { compact: true });
      expect(formattedCrore).toMatch(/2\.50 Cr|2\.5Cr/i);
    });

    it('formats foreign currencies with standard western grouping', () => {
      const usd = formatMoney(1000000, 'USD');
      expect(usd).toContain('1,000,000');
      expect(usd).toContain('$');

      const eur = formatMoney(500000, 'EUR');
      expect(eur).toContain('€');
    });

    it('parses formatted currency strings safely', () => {
      expect(parseMoney('₹1,50,000.50')).toBe(150000.50);
      expect(parseMoney('  $ 9,999.99  ')).toBe(9999.99);
      expect(parseMoney('invalid_text')).toBe(0);
      expect(parseMoney('-₹24,150.00')).toBe(-24150);
    });
  });

  // --- 3. Bill Splitting Algorithm & Odd Paise Remainder Allocation ---
  describe('Bill Splitting Precision & Odd Paise Conservation', () => {
    it('splits ₹100.00 among 3 participants with exact penny distribution', () => {
      const result = calculateEqualSplit(100.00, ['You', 'Aarav', 'Diya']);
      
      expect(result).toHaveLength(3);
      // 100 / 3 = 33.33 with 1 paisa remainder
      // First participant gets 33.34, other two get 33.33
      expect(result[0].share).toBe(33.34);
      expect(result[1].share).toBe(33.33);
      expect(result[2].share).toBe(33.33);

      const sum = result.reduce((acc, p) => addMoney(acc, p.share), 0);
      expect(sum).toBe(100.00); // Strict Conservation of Money
    });

    it('splits ₹1000.00 among 7 participants with zero loss of paise', () => {
      const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const result = calculateEqualSplit(1000.00, names);
      
      const sum = result.reduce((acc, p) => addMoney(acc, p.share), 0);
      expect(sum).toBe(1000.00);
      result.forEach(p => {
        expect(p.share).toBeGreaterThanOrEqual(142.85);
        expect(p.share).toBeLessThanOrEqual(142.86);
      });
    });

    it('validates custom manual allocations sum strictly to total', () => {
      const allocations = [
        { participantName: 'Partner 1', share: 15000 },
        { participantName: 'Partner 2', share: 10000 }
      ];
      const validCheck = validateCustomSplit(25000, allocations);
      expect(validCheck.isValid).toBe(true);
      expect(validCheck.discrepancy).toBe(0);

      const invalidCheck = validateCustomSplit(25000, [
        { participantName: 'A', share: 10000 }
      ]);
      expect(invalidCheck.isValid).toBe(false);
      expect(invalidCheck.discrepancy).toBe(15000);
    });

    it('accurately computes multi-party group debt balances', () => {
      const expenses = [
        {
          paidBy: 'Chanakya',
          totalAmount: 3000,
          participants: [
            { name: 'Chanakya', share: 1000, hasPaid: true },
            { name: 'Aarav', share: 1000, hasPaid: false },
            { name: 'Diya', share: 1000, hasPaid: false },
          ]
        }
      ];

      const balances = computeGroupBalances(expenses);
      const chanakya = balances.find(b => b.participantName === 'Chanakya')!;
      const aarav = balances.find(b => b.participantName === 'Aarav')!;

      expect(chanakya.netBalance).toBe(2000); // Owed 2000
      expect(aarav.netBalance).toBe(-1000);  // Owes 1000
    });
  });

  // --- 4. FIRE Projections & Inflation-Adjusted Retirement Math ---
  describe('FIRE Projections & Indian Inflation Horizon Math', () => {
    it('calculates baseline nominal and real retirement targets', () => {
      const result = calculateFireProjections({
        currentAge: 30,
        targetRetirementAge: 45,
        currentInvestableAssets: 2000000, // 20 Lakhs
        currentMonthlyExpenses: 50000,   // 50k / month = 6L / year
        monthlyContribution: 40000,      // 40k / month
        annualInflationRatePct: 6.0,
        expectedAnnualReturnPct: 12.0,
        safeWithdrawalRatePct: 3.5
      });

      expect(result.yearsToRetire).toBe(15);
      expect(result.baseline.fireNumberInCrores).toBeGreaterThan(0);
      expect(result.baseline.projectedCorpusNominal).toBeGreaterThan(result.baseline.projectedCorpusReal);
      expect(result.baseline.targetCorpusNominal).toBeGreaterThan(0);
    });

    it('calculates sensitivity projections across market return scenarios', () => {
      const result = calculateFireProjections({
        currentAge: 25,
        targetRetirementAge: 40,
        currentInvestableAssets: 500000,
        currentMonthlyExpenses: 40000,
        monthlyContribution: 30000,
        annualInflationRatePct: 6.0,
        expectedAnnualReturnPct: 11.0,
        safeWithdrawalRatePct: 4.0
      });

      expect(result.optimistic.projectedCorpusNominal)
        .toBeGreaterThan(result.baseline.projectedCorpusNominal);
      expect(result.baseline.projectedCorpusNominal)
        .toBeGreaterThan(result.conservative.projectedCorpusNominal);
    });
  });

  // --- 5. Indian Capital Gains Tax (Finance Act 2024) ---
  describe('Indian Capital Gains Tax Calculations (Finance Act 2024)', () => {
    it('applies equity LTCG 12.5% strictly above ₹1.25 Lakh exemption limit', () => {
      // Gain: ₹2,00,000 held for 24 months (LTCG)
      // Exemption: ₹1,25,000 -> Taxable: ₹75,000 * 12.5% = ₹9,375
      const taxResult = estimateIndianCapitalGainsTax(200000, 24, 'equity_in');
      expect(taxResult.taxType).toBe('LTCG');
      expect(taxResult.taxableGain).toBe(75000);
      expect(taxResult.estimatedTax).toBe(9375.00);
    });

    it('charges zero LTCG tax when total gains are below ₹1.25 Lakh threshold', () => {
      const taxResult = estimateIndianCapitalGainsTax(110000, 18, 'equity_in');
      expect(taxResult.taxType).toBe('LTCG');
      expect(taxResult.taxableGain).toBe(0);
      expect(taxResult.estimatedTax).toBe(0);
    });

    it('applies equity STCG flat 20% on short-term gains', () => {
      // Gain: ₹50,000 held for 6 months (STCG) -> 20% = ₹10,000
      const taxResult = estimateIndianCapitalGainsTax(50000, 6, 'equity_in');
      expect(taxResult.taxType).toBe('STCG');
      expect(taxResult.taxableGain).toBe(50000);
      expect(taxResult.estimatedTax).toBe(10000.00);
    });
  });

  // --- 6. Statement Parsers & Security CSV Sanitization ---
  describe('Statement Parsing & CSV Injection Security', () => {
    it('parses standard HDFC bank statement format correctly', () => {
      const hdfcCsv = `Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance
15/10/2026,UPI-SWIGGY-10291,UPI-10291,15/10/2026,450.00,,45200.00
18/10/2026,SALARY CREDIT INFOSYS,SAL-9912,18/10/2026,,150000.00,195200.00`;

      const result = parseBankStatementCsv(hdfcCsv);
      expect(result.rows).toHaveLength(2);
      expect(result.errorCount).toBe(0);
      expect(result.rows[0].amount).toBe(450.00);
      expect(result.rows[0].type).toBe('expense');
      expect(result.rows[1].amount).toBe(150000.00);
      expect(result.rows[1].type).toBe('income');
    });

    it('neutralizes CSV formula injection attacks in exported fields', () => {
      expect(sanitizeCsvCell('=SUM(A1:A10)')).toMatch(/^['"]/);
      expect(sanitizeCsvCell('+cmd|"/C calc"!A0')).toMatch(/^['"]/);
      expect(sanitizeCsvCell('-100')).toMatch(/^['"]/);
      expect(sanitizeCsvCell('@evil.com')).toMatch(/^['"]/);
      expect(sanitizeCsvCell('Safe Merchant Name')).toBe('"Safe Merchant Name"');
    });

    it('tolerates empty lines and irregular delimiters in CSV', () => {
      const messyCsv = `
Date,Narration,Chq/Ref Number,Value Dt,Withdrawal Amt,Deposit Amt,Closing Balance

20/10/2026,Amazon Retail,AMZ-991,20/10/2026,1999.00,,30000.00

`;
      const result = parseBankStatementCsv(messyCsv);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].merchant).toBe('Amazon Retail');
    });
  });

  // --- 7. Security & User Isolation Boundary Verification ---
  describe('Authentication & User Ownership Boundaries (RLS simulation)', () => {
    it('rejects access when session does not match resource owner', async () => {
      const session = await AuthService.register('owner@finn.in', 'Resource Owner', 'Password123!');
      
      const isOwner = AuthService.verifyOwnership(session.user.id, session);
      expect(isOwner).toBe(true);

      const isForeignOwner = AuthService.verifyOwnership('usr_foreign_attacker', session);
      expect(isForeignOwner).toBe(false);

      const isUnauthenticatedOwner = AuthService.verifyOwnership(session.user.id, null);
      expect(isUnauthenticatedOwner).toBe(false);
    });

    it('rejects password shorter than 8 characters', async () => {
      await expect(
        AuthService.register('short@finn.in', 'Short Pass', 'pass')
      ).rejects.toThrow('Password must be at least 8 characters long.');
    });

    it('rejects invalid email formats', async () => {
      await expect(
        AuthService.register('not-an-email', 'No At', 'Password123!')
      ).rejects.toThrow('A valid email address is required.');
    });
  });

  // --- 8. Edge Cases & Resilience Scenarios ---
  describe('Edge Cases, Financial Years & Overdraft Resilience', () => {
    it('handles recurring fraction division with round-to-nearest-paise', () => {
      // 10 / 3 = 3.3333333333333335 -> 3.33
      expect(divideMoney(10, 3)).toBe(3.33);
      // 20 / 3 = 6.666666666666667 -> 6.67
      expect(divideMoney(20, 3)).toBe(6.67);
      // 1 / 3 = 0.3333333333333333 -> 0.33
      expect(divideMoney(1, 3)).toBe(0.33);
    });

    it('correctly handles bank overdraft (negative balance in checking account)', () => {
      let checkingBalance = 5000.00;
      const largeDisbursement = 7500.00;
      checkingBalance = subtractMoney(checkingBalance, largeDisbursement);
      expect(checkingBalance).toBe(-2500.00); // Overdrawn by ₹2,500
      checkingBalance = addMoney(checkingBalance, 3000.00);
      expect(checkingBalance).toBe(500.00);  // Back in positive territory
    });

    it('processes rapid sequential transactions preserving exact commutative sum', () => {
      let total = 0;
      const amounts = [12.45, 99.99, 1045.20, 0.05, 540.80, 230.11, 4.50];
      amounts.forEach(a => {
        total = addMoney(total, a);
      });
      // Exact sum: 12.45 + 99.99 + 1045.20 + 0.05 + 540.80 + 230.11 + 4.50 = 1933.10
      expect(total).toBe(1933.10);

      // Reverse order subtraction should yield exactly 0
      [...amounts].reverse().forEach(a => {
        total = subtractMoney(total, a);
      });
      expect(total).toBe(0.00);
    });

    it('handles zero balances and micro-transactions gracefully', () => {
      expect(addMoney(0, 0.01)).toBe(0.01);
      expect(subtractMoney(0.01, 0.01)).toBe(0);
      expect(formatMoney(0, 'INR')).toContain('₹0.00');
    });

    it('verifies Indian Financial Year (April 1 to March 31) date classification', () => {
      // In India, FY 2026-27 starts 2026-04-01 and ends 2027-03-31
      const isIndianFY2627 = (dateStr: string) => {
        const d = new Date(dateStr);
        const fyStart = new Date('2026-04-01T00:00:00');
        const fyEnd = new Date('2027-03-31T23:59:59');
        return d >= fyStart && d <= fyEnd;
      };

      expect(isIndianFY2627('2026-10-29')).toBe(true);  // October 2026 belongs to FY 2026-27
      expect(isIndianFY2627('2026-03-15')).toBe(false); // March 2026 belongs to FY 2025-26
      expect(isIndianFY2627('2027-02-28')).toBe(true);  // February 2027 belongs to FY 2026-27
      expect(isIndianFY2627('2027-04-01')).toBe(false); // April 2027 belongs to FY 2027-28
    });

    it('verifies foreign currency round-trip conversion without degradation', () => {
      // 1 USD = 84.50 INR benchmark rate
      const inrAmount = 84500.00;
      const rateUsdInr = 84.50;
      const usdValue = divideMoney(inrAmount, rateUsdInr);
      expect(usdValue).toBe(1000.00);

      const convertedBackInr = multiplyMoney(usdValue, rateUsdInr);
      expect(convertedBackInr).toBe(84500.00);
    });
  });
});
