-- ==============================================================================
-- PROJECT FINN: Production PostgreSQL / Supabase Migration
-- Schema Version: 00001_initial_schema.sql
-- Enforces: Row Level Security (RLS), ACID Constraints, Audit Trail, Numeric Precision
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles & User Preferences
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    default_currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    fiscal_year_type VARCHAR(10) DEFAULT 'indian' NOT NULL CHECK (fiscal_year_type IN ('indian', 'calendar')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can only update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    enable_budget_alerts BOOLEAN DEFAULT true NOT NULL,
    budget_alert_threshold NUMERIC(4, 2) DEFAULT 85.00 NOT NULL,
    enable_weekly_digest BOOLEAN DEFAULT true NOT NULL,
    upi_default_vpa TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. Accounts (Bank, Cash, Credit Card, Investment, Cold Wallet)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('savings', 'current', 'cash', 'credit_card', 'digital_wallet', 'investment', 'crypto')),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    opening_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    current_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    account_number_mask VARCHAR(10),
    is_active BOOLEAN DEFAULT true NOT NULL,
    connection_mode VARCHAR(20) DEFAULT 'manual' NOT NULL CHECK (connection_mode IN ('manual', 'imported_statement', 'account_aggregator')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. Categories & Subcategories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means system-wide category
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    category_group VARCHAR(20) NOT NULL CHECK (category_group IN ('needs', 'wants', 'savings_and_debt', 'income')),
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_categories_user_id ON public.categories(user_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read system or own categories" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "Users can manage own custom categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Transactions Ledger (Double-Entry, Refunds, UPI Details)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    destination_account_id UUID REFERENCES public.accounts(id), -- For internal transfers
    original_transaction_id UUID REFERENCES public.transactions(id), -- For refunds
    title TEXT NOT NULL,
    merchant TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    transaction_type VARCHAR(25) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer', 'refund', 'investment_contribution', 'investment_withdrawal')),
    category_id UUID REFERENCES public.categories(id),
    category_name TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('upi', 'cash', 'debit_card', 'credit_card', 'net_banking', 'bank_transfer', 'wallet', 'other')),
    upi_vpa TEXT,
    upi_utr_number VARCHAR(30),
    status VARCHAR(15) DEFAULT 'posted' NOT NULL CHECK (status IN ('posted', 'pending', 'reconciled')),
    notes TEXT,
    tags TEXT[],
    receipt_attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. Budgets & Spending Limits
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    monthly_limit NUMERIC(15, 2) NOT NULL CHECK (monthly_limit > 0),
    period VARCHAR(10) DEFAULT 'monthly' NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, category_id, start_date)
);

CREATE INDEX idx_budgets_user_period ON public.budgets(user_id, start_date, end_date);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 6. Investment Portfolio (Holdings & Transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investment_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('equity_in', 'mutual_fund', 'etf', 'gold', 'fixed_deposit', 'bonds', 'ppf_epf', 'crypto')),
    exchange VARCHAR(10) DEFAULT 'NSE' NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL CHECK (quantity >= 0),
    average_cost_basis NUMERIC(15, 4) NOT NULL CHECK (average_cost_basis >= 0),
    current_market_price NUMERIC(15, 4) NOT NULL CHECK (current_market_price >= 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    last_price_updated_at TIMESTAMPTZ,
    price_source VARCHAR(20) DEFAULT 'manual' CHECK (price_source IN ('manual', 'nse_bse_live', 'amfi_nav', 'rbi_gold')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_investments_user ON public.investment_holdings(user_id);
ALTER TABLE public.investment_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own holdings" ON public.investment_holdings FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    holding_id UUID NOT NULL REFERENCES public.investment_holdings(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT')),
    quantity NUMERIC(18, 4) NOT NULL,
    price_per_unit NUMERIC(15, 4) NOT NULL,
    fees NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax_stt NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    trade_date DATE NOT NULL,
    realized_gain_loss NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own investment transactions" ON public.investment_transactions FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. Savings Goals & Milestones
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (current_amount >= 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    target_date DATE,
    monthly_contribution NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    category VARCHAR(20) DEFAULT 'reserve' NOT NULL,
    status VARCHAR(15) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own goals" ON public.savings_goals FOR ALL USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 8. Bill Splitting & Group Ledgers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bill_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.bill_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can manage groups" ON public.bill_groups FOR ALL USING (auth.uid() = creator_id);

CREATE TABLE IF NOT EXISTS public.shared_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.bill_groups(id) ON DELETE CASCADE,
    paid_by_name TEXT NOT NULL,
    paid_by_user_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    category TEXT DEFAULT 'general' NOT NULL,
    expense_date DATE NOT NULL,
    split_method VARCHAR(15) DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage')),
    status VARCHAR(15) DEFAULT 'unsettled' CHECK (status IN ('unsettled', 'settled')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members can view shared expenses" ON public.shared_expenses FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = shared_expenses.group_id AND creator_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.shared_expenses(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    participant_user_id UUID REFERENCES public.profiles(id),
    allocated_amount NUMERIC(15, 2) NOT NULL,
    has_paid BOOLEAN DEFAULT false NOT NULL,
    settled_at TIMESTAMPTZ
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Splits viewable by group owner" ON public.expense_splits FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM public.shared_expenses e 
        JOIN public.bill_groups g ON g.id = e.group_id 
        WHERE e.id = expense_splits.expense_id AND g.creator_id = auth.uid()
    ));

-- ------------------------------------------------------------------------------
-- 9. Exchange Rates Cache (Legitimate Mid-Market Rates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 6) NOT NULL,
    rate_source TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (from_currency, to_currency)
);

-- Public read-only for authenticated users
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read exchange rates" ON public.exchange_rates FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 10. Notifications & Audit Events
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('budget_warning', 'recurring_bill', 'goal_milestone', 'system')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read own audit events" ON public.audit_events FOR SELECT USING (auth.uid() = user_id);
