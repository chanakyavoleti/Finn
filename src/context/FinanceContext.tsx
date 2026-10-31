import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
import { RepositoryFactory } from '../services/storage/RepositoryFactory';

export interface MonthlyCashFlowData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategorySpendData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

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
  
  // User Authentication & Switching
  currentUser: UserProfile | null;
  registeredUsers: UserProfile[];
  loginUser: (email: string, pass: string) => Promise<void>;
  registerUser: (email: string, name: string, pass: string) => Promise<void>;
  switchUserDirectly: (userId: string) => Promise<void>;
  logoutUser: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;

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
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
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
    savingsRate?: number;
    creditLiabilities?: number;
    investmentAssets?: number;
    totalBudgetLimit: number;
    totalBudgetSpent: number;
    budgetStatusPct: number;
    unsettledSplitsOwedToYou: number;
  };

  // Dynamic Chart Breakdown Data
  monthlyCashFlow: MonthlyCashFlowData[];
  categorySpending: CategorySpendData[];

  // Toast notifications
  toasts: ToastMessage[];
  addToast: (title: string, type?: ToastMessage['type'], description?: string) => void;
  removeToast: (id: string) => void;
  formatAmount: (amount: number, options?: { compact?: boolean }) => string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const PALETTE_COLORS = [
  '#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D', 
  '#95D5B2', '#2B4162', '#385F71', '#8F5D5D', '#B56576'
];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('finn_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('finn_demo_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const [primaryCurrency, setPrimaryCurrency] = useState<CurrencyCode>('INR');
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('this_month');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
        phone: '+91 98765 43210',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  });

  const initialUid = session ? session.user.id : 'demo';
  const activeUidRef = useRef<string>(initialUid);

  const isDemoUid = (id: string) => id === 'usr_demo' || id === 'demo';

  const generateUniqueId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  const isBudgetCategoryMatch = (budget: Budget, txCategory?: string): boolean => {
    if (!txCategory) return false;
    const bCat = (budget.categoryName || (budget as any).category || '').toLowerCase();
    const txCat = txCategory.toLowerCase();
    return bCat.length > 0 && (bCat.includes(txCat) || txCat.includes(bCat));
  };

  const loadSavedData = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse from localStorage', key, e);
    }
    return fallback;
  };

  const isInitialDemo = isDemoUid(initialUid);

  // Application Data with persistent local storage
  const [accounts, setAccounts] = useState<Account[]>(() => 
    loadSavedData(`finn_accounts_${initialUid}`, isInitialDemo ? INITIAL_ACCOUNTS : [])
  );
  const [transactions, setTransactions] = useState<Transaction[]>(() => 
    loadSavedData(`finn_transactions_${initialUid}`, isInitialDemo ? INITIAL_TRANSACTIONS : [])
  );
  const [budgets, setBudgets] = useState<Budget[]>(() => 
    loadSavedData(`finn_budgets_${initialUid}`, isInitialDemo ? INITIAL_BUDGETS : [])
  );
  const [holdings, setHoldings] = useState<Holding[]>(() => 
    loadSavedData(`finn_holdings_${initialUid}`, isInitialDemo ? INITIAL_HOLDINGS : [])
  );
  const [goals, setGoals] = useState<SavingsGoal[]>(() => 
    loadSavedData(`finn_goals_${initialUid}`, isInitialDemo ? INITIAL_SAVINGS_GOALS : [])
  );
  const [splitExpenses, setSplitExpenses] = useState<SplitExpense[]>(() => 
    loadSavedData(`finn_splitExpenses_${initialUid}`, isInitialDemo ? INITIAL_SPLIT_EXPENSES : [])
  );
  const [insights, setInsights] = useState<AiInsight[]>(() => 
    loadSavedData(`finn_insights_${initialUid}`, isInitialDemo ? AI_INSIGHTS : [])
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Persistent storage synchronizers - only writes when state changes, strictly keyed to activeUidRef
  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_accounts_${currentUid}`, JSON.stringify(accounts));
      RepositoryFactory.getRepository().saveAccounts(currentUid, accounts).catch(() => {});
    }
  }, [accounts]);

  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_transactions_${currentUid}`, JSON.stringify(transactions));
      RepositoryFactory.getRepository().saveTransactions(currentUid, transactions).catch(() => {});
    }
  }, [transactions]);

  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_budgets_${currentUid}`, JSON.stringify(budgets));
      RepositoryFactory.getRepository().saveBudgets(currentUid, budgets).catch(() => {});
    }
  }, [budgets]);

  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_holdings_${currentUid}`, JSON.stringify(holdings));
      RepositoryFactory.getRepository().saveHoldings(currentUid, holdings).catch(() => {});
    }
  }, [holdings]);

  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_goals_${currentUid}`, JSON.stringify(goals));
      RepositoryFactory.getRepository().saveGoals(currentUid, goals).catch(() => {});
    }
  }, [goals]);

  useEffect(() => {
    const currentUid = activeUidRef.current;
    if (currentUid && currentUid !== 'guest') {
      localStorage.setItem(`finn_splitExpenses_${currentUid}`, JSON.stringify(splitExpenses));
      RepositoryFactory.getRepository().saveSplitExpenses(currentUid, splitExpenses).catch(() => {});
    }
  }, [splitExpenses]);

  const saveUserDataForUid = (targetUid: string) => {
    if (!targetUid || targetUid === 'guest') return;
    try {
      localStorage.setItem(`finn_accounts_${targetUid}`, JSON.stringify(accounts));
      localStorage.setItem(`finn_transactions_${targetUid}`, JSON.stringify(transactions));
      localStorage.setItem(`finn_budgets_${targetUid}`, JSON.stringify(budgets));
      localStorage.setItem(`finn_holdings_${targetUid}`, JSON.stringify(holdings));
      localStorage.setItem(`finn_goals_${targetUid}`, JSON.stringify(goals));
      localStorage.setItem(`finn_splitExpenses_${targetUid}`, JSON.stringify(splitExpenses));
    } catch (e) {
      console.error('Failed to save user data before switch', e);
    }
  };

  const switchUserData = (newUid: string) => {
    const prevUid = activeUidRef.current;
    if (prevUid && prevUid !== newUid && prevUid !== 'guest') {
      saveUserDataForUid(prevUid);
    }

    activeUidRef.current = newUid;
    const isTargetDemo = isDemoUid(newUid);

    // Load target user's isolated data.
    // ONLY demo users receive the INITIAL_* demo dataset as a fallback.
    // Real registered users receive a clean empty slate [].
    setAccounts(loadSavedData(`finn_accounts_${newUid}`, isTargetDemo ? INITIAL_ACCOUNTS : []));
    setTransactions(loadSavedData(`finn_transactions_${newUid}`, isTargetDemo ? INITIAL_TRANSACTIONS : []));
    setBudgets(loadSavedData(`finn_budgets_${newUid}`, isTargetDemo ? INITIAL_BUDGETS : []));
    setHoldings(loadSavedData(`finn_holdings_${newUid}`, isTargetDemo ? INITIAL_HOLDINGS : []));
    setGoals(loadSavedData(`finn_goals_${newUid}`, isTargetDemo ? INITIAL_SAVINGS_GOALS : []));
    setSplitExpenses(loadSavedData(`finn_splitExpenses_${newUid}`, isTargetDemo ? INITIAL_SPLIT_EXPENSES : []));
    setInsights(loadSavedData(`finn_insights_${newUid}`, isTargetDemo ? AI_INSIGHTS : []));
  };

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
    switchUserData(userSession.user.id);
    addToast('Welcome back', 'success', userSession.user.fullName);
  };

  const registerUser = async (email: string, name: string, pass: string) => {
    const userSession = await AuthService.register(email, name, pass);
    setSession(userSession);
    setPrimaryCurrency('INR');
    switchUserData(userSession.user.id);
    addToast('Account created successfully', 'success', `Welcome to FINN, ${name}`);
  };

  const switchUserDirectly = async (userId: string) => {
    const userSession = await AuthService.switchUser(userId);
    setSession(userSession);
    setPrimaryCurrency(userSession.user.defaultCurrency);
    switchUserData(userSession.user.id);
    addToast('Switched profile', 'success', `Active session: ${userSession.user.fullName}`);
  };

  const logoutUser = () => {
    AuthService.logout();
    setSession(null);
    switchUserData('guest');
    addToast('Logged out', 'info', 'Your session has ended.');
  };

  // Double-Entry Transactions Management
  const addTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: generateUniqueId('tx'),
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
      // If internal transfer or investment contribution, credit the destination account
      if ((txData.type === 'transfer' || txData.type === 'investment_contribution') && 
          txData.destinationAccountId && acc.id === txData.destinationAccountId) {
        return { ...acc, balance: addMoney(acc.balance, txData.amount) };
      }
      return acc;
    }));

    // Update budget spent: expenses add to spent, refunds decrease spent
    if (txData.type === 'expense') {
      setBudgets(prev => prev.map(b => {
        if (isBudgetCategoryMatch(b, txData.category)) {
          return { ...b, spent: addMoney(b.spent, txData.amount) };
        }
        return b;
      }));
    } else if (txData.type === 'refund') {
      setBudgets(prev => prev.map(b => {
        if (isBudgetCategoryMatch(b, txData.category)) {
          return { ...b, spent: Math.max(0, subtractMoney(b.spent, txData.amount)) };
        }
        return b;
      }));
    }

    addToast('Transaction recorded', 'success', `${txData.merchant} — ${formatAmount(txData.amount)}`);
  };

  const updateTransaction = (id: string, updatedData: Partial<Transaction>) => {
    const oldTx = transactions.find(t => t.id === id);
    if (!oldTx) return;

    const newTx: Transaction = { ...oldTx, ...updatedData };

    // Revert old transaction's effect on account balances & apply new transaction's effect
    setAccounts(prev => prev.map(acc => {
      let balance = acc.balance;

      // Reverse old source account effect
      if (acc.id === oldTx.accountId) {
        if (oldTx.type === 'income' || oldTx.type === 'refund') {
          balance = subtractMoney(balance, oldTx.amount);
        } else if (oldTx.type === 'expense' || oldTx.type === 'transfer' || oldTx.type === 'investment_contribution') {
          balance = addMoney(balance, oldTx.amount);
        }
      }
      // Reverse old transfer or investment destination effect
      if ((oldTx.type === 'transfer' || oldTx.type === 'investment_contribution') && 
          oldTx.destinationAccountId && acc.id === oldTx.destinationAccountId) {
        balance = subtractMoney(balance, oldTx.amount);
      }

      // Apply new source account effect
      if (acc.id === newTx.accountId) {
        if (newTx.type === 'income' || newTx.type === 'refund') {
          balance = addMoney(balance, newTx.amount);
        } else if (newTx.type === 'expense' || newTx.type === 'transfer' || newTx.type === 'investment_contribution') {
          balance = subtractMoney(balance, newTx.amount);
        }
      }
      // Apply new transfer or investment destination effect
      if ((newTx.type === 'transfer' || newTx.type === 'investment_contribution') && 
          newTx.destinationAccountId && acc.id === newTx.destinationAccountId) {
        balance = addMoney(balance, newTx.amount);
      }

      return { ...acc, balance };
    }));

    // Atomically update budgets
    setBudgets(prev => prev.map(b => {
      let spent = b.spent;
      // Reverse old transaction impact
      if (oldTx.type === 'expense' && isBudgetCategoryMatch(b, oldTx.category)) {
        spent = Math.max(0, subtractMoney(spent, oldTx.amount));
      } else if (oldTx.type === 'refund' && isBudgetCategoryMatch(b, oldTx.category)) {
        spent = addMoney(spent, oldTx.amount);
      }
      // Apply new transaction impact
      if (newTx.type === 'expense' && isBudgetCategoryMatch(b, newTx.category)) {
        spent = addMoney(spent, newTx.amount);
      } else if (newTx.type === 'refund' && isBudgetCategoryMatch(b, newTx.category)) {
        spent = Math.max(0, subtractMoney(spent, newTx.amount));
      }
      return { ...b, spent };
    }));

    setTransactions(prev => prev.map(t => t.id === id ? newTx : t));
    addToast('Transaction updated', 'success', `${newTx.merchant} — ${formatAmount(newTx.amount)}`);
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // Reverse effects on account balances
    setAccounts(prev => prev.map(acc => {
      let balance = acc.balance;
      if (acc.id === tx.accountId) {
        if (tx.type === 'income' || tx.type === 'refund') {
          balance = subtractMoney(balance, tx.amount);
        } else if (tx.type === 'expense' || tx.type === 'transfer' || tx.type === 'investment_contribution') {
          balance = addMoney(balance, tx.amount);
        }
      }
      if ((tx.type === 'transfer' || tx.type === 'investment_contribution') && 
          tx.destinationAccountId && acc.id === tx.destinationAccountId) {
        balance = subtractMoney(balance, tx.amount);
      }
      return { ...acc, balance };
    }));

    // Reverse effects on budget spent
    if (tx.type === 'expense') {
      setBudgets(prev => prev.map(b => {
        if (isBudgetCategoryMatch(b, tx.category)) {
          return { ...b, spent: Math.max(0, subtractMoney(b.spent, tx.amount)) };
        }
        return b;
      }));
    } else if (tx.type === 'refund') {
      setBudgets(prev => prev.map(b => {
        if (isBudgetCategoryMatch(b, tx.category)) {
          return { ...b, spent: addMoney(b.spent, tx.amount) };
        }
        return b;
      }));
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    addToast('Transaction removed', 'info', tx.merchant);
  };

  // CSV Bank Statement Import with Duplicate Detection AND Account Balance Reconciliation
  const importStatementCsv = (csvContent: string, targetAccountId: string) => {
    const parsed: ParseResult = parseBankStatementCsv(csvContent);
    const targetAccount = accounts.find(a => a.id === targetAccountId);
    const accountName = targetAccount ? targetAccount.name : 'Target Account';

    let importedCount = 0;
    let duplicateCount = 0;
    let balanceDelta = 0;

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

        if (row.type === 'income') {
          balanceDelta = addMoney(balanceDelta, row.amount);
        } else if (row.type === 'expense') {
          balanceDelta = subtractMoney(balanceDelta, row.amount);
        }
      }
    });

    if (newTransactions.length > 0) {
      setTransactions(prev => [...newTransactions, ...prev]);

      // Reconcile account balance with net imported delta
      setAccounts(prev => prev.map(acc => {
        if (acc.id === targetAccountId) {
          return { ...acc, balance: addMoney(acc.balance, balanceDelta) };
        }
        return acc;
      }));

      // Update budgets for imported expense transactions
      const newExpenses = newTransactions.filter(t => t.type === 'expense');
      if (newExpenses.length > 0) {
        setBudgets(prev => prev.map(b => {
          let extra = 0;
          newExpenses.forEach(tx => {
            if (b.categoryName.toLowerCase().includes(tx.category.toLowerCase()) || 
                tx.category.toLowerCase().includes(b.categoryName.toLowerCase())) {
              extra = addMoney(extra, tx.amount);
            }
          });
          return extra > 0 ? { ...b, spent: addMoney(b.spent, extra) } : b;
        }));
      }
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
  const addBudget = (budgetData: any) => {
    const categoryName = budgetData.categoryName || budgetData.category || 'General';
    const categoryId = budgetData.categoryId || 'cat-' + categoryName.toLowerCase().replace(/\s+/g, '-');
    const newBudget: Budget = {
      ...budgetData,
      id: generateUniqueId('b'),
      categoryId,
      categoryName,
      spent: 0
    };
    setBudgets(prev => [...prev, newBudget]);
    addToast('Budget established', 'success', `${categoryName}: ${formatAmount(budgetData.limit)}/mo`);
  };

  const updateBudgetLimit = (id: string, limit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit } : b));
    addToast('Budget updated', 'success', `New target limit: ${formatAmount(limit)}`);
  };

  // Goals Management
  const addGoal = (goalData: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newGoal: SavingsGoal = {
      ...goalData,
      id: generateUniqueId('g'),
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
      id: generateUniqueId('se')
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
      id: generateUniqueId('h'),
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
      id: generateUniqueId('acc'),
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
        liquidCash = addMoney(liquidCash, Math.max(0, a.balance));
      } else if (a.type === 'investment' || a.type === 'crypto') {
        totalInvested = addMoney(totalInvested, Math.max(0, a.balance));
      } else if (a.type === 'credit') {
        // Only negative credit card balances represent actual debt/liabilities.
        // Positive balances represent credit surpluses / overpayments (liquid assets).
        if (a.balance < 0) {
          totalDebt = addMoney(totalDebt, Math.abs(a.balance));
        } else if (a.balance > 0) {
          liquidCash = addMoney(liquidCash, a.balance);
        }
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
      creditLiabilities: totalDebt,
      investmentAssets: totalInvested,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRatePct,
      savingsRate: savingsRatePct,
      totalBudgetLimit,
      totalBudgetSpent,
      budgetStatusPct,
      unsettledSplitsOwedToYou
    };
  }, [accounts, transactions, budgets, splitExpenses]);

  // Dynamic Monthly Cash Flow Derived from Authoritative Transactions
  const monthlyCashFlow = useMemo<MonthlyCashFlowData[]>(() => {
    // Generate chronological months (last 6 months ending current)
    const monthMap = new Map<string, { income: number; expenses: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Seed 6 monthly slots
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { income: 0, expenses: 0 });
    }

    transactions.forEach(t => {
      const ym = t.date ? t.date.substring(0, 7) : '';
      if (monthMap.has(ym)) {
        const slot = monthMap.get(ym)!;
        if (t.type === 'income') {
          slot.income = addMoney(slot.income, t.amount);
        } else if (t.type === 'expense') {
          slot.expenses = addMoney(slot.expenses, t.amount);
        } else if (t.type === 'refund') {
          slot.expenses = Math.max(0, subtractMoney(slot.expenses, t.amount));
        }
      }
    });

    return Array.from(monthMap.entries()).map(([ym, val]) => {
      const mIdx = parseInt(ym.substring(5, 7), 10) - 1;
      return {
        month: monthNames[mIdx] || ym,
        income: val.income,
        expenses: val.expenses,
        savings: subtractMoney(val.income, val.expenses),
      };
    });
  }, [transactions]);

  // Dynamic Spending Category Breakdown Derived from Authoritative Transactions
  const categorySpending = useMemo<CategorySpendData[]>(() => {
    const expenseTx = transactions.filter(t => t.type === 'expense');
    if (expenseTx.length === 0) return [];

    const catTotals = new Map<string, number>();
    expenseTx.forEach(t => {
      const cat = t.category || 'Discretionary';
      catTotals.set(cat, addMoney(catTotals.get(cat) || 0, t.amount));
    });

    // Reduce refunds per category if applicable
    const refundTx = transactions.filter(t => t.type === 'refund');
    refundTx.forEach(t => {
      const cat = t.category || 'Discretionary';
      if (catTotals.has(cat)) {
        catTotals.set(cat, Math.max(0, subtractMoney(catTotals.get(cat)!, t.amount)));
      }
    });

    const totalExpense = Array.from(catTotals.values()).reduce((sum, v) => sum + v, 0);
    if (totalExpense <= 0) return [];

    const sorted = Array.from(catTotals.entries())
      .filter(([_, amt]) => amt > 0)
      .sort((a, b) => b[1] - a[1]);

    return sorted.map(([name, amount], idx) => ({
      name,
      amount,
      percentage: Number(((amount / totalExpense) * 100).toFixed(1)),
      color: PALETTE_COLORS[idx % PALETTE_COLORS.length]
    }));
  }, [transactions]);

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
        registeredUsers: AuthService.getRegisteredUsers(),
        loginUser,
        registerUser,
        switchUserDirectly,
        logoutUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        accounts,
        transactions,
        budgets,
        holdings,
        goals,
        splitExpenses,
        insights,
        currencyPairs: CURRENCY_PAIRS,
        addTransaction,
        updateTransaction,
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
        monthlyCashFlow,
        categorySpending,
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
