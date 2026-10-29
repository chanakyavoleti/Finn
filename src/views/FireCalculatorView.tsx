import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { 
  calculateFireProjections, 
  FireCalculatorInputs, 
  FireProjectionResult 
} from '../utils/fireCalculator';
import { Flame, Info, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp } from 'lucide-react';

export const FireCalculatorView: React.FC = () => {
  const { metrics, formatAmount } = useFinance();

  const [inputs, setInputs] = useState<FireCalculatorInputs>({
    currentAge: 28,
    targetRetirementAge: 45,
    currentInvestableAssets: metrics.totalInvested + metrics.liquidCash,
    currentMonthlyExpenses: metrics.totalExpenses > 0 ? metrics.totalExpenses : 50000,
    monthlyContribution: metrics.netSavings > 0 ? metrics.netSavings : 45000,
    annualInflationRatePct: 6.0,   // Standard India CPI benchmark
    expectedAnnualReturnPct: 11.5, // Nifty 50 long-term CAGR
    safeWithdrawalRatePct: 3.5,    // 3.5% conservative withdrawal
  });

  const result: FireProjectionResult = calculateFireProjections(inputs);
  const baseline = result.baseline;

  const handleChange = (field: keyof FireCalculatorInputs, val: number) => {
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Target FIRE Corpus (Baseline)"
          value={`₹${baseline.fireNumberInCrores} Cr`}
          subValue={`₹${baseline.fireNumberInLakhs} L`}
          secondaryContext={`At age ${inputs.targetRetirementAge} (${result.yearsToRetire} years horizon)`}
          accent="forest"
          tooltip="Target nominal corpus required to sustain lifestyle without active earned income"
        />
        <MetricCard
          label="Projected Portfolio at Age 45"
          value={`₹${(baseline.projectedCorpusNominal / 10000000).toFixed(2)} Cr`}
          trend={{ 
            value: baseline.isAchieved ? 'Target Surpassed' : 'Shortfall', 
            isPositive: baseline.isAchieved 
          }}
          secondaryContext={`Real purchasing power: ₹${(baseline.projectedCorpusReal / 100000).toFixed(1)} Lakhs`}
        />
        <MetricCard
          label="Capital Freedom Gap"
          value={baseline.isAchieved 
            ? `+₹${(baseline.savingsGap / 100000).toFixed(1)} L` 
            : `-₹${(Math.abs(baseline.savingsGap) / 100000).toFixed(1)} L`}
          trend={{ 
            value: baseline.isAchieved ? 'Surplus' : 'Requires Adjustment', 
            isPositive: baseline.isAchieved 
          }}
          secondaryContext={baseline.isAchieved ? 'Plan is fully on track' : `Need ₹${Math.round(baseline.requiredMonthlyContribution).toLocaleString()}/mo`}
        />
        <MetricCard
          label="Future Monthly Living Cost"
          value={formatAmount(baseline.futureAnnualExpensesNominal / 12)}
          subValue="/ month"
          secondaryContext={`Adjusted for ${inputs.annualInflationRatePct}% annual inflation`}
        />
      </div>

      {/* Interactive Assumption Inputs Grid */}
      <Card
        title="FIRE Model Parameters & Assumptions"
        subtitle="Transparent periodic compounding formulas based on historical Indian market benchmarks"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Current Age
            </label>
            <input
              type="number"
              min="18"
              max="70"
              value={inputs.currentAge}
              onChange={(e) => handleChange('currentAge', parseInt(e.target.value) || 28)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Target Financial Freedom Age
            </label>
            <input
              type="number"
              min={inputs.currentAge + 1}
              max="80"
              value={inputs.targetRetirementAge}
              onChange={(e) => handleChange('targetRetirementAge', parseInt(e.target.value) || 45)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Current Investable Assets (₹)
            </label>
            <input
              type="number"
              min="0"
              step="50000"
              value={inputs.currentInvestableAssets}
              onChange={(e) => handleChange('currentInvestableAssets', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Current Monthly Expenses (₹)
            </label>
            <input
              type="number"
              min="5000"
              step="5000"
              value={inputs.currentMonthlyExpenses}
              onChange={(e) => handleChange('currentMonthlyExpenses', parseFloat(e.target.value) || 50000)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Monthly Investment SIP (₹)
            </label>
            <input
              type="number"
              min="1000"
              step="5000"
              value={inputs.monthlyContribution}
              onChange={(e) => handleChange('monthlyContribution', parseFloat(e.target.value) || 25000)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Expected Annual Return (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="4"
              max="20"
              value={inputs.expectedAnnualReturnPct}
              onChange={(e) => handleChange('expectedAnnualReturnPct', parseFloat(e.target.value) || 11.5)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Expected Inflation Rate (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="2"
              max="12"
              value={inputs.annualInflationRatePct}
              onChange={(e) => handleChange('annualInflationRatePct', parseFloat(e.target.value) || 6.0)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Safe Withdrawal Rate (SWR %)
            </label>
            <input
              type="number"
              step="0.25"
              min="2.5"
              max="6"
              value={inputs.safeWithdrawalRatePct}
              onChange={(e) => handleChange('safeWithdrawalRatePct', parseFloat(e.target.value) || 3.5)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>
        </div>
      </Card>

      {/* Sensitivity Scenarios Comparison */}
      <div>
        <h2 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1] mb-1">
          Sensitivity Analysis Matrix
        </h2>
        <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mb-4">
          Stress-testing portfolio durability across economic regimes
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[result.conservative, result.baseline, result.optimistic].map((sc) => {
            const isBase = sc.scenarioName === 'Baseline';
            return (
              <Card 
                key={sc.scenarioName} 
                padding="md"
                className={isBase ? 'border-2 border-[#1B4332] dark:border-[#2D6A4F]' : ''}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-[#141716] dark:text-[#F0F3F1]">
                      {sc.scenarioName}
                    </span>
                    {isBase && <Badge variant="brand" size="sm">Primary</Badge>}
                  </div>
                  <Badge variant={sc.isAchieved ? 'positive' : 'warning'} size="sm">
                    {sc.isAchieved ? 'Achievable' : 'Adjustment Needed'}
                  </Badge>
                </div>

                <div className="text-xs text-[#58605C] dark:text-[#9BA6A0] mb-3">
                  Return: <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">{sc.annualReturnPct}%</span> · 
                  Inflation: <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">{sc.inflationRatePct}%</span>
                </div>

                <div className="space-y-2 text-xs border-t border-[#E8EAE6] dark:border-[#242D28] pt-3 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#58605C] dark:text-[#9BA6A0]">Target Corpus Needed:</span>
                    <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">₹{sc.fireNumberInCrores} Cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#58605C] dark:text-[#9BA6A0]">Projected Corpus:</span>
                    <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">₹{(sc.projectedCorpusNominal / 10000000).toFixed(2)} Cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#58605C] dark:text-[#9BA6A0]">Net Gap / Surplus:</span>
                    <span className={sc.isAchieved ? 'font-semibold text-[#166534] dark:text-[#4ADE80]' : 'font-semibold text-[#991B1B] dark:text-[#F87171]'}>
                      {sc.isAchieved ? '+' : ''}₹{(sc.savingsGap / 100000).toFixed(1)} L
                    </span>
                  </div>
                </div>

                {!sc.isAchieved && (
                  <div className="mt-3 p-2 rounded bg-[#FFFBEB] dark:bg-[#2B210B] border border-[#FDE68A] dark:border-[#5C4512] text-[11px] text-[#92400E] dark:text-[#FBBF24]">
                    Increase monthly SIP to <strong>₹{sc.requiredMonthlyContribution.toLocaleString()}/mo</strong> to meet target.
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Disclaimers & Methodology */}
      <Card padding="md">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-[#1B4332] dark:text-[#52B788] shrink-0 mt-0.5" />
          <div className="text-xs text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
            <h4 className="font-semibold text-[#141716] dark:text-[#F0F3F1] mb-1">
              Mathematical Transparency & Regulatory Disclaimer
            </h4>
            <p>
              Projections are deterministic numerical simulations based on compound interest formulas. Returns and inflation are assumptions, not guarantees. This model does not constitute personalized investment or tax advice. Long-term Indian equity returns (Nifty 50) have historically averaged 11-13% CAGR, but fluctuate significantly year over year.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
