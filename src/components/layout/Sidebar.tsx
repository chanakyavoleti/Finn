import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { NavPage } from '../../types';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  LineChart,
  TrendingUp,
  Target,
  Users,
  ArrowLeftRight,
  Sparkles,
  Landmark,
  Flame,
  Sun,
  Moon,
  Database,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { 
    activePage, 
    setActivePage, 
    theme, 
    toggleTheme, 
    isDemoMode, 
    toggleDemoMode,
    accounts
  } = useFinance();

  const handleNav = (page: NavPage) => {
    setActivePage(page);
    if (onCloseMobile) onCloseMobile();
  };

  const navGroups: NavGroup[] = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      group: 'Cash Flow',
      items: [
        { id: 'transactions', label: 'Transactions', icon: Receipt },
        { id: 'budgets', label: 'Budgets & Pacing', icon: PiggyBank },
        { id: 'analytics', label: 'Cash Flow Analytics', icon: LineChart },
      ]
    },
    {
      group: 'Wealth',
      items: [
        { id: 'investments', label: 'Investments', icon: TrendingUp },
        { id: 'goals', label: 'Savings Goals', icon: Target },
        { id: 'fire', label: 'Financial Freedom (FIRE)', icon: Flame },
      ]
    },
    {
      group: 'Tools',
      items: [
        { id: 'bills', label: 'Bill Splitting', icon: Users },
        { id: 'currency', label: 'FX & Currencies', icon: ArrowLeftRight },
        { id: 'advisor', label: 'Financial Intelligence', icon: Sparkles },
      ]
    },
    {
      group: 'Management',
      items: [
        { id: 'accounts', label: 'Institutions & Sync', icon: Landmark, badge: accounts.length.toString() },
      ]
    }
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-white dark:bg-[#131614] border-r border-[#E8EAE6] dark:border-[#222925] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-[#E8EAE6] dark:border-[#222925]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1B4332] dark:bg-[#2D6A4F] flex items-center justify-center text-white font-bold text-sm shadow-2xs tracking-tighter">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-[#141716] dark:text-[#F0F3F1]">
                FINN
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#EBF3EE] text-[#1B4332] dark:bg-[#1B2921] dark:text-[#52B788]">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-[#8A928E] dark:text-[#6B7771] tracking-tight">
              Financial Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((grp) => (
          <div key={grp.group}>
            <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A928E] dark:text-[#6B7771]">
              {grp.group}
            </div>
            <div className="space-y-0.5">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors finn-focus cursor-pointer ${
                      isActive
                        ? 'bg-[#EBF3EE] text-[#1B4332] font-semibold dark:bg-[#1E2922] dark:text-[#52B788]'
                        : 'text-[#58605C] hover:text-[#141716] hover:bg-[#F6F7F5] dark:text-[#9BA6A0] dark:hover:text-[#F0F3F1] dark:hover:bg-[#181D1A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={16}
                        className={isActive ? 'text-[#1B4332] dark:text-[#52B788]' : 'text-[#8A928E] dark:text-[#6B7771]'}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E8EAE6] text-[#58605C] dark:bg-[#252E28] dark:text-[#9BA6A0] tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Controls: Environment & Theme */}
      <div className="p-3 border-t border-[#E8EAE6] dark:border-[#222925] space-y-2 bg-[#FAFAF8] dark:bg-[#111312]">
        {/* Demonstration Mode Switch */}
        <button
          onClick={toggleDemoMode}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] border transition-colors cursor-pointer finn-focus ${
            isDemoMode
              ? 'bg-[#F2F7F4] border-[#C2DBCB] text-[#1B4332] dark:bg-[#17261D] dark:border-[#244A36] dark:text-[#52B788]'
              : 'bg-white border-[#E8EAE6] text-[#58605C] dark:bg-[#151917] dark:border-[#252D27] dark:text-[#9BA6A0]'
          }`}
          title="Toggle between realistic sample dataset and zero-state live workspace"
        >
          <div className="flex items-center gap-2">
            <Database size={13} />
            <span className="font-medium">{isDemoMode ? 'Demo Dataset' : 'Clean Live State'}</span>
          </div>
          <span className="text-[10px] uppercase font-semibold">
            {isDemoMode ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Theme & Security Status */}
        <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-[#58605C] dark:text-[#9BA6A0]">
          <div className="flex items-center gap-1.5 text-[10px] text-[#166534] dark:text-[#4ADE80]">
            <ShieldCheck size={13} />
            <span>256-bit Encrypted</span>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#E8EAE6] dark:hover:bg-[#202723] text-[#58605C] dark:text-[#9BA6A0] cursor-pointer finn-focus transition-colors"
            aria-label="Toggle light or dark theme"
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            <span className="capitalize text-[10px]">{theme}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
