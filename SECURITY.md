# FINN Security Architecture & Threat Mitigation Model

This document outlines the security controls, data isolation policies, encryption standards, and threat mitigation practices implemented across FINN.

---

## 1. Authentication & Session Architecture

- **Token-Based User Identity**: Authenticated sessions are governed by cryptographically signed JWTs issued by the identity provider.
- **Session Expiration**: Client sessions enforce automatic token refresh and inactivity timeouts.
- **Multi-Tenant Authorization**: All data queries must pass tenant authorization filters. Under no circumstances can a user query, modify, or infer another user's financial data.
- **Role Separation**: Administrative service-role keys (`SUPABASE_SERVICE_ROLE_KEY`) are prohibited in frontend build artifacts and browser runtime memory.

---

## 2. Row Level Security (RLS) Enforcement

Database security is enforced at the PostgreSQL engine level, not merely in application routing:
- **Default Deny**: Tables are created with `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`. Queries without explicit matching policies return 0 records.
- **Strict User Scope**: All policies verify that the executing connection's identity matches the record:
  ```sql
  CREATE POLICY "User Tenant Isolation" ON accounts
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  ```
- **Cascading Constraints**: Deleting a user cascade-clears all dependent financial ledgers, audit events, and cached assets.

---

## 3. CSV Formula Injection (Spreadsheet Formula Injection) Mitigation

When users export or import transaction files (CSV / Excel format), malicious payloads can execute arbitrary code if cell values begin with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`).

FINN enforces deterministic sanitization before saving or exporting text fields (`src/utils/currency.ts`):
```typescript
export function sanitizeForCsvExport(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some(prefix => trimmed.startsWith(prefix))) {
    return `'${trimmed}`; // Prepend single quote to neutralize executable cell formula
  }
  return trimmed;
}
```

---

## 4. RBI Account Aggregator (AA) Data Blindness & Encryption

In accordance with Reserve Bank of India (RBI) NBFC-AA master directions:
- **Data Blind Architecture**: Account Aggregators do not store, view, or decrypt user financial data. They act strictly as encrypted consent conduits.
- **End-to-End Encryption**:
  - Financial data payloads transferred from Financial Information Providers (FIPs e.g., HDFC, SBI) to Financial Information Users (FIUs) are encrypted using ephemeral Diffie-Hellman (ECDH) key exchanges and AES-256-GCM symmetric encryption.
  - Decryption keys are held strictly by the certified FIU backend service; no cleartext financial information touches untrusted intermediary proxies.
- **Granular Consent Artifacts**: Consents define precise data ranges, fetch frequencies, purpose codes, and explicit expiry dates, and can be revoked by the user at any moment.

---

## 5. Input Validation & Defense-in-Depth

- **Client & Server Schema Validation**: Form submissions are validated using strict Zod schemas to reject unexpected fields, script tags, or non-numeric inputs.
- **Content Security Policy (CSP)**:
  - Disallows unsafe inline scripts.
  - Limits frame ancestors (`frame-ancestors 'none'`) to prevent clickjacking.
  - Disallows loading remote scripts from unauthorized CDNs.
- **XSS & DOM Protection**: All string outputs in React views are auto-escaped. Dangerous HTML embedding (`dangerouslySetInnerHTML`) is strictly banned throughout the codebase.
- **Integer Arithmetic Isolation**: All financial arithmetic uses integer base units (`paise = Math.round(amount * 100)`) preventing integer overflow and precision drift.

---

## 6. Security Audit Checklist for Production Deployment

- [x] Environment variable check: Ensure `.env` is in `.gitignore`.
- [x] RLS verified: Verify no tables exist without enabled RLS.
- [x] Secret separation: Ensure no private keys exist in `VITE_` public variables.
- [x] Automated test coverage: Security and authorization unit tests pass cleanly (`npm run test`).
- [x] CSV injection sanitized: All exported cell strings sanitized against formula execution.
