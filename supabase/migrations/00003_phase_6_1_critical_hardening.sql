-- ==============================================================================
-- FINN PHASE 6.1: CRITICAL HARDENING & AUDIT REMEDIATION
-- Migration: 00003_phase_6_1_critical_hardening.sql
-- Description:
--   1. Fix AUD-HIGH-01: Enforce parent-table foreign key ownership in RLS policies
--      (transactions, goal_contributions, investments, investment_transactions, budgets).
--   2. Fix AUD-MED-02: Atomic financial transfer procedure (execute_transfer) with
--      two-legged balance mutation, currency conversion & balance conservation.
--   3. Fix AUD-MED-05: Server-side account deletion procedure (delete_user_account)
--      with topological cascade cleanup.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN TRANSACTIONS RLS POLICIES (Parent Account & Category Ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.accounts 
        WHERE id = transactions.account_id AND user_id = auth.uid()
    ) AND
    (
        transactions.destination_account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = transactions.destination_account_id AND user_id = auth.uid()
        )
    ) AND
    (
        transactions.category_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = transactions.category_id AND (user_id IS NULL OR user_id = auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own" ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.accounts 
        WHERE id = transactions.account_id AND user_id = auth.uid()
    ) AND
    (
        transactions.destination_account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = transactions.destination_account_id AND user_id = auth.uid()
        )
    ) AND
    (
        transactions.category_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.categories 
            WHERE id = transactions.category_id AND (user_id IS NULL OR user_id = auth.uid())
        )
    )
);

-- ------------------------------------------------------------------------------
-- 2. HARDEN GOAL_CONTRIBUTIONS RLS POLICIES (Parent Goal & Account Ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "goal_contrib_insert_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_insert_own" ON public.goal_contributions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.savings_goals 
        WHERE id = goal_contributions.goal_id AND user_id = auth.uid()
    ) AND
    (
        goal_contributions.account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = goal_contributions.account_id AND user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "goal_contrib_update_own" ON public.goal_contributions;
CREATE POLICY "goal_contrib_update_own" ON public.goal_contributions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.savings_goals 
        WHERE id = goal_contributions.goal_id AND user_id = auth.uid()
    ) AND
    (
        goal_contributions.account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = goal_contributions.account_id AND user_id = auth.uid()
        )
    )
);

