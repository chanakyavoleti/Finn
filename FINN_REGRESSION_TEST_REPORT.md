# FINN REGRESSION TEST REPORT

**Standard**: Continuous Integration & Regression Verification  
**Date**: 2026-10-31  
**Runner**: Vitest v5.0.5  
**Total Test Files**: 13  
**Total Executed Tests**: 92  
**Passing**: 92  
**Failing**: 0  
**Flaky Tests**: 0  

---

## 1. Test Suite Execution Breakdown

| Suite Path | Test Count | Duration | Status | Primary Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `src/test/currency.test.ts` | 4 | 4ms | **PASS** | Double-entry decimal arithmetic, IEEE-754 precision |
| `src/test/financialCalculations.test.ts` | 4 | 5ms | **PASS** | Net worth aggregation, credit card liabilities |
| `src/test/fireCalculator.test.ts` | 4 | 4ms | **PASS** | Nominal vs real compounding inflation, Indian CPI |
| `src/test/investmentCalculator.test.ts` | 4 | 4ms | **PASS** | Finance Act 2024 LTCG (12.5% > ₹1.25L), STCG (20%) |
| `src/test/splitCalculator.test.ts` | 4 | 6ms | **PASS** | Odd-paise remainder allocation, zero penny leak |
| `src/test/statementParser.test.ts` | 3 | 5ms | **PASS** | HDFC, ICICI, SBI statement regex and column mapping |
| `src/test/securityAndAuth.test.ts` | 4 | 6ms | **PASS** | Row-Level Security checks, password length validation |
| `src/test/integrationEdgeCases.test.ts` | 3 | 6ms | **PASS** | Malformed CSV resilience, Setu AA adapter double |
| `src/test/persistenceAndSession.test.ts` | 5 | 8ms | **PASS** | Storage round-trips, double-entry reversal on delete |
| `src/test/dashboardReactivity.test.tsx` | 9 | 65ms | **PASS** | Live reactivity, dynamic charts, CSV balance sync |
| `src/test/userSwitchingAndIsolation.test.tsx` | 5 | 43ms | **PASS** | Multi-tenant isolation, clean slate for new users |
| `src/test/comprehensiveRegression.test.ts` | 29 | 87ms | **PASS** | Indian FY boundaries, overdrafts, injection security |
| `src/test/qaProtocolSuite.test.tsx` | 14 | 70ms | **PASS** | Strict Protocol TC-001 - TC-215 validation matrix |

---

## 2. Regression Coverage for Discovered Bugs

1. **BUG-001 (Dashboard Live Reactivity)**:
   * Covered in `dashboardReactivity.test.tsx` ("updates totalExpenses, liquidCash, and netSavings immediately when recording an expense").
   * Asserts exact decimal changes in `metrics`, `monthlyCashFlow`, and `categorySpending`.

2. **BUG-002 (Demo Leakage in New Registrations)**:
   * Covered in `userSwitchingAndIsolation.test.tsx` ("guarantees clean isolated workspace with 0 demo leakage when new user registers").
   * Confirms `accounts.length === 0` and `metrics.totalNetWorth === 0`.

3. **BUG-003 (Direct Profile Switching)**:
   * Covered in `userSwitchingAndIsolation.test.tsx` ("completely isolates financial records between User A and User B without cross-contamination").
   * Confirms alternating user sessions maintains 100% record integrity without data leakage.

4. **BUG-005 (Credit Card Positive Balance Asset Handling)**:
   * Covered in `dashboardReactivity.test.tsx` ("handles credit card positive balance as liquid asset rather than debt").
   * Asserts that overpayments are treated as cash assets rather than liabilities.

5. **BUG-006 (Transfer Balance Reversal)**:
   * Covered in `dashboardReactivity.test.tsx` ("internal transfers do not inflate income or expenses, and preserve total net worth").
   * Asserts both source and destination account balances revert accurately upon transaction deletion or modification.

6. **BUG-008 (CSV Formula Injection Protection)**:
   * Covered in `qaProtocolSuite.test.tsx` ("Prevents CSV Formula Injection attacks").
   * Validates `=`, `+`, `-`, `@`, `\t` prefixes are escaped with `'`.
