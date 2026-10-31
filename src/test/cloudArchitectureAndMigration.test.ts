import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RepositoryFactory } from '../services/storage/RepositoryFactory';
import { LocalStorageRepository } from '../services/storage/LocalStorageRepository';
import { SupabaseRepository } from '../services/storage/SupabaseRepository';
import { SupabaseClientAdapter } from '../services/supabaseClient';
import { 
  DataMigrationService, 
  generateDeduplicationHash, 
  MigrationExportPayload 
} from '../services/migration/DataMigrationService';
import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense } from '../types';

describe('Project FINN: Cloud Architecture & Migration Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    RepositoryFactory.setStorageMode(null);
  });

  describe('1. Repository Factory & Pluggable Storage Abstraction', () => {
    it('defaults to LocalStorageRepository when Supabase credentials are not set', () => {
      const mode = RepositoryFactory.getActiveStorageMode();
      expect(mode).toBe('local');

      const repo = RepositoryFactory.getRepository();
      expect(repo).toBeInstanceOf(LocalStorageRepository);
    });

    it('switches to SupabaseRepository when explicitly requested and configured', () => {
      RepositoryFactory.setStorageMode('supabase');
      const mode = RepositoryFactory.getActiveStorageMode();
      expect(mode).toBe('supabase');

      const repo = RepositoryFactory.getRepository();
      expect(repo).toBeInstanceOf(SupabaseRepository);
    });

    it('falls back gracefully to LocalStorageRepository when mode is local', () => {
      RepositoryFactory.setStorageMode('local');
      const repo = RepositoryFactory.getRepository();
      expect(repo).toBeInstanceOf(LocalStorageRepository);
    });
  });

  describe('2. LocalStorageRepository Data Lifecycle & Tenant Isolation', () => {
    const repo = new LocalStorageRepository();
    const userA = 'usr_tenant_alice';
    const userB = 'usr_tenant_bob';

    it('creates, reads, updates, and deletes accounts per tenant', async () => {
      const testAccount: Account = {
        id: 'acc_01',
        name: 'HDFC Salary Account',
        institution: 'HDFC Bank',
        type: 'savings',
        balance: 154200.50,
        currency: 'INR',
        lastSynced: '2026-10-31T10:00:00Z',
        accountNumberMask: '•••• 4092',
        status: 'synced'
      };

      // Add to User A
      const addRes = await repo.addAccount(userA, testAccount);
      expect(addRes.success).toBe(true);

      // Verify User A can read it
      const userAAccounts = await repo.getAccounts(userA);
      expect(userAAccounts).toHaveLength(1);
      expect(userAAccounts[0].balance).toBe(154200.50);

      // Verify User B CANNOT read User A's data (Tenant Isolation)
      const userBAccounts = await repo.getAccounts(userB);
      expect(userBAccounts).toHaveLength(0);

      // Update account for User A
      const updateRes = await repo.updateAccount(userA, 'acc_01', { balance: 175000.00 });
      expect(updateRes.success).toBe(true);
      const updatedList = await repo.getAccounts(userA);
      expect(updatedList[0].balance).toBe(175000.00);

      // Delete account for User A
      const deleteRes = await repo.deleteAccount(userA, 'acc_01');
      expect(deleteRes.success).toBe(true);
      const afterDelete = await repo.getAccounts(userA);
      expect(afterDelete).toHaveLength(0);
    });

    it('supports transactions, budgets, goals, holdings, and split expenses', async () => {
      const tx: Transaction = {
        id: 'tx_101',
        accountId: 'acc_01',
        date: '2026-10-31',
        amount: 2450.00,
        type: 'expense',
        category: 'Groceries',
        merchant: 'Nature Basket',
        description: 'Weekly organic groceries',
        status: 'posted'
      };
      await repo.addTransaction(userA, tx);
      const txList = await repo.getTransactions(userA);
      expect(txList).toHaveLength(1);
      expect(txList[0].merchant).toBe('Nature Basket');

      const budget: Budget = {
        id: 'b_01',
        categoryId: 'cat_groceries',
        categoryName: 'Groceries',
        limit: 15000.00,
        spent: 2450.00,
        period: 'monthly'
      };
      await repo.addBudget(userA, budget);
      const budgetList = await repo.getBudgets(userA);
      expect(budgetList).toHaveLength(1);
      expect(budgetList[0].limit).toBe(15000.00);

      const goal: SavingsGoal = {
        id: 'g_01',
        name: 'Emergency Fund',
        targetAmount: 500000.00,
        currentAmount: 250000.00,
        targetDate: '2027-03-31',
        monthlyContribution: 25000.00,
        category: 'Safety Net'
      };
      await repo.addGoal(userA, goal);
      const goalList = await repo.getGoals(userA);
      expect(goalList).toHaveLength(1);
      expect(goalList[0].targetAmount).toBe(500000.00);

      const holding: Holding = {
        id: 'h_01',
        symbol: 'TCS.NS',
        name: 'Tata Consultancy Services',
        assetClass: 'intl_stocks',
        shares: 50,
        avgCost: 3200.00,
        currentPrice: 4120.00,
        dayChangePct: 1.25,
        currency: 'INR',
        lastUpdated: '2026-10-31T12:00:00Z'
      };
      await repo.addHolding(userA, holding);
      const holdingList = await repo.getHoldings(userA);
      expect(holdingList).toHaveLength(1);
      expect(holdingList[0].symbol).toBe('TCS.NS');

      const split: SplitExpense = {
        id: 'split_01',
        title: 'Diwali Dinner',
        totalAmount: 6000.00,
        paidBy: 'Alice',
        date: '2026-10-30',
        category: 'Food & Dining',
        status: 'unsettled',
        participants: [
          { name: 'Alice', share: 3000, hasPaid: true },
          { name: 'Bob', share: 3000, hasPaid: false }
        ]
      };
      await repo.addSplitExpense(userA, split);
      const splitList = await repo.getSplitExpenses(userA);
      expect(splitList).toHaveLength(1);
      expect(splitList[0].totalAmount).toBe(6000.00);

      // Verify clearUserData cleans all User A tables without touching User B
      await repo.addAccount(userB, {
        id: 'acc_bob',
        name: 'Bob Savings',
        institution: 'ICICI',
        type: 'savings',
        balance: 50000,
        currency: 'INR',
        lastSynced: '2026-10-31',
        accountNumberMask: '1111',
        status: 'synced'
      });

      await repo.clearUserData(userA);
      expect(await repo.getAccounts(userA)).toHaveLength(0);
      expect(await repo.getTransactions(userA)).toHaveLength(0);
      expect(await repo.getBudgets(userA)).toHaveLength(0);

      // User B remains intact
      expect(await repo.getAccounts(userB)).toHaveLength(1);
    });
  });

  describe('3. SupabaseClientAdapter Configuration & REST Ingestion', () => {
    it('reports not configured when environment variables are omitted', () => {
      const client = new SupabaseClientAdapter(null);
      expect(client.isConfigured()).toBe(false);
    });

    it('reports configured and retains auth token when provided', () => {
      const client = new SupabaseClientAdapter({
        url: 'https://test-project.supabase.co',
        anonKey: 'sample-anon-key-12345'
      });
      expect(client.isConfigured()).toBe(true);

      client.setAuthToken('jwt-access-token-abc');
      expect(client.getAuthToken()).toBe('jwt-access-token-abc');
    });

    it('returns structured error when query is attempted without configuration', async () => {
      const client = new SupabaseClientAdapter(null);
      const result = await client.query('accounts', 'GET');
      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Supabase is not configured');
    });
  });

  describe('4. Data Migration Service & Deduplication Hash', () => {
    const localRepo = new LocalStorageRepository();
    const migrationService = new DataMigrationService(localRepo);
    const userId = 'usr_migration_test';

    beforeEach(async () => {
      await localRepo.clearUserData(userId);
    });

    it('generates consistent, deterministic deduplication hashes', () => {
      const txA: Partial<Transaction> = {
        accountId: 'acc_1',
        date: '2026-10-31',
        amount: 500.50,
        merchant: 'Swiggy',
        type: 'expense'
      };
      const txB: Partial<Transaction> = {
        accountId: 'acc_1',
        date: '2026-10-31',
        amount: 500.50,
        merchant: 'Swiggy',
        type: 'expense'
      };
      const txC: Partial<Transaction> = {
        accountId: 'acc_1',
        date: '2026-10-31',
        amount: 500.51, // different amount
        merchant: 'Swiggy',
        type: 'expense'
      };

      const hashA = generateDeduplicationHash(txA, 'transaction');
      const hashB = generateDeduplicationHash(txB, 'transaction');
      const hashC = generateDeduplicationHash(txC, 'transaction');

      expect(hashA).toBe(hashB);
      expect(hashA).not.toBe(hashC);
    });

    it('exports all local data and produces an export payload with checksum', async () => {
      await localRepo.addAccount(userId, {
        id: 'acc_10',
        name: 'Axis Bank',
        institution: 'Axis Bank',
        type: 'savings',
        balance: 75000.00,
        currency: 'INR',
        lastSynced: '2026-10-31',
        accountNumberMask: '•••• 1234',
        status: 'synced'
      });

      await localRepo.addTransaction(userId, {
        id: 'tx_50',
        accountId: 'acc_10',
        date: '2026-10-31',
        amount: 1500.00,
        type: 'expense',
        category: 'Dining',
        merchant: 'Bikanervala',
        description: 'Dinner with family',
        status: 'posted'
      });

      const payload = await migrationService.exportLocalData(userId);
      expect(payload.version).toBe('1.0.0');
      expect(payload.sourceUserId).toBe(userId);
      expect(payload.accounts).toHaveLength(1);
      expect(payload.transactions).toHaveLength(1);
      expect(payload.checksum).toBeTruthy();
    });

    it('validates local export data and catches malformed fields', () => {
      const invalidPayload: MigrationExportPayload = {
        version: '1.0.0',
        exportTimestamp: '2026-10-31',
        sourceUserId: 'usr_invalid',
        accounts: [
          {
            id: 'acc_bad',
            name: 'Bad Account',
            institution: 'Test Bank',
            type: 'savings',
            balance: NaN, // Invalid!
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '1234',
            status: 'synced'
          }
        ],
        transactions: [
          {
            id: '', // Missing ID!
            accountId: 'non_existent_account',
            date: 'bad-date',
            amount: -50,
            type: 'expense',
            category: 'Other',
            merchant: 'Test',
            description: '',
            status: 'posted'
          }
        ],
        budgets: [],
        goals: [],
        holdings: [],
        splitExpenses: [],
        checksum: 'abc'
      };

      const result = migrationService.validateLocalData(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid balance'))).toBe(true);
      expect(result.errors.some(e => e.includes('missing required fields'))).toBe(true);
      expect(result.warnings.some(w => w.includes('non-existent account ID'))).toBe(true);
    });

    it('performs idempotent migration, prevents duplicate transactions, and reconciles balances', async () => {
      // Mock Supabase repository in-memory simulation
      const cloudDb: {
        accounts: Account[];
        transactions: Transaction[];
        budgets: Budget[];
        goals: SavingsGoal[];
        holdings: Holding[];
        splitExpenses: SplitExpense[];
      } = {
        accounts: [],
        transactions: [],
        budgets: [],
        goals: [],
        holdings: [],
        splitExpenses: []
      };

      const mockSupabaseRepo = {
        getAccounts: vi.fn(async (_uid: string) => [...cloudDb.accounts]),
        addAccount: vi.fn(async (_uid: string, a: Account) => {
          cloudDb.accounts.push(a);
          return { success: true, data: a };
        }),
        getTransactions: vi.fn(async (_uid: string) => [...cloudDb.transactions]),
        addTransaction: vi.fn(async (_uid: string, t: Transaction) => {
          cloudDb.transactions.push(t);
          return { success: true, data: t };
        }),
        addBudget: vi.fn(async (_uid: string, b: Budget) => {
          cloudDb.budgets.push(b);
          return { success: true, data: b };
        }),
        addGoal: vi.fn(async (_uid: string, g: SavingsGoal) => {
          cloudDb.goals.push(g);
          return { success: true, data: g };
        }),
        addHolding: vi.fn(async (_uid: string, h: Holding) => {
          cloudDb.holdings.push(h);
          return { success: true, data: h };
        }),
        addSplitExpense: vi.fn(async (_uid: string, s: SplitExpense) => {
          cloudDb.splitExpenses.push(s);
          return { success: true, data: s };
        })
      } as unknown as SupabaseRepository;

      const payload: MigrationExportPayload = {
        version: '1.0.0',
        exportTimestamp: '2026-10-31T12:00:00Z',
        sourceUserId: 'usr_local_source',
        accounts: [
          {
            id: 'acc_sav',
            name: 'State Bank of India',
            institution: 'SBI',
            type: 'savings',
            balance: 100000.00,
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '•••• 7788',
            status: 'synced'
          },
          {
            id: 'acc_curr',
            name: 'Kotak Current',
            institution: 'Kotak',
            type: 'checking',
            balance: 50000.00,
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '•••• 9900',
            status: 'synced'
          }
        ],
        transactions: [
          {
            id: 'tx_sbi_1',
            accountId: 'acc_sav',
            date: '2026-10-25',
            amount: 5000.00,
            type: 'income',
            category: 'Salary',
            merchant: 'Employer Inc',
            description: 'Monthly compensation',
            status: 'posted'
          }
        ],
        budgets: [],
        goals: [],
        holdings: [],
        splitExpenses: [],
        checksum: 'chk_123'
      };

      // 1. Initial Migration Run
      const report1 = await migrationService.migrateToSupabase(
        'usr_cloud_dest',
        payload,
        mockSupabaseRepo,
        { wipeLocalOnSuccess: false }
      );

      expect(report1.success).toBe(true);
      expect(report1.status).toBe('completed');
      expect(report1.migratedCounts.accounts).toBe(2);
      expect(report1.migratedCounts.transactions).toBe(1);
      expect(report1.financialReconciliation.isBalanced).toBe(true);
      expect(report1.financialReconciliation.preMigrationBalance).toBe(150000.00);
      expect(report1.financialReconciliation.postMigrationBalance).toBe(150000.00);
      expect(report1.financialReconciliation.discrepancy).toBe(0);

      // 2. Second Migration Run with Identical Payload (Tests Deduplication)
      const report2 = await migrationService.migrateToSupabase(
        'usr_cloud_dest',
        payload,
        mockSupabaseRepo,
        { wipeLocalOnSuccess: false }
      );

      expect(report2.success).toBe(true);
      expect(report2.migratedCounts.accounts).toBe(0); // All skipped!
      expect(report2.migratedCounts.transactions).toBe(0); // All skipped!
      expect(report2.duplicatesSkipped).toBe(3); // 2 accounts + 1 transaction
      expect(report2.financialReconciliation.isBalanced).toBe(true);
    });

    it('aborts and reports reconciliation discrepancy if cloud balance does not match source balance', async () => {
      // Mock Supabase repo that corrupts the balance
      const mockCorruptSupabaseRepo = {
        getAccounts: vi.fn(async () => [
          {
            id: 'acc_corrupt',
            name: 'Corrupt Bank',
            institution: 'Bank',
            type: 'savings',
            balance: 140000.00, // Discrepancy of 10,000!
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '1234',
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

      const payload: MigrationExportPayload = {
        version: '1.0.0',
        exportTimestamp: '2026-10-31T12:00:00Z',
        sourceUserId: 'usr_source',
        accounts: [
          {
            id: 'acc_orig',
            name: 'Original Account',
            institution: 'Bank',
            type: 'savings',
            balance: 150000.00,
            currency: 'INR',
            lastSynced: '2026-10-31',
            accountNumberMask: '1234',
            status: 'synced'
          }
        ],
        transactions: [],
        budgets: [],
        goals: [],
        holdings: [],
        splitExpenses: [],
        checksum: 'chk_test'
      };

      const report = await migrationService.migrateToSupabase(
        'usr_dest',
        payload,
        mockCorruptSupabaseRepo
      );

      expect(report.success).toBe(false);
      expect(report.status).toBe('reconciliation_failed');
      expect(report.financialReconciliation.isBalanced).toBe(false);
      expect(report.financialReconciliation.discrepancy).toBe(10000.00);
      expect(report.error).toContain('Reconciliation audit mismatch');
    });
  });

  describe('5. Multi-Tenant Row Level Security (RLS) Policy Simulator', () => {
    // Simulator representing Postgres RLS engine logic:
    // "CREATE POLICY accounts_select_own ON accounts FOR SELECT USING (auth.uid() = user_id)"
    // "CREATE POLICY accounts_insert_own ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id)"
    function simulatePostgresRLS(
      authenticatedUserId: string,
      operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
      recordUserId: string
    ): { allowed: boolean; violation?: string } {
      if (authenticatedUserId !== recordUserId) {
        return {
          allowed: false,
          violation: `RLS Policy Violation: auth.uid() [${authenticatedUserId}] does not match row user_id [${recordUserId}] on ${operation}`
        };
      }
      return { allowed: true };
    }

    it('strictly forbids tenant A from reading tenant B records', () => {
      const aliceUid = 'uuid_user_alice_001';
      const bobUid = 'uuid_user_bob_002';

      // Alice accesses Alice's row
      const aliceReadOwn = simulatePostgresRLS(aliceUid, 'SELECT', aliceUid);
      expect(aliceReadOwn.allowed).toBe(true);

      // Alice attempts to read Bob's row
      const aliceReadBob = simulatePostgresRLS(aliceUid, 'SELECT', bobUid);
      expect(aliceReadBob.allowed).toBe(false);
      expect(aliceReadBob.violation).toContain('RLS Policy Violation');
    });

    it('strictly forbids tenant A from inserting or modifying tenant B records', () => {
      const aliceUid = 'uuid_user_alice_001';
      const bobUid = 'uuid_user_bob_002';

      const aliceSpoofInsert = simulatePostgresRLS(aliceUid, 'INSERT', bobUid);
      expect(aliceSpoofInsert.allowed).toBe(false);

      const aliceSpoofUpdate = simulatePostgresRLS(aliceUid, 'UPDATE', bobUid);
      expect(aliceSpoofUpdate.allowed).toBe(false);

      const aliceSpoofDelete = simulatePostgresRLS(aliceUid, 'DELETE', bobUid);
      expect(aliceSpoofDelete.allowed).toBe(false);
    });
  });
});
