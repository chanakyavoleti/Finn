import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense, CurrencyPair, AiInsight } from '../types';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Salary & Primary Operations',
    institution: 'HDFC Bank',
    type: 'checking',
    balance: 342800.50,
    currency: 'INR',
    lastSynced: '2026-10-29T10:30:00+05:30',
    accountNumberMask: '•••• 4091',
    status: 'synced',
    logoColor: '#004C8F',
  },
  {
    id: 'acc-2',
    name: 'Emergency Savings Reserve',
    institution: 'State Bank of India',
    type: 'savings',
    balance: 550000.00,
    currency: 'INR',
    lastSynced: '2026-10-29T08:15:00+05:30',
    accountNumberMask: '•••• 8832',
    status: 'synced',
    logoColor: '#280071',
  },
  {
    id: 'acc-3',
    name: 'Sapphiro Rewards Card',
    institution: 'ICICI Bank',
    type: 'credit',
    balance: -24150.00, // credit card liability
    currency: 'INR',
    lastSynced: '2026-10-28T19:30:00+05:30',
    accountNumberMask: '•••• 1004',
    status: 'synced',
    logoColor: '#B02A30',
  },
  {
    id: 'acc-4',
    name: 'Demat Equity & ETF Portfolio',
    institution: 'Zerodha Kite',
    type: 'investment',
    balance: 1450000.00,
    currency: 'INR',
    lastSynced: '2026-10-29T11:00:00+05:30',
    accountNumberMask: 'KITE-9182',
    status: 'synced',
    logoColor: '#387ED1',
  },
  {
    id: 'acc-5',
    name: 'Direct Mutual Funds Portfolio',
    institution: 'Groww / Coin',
    type: 'investment',
    balance: 820000.00,
    currency: 'INR',
    lastSynced: '2026-10-29T07:10:00+05:30',
    accountNumberMask: 'GROW-4412',
    status: 'synced',
    logoColor: '#00D09C',
  },
  {
    id: 'acc-6',
    name: 'Sovereign Gold Bonds & Digital Reserve',
    institution: 'RBI Retail Direct / Gold',
    type: 'investment',
    balance: 310000.00,
    currency: 'INR',
    lastSynced: '2026-10-27T14:20:00+05:30',
    accountNumberMask: 'SGB-2024-X',
    status: 'synced',
    logoColor: '#C49A45',
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-28',
    amount: 175000.00,
    type: 'income',
    category: 'Salary',
    merchant: 'Infosys Technologies Payroll',
    description: 'Monthly Direct Salary Credit (Oct 2026)',
    status: 'posted',
    paymentMethod: 'bank_transfer',
    tags: ['Income', 'Salary', 'HDFC']
  },
  {
    id: 'tx-102',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-28',
    amount: 1420.00,
    type: 'expense',
    category: 'Groceries',
    merchant: 'Blinkit Quick Delivery',
    description: 'Weekly staples, milk, fruits & organic vegetables',
    status: 'posted',
    paymentMethod: 'upi',
    upiId: 'blinkit@icici',
    tags: ['Groceries', 'QuickCommerce']
  },
  {
    id: 'tx-103',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-27',
    amount: 32000.00,
    type: 'expense',
    category: 'Housing',
    merchant: 'Prestige Lakeside Habitat Apt 402',
    description: 'Monthly Apartment Rent Transfer',
    status: 'posted',
    paymentMethod: 'net_banking',
    tags: ['Fixed', 'Rent']
  },
  {
    id: 'tx-104',
    accountId: 'acc-3',
    accountName: 'ICICI Bank',
    date: '2026-10-26',
    amount: 1850.00,
    type: 'expense',
    category: 'Dining',
    merchant: 'Toit Brewpub Indiranagar',
    description: 'Dinner with product engineering team',
    status: 'posted',
    paymentMethod: 'credit_card',
    tags: ['Dining', 'Social']
  },
  {
    id: 'tx-105',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-25',
    amount: 3100.00,
    type: 'expense',
    category: 'Utilities',
    merchant: 'BESCOM Bangalore Electric',
    description: 'Monthly Electricity Utility Bill',
    status: 'posted',
    paymentMethod: 'upi',
    upiId: 'bescom@sbi',
    tags: ['Utilities', 'Fixed']
  },
  {
    id: 'tx-106',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-24',
    amount: 25000.00,
    type: 'transfer',
    category: 'Savings',
    merchant: 'SBI Emergency Fund Transfer',
    description: 'Scheduled monthly high-interest savings allocation',
    status: 'posted',
    paymentMethod: 'net_banking',
    tags: ['Transfer', 'EmergencyFund']
  },
  {
    id: 'tx-107',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-23',
    amount: 450.00,
    type: 'expense',
    category: 'Transport',
    merchant: 'Namma Metro Card Recharge',
    description: 'Smart transit card automatic reload',
    status: 'posted',
    paymentMethod: 'upi',
    upiId: 'bmrc@axis',
    tags: ['Commute', 'Transit']
  },
  {
    id: 'tx-108',
    accountId: 'acc-3',
    accountName: 'ICICI Bank',
    date: '2026-10-22',
    amount: 699.00,
    type: 'expense',
    category: 'Subscriptions',
    merchant: 'Hotstar & Spotify Premium',
    description: 'Monthly digital streaming subscription bundle',
    status: 'posted',
    paymentMethod: 'credit_card',
    tags: ['Subscription']
  },
  {
    id: 'tx-109',
    accountId: 'acc-4',
    accountName: 'Zerodha Kite',
    date: '2026-10-20',
    amount: 6400.00,
    type: 'income',
    category: 'Dividends',
    merchant: 'TCS Interim Dividend',
    description: 'Q2 FY27 Dividend payout credit',
    status: 'posted',
    paymentMethod: 'bank_transfer',
    tags: ['Investments', 'Dividend']
  },
  {
    id: 'tx-110',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-18',
    amount: 1450.00,
    type: 'expense',
    category: 'Healthcare',
    merchant: 'Apollo Pharmacy Koramangala',
    description: 'Monthly health supplements & prescriptions',
    status: 'posted',
    paymentMethod: 'upi',
    tags: ['Healthcare']
  },
  {
    id: 'tx-111',
    accountId: 'acc-1',
    accountName: 'HDFC Bank',
    date: '2026-10-15',
    amount: 5400.00,
    type: 'expense',
    category: 'Groceries',
    merchant: 'D-Mart Supermarket Store',
    description: 'Bi-monthly pantry staples, spices, pulses & cleaning',
    status: 'posted',
    paymentMethod: 'debit_card',
    tags: ['Groceries', 'Household']
  },
  {
    id: 'tx-112',
    accountId: 'acc-3',
    accountName: 'ICICI Bank',
    date: '2026-10-12',
    amount: 4800.00,
    type: 'expense',
    category: 'Shopping',
    merchant: 'Fabindia Artisanal',
    description: 'Festival ethnic kurtas & linen wear',
    status: 'posted',
    paymentMethod: 'credit_card',
    tags: ['Apparel', 'Festival']
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  {
    id: 'b-1',
    categoryId: 'housing',
    categoryName: 'Housing & Rent',
    limit: 35000,
    spent: 32000,
    period: 'monthly'
  },
  {
    id: 'b-2',
    categoryId: 'groceries',
    categoryName: 'Groceries & Quick Commerce',
    limit: 12000,
    spent: 8640,
    period: 'monthly'
  },
  {
    id: 'b-3',
    categoryId: 'dining',
    categoryName: 'Dining & Cafes',
    limit: 8000,
    spent: 5920,
    period: 'monthly'
  },
  {
    id: 'b-4',
    categoryId: 'utilities',
    categoryName: 'Electricity, Water & WiFi',
    limit: 5000,
    spent: 4100,
    period: 'monthly'
  },
  {
    id: 'b-5',
    categoryId: 'transport',
    categoryName: 'Transport & Fuel',
    limit: 4000,
    spent: 2850,
    period: 'monthly'
  },
  {
    id: 'b-6',
    categoryId: 'shopping',
    categoryName: 'Shopping & Apparel',
    limit: 8000,
    spent: 8950, // Intentional over-budget item for alert verification
    period: 'monthly'
  },
  {
    id: 'b-7',
    categoryId: 'health',
    categoryName: 'Healthcare & Fitness',
    limit: 4000,
    spent: 2450,
    period: 'monthly'
  }
];

