import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense, CurrencyPair, AiInsight } from '../types';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Premier Checking',
    institution: 'Chase Bank',
    type: 'checking',
    balance: 8420.50,
    currency: 'USD',
    lastSynced: '2026-10-29T09:42:00Z',
    accountNumberMask: '•••• 4819',
    status: 'synced',
    logoColor: '#1170CF',
  },
  {
    id: 'acc-2',
    name: 'High-Yield Savings',
    institution: 'Marcus by Goldman Sachs',
    type: 'savings',
    balance: 34180.25,
    currency: 'USD',
    lastSynced: '2026-10-29T08:15:00Z',
    accountNumberMask: '•••• 9204',
    status: 'synced',
    logoColor: '#002B49',
  },
  {
    id: 'acc-3',
    name: 'Blue Cash Preferred',
    institution: 'American Express',
    type: 'credit',
    balance: -1642.80, // credit card liability
    currency: 'USD',
    lastSynced: '2026-10-28T19:30:00Z',
    accountNumberMask: '•••• 1007',
    status: 'synced',
    logoColor: '#006FCF',
  },
  {
    id: 'acc-4',
    name: 'Individual Taxable Brokerage',
    institution: 'Vanguard',
    type: 'investment',
    balance: 112450.00,
    currency: 'USD',
    lastSynced: '2026-10-29T10:00:00Z',
    accountNumberMask: '•••• 6331',
    status: 'synced',
    logoColor: '#96151D',
  },
  {
    id: 'acc-5',
    name: 'Roth IRA Retirement',
    institution: 'Fidelity Investments',
    type: 'investment',
    balance: 68900.10,
    currency: 'USD',
    lastSynced: '2026-10-29T07:10:00Z',
    accountNumberMask: '•••• 8821',
    status: 'synced',
    logoColor: '#437728',
  },
  {
    id: 'acc-6',
    name: 'Hardware Cold Storage',
    institution: 'Ledger (BTC/ETH)',
    type: 'crypto',
    balance: 18350.00,
    currency: 'USD',
    lastSynced: '2026-10-27T14:20:00Z',
    accountNumberMask: '0x3F...8a92',
    status: 'synced',
    logoColor: '#252627',
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-28',
    amount: 5200.00,
    type: 'income',
    category: 'Salary',
    merchant: 'Stripe Technologies Payroll',
    description: 'Bi-weekly Direct Deposit',
    status: 'posted',
    tags: ['Income', 'Payroll']
  },
  {
    id: 'tx-102',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-28',
    amount: 142.60,
    type: 'expense',
    category: 'Groceries',
    merchant: 'Whole Foods Market',
    description: 'Organic groceries & produce',
    status: 'posted',
    tags: ['Groceries', 'Household']
  },
  {
    id: 'tx-103',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-27',
    amount: 2150.00,
    type: 'expense',
    category: 'Housing',
    merchant: 'Avalon Bay Communities',
    description: 'Monthly Apartment Rent (Apt 4B)',
    status: 'posted',
    tags: ['Fixed', 'Rent']
  },
  {
    id: 'tx-104',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-26',
    amount: 68.40,
    type: 'expense',
    category: 'Dining',
    merchant: 'Tavola Italian Trattoria',
    description: 'Dinner with colleagues',
    status: 'posted',
    tags: ['Dining']
  },
  {
    id: 'tx-105',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-25',
    amount: 95.00,
    type: 'expense',
    category: 'Utilities',
    merchant: 'ConEdison Electric',
    description: 'Electric & Gas utility bill',
    status: 'posted',
    tags: ['Utilities']
  },
  {
    id: 'tx-106',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-24',
    amount: 750.00,
    type: 'transfer',
    category: 'Savings',
    merchant: 'Marcus High-Yield Transfer',
    description: 'Scheduled monthly emergency savings deposit',
    status: 'posted',
    tags: ['Transfer', 'Savings']
  },
  {
    id: 'tx-107',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-23',
    amount: 45.00,
    type: 'expense',
    category: 'Transport',
    merchant: 'MTA Commuter Rail',
    description: 'Monthly Transit Pass Reload',
    status: 'posted',
    tags: ['Commute']
  },
  {
    id: 'tx-108',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-22',
    amount: 19.99,
    type: 'expense',
    category: 'Subscriptions',
    merchant: 'Spotify & Apple One',
    description: 'Digital media streaming bundle',
    status: 'posted',
    tags: ['Subscription']
  },
  {
    id: 'tx-109',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-20',
    amount: 320.00,
    type: 'income',
    category: 'Dividends',
    merchant: 'Vanguard Index Div',
    description: 'Q3 Dividend payout VTI',
    status: 'posted',
    tags: ['Investments']
  },
  {
    id: 'tx-110',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-18',
    amount: 112.50,
    type: 'expense',
    category: 'Healthcare',
    merchant: 'CVS Pharmacy & Care',
    description: 'Prescription refills & vitamins',
    status: 'posted',
    tags: ['Health']
  },
  {
    id: 'tx-111',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-15',
    amount: 84.20,
    type: 'expense',
    category: 'Groceries',
    merchant: 'Trader Joe\'s',
    description: 'Weekly staples and pantry',
    status: 'posted',
    tags: ['Groceries']
  },
  {
    id: 'tx-112',
    accountId: 'acc-1',
    accountName: 'Premier Checking',
    date: '2026-10-14',
    amount: 5200.00,
    type: 'income',
    category: 'Salary',
    merchant: 'Stripe Technologies Payroll',
    description: 'Bi-weekly Direct Deposit',
    status: 'posted',
    tags: ['Income', 'Payroll']
  },
  {
    id: 'tx-113',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-12',
    amount: 210.00,
    type: 'expense',
    category: 'Shopping',
    merchant: 'Patagonia Outdoor',
    description: 'Fall insulated rain jacket',
    status: 'posted',
    tags: ['Apparel']
  },
  {
    id: 'tx-114',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-10',
    amount: 38.50,
    type: 'expense',
    category: 'Dining',
    merchant: 'Blue Bottle Coffee',
    description: 'Coffee meetings & roasted beans',
    status: 'posted',
    tags: ['Dining']
  },
  {
    id: 'tx-115',
    accountId: 'acc-3',
    accountName: 'Blue Cash Preferred',
    date: '2026-10-08',
    amount: 120.00,
    type: 'expense',
    category: 'Entertainment',
    merchant: 'BAM Cinema & Arts',
    description: 'Season ticket subscription',
    status: 'posted',
    tags: ['Leisure']
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'b-1',
    categoryId: 'housing',
    categoryName: 'Housing & Rent',
    limit: 2200,
    spent: 2150,
    period: 'monthly'
  },
  {
    id: 'b-2',
    categoryId: 'groceries',
    categoryName: 'Groceries & Household',
    limit: 650,
    spent: 468,
    period: 'monthly'
  },
  {
    id: 'b-3',
    categoryId: 'dining',
    categoryName: 'Dining & Cafes',
    limit: 400,
    spent: 312,
    period: 'monthly'
  },
  {
    id: 'b-4',
    categoryId: 'utilities',
    categoryName: 'Utilities & Internet',
    limit: 220,
    spent: 195,
    period: 'monthly'
  },
  {
    id: 'b-5',
    categoryId: 'transport',
    categoryName: 'Transportation',
    limit: 180,
    spent: 135,
    period: 'monthly'
  },
  {
    id: 'b-6',
    categoryId: 'shopping',
    categoryName: 'Shopping & Discretionary',
    limit: 450,
    spent: 490, // over budget intentional example
    period: 'monthly'
  },
  {
    id: 'b-7',
    categoryId: 'health',
    categoryName: 'Healthcare & Fitness',
    limit: 200,
    spent: 112,
    period: 'monthly'
  }
];

