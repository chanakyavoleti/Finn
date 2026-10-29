import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { NetWorthTrajectoryChart } from '../components/charts/NetWorthTrajectoryChart';
import { SpendingBreakdownChart } from '../components/charts/SpendingBreakdownChart';
import { TrendingUp, ShieldAlert, Award, ArrowUpRight } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { metrics } = useFinance();

  // Liquidity Runway: liquid cash divided by average monthly spend ($6,642)
  const monthlyBurn = metrics.totalExpenses || 6642;
  const liquidityRunwayMonths = (metrics.liquidCash / monthlyBurn).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Level Financial Health Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Savings Rate Ratio"
          value={`${metrics.savingsRatePct.toFixed(1)}%`}
          trend={{ value: '+3.1% vs Sep', isPositive: true }}
          secondaryContext="Target benchmark: > 25.0%"
          accent="forest"
        />
        <MetricCard
          label="Liquid Cash Runway"
          value={`${liquidityRunwayMonths} mos`}
          trend={{ value: 'Exceeds 6-mo goal', isPositive: true }}
          secondaryContext={`$${metrics.liquidCash.toLocaleString()} in checking & HYSA`}
        />
        <MetricCard
          label="Fixed Cost Ratio"
          value="34.2%"
          trend={{ value: 'Healthy (<50%)', isPositive: true }}
          secondaryContext="Rent ($2,150) + utilities vs net income"
        />
        <MetricCard
          label="Debt-to-Asset Ratio"
          value={`${((metrics.totalDebt / (metrics.totalNetWorth + metrics.totalDebt)) * 100).toFixed(1)}%`}
          trend={{ value: 'Low leverage', isPositive: true }}
          secondaryContext="Total debt consists of rolling CC balances"
        />
      </div>

      {/* Trajectory & Forecast Chart */}
      <Card
        title="Net Worth Growth & Capital Accumulation"
        subtitle="12-month historical net worth with projected savings trajectory"
      >
        <NetWorthTrajectoryChart />
      </Card>

      {/* Cash Flow Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card
            title="Multi-Month Income vs Expense Spread"
            subtitle="Evaluating cash flow stability across quarterly cycles"
          >
            <IncomeExpenseChart />
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card
            title="Categorical Capital Flow"
            subtitle="Proportional consumption across active life buckets"
          >
            <SpendingBreakdownChart />
          </Card>
        </div>
      </div>

      {/* Analytical Narrative & Variance Explanations */}
      <Card
        title="Variance Analysis & Longitudinal Observations"
        subtitle="Significant shifts in cash flow pattern verified by accounting ledger"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Fixed Housing & Baseline Living Stability
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EBF3EE] text-[#1B4332] dark:bg-[#1A2820] dark:text-[#52B788] font-medium">
                Constant
              </span>
            </div>
            <p className="text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
              Rent remained invariant at $2,150.00. Utility expenditure contracted by 8.4% month-over-month due to reduced seasonal HVAC demand. Baseline fixed expenses accounted for $2,445.00 of total disbursements.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Discretionary Spike in Outdoor Apparel
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] dark:bg-[#2B1313] dark:text-[#F87171] font-medium">
                +$210.00 variance
              </span>
            </div>
            <p className="text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
              Shopping expenditures rose 18% above typical 3-month trailing median, driven by a seasonal gear purchase at Patagonia ($210.00). However, grocery and cafe expenses dropped 11%, absorbing the difference without causing cash flow deficit.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                High-Yield Savings & Automated Compounding
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EBF3EE] text-[#1B4332] dark:bg-[#1A2820] dark:text-[#52B788] font-medium">
                +$35.20 yield
              </span>
            </div>
            <p className="text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
              Monthly passive interest earned across Marcus HYSA and Vanguard Federal Money Market reached $142.10 at current 4.40% APY benchmark, accelerating the timeline to reach the 6-month emergency reserve threshold.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