export const INITIAL_HOLDINGS: Holding[] = [
  {
    id: 'h-1',
    symbol: 'NIFTYBEES',
    name: 'Nippon India Nifty 50 ETF',
    assetClass: 'us_stocks', // equities
    shares: 820,
    avgCost: 245.50,
    currentPrice: 288.40,
    dayChangePct: 0.74,
    currency: 'INR',
    lastUpdated: '2026-10-29T11:00:00+05:30'
  },
  {
    id: 'h-2',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd.',
    assetClass: 'us_stocks',
    shares: 110,
    avgCost: 2680.00,
    currentPrice: 3045.50,
    dayChangePct: 1.12,
    currency: 'INR',
    lastUpdated: '2026-10-29T11:00:00+05:30'
  },
  {
    id: 'h-3',
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd.',
    assetClass: 'us_stocks',
    shares: 75,
    avgCost: 3820.00,
    currentPrice: 4210.00,
    dayChangePct: -0.32,
    currency: 'INR',
    lastUpdated: '2026-10-29T11:00:00+05:30'
  },
  {
    id: 'h-4',
    symbol: 'PPFAS_FLEXI',
    name: 'Parag Parikh Flexi Cap Fund (Direct Growth)',
    assetClass: 'intl_stocks',
    shares: 9400,
    avgCost: 62.40,
    currentPrice: 79.85,
    dayChangePct: 0.45,
    currency: 'INR',
    lastUpdated: '2026-10-29T09:00:00+05:30'
  },
  {
    id: 'h-5',
    symbol: 'GOLDBEES',
    name: 'Nippon India ETF Gold BeES',
    assetClass: 'fixed_income',
    shares: 4200,
    avgCost: 56.80,
    currentPrice: 72.10,
    dayChangePct: 0.18,
    currency: 'INR',
    lastUpdated: '2026-10-29T11:00:00+05:30'
  }
];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'g-1',
    name: 'Emergency Buffer (6 Months Living Expenses)',
    targetAmount: 600000,
    currentAmount: 550000,
    targetDate: '2026-12-31',
    monthlyContribution: 25000,
    category: 'Safety',
    notes: 'Parked in SBI High-Yield Fixed Deposit & Savings'
  },
  {
    id: 'g-2',
    name: 'Bangalore Apartment Down Payment (20%)',
    targetAmount: 2500000,
    currentAmount: 1450000,
    targetDate: '2028-06-30',
    monthlyContribution: 45000,
    category: 'Real Estate',
    notes: 'Invested in Parag Parikh Flexi Cap & Short-Term G-Secs'
  },
  {
    id: 'g-3',
    name: 'Goa Year-End Team Retreat',
    targetAmount: 120000,
    currentAmount: 95000,
    targetDate: '2026-12-20',
    monthlyContribution: 12500,
    category: 'Travel',
    notes: 'Flights and heritage villa booking'
  }
];

