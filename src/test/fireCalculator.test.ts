import { describe, it, expect } from 'vitest';
import { calculateFireProjections, FireCalculatorInputs } from '../utils/fireCalculator';

describe('Financial Independence (FIRE) Calculator Engine', () => {
  const sampleInputs: FireCalculatorInputs = {
    currentAge: 30,
    targetRetirementAge: 45,
    currentInvestableAssets: 1000000, // ₹10 Lakhs
    currentMonthlyExpenses: 50000,    // ₹50,000/mo = ₹6L/yr
    monthlyContribution: 40000,       // ₹40,000/mo SIP
    annualInflationRatePct: 6.0,      // 6% inflation
    expectedAnnualReturnPct: 12.0,    // 12% equity CAGR
    safeWithdrawalRatePct: 3.5,       // 3.5% SWR
  };

  it('calculates future inflation-adjusted expenses and target corpus correctly', () => {
    const result = calculateFireProjections(sampleInputs);
    expect(result.yearsToRetire).toBe(15);

    // Current annual expenses = 50,000 * 12 = 6,00,000
    // After 15 years @ 6% inflation: 6,00,000 * (1.06)^15 ≈ 14,37,934
    const baseline = result.baseline;
    expect(baseline.futureAnnualExpensesNominal).toBeCloseTo(1437934, -2);

    // Target corpus = futureAnnualExpenses / 0.035 ≈ 4,10,83,837 (~₹4.11 Cr)
    expect(baseline.targetCorpusNominal).toBeGreaterThan(40000000);
    expect(baseline.fireNumberInCrores).toBeGreaterThan(4.0);
  });

  it('performs sensitivity comparison between Conservative, Baseline, and Optimistic regimes', () => {
    const result = calculateFireProjections(sampleInputs);
    const { conservative, baseline, optimistic } = result;

    // Conservative scenario has lower return & higher inflation -> requiring higher target corpus
    expect(conservative.targetCorpusNominal).toBeGreaterThan(baseline.targetCorpusNominal);
    expect(optimistic.projectedCorpusNominal).toBeGreaterThan(baseline.projectedCorpusNominal);

    // Baseline should reflect realistic growth of 10L initial + 40k/mo SIP over 15 years
    expect(baseline.projectedCorpusNominal).toBeGreaterThan(20000000);
  });

  it('computes necessary monthly contribution adjustment when there is a shortfall', () => {
    // Under-funded scenario
    const lowSipInputs: FireCalculatorInputs = {
      ...sampleInputs,
      monthlyContribution: 5000, // Very low contribution
    };

    const result = calculateFireProjections(lowSipInputs);
    expect(result.baseline.isAchieved).toBe(false);
    expect(result.baseline.savingsGap).toBeLessThan(0);
    expect(result.baseline.requiredMonthlyContribution).toBeGreaterThan(5000);
  });

  it('builds unbroken year-by-year trajectory', () => {
    const result = calculateFireProjections(sampleInputs);
    expect(result.yearByYearTrajectory.length).toBe(16); // Year 0 to 15
    expect(result.yearByYearTrajectory[0].age).toBe(30);
    expect(result.yearByYearTrajectory[15].age).toBe(45);
    expect(result.yearByYearTrajectory[0].nominalAssets).toBe(1000000);
  });
});
