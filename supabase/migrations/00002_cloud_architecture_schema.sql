-- ==============================================================================
-- PROJECT FINN: Comprehensive Cloud Architecture Migration
-- Schema Version: 00002_cloud_architecture_schema.sql
-- Enforces: 17 Core Entities, Exact Decimal Types (NUMERIC), Multi-Tenant RLS,
-- Foreign Key Cascade Integrity, Triggers, Indexes, and Audit Logging
-- ==============================================================================
-- Execution Structure:
--   STAGE 1: Extensions & Base Helper Functions
--   STAGE 2: All 17 Core DDL Tables (Strict Topological Dependency Order)
--   STAGE 3: Performance & Composite Indexes
--   STAGE 4: Update Timestamps Triggers
--   STAGE 5: Security Definer Helper Functions (RLS Recursion Breakers)
--   STAGE 6: Enable Row Level Security (RLS) on all 17 Tables
--   STAGE 7: Granular RLS Policies (SELECT, INSERT, UPDATE, DELETE)
-- ==============================================================================

-- ==============================================================================
-- STAGE 1: EXTENSIONS & BASE FUNCTIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- STAGE 2: ALL 17 CORE DDL TABLES (Topological Foreign-Key Order)
-- ==============================================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    default_currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(default_currency) = 3),
    fiscal_year_type VARCHAR(10) DEFAULT 'indian' NOT NULL CHECK (fiscal_year_type IN ('indian', 'calendar')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('savings', 'current', 'cash', 'credit_card', 'digital_wallet', 'investment', 'crypto')),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(currency) = 3),
    opening_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    current_balance NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    account_number_mask VARCHAR(10),
    is_active BOOLEAN DEFAULT true NOT NULL,
    connection_mode VARCHAR(20) DEFAULT 'manual' NOT NULL CHECK (connection_mode IN ('manual', 'imported_statement', 'account_aggregator')),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL indicates global/system category
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    category_group VARCHAR(25) NOT NULL CHECK (category_group IN ('needs', 'wants', 'savings_and_debt', 'income', 'transfers')),
    is_custom BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT, -- Preserves immutable financial ledger
    destination_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    original_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- For refunds
    title TEXT NOT NULL,
    merchant TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(currency) = 3),
    transaction_type VARCHAR(25) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer', 'refund', 'investment_contribution', 'investment_withdrawal')),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'other' NOT NULL CHECK (payment_method IN ('upi', 'cash', 'debit_card', 'credit_card', 'net_banking', 'bank_transfer', 'wallet', 'other')),
    upi_vpa TEXT,
    upi_utr_number VARCHAR(50),
    deduplication_hash VARCHAR(64),
    status VARCHAR(15) DEFAULT 'posted' NOT NULL CHECK (status IN ('posted', 'pending', 'reconciled', 'void')),
    notes TEXT,
    tags TEXT[],
    receipt_attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_diff_accounts CHECK (destination_account_id IS NULL OR destination_account_id != account_id),
    CONSTRAINT uq_account_tx_dedup UNIQUE (account_id, deduplication_hash)
);

-- 5. BUDGETS
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

-- 6. INVESTMENTS (Holdings)
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('equity_in', 'equity_us', 'mutual_fund', 'etf', 'gold', 'fixed_deposit', 'bonds', 'crypto', 'real_estate')),
    exchange VARCHAR(10) DEFAULT 'NSE' NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL CHECK (quantity >= 0),
    average_cost_basis NUMERIC(15, 4) NOT NULL CHECK (average_cost_basis >= 0),
    current_market_price NUMERIC(15, 4) NOT NULL CHECK (current_market_price >= 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(currency) = 3),
    last_price_updated_at TIMESTAMPTZ,
    price_source VARCHAR(20) DEFAULT 'manual' CHECK (price_source IN ('manual', 'nse_bse_live', 'amfi_nav', 'coingecko', 'rbi_gold')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. INVESTMENT_TRANSACTIONS (Ledger)
CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE RESTRICT, -- Preserves investment buy/sell history
    action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL', 'DIVIDEND', 'SPLIT')),
    quantity NUMERIC(18, 4) NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(15, 4) NOT NULL CHECK (price_per_unit >= 0),
    brokerage_fees NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    tax_stt NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    trade_date DATE NOT NULL,
    realized_gain_loss NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. SAVINGS_GOALS
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (current_amount >= 0),
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(currency) = 3),
    target_date DATE,
    monthly_contribution NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (monthly_contribution >= 0),
    category VARCHAR(25) DEFAULT 'emergency_fund' NOT NULL,
    status VARCHAR(15) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. GOAL_CONTRIBUTIONS
CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. BILL_GROUPS
CREATE TABLE IF NOT EXISTS public.bill_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'INR' NOT NULL CHECK (length(currency) = 3),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. BILL_PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.bill_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.bill_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- May be non-registered member
    display_name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (group_id, display_name)
);

-- 12. BILL_SPLITS
CREATE TABLE IF NOT EXISTS public.bill_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.bill_groups(id) ON DELETE CASCADE,
    payer_participant_id UUID NOT NULL REFERENCES public.bill_participants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    category TEXT DEFAULT 'general' NOT NULL,
    expense_date DATE NOT NULL,
    split_method VARCHAR(15) DEFAULT 'equal' NOT NULL CHECK (split_method IN ('equal', 'exact', 'percentage')),
    status VARCHAR(15) DEFAULT 'unsettled' NOT NULL CHECK (status IN ('unsettled', 'settled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. BILL_SETTLEMENTS
CREATE TABLE IF NOT EXISTS public.bill_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.bill_groups(id) ON DELETE CASCADE,
    split_id UUID REFERENCES public.bill_splits(id) ON DELETE SET NULL,
    debtor_participant_id UUID NOT NULL REFERENCES public.bill_participants(id) ON DELETE CASCADE,
    creditor_participant_id UUID NOT NULL REFERENCES public.bill_participants(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(20) DEFAULT 'upi' NOT NULL,
    transaction_reference TEXT,
    settlement_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. USER_PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    enable_budget_alerts BOOLEAN DEFAULT true NOT NULL,
    budget_alert_threshold NUMERIC(5, 2) DEFAULT 80.00 NOT NULL CHECK (budget_alert_threshold > 0 AND budget_alert_threshold <= 100),
    enable_weekly_digest BOOLEAN DEFAULT true NOT NULL,
    upi_default_vpa TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. EXCHANGE_RATES (Market Currency Pairs)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    from_currency VARCHAR(3) NOT NULL CHECK (length(from_currency) = 3),
    to_currency VARCHAR(3) NOT NULL CHECK (length(to_currency) = 3),
    rate NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
    rate_source TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (from_currency, to_currency)
);

-- 16. BANK_CONNECTIONS
CREATE TABLE IF NOT EXISTS public.bank_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fip_id VARCHAR(50) NOT NULL,
    fip_name TEXT NOT NULL,
    consent_handle TEXT NOT NULL,
    consent_id TEXT,
    consent_status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (consent_status IN ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED', 'FAILED')),
    consent_start_date TIMESTAMPTZ NOT NULL,
    consent_expiry_date TIMESTAMPTZ NOT NULL,
    last_sync_attempt TIMESTAMPTZ,
    last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('SUCCESS', 'PARTIAL', 'FAILED')),
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID,
    actor_ip INET,
    user_agent TEXT,
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- STAGE 3: INDEXES FOR PERFORMANCE & FAST LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON public.accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dest_account ON public.transactions(destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dedup ON public.transactions(account_id, deduplication_hash) WHERE deduplication_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON public.investments(symbol);
CREATE INDEX IF NOT EXISTS idx_inv_tx_user_date ON public.investment_transactions(user_id, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_investment ON public.investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_user ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_bill_groups_creator ON public.bill_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_bill_participants_group ON public.bill_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_bill_participants_user ON public.bill_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_splits_group ON public.bill_splits(group_id);
CREATE INDEX IF NOT EXISTS idx_bill_settlements_group ON public.bill_settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_bank_conn_user ON public.bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_conn_consent ON public.bank_connections(consent_handle);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- STAGE 4: AUTOMATED UPDATE TIMESTAMPS TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON public.budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_investments_updated_at ON public.investments;
CREATE TRIGGER trg_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON public.savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_bill_groups_updated_at ON public.bill_groups;
CREATE TRIGGER trg_bill_groups_updated_at BEFORE UPDATE ON public.bill_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_bill_splits_updated_at ON public.bill_splits;
CREATE TRIGGER trg_bill_splits_updated_at BEFORE UPDATE ON public.bill_splits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_bank_connections_updated_at ON public.bank_connections;
CREATE TRIGGER trg_bank_connections_updated_at BEFORE UPDATE ON public.bank_connections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- STAGE 5: SECURITY DEFINER HELPER FUNCTIONS (RLS Recursion Breakers)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_bill_group_member(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.bill_participants 
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- STAGE 6: ENABLE ROW LEVEL SECURITY (RLS) ON ALL 17 TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STAGE 7: GRANULAR ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- 2. ACCOUNTS POLICIES
DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- 3. CATEGORIES POLICIES
DROP POLICY IF EXISTS "categories_select_system_or_own" ON public.categories;
CREATE POLICY "categories_select_system_or_own" ON public.categories FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
CREATE POLICY "categories_insert_own" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
CREATE POLICY "categories_update_own" ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;
CREATE POLICY "categories_delete_own" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- 4. TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 5. BUDGETS POLICIES
DROP POLICY IF EXISTS "budgets_select_own" ON public.budgets;
CREATE POLICY "budgets_select_own" ON public.budgets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "budgets_delete_own" ON public.budgets;
CREATE POLICY "budgets_delete_own" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- 6. INVESTMENTS POLICIES
DROP POLICY IF EXISTS "investments_select_own" ON public.investments;
CREATE POLICY "investments_select_own" ON public.investments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own" ON public.investments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own" ON public.investments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "investments_delete_own" ON public.investments;
CREATE POLICY "investments_delete_own" ON public.investments FOR DELETE USING (auth.uid() = user_id);

-- 7. INVESTMENT_TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "inv_tx_select_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_select_own" ON public.investment_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "inv_tx_insert_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_insert_own" ON public.investment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "inv_tx_update_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_update_own" ON public.investment_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "inv_tx_delete_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_delete_own" ON public.investment_transactions FOR DELETE USING (auth.uid() = user_id);

-- 8. SAVINGS_GOALS POLICIES
DROP POLICY IF EXISTS "savings_goals_select_own" ON public.savings_goals;
CREATE POLICY "savings_goals_select_own" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_insert_own" ON public.savings_goals;
CREATE POLICY "savings_goals_insert_own" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_update_own" ON public.savings_goals;
CREATE POLICY "savings_goals_update_own" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "savings_goals_delete_own" ON public.savings_goals;
CREATE POLICY "savings_goals_delete_own" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- 9. GOAL_CONTRIBUTIONS POLICIES
DROP POLICY IF EXISTS "goal_contrib_select_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_select_own" ON public.goal_contributions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contrib_insert_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_insert_own" ON public.goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contrib_update_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_update_own" ON public.goal_contributions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "goal_contrib_delete_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_delete_own" ON public.goal_contributions FOR DELETE USING (auth.uid() = user_id);

-- 10. BILL_GROUPS POLICIES
DROP POLICY IF EXISTS "bill_groups_select" ON public.bill_groups;
CREATE POLICY "bill_groups_select" ON public.bill_groups FOR SELECT 
    USING (creator_id = auth.uid() OR public.is_bill_group_member(id, auth.uid()));

DROP POLICY IF EXISTS "bill_groups_insert" ON public.bill_groups;
CREATE POLICY "bill_groups_insert" ON public.bill_groups FOR INSERT WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "bill_groups_update" ON public.bill_groups;
CREATE POLICY "bill_groups_update" ON public.bill_groups FOR UPDATE USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "bill_groups_delete" ON public.bill_groups;
CREATE POLICY "bill_groups_delete" ON public.bill_groups FOR DELETE USING (creator_id = auth.uid());

-- 11. BILL_PARTICIPANTS POLICIES
DROP POLICY IF EXISTS "bill_participants_select" ON public.bill_participants;
CREATE POLICY "bill_participants_select" ON public.bill_participants FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_participants.group_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "bill_participants_insert" ON public.bill_participants;
CREATE POLICY "bill_participants_insert" ON public.bill_participants FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_participants.group_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "bill_participants_update" ON public.bill_participants;
CREATE POLICY "bill_participants_update" ON public.bill_participants FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_participants.group_id AND creator_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_participants.group_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "bill_participants_delete" ON public.bill_participants;
CREATE POLICY "bill_participants_delete" ON public.bill_participants FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_participants.group_id AND creator_id = auth.uid()));

-- 12. BILL_SPLITS POLICIES
DROP POLICY IF EXISTS "bill_splits_select" ON public.bill_splits;
CREATE POLICY "bill_splits_select" ON public.bill_splits FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_splits.group_id AND creator_id = auth.uid()) OR public.is_bill_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "bill_splits_insert" ON public.bill_splits;
CREATE POLICY "bill_splits_insert" ON public.bill_splits FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_splits.group_id AND creator_id = auth.uid()) OR public.is_bill_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "bill_splits_update" ON public.bill_splits;
CREATE POLICY "bill_splits_update" ON public.bill_splits FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_splits.group_id AND creator_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_splits.group_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "bill_splits_delete" ON public.bill_splits;
CREATE POLICY "bill_splits_delete" ON public.bill_splits FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_splits.group_id AND creator_id = auth.uid()));

