/**
 * Financial Independence & Early Retirement (FIRE) Projection Engine
 * Transparent, deterministic periodic compounding models with inflation adjustments
 * and sensitivity scenarios (Conservative, Baseline, Optimistic).
 *
 * FORMULAS & METHODOLOGY:
 * 1. Target FIRE Corpus (Nominal):
 *    Target = (Future Annual Expenses at Retirement) / (Safe Withdrawal Rate)
 *    where:
 *      Future Annual Expenses = (Current Monthly Expenses * 12) * (1 + inflation)^yearsToRetire
 * 
 * 2. Projected Portfolio at Retirement Age (Nominal Compound Growth):
 *    Future Value = Current Assets * (1 + r)^n + PMT * [((1 + r/12)^(12*n) - 1) / (r/12)] * (1 + r/12)
 *    where:
 *      r = Annual investment return rate
 *      n = Years until target retirement age
 *      PMT = Monthly contribution
 *
 * 3. Real (Inflation-Adjusted) Portfolio Value:
 *    Real FV = Future Value / (1 + inflation)^n
 */

export interface FireCalculatorInputs {
  currentAge: number;
  targetRetirementAge: number;
  currentInvestableAssets: number;
  currentMonthlyExpenses: number;
  monthlyContribution: number;
  annualInflationRatePct: number;    // e.g. 6.0% (standard for India)
  expectedAnnualReturnPct: number;   // e.g. 11.5% (Nifty 50 long-term CAGR)
  safeWithdrawalRatePct: number;     // e.g. 3.5% or 4.0%
}

export interface ScenarioResult {
  scenarioName: 'Conservative' | 'Baseline' | 'Optimistic';
  annualReturnPct: number;
  inflationRatePct: number;
  futureAnnualExpensesNominal: number;
  targetCorpusNominal: number;
  projectedCorpusNominal: number;
  projectedCorpusReal: number;
  savingsGap: number; // positive if surplus, negative if shortfall
  isAchieved: boolean;
  requiredMonthlyContribution: number;
  fireNumberInLakhs: number;
  fireNumberInCrores: number;
}

export interface FireProjectionResult {
  yearsToRetire: number;
  baseline: ScenarioResult;
  conservative: ScenarioResult;
  optimistic: ScenarioResult;
  yearByYearTrajectory: {
    age: number;
    year: number;
    nominalAssets: number;
    realAssets: number;
    targetMilestone: number;
  }[];
}

export function calculateFireProjections(inputs: FireCalculatorInputs): FireProjectionResult {
  const years = Math.max(inputs.targetRetirementAge - inputs.currentAge, 1);
  const currentAnnualExpenses = inputs.currentMonthlyExpenses * 12;

  // Baseline Scenario
  const baseline = computeScenario(
    'Baseline',
    inputs.expectedAnnualReturnPct,
    inputs.annualInflationRatePct,
    inputs,
    years,
    currentAnnualExpenses
  );

  // Conservative Scenario (-2% return, +1% inflation)
  const conservative = computeScenario(
    'Conservative',
    Math.max(inputs.expectedAnnualReturnPct - 2.5, 3),
    inputs.annualInflationRatePct + 1.0,
    inputs,
    years,
    currentAnnualExpenses
  );

  // Optimistic Scenario (+2% return, -0.5% inflation)
  const optimistic = computeScenario(
    'Optimistic',
    inputs.expectedAnnualReturnPct + 2.0,
    Math.max(inputs.annualInflationRatePct - 0.5, 3),
    inputs,
    years,
    currentAnnualExpenses
  );

  // Year-by-year trajectory for charts
  const trajectory = [];
  const currentYear = new Date().getFullYear();
  let accumulatedAssets = inputs.currentInvestableAssets;
  const monthlyRate = inputs.expectedAnnualReturnPct / 100 / 12;
  const inflationDec = inputs.annualInflationRatePct / 100;

  for (let y = 0; y <= years; y++) {
    const age = inputs.currentAge + y;
    const year = currentYear + y;
    const inflationFactor = Math.pow(1 + inflationDec, y);
    const nominalExpensesAtY = currentAnnualExpenses * inflationFactor;
    const targetAtY = nominalExpensesAtY / (inputs.safeWithdrawalRatePct / 100);

    const realAssets = accumulatedAssets / inflationFactor;

    trajectory.push({
      age,
      year,
      nominalAssets: Math.round(accumulatedAssets),
      realAssets: Math.round(realAssets),
      targetMilestone: Math.round(targetAtY),
    });

    // Compound for next year: 12 monthly periods
    for (let m = 0; m < 12; m++) {
      accumulatedAssets = (accumulatedAssets + inputs.monthlyContribution) * (1 + monthlyRate);
    }
  }

  return {
    yearsToRetire: years,
    baseline,
    conservative,
    optimistic,
    yearByYearTrajectory: trajectory,
  };
}

function computeScenario(
  scenarioName: ScenarioResult['scenarioName'],
  annualReturnPct: number,
  inflationRatePct: number,
  inputs: FireCalculatorInputs,
  years: number,
  currentAnnualExpenses: number
): ScenarioResult {
  const r = annualReturnPct / 100;
  const i = inflationRatePct / 100;
  const swr = inputs.safeWithdrawalRatePct / 100;

  // 1. Future Annual Expenses at retirement
  const futureAnnualExpensesNominal = currentAnnualExpenses * Math.pow(1 + i, years);

  // 2. Required Target Corpus
  const targetCorpusNominal = futureAnnualExpensesNominal / swr;

  // 3. Projected Portfolio
  const monthlyRate = r / 12;
  const totalMonths = years * 12;

  // FV of initial lump sum
  const fvLumpSum = inputs.currentInvestableAssets * Math.pow(1 + r, years);

  // FV of recurring annuity
  let fvAnnuity = 0;
  if (monthlyRate > 0) {
    fvAnnuity = inputs.monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate);
  } else {
    fvAnnuity = inputs.monthlyContribution * totalMonths;
  }

  const projectedCorpusNominal = fvLumpSum + fvAnnuity;
  const projectedCorpusReal = projectedCorpusNominal / Math.pow(1 + i, years);

  const savingsGap = projectedCorpusNominal - targetCorpusNominal;
  const isAchieved = savingsGap >= 0;

  // 4. Required Monthly Contribution to close gap (if shortfall)
  let requiredMonthlyContribution = inputs.monthlyContribution;
  if (!isAchieved) {
    const neededFromAnnuity = Math.max(targetCorpusNominal - fvLumpSum, 0);
    if (monthlyRate > 0) {
      requiredMonthlyContribution = neededFromAnnuity / (((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) * (1 + monthlyRate));
    } else {
      requiredMonthlyContribution = neededFromAnnuity / totalMonths;
    }
  }

  return {
    scenarioName,
    annualReturnPct,
    inflationRatePct,
    futureAnnualExpensesNominal: Math.round(futureAnnualExpensesNominal),
    targetCorpusNominal: Math.round(targetCorpusNominal),
    projectedCorpusNominal: Math.round(projectedCorpusNominal),
    projectedCorpusReal: Math.round(projectedCorpusReal),
    savingsGap: Math.round(savingsGap),
    isAchieved,
    requiredMonthlyContribution: Math.round(requiredMonthlyContribution),
    fireNumberInLakhs: Math.round((targetCorpusNominal / 100000) * 10) / 10,
    fireNumberInCrores: Math.round((targetCorpusNominal / 10000000) * 100) / 100,
  };
}
