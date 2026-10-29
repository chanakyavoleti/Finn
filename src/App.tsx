import React, { useState } from 'react';
import { useFinance } from './context/FinanceContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { BudgetsView } from './views/BudgetsView';
import { AnalyticsView } from './views/AnalyticsView';
import { InvestmentsView } from './views/InvestmentsView';
import { GoalsView } from './views/GoalsView';
import { BillSplittingView } from './views/BillSplittingView';
import { CurrencyConverterView } from './views/CurrencyConverterView';
import { AiAdvisorView } from './views/AiAdvisorView';
import { AccountsSyncView } from './views/AccountsSyncView';
import { SettingsView } from './views/SettingsView';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { ToastContainer } from './components/common/ToastContainer';
import { X } from 'lucide-react';

export const App: React.FC = () => {
  const { activePage } = useFinance();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView onOpenAddTransaction={() => setIsAddTransactionOpen(true)} />;
      case 'transactions':
        return <TransactionsView onOpenAddTransaction={() => setIsAddTransactionOpen(true)} />;
      case 'budgets':
        return <BudgetsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'investments':
        return <InvestmentsView />;
      case 'goals':
        return <GoalsView />;
      case 'bills':
        return <BillSplittingView />;
      case 'currency':
        return <CurrencyConverterView />;
      case 'advisor':
        return <AiAdvisorView />;
      case 'accounts':
        return <AccountsSyncView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onOpenAddTransaction={() => setIsAddTransactionOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBFBF9] dark:bg-[#0F1210] text-[#141716] dark:text-[#F0F3F1]">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Slide-over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 h-full bg-white dark:bg-[#131614] shadow-2xl flex flex-col">
            <div className="absolute top-4 right-3">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded text-[#8A928E] hover:text-[#141716] dark:text-[#6B7771] dark:hover:text-[#F0F3F1] finn-focus"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Application Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Modal Dialogs */}
      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
      />

      {/* Feedback Toast Container */}
      <ToastContainer />
    </div>
  );
};