-- 13. BILL_SETTLEMENTS POLICIES
DROP POLICY IF EXISTS "bill_settlements_select" ON public.bill_settlements;
CREATE POLICY "bill_settlements_select" ON public.bill_settlements FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_settlements.group_id AND creator_id = auth.uid()) OR public.is_bill_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "bill_settlements_insert" ON public.bill_settlements;
CREATE POLICY "bill_settlements_insert" ON public.bill_settlements FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_settlements.group_id AND creator_id = auth.uid()) OR public.is_bill_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "bill_settlements_update" ON public.bill_settlements;
CREATE POLICY "bill_settlements_update" ON public.bill_settlements FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_settlements.group_id AND creator_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_settlements.group_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "bill_settlements_delete" ON public.bill_settlements;
CREATE POLICY "bill_settlements_delete" ON public.bill_settlements FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.bill_groups WHERE id = bill_settlements.group_id AND creator_id = auth.uid()));

-- 14. USER_PREFERENCES POLICIES
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
CREATE POLICY "user_preferences_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_delete_own" ON public.user_preferences;
CREATE POLICY "user_preferences_delete_own" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

-- 15. EXCHANGE_RATES POLICIES
DROP POLICY IF EXISTS "exchange_rates_select_authenticated" ON public.exchange_rates;
CREATE POLICY "exchange_rates_select_authenticated" ON public.exchange_rates FOR SELECT TO authenticated USING (true);

-- 16. BANK_CONNECTIONS POLICIES
DROP POLICY IF EXISTS "bank_conn_select_own" ON public.bank_connections;
CREATE POLICY "bank_conn_select_own" ON public.bank_connections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_conn_insert_own" ON public.bank_connections;
CREATE POLICY "bank_conn_insert_own" ON public.bank_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_conn_update_own" ON public.bank_connections;
CREATE POLICY "bank_conn_update_own" ON public.bank_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bank_conn_delete_own" ON public.bank_connections;
CREATE POLICY "bank_conn_delete_own" ON public.bank_connections FOR DELETE USING (auth.uid() = user_id);

-- 17. AUDIT_LOGS POLICIES
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