export const INITIAL_SPLIT_EXPENSES: SplitExpense[] = [
  {
    id: 'se-1',
    title: 'Coorg Coffee Plantation Stay',
    totalAmount: 36000.00,
    paidBy: 'You',
    date: '2026-10-20',
    category: 'Travel',
    status: 'unsettled',
    participants: [
      { name: 'You', share: 9000.00, hasPaid: true },
      { name: 'Aditya Sharma', share: 9000.00, hasPaid: true },
      { name: 'Priya Nair', share: 9000.00, hasPaid: false },
      { name: 'Rohan Gupta', share: 9000.00, hasPaid: false }
    ],
    notes: 'Homestay booking and bonfire supplies split equally 4 ways'
  },
  {
    id: 'se-2',
    title: 'ACT Fibernet Gigabit Internet',
    totalAmount: 3200.00,
    paidBy: 'Aditya Sharma',
    date: '2026-10-01',
    category: 'Utilities',
    status: 'settled',
    participants: [
      { name: 'Aditya Sharma', share: 1600.00, hasPaid: true },
      { name: 'You', share: 1600.00, hasPaid: true }
    ],
    notes: 'Settled via UPI transfer on Oct 3'
  },
  {
    id: 'se-3',
    title: 'Team Biryani & Starters Feast',
    totalAmount: 4800.00,
    paidBy: 'You',
    date: '2026-10-16',
    category: 'Dining',
    status: 'unsettled',
    participants: [
      { name: 'You', share: 1600.00, hasPaid: true },
      { name: 'Aditya Sharma', share: 1600.00, hasPaid: false },
      { name: 'Priya Nair', share: 1600.00, hasPaid: true }
    ],
    notes: 'Meghana Foods Indiranagar feast'
  }
];

