# FINN QA BASELINE REPORT
**Date**: 2026-10-31  
**Auditor**: Independent Fintech Quality Assurance Department  
**Commit Baseline**: `a7c7182` (+ local repairs)  
**Environment**: Windows 11, Node.js v20+, Vite 6, React 19, TypeScript 5.7.3, Vitest 5.0.5  

---

## 1. Baseline Inspection Summary

| Inspection Item | Status / Metric | Details |
| :--- | :--- | :--- |
| **Source Tree** | Clean & Standard | `src/` modular structure with context, views, components, and utils |
| **Package Manifest** | Consistent | 19 runtime & dev dependencies; zero orphaned packages |
| **TypeScript Validation** | **PASS (0 errors)** | `npx tsc --noEmit` exited with code 0 |
| **Production Build** | **PASS** | `dist/assets/index-ydmCb3Md.js` (442.50 kB │ gzip: 120.47 kB) |
| **Automated Tests** | **78 Passing (12 test suites)** | 100% passing rate across all unit and integration suites |
| **Runtime Architecture** | Local Storage + Client Simulation | Deterministic local persistence; Supabase schema prepared in `supabase/migrations/` |

---

## 2. Test Execution Baseline

```
 RUN  v5.0.5 C:/Users/chana/Desktop/Finn

 ✓ src/test/splitCalculator.test.ts (4 tests) 4ms
 ✓ src/test/currency.test.ts (4 tests) 4ms
 ✓ src/test/investmentCalculator.test.ts (4 tests) 5ms
 ✓ src/test/financialCalculations.test.ts (4 tests) 4ms
 ✓ src/test/statementParser.test.ts (3 tests) 4ms
 ✓ src/test/fireCalculator.test.ts (4 tests) 3ms
 ✓ src/test/integrationEdgeCases.test.ts (3 tests) 5ms
 ✓ src/test/persistenceAndSession.test.ts (5 tests) 10ms
 ✓ src/test/securityAndAuth.test.ts (4 tests) 15ms
 ✓ src/test/comprehensiveRegression.test.ts (29 tests) 87ms
 ✓ src/test/userSwitchingAndIsolation.test.tsx (5 tests) 43ms
 ✓ src/test/dashboardReactivity.test.tsx (9 tests) 52ms

 Test Files  12 passed (12)
      Tests  78 passed (78)
   Duration  6.50s
```

---

## 3. Known Issues & Audit Items Identified for Deep QA

1. **Dashboard Dynamic Coupling**: Fixed in latest changes (`monthlyCashFlow` and `categorySpending` now derive directly from active `transactions` rather than mock fixtures).
2. **User Switching Isolation**: Verified via `src/test/userSwitchingAndIsolation.test.tsx` (real user isolation from demo fixtures).
3. **Double-Entry Balance Updates**: Accounting for internal transfers, investment contributions, and refunds without inflating income/expense tallies.
4. **Odd-Paise Splitting Conservation**: Validated with exact penny math preventing fractional loss.
