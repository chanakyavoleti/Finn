import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Search, 
  Download, 
  Plus, 
  Trash2, 
  Pencil,
  Receipt,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { TransactionType, Transaction } from '../types';
import { sanitizeCsvCell } from '../utils/currency';
import { AddTransactionModal } from '../components/modals/AddTransactionModal';

interface TransactionsViewProps {
  onOpenAddTransaction: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ onOpenAddTransaction }) => {
  const { transactions, deleteTransaction, accounts, formatAmount, primaryCurrency } = useFinance();

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'merchant'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Filter & Sort
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = 
        t.merchant.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase());

      const matchCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const matchType = selectedType === 'all' || t.type === selectedType;
      const matchAccount = selectedAccount === 'all' || t.accountId === selectedAccount;

      return matchSearch && matchCategory && matchType && matchAccount;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortField === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      if (sortField === 'merchant') {
        return sortOrder === 'desc' 
          ? b.merchant.localeCompare(a.merchant) 
          : a.merchant.localeCompare(b.merchant);
      }
      return 0;
    });
  }, [transactions, search, selectedCategory, selectedType, selectedAccount, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: 'date' | 'amount' | 'merchant') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Date', 'Type', 'Category', 'Merchant', 'Description', 'Amount', 'Account'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.type,
      sanitizeCsvCell(t.category),
      sanitizeCsvCell(t.merchant),
      sanitizeCsvCell(t.description),
      t.amount.toFixed(2),
      sanitizeCsvCell(t.accountName || '')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finn_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A928E] dark:text-[#6B7771]" />
            <input
              type="text"
              placeholder="Search merchant, memo, or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus text-xs cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus text-xs cursor-pointer capitalize"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfers Only</option>
            </select>

            {/* Account Filter */}
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus text-xs cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              title="Export ledger to standard CSV format"
            >
              CSV
            </Button>

            {/* Record Transaction Button */}
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={onOpenAddTransaction}
            >
              Add Entry
            </Button>
          </div>
        </div>
      </Card>

      {/* Transactions Table Ledger */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<Receipt size={24} />}
          title="No Transactions Found"
          description={
            search || selectedCategory !== 'all' || selectedType !== 'all'
              ? "No ledger records match the active search criteria or filters."
              : "No transactions have been recorded yet. Post your first financial entry or synchronize your account."
          }
          actionText="Add Transaction"
          onAction={onOpenAddTransaction}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18] text-[#58605C] dark:text-[#9BA6A0]">
                  <th 
                    onClick={() => handleSort('date')}
                    className="py-2.5 px-4 font-medium cursor-pointer hover:text-[#141716] dark:hover:text-[#F0F3F1] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown size={11} className={sortField === 'date' ? 'text-[#1B4332] dark:text-[#52B788]' : ''} />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('merchant')}
                    className="py-2.5 px-4 font-medium cursor-pointer hover:text-[#141716] dark:hover:text-[#F0F3F1] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Counterparty / Memo</span>
                      <ArrowUpDown size={11} className={sortField === 'merchant' ? 'text-[#1B4332] dark:text-[#52B788]' : ''} />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Account</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th 
                    onClick={() => handleSort('amount')}
                    className="py-2.5 px-4 font-medium text-right cursor-pointer hover:text-[#141716] dark:hover:text-[#F0F3F1] select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount ({primaryCurrency})</span>
                      <ArrowUpDown size={11} className={sortField === 'amount' ? 'text-[#1B4332] dark:text-[#52B788]' : ''} />
                    </div>
                  </th>
                  <th className="py-2.5 px-4 text-center font-medium w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EAE6] dark:divide-[#242D28]">
                {paginatedTransactions.map((tx) => {
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
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                            {tx.merchant}
                          </span>
                          {tx.paymentMethod === 'upi' && (
                            <Badge variant="brand" size="sm">UPI</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-[#58605C] dark:text-[#9BA6A0] truncate max-w-sm">
                          {tx.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#58605C] dark:text-[#9BA6A0] hidden sm:table-cell whitespace-nowrap">
                        {tx.accountName || 'Primary Account'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge 
                          variant={isIncome ? 'positive' : isTransfer ? 'neutral' : 'brand'} 
                          size="sm"
                        >
                          {tx.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap">
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
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingTransaction(tx)}
                            className="p-1 text-[#8A928E] hover:text-[#1B4332] dark:text-[#6B7771] dark:hover:text-[#52B788] rounded finn-focus cursor-pointer transition-colors"
                            title="Edit transaction"
                            aria-label={`Edit transaction from ${tx.merchant}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1 text-[#8A928E] hover:text-[#991B1B] dark:text-[#6B7771] dark:hover:text-[#F87171] rounded finn-focus cursor-pointer transition-colors"
                            title="Delete entry"
                            aria-label={`Delete transaction from ${tx.merchant}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary & Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E8EAE6] dark:border-[#242D28] text-xs text-[#58605C] dark:text-[#9BA6A0]">
            <div>
              Showing <span className="font-medium text-[#141716] dark:text-[#F0F3F1] tabular-nums">{paginatedTransactions.length}</span> of{' '}
              <span className="font-medium text-[#141716] dark:text-[#F0F3F1] tabular-nums">{filteredTransactions.length}</span> entries
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                <span className="px-2.5 tabular-nums text-xs font-medium text-[#141716] dark:text-[#F0F3F1]">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <AddTransactionModal
          isOpen={true}
          onClose={() => setEditingTransaction(null)}
          initialTransaction={editingTransaction}
        />
      )}
    </div>
  );
};