export const INITIAL_HOLDINGS: Holding[] = [
  {
    id: 'h-1',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market Index ETF',
    assetClass: 'us_stocks',
    shares: 240,
    avgCost: 218.40,
    currentPrice: 284.15,
    dayChangePct: 0.62,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  },
  {
    id: 'h-2',
    symbol: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    assetClass: 'intl_stocks',
    shares: 410,
    avgCost: 54.10,
    currentPrice: 62.80,
    dayChangePct: -0.24,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  },
  {
    id: 'h-3',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetClass: 'fixed_income',
    shares: 280,
    avgCost: 74.50,
    currentPrice: 73.90,
    dayChangePct: 0.08,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  },
  {
    id: 'h-4',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'us_stocks',
    shares: 115,
    avgCost: 172.30,
    currentPrice: 232.40,
    dayChangePct: 1.15,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  },
  {
    id: 'h-5',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetClass: 'us_stocks',
    shares: 60,
    avgCost: 338.00,
    currentPrice: 428.50,
    dayChangePct: 0.88,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  },
  {
    id: 'h-6',
    symbol: 'BTC',
    name: 'Bitcoin Native Cold Reserve',
    assetClass: 'crypto',
    shares: 0.22,
    avgCost: 48200.00,
    currentPrice: 83400.00,
    dayChangePct: -1.42,
    currency: 'USD',
    lastUpdated: '2026-10-29T14:30:00Z'
  }
];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'g-1',
    name: 'Emergency Reserve (6 Months Living Expenses)',
    targetAmount: 30000,
    currentAmount: 26500,
    targetDate: '2026-12-31',
    monthlyContribution: 800,
    category: 'Safety',
    notes: 'Stored in Marcus HYSA earning 4.40% APY'
  },
  {
    id: 'g-2',
    name: 'Home Purchase Down Payment (20%)',
    targetAmount: 90000,
    currentAmount: 52000,
    targetDate: '2028-06-30',
    monthlyContribution: 1250,
    category: 'Real Estate',
    notes: 'Allocated in Vanguard Short-Term Treasuries & Brokerage'
  },
  {
    id: 'g-3',
    name: 'Japan Autumn Expedition',
    targetAmount: 6500,
    currentAmount: 5100,
    targetDate: '2027-10-15',
    monthlyContribution: 350,
    category: 'Travel',
    notes: 'Flights and Ryokan reservations budget'
  }
];

