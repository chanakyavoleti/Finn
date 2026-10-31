import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { MetricCard } from '../components/common/MetricCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Plus, 
  PiggyBank, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3,
  Calendar
} from 'lucide-react';
import { Budget } from '../types';

export const BudgetsView: React.FC = () => {
  const { budgets, metrics, addBudget, updateBudgetLimit, formatAmount, primaryCurrency } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [editLimitVal, setEditLimitVal] = useState('');

  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthElapsedPct = (currentDay / daysInMonth) * 100;

  const overrunBudgets = budgets.filter(b => b.spent > b.limit);
  const overrunSummary = overrunBudgets.length > 0 
    ? `Overrun: ${overrunBudgets.map(b => b.categoryName).join(', ')}`
    : 'All tracked categories within allocation limits';

  const handleAddBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newLimit);
    if (!newCategoryName.trim() || isNaN(limit) || limit <= 0) return;

    addBudget({
      categoryId: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
      categoryName: newCategoryName.trim(),
      limit,
      period: 'monthly'
    });

    setNewCategoryName('');
    setNewLimit('');
    setIsAddModalOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const limit = parseFloat(editLimitVal);
    if (isNaN(limit) || limit <= 0) return;

    updateBudgetLimit(editingBudget.id, limit);
    setEditingBudget(null);
  };

  const totalRemaining = metrics.totalBudgetLimit - metrics.totalBudgetSpent;

  return (
    <div className="space-y-6">
      {/* Top Level Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Planned Allocation"
          value={formatAmount(metrics.totalBudgetLimit)}
          subValue="/ month"
          secondaryContext="Sum of monitored spending categories"
          accent="forest"
        />
        <MetricCard
          label="Actual Month-to-Date Spend"
          value={formatAmount(metrics.totalBudgetSpent)}
          trend={{ 
            value: `${metrics.budgetStatusPct.toFixed(1)}% of limit`, 
            isPositive: metrics.budgetStatusPct <= 100 
          }}
          secondaryContext={`Day ${currentDay} of ${daysInMonth} (${monthElapsedPct.toFixed(0)}% elapsed)`}
        />
        <MetricCard
          label="Net Remaining Headroom"
          value={formatAmount(Math.max(0, totalRemaining))}
          trend={{
            value: totalRemaining >= 0 ? 'Within budget' : 'Deficit',
            isPositive: totalRemaining >= 0,
            isNeutral: false
          }}
          secondaryContext={totalRemaining >= 0 ? 'Projected surplus at month end' : 'Budget overrun detected'}
        />
        <MetricCard
          label="Category Health"
          value={`${budgets.filter(b => b.spent <= b.limit).length} of ${budgets.length}`}
          subValue="on track"
          trend={{ 
            value: overrunBudgets.length > 0 ? `${overrunBudgets.length} overrun` : '100% healthy', 
            isPositive: overrunBudgets.length === 0,
            isNeutral: false
          }}
          secondaryContext={overrunSummary}
        />
      </div>

      {/* Month Pacing Context Bar */}
      <div className="p-3.5 rounded-lg border border-[#E8EAE6] dark:border-[#242D28] bg-white dark:bg-[#151917] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#1B4332] dark:text-[#52B788]" />
          <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
            October Spending Velocity:
          </span>
          <span className="text-[#58605C] dark:text-[#9BA6A0]">
            At 93.5% through the cycle, spending is tracking at 93.2% of total allocations.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Create Category Cap
          </Button>
        </div>
      </div>

      {/* Detailed Categories List */}
      {budgets.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={24} />}
          title="No Budgets Configured"
          description="Establish monthly spending caps for essentials and discretionary categories to keep your cash flow predictable."
          actionText="Establish Category Cap"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((b) => {
            const pct = (b.spent / b.limit) * 100;
            const remaining = b.limit - b.spent;
            const isOver = pct > 100;
            const isWarning = pct > 85 && !isOver;

            return (
              <Card key={b.id} padding="md">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
                      {b.categoryName}
                    </h3>
                    <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5 tabular-nums">
                      {isOver ? (
                        <span className="text-[#991B1B] dark:text-[#F87171] font-medium">
                          {formatAmount(Math.abs(remaining))} over monthly cap
                        </span>
                      ) : (
                        <span>{formatAmount(remaining)} remaining to spend</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOver && (
                      <Badge variant="negative" size="sm" dot>Exceeded</Badge>
                    )}
                    {isWarning && (
                      <Badge variant="warning" size="sm" dot>Warning (85%+)</Badge>
                    )}
                    {!isOver && !isWarning && (
                      <Badge variant="positive" size="sm" dot>On Track</Badge>
                    )}

                    <button
                      onClick={() => {
                        setEditingBudget(b);
                        setEditLimitVal(b.limit.toString());
                      }}
                      className="p-1 rounded text-[#8A928E] hover:text-[#141716] dark:text-[#6B7771] dark:hover:text-[#F0F3F1] finn-focus cursor-pointer"
                      title="Edit monthly cap"
                      aria-label={`Edit ${b.categoryName} budget cap`}
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded bg-[#E8EAE6] dark:bg-[#252E28] overflow-hidden my-3">
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      isOver 
                        ? 'bg-[#B91C1C] dark:bg-[#F87171]' 
                        : isWarning 
                        ? 'bg-[#B45309] dark:bg-[#FBBF24]' 
                        : 'bg-[#1B4332] dark:bg-[#2D6A4F]'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Figures Breakdown */}
                <div className="flex items-center justify-between text-xs tabular-nums pt-1 border-t border-[#E8EAE6] dark:border-[#242D28]">
                  <span className="text-[#58605C] dark:text-[#9BA6A0]">
                    Spent: <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">{formatAmount(b.spent)}</span>
                  </span>
                  <span className="text-[#58605C] dark:text-[#9BA6A0]">
                    Cap: <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">{formatAmount(b.limit)}</span>
                  </span>
                  <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Budget Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Establish Monthly Budget Cap"
        description="Set a target spending limit for a specific cash flow category."
      >
        <form onSubmit={handleAddBudgetSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Travel & Hotels"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Monthly Cap Limit (USD)
            </label>
            <input
              type="number"
              required
              min="1"
              step="10"
              placeholder="500"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Cap
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        title={`Adjust Cap: ${editingBudget?.categoryName}`}
        description="Update the monthly expenditure threshold for this category."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              New Monthly Cap Limit (USD)
            </label>
            <input
              type="number"
              required
              min="1"
              step="10"
              value={editLimitVal}
              onChange={(e) => setEditLimitVal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingBudget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Update Cap
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
