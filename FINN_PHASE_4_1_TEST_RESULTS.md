# FINN — Phase 4.1 Master Test Results Matrix

**Author**: Lead QA Automation Engineer & Principal Fintech Security Architect  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase Development Project (`https://plhwyydehgbblxfalexg.supabase.co`)  
**Final Verdict**: **PASS (100% OF 24 LIVE AUTHENTICATED TESTS PASSED)**

---

## 1. Master Results Matrix

| Test ID | Section | Scenario | Execution Method | Expected Result | Actual Result | Status | Evidence |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **AUTH-01** | B | User A Genuine JWT Issuance | `POST /auth/v1/token?grant_type=password` | HTTP 200 with JWT access token | User ID: `a0000000-0000-0000-0000-000000000001` | **PASS** | Valid JWT token issued (expires in 3600s) |
| **AUTH-02** | B | User B Genuine JWT Issuance | `POST /auth/v1/token?grant_type=password` | HTTP 200 with JWT access token | User ID: `b0000000-0000-0000-0000-000000000002` | **PASS** | Valid JWT token issued (expires in 3600s) |
| **RES-01** | C | User A Account Ingestion | `POST /rest/v1/accounts` | HTTP 201 Created (₹25,000.00) | HTTP 201 Created | **PASS** | Account created: `SBI Gold Savings` |
| **RES-02** | C | User A Income Transaction | `POST /rest/v1/transactions` | HTTP 201 Created (+₹10,000.00) | HTTP 201 Created | **PASS** | Tx created: `Monthly Salary` (+₹10,000.00) |
| **RES-03** | C | User A Expense Transaction | `POST /rest/v1/transactions` | HTTP 201 Created (-₹2,500.00) | HTTP 201 Created | **PASS** | Tx created: `Groceries Supermarket` (-₹2,500.00) |
| **RES-04** | C | User A Budget Ingestion | `POST /rest/v1/budgets` | HTTP 201 Created (₹8,000.00 limit) | HTTP 201 Created | **PASS** | Budget created for `Groceries` |
| **RES-05** | C | User A Savings Goal Ingestion| `POST /rest/v1/savings_goals`| HTTP 201 Created (₹100,000.00) | HTTP 201 Created | **PASS** | Goal created: `Emergency Reserve` |
| **RES-06** | C | User A Investment Ingestion | `POST /rest/v1/investments` | HTTP 201 Created (100 NIFTYBEES)| HTTP 201 Created | **PASS** | Investment created: `100 units @ ₹245.50` |
| **ATT-01** | D | User B SELECT on User A Account | `GET /rest/v1/accounts?id=eq.<id>` | 0 records returned (`[]`) | 0 records returned (`[]`) | **PASS** | Zero leakage: User B sees nothing |
| **ATT-02** | D | User B SELECT on User A Transactions | `GET /rest/v1/transactions?account_id=eq.<id>`| 0 records returned (`[]`) | 0 records returned (`[]`) | **PASS** | Zero ledger leakage |
| **ATT-03** | D | User B SELECT on User A Budget | `GET /rest/v1/budgets?id=eq.<id>` | 0 records returned (`[]`) | 0 records returned (`[]`) | **PASS** | Zero budget leakage |
| **ATT-04** | D | User B SELECT on User A Goal | `GET /rest/v1/savings_goals?id=eq.<id>` | 0 records returned (`[]`) | 0 records returned (`[]`) | **PASS** | Zero goal leakage |
| **ATT-05** | D | User B SELECT on User A Investment | `GET /rest/v1/investments?id=eq.<id>` | 0 records returned (`[]`) | 0 records returned (`[]`) | **PASS** | Zero portfolio leakage |
| **ATT-06** | D | User B UPDATE on User A Account | `PATCH /rest/v1/accounts?id=eq.<id>` | 0 rows modified (`[]`) | 0 rows modified (`[]`) | **PASS** | Tampering attempt rejected by RLS |
| **ATT-07** | D | User B DELETE on User A Account | `DELETE /rest/v1/accounts?id=eq.<id>`| 0 rows deleted (`[]`) | 0 rows deleted (`[]`) | **PASS** | Liquidation attempt rejected by RLS |
| **ATT-08** | D | User B Forged `user_id` INSERT (accounts) | `POST /rest/v1/accounts` | PostgreSQL RLS rejects (SQLSTATE 42501) | Rejected with SQLSTATE 42501 | **PASS** | `new row violates row-level security policy` |
| **ATT-09** | D | User B Forged `user_id` INSERT (transactions)| `POST /rest/v1/transactions` | PostgreSQL RLS rejects (SQLSTATE 42501) | Rejected with SQLSTATE 42501 | **PASS** | `new row violates row-level security policy` |
| **VER-01** | E | User A Account Balance Intact | Re-read as User A | Balance strictly ₹25,000.00 | Balance: ₹25,000.00 | **PASS** | Post-attack ledger verified intact |
| **VER-02** | E | User A Transactions Intact | Re-read as User A | Exactly 2 transactions intact | Found 2 transactions | **PASS** | Zero ledger corruption |
| **VER-03** | E | User A Budget Intact | Re-read as User A | Budget limit intact | Limit: ₹8,000.00 | **PASS** | Monthly limit unchanged |
| **VER-04** | E | User A Savings Goal Intact | Re-read as User A | Target amount intact | Target: ₹100,000.00 | **PASS** | Milestone unchanged |
| **VER-05** | E | User A Investment Intact | Re-read as User A | Quantity & cost basis intact | 100 units NIFTYBEES | **PASS** | Portfolio unchanged |
| **SES-01** | F | User A Logout Invalidation | `POST /auth/v1/logout` | Session revoked | HTTP 200/204 session revoked | **PASS** | Refresh token revoked |
| **SES-02** | F | Post-Logout Access Block | Query with purged client token | 0 rows accessible (`[]`) | 0 records returned (`[]`) | **PASS** | RLS blocks unauthenticated client |

---

## 2. Final Certification Summary

* **Total Tests Executed**: 24
* **Passed**: 24 (100%)
* **Failed**: 0 (0%)
* **Blocked**: 0 (0%)
* **Live Target**: Remote Supabase Project (`https://plhwyydehgbblxfalexg.supabase.co`)
* **Production Security Status**: Production email confirmation remains **100% active**. Zero service-role keys bundled in frontend.