export const INITIAL_SPLIT_EXPENSES: SplitExpense[] = [
  {
    id: 'se-1',
    title: 'Hudson Valley Cabin Weekend',
    totalAmount: 960.00,
    paidBy: 'You',
    date: '2026-10-20',
    category: 'Travel',
    status: 'unsettled',
    participants: [
      { name: 'You', share: 240.00, hasPaid: true },
      { name: 'Marcus Chen', share: 240.00, hasPaid: true },
      { name: 'Sarah Jenkins', share: 240.00, hasPaid: false },
      { name: 'David Miller', share: 240.00, hasPaid: false }
    ],
    notes: 'Airbnb lodging and grocery supplies split 4 ways'
  },
  {
    id: 'se-2',
    title: 'Quarterly Gigabit Fiber Internet',
    totalAmount: 240.00,
    paidBy: 'Sarah Jenkins',
    date: '2026-10-01',
    category: 'Utilities',
    status: 'settled',
    participants: [
      { name: 'Sarah Jenkins', share: 120.00, hasPaid: true },
      { name: 'You', share: 120.00, hasPaid: true }
    ],
    notes: 'Settled via ACH bank transfer on Oct 3'
  },
  {
    id: 'se-3',
    title: 'Group Omakase Dinner',
    totalAmount: 480.00,
    paidBy: 'You',
    date: '2026-10-16',
    category: 'Dining',
    status: 'unsettled',
    participants: [
      { name: 'You', share: 160.00, hasPaid: true },
      { name: 'Marcus Chen', share: 160.00, hasPaid: false },
      { name: 'Elena Rostova', share: 160.00, hasPaid: true }
    ],
    notes: 'Tax & gratuity included equally'
  }
];

export const CURRENCY_PAIRS: CurrencyPair[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToUSD: 1.0, change24h: 0.0, flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUSD: 0.921, change24h: -0.15, flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateToUSD: 0.773, change24h: 0.22, flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUSD: 152.45, change24h: -0.48, flag: '🇯🇵' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rateToUSD: 0.865, change24h: 0.05, flag: '🇨🇭' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rateToUSD: 1.385, change24h: 0.12, flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rateToUSD: 1.512, change24h: -0.31, flag: '🇦🇺' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToUSD: 1.318, change24h: 0.04, flag: '🇸🇬' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUSD: 84.12, change24h: -0.08, flag: '🇮🇳' }
];

export const AI_INSIGHTS: AiInsight[] = [
  {
    id: 'ins-1',
    category: 'budget',
    title: 'Discretionary Shopping Exceeded by $40.00',
    summary: 'Shopping category spent $490.00 against the $450.00 monthly allocation.',
    detailedExplanation: 'A one-time apparel purchase at Patagonia ($210.00 on Oct 12) contributed 42.8% of your total shopping budget. However, groceries and dining remained $114.00 below their combined caps, offsetting the variance across your general cash flow.',
    quantitativeMetric: {
      label: 'Variance',
      value: '+$40.00 (8.9% over)',
      trend: 'negative'
    },
    actionableStep: 'Consider adjusting the remaining month discretionary spending or rolling the $40 surplus from dining.',
    impactScore: 'medium',
    createdAt: '2026-10-28T12:00:00Z'
  },
  {
    id: 'ins-2',
    category: 'saving',
    title: 'Emergency Fund Milestone Approaching in 62 Days',
    summary: 'At current deposit rate of $800/mo, 6-month buffer will reach 100% on Dec 31, 2026.',
    detailedExplanation: 'Your Marcus High-Yield account holds $26,500 of your $30,000 target. With $750 transferred on Oct 24 and $35.20 in accrued interest, your target is on schedule without requiring additional capital re-allocations.',
    quantitativeMetric: {
      label: 'Progress',
      value: '88.3% Completed',
      trend: 'positive'
    },
    actionableStep: 'Keep the automated recurring transfer active through Dec 15.',
    impactScore: 'high',
    createdAt: '2026-10-28T09:30:00Z'
  },
  {
    id: 'ins-3',
    category: 'investment',
    title: 'Effective Savings Rate at 38.2% for October',
    summary: 'Net savings of $4,077.51 from $10,720.00 total earned income and dividends.',
    detailedExplanation: 'Your baseline fixed expense ratio (rent + utilities) represents 21.0% of net income, which falls well within the conservative 50/30/20 guideline. Surplus liquidity is flowing efficiently toward tax-advantaged accounts.',
    quantitativeMetric: {
      label: 'Savings Rate',
      value: '38.2% (+3.1% vs Sep)',
      trend: 'positive'
    },
    actionableStep: 'Consider deploying the monthly surplus to Vanguard VTI before the November dividend ex-date.',
    impactScore: 'high',
    createdAt: '2026-10-27T17:15:00Z'
  }
];
