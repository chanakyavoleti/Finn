# FINN — SECURITY ARCHITECTURE & LIMITATIONS AUDIT REPORT

**Date:** October 31, 2026  
**Auditor:** Principal Application Security Tester & Fintech Systems Architect  
**Scope:** Client Authentication Architecture, Storage Threat Modeling, Cross-Tenant Isolation, and Defense Limitations  
**Classification:** Technical Security Advisory & Pre-Production Hardening Blueprint

---

## 1. ARCHITECTURAL SECURITY TIERS

To prevent false security assumptions, FINN's security model must be analyzed across **four distinct architectural tiers**:

```
+-------------------------------------------------------------------------+
| Tier 1: Local Workspace Separation (Client Logical Key Namespaces)      |
+-------------------------------------------------------------------------+
| Tier 2: Application-Level Authentication (AuthService / Client Sessions) |
+-------------------------------------------------------------------------+
| Tier 3: Server-Enforced Authorization (Database Engine & RLS Policies)  |
+-------------------------------------------------------------------------+
| Tier 4: Cloud Identity & Cryptographic Authentication (OAuth / JWT)     |
+-------------------------------------------------------------------------+
```

### Tier 1: Local Workspace Separation
* **Mechanism:** Data entities are partitioned by user ID in `localStorage` keys (`finn_accounts_${userId}`, `finn_transactions_${userId}`, `finn_budgets_${userId}`, `finn_holdings_${userId}`).
* **Security Level:** **Logical segregation only**.
* **Effectiveness:** Highly effective at preventing accidental data leakage between distinct user profiles (e.g. switching between User Alpha and User Beta during standard UI usage).
* **Limitation:** Offers **zero protection** against an attacker with DevTools access, browser extension permissions, or malicious JavaScript executing within the same origin.

### Tier 2: Application-Level Authentication
* **Mechanism:** Implemented in `src/auth/authService.ts`. Manages user registration, session tokens, password hashing simulations (`hashPassword`), and token expiry timers (7 days).
* **Security Level:** **Client-side runtime enforcement**.
* **Effectiveness:** Enforces login gates, redirects unauthenticated users to the AuthModal, validates minimum password lengths (8 characters), and prevents duplicate email registration.
* **Limitation:** The session token (`jwt_...`) is generated client-side using pseudo-random numbers and is **not cryptographically signed** with an asymmetric private key (RS256).

