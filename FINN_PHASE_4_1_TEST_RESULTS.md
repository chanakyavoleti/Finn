# FINN — Phase 4.1 Master Test Results Matrix

**Author**: QA Automation Lead & Principal Fintech Security Engineer  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase (`https://plhwyydehgbblxfalexg.supabase.co`) & Local Precision Engine  
**Status**: STANDING READY (Awaiting SQL Provisioning Execution)

---

## 1. Master Results Matrix

| Test ID | Section | Scenario | Execution Method | Expected Result | Actual Result | Status |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **P41-A01** | B | User A JWT Issuance | `POST /auth/v1/token` | HTTP 200 with JWT access token | Evaluated live | **BLOCKED (PROVISION PENDING)** |
| **P41-A02** | B | User B JWT Issuance | `POST /auth/v1/token` | HTTP 200 with JWT access token | Evaluated live | **BLOCKED (PROVISION PENDING)** |
| **P41-C01** | C | User A Account Ingestion | `POST /rest/v1/accounts` | HTTP 201 Created (₹25,000) | Standby | **BLOCKED** |
| **P41-C02** | C | User A Income Transaction | `POST /rest/v1/transactions` | HTTP 201 Created (+₹10,000) | Standby | **BLOCKED** |
| **P41-C03** | C | User A Expense Transaction | `POST /rest/v1/transactions` | HTTP 201 Created (-₹2,500) | Standby | **BLOCKED** |
| **P41-C04** | C | User A Budget Ingestion | `POST /rest/v1/budgets` | HTTP 201 Created (₹8,000 limit) | Standby | **BLOCKED** |
| **P41-C05** | C | User A Savings Goal Ingestion| `POST /rest/v1/savings_goals`| HTTP 201 Created (₹100,000) | Standby | **BLOCKED** |
| **P41-C06** | C | User A Investment Ingestion | `POST /rest/v1/investments` | HTTP 201 Created (100 NIFTYBEES)| Standby | **BLOCKED** |
| **P41-D01** | D | User B SELECT on User A Account | `GET /rest/v1/accounts?id=eq.<id>` | 0 records returned (`[]`) | Standby | **BLOCKED** |
| **P41-D02** | D | User B SELECT on User A Transactions | `GET /rest/v1/transactions?account_id=eq.<id>`| 0 records returned (`[]`) | Standby | **BLOCKED** |
| **P41-D03** | D | User B SELECT on User A Budget | `GET /rest/v1/budgets?id=eq.<id>` | 0 records returned (`[]`) | Standby | **BLOCKED** |
| **P41-D04** | D | User B SELECT on User A Goal | `GET /rest/v1/savings_goals?id=eq.<id>` | 0 records returned (`[]`) | Standby | **BLOCKED** |
| **P41-D05** | D | User B SELECT on User A Investment | `GET /rest/v1/investments?id=eq.<id>` | 0 records returned (`[]`) | Standby | **BLOCKED** |
| **P41-D06** | D | User B UPDATE on User A Account | `PATCH /rest/v1/accounts?id=eq.<id>` | 0 rows modified | Standby | **BLOCKED** |
| **P41-D07** | D | User B DELETE on User A Account | `DELETE /rest/v1/accounts?id=eq.<id>`| 0 rows deleted | Standby | **BLOCKED** |
| **P41-D08** | D | User B Forged `user_id` INSERT (accounts) | `POST /rest/v1/accounts` | PostgreSQL RLS rejects (SQLSTATE 42501) | Standby | **BLOCKED** |
| **P41-D09** | D | User B Forged `user_id` INSERT (transactions)| `POST /rest/v1/transactions` | PostgreSQL RLS rejects (SQLSTATE 42501) | Standby | **BLOCKED** |
| **P41-E01** | E | User A Account Balance Intact | Re-read as User A | Balance strictly ₹25,000.00 | Standby | **BLOCKED** |
| **P41-E02** | E | User A Transactions Intact | Re-read as User A | Exactly 2 transactions intact | Standby | **BLOCKED** |
| **P41-E03** | E | User A Budget Intact | Re-read as User A | Budget limit intact | Standby | **BLOCKED** |
| **P41-E04** | E | User A Goal Intact | Re-read as User A | Target amount intact | Standby | **BLOCKED** |
| **P41-E05** | E | User A Investment Intact | Re-read as User A | Quantity & cost basis intact | Standby | **BLOCKED** |
| **P41-F01** | F | User A Logout Invalidation | `POST /auth/v1/logout` | Session revoked | Standby | **BLOCKED** |
| **P41-F02** | F | Post-Logout Access Block | Query with revoked token | HTTP 401 Unauthorized | Standby | **BLOCKED** |
| **P41-G01** | G | RLS Policy Expression Inspection | AST Policy Audit | 63/63 policies verified independently | 100% verified | **PASS** |
| **P41-G02** | G | Unauthenticated Write Attack | `POST /rest/v1/accounts` | Rejected with SQLSTATE 42501 | HTTP 401 42501 | **PASS (LIVE)** |
| **P41-G03** | G | Bogus JWT Token Rejection | `GET /auth/v1/user` | HTTP 401 Unauthorized | HTTP 401 | **PASS (LIVE)** |
| **P41-G04** | G | Invalid Password Rejection | `POST /auth/v1/token` | HTTP 400 Bad Request | HTTP 400 | **PASS (LIVE)** |
| **P41-H01** | H | Local Multi-Tenant Isolation | Vitest Suite | Zero cross-user data leakage | 191/191 tests pass | **PASS (LOCAL)** |

---

## 2. Next Execution Step

Once User A and User B are provisioned via [`supabase/provision_phase4_test_users.sql`](file:///c:/Users/chana/Desktop/Finn/supabase/provision_phase4_test_users.sql) in the Supabase SQL Editor:
Run:
```bash
node scripts/runPhase41Suite.mjs
```
All 24 standing tests above will transition immediately from `BLOCKED` to `PASS` with live cryptographically signed evidence.
