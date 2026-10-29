import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { MetricCard } from '../components/common/MetricCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Target, 
  Plus, 
  Calendar, 
  ArrowUpRight, 
  DollarSign, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';
import { SavingsGoal } from '../types';

export const GoalsView: React.FC = () => {
  const { goals, addGoal, contributeToGoal, formatAmount, primaryCurrency } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');

  // Add goal form fields
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-12-31');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [category, setCategory] = useState('Reserve');
  const [notes, setNotes] = useState('');

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const monthly = parseFloat(monthlyContribution) || 0;
    if (!name.trim() || isNaN(target) || target <= 0) return;

    addGoal({
      name: name.trim(),
      targetAmount: target,
      targetDate,
      monthlyContribution: monthly,
      category,
      notes: notes.trim()
    });

    setName('');
    setTargetAmount('');
    setMonthlyContribution('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId) return;
    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) return;

    contributeToGoal(contributeGoalId, amount);
    setContributionAmount('');
    setContributeGoalId(null);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Cumulative Goals Target"
          value={formatAmount(totalTarget)}
          subValue={primaryCurrency}
          secondaryContext={`${goals.length} defined capital milestones`}
          accent="forest"
        />
        <MetricCard
          label="Total Capital Saved"
          value={formatAmount(totalCurrent)}
          trend={{ value: `${overallProgress.toFixed(1)}% achieved`, isPositive: true }}
          secondaryContext={`${formatAmount(Math.max(0, totalTarget - totalCurrent))} remaining to complete`}
        />
        <MetricCard
          label="Planned Monthly Inflow"
          value={formatAmount(goals.reduce((sum, g) => sum + g.monthlyContribution, 0))}
          subValue="/ month"
          secondaryContext="Automated transfers to emergency & investment reserves"
        />
        <MetricCard
          label="Nearest Horizon"
          value="Dec 31, 2026"
          trend={{ value: '62 days remaining', isNeutral: true }}
          secondaryContext="Emergency Reserve milestone (91.6%)"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
            Active Capital Milestones
          </h2>
          <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
            Structured contribution plans tied to tangible life and liquidity goals
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Define New Goal
        </Button>
      </div>

      {/* Goals Cards Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={24} />}
          title="No Savings Milestones Defined"
          description="Create designated targets for emergency reserves, home equity down payments, or major life investments."
          actionText="Define Savings Goal"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
            const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;

            return (
              <Card key={goal.id} padding="md" className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="brand" size="sm">
                      {goal.category}
                    </Badge>
                    <span className="text-xs font-bold text-[#1B4332] dark:text-[#52B788] tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1] leading-snug">
                    {goal.name}
                  </h3>

                  {goal.notes && (
                    <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-1 leading-relaxed">
                      {goal.notes}
                    </p>
                  )}

                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden my-3.5">
                    <div
                      className="h-full bg-[#1B4332] dark:bg-[#2D6A4F] rounded transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-1.5 text-xs tabular-nums pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
                    <div className="flex justify-between">
                      <span className="text-[#58605C] dark:text-[#9BA6A0]">Current Capital:</span>
                      <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">{formatAmount(goal.currentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#58605C] dark:text-[#9BA6A0]">Target Milestone:</span>
                      <span className="text-[#58605C] dark:text-[#9BA6A0]">{formatAmount(goal.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#58605C] dark:text-[#9BA6A0]">Remaining Needed:</span>
                      <span className="font-medium text-[#1B4332] dark:text-[#52B788]">{formatAmount(remaining)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Horizon & Contribution Action */}
                <div className="pt-3 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] tabular-nums">
                    <div>Target: {goal.targetDate}</div>
                    {monthsLeft !== null && (
                      <div className="text-[#166534] dark:text-[#4ADE80] font-medium">
                        ~{monthsLeft} mos at {formatAmount(goal.monthlyContribution)}/mo
                      </div>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={12} />}
                    onClick={() => setContributeGoalId(goal.id)}
                  >
                    Deposit
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Define Savings Milestone"
        description="Establish an isolated goal with designated timeline and contribution plan."
      >
        <form onSubmit={handleAddGoal} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Milestone Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Secondary Vehicle Purchase"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Target Amount (USD)
              </label>
              <input
                type="number"
                required
                min="100"
                step="100"
                placeholder="15000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>

            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Monthly Contribution ($)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="500"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
              />
            </div>

            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
              >
                <option value="Safety">Safety & Emergency</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Travel">Travel & Expedition</option>
                <option value="Retirement">Retirement Buffer</option>
                <option value="Asset">Major Asset</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Account Allocation / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Stored in Marcus HYSA earning 4.40% APY"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Milestone
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Deposit Modal */}
      <Modal
        isOpen={!!contributeGoalId}
        onClose={() => setContributeGoalId(null)}
        title="Deposit Capital to Milestone"
        description="Record a capital contribution into this dedicated savings target."
      >
        <form onSubmit={handleContribute} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Contribution Amount (USD)
            </label>
            <input
              type="number"
              required
              min="1"
              step="10"
              placeholder="250.00"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setContributeGoalId(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Deposit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
