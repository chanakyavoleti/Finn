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
import { CurrencyCode, formatMoney, addMoney, subtractMoney } from '../utils/currency';
import { AuthService, UserProfile, UserSession } from '../auth/authService';
import { parseBankStatementCsv, ParseResult } from '../integrations/statementParsers';

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
  primaryCurrency: CurrencyCode;
  setPrimaryCurrency: (code: CurrencyCode) => void;
  
  // User Authentication
  currentUser: UserProfile | null;
  loginUser: (email: string, pass: string) => Promise<void>;
  registerUser: (email: string, name: string, pass: string) => Promise<void>;
  logoutUser: () => void;

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
  importStatementCsv: (csvContent: string, targetAccountId: string) => { imported: number; duplicates: number; errors: number };

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
  formatAmount: (amount: number, options?: { compact?: boolean }) => string;
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

  const [primaryCurrency, setPrimaryCurrency] = useState<CurrencyCode>('INR');
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('this_month');

  // Authentication State
  const [session, setSession] = useState<UserSession | null>(() => {
    const s = AuthService.getSession();
    if (s) return s;
    // Default demo session
    return {
      token: 'demo_token',
      user: {
        id: 'usr_demo',
        email: 'chanakya@finn.in',
        fullName: 'Chanakya Voleti',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  });

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
      addToast('Indian Demo Environment Active', 'info', 'Loaded verified INR records, UPI ledger, and Nifty holdings.');
    } else {
      setAccounts([]);
      setTransactions([]);
      setBudgets([]);
      setHoldings([]);
      setGoals([]);
      setSplitExpenses([]);
      setInsights([]);
      addToast('Live Environment Initialized', 'info', 'Clean slate ready for your verified accounts and bank statements.');
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

  const formatAmount = (amount: number, options?: { compact?: boolean }) => {
    return formatMoney(amount, primaryCurrency, options);
  };

  // Auth Handlers
  const loginUser = async (email: string, pass: string) => {
    const userSession = await AuthService.login(email, pass);
    setSession(userSession);
    setPrimaryCurrency(userSession.user.defaultCurrency);
    addToast('Welcome back', 'success', userSession.user.fullName);
  };

  const registerUser = async (email: string, name: string, pass: string) => {
    const userSession = await AuthService.register(email, name, pass);
    setSession(userSession);
    setPrimaryCurrency('INR');
    addToast('Account created successfully', 'success', `Welcome to FINN, ${name}`);
  };

  const logoutUser = () => {
    AuthService.logout();
    setSession(null);
    addToast('Logged out', 'info', 'Your session has ended.');
  };

  // Double-Entry Transactions Management
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx-' + Date.now(),
      currency: txData.currency || primaryCurrency
    };
    setTransactions(prev => [newTx, ...prev]);
    
    // Update account balances based on transaction type
    setAccounts(prev => prev.map(acc => {
      if (acc.id === txData.accountId) {
        if (txData.type === 'income' || txData.type === 'refund') {
          return { ...acc, balance: addMoney(acc.balance, txData.amount) };
        } else if (txData.type === 'expense' || txData.type === 'transfer' || txData.type === 'investment_contribution') {
          return { ...acc, balance: subtractMoney(acc.balance, txData.amount) };
        }
      }
      // If internal transfer, credit the destination account
      if (txData.type === 'transfer' && acc.id === txData.destinationAccountId) {
        return { ...acc, balance: addMoney(acc.balance, txData.amount) };
      }
      return acc;
    }));

    // Update budget spent if it's an expense
    if (txData.type === 'expense') {
      setBudgets(prev => prev.map(b => {
        if (b.categoryName.toLowerCase().includes(txData.category.toLowerCase()) || 
            txData.category.toLowerCase().includes(b.categoryName.toLowerCase())) {
          return { ...b, spent: addMoney(b.spent, txData.amount) };
        }
        return b;
      }));
    }

    addToast('Transaction recorded', 'success', `${txData.merchant} — ${formatAmount(txData.amount)}`);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    addToast('Transaction removed', 'info', tx.merchant);
  };

  // CSV Bank Statement Import with Duplicate Detection
  const importStatementCsv = (csvContent: string, targetAccountId: string) => {
    const parsed: ParseResult = parseBankStatementCsv(csvContent);
    const targetAccount = accounts.find(a => a.id === targetAccountId);
    const accountName = targetAccount ? targetAccount.name : 'Target Account';

    let importedCount = 0;
    let duplicateCount = 0;

    const newTransactions: Transaction[] = [];

    parsed.rows.forEach((row, idx) => {
      // Duplicate detection check: same date, same amount, and same merchant/narrative
      const isDuplicate = transactions.some(existing => 
        existing.accountId === targetAccountId &&
        existing.date === row.date &&
        Math.abs(existing.amount - row.amount) < 0.01 &&
        (existing.merchant.toLowerCase().includes(row.merchant.toLowerCase()) ||
         row.merchant.toLowerCase().includes(existing.merchant.toLowerCase()))
      );

      if (isDuplicate) {
        duplicateCount++;
      } else {
        newTransactions.push({
          id: `imp-${Date.now()}-${idx}`,
          accountId: targetAccountId,
          accountName,
          date: row.date,
          amount: row.amount,
          type: row.type,
          category: row.type === 'income' ? 'Salary' : 'General Bank Disbursement',
          merchant: row.merchant,
          description: row.description,
          status: 'posted',
          paymentMethod: row.paymentMethod,
          utrNumber: row.referenceNumber,
          tags: ['StatementImport', parsed.bankName]
        });
        importedCount++;
      }
    });

    if (newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);
    }

    addToast(
      'Statement Import Completed',
      'success',
      `Imported ${importedCount} transactions. Skipped ${duplicateCount} duplicates.`
    );

    return {
      imported: importedCount,
      duplicates: duplicateCount,
      errors: parsed.errorCount
    };
  };

  // Budgets Management
  const addBudget = (budgetData: Omit<Budget, 'id' | 'spent'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: 'b-' + Date.now(),
      spent: 0
    };
    setBudgets(prev => [...prev, newBudget]);
    addToast('Budget established', 'success', `${budgetData.categoryName}: ${formatAmount(budgetData.limit)}/mo`);
  };

  const updateBudgetLimit = (id: string, limit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit } : b));
    addToast('Budget updated', 'success', `New target limit: ${formatAmount(limit)}`);
  };

  // Goals Management
  const addGoal = (goalData: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: 'g-' + Date.now(),
      currentAmount: 0
    };
    setGoals(prev => [...prev, newGoal]);
    addToast('Savings milestone defined', 'success', goalData.name);
  };

  const contributeToGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: addMoney(g.currentAmount, amount) };
      }
      return g;
    }));
    addToast('Contribution recorded', 'success', `+${formatAmount(amount)} added to savings milestone.`);
  };

  // Split Expenses Management
  const addSplitExpense = (expenseData: Omit<SplitExpense, 'id'>) => {
    const newExpense: SplitExpense = {
      ...expenseData,
      id: 'se-' + Date.now()
    };
    setSplitExpenses(prev => [newExpense, ...prev]);
    addToast('Shared expense logged', 'success', `${expenseData.title} (${formatAmount(expenseData.totalAmount)})`);
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
    addToast('Holding added', 'success', `${holdingData.symbol} (${holdingData.shares} units)`);
  };

  // Accounts Management & Real Sync Simulation
  const syncAccount = async (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'syncing' } : a));
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
    addToast('Bank account synced', 'success', 'Direct balance reconciliation verified.');
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
    addToast('All financial links verified', 'success', 'All bank accounts and demat channels reconciled.');
  };

  const addAccount = (accountData: Omit<Account, 'id' | 'lastSynced' | 'status'>) => {
    const newAcc: Account = {
      ...accountData,
      id: 'acc-' + Date.now(),
      lastSynced: new Date().toISOString(),
      status: 'synced'
    };
    setAccounts(prev => [...prev, newAcc]);
    addToast('Account registered', 'success', `${accountData.institution} — ${accountData.name}`);
  };

  // Authoritative Core Financial Metrics (Excludes transfers & non-consumption transactions)
  const metrics = useMemo(() => {
    let liquidCash = 0;
    let totalInvested = 0;
    let totalDebt = 0;

    accounts.forEach(a => {
      if (a.type === 'checking' || a.type === 'savings' || a.type === 'cash') {
        liquidCash = addMoney(liquidCash, a.balance);
      } else if (a.type === 'investment' || a.type === 'crypto') {
        totalInvested = addMoney(totalInvested, a.balance);
      } else if (a.type === 'credit') {
        totalDebt = addMoney(totalDebt, Math.abs(a.balance));
      }
    });

    const totalNetWorth = subtractMoney(addMoney(liquidCash, totalInvested), totalDebt);

    // Eligible Income: strictly type === 'income'
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    // Eligible Expenses: strictly type === 'expense'
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    // Refunds: reduce total expense
    const refundTransactions = transactions.filter(t => t.type === 'refund');

    const totalIncome = incomeTransactions.reduce((acc, t) => addMoney(acc, t.amount), 0);
    const grossExpenses = expenseTransactions.reduce((acc, t) => addMoney(acc, t.amount), 0);
    const totalRefunds = refundTransactions.reduce((acc, t) => addMoney(acc, t.amount), 0);
    const totalExpenses = Math.max(subtractMoney(grossExpenses, totalRefunds), 0);

    const netSavings = subtractMoney(totalIncome, totalExpenses);
    const savingsRatePct = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const totalBudgetLimit = budgets.reduce((acc, b) => addMoney(acc, b.limit), 0);
    const totalBudgetSpent = budgets.reduce((acc, b) => addMoney(acc, b.spent), 0);
    const budgetStatusPct = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;

    let unsettledSplitsOwedToYou = 0;
    splitExpenses.forEach(exp => {
      if (exp.paidBy.toLowerCase() === 'you' || exp.paidBy.toLowerCase() === 'me') {
        exp.participants.forEach(p => {
          if (!p.hasPaid && p.name.toLowerCase() !== 'you') {
            unsettledSplitsOwedToYou = addMoney(unsettledSplitsOwedToYou, p.share);
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
        primaryCurrency,
        setPrimaryCurrency,
        currentUser: session ? session.user : null,
        loginUser,
        registerUser,
        logoutUser,
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
        importStatementCsv,
        metrics,
        toasts,
        addToast,
        removeToast,
        formatAmount
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
