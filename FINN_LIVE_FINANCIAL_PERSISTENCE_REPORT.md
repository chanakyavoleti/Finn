# FINN — Live Financial Persistence & Ledger Parity Report

**Author**: Senior Financial Systems Auditor & PostgreSQL Specialist  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase (`https://plhwyydehgbblxfalexg.supabase.co`) & Local Precision Oracle  
**Status**: CONDITIONAL PASS (Schema Math Verified; Live Ingestion Blocked on Auth)

---

## 1. Executive Summary

Financial persistence and ledger parity were audited against the required scenario:
* Initial Balance: ₹10,000.00
* Income Transaction: +₹2,000.00
* Expense Transaction: -₹500.00
* Expected Net Balance: ₹11,500.00

Calculations, decimal precision constraints (`NUMERIC(15, 2)`), and deduplication hash mechanics were verified.

---

## 2. Test Protocol & Results

| Test ID | Scenario | Target | Expected Result | Actual Result | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **FIN-01** | Mathematical Balance Invariant | Local Oracle | ₹10,000 + ₹2,000 - ₹500 = ₹11,500.00 | Exactly 11500.00 (0-paise drift) | **PASS** | `financialPrecisionAttack.test.tsx` (15/15 passed). |
| **FIN-02** | Remote Schema Numeric Constraints | Remote Supabase | `current_balance NUMERIC(15, 2)` | Strict 2 decimal places in PostgreSQL DDL | **PASS** | Validated in table definitions. |
| **FIN-03** | Ledger Deduplication Hash Verification | Local / Remote | Identical repeat submissions skip insertion | Hash incorporates `record.id`, prevents duplication | **PASS** | `cloudArchitectureAndMigration.test.ts` (5/5 passed). |
| **FIN-04** | Live Remote Account Ingestion (₹10,000) | Remote Supabase | Account persisted in remote DB | Blocked on authenticated session | **BLOCKED** | Blocked by Supabase SMTP rate limit on signup. |
| **FIN-05** | Live Income & Expense Persistence | Remote Supabase | Transactions recorded in remote DB | Blocked on authenticated session | **BLOCKED** | Dependent on FIN-04. |
| **FIN-06** | Post-Logout & Re-Login State Recovery | Remote Supabase | Balance and transactions survive reload | Blocked on live authentication | **BLOCKED** | Tested and verified in local-first storage mode. |
| **FIN-07** | Local-First Session Data Parity | Local Vitest | Zero data loss across user switches and reloads | 100% data recovery verified | **PASS** | `dataRecoveryAudit.test.tsx` (7/7 passed). |

---

## 3. Data Integrity & Financial Precision Guarantees

1. **Zero Floating-Point Drift**:
   * All balance updates in FINN use integer paise (`Math.round(amount * 100)`) in memory and `NUMERIC(15, 2)` in PostgreSQL.
2. **Ledger Immutability**:
   * `transactions.account_id` is protected with `ON DELETE RESTRICT` to prevent orphaned transactions.
3. **Double-Entry Balance Verification**:
   * Internal transfers atomically debit source and credit destination without net-worth distortion (`TC-087 to TC-089` passing).
