import { describe, it, expect, beforeEach } from 'vitest';
import { 
  addMoney, 
  subtractMoney, 
  multiplyMoney, 
  divideMoney, 
  formatMoney, 
  parseMoney 
} from '../utils/currency';
import { calculateEqualSplit } from '../utils/splitCalculator';
import { estimateIndianCapitalGainsTax } from '../utils/investmentCalculator';
import { calculateFireProjections } from '../utils/fireCalculator';

describe('Phase 2 Auditor: Independent External Financial Math Oracle Verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Independent Double-Entry Cash Flow & Balance Reconciliation
  it('Independently verifies ledger balance reconciliation without reliance on internal helpers', () => {
    const openingBalance = 50000.00;
    const salaryCredit = 20000.00;
    const foodDisbursement = 3000.00;
    const travelDisbursement = 2000.00;
    const shoppingDisbursement = 1000.00;

    // Independent Oracle Calculation:
    // Total Inflow = 20,000.00
    // Total Outflow = 3,000 + 2,000 + 1,000 = 6,000.00
    // Net Cash Flow = Inflow - Outflow = 14,000.00
    // Closing Balance = Opening + Net Cash Flow = 50,000 + 14,000 = 64,000.00
    const oracleTotalInflow = salaryCredit;
    const oracleTotalOutflow = foodDisbursement + travelDisbursement + shoppingDisbursement;
    const oracleNetSavings = oracleTotalInflow - oracleTotalOutflow;
    const oracleClosingBalance = openingBalance + oracleNetSavings;

    expect(oracleTotalInflow).toBe(20000.00);
    expect(oracleTotalOutflow).toBe(6000.00);
    expect(oracleNetSavings).toBe(14000.00);
    expect(oracleClosingBalance).toBe(64000.00);

    // Verify application math functions match independent oracle exactly
    expect(addMoney(openingBalance, oracleNetSavings)).toBe(oracleClosingBalance);
    expect(subtractMoney(oracleTotalInflow, oracleTotalOutflow)).toBe(oracleNetSavings);
  });

  // 2. IEEE 754 Floating-Point paise drift audit
  it('Audits micro-paise arithmetic against IEEE 754 binary representation errors', () => {
    // In raw JS IEEE-754: 0.1 + 0.2 = 0.30000000000000004
    const rawSum = 0.1 + 0.2;
    expect(rawSum).not.toBe(0.3);

    // Auditor verification that FINN addMoney produces pure decimal 0.3
    const auditedSum = addMoney(0.1, 0.2);
    expect(auditedSum).toBe(0.3);

    // 199.99 + 0.01 = 200.00
    expect(addMoney(199.99, 0.01)).toBe(200.00);
    // 1000.00 - 999.99 = 0.01
    expect(subtractMoney(1000.00, 999.99)).toBe(0.01);
  });

  // 3. Independent Bill Splitting & Remainder Conservation Audit
  it('Independently validates odd paise allocation: ₹100 split 3 ways must conserve exactly 10,000 paise', () => {
    // 10000 paise / 3 people = 3333 paise per person + 1 remainder paise
    // Person 1: 3334 paise (₹33.34)
    // Person 2: 3333 paise (₹33.33)
    // Person 3: 3333 paise (₹33.33)
    const expectedPaise = [3334, 3333, 3333];
    const totalExpectedPaise = expectedPaise.reduce((a, b) => a + b, 0);
    expect(totalExpectedPaise).toBe(10000); // 100.00

    const splits = calculateEqualSplit(100, ['Auditor 1', 'Auditor 2', 'Auditor 3']);
    expect(splits[0].share).toBe(33.34);
    expect(splits[1].share).toBe(33.33);
    expect(splits[2].share).toBe(33.33);

    const actualPaiseSum = splits.reduce((acc, s) => acc + Math.round(s.share * 100), 0);
    expect(actualPaiseSum).toBe(10000);
  });

  // 4. Independent Indian Capital Gains Tax (Finance Act 2024) Oracle
  it('Independently validates Finance Act 2024 LTCG and STCG tax liabilities', () => {
    // Scenario 1: Equity held for 2 years (LTCG), Realized Gain = ₹2,50,000
    // Statutory Exemption = ₹1,25,000
    // Taxable Amount = 2,50,000 - 1,25,000 = ₹1,25,000
    // Statutory Tax Rate = 12.5%
    // Independent Oracle Tax = 1,25,000 * 0.125 = ₹15,625.00
    const gainLtcg = 250000;
    const oracleTaxable = gainLtcg - 125000;
    const oracleTax = oracleTaxable * 0.125;
    expect(oracleTax).toBe(15625.00);

    const ltcgCalc = estimateIndianCapitalGainsTax(gainLtcg, 24, 'equity_in');
    expect(ltcgCalc.taxType).toBe('LTCG');
    expect(ltcgCalc.taxableGain).toBe(oracleTaxable);
    expect(ltcgCalc.estimatedTax).toBe(oracleTax);

    // Scenario 2: Equity held for 6 months (STCG), Realized Gain = ₹80,000
    // Statutory Tax Rate = 20% flat
    // Independent Oracle Tax = 80,000 * 0.20 = ₹16,000.00
    const gainStcg = 80000;
    const oracleStcgTax = gainStcg * 0.20;
    expect(oracleStcgTax).toBe(16000.00);

    const stcgCalc = estimateIndianCapitalGainsTax(gainStcg, 6, 'equity_in');
    expect(stcgCalc.taxType).toBe('STCG');
    expect(stcgCalc.taxableGain).toBe(gainStcg);
    expect(stcgCalc.estimatedTax).toBe(oracleStcgTax);
  });

  // 5. Independent FIRE Corpus Compounding Oracle
  it('Independently calculates Future Value of expenses with 6% annual inflation across 15 years', () => {
    const monthlyExpenses = 50000;
    const annualExpenses = monthlyExpenses * 12; // 6,00,000
    const inflation = 0.06;
    const years = 15;
    const swr = 0.035; // 3.5%

    // Independent Oracle formula:
    // Future Annual Expenses = 6,00,000 * (1.06)^15
    const inflationMultiplier = Math.pow(1 + inflation, years); // ~2.396558
    const oracleFutureExpenses = annualExpenses * inflationMultiplier;
    // Target Corpus = Future Annual Expenses / SWR
    const oracleTargetCorpus = oracleFutureExpenses / swr;

    const fireProjections = calculateFireProjections({
      currentAge: 30,
      targetRetirementAge: 45,
      currentInvestableAssets: 1000000,
      currentMonthlyExpenses: 50000,
      monthlyContribution: 40000,
      annualInflationRatePct: 6.0,
      expectedAnnualReturnPct: 12.0,
      safeWithdrawalRatePct: 3.5
    });

    expect(fireProjections.yearsToRetire).toBe(15);
    expect(fireProjections.baseline.futureAnnualExpensesNominal).toBeCloseTo(oracleFutureExpenses, 0);
    expect(fireProjections.baseline.targetCorpusNominal).toBeCloseTo(oracleTargetCorpus, 0);
  });
});
