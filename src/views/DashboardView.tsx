import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { MetricCard } from '../components/common/MetricCard';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart';
import { SpendingBreakdownChart } from '../components/charts/SpendingBreakdownChart';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  PlusCircle,
  Landmark
} from 'lucide-react';

interface DashboardViewProps {
  onOpenAddTransaction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenAddTransaction }) => {
  const { 
    metrics, 
    transactions, 
    budgets, 
    goals, 
    accounts,
    insights, 
    setActivePage,
    isDemoMode,
    toggleDemoMode,
    formatAmount,
    primaryCurrency
  } = useFinance();

  // If live mode and no accounts/transactions, show guided empty state
  if (accounts.length === 0 && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="border border-[#E8EAE6] dark:border-[#242D28] rounded-lg p-6 bg-white dark:bg-[#151917]">
          <h2 className="text-base font-semibold text-[#141716] dark:text-[#F0F3F1]">
            Welcome to FINN Live Production
          </h2>
          <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-1 max-w-xl leading-relaxed">
            Your workspace is active in live verified mode. To construct your financial overview, connect an institution via Open Banking API or record manual initial transactions.
          </p>
        </div>

        <EmptyState
          icon={<Landmark size={24} />}
          title="No Financial Institutions Connected"
          description="Link checking, high-yield savings, brokerage, or retirement accounts to activate automatic ledger reconciliation, cash flow projections, and budget tracking."
          actionText="Link Financial Institution"
          onAction={() => setActivePage('accounts')}
          secondaryActionText="Load Demonstration Dataset"
          onSecondaryAction={toggleDemoMode}
        />
      </div>
    );
  }

  // Answer 7: What requires my attention?
  const highPriorityInsight = insights[0];
  const upcomingGoal = goals[0];
  const overBudgetItems = budgets.filter(b => b.spent > b.limit);

  // Dynamic context derived from active transactions
  const incomeTx = transactions.filter(t => t.type === 'income');
  const topIncomeContext = incomeTx.length > 0
    ? incomeTx.slice(0, 2).map(t => `${t.merchant} (${formatAmount(t.amount, { compact: true })})`).join(' · ')
    : 'No earned income recorded';

  const expenseTx = transactions.filter(t => t.type === 'expense');
  const topExpenseContext = expenseTx.length > 0
    ? expenseTx.slice(0, 2).map(t => `${t.merchant} (${formatAmount(t.amount, { compact: true })})`).join(' · ')
    : 'No expenditures recorded';

  const savingsContext = metrics.netSavings >= 0
    ? 'Net surplus accumulated across liquid & investment reserves'
    : 'Net deficit drawn down from available cash balances';

  return (
    <div className="space-y-6">
      {/* SECTION 1: THE CORE FINANCIAL SUMMARY (Answers Q1, Q2, Q3, Q4) */}
      <section aria-labelledby="primary-metrics-heading">
        <h2 id="primary-metrics-heading" className="sr-only">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Question 1: How much money do I have? */}
          <MetricCard
            label="Total Net Worth"
            value={formatAmount(metrics.totalNetWorth)}
            subValue={primaryCurrency}
            trend={{ value: `${accounts.length} Accounts`, isNeutral: true }}
            secondaryContext={`Cash: ${formatAmount(metrics.liquidCash)} · Invested: ${formatAmount(metrics.totalInvested)}${metrics.totalDebt > 0 ? ` · Debt: ${formatAmount(metrics.totalDebt)}` : ''}`}
            accent="forest"
            tooltip="Liquid deposits plus brokerage minus credit liabilities"
          />

          {/* Question 2: How much did I earn? */}
          <MetricCard
            label="Earned Income"
            value={formatAmount(metrics.totalIncome)}
            trend={{ value: `${incomeTx.length} credits`, isNeutral: true }}
            secondaryContext={topIncomeContext}
          />

          {/* Question 3: How much did I spend? */}
          <MetricCard
            label="Total Expenditures"
            value={formatAmount(metrics.totalExpenses)}
            trend={{ value: `${expenseTx.length} disbursements`, isNeutral: true }}
            secondaryContext={topExpenseContext}
          />

          {/* Question 4: How much did I save? */}
          <MetricCard
            label="Net Monthly Savings"
            value={formatAmount(metrics.netSavings)}
            trend={{ 
              value: `${metrics.savingsRatePct.toFixed(1)}% savings rate`, 
              isPositive: metrics.netSavings >= 0,
              isNeutral: metrics.totalIncome === 0 
            }}
            secondaryContext={savingsContext}
          />
        </div>
      </section>

      {/* SECTION 2: ATTENTION & ACTION BANNER (Answer Q7: What requires my attention?) */}
      <section aria-labelledby="attention-heading">
        <div className="bg-[#FAFBF9] dark:bg-[#161C19] border border-[#E4E8E5] dark:border-[#222E27] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#2B210B] dark:text-[#FBBF24] dark:border-[#5C4512] shrink-0 mt-0.5">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#141716] dark:text-[#F0F3F1]">
                  {overBudgetItems.length > 0 
                    ? `Attention Required: Budget Threshold Exceeded (${overBudgetItems[0].categoryName})`
                    : `Attention Required: ${highPriorityInsight?.title || 'Financial Ledger Current'}`
                  }
                </span>
                <Badge variant={overBudgetItems.length > 0 ? 'negative' : 'warning'} size="sm">
                  {overBudgetItems.length > 0 ? 'Exceeded' : 'Actionable'}
                </Badge>
              </div>
              <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5 leading-relaxed">
                {overBudgetItems.length > 0 
                  ? `${overBudgetItems[0].categoryName} has disbursed ${formatAmount(overBudgetItems[0].spent)} against limit of ${formatAmount(overBudgetItems[0].limit)} (+${formatAmount(overBudgetItems[0].spent - overBudgetItems[0].limit)} overrun).`
                  : highPriorityInsight?.summary || 'All monitored budget categories and liquid reserve levels are within planned thresholds.'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActivePage('advisor')}
            >
              Analyze Insight
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setActivePage('budgets')}
            >
              Adjust Limits
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 3: VISUAL CASH FLOW & SPENDING BREAKDOWN (Answers Q5: Where is my money going?) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cash Flow Over Time (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Cash Flow Consistency"
            subtitle="Historical income vs monthly expenditures (Last 6 months)"
            action={
              <button 
                onClick={() => setActivePage('analytics')} 
                className="text-xs font-medium text-[#1B4332] dark:text-[#52B788] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Deep Analytics <ArrowRight size={12} />
              </button>
            }
          >
            <IncomeExpenseChart />
          </Card>
        </div>

        {/* Question 5: Where is my money going? (5 cols) */}
        <div className="lg:col-span-5">
          <Card
            title="Spending Distribution"
            subtitle="Proportional consumption across active expense categories"
            action={
              <button 
                onClick={() => setActivePage('transactions')} 
                className="text-xs font-medium text-[#1B4332] dark:text-[#52B788] hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Categories <ArrowRight size={12} />
              </button>
            }
          >
            <SpendingBreakdownChart />
          </Card>
        </div>
      </section>

      {/* SECTION 4: BUDGET PACING & SAVINGS PROGRESS (Answers Q6: Am I staying within budget?) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question 6: Budget Progress (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Budget Pacing & Category Thresholds"
            subtitle={`Cycle day ${new Date().getDate()} of ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} (${Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}% of calendar month elapsed)`}
            action={
              <Button 
                variant="subtle" 
                size="sm" 
                onClick={() => setActivePage('budgets')}
              >
                Manage Caps
              </Button>
            }
          >
            <div className="space-y-4">
              {/* Overall Budget Bar */}
              <div className="pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">
                    Overall Monthly Allocation
                  </span>
                  <span className="tabular-nums font-semibold text-[#141716] dark:text-[#F0F3F1]">
                    {formatAmount(metrics.totalBudgetSpent)} / {formatAmount(metrics.totalBudgetLimit)}
                  </span>
                </div>
                <div className="w-full h-2 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      metrics.budgetStatusPct > 100 
                        ? 'bg-[#B91C1C] dark:bg-[#F87171]' 
                        : metrics.budgetStatusPct > 85 
                        ? 'bg-[#B45309] dark:bg-[#FBBF24]' 
                        : 'bg-[#1B4332] dark:bg-[#2D6A4F]'
                    }`}
                    style={{ width: `${Math.min(metrics.budgetStatusPct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-[#58605C] dark:text-[#9BA6A0] mt-1 tabular-nums">
                  <span>{formatAmount(Math.max(0, metrics.totalBudgetLimit - metrics.totalBudgetSpent))} remaining headroom</span>
                  <span>{metrics.budgetStatusPct.toFixed(1)}% utilized</span>
                </div>
              </div>

              {/* Category Rows */}
              <div className="space-y-3">
                {budgets.slice(0, 4).map((b) => {
                  const pct = (b.spent / b.limit) * 100;
                  const isOver = pct > 100;
                  return (
                    <div key={b.id} className="text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#141716] dark:text-[#F0F3F1] font-medium">
                          {b.categoryName}
                        </span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className={isOver ? 'text-[#991B1B] dark:text-[#F87171] font-semibold' : 'text-[#58605C] dark:text-[#9BA6A0]'}>
                            {formatAmount(b.spent)}
                          </span>
                          <span className="text-[#8A928E] dark:text-[#6B7771]">/ {formatAmount(b.limit)}</span>
                          {isOver && (
                            <Badge variant="negative" size="sm">Over limit</Badge>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden">
                        <div
                          className={`h-full rounded ${
                            isOver 
                              ? 'bg-[#B91C1C] dark:bg-[#F87171]' 
                              : pct > 85 
                              ? 'bg-[#B45309] dark:bg-[#FBBF24]' 
                              : 'bg-[#1B4332] dark:bg-[#2D6A4F]'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Savings Goals Milestones (5 cols) */}
        <div className="lg:col-span-5">
          <Card
            title="Savings Milestones"
            subtitle="Progress toward long-term capital goals"
            action={
              <Button 
                variant="subtle" 
                size="sm" 
                onClick={() => setActivePage('goals')}
              >
                View Goals
              </Button>
            }
          >
            <div className="space-y-4">
              {goals.map((goal) => {
                const progressPct = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className="p-3 rounded border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <h4 className="text-xs font-semibold text-[#141716] dark:text-[#F0F3F1]">
                          {goal.name}
                        </h4>
                        <p className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                          Target date: {goal.targetDate}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#1B4332] dark:text-[#52B788] tabular-nums">
                        {progressPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-[#1B4332] dark:bg-[#2D6A4F] rounded"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[#58605C] dark:text-[#9BA6A0] tabular-nums">
                      <span>{formatAmount(goal.currentAmount)} accumulated</span>
                      <span>Target: {formatAmount(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 5: RECENT TRANSACTIONS LEDGER MINI-VIEW */}
      <section aria-labelledby="recent-tx-heading">
        <Card
          title="Recent Ledger Records"
          subtitle="Latest double-entry postings verified against accounts"
          action={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onOpenAddTransaction}
                icon={<PlusCircle size={13} />}
              >
                Record Entry
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setActivePage('transactions')}
              >
                Full Ledger
              </Button>
            </div>
          }
          padding="none"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] text-[#58605C] dark:text-[#9BA6A0]">
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-4 font-medium">Counterparty / Description</th>
                  <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Account</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 text-right font-medium">Monetary Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
                {transactions.slice(0, 6).map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isTransfer = tx.type === 'transfer';

                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-[#F9FAF8] dark:hover:bg-[#181D1A] transition-colors"
                    >
                      <td className="py-2.5 px-4 text-[#8A928E] dark:text-[#6B7771] tabular-nums whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[#141716] dark:text-[#F0F3F1]">
                          {tx.merchant}
                        </div>
                        <div className="text-[11px] text-[#8A928E] dark:text-[#6B7771] truncate max-w-xs">
                          {tx.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#58605C] dark:text-[#9BA6A0] hidden sm:table-cell whitespace-nowrap">
                        {tx.accountName || 'Primary Account'}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="neutral" size="sm">
                          {tx.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? 'text-[#166534] dark:text-[#4ADE80]'
                              : isTransfer
                              ? 'text-[#1E40AF] dark:text-[#60A5FA]'
                              : 'text-[#141716] dark:text-[#F0F3F1]'
                          }
                        >
                          {isIncome ? '+' : isTransfer ? '' : '-'}{formatAmount(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
};
