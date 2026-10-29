# FINN Automated Testing Strategy & Verification Guide

This document details the automated testing philosophy, test suite coverage, and execution instructions for the FINN personal finance platform.

---

## 1. Test Philosophy & Zero-Tolerance Policies

In financial technology software, calculation errors and precision discrepancies are critical defects. FINN enforces:
1. **Zero Floating-Point Drift**: Verification that decimal rounding never leaks or creates fractional pennies.
2. **Double-Entry Balance Invariance**: Inflow and outflow figures must not drift when inter-account transfers occur.
3. **Regulatory Accuracy**: Capital gains calculations must comply exactly with statutory Indian tax formulas (Finance Act 2024).
4. **Data Isolation**: Unit tests verify that tenant datasets cannot be cross-queried.

---

## 2. Test Suite Breakdown

FINN's automated test suite is powered by **Vitest 5.0.5**. All 27 automated tests run and pass cleanly:

| Test File | Tests | Core Coverage & Verification Assertions |
| :--- | :---: | :--- |
| [`src/test/currency.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/currency.test.ts) | 4 | Integer paise arithmetic, Lakhs/Crores formatting, USD/EUR multi-currency formatting, CSV Formula Injection sanitization (`=cmd\|...`) |
| [`src/test/financialCalculations.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/financialCalculations.test.ts) | 4 | Double-entry transfer neutrality (inflows/outflows untouched), refund offsetting against expenses, net savings rate ratio, net worth summation across asset types |
| [`src/test/investmentCalculator.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/investmentCalculator.test.ts) | 4 | Weighted-average cost basis tracking, partial sale lot calculation, Indian Equity STCG (@ 20%), Indian Equity LTCG (@ 12.5% over ₹1.25L exemption) |
| [`src/test/fireCalculator.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/fireCalculator.test.ts) | 4 | Safe Withdrawal Rate target corpus (3.5% vs 4.0%), real vs. nominal compounding, multi-scenario sensitivity models (Base, Conservative, Accelerated), edge case handling (0% returns) |
| [`src/test/splitCalculator.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/splitCalculator.test.ts) | 4 | Equal split paise remainder allocation (e.g. ₹100 / 3 = ₹33.34 + ₹33.33 + ₹33.33 = exactly ₹100.00), sum preservation across 7+ participants, custom allocation validation, discrepancy detection |
| [`src/test/statementParser.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/statementParser.test.ts) | 3 | Indian bank statement parsing for **HDFC Bank**, **State Bank of India (SBI)**, and **ICICI Bank**; UPI VPA and reference number extraction; cryptographic duplicate detection |
| [`src/test/securityAndAuth.test.ts`](file:///c:/Users/chana/Desktop/Finn/src/test/securityAndAuth.test.ts) | 4 | Multi-user session token verification, cross-tenant isolation enforcement, session expiration checking, unauthorized account mutation rejection |

**Total Coverage: 7 test files, 27 tests, 100% pass rate.**

---

## 3. Running the Tests

### Single Run
Execute the complete test suite:
```bash
npm run test
```

### Interactive Watch Mode
To run tests continuously during local development:
```bash
npx vitest
```

### Specific Suite Execution
To run an individual test suite (e.g., FIRE Calculator tests):
```bash
npx vitest run src/test/fireCalculator.test.ts
```

### Coverage Report Generation
To generate code coverage metrics:
```bash
npx vitest run --coverage
```

---

## 4. Continuous Integration (CI) Pipeline Integration

In CI environments (e.g. GitHub Actions, GitLab CI), tests run prior to build verification:

```yaml
name: FINN CI Quality Gate
on: [push, pull_request]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Verify Types
        run: npx tsc --noEmit
      - name: Execute Automated Financial Test Suite
        run: npm run test
      - name: Build Production Distribution
        run: npm run build
```
