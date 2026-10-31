# PROJECT FINN — SECURITY IMPLEMENTATION SPECIFICATION
**Document ID:** FINN-SEC-002  
**Security Model:** Zero-Trust Multi-Tenant Cloud Architecture  
**Engineered By:** Principal Full-Stack Architect & Application Security Tester  
**Status:** Security Model Prepared & RLS Simulator Validated  
**Date:** October 31, 2026  

---

## 1. Security Architecture Principles

Project FINN adopts a **Zero-Trust Multi-Tenant Architecture**. In a cloud-hosted fintech environment handling sensitive personal financial transactions, balances, and investment records, no client request is trusted without cryptographic verification.

The security model is founded on five defense-in-depth layers:

1. **Cryptographic Identity Verification:** Authentication is backed by Supabase Auth (or OIDC/OAuth2 providers) issuing signed asymmetric JSON Web Tokens (JWTs).
2. **Database-Level Isolation (Row Level Security):** All database queries are filtered by PostgreSQL's kernel-level Row Level Security engine (`auth.uid() = user_id`). Even if a compromised client attempts to request another user's UUID, PostgreSQL returns 0 rows.
3. **Prevention of Tenant Spoofing:** Mutation policies (`INSERT`, `UPDATE`) explicitly declare `WITH CHECK (auth.uid() = user_id)` preventing an authenticated user from inserting or updating records under another user's identifier.
4. **Service Role Key Isolation:** The Supabase `service_role` secret key is strictly barred from client-side code, bundles, or git repositories. The client application utilizes solely the public `anon` key.
5. **Data Minimization & Masking:** Account numbers are stored and transmitted in masked format (e.g., `•••• 4092`). Sensitive credentials and API tokens are never persisted in plaintext.

---

## 2. Row Level Security (RLS) Policy Specifications

Project FINN enforces explicit, granular policies on all 17 tables in `00002_cloud_architecture_schema.sql`.

### 2.1 The RLS Principle: Separation of `USING` and `WITH CHECK`
A common vulnerability in naive Supabase setups is using `FOR ALL USING (auth.uid() = user_id)` without a `WITH CHECK` clause. Project FINN enforces strict separation:

| Command | Clause | Purpose | FINN Enforcement |
| :--- | :--- | :--- | :--- |
| **SELECT** | `USING` | Determines which existing rows can be read. | `auth.uid() = user_id` |
| **INSERT** | `WITH CHECK` | Determines if a newly created row is valid. | `auth.uid() = user_id` |
| **UPDATE** | `USING` & `WITH CHECK` | Verifies both the old row can be modified and new values belong to the user. | `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` |
| **DELETE** | `USING` | Verifies the row to be deleted belongs to the caller. | `auth.uid() = user_id` |

### 2.2 Table Policy Matrix

| Table Name | SELECT Policy | INSERT Policy | UPDATE Policy | DELETE Policy |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` | `auth.uid() = id` |
| `accounts` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `transactions` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `categories` | `user_id IS NULL OR auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `budgets` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `investments` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `investment_transactions` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `savings_goals` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `goal_contributions` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `bill_groups` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `bill_splits` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `bill_settlements` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `user_preferences` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `exchange_rates` | `TRUE` (Public Read) | `FALSE` (Admin Only) | `FALSE` (Admin Only) | `FALSE` (Admin Only) |
| `bank_connections` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `audit_logs` | `auth.uid() = user_id` | `auth.uid() = user_id` | `FALSE` (Immutable) | `FALSE` (Immutable) |

---

## 3. Client Secret Isolation & Public Anon Keys

```mermaid
graph TD
    subgraph Client Application (Browser)
        Vite[Vite Bundler / React App]
        AnonKey[VITE_SUPABASE_ANON_KEY (Public Key)]
        UserJWT[User Access Token (JWT)]
    end

    subgraph Supabase API Gateway (PostgREST)
        Kong[API Gateway / Kong]
        JWTAuth[JWT Verifier & Claims Extractor]
    end

    subgraph Secure Backend & DB
        Postgres[(PostgreSQL 15+)]
        RLSEngine[RLS Engine: auth.uid()]
        ServiceKey[SUPABASE_SERVICE_ROLE_KEY\n(Private Server-Only Secret)]
    end

    Vite -->|Transmits Anon Key + User JWT| Kong
    Kong --> JWTAuth
    JWTAuth -->|Passes verified auth.uid()| RLSEngine
    RLSEngine --> Postgres
    ServiceKey -.->|Bypasses RLS (Never Exposed to Client)| Postgres
```

### Security Rule:
- The `SUPABASE_SERVICE_ROLE_KEY` has superuser bypass privileges and must **NEVER** be prefixed with `VITE_` or bundled in frontend client builds.
- The FINN repository contains zero references to `service_role` keys in client-side code.

---

## 4. Verification & Automated Test Evidence

Automated test suite `src/test/cloudArchitectureAndMigration.test.ts` validates tenant isolation:

1. **Tenant Cross-Read Prevention:** Confirms that Tenant A attempting to read Tenant B's accounts receives 0 records.
2. **Tenant Spoofing Prevention:** Confirms that Tenant A attempting to insert or update a transaction with Tenant B's UUID is rejected.
3. **Data Erasure Isolation:** Confirms that `clearUserData(Tenant A)` cleans all Tenant A tables without modifying any rows belonging to Tenant B.

```typescript
// Verified in cloudArchitectureAndMigration.test.ts
const aliceUid = 'uuid_user_alice_001';
const bobUid = 'uuid_user_bob_002';

const aliceReadBob = simulatePostgresRLS(aliceUid, 'SELECT', bobUid);
expect(aliceReadBob.allowed).toBe(false);
expect(aliceReadBob.violation).toContain('RLS Policy Violation');
```

---

## 5. Security Status Matrix

| Security Feature | Specification | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **Row Level Security (RLS)** | Kernel-level Postgres isolation | `Prepared` | `00002_cloud_architecture_schema.sql` |
| **WITH CHECK Tenant Guards** | Anti-spoofing insertion guards | `Prepared` | Migration 00002 lines 39, 71, 96, etc. |
| **Service Role Key Shielding** | Secret key absent from frontend | `Implemented` | Verified in codebase audit |
| **Masked Sensitive Attributes** | Account masks & no raw PII | `Implemented` | Verified in `Account` type & tests |
| **Immutable Audit Logging** | Tamper-proof audit logs table | `Prepared` | Table 17 in migration 00002 |
| **Live JWT Token Verification** | Supabase Auth server exchange | `Blocked` | Awaiting live Supabase instance keys |
