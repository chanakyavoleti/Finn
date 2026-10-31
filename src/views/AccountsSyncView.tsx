import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { MetricCard } from '../components/common/MetricCard';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Landmark, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { Account, AccountType } from '../types';

export const AccountsSyncView: React.FC = () => {
  const { accounts, syncAccount, syncAllAccounts, addAccount, formatAmount, primaryCurrency } = useFinance();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // New account form state
  const [institution, setInstitution] = useState('HDFC Bank');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [accountNumberMask, setAccountNumberMask] = useState('');

  const handleSyncOne = async (id: string) => {
    setSyncingId(id);
    await syncAccount(id);
    setSyncingId(null);
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    await syncAllAccounts();
    setSyncingAll(false);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedBalance = parseFloat(balance);
    if (!name.trim() || isNaN(parsedBalance)) return;

    addAccount({
      name: name.trim(),
      institution: institution.trim(),
      type,
      balance: parsedBalance,
      currency: primaryCurrency,
      accountNumberMask: accountNumberMask.trim() ? `•••• ${accountNumberMask.trim()}` : '•••• 1234',
    });

    setName('');
    setBalance('');
    setAccountNumberMask('');
    setIsAddModalOpen(false);
  };

  const totalConnectedBalance = accounts.reduce((sum, a) => {
    return a.type === 'credit' ? (a.balance < 0 ? sum - Math.abs(a.balance) : sum + a.balance) : sum + a.balance;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Direct Institution Links"
          value={`${accounts.length} Active`}
          secondaryContext="Plaid & Open Banking OAuth 2.0"
          accent="forest"
        />
        <MetricCard
          label="Reconciled Ledger Balance"
          value={formatAmount(totalConnectedBalance)}
          secondaryContext="Aggregated across depository & brokerage"
        />
        <MetricCard
          label="Encryption Standard"
          value="TLS 1.3"
          trend={{ value: 'Bank Grade', isPositive: true }}
          secondaryContext="AES-256 at rest & end-to-end tokens"
        />
        <MetricCard
          label="API Sync Status"
          value="Healthy"
          trend={{ value: '100% operational', isPositive: true }}
          secondaryContext="Zero synchronization timeouts"
        />
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
            Linked Financial Institutions
          </h2>
          <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
            Real-time API reconciliation channels for depository, credit, and investment accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={syncingAll ? 'animate-spin' : ''} />}
            onClick={handleSyncAll}
            loading={syncingAll}
          >
            Re-sync All Links
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Link Institution
          </Button>
        </div>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark size={24} />}
          title="No Financial Institutions Connected"
          description="Authenticate via secure bank credentials to link real-time balances and verified transactions directly to FINN."
          actionText="Link Financial Institution"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => {
            const isSyncing = syncingId === acc.id || acc.status === 'syncing';
            const isError = acc.status === 'error';
            const formattedDate = new Date(acc.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <Card key={acc.id} padding="md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#F2F5F3] dark:bg-[#1A251F] text-[#1B4332] dark:text-[#52B788] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-[#E8EAE6] dark:border-[#252E28]">
                      {acc.institution.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#141716] dark:text-[#F0F3F1]">
                          {acc.name}
                        </h3>
                        <Badge variant="neutral" size="sm">
                          {acc.accountNumberMask}
                        </Badge>
                        <Badge 
                          variant={isError ? 'negative' : 'positive'} 
                          size="sm" 
                          dot
                        >
                          {isError ? 'Attention Needed' : 'Active Channel'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                        {acc.institution} · <span className="capitalize">{acc.type}</span> · Reconciled at {formattedDate}
                      </p>
                      {acc.errorMessage && (
                        <p className="text-xs text-[#991B1B] dark:text-[#F87171] mt-1 flex items-center gap-1 font-medium">
                          <AlertCircle size={12} /> {acc.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right tabular-nums">
                      <div className="text-sm sm:text-base font-bold text-[#141716] dark:text-[#F0F3F1]">
                        {acc.balance < 0 ? `-$${Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `$${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      </div>
                      <div className="text-[11px] text-[#8A928E] dark:text-[#6B7771]">
                        {acc.type === 'credit' ? 'Current balance owed' : 'Available balance'}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />}
                      onClick={() => handleSyncOne(acc.id)}
                      loading={isSyncing}
                      title="Request live balance update from provider"
                    >
                      Sync
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Security & Open Banking Guarantee */}
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-[#EBF3EE] text-[#1B4332] dark:bg-[#1A2820] dark:text-[#52B788] shrink-0">
            <Lock size={16} />
          </div>
          <div className="text-xs">
            <h4 className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
              Read-Only Financial Data Guarantee
            </h4>
            <p className="text-[#58605C] dark:text-[#9BA6A0] mt-1 leading-relaxed">
              FINN operates strictly under read-only OAuth credentials authorized through Federal Open Banking guidelines. No credentials or login passwords are ever stored on FINN servers. Funds cannot be moved, withdrawn, or debited through this interface.
            </p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-[#166534] dark:text-[#4ADE80] font-medium">
              <span className="flex items-center gap-1"><ShieldCheck size={12} /> SOC-2 Type II Verified</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} /> Read-Only Consent Active</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Link Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Connect Financial Institution"
        description="Establish a secure OAuth 2.0 integration with your bank or brokerage."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Select Financial Institution
            </label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            >
              <option value="Chase Bank">Chase Bank (JPMorgan)</option>
              <option value="Marcus by Goldman Sachs">Marcus by Goldman Sachs</option>
              <option value="Vanguard">Vanguard Group</option>
              <option value="Fidelity Investments">Fidelity Investments</option>
              <option value="American Express">American Express</option>
              <option value="Charles Schwab">Charles Schwab</option>
              <option value="Bank of America">Bank of America</option>
              <option value="Ledger Hardware Wallet">Ledger Hardware Cold Storage</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Account Label / Purpose
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Operations Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Account Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus"
              >
                <option value="checking">Checking (Depository)</option>
                <option value="savings">High-Yield Savings</option>
                <option value="credit">Credit Card (Liability)</option>
                <option value="investment">Taxable Brokerage / IRA</option>
                <option value="crypto">Cold Reserve / Crypto</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
                Current Reconciled Balance ($)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="5000.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#58605C] dark:text-[#9BA6A0] mb-1">
              Account Mask (Last 4 Digits)
            </label>
            <input
              type="text"
              maxLength={4}
              placeholder="4819"
              value={accountNumberMask}
              onChange={(e) => setAccountNumberMask(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus tabular-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8EAE6] dark:border-[#252E28]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Authorize Integration
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