-- ------------------------------------------------------------------------------
-- 3. HARDEN INVESTMENTS RLS POLICIES (Parent Account Ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "investments_insert_own" ON public.investments;
CREATE POLICY "investments_insert_own" ON public.investments FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND 
    (
        investments.account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = investments.account_id AND user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "investments_update_own" ON public.investments;
CREATE POLICY "investments_update_own" ON public.investments FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (
    auth.uid() = user_id AND 
    (
        investments.account_id IS NULL OR 
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = investments.account_id AND user_id = auth.uid()
        )
    )
);

-- ------------------------------------------------------------------------------
-- 4. HARDEN INVESTMENT_TRANSACTIONS RLS POLICIES (Parent Investment Ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "inv_tx_insert_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_insert_own" ON public.investment_transactions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.investments 
        WHERE id = investment_transactions.investment_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "inv_tx_update_own" ON public.investment_transactions;
CREATE POLICY "inv_tx_update_own" ON public.investment_transactions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.investments 
        WHERE id = investment_transactions.investment_id AND user_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 5. HARDEN BUDGETS RLS POLICIES (Category Ownership)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "budgets_insert_own" ON public.budgets;
CREATE POLICY "budgets_insert_own" ON public.budgets FOR INSERT 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.categories 
        WHERE id = budgets.category_id AND (user_id IS NULL OR user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "budgets_update_own" ON public.budgets;
CREATE POLICY "budgets_update_own" ON public.budgets FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM public.categories 
        WHERE id = budgets.category_id AND (user_id IS NULL OR user_id = auth.uid())
    )
);

-- ------------------------------------------------------------------------------
-- 6. ATOMIC FINANCIAL TRANSFER STORED PROCEDURE (Fix AUD-MED-02 & AUD-MED-03)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.execute_transfer(
    p_source_account_id UUID,
    p_destination_account_id UUID,
    p_amount NUMERIC(15, 2),
    p_title TEXT,
    p_exchange_rate NUMERIC(15, 6) DEFAULT 1.0,
    p_destination_amount NUMERIC(15, 2) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $
DECLARE
    v_user_id UUID := auth.uid();
    v_source_acc public.accounts%ROWTYPE;
    v_dest_acc public.accounts%ROWTYPE;
    v_dest_credited NUMERIC(15, 2);
    v_tx_id UUID := gen_random_uuid();
    v_rate NUMERIC(15, 6) := COALESCE(p_exchange_rate, 1.0);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be strictly positive';
    END IF;

    IF p_source_account_id = p_destination_account_id THEN
        RAISE EXCEPTION 'Source and destination accounts must be distinct';
    END IF;

    -- Fetch and lock source account
    SELECT * INTO v_source_acc 
    FROM public.accounts 
    WHERE id = p_source_account_id AND user_id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source account not found or access denied';
    END IF;

    -- Fetch and lock destination account
    SELECT * INTO v_dest_acc 
    FROM public.accounts 
    WHERE id = p_destination_account_id AND user_id = v_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination account not found or access denied';
    END IF;

    -- Enforce sufficient funds
    IF v_source_acc.current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds: Source account % balance is % %, required % %', 
            v_source_acc.account_name, v_source_acc.current_balance, v_source_acc.currency, p_amount, v_source_acc.currency;
    END IF;

    -- Currency calculation and conservation
    IF v_source_acc.currency = v_dest_acc.currency THEN
        v_dest_credited := p_amount;
    ELSE
        IF p_destination_amount IS NOT NULL AND p_destination_amount > 0 THEN
            v_dest_credited := p_destination_amount;
        ELSE
            IF v_rate <= 0 THEN
                RAISE EXCEPTION 'Invalid exchange rate for cross-currency transfer: %', v_rate;
            END IF;
            v_dest_credited := ROUND(p_amount * v_rate, 2);
        END IF;
    END IF;

    -- Atomic debit from source
    UPDATE public.accounts 
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_source_account_id;

    -- Atomic credit to destination
    UPDATE public.accounts 
    SET current_balance = current_balance + v_dest_credited,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_destination_account_id;

    -- Record transfer transaction
    INSERT INTO public.transactions (
        id,
        user_id,
        account_id,
        destination_account_id,
        title,
        merchant,
        amount,
        currency,
        transaction_type,
        category_name,
        transaction_date,
        status,
        notes
    ) VALUES (
        v_tx_id,
        v_user_id,
        p_source_account_id,
        p_destination_account_id,
        p_title,
        'Internal Transfer',
        p_amount,
        v_source_acc.currency,
        'transfer',
        'Transfer',
        CURRENT_DATE,
        'posted',
        COALESCE(
            p_notes,
            format('Transferred %s %s -> %s %s (Rate: %s)', 
                   p_amount, v_source_acc.currency, v_dest_credited, v_dest_acc.currency, v_rate)
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'source_account_id', p_source_account_id,
        'source_new_balance', v_source_acc.current_balance - p_amount,
        'destination_account_id', p_destination_account_id,
        'destination_new_balance', v_dest_acc.current_balance + v_dest_credited,
        'debited_amount', p_amount,
        'credited_amount', v_dest_credited,
        'exchange_rate', v_rate
    );
END;
$;

REVOKE ALL ON FUNCTION public.execute_transfer(UUID, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_transfer(UUID, UUID, NUMERIC, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. SECURE SERVER-SIDE ACCOUNT DELETION (Fix AUD-MED-05)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete all child records in strict topological order
    -- Note: bill_settlements and bill_splits cascade on bill_groups and bill_participants
    DELETE FROM public.audit_logs WHERE user_id = v_user_id;
    DELETE FROM public.bill_participants WHERE user_id = v_user_id;
    DELETE FROM public.bill_groups WHERE creator_id = v_user_id;
    DELETE FROM public.goal_contributions WHERE user_id = v_user_id;
    DELETE FROM public.savings_goals WHERE user_id = v_user_id;
    DELETE FROM public.investment_transactions WHERE user_id = v_user_id;
    DELETE FROM public.investments WHERE user_id = v_user_id;
    DELETE FROM public.budgets WHERE user_id = v_user_id;
    DELETE FROM public.transactions WHERE user_id = v_user_id;
    DELETE FROM public.bank_connections WHERE user_id = v_user_id;
    DELETE FROM public.user_preferences WHERE user_id = v_user_id;
    DELETE FROM public.accounts WHERE user_id = v_user_id;
    DELETE FROM public.categories WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'deleted_user_id', v_user_id,
        'deleted_at', timezone('utc'::text, now())
    );
END;
$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
