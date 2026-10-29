export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'crypto';
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'disconnected';

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balance: number;
  currency: string;
  lastSynced: string;
  accountNumberMask: string;
  status: SyncStatus;
  logoColor?: string;
  errorMessage?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'posted' | 'pending';

export interface Transaction {
  id: string;
  accountId: string;
  accountName?: string;
  date: string;
  amount: number; // positive for income, positive absolute for expenses with type='expense'
  type: TransactionType;
  category: string;
  merchant: string;
  description: string;
  status: TransactionStatus;
  tags?: string[];
}

export interface Budget {
  id: string;
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  period: 'monthly';
}

export type AssetClass = 'us_stocks' | 'intl_stocks' | 'fixed_income' | 'crypto' | 'real_estate' | 'cash';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  shares: number;
  avgCost: number;
  currentPrice: number;
  dayChangePct: number;
  currency: string;
  lastUpdated: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  category: string;
  notes?: string;
}

export interface ParticipantShare {
  name: string;
  share: number;
  hasPaid: boolean;
}

export interface SplitExpense {
  id: string;
  title: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  category: string;
  status: 'settled' | 'unsettled';
  participants: ParticipantShare[];
  notes?: string;
}

export interface CurrencyPair {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number;
  change24h: number;
  flag: string;
}

export interface AiInsight {
  id: string;
  category: 'saving' | 'budget' | 'anomaly' | 'investment' | 'tax';
  title: string;
  summary: string;
  detailedExplanation: string;
  quantitativeMetric: {
    label: string;
    value: string;
    trend?: 'positive' | 'negative' | 'neutral';
  };
  actionableStep?: string;
  impactScore: 'high' | 'medium' | 'low';
  createdAt: string;
}

export type DatePeriod = 'this_month' | 'last_month' | 'last_90_days' | 'year_to_date' | 'all';

export type NavPage = 
  | 'dashboard' 
  | 'transactions' 
  | 'budgets' 
  | 'analytics' 
  | 'investments' 
  | 'goals' 
  | 'bills' 
  | 'currency' 
  | 'advisor' 
  | 'accounts'
  | 'settings';
