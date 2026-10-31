# FINN — Phase 6 Database Reliability, Concurrency & Recovery Audit

**Project:** FINN — Financial Intelligence & Wealth Management  
**Phase:** 6 — Independent Production Readiness & Security Hardening  
**Role:** Senior PostgreSQL DBA & Reliability Engineer  
**Audit Date:** 2026-10-31  
**Database Backend:** Supabase Managed PostgreSQL 15.x  
**Reliability Rating:** **CONDITIONALLY APPROVED**  

---

## 1. Executive Summary

This report evaluates the resilience, structural integrity, concurrency behavior, and backup/recovery capabilities of the FINN PostgreSQL database cluster.

The schema deployment consists of 17 relational tables, 35 indexes, and 63 active RLS policies. The relational constraints successfully enforce referential integrity and data type bounds. However, production readiness requires formalizing backup procedures, automating audit log triggers, and implementing atomic database stored procedures for multi-legged financial transfers.

---

## 2. Structural & Architectural Audit

### 2.1 Table & Index Coverage Matrix

| Table Name | Primary Key | Foreign Keys | Key Indexes | Deletion Cascade Rule | Audit Trigger |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `public.profiles` | `id` (UUID) | `auth.users(id)` | `idx_profiles_email` | CASCADE from auth | Manual |
| `public.accounts` | `id` (UUID) | `profiles(id)` | `idx_accounts_user_id` | CASCADE from profile | Manual |
| `public.transactions` | `id` (UUID) | `profiles(id)`, `accounts(id)`, `categories(id)` | `idx_transactions_user_id`, `idx_transactions_date` | RESTRICT on account | Manual |
| `public.budgets` | `id` (UUID) | `profiles(id)`, `categories(id)` | `UNIQUE(user_id, category_id, start_date)` | CASCADE | Manual |
| `public.investments` | `id` (UUID) | `profiles(id)`, `accounts(id)` | `idx_investments_user_id` | SET NULL on account | Manual |
| `public.savings_goals` | `id` (UUID) | `profiles(id)` | `idx_savings_goals_user_id` | CASCADE | Manual |
| `public.goal_contributions` | `id` (UUID) | `profiles(id)`, `savings_goals(id)` | `idx_goal_contrib_goal_id` | CASCADE | Manual |
| `public.bill_groups` | `id` (UUID) | `profiles(id)` | `idx_bill_groups_creator` | CASCADE | Manual |
| `public.bill_participants` | `id` (UUID) | `bill_groups(id)`, `profiles(id)` | `UNIQUE(group_id, user_id)` | CASCADE | Manual |
| `public.bill_splits` | `id` (UUID) | `bill_groups(id)`, `bill_participants(id)` | `idx_bill_splits_group_id` | CASCADE | Manual |
| `public.bill_settlements` | `id` (UUID) | `bill_groups(id)`, `bill_participants(id)` | `idx_bill_settlements_group` | CASCADE | Manual |
| `public.audit_logs` | `id` (UUID) | `profiles(id)` | `idx_audit_logs_user`, `idx_audit_logs_created_at` | SET NULL | Target Table |

---

## 3. High-Risk Reliability Findings & Hardening Recommendations

### 3.1 Non-Atomic Client-Side Transfers (Finding REL-01 - HIGH)
* **Current Behavior:** In [`FinanceContext.tsx`](file:///c:/Users/chana/Desktop/Finn/src/context/FinanceContext.tsx#L430-L445), when a user executes an internal transfer (e.g. ₹10,000 from Savings to Investment Vault):
  - Client sends PATCH to debit Account A.
  - Client sends PATCH to credit Account B.
  - Client inserts a transaction record.
* **Risk:** If the client loses connection, crashes, or the second request encounters a 500 error after the first succeeds, money disappears from Account A without appearing in Account B (Balance conservation broken).
* **Recommended Production Hardening:** Deploy an atomic PostgreSQL RPC function (`transfer_funds`):
  ```sql
  CREATE OR REPLACE FUNCTION public.execute_transfer(
      p_source_account_id UUID,
      p_destination_account_id UUID,
      p_amount NUMERIC(15, 2),
      p_title TEXT,
      p_user_id UUID
  ) RETURNS JSONB AS $$
  DECLARE
      v_tx_id UUID := gen_random_uuid();
  BEGIN
      -- Enforce user ownership of both accounts
      IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_source_account_id AND user_id = p_user_id) OR
         NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_destination_account_id AND user_id = p_user_id) THEN
          RAISE EXCEPTION 'Unauthorized account access or invalid account';
      END IF;

      -- Atomic balance mutation
      UPDATE public.accounts SET current_balance = current_balance - p_amount WHERE id = p_source_account_id;
      UPDATE public.accounts SET current_balance = current_balance + p_amount WHERE id = p_destination_account_id;

      -- Insert transaction
      INSERT INTO public.transactions (
          id, user_id, account_id, destination_account_id, title, merchant, amount, transaction_type, category_name, transaction_date
      ) VALUES (
          v_tx_id, p_user_id, p_source_account_id, p_destination_account_id, p_title, 'Internal Transfer', p_amount, 'transfer', 'Transfer', CURRENT_DATE
      );

      RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

---

### 3.2 Automated Audit Log Triggers (Finding REL-02 - MEDIUM)
* **Current State:** Table `public.audit_logs` exists, but mutations are not automatically recorded at the PostgreSQL kernel level.
* **Recommended Hardening:** Attach standard row-level trigger to `accounts` and `transactions` to log all mutations with `auth.uid()` and IP address metadata.

---

### 3.3 Database Backup & Point-in-Time Recovery (PITR) (Finding REL-03 - HIGH)
* **Current State:** The Supabase development project operates on the Free tier.
* **Limitation:** The Free tier does not include continuous Write-Ahead Log (WAL) archiving or Point-in-Time Recovery. Disaster recovery is limited to manual SQL dumps.
* **Pre-Launch Requirement:**
  1. Upgrade to Supabase Pro tier before launching public customer accounts to enable 7-day automated continuous physical backups.
  2. Implement a secondary daily off-site encrypted backup schedule (via GitHub Actions / AWS S3 pg_dump cron job).

---

## 4. Concurrency & Idempotency Audit

* **Duplicate Prevention:**
  - `transactions` enforces unique constraint `uq_account_tx_dedup UNIQUE (account_id, deduplication_hash)` and primary key uniqueness.
  - Submitting duplicate UUIDs triggers SQLSTATE `23505`, preventing duplicate balance impact.
* **Concurrent Balance Updates:**
  - In high-frequency multi-tab environments, reading and writing balances via client PATCH (`set current_balance = X`) is subject to lost update anomalies.
  - Server-side atomic increments (`current_balance = current_balance + delta`) should replace absolute overwrites.

---

## 5. Reliability Verdict

**VERDICT: CONDITIONALLY APPROVED**  
PostgreSQL structural integrity, referential integrity (`ON DELETE RESTRICT` on active accounts), and index layout are solid. Atomicity of transfers and production backup tiering must be completed prior to unrestricted public launch.
