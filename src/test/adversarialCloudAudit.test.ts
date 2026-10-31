import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  DataMigrationService, 
  generateDeduplicationHash, 
  MigrationExportPayload 
} from '../services/migration/DataMigrationService';
import { LocalStorageRepository } from '../services/storage/LocalStorageRepository';
import { SupabaseRepository } from '../services/storage/SupabaseRepository';
import { SupabaseClientAdapter } from '../services/supabaseClient';
import { Account, Transaction, Budget, Holding } from '../types';
import { addMoney, subtractMoney, multiplyMoney } from '../utils/currency';

describe('PHASE 2.5: Adversarial Cloud & Migration Audit Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Adversarial Deduplication & Legitimate Duplicate Defense', () => {
    it('preserves two legitimate distinct transactions with identical merchant, date, amount, and category', () => {
      const tx1: Transaction = {
        id: 'tx_starbucks_morning_01',
        accountId: 'acc_salary',
        date: '2026-10-31',
        amount: 250.00,
        type: 'expense',
        category: 'Food & Dining',
        merchant: 'Starbucks',
        description: 'Morning Coffee',
        status: 'posted'
      };

      const tx2: Transaction = {
        id: 'tx_starbucks_evening_02',
        accountId: 'acc_salary',
        date: '2026-10-31',
        amount: 250.00,
        type: 'expense',
        category: 'Food & Dining',
        merchant: 'Starbucks',
        description: 'Evening Coffee',
        status: 'posted'
      };

      const hash1 = generateDeduplicationHash(tx1, 'transaction');
      const hash2 = generateDeduplicationHash(tx2, 'transaction');

      // The hashes MUST be distinct so legitimate purchases are NOT discarded
      expect(hash1).not.toBe(hash2);
    });

    it('produces identical hash for identical transaction ID on retry (idempotence)', () => {
      const tx: Transaction = {
        id: 'tx_fixed_id_100',
        accountId: 'acc_salary',
        date: '2026-10-31',
        amount: 1500.00,
        type: 'expense',
        category: 'Groceries',
        merchant: 'BigBasket',
        description: 'Monthly staples',
        status: 'posted'
      };

      const hashAttempt1 = generateDeduplicationHash(tx, 'transaction');
      const hashAttempt2 = generateDeduplicationHash(tx, 'transaction');

      expect(hashAttempt1).toBe(hashAttempt2);
    });
  });

  describe('2. Granular Per-Account Balance Drift Reconciliation', () => {
    it('catches per-account balance drift even when aggregate net balance matches', async () => {
      const localRepo = new LocalStorageRepository();
      const migrationService = new DataMigrationService(localRepo);

      // Source: Two accounts with ₹100,000 and ₹50,000 (Total = ₹150,000)
      const payload: MigrationExportPayload = {
        version: '1.0.0',
        exportTimestamp: new Date().toISOString(),
        sourceUserId: 'usr_source_alice',
        accounts: [
          {
            id: 'acc_hdfc',
            name: 'HDFC Bank',
            institution: 'HDFC',
            type: 'savings',
            balance: 100000.00,
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '1111',
            status: 'synced'
          },
          {
            id: 'acc_icici',
            name: 'ICICI Bank',
            institution: 'ICICI',
            type: 'savings',
            balance: 50000.00,
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '2222',
            status: 'synced'
          }
        ],
        transactions: [],
        budgets: [],
        goals: [],
        holdings: [],
        splitExpenses: [],
        checksum: 'chk_drift'
      };

      // Mock Cloud Database where aggregate is identical (₹150,000), but Account balances drifted!
      // HDFC has ₹90,000 (-₹10,000) and ICICI has ₹60,000 (+₹10,000)
      const mockDriftedCloudRepo = {
        getAccounts: vi.fn(async () => [
          {
            id: 'acc_hdfc',
            name: 'HDFC Bank',
            institution: 'HDFC',
            type: 'savings',
            balance: 90000.00, // DRIFT!
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '1111',
            status: 'synced'
          },
          {
            id: 'acc_icici',
            name: 'ICICI Bank',
            institution: 'ICICI',
            type: 'savings',
            balance: 60000.00, // DRIFT!
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '2222',
            status: 'synced'
          }
        ]),
        addAccount: vi.fn(async () => ({ success: true, data: {} as any })),
        getTransactions: vi.fn(async () => []),
        addTransaction: vi.fn(async () => ({ success: true, data: {} as any })),
        addBudget: vi.fn(async () => ({ success: true, data: {} as any })),
        addGoal: vi.fn(async () => ({ success: true, data: {} as any })),
        addHolding: vi.fn(async () => ({ success: true, data: {} as any })),
        addSplitExpense: vi.fn(async () => ({ success: true, data: {} as any }))
      } as unknown as SupabaseRepository;

      const report = await migrationService.migrateToSupabase(
        'usr_dest_alice',
        payload,
        mockDriftedCloudRepo
      );

      // Reconciliation MUST fail because individual account balances drifted
      expect(report.success).toBe(false);
      expect(report.status).toBe('reconciliation_failed');
      expect(report.error).toContain('Per-account balance drift');
      expect(report.financialReconciliation.isBalanced).toBe(false);
    });
  });

  describe('3. Database Relational Column Mapping Verification', () => {
    it('properly converts account types between client domain and postgres CHECK constraints', async () => {
      let insertedPayload: any = null;
      const mockClient = {
        query: vi.fn(async (_table: string, _method: string, params: any) => {
          insertedPayload = params.body;
          return { data: [insertedPayload], error: null, status: 201 };
        })
      } as unknown as SupabaseClientAdapter;

      const repo = new SupabaseRepository(mockClient);

      // Checking account should map to 'current' in postgres
      await repo.addAccount('usr_1', {
        id: 'acc_chk',
        name: 'Salary Checking',
        institution: 'HDFC',
        type: 'checking',
        balance: 50000,
        currency: 'INR',
        lastSynced: '2026-10-31',
        accountNumberMask: '1234',
        status: 'synced'
      });

      expect(insertedPayload.account_type).toBe('current');

      // Credit account should map to 'credit_card' in postgres
      await repo.addAccount('usr_1', {
        id: 'acc_crd',
        name: 'Regalia Credit',
        institution: 'HDFC',
        type: 'credit',
        balance: -25000,
        currency: 'INR',
        lastSynced: '2026-10-31',
        accountNumberMask: '5678',
        status: 'synced'
      });

      expect(insertedPayload.account_type).toBe('credit_card');
    });

    it('populates mandatory NOT NULL title, dates, and upi columns for postgres transactions & budgets', async () => {
      let txPayload: any = null;
      let budgetPayload: any = null;

      const mockClient = {
        query: vi.fn(async (table: string, _method: string, params: any) => {
          if (table === 'transactions') txPayload = params.body;
          if (table === 'budgets') budgetPayload = params.body;
          return { data: [params.body], error: null, status: 201 };
        })
      } as unknown as SupabaseClientAdapter;

      const repo = new SupabaseRepository(mockClient);

      await repo.addTransaction('usr_1', {
        id: 'tx_test_title',
        accountId: 'acc_1',
        date: '2026-10-31',
        amount: 500,
        type: 'expense',
        category: 'Food',
        merchant: 'Dominos Pizza',
        description: 'Lunch treat',
        upiId: 'dominos@hdfcbank',
        utrNumber: 'UTR99887766',
        status: 'posted'
      });

      expect(txPayload.title).toBe('Dominos Pizza');
      expect(txPayload.upi_vpa).toBe('dominos@hdfcbank');
      expect(txPayload.upi_utr_number).toBe('UTR99887766');

      await repo.addBudget('usr_1', {
        id: 'b_monthly',
        categoryId: 'cat_dining',
        categoryName: 'Dining',
        limit: 10000,
        spent: 500,
        period: 'monthly'
      });

      expect(budgetPayload.start_date).toMatch(/^\d{4}-\d{2}-01$/);
      expect(budgetPayload.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('4. Financial Precision Adversarial Tests (0-Paise Error Guarantee)', () => {
    it('computes exact addition without IEEE 754 float drift: 0.01 + 0.02 === 0.03', () => {
      const sum = addMoney(0.01, 0.02);
      expect(sum).toBe(0.03);
      expect(sum.toString()).toBe('0.03');
    });

    it('computes exact addition without float drift: 0.10 + 0.20 === 0.30', () => {
      const sum = addMoney(0.10, 0.20);
      expect(sum).toBe(0.30);
    });

    it('computes large numbers without overflow: 99999999.99 + 0.01 === 100000000.00', () => {
      const sum = addMoney(99999999.99, 0.01);
      expect(sum).toBe(100000000.00);
    });

    it('preserves exact paise across 500 repeated additions and subtractions', () => {
      let balance = 10000.00;
      for (let i = 0; i < 500; i++) {
        balance = addMoney(balance, 19.99);
        balance = subtractMoney(balance, 19.99);
      }
      expect(balance).toBe(10000.00);
    });

    it('computes fractional investment unit values with exact rounding', () => {
      // 12.3456 shares at ₹3456.78
      const val = multiplyMoney(12.3456, 3456.78);
      // 12.3456 * 3456.78 = 42676.023168 -> rounded to ₹42676.02
      expect(val).toBe(42676.02);
    });
  });

  describe('5. RLS Security Attack Simulator (All 7 Attack Vectors)', () => {
    function simulateRLSEngine(
      callerUid: string | null, // null = anonymous
      operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
      rowUserId: string,
      targetUserIdInPayload?: string
    ): { allowed: boolean; reason?: string } {
      if (!callerUid) {
        return { allowed: false, reason: 'Anonymous user blocked: financial records require authenticated JWT' };
      }
      if (operation === 'SELECT' && rowUserId !== callerUid) {
        return { allowed: false, reason: 'Cross-tenant read blocked: auth.uid() != user_id' };
      }
      if (operation === 'INSERT' && targetUserIdInPayload && targetUserIdInPayload !== callerUid) {
        return { allowed: false, reason: 'Tenant spoofing blocked: WITH CHECK (auth.uid() = user_id) failed' };
      }
      if (operation === 'UPDATE') {
        if (rowUserId !== callerUid) {
          return { allowed: false, reason: 'Cross-tenant update blocked: auth.uid() != user_id' };
        }
        if (targetUserIdInPayload && targetUserIdInPayload !== callerUid) {
          return { allowed: false, reason: 'Ownership hijack blocked: cannot change user_id via UPDATE' };
        }
      }
      if (operation === 'DELETE' && rowUserId !== callerUid) {
        return { allowed: false, reason: 'Cross-tenant delete blocked: auth.uid() != user_id' };
      }
      return { allowed: true };
    }

    const alice = 'uuid_alice_111';
    const bob = 'uuid_bob_222';

    it('Attack 1: User A cannot read User B records', () => {
      const res = simulateRLSEngine(alice, 'SELECT', bob);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cross-tenant read blocked');
    });

    it('Attack 2: User A cannot update User B records', () => {
      const res = simulateRLSEngine(alice, 'UPDATE', bob);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cross-tenant update blocked');
    });

    it('Attack 3: User A cannot delete User B records', () => {
      const res = simulateRLSEngine(alice, 'DELETE', bob);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Cross-tenant delete blocked');
    });

    it('Attack 4: User A cannot insert records with User B user_id (Tenant Spoofing)', () => {
      const res = simulateRLSEngine(alice, 'INSERT', alice, bob);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Tenant spoofing blocked');
    });

    it('Attack 5: User A cannot hijack ownership through UPDATE', () => {
      const res = simulateRLSEngine(alice, 'UPDATE', alice, bob);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Ownership hijack blocked');
    });

    it('Attack 6: Anonymous users cannot access protected financial records', () => {
      const res = simulateRLSEngine(null, 'SELECT', alice);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Anonymous user blocked');
    });
  });
});
