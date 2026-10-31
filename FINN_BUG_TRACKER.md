# FINN BUG TRACKER — INDEPENDENT QA DEPARTMENT

**Status Dictionary**:
- `FIXED AND VERIFIED`: Root cause identified, code repaired, and confirmed by passing automated regression tests.
- `BLOCKED`: Blocked by external third-party credential/sandbox provider requirement (never marked passed).
- `OPEN`: Known defect pending resolution.

---

| Bug ID | Severity | Category | Description | Root Cause | Fix Applied | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | High | Dashboard | Dashboard cash flow and category charts were disconnected from live ledger updates, showing static mock slices. | Charts were not bound to dynamic aggregations of `transactions` state in `FinanceContext`. | Replaced static data in `IncomeExpenseChart` and `SpendingBreakdownChart` with reactive `useMemo` hooks (`monthlyCashFlow` and `categorySpending`) tied to double-entry transactions. | **FIXED AND VERIFIED** |
| **BUG-002** | Critical | Multi-Tenant Auth | New registered users were initialized with demonstration data rather than a clean slate workspace. | `loadSavedData` fell back to `INITIAL_*` demo fixtures whenever a user had no existing localStorage keys, regardless of identity. | Guarded demo fixtures strictly to `usr_demo`/`demo`. Non-demo registered accounts receive clean empty arrays (`[]`). | **FIXED AND VERIFIED** |
| **BUG-003** | High | User Switching | Direct profile switching was missing from the UI, requiring manual credentials reentry each time. | `AuthModal` only offered login/register modes and lacked persistent client profile selector. | Implemented `registeredUsers` discovery and `switchUserDirectly(userId)` in `AuthService` and `AuthModal`. | **FIXED AND VERIFIED** |
| **BUG-004** | Medium | Dashboard UX | Attention required banner and budget velocity header contained hardcoded static timestamps (e.g. "Day 29 of 31"). | Date metadata in `DashboardView` used hardcoded string constants. | Dynamically computed calendar pacing: `new Date().getDate()` against days in month. | **FIXED AND VERIFIED** |
| **BUG-005** | Medium | Accounts | Positive credit card balances were treated as liabilities/debt rather than surplus liquidity. | `metrics` calculated debt as `Math.abs(creditAccount.balance)` blindly. | Differentiated negative credit balances (debt) from positive credit balances (liquid overpayment asset). | **FIXED AND VERIFIED** |
| **BUG-006** | Medium | Double-Entry Transfers | Internal transfers and investment contributions lacked destination account reflection in balance reversals. | `updateTransaction` and `deleteTransaction` only updated the source account balance. | Added destination account reversal logic for both `transfer` and `investment_contribution`. | **FIXED AND VERIFIED** |
| **BUG-007** | Low | Math / Environment | JSDOM test runner failed on `window.matchMedia` during theme initialization. | `window.matchMedia` is undefined in JSDOM environment. | Added defensive guard in `FinanceContext` and mocked `window.matchMedia` in `src/test/setup.ts`. | **FIXED AND VERIFIED** |
| **BUG-008** | High | Security / CSV | CSV Statement export was susceptible to Formula Injection in spreadsheet tools. | Merchant and description values with leading `=`, `+`, `-`, `@` were unescaped. | Enforced `sanitizeCsvCell` prepending `'` to neutralize formula execution in Excel/Sheets. | **FIXED AND VERIFIED** |
| **BUG-009** | Blocker | External API | Live RBI Account Aggregator direct bank scraping is not connectable without production NBFC-AA license. | Consumer apps (GPay/PhonePe) have no open APIs; RBI AA requires licensed FIU gateway tokens. | Implemented `MockAccountAggregatorAdapter` for offline sandboxing; marked live provider as BLOCKED. | **BLOCKED (By Design)** |
