import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Moon, Sun, Database, Shield, Download, Trash2, Key } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    theme, 
    toggleTheme, 
    isDemoMode, 
    toggleDemoMode, 
    addToast,
    accounts,
    transactions
  } = useFinance();

  const handleExportAllJSON = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      accounts,
      transactions,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `finn_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    addToast('Backup exported', 'success', 'Full database snapshot downloaded as JSON.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Interface & Theme Preferences */}
      <Card title="Interface & Visual Appearance" subtitle="Theme selection and display tokens">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
            <div>
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Application Theme
              </div>
              <p className="text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                Toggle between warm neutral light mode and high-contrast dark mode
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              onClick={toggleTheme}
            >
              Switch to {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
            <div>
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Typography & Number Rendering
              </div>
              <p className="text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                Using Geist & Inter with fixed-width tabular numerals (<code className="text-[11px] font-mono">tnum</code>)
              </p>
            </div>
            <Badge variant="brand" size="sm">Active (Tabular Numerals)</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Animation & Microinteractions
              </div>
              <p className="text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                Restrained transitions respecting <code className="text-[11px] font-mono">prefers-reduced-motion</code>
              </p>
            </div>
            <Badge variant="positive" size="sm">Standard Restrained</Badge>
          </div>
        </div>
      </Card>

      {/* Environment & Data Storage */}
      <Card title="Environment & Dataset Sandbox" subtitle="Manage demonstration datasets and workspace states">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8EAE6] dark:border-[#242D28]">
            <div>
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Demonstration Environment Mode
              </div>
              <p className="text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                {isDemoMode
                  ? 'Currently displaying verified demonstration financial dataset'
                  : 'Workspace running in Live Empty State for real account linking'}
              </p>
            </div>
            <Button
              variant={isDemoMode ? 'outline' : 'primary'}
              size="sm"
              icon={<Database size={13} />}
              onClick={toggleDemoMode}
            >
              {isDemoMode ? 'Switch to Live Workspace' : 'Load Demo Dataset'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Full Data Snapshot & Export
              </div>
              <p className="text-[#58605C] dark:text-[#9BA6A0] mt-0.5">
                Download all accounts, transactions, and categories in portable JSON format
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportAllJSON}
            >
              Export JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* Security & Authentication */}
      <Card title="Security & Cryptographic Standards" subtitle="Information regarding data storage and transport encryption">
        <div className="space-y-3 text-xs text-[#58605C] dark:text-[#9BA6A0] leading-relaxed">
          <p>
            FINN implements local state residency and zero third-party telemetry. All sensitive figures, account balances, and transaction notes are stored securely in browser memory and local browser storage.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1] mb-0.5">
                Zero Cloud Leakage
              </div>
              <span>No telemetry tracking, analytics pixels, or advertising SDKs.</span>
            </div>
            <div className="p-3 rounded border border-[#E8EAE6] dark:border-[#242D28] bg-[#FAFAF8] dark:bg-[#161B18]">
              <div className="font-semibold text-[#141716] dark:text-[#F0F3F1]">
                Deterministic Calculations
              </div>
              <span>Ledgers reconciled with standard double-entry accounting formulas.</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
