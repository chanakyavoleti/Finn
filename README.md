# FINN — Intelligent Personal Finance & Wealth Management Platform

FINN is a production-grade, privacy-first personal finance and wealth intelligence platform engineered for high precision, data clarity, and financial serenity. Built specifically with native support for the Indian financial ecosystem (INR `₹`, Lakhs/Crores formatting, Indian Financial Year `Apr 1 – Mar 31`, and UPI transactions) alongside international multi-currency agility.

---

## 1. Product Philosophy & Design Directives

FINN adheres strictly to the **FINN Design Directive**:
- **Trust & Precision**: Every financial figure is computed using exact integer cents/paise arithmetic, preventing IEEE-754 binary floating-point drift.
- **Understated Visual Hierarchy**: Clean warm neutrals, deep forest green accents, slate borders, and tabular numerals (`font-feature-settings: 'tnum'`).
- **No Decorative AI Fluff**: Completely avoids purple/blue neon gradient cards, arbitrary floating shapes, meaningless charts, and generic robot badges. Every screen directly answers key financial questions.

---

## 2. Core Capabilities & Architecture

### A. The 7-Question Executive Dashboard
Directly answers the fundamental questions of personal wealth in a single coherent view:
1. **How much money do I have?** (Consolidated Net Worth across bank accounts, demat portfolios, EPF/PPF, and cold reserves).
2. **How much did I earn?** (Net monthly and FY inflows, excluding inter-account transfers).
3. **How much did I spend?** (Categorical disbursements with linked refund subtractions).
4. **How much did I save?** (Net savings surplus and savings rate ratio).
5. **Where is my money going?** (Categorical breakdowns and merchant velocity).
6. **Am I staying within budget?** (Dynamic monthly pacing indicator comparing day-of-month progress against budget burn rate).
7. **What requires my attention?** (Pending shared bills, budget overruns, and tax milestone deadlines).

### B. Double-Entry Accounting & Ledger Precision
- **Integer Paise Representation**: All internal arithmetic operates in base units (`paise = Math.round(amount * 100)`).
- **Transfer Neutrality**: Account-to-account transfers and investment contributions adjust individual balances without falsely inflating cash inflows or outflows.
- **Refund Offsetting**: Linked refunds deduct from the original expense line rather than artificially inflating earned income.
- **Indian Payment Workflows**: First-class tracking for UPI VPAs (`name@okhdfcbank`), 12-digit UTR references, IMPS/NEFT, and RuPay credit cards.

### C. Indian Capital Gains Tax & Investment Portfolio
- **Weighted-Average Cost Basis**: Authoritative calculation of cost basis through lot purchases and partial sales.
- **Finance Act 2024 Tax Engine**:
  - **Equity STCG**: Calculated at **20.0%**.
  - **Equity LTCG**: Calculated at **12.5%** for gains exceeding the **₹1,25,000** annual exemption limit.
- **Multi-Asset Allocation**: Tracks NSE/BSE equities, mutual funds, sovereign gold bonds (SGB), fixed deposits, US equities, and cold-storage crypto.

### D. FIRE (Financial Independence, Retire Early) Engine
- Computes target corpus using Safe Withdrawal Rate (SWR, typically 3.5%–4.0%).
- Real vs. Nominal compounding adjusted for annual inflation (6.0% default for India).
- Multi-scenario sensitivity projections: Base Case, Conservative (-2.0% returns), and Accelerated (+2.0% returns).

### E. Remainder-Proof Bill Splitting
- Implements deterministic remainder paise distribution (`totalPaise % count`) so splits sum to the exact bill amount without orphan fractional cents.
- Group balance ledger with one-click balance settlements.

### F. Bank Statement Parsing & RBI Account Aggregator (AA)
- **Supported Bank Formats**: Ingests official CSV statements from **HDFC Bank**, **State Bank of India (SBI)**, **ICICI Bank**, and generic CSVs.
- **Duplicate Detection**: Computes cryptographic transaction signatures (`hash(date, amount, type, normalizedDesc)`) to prevent duplicate record insertion.
- **Account Aggregator Protocol**: Complete architectural integration layer for RBI NBFC-AA consent workflows (FIP discovery, FIU data requests, and encrypted financial information fetching).

### G. Contextual Financial Intelligence (AI Advisor)
- Runs scenario stress tests (e.g. *What happens to my emergency buffer if income ceases for 4 months?*).
- Discretionary affordability evaluations based on unallocated budget headroom.
- Fallback heuristic rules guarantee analytical answers even without external API connectivity.

---

## 3. Technology Stack

- **Frontend Core**: React 19, TypeScript (strict mode), Vite 6.
- **Styling**: Tailwind CSS v4, Lucide Icons, custom design token palette.
- **Visualization**: Recharts for responsive, accessible financial charting.
- **Testing**: Vitest 5 with 100% test pass rate across 7 calculation, parser, and security suites.
- **Database Architecture**: PostgreSQL / Supabase schema with Row Level Security (RLS) policies, NUMERIC(15,2) decimal precision, and foreign key cascades (`supabase/migrations/00001_initial_schema.sql`).

---

## 4. Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/finn.git
cd finn

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Running Locally
```bash
# Start development server
npm run dev
# The application will be live at http://localhost:5173/
```

### Running the Automated Test Suite
```bash
# Run Vitest test suites
npm run test
```

### Production Build
```bash
# Typecheck and build optimized distribution
npm run build
```

---

## 5. Repository Documentation Index

| Document | Purpose |
| :--- | :--- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Layered architecture, data flows, and state management |
| [`DATABASE.md`](./DATABASE.md) | Relational schema, tables, constraints, and Supabase RLS |
| [`SECURITY.md`](./SECURITY.md) | Authentication, session protection, RLS, and CSV injection prevention |
| [`TESTING.md`](./TESTING.md) | Test suite breakdown, coverage guarantees, and execution instructions |
| [`INTEGRATIONS.md`](./INTEGRATIONS.md) | RBI Account Aggregator, bank parsers, exchange rates, and AI integrations |

---

## 6. License
Proprietary & Confidential — All rights reserved. Built for production deployment under FINN master development specifications.
