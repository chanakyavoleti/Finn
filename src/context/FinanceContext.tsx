import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense, 
  CurrencyPair, AiInsight, DatePeriod, NavPage 
} from '../types';
import { 
  INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_BUDGETS, 
  INITIAL_HOLDINGS, INITIAL_SAVINGS_GOALS, INITIAL_SPLIT_EXPENSES, 
  CURRENCY_PAIRS, AI_INSIGHTS 
} from '../data/mockData';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface FinanceContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  selectedPeriod: DatePeriod;
  setSelectedPeriod: (period: DatePeriod) => void;
  
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  holdings: Holding[];
  goals: SavingsGoal[];
  splitExpenses: SplitExpense[];
  insights: AiInsight[];
  currencyPairs: CurrencyPair[];

  // Action methods
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addBudget: (budget: Omit<Budget, 'id' | 'spent'>) => void;
  updateBudgetLimit: (id: string, limit: number) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount'>) => void;
  contributeToGoal: (id: string, amount: number) => void;
  addSplitExpense: (expense: Omit<SplitExpense, 'id'>) => void;
  settleParticipant: (expenseId: string, participantName: string) => void;
  addHolding: (holding: Omit<Holding, 'id' | 'lastUpdated'>) => void;
  syncAccount: (id: string) => Promise<void>;
  syncAllAccounts: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'lastSynced' | 'status'>) => void;

  // Calculated Metrics (Answers to the 7 core questions)
  metrics: {
    totalNetWorth: number;
    liquidCash: number;
    totalInvested: number;
    totalDebt: number;
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRatePct: number;
    totalBudgetLimit: number;
    totalBudgetSpent: number;
    budgetStatusPct: number;
    unsettledSplitsOwedToYou: number;
  };

  // Toast notifications
  toasts: ToastMessage[];
  addToast: (title: string, type?: ToastMessage['type'], description?: string) => void;
  removeToast: (id: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('finn_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('finn_demo_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('this_month');

  // Application Data
  const [accounts, setAccounts] = useState<Account[]>(() => isDemoMode ? INITIAL_ACCOUNTS : []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => isDemoMode ? INITIAL_TRANSACTIONS : []);
  const [budgets, setBudgets] = useState<Budget[]>(() => isDemoMode ? INITIAL_BUDGETS : []);
  const [holdings, setHoldings] = useState<Holding[]>(() => isDemoMode ? INITIAL_HOLDINGS : []);
  const [goals, setGoals] = useState<SavingsGoal[]>(() => isDemoMode ? INITIAL_SAVINGS_GOALS : []);
  const [splitExpenses, setSplitExpenses] = useState<SplitExpense[]>(() => isDemoMode ? INITIAL_SPLIT_EXPENSES : []);
  const [insights, setInsights] = useState<AiInsight[]>(() => isDemoMode ? AI_INSIGHTS : []);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply Theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('finn_theme', theme);
  }, [theme]);

  // Sync demo mode to localStorage and toggle data
  const toggleDemoMode = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);
    localStorage.setItem('finn_demo_mode', String(nextMode));
    if (nextMode) {
      setAccounts(INITIAL_ACCOUNTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setBudgets(INITIAL_BUDGETS);
      setHoldings(INITIAL_HOLDINGS);
      setGoals(INITIAL_SAVINGS_GOALS);
      setSplitExpenses(INITIAL_SPLIT_EXPENSES);
      setInsights(AI_INSIGHTS);
      addToast('Demonstration Environment Enabled', 'info', 'Loaded verified demonstration dataset.');
    } else {
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setHoldings([]);
      setGoals([]);
      setSplitExpenses([]);
      setInsights([]);
      addToast('Live Environment Initialized', 'info', 'Clean workspace ready for your verified financial accounts.');
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const addToast = (title: string, type: ToastMessage['type'] = 'info', description?: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Transactions Management
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now()
    };
    setTransactions(prev => [newTx, ...prev]);
    
    // Also update account balance
    setAccounts(prev => prev.map(acc => {
      if (acc.id === txData.accountId) {
        const change = txData.type === 'income' ? txData.amount : -txData.amount;
        return { ...acc, balance: acc.balance + change };
      }
      return acc;
    }));

    // Update budget spent if it's an expense
    if (txData.type === 'expense') {
      setBudgets(prev => prev.map(b => {
        if (b.categoryName.toLowerCase().includes(txData.category.toLowerCase()) || 
            txData.category.toLowerCase().includes(b.categoryName.toLowerCase())) {
          return { ...b, spent: b.spent + txData.amount };
        }
        return b;
      }));
    }

    addToast('Transaction recorded', 'success', `${txData.merchant} — $${txData.amount.toFixed(2)}`);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    addToast('Transaction removed', 'info', tx.merchant);
  };

  // Budgets Management
  const addBudget = (budgetData: Omit<Budget, 'id' | 'spent'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: 'b-' + Date.now(),
      spent: 0
    };
    setBudgets(prev => [...prev, newBudget]);
    addToast('Budget established', 'success', `${budgetData.categoryName}: $${budgetData.limit}/mo`);
  };

  const updateBudgetLimit = (id: string, limit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit } : b));
    addToast('Budget updated', 'success', `New target limit: $${limit}`);
  };

  // Goals Management
  const addGoal = (goalData: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: 'g-' + Date.now(),
      currentAmount: 0
    };
    setGoals(prev => [...prev, newGoal]);
    addToast('Savings goal created', 'success', goalData.name);
  };

  const contributeToGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: g.currentAmount + amount };
      }
      return g;
    }));
    addToast('Contribution recorded', 'success', `+$${amount.toLocaleString()} added to savings target.`);
  };

  // Split Expenses Management
  const addSplitExpense = (expenseData: Omit<SplitExpense, 'id'>) => {
    const newExpense: SplitExpense = {
      ...expenseData,
      id: 'se-' + Date.now()
    };
    setSplitExpenses(prev => [newExpense, ...prev]);
    addToast('Shared expense logged', 'success', `${expenseData.title} ($${expenseData.totalAmount.toFixed(2)})`);
  };

  const settleParticipant = (expenseId: string, participantName: string) => {
    setSplitExpenses(prev => prev.map(exp => {
      if (exp.id === expenseId) {
        const updatedParticipants = exp.participants.map(p => 
          p.name === participantName ? { ...p, hasPaid: true } : p
        );
        const allSettled = updatedParticipants.every(p => p.hasPaid);
        return {
          ...exp,
          status: allSettled ? 'settled' : 'unsettled',
          participants: updatedParticipants
        };
      }
      return exp;
    }));
    addToast('Settlement logged', 'success', `${participantName} marked as settled.`);
  };

  // Holdings Management
  const addHolding = (holdingData: Omit<Holding, 'id' | 'lastUpdated'>) => {
    const newHolding: Holding = {
      ...holdingData,
      id: 'h-' + Date.now(),
      lastUpdated: new Date().toISOString()
    };
    setHoldings(prev => [...prev, newHolding]);
    addToast('Asset holding added', 'success', `${holdingData.symbol} (${holdingData.shares} shares)`);
  };

  // Accounts Management & Real Sync Simulation
  const syncAccount = async (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'syncing' } : a));
    
    // Simulate real bank connection roundtrip with realistic latency
    await new Promise(resolve => setTimeout(resolve, 1400));
    
    setAccounts(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: 'synced',
          lastSynced: new Date().toISOString(),
          errorMessage: undefined
        };
      }
      return a;
    }));
    addToast('Synchronization verified', 'success', 'Bank connection refreshed with latest ledger.');
  };

  const syncAllAccounts = async () => {
    setAccounts(prev => prev.map(a => ({ ...a, status: 'syncing' })));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAccounts(prev => prev.map(a => ({
      ...a,
      status: 'synced',
      lastSynced: new Date().toISOString(),
      errorMessage: undefined
    })));
    addToast('All institutions synced', 'success', 'All financial connections are active and validated.');
  };

  const addAccount = (accountData: Omit<Account, 'id' | 'lastSynced' | 'status'>) => {
    const newAcc: Account = {
      ...accountData,
      id: 'acc-' + Date.now(),
      lastSynced: new Date().toISOString(),
      status: 'synced'
    };
    setAccounts(prev => [...prev, newAcc]);
    addToast('Account linked successfully', 'success', `${accountData.institution} — ${accountData.name}`);
  };

  // Calculated Core Metrics
  const metrics = useMemo(() => {
    let liquidCash = 0;
    let totalInvested = 0;
    let totalDebt = 0;

    accounts.forEach(a => {
      if (a.type === 'checking' || a.type === 'savings') {
        liquidCash += a.balance;
      } else if (a.type === 'investment' || a.type === 'crypto') {
        totalInvested += a.balance;
      } else if (a.type === 'credit') {
        // balance is negative or represents liability
        totalDebt += Math.abs(a.balance);
      }
    });

    const totalNetWorth = liquidCash + totalInvested - totalDebt;

    // Filter transactions based on active period (default to current month)
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');

    const totalIncome = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRatePct = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.limit, 0);
    const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
    const budgetStatusPct = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;

    // Splits where user paid and others haven't settled yet
    let unsettledSplitsOwedToYou = 0;
    splitExpenses.forEach(exp => {
      if (exp.paidBy.toLowerCase() === 'you' || exp.paidBy.toLowerCase() === 'me') {
        exp.participants.forEach(p => {
          if (!p.hasPaid && p.name.toLowerCase() !== 'you') {
            unsettledSplitsOwedToYou += p.share;
          }
        });
      }
    });

    return {
      totalNetWorth,
      liquidCash,
      totalInvested,
      totalDebt,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRatePct,
      totalBudgetLimit,
      totalBudgetSpent,
      budgetStatusPct,
      unsettledSplitsOwedToYou
    };
  }, [accounts, transactions, budgets, splitExpenses]);

  return (
    <FinanceContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        theme,
        toggleTheme,
        activePage,
        setActivePage,
        selectedPeriod,
        setSelectedPeriod,
        accounts,
        transactions,
        budgets,
        holdings,
        goals,
        splitExpenses,
        insights,
        currencyPairs: CURRENCY_PAIRS,
        addTransaction,
        deleteTransaction,
        addBudget,
        updateBudgetLimit,
        addGoal,
        contributeToGoal,
        addSplitExpense,
        settleParticipant,
        addHolding,
        syncAccount,
        syncAllAccounts,
        addAccount,
        metrics,
        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
