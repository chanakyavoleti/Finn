import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Users, 
  Plus, 
  Check, 
  Clock, 
  ArrowRight, 
  DollarSign,
  UserCheck
} from 'lucide-react';
import { SplitExpense } from '../types';

export const BillSplittingView: React.FC = () => {
  const { splitExpenses, addSplitExpense, settleParticipant } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('Travel');
  const [participantInput, setParticipantInput] = useState('You, Marcus Chen, Sarah Jenkins');

  // Compute metrics
  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  splitExpenses.forEach(exp => {
    const isYouPayer = exp.paidBy.toLowerCase() === 'you' || exp.paidBy.toLowerCase() === 'me';
    exp.participants.forEach(p => {
      const isYou = p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me';
      if (!p.hasPaid) {
        if (isYouPayer && !isYou) {
          totalOwedToYou += p.share;
        } else if (!isYouPayer && isYou) {
          totalYouOwe += p.share;
        }
      }
    });
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(totalAmount);
    if (!title.trim() || isNaN(amount) || amount <= 0) return;

    const names = participantInput
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) return;

    const sharePerPerson = amount / names.length;
    const participants = names.map(name => ({
      name,
      share: sharePerPerson,
      hasPaid: name.toLowerCase() === 'you' || name.toLowerCase() === 'me'
    }));

    addSplitExpense({
      title: title.trim(),
      totalAmount: amount,
      paidBy: 'You',
      date: new Date().toISOString().split('T')[0],
      category,
      status: 'unsettled',
      participants,
      notes: `Split equally (${names.length} ways)`
    });

    setTitle('');
    setTotalAmount('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Owed to You"
          value={`$${totalOwedToYou.toFixed(2)}`}
          trend={{ value: `${splitExpenses.filter(e => e.status === 'unsettled').length} open items`, isPositive: true }}
          secondaryContext="Unsettled balances from group disbursements"
          accent="forest"
        />
        <MetricCard
          label="Total You Owe"
          value={`$${totalYouOwe.toFixed(2)}`}
          trend={{ value: totalYouOwe === 0 ? 'Fully settled' : 'Payment due', isPositive: totalYouOwe === 0 }}
          secondaryContext="Your outstanding balance on shared events"
        />
        <MetricCard
          label="Shared Events Recorded"
          value={`${splitExpenses.length} Shared Bills`}
          secondaryContext="Cabin rentals, dinners, utilities"
        />
        <MetricCard
          label="Settlement Ratio"
          value={`${splitExpenses.filter(e => e.status === 'settled').length} / ${splitExpenses.length}`}
          subValue="Settled"
          secondaryContext="Historical settlement tracking"
        />
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
            Shared Expenses & Group Ledgers
          </h2>
          <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
            Transparent split tracking, participant breakdowns, and one-click settlements
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Shared Bill
        </Button>
      </div>

      {/* Shared Expenses List */}
      {splitExpenses.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          title="No Shared Expenses"
          description="Log group dinners, travel bookings, or roommate utility splits to track who owes what."
          actionText="Log Shared Bill"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {splitExpenses.map((exp) => {
            const isSettled = exp.status === 'settled';

            return (
              <Card key={exp.id} padding="md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
                        {exp.title}
                      </h3>
                      <Badge variant={isSettled ? 'positive' : 'warning'} size="sm" dot>
                        {isSettled ? 'Fully Settled' : 'Pending Settlement'}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {exp.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                      Paid by <span className="font-medium text-[#141716] dark:text-[#F0F3F1]">{exp.paidBy}</span> on {exp.date} {exp.notes ? `· ${exp.notes}` : ''}
                    </p>
                  </div>

                  <div className="text-right tabular-nums">
                    <span className="text-xs text-[#8A928E] dark:text-[#6B7771]">Total Bill:</span>{' '}
                    <span className="text-base font-bold text-[#141716] dark:text-[#F0F3F1]">
                      ${exp.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Participants Matrix */}
                <div className="pt-3">
                  <h4 className="text-[11px] font-semibold text-[#8A928E] dark:text-[#6B7771] uppercase tracking-wider mb-2">
                    Participants & Balance Status
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {exp.participants.map((p) => {
                      const isSelf = p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me';
                      return (
                        <div
                          key={p.name}
                          className={`p-2.5 rounded border text-xs flex items-center justify-between gap-2 ${
                            p.hasPaid
                              ? 'bg-[#F9FAF8] border-[#E8EAE6] dark:bg-[#161B18] dark:border-[#242D28]'
                              : 'bg-white border-[#FDE68A] dark:bg-[#1E190E] dark:border-[#5C4512]'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                              {p.name} {isSelf && '(You)'}
                            </div>
                            <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] tabular-nums mt-0.5">
                              Share: ${p.share.toFixed(2)}
                            </div>
                          </div>

                          <div>
                            {p.hasPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#166534] dark:text-[#4ADE80] font-medium">
                                <Check size={12} /> Settled
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => settleParticipant(exp.id, p.name)}
                                title="Mark balance as settled"
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Shared Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Shared Expense"
        description="Split a group bill equally across participants."
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Event / Expense Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ski Weekend Lodging"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Total Amount (USD)
              </label>
              <input
                type="number"
                step="0.01"
                required
                min="1"
                placeholder="400.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
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
                <option value="Travel">Travel & Lodging</option>
                <option value="Dining">Dining & Food</option>
                <option value="Utilities">Utilities & Rent</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Participants (Comma-separated)
            </label>
            <input
              type="text"
              required
              placeholder="You, Marcus Chen, Sarah Jenkins, David Miller"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
            <p className="text-[11px] text-[#8A928E] dark:text-[#6B7771] mt-1">
              The total amount will be divided evenly across all specified individuals.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Split
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
