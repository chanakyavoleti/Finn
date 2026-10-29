import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { TransactionType } from '../../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { accounts, addTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Groceries');
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-1');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const categories = [
    'Housing', 'Groceries', 'Dining', 'Utilities', 
    'Transport', 'Healthcare', 'Shopping', 'Subscriptions', 
    'Salary', 'Dividends', 'Freelance', 'Savings', 'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!merchant.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const selectedAcc = accounts.find(a => a.id === accountId);

    addTransaction({
      accountId,
      accountName: selectedAcc ? selectedAcc.name : 'Primary Account',
      date,
      amount: parsedAmount,
      type,
      category,
      merchant: merchant.trim(),
      description: description.trim() || `${category} - ${merchant.trim()}`,
      status: 'posted',
      tags: [category]
    });

    // Reset and close
    setMerchant('');
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Financial Transaction"
      description="Add a verified ledger entry to your personal finance records."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Type Toggle: Expense / Income / Transfer */}
        <div>
          <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1.5">
            Entry Type
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F6F7F5] dark:bg-[#1C221F] rounded-md border border-[#E8EAE6] dark:border-[#252E28]">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-1.5 capitalize font-medium rounded transition-colors finn-focus cursor-pointer ${
                  type === t
                    ? 'bg-white dark:bg-[#252D27] text-[#141716] dark:text-[#F0F3F1] shadow-2xs font-semibold'
                    : 'text-[#58605C] hover:text-[#141716] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Merchant & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-merchant" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Merchant / Counterparty <span className="text-[#991B1B]">*</span>
            </label>
            <input
              id="tx-merchant"
              type="text"
              required
              placeholder="e.g. Whole Foods Market"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div>
            <label htmlFor="tx-amount" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Amount (USD) <span className="text-[#991B1B]">*</span>
            </label>
            <input
              id="tx-amount"
              type="number"
              step="0.01"
              required
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-medium"
            />
          </div>
        </div>

        {/* Category & Account */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-category" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Category
            </label>
            <select
              id="tx-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tx-account" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Funding Account
            </label>
            <select
              id="tx-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            >
              {accounts.length > 0 ? (
                accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution})
                  </option>
                ))
              ) : (
                <option value="acc-1">Default Cash Ledger</option>
              )}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="tx-date" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
            Transaction Date
          </label>
          <input
            id="tx-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
          />
        </div>

        {/* Description / Memo */}
        <div>
          <label htmlFor="tx-desc" className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
            Memo / Description (Optional)
          </label>
          <input
            id="tx-desc"
            type="text"
            placeholder="Add relevant notes or receipt details"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Post Record
          </Button>
        </div>
      </form>
    </Modal>
  );
};
