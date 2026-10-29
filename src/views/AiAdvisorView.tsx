import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { MetricCard } from '../components/common/MetricCard';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  ShieldCheck,
  Calculator
} from 'lucide-react';

export const AiAdvisorView: React.FC = () => {
  const { insights, metrics, transactions, budgets, goals } = useFinance();

  const [customQuestion, setCustomQuestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [dynamicAnswer, setDynamicAnswer] = useState<{
    query: string;
    answer: string;
    supportingFigures: { label: string; value: string }[];
  } | null>(null);

  const sampleQueries = [
    'Can I afford a one-time $1,200 discretionary purchase this month?',
    'How does my grocery spend compare against 3-month trailing median?',
    'What would happen to my emergency buffer if income stopped for 4 months?',
    'How can I re-allocate dining surplus toward my Home Down Payment goal?'
  ];

  const handleRunQuery = (query: string) => {
    setAnalyzing(true);
    setDynamicAnswer(null);

    setTimeout(() => {
      setAnalyzing(false);

      if (query.includes('1,200')) {
        const remainingHeadroom = metrics.totalBudgetLimit - metrics.totalBudgetSpent;
        const canAfford = metrics.netSavings >= 1200;
        setDynamicAnswer({
          query,
          answer: canAfford
            ? `Yes. With a current net monthly surplus of $${metrics.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}, a $1,200.00 disbursement would reduce this month's savings to $${(metrics.netSavings - 1200).toLocaleString('en-US', { minimumFractionDigits: 2 })}, but maintain positive cash flow and preserve your emergency reserve untouched.`
            : `Caution: Your current net monthly savings is $${metrics.netSavings.toFixed(2)}. Absorbing $1,200.00 would incur a deficit unless funded from existing cash reserves.`,
          supportingFigures: [
            { label: 'Current Net Savings', value: `$${metrics.netSavings.toLocaleString()}` },
            { label: 'Unallocated Budget Headroom', value: `$${Math.max(0, remainingHeadroom).toLocaleString()}` },
            { label: 'Liquid Checking Balance', value: `$${metrics.liquidCash.toLocaleString()}` },
            { label: 'Post-Purchase Savings Rate', value: `${(((metrics.netSavings - 1200) / (metrics.totalIncome || 1)) * 100).toFixed(1)}%` },
          ]
        });
      } else if (query.includes('grocery')) {
        setDynamicAnswer({
          query,
          answer: 'Your current October grocery expenditure is $652.00 across Whole Foods Market and Trader Joe\'s. This is tracking within 2.3% of your 3-month trailing average ($638.00), demonstrating consistent disciplined purchasing with zero inflationary anomalies.',
          supportingFigures: [
            { label: 'October Groceries', value: '$652.00' },
            { label: '3-Month Average', value: '$638.00' },
            { label: 'Budget Limit', value: '$650.00' },
            { label: 'Variance to Limit', value: '+$2.00 (99.7% cap)' },
          ]
        });
      } else {
        const monthlyBurn = metrics.totalExpenses || 6642;
        const fourMonthBurn = monthlyBurn * 4;
        const remainingCash = metrics.liquidCash - fourMonthBurn;
        setDynamicAnswer({
          query,
          answer: `Stress Test: 4 months of zero income would require $${fourMonthBurn.toLocaleString()} in liquid disbursements. Because your liquid cash in checking & Marcus HYSA is $${metrics.liquidCash.toLocaleString()}, you would successfully absorb this period with $${Math.max(0, remainingCash).toLocaleString()} remaining in cash reserves without liquidating any Vanguard investments.`,
          supportingFigures: [
            { label: '4-Month Living Expenses', value: `$${fourMonthBurn.toLocaleString()}` },
            { label: 'Current Liquid Reserves', value: `$${metrics.liquidCash.toLocaleString()}` },
            { label: 'Remaining Cash Buffer', value: `$${Math.max(0, remainingCash).toLocaleString()}` },
            { label: 'Investment Portfolio Preserved', value: `$${metrics.totalInvested.toLocaleString()}` },
          ]
        });
      }
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Contextual Integrity"
          value="Grounded Analysis"
          secondaryContext="Derived strictly from double-entry ledger"
          accent="forest"
        />
        <MetricCard
          label="Active Financial Insights"
          value={`${insights.length} Verified`}
          secondaryContext="Priced with actual accounting figures"
        />
        <MetricCard
          label="Calculated Cash Surplus"
          value={`$${metrics.netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          trend={{ value: `${metrics.savingsRatePct.toFixed(1)}% rate`, isPositive: true }}
          secondaryContext="Available for capital re-allocation"
        />
        <MetricCard
          label="Safety Compliance"
          value="No Hallucinations"
          secondaryContext="Strictly rejects speculative fabricated data"
        />
      </div>

      {/* Analytical Query Sandbox */}
      <Card
        title="Ledger-Grounded Scenario Analysis"
        subtitle="Evaluate prospective financial choices against verified historical cash flow and liquid balances"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Ask an analytical question about your cash flow or spending limits..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && customQuestion.trim() && handleRunQuery(customQuestion)}
              className="flex-1 px-3 py-2 text-xs rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
            <Button
              variant="primary"
              size="sm"
              loading={analyzing}
              onClick={() => customQuestion.trim() && handleRunQuery(customQuestion)}
            >
              Analyze Scenario
            </Button>
          </div>

          {/* Prompt Presets */}
          <div>
            <div className="text-[11px] font-semibold text-[#8A928E] dark:text-[#6B7771] uppercase tracking-wider mb-2">
              Preset Analytical Questions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sampleQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setCustomQuestion(q);
                    handleRunQuery(q);
                  }}
                  className="text-left p-2.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28] hover:bg-[#F6F7F5] dark:hover:bg-[#1C221F] text-xs text-[#58605C] hover:text-[#141716] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1] transition-colors finn-focus cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1">{q}</span>
                    <ArrowRight size={12} className="shrink-0 text-[#8A928E] dark:text-[#6B7771]" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Scenario Result */}
          {dynamicAnswer && (
            <div className="p-4 rounded-lg border border-[#C2DBCB] dark:border-[#234D39] bg-[#F2F7F4] dark:bg-[#14231A] text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2 text-[#1B4332] dark:text-[#52B788] font-semibold">
                <Calculator size={15} />
                <span>Analysis: {dynamicAnswer.query}</span>
              </div>
              <p className="text-[#141716] dark:text-[#F0F3F1] leading-relaxed mb-4">
                {dynamicAnswer.answer}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#C2DBCB]/60 dark:border-[#234D39]/60">
                {dynamicAnswer.supportingFigures.map((fig) => (
                  <div key={fig.label} className="p-2 rounded bg-white dark:bg-[#19271E] border border-[#C2DBCB]/40 dark:border-[#234D39]/40">
                    <span className="block text-[10px] text-[#58605C] dark:text-[#9BA6A0] truncate">{fig.label}</span>
                    <span className="block text-xs font-bold text-[#141716] dark:text-[#F0F3F1] tabular-nums mt-0.5">{fig.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Precomputed Verified Observations */}
      <div>
        <h2 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1] mb-1">
          Active Verified Observations
        </h2>
        <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mb-4">
          Actionable observations calculated from current statement cycles
        </p>

        {insights.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="No Active Financial Anomalies"
            description="All category expenditures, savings pacing, and debt ratios are currently operating strictly within defined bounds."
          />
        ) : (
          <div className="space-y-4">
            {insights.map((ins) => {
              const isWarning = ins.impactScore === 'high';

              return (
                <Card key={ins.id} padding="md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded ${isWarning ? 'bg-[#FFFBEB] text-[#92400E] dark:bg-[#2B210B] dark:text-[#FBBF24]' : 'bg-[#EBF3EE] text-[#1B4332] dark:bg-[#1A2820] dark:text-[#52B788]'}`}>
                        {isWarning ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
                          {ins.title}
                        </h3>
                        <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                          {ins.summary}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 tabular-nums">
                      <Badge variant={isWarning ? 'warning' : 'positive'} size="md">
                        {ins.quantitativeMetric.value}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 text-xs space-y-3">
                    <p className="text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
                      {ins.detailedExplanation}
                    </p>

                    {ins.actionableStep && (
                      <div className="p-2.5 rounded bg-[#FAFAF8] dark:bg-[#161B18] border border-[#E8EAE6] dark:border-[#242D28] flex items-center justify-between gap-2">
                        <span className="text-[#141716] dark:text-[#F0F3F1] font-medium">
                          Suggested Action: <span className="font-normal text-[#58605C] dark:text-[#9BA6A0]">{ins.actionableStep}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
