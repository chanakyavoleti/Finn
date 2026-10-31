# FINN — Security & Penetration Attack Report

**Author**: Principal Fintech Security Engineer  
**Date**: October 31, 2026  
**Target Environment**: Remote Supabase (`https://plhwyydehgbblxfalexg.supabase.co`) & Local Suite  
**Status**: PASS (Zero Vulnerabilities Detected in RLS & Token Validation)

---

## 1. Executive Summary

Adversarial penetration tests were performed against the live Supabase endpoints and local authentication controllers.

All attacks attempting unauthenticated data access, token forgery, SQL injection, CSV formula injection, and cross-user record modification were strictly blocked by PostgreSQL Row-Level Security and application sanitization filters.

---

## 2. Penetration Attack Matrix

| Attack ID | Threat Vector | Target | Expected Outcome | Actual Outcome | Status | Severity |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | Unauthenticated Read on Protected Tables | Remote Supabase | 0 records returned | HTTP 200, 0 rows visible to anon | **PASS** | Low |
| **SEC-02** | Unauthenticated Insert Attack | Remote Supabase | Rejection with `42501` | HTTP 401 `new row violates row-level security policy` | **PASS** | Critical |
| **SEC-03** | Forged / Manipulated JWT Signature | Remote Supabase | HTTP 401 Unauthorized | HTTP 401 `{"message":"Invalid token"}` | **PASS** | Critical |
| **SEC-04** | Expired Session Token Replay | Local / Remote | Session rejected and cleared | Session invalidated on expiry check | **PASS** | High |
| **SEC-05** | CSV Formula Injection (DDE `=cmd\|`) | Local Parser | Sanitized with leading single quote | Sanitized, prevents code execution | **PASS** | High |
| **SEC-06** | Plaintext Password Leakage in Storage | Local Storage | Only secure hashes/tokens persisted | Zero plaintext passwords in localStorage | **PASS** | Critical |
| **SEC-07** | Client-Side User Spoofing (`usr_demo`) | Local Storage | Isolated tenant workspaces | Zero demo leakage on new user registration | **PASS** | Critical |

---

## 3. Defense-in-Depth Architecture

1. **Kernel-Enforced RLS**:
   * PostgreSQL enforces `auth.uid() = user_id` for every `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
   * Even if frontend application logic is bypassed or compromised, PostgreSQL drops unauthorized queries at the database kernel.
2. **Sanitized Input Pipeline**:
   * Statement import pipelines automatically escape formulas starting with `=`, `+`, `-`, or `@`.
3. **Zero Secret Exposure**:
   * No `SUPABASE_SERVICE_ROLE_KEY` is present in any client bundle or repository file.
   * Only publishable public keys (`sb_publishable_...`) are loaded in browser environments.
