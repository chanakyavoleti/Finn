# FINN — Phase 6.1 Deployment Blockers & Operational Runbook

**Project:** FINN — Financial Intelligence & Wealth Management  
**Phase:** 6.1 — Critical Audit Hardening & Remediation  
**Status:** **ACTIVE DEPLOYMENT BLOCKERS IDENTIFIED & RUNBOOK PREPARED**  
**Date:** 2026-10-31  

---

## 1. Executive Summary

While all application source code, client repositories, cryptographic primitives, and benchmark suites have been hardened and verified with **199 / 199 passing tests**, FINN cannot be declared unconditionally ready for public commercial launch until **four external cloud operational blockers** are resolved by the deployment administrator.

This document serves as the authoritative operational runbook detailing each blocker, its exact risk impact, and the precise step-by-step procedure required to unblock public launch.

---

## 2. Active Deployment Blockers Matrix

| Blocker ID | Domain | Severity | Blocker Summary | Operational Owner | Unblocking Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | Database / RLS | **HIGH** | Migration `00003_phase_6_1_critical_hardening.sql` must be executed in the Supabase SQL Editor. | DBA / Developer | Paste and run SQL in Supabase Dashboard. |
| **BLK-02** | Authentication / Operations | **HIGH** | Supabase free-tier built-in email rate limiting blocks signups after 3-4 users (`AUD-HIGH-03`). | DevSecOps / Cloud Admin | Configure custom SMTP (Resend / SendGrid / AWS SES). |
| **BLK-03** | Reliability / Disaster Recovery | **HIGH** | Supabase Free tier lacks continuous Point-in-Time Recovery (PITR). | Infrastructure Owner | Upgrade project to Supabase Pro ($25/mo). |
| **BLK-04** | Compliance / Legal | **HIGH** | Statutory Privacy Policy and Terms of Service required by India DPDP Act 2023 and GDPR. | Legal / Frontend Dev | Publish terms & privacy policy static pages. |

---

## 3. Step-by-Step Unblocking Runbook

### 3.1 Unblocking BLK-01: Execute Remote Database Hardening Migration
* **Risk If Unblocked:** An authenticated user (`User B`) can link transactions or goal contributions to an unowned `account_id` or `goal_id` belonging to `User A`, locking User A's account via `ON DELETE RESTRICT`.
* **Execution Procedure:**
  1. Open the Supabase Project Dashboard: `https://supabase.com/dashboard/project/plhwyydehgbblxfalexg`.
  2. Navigate to **SQL Editor** in the left navigation sidebar.
  3. Click **New Query**.
  4. Open [`supabase/migrations/00003_phase_6_1_critical_hardening.sql`](file:///c:/Users/chana/Desktop/Finn/supabase/migrations/00003_phase_6_1_critical_hardening.sql).
  5. Copy the entire contents of the file and paste it into the SQL Editor.
  6. Click **Run** (or press `Ctrl+Enter`).
  7. Verify output: `Success. No rows returned`.
  8. Execute [`scripts/testPhase61SecurityLive.mjs`](file:///c:/Users/chana/Desktop/Finn/scripts/testPhase61SecurityLive.mjs) locally to confirm Attack 1 and Attack 2 return `403 / 42501` (forbidden).

---

### 3.2 Unblocking BLK-02: Configure Enterprise Custom SMTP
* **Risk If Unblocked:** Real users signing up on production will experience HTTP 429 (`over_email_send_rate_limit`) after 3-4 confirmation emails, preventing new customer onboarding.
* **Execution Procedure:**
  1. In the Supabase Dashboard, navigate to **Project Settings -> Authentication -> Email Settings**.
  2. Toggle **Enable Custom SMTP** to `ON`.
  3. Enter production mail provider credentials:
     - **Sender Name:** FINN Security & Auth
     - **Sender Email:** `auth@finn.in` (or your verified domain sender)
     - **Host:** e.g., `smtp.resend.com` (for Resend) or `smtp.sendgrid.net`
     - **Port:** `587` (TLS) or `465` (SSL)
     - **Username:** `resend` / `apikey`
     - **Password:** `<PROD_SMTP_API_KEY>` (stored in secure enterprise secret manager)
  4. Ensure SPF (`v=spf1 include:... ~all`) and DKIM TXT records are configured on the root domain DNS.
  5. Click **Save Changes** and send a test email.

---

### 3.3 Unblocking BLK-03: Upgrade Database to Supabase Pro for Continuous Backups (PITR)
* **Risk If Unblocked:** On the Free tier, database backups are limited to manual SQL dumps. In the event of catastrophic data corruption or human error, point-in-time recovery to the second of failure is unavailable.
* **Execution Procedure:**
  1. In the Supabase Dashboard, navigate to **Project Settings -> Billing**.
  2. Upgrade the project to the **Pro Plan**.
  3. Under **Database -> Backups**, enable **Point in Time Recovery (PITR)** with 7-day retention.
  4. Confirm that continuous WAL archiving is active.

---

### 3.4 Unblocking BLK-04: Publish Statutory Legal & Privacy Terms
* **Risk If Unblocked:** Financial applications processing banking account details, UPI VPAs, and personal net worth metrics are legally mandated under the India DPDP Act 2023 and GDPR to present explicit terms and consent mechanisms.
* **Execution Procedure:**
  1. Deploy a static route or modal `/privacy` articulating:
     - Data collection scope (financial accounts, transactions, investments).
     - Storage location (PostgreSQL with RLS encryption at rest).
     - "Right to be Forgotten" account deletion policy via `delete_user_account()`.
  2. Deploy a static route or modal `/terms` articulating:
     - FINN is an analytical wealth management dashboard, not an authorized SEBI investment advisory or deposit-taking institution.
  3. Add footer navigation links in `App.tsx` and the registration modal.

---

## 4. Final Operational Sign-Off Gate

```
================================================================================
                    PRODUCTION LAUNCH SIGN-OFF GATE
================================================================================
Phase 6.1 Code Remediations:       COMPLETED (199/199 Tests Passing)
TypeScript & Vite Production Build: COMPLETED (0 Errors)
PostgreSQL Migration 00003:         PENDING EXECUTION IN SUPABASE SQL EDITOR
Custom SMTP Service:                PENDING CONFIGURATION IN SUPABASE DASHBOARD
Production Readiness Status:        BLOCKED UNTIL BLK-01 THROUGH BLK-04 RESOLVED
================================================================================
```