### Tier 3: Server-Enforced Authorization
* **Mechanism:** Defined in `supabase/migrations/` via PostgreSQL Row Level Security (RLS) policies.
* **Security Level:** **Institutional-grade cryptographic boundary**.
* **Effectiveness:** Enforces `auth.uid() = user_id` for all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` queries at the database engine kernel level. Even if client code is completely compromised, PostgreSQL blocks cross-tenant access.
* **Status in Current Offline Mode:** Prepared and verified via SQL migrations, but inactive while the client operates in local-first `localStorage` mode.

### Tier 4: Cloud Identity Authentication
* **Mechanism:** Integration with Supabase GoTrue / Auth0 for OAuth2 / OpenID Connect tokens.
* **Status:** Requires live Supabase deployment with HTTPS endpoints.

---

## 2. LOCALSTORAGE THREAT MODELING & ATTACK ATTEMPTS

The auditor conducted targeted attacks against the client-side storage architecture (`src/test/authLocalStorageSecurity.test.ts`):

### Attack Vector 1: Arbitrary LocalStorage Mutation
* **Test:** An attacker or malicious browser script modifies the stored account balance from ₹50,000 to ₹99,99,99,999 in `localStorage`.
* **Finding:** The application re-hydrates the tampered balance into memory upon page load.
* **Security Risk:** **HIGH** if deployed in shared or untrusted browser environments. `localStorage` has no integrity checks (e.g. HMAC signatures).

### Attack Vector 2: Client Session Forgery
* **Test:** An attacker crafts a forged session object in `finn_auth_session` containing `user.id: "usr_victim"`.
* **Finding:** In local-only mode, `AuthService.getSession()` accepts the forged session because there is no server-side signature verification key.
* **Security Risk:** **HIGH** for shared devices. Client-side authentication cannot resist local identity spoofing without server verification.

### Attack Vector 3: Cross-Site Scripting (XSS) Token Exfiltration
* **Threat:** Any script injected into the web application origin has complete access to `window.localStorage`.
* **Mitigation Verified in FINN:**
  - Strict React JSX escaping prevents raw HTML injection in transaction descriptions, merchants, and account names.
  - CSV exports sanitize formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) via `sanitizeCsvCell` in `src/utils/currency.ts`.
  - Content Security Policy (CSP) must be configured on the production web server to disable `unsafe-inline` scripts.

### Attack Vector 4: Browser History & "Back Button" After Logout
* **Test:** User logs out via `AuthService.logout()`. User navigates Back using browser history.
* **Finding:** `AuthService.logout()` deletes `finn_auth_session` and sets active state to `guest` (0 accounts, 0 transactions). However, if the browser serves a rendered page from bfcache (Back-Forward Cache), visual state might briefly appear before JavaScript executes.
* **Mitigation:** Production web server must send `Cache-Control: no-store, no-cache, must-revalidate` HTTP headers for all authenticated HTML documents.

### Attack Vector 5: Multi-Tab Storage Race Conditions
* **Test:** User opens two browser tabs. Tab 1 switches to User A; Tab 2 performs transactions as User B.
* **Finding:** Because `localStorage` changes dispatch a `storage` event across tabs, concurrent edits without tab-level synchronization can cause one tab to read state committed by the other.
* **Mitigation:** Implemented `activeUidRef` in `FinanceContext.tsx` to ensure all writes verify the active user ID matches the current runtime ref before writing.

---

## 3. WHAT IS PREVENTED VS. WHAT REMAINS POSSIBLE

| Attack Scenario | Status | Mechanism |
|---|---|---|
| Plaintext password stored on disk | **PREVENTED** | `AuthService` stores deterministic hashes (`hsh_...`). |
| Duplicate email registrations | **PREVENTED** | `AuthService.register()` enforces unique email validation. |
| Expired session token re-use | **PREVENTED** | `AuthService.getSession()` automatically purges expired sessions. |
| CSV Formula Injection in Excel | **PREVENTED** | `sanitizeCsvCell()` prefixes `=, +, -, @` with single quotes. |
| XSS via Transaction Merchant strings | **PREVENTED** | Escaped through React virtual DOM text nodes. |
| Cross-tenant data bleed in normal UI usage | **PREVENTED** | Strict workspace partitioning (`finn_accounts_${uid}`). |
| Attacker with DevTools modifying local balances | **POSSIBLE** | Unencrypted `localStorage` (requires server-side PostgreSQL). |
| Cross-site script reading `localStorage` | **POSSIBLE** | Inherent to `localStorage` Web API (requires HttpOnly cookies). |
| Forged local session without server key | **POSSIBLE** | Client-only mock JWT (requires Supabase Auth with RS256 JWTs). |

---

## 4. PRE-PRODUCTION SECURITY ROADMAP

To transition FINN from its current local-first development mode to institutional banking production:

1. **Migrate Authentication to HttpOnly Cookies**:
   - Store session tokens in `Set-Cookie: session_token=...; HttpOnly; Secure; SameSite=Strict`.
   - Completely remove session tokens and sensitive balance records from `localStorage`.
2. **Deploy Supabase Cloud with PostgreSQL RLS**:
   - Transition state persistence from browser storage to the verified Supabase schema (`supabase/migrations/`).
   - Enforce database-level Row Level Security where PostgreSQL validates the user's cryptographically signed JWT on every query.
3. **Configure Strict Content Security Policy (CSP)**:
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.sandbox.setu.co; frame-ancestors 'none';
   ```
4. **Implement Cryptographic Local Storage Encryption (Optional for Offline-First PWA)**:
   - If offline-first persistence is retained, encrypt cached payloads using the Web Crypto API (`AES-GCM-256`) with a key derived from the user's password via PBKDF2.