export const CURRENCY_PAIRS: CurrencyPair[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUSD: 84.12, change24h: 0.0, flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToUSD: 1.0, change24h: -0.05, flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUSD: 0.921, change24h: 0.12, flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateToUSD: 0.773, change24h: 0.18, flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rateToUSD: 3.672, change24h: 0.01, flag: '🇦🇪' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToUSD: 1.318, change24h: -0.04, flag: '🇸🇬' }
];

export const AI_INSIGHTS: AiInsight[] = [
  {
    id: 'ins-1',
    category: 'budget',
    title: 'Shopping Budget Exceeded by ₹950.00',
    summary: 'Discretionary apparel spent ₹8,950 against the ₹8,000 monthly limit.',
    detailedExplanation: 'Festival wear purchase at Fabindia (₹4,800.00 on Oct 12) took shopping past your cap. However, groceries and dining had ₹5,440 of unused headroom, keeping overall cash flow net positive.',
    quantitativeMetric: {
      label: 'Variance',
      value: '+₹950.00 (11.8% over)',
      trend: 'negative'
    },
    actionableStep: 'Balance the remaining cycle by using surplus headroom from dining.',
    impactScore: 'medium',
    createdAt: '2026-10-28T12:00:00Z'
  },
  {
    id: 'ins-2',
    category: 'saving',
    title: 'Emergency Reserve on Track for Dec 31 Milestone',
    summary: 'At current deposit rate of ₹25,000/mo, 6-month buffer will reach 100% on schedule.',
    detailedExplanation: 'Your SBI Emergency Reserve holds ₹5,50,000 of your ₹6,00,000 target (91.6% completed). One final planned contribution of ₹25,000 in November and December will achieve complete milestone capitalization.',
    quantitativeMetric: {
      label: 'Completion',
      value: '91.6% Achieved',
      trend: 'positive'
    },
    actionableStep: 'Keep scheduled NEFT standing instruction active on Nov 5.',
    impactScore: 'high',
    createdAt: '2026-10-28T09:30:00Z'
  },
  {
    id: 'ins-3',
    category: 'investment',
    title: 'Effective Monthly Savings Rate at 62.8% for October',
    summary: 'Net surplus of ₹1,13,841 from ₹1,81,400 total earned salary and dividend income.',
    detailedExplanation: 'Fixed living obligations (rent + electricity) consumed only 19.3% of net monthly income, substantially better than the conservative 50/30/20 guideline. Surplus capital is routing directly into Zerodha SIP and Coin mutual funds.',
    quantitativeMetric: {
      label: 'Savings Rate',
      value: '62.8% (+4.2% vs Sep)',
      trend: 'positive'
    },
    actionableStep: 'Consider increasing monthly NIFTYBEES SIP allocation by ₹10,000.',
    impactScore: 'high',
    createdAt: '2026-10-27T17:15:00Z'
  }
];
