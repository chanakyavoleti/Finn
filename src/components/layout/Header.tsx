import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Button } from '../common/Button';
import { 
  Plus, 
  RefreshCw, 
  Menu, 
  Calendar,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { DatePeriod } from '../../types';
import { CurrencyCode } from '../../utils/currency';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddTransaction: () => void;
  onOpenImportStatement?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddTransaction,
  onOpenImportStatement,
}) => {
  const { 
    activePage, 
    selectedPeriod, 
    setSelectedPeriod, 
    syncAllAccounts, 
    isDemoMode,
    accounts,
    primaryCurrency,
    setPrimaryCurrency
  } = useFinance();

  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncAllAccounts();
    setSyncing(false);
  };

  const pageMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: { 
      title: 'Financial Overview', 
      subtitle: 'Primary cash flow, net worth trajectory, and financial indicators' 
    },
    transactions: { 
      title: 'Ledger & Transactions', 
      subtitle: 'Chronological double-entry cash flow records with categorization' 
    },
    budgets: { 
      title: 'Budgets & Spending Limits', 
      subtitle: 'Planned allocations vs actual spend with pacing thresholds' 
    },
    analytics: { 
      title: 'Cash Flow Analytics', 
      subtitle: 'Multi-month trends, income vs expenses, and liquidity ratios' 
    },
    investments: { 
      title: 'Investment Portfolio', 
      subtitle: 'Asset allocation, holdings, unrealized performance, and market pricing' 
    },
    goals: { 
      title: 'Savings Milestones', 
      subtitle: 'Target objectives, automated contributions, and timeline forecasts' 
    },
    fire: { 
      title: 'Financial Independence & FIRE Calculator', 
      subtitle: 'Mathematical retirement horizon projections, inflation adjustments, and sensitivity models' 
    },
    bills: { 
      title: 'Group Expenses & Bill Splitting', 
      subtitle: 'Shared costs, balance matrices, and settlement records' 
    },
    currency: { 
      title: 'Foreign Exchange & Valuation', 
      subtitle: 'Live benchmark exchange rates and multi-currency conversion' 
    },
    advisor: { 
      title: 'Contextual Intelligence', 
      subtitle: 'Analytical financial observations verified against your actual figures' 
    },
    accounts: { 
      title: 'Connected Institutions', 
      subtitle: 'Direct bank integrations, credentials status, and synchronization' 
    },
    settings: { 
      title: 'Preferences & Security', 
      subtitle: 'Workspace configuration and security settings' 
    }
  };

  const currentMeta = pageMeta[activePage] || { title: 'FINN', subtitle: '' };

  const periods: { id: DatePeriod; label: string }[] = [
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'last_90_days', label: 'Last 90 Days' },
    { id: 'year_to_date', label: 'YTD' },
  ];

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#131614] border-b border-[#E8EAE6] dark:border-[#222925] flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded-md text-[#58605C] hover:text-[#141716] hover:bg-[#F6F7F5] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1] dark:hover:bg-[#1C221F] cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold text-[#141716] dark:text-[#F0F3F1] tracking-tight">
              {currentMeta.title}
            </h1>
            {!isDemoMode && accounts.length === 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#2B210B] dark:text-[#FBBF24] dark:border-[#5C4512]">
                <AlertCircle size={11} />
                Live Setup Pending
              </span>
            )}
          </div>
          <p className="hidden md:block text-[11px] text-[#58605C] dark:text-[#9BA6A0] line-clamp-1">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Controls & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Period Selector (Only on relevant pages) */}
        {(activePage === 'dashboard' || activePage === 'transactions' || activePage === 'budgets' || activePage === 'analytics') && (
          <div className="hidden sm:flex items-center bg-[#F6F7F5] dark:bg-[#181D1A] p-0.5 rounded-md border border-[#E8EAE6] dark:border-[#252E28]">
            <Calendar size={13} className="text-[#8A928E] dark:text-[#6B7771] ml-2 mr-1" />
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`text-[11px] font-medium px-2 py-1 rounded transition-colors finn-focus cursor-pointer ${
                  selectedPeriod === p.id
                    ? 'bg-white dark:bg-[#242D27] text-[#141716] dark:text-[#F0F3F1] shadow-2xs font-semibold'
                    : 'text-[#58605C] hover:text-[#141716] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Currency Switcher */}
        <select
          value={primaryCurrency}
          onChange={(e) => setPrimaryCurrency(e.target.value as CurrencyCode)}
          className="hidden sm:inline-block px-2 py-1 text-xs font-semibold rounded-md border border-[#E8EAE6] dark:border-[#252E28] bg-white dark:bg-[#1A1F1C] text-[#141716] dark:text-[#F0F3F1] finn-focus cursor-pointer"
          title="Switch Active Reporting Currency"
        >
          <option value="INR">₹ INR</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
          <option value="GBP">£ GBP</option>
        </select>

        {/* Bank Statement CSV Import Trigger */}
        {onOpenImportStatement && (
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet size={13} />}
            onClick={onOpenImportStatement}
            className="hidden sm:inline-flex"
            title="Import official bank statement CSV"
          >
            Import CSV
          </Button>
        )}

        {/* Sync Button */}
        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />}
          onClick={handleSync}
          loading={syncing}
          className="hidden sm:inline-flex"
          title="Synchronize linked financial institutions"
        >
          Sync
        </Button>

        {/* Primary Action Button */}
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={onOpenAddTransaction}
        >
          <span className="hidden xs:inline">Record Transaction</span>
          <span className="xs:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
};
