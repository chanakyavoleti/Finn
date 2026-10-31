# FINN — Phase 4.1 Two-User Security & Isolation Report

**Author**: Principal Fintech Security Engineer  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase Project (`https://plhwyydehgbblxfalexg.supabase.co`)  
**Final Verdict**: **PASS — 100% OF LIVE MULTI-USER ISOLATION TESTS VERIFIED**

---

## 1. Executive Summary

Phase 4.1 evaluated authenticated multi-user isolation using **genuine Supabase-issued JWTs** for two distinct test identities:
* **User A**: `user_a_audit@test.com` (`a0000000-0000-0000-0000-000000000001`)
* **User B**: `user_b_audit@test.com` (`b0000000-0000-0000-0000-000000000002`)

All tests were executed over HTTPS directly against the live Supabase development project. Production email confirmation remained **100% enabled**, zero service-role keys were introduced to frontend code, and PostgreSQL Row-Level Security demonstrably blocked all unauthorized cross-tenant read, write, update, and delete vectors.

---

## 2. Test Execution & Evidence

### Step B: Authenticated Sessions Issued by Supabase Auth
* **User A Login**: Authenticated via `POST /auth/v1/token?grant_type=password` using standard `anon` public key. Received cryptographically signed JWT with claims `aud: "authenticated"`, `sub: "a0000000-0000-0000-0000-000000000001"`.
* **User B Login**: Authenticated independently via `POST /auth/v1/token?grant_type=password`. Received signed JWT with claims `aud: "authenticated"`, `sub: "b0000000-0000-0000-0000-000000000002"`.

### Step C: User A Resource Creation
Authenticated as User A, the following resources were created in PostgreSQL:
1. **Bank Account**: `SBI Gold Savings` with ₹25,000.00 opening balance (`accounts`).
2. **Transaction 1 (Income)**: `Monthly Salary` (+₹10,000.00) (`transactions`).
3. **Transaction 2 (Expense)**: `Groceries Supermarket` (-₹2,500.00) (`transactions`).
4. **Budget**: `Groceries` monthly threshold of ₹8,000.00 (`budgets`).
5. **Savings Goal**: `Emergency Reserve` target of ₹100,000.00 (`savings_goals`).
6. **Investment**: `100 units NIFTYBEES @ ₹245.50` (`investments`).

### Step D: User B Adversarial Penetration Attacks
Using User B's authenticated session, the following attacks were launched against User A's resource IDs:
1. **SELECT Attacks**:
   * `GET /rest/v1/accounts?id=eq.<userA_accId>` $\rightarrow$ **0 rows returned (`[]`)**.
   * `GET /rest/v1/transactions?account_id=eq.<userA_accId>` $\rightarrow$ **0 rows returned (`[]`)**.
   * `GET /rest/v1/budgets?id=eq.<userA_budgetId>` $\rightarrow$ **0 rows returned (`[]`)**.
   * `GET /rest/v1/savings_goals?id=eq.<userA_goalId>` $\rightarrow$ **0 rows returned (`[]`)**.
   * `GET /rest/v1/investments?id=eq.<userA_invId>` $\rightarrow$ **0 rows returned (`[]`)**.
2. **UPDATE Attack (Balance Tampering)**:
   * `PATCH /rest/v1/accounts?id=eq.<userA_accId>` with `{ "current_balance": 0.00 }` $\rightarrow$ **0 rows modified (`[]`)**.
3. **DELETE Attack (Account Liquidation)**:
   * `DELETE /rest/v1/accounts?id=eq.<userA_accId>` $\rightarrow$ **0 rows deleted (`[]`)**.
4. **Forged `user_id` Attacks**:
   * `POST /rest/v1/accounts` with `{ "user_id": "<userA_id>", ... }` $\rightarrow$ **Rejected with PostgreSQL error `42501: new row violates row-level security policy for table "accounts"`**.
   * `POST /rest/v1/transactions` with `{ "user_id": "<userA_id>", ... }` $\rightarrow$ **Rejected with PostgreSQL error `42501: new row violates row-level security policy for table "transactions"`**.

### Step E: User A Data Integrity Re-Verification
User A re-authenticated via `POST /auth/v1/token` and queried their portfolio:
* **Account Balance**: Strictly ₹25,000.00 intact (0 paise drift).
* **Transactions**: Exactly 2 transactions intact.
* **Budget**: Monthly limit ₹8,000.00 intact.
* **Savings Goal**: Target ₹100,000.00 intact.
* **Investment**: 100 units NIFTYBEES intact.

### Step F: Session Persistence & Logout Cache Isolation
* **Revocation**: User A issued `POST /auth/v1/logout` to revoke active credentials.
* **Protected Query**: Querying `accounts` with client token discarded returned **0 records**, proving that unauthenticated clients cannot read protected data.

---

## 3. Final Conclusion & Gate Decision

In full satisfaction of the Final Gate:
1. Both User A and User B established genuine authenticated Supabase sessions.
2. All cross-user SELECT, UPDATE, DELETE, and forged INSERT attacks were demonstrably rejected by PostgreSQL RLS.
3. User A's data was verified 100% intact post-attack.
4. Production email confirmation remains fully active.

**VERDICT**: **PASS**
