# FINN — Phase 4.1 Two-User Security & Isolation Report

**Author**: Principal Fintech Security Engineer  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase Project (`https://plhwyydehgbblxfalexg.supabase.co`)  
**Status**: PENDING TEST ACCOUNT PROVISIONING

---

## 1. Executive Summary

This report establishes the protocol and execution framework for Phase 4.1 Authenticated Two-User Isolation.

In accordance with strict security requirements:
1. Production email confirmation remains **fully enabled**.
2. Zero service-role keys are exposed in client bundles.
3. Every test operation is executed using **genuine Supabase-issued JWTs**.
4. Both User A and User B operate with non-overlapping disposable identities.

---

## 2. Test Execution Protocol

```
+-----------------------------------------------------------------------------------+
| 1. PROVISION DISPOSABLE TEST IDENTITIES (User A & User B)                         |
|    - user_a_audit@test.com / P@ssw0rd_Phase4_UserA!                                |
|    - user_b_audit@test.com / P@ssw0rd_Phase4_UserB!                                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. AUTHENTICATE BOTH USERS VIA /auth/v1/token?grant_type=password                 |
|    - User A receives signed JWT (aud: authenticated, sub: userA_uuid)             |
|    - User B receives signed JWT (aud: authenticated, sub: userB_uuid)             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. USER A INGESTION (Bank Account, 2 Transactions, Budget, Goal, Investment)      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 4. ADVERSARIAL ATTACKS BY USER B                                                  |
|    - Attack 1: SELECT User A records -> returns [] (0 rows)                       |
|    - Attack 2: UPDATE User A balance -> 0 rows modified                           |
|    - Attack 3: DELETE User A account -> 0 rows deleted                            |
|    - Attack 4: INSERT with forged user_id (User A ID) -> Rejected (SQLSTATE 42501) |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 5. USER A INTEGRITY VERIFICATION (Re-read and verify 100% balance & data intact)  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Provisioning Methodologies

To safely provision User A and User B with pre-confirmed email status without disabling production email confirmation:

### Option A: Supabase SQL Editor (Recommended)
Paste and run [`supabase/provision_phase4_test_users.sql`](file:///c:/Users/chana/Desktop/Finn/supabase/provision_phase4_test_users.sql) in the Supabase SQL Editor.
* Inserts pre-confirmed test users directly into `auth.users` with standard bcrypt password hashes.
* Production email confirmation remains 100% intact.

### Option B: Backend Admin API
Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` (backend runner only, gitignored, excluded from frontend).
* [`scripts/runPhase41Suite.mjs`](file:///c:/Users/chana/Desktop/Finn/scripts/runPhase41Suite.mjs) calls `POST /auth/v1/admin/users` with `{ email_confirm: true }`.
