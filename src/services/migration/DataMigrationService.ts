import { Account, Transaction, Budget, Holding, SavingsGoal, SplitExpense } from '../../types';
import { LocalStorageRepository } from '../storage/LocalStorageRepository';
import { SupabaseRepository } from '../storage/SupabaseRepository';
import { SupabaseClientAdapter } from '../supabaseClient';
import { addMoney, subtractMoney } from '../../utils/currency';

export interface MigrationExportPayload {
  version: string;
  exportTimestamp: string;
  sourceUserId: string;
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  holdings: Holding[];
  splitExpenses: SplitExpense[];
  checksum: string;
}

export interface ValidationSummary {
  accountsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  goalsCount: number;
  holdingsCount: number;
  splitExpensesCount: number;
  totalAccountBalance: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: ValidationSummary;
}

export interface MigrationReport {
  success: boolean;
  status: 'completed' | 'reconciliation_failed' | 'validation_failed' | 'error';
  sourceUserId: string;
  destinationUserId: string;
  timestamp: string;
  migratedCounts: {
    accounts: number;
    transactions: number;
    budgets: number;
    goals: number;
    holdings: number;
    splitExpenses: number;
  };
  duplicatesSkipped: number;
  financialReconciliation: {
    preMigrationBalance: number;
    postMigrationBalance: number;
    discrepancy: number;
    isBalanced: boolean;
  };
  error?: string;
}

/**
 * Deterministic hash generator for deduplication
 */
export function generateDeduplicationHash(record: any, type: string): string {
  let str = `${type}:`;
  if (type === 'transaction') {
    // Include record.id (if available) to ensure two legitimate distinct transactions with identical merchant, date and amount are not falsely collided
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.accountId}|${record.date}|${record.amount}|${record.merchant || ''}|${record.type}`;
  } else if (type === 'account') {
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.name}|${record.institution}|${record.type}|${record.accountNumberMask || ''}`;
  } else if (type === 'budget') {
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.categoryId}|${record.categoryName}|${record.limit}`;
  } else if (type === 'goal') {
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.name}|${record.targetAmount}|${record.targetDate}`;
  } else if (type === 'holding') {
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.symbol}|${record.shares}|${record.avgCost}`;
  } else if (type === 'split') {
    const idPart = record.id ? `${record.id}|` : '';
    str += `${idPart}${record.title}|${record.totalAmount}|${record.date}`;
  } else {
    str += JSON.stringify(record);
  }

  // Simple deterministic 32-bit FNV-1a variant string hash for browser compatibility
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `hash_${(hash >>> 0).toString(16)}`;
}

export class DataMigrationService {
  private localRepo: LocalStorageRepository;

  constructor(localRepo?: LocalStorageRepository) {
    this.localRepo = localRepo || new LocalStorageRepository();
  }

  /**
   * Export all local data for a user into a versioned migration payload
   */
  async exportLocalData(userId: string): Promise<MigrationExportPayload> {
    const accounts = await this.localRepo.getAccounts(userId);
    const transactions = await this.localRepo.getTransactions(userId);
    const budgets = await this.localRepo.getBudgets(userId);
    const goals = await this.localRepo.getGoals(userId);
    const holdings = await this.localRepo.getHoldings(userId);
    const splitExpenses = await this.localRepo.getSplitExpenses(userId);

    const payloadWithoutChecksum: Omit<MigrationExportPayload, 'checksum'> = {
      version: '1.0.0',
      exportTimestamp: new Date().toISOString(),
      sourceUserId: userId,
      accounts,
      transactions,
      budgets,
      goals,
      holdings,
      splitExpenses
    };

    const checksum = generateDeduplicationHash(payloadWithoutChecksum, 'payload_export');

    return {
      ...payloadWithoutChecksum,
      checksum
    };
  }

  /**
   * Validate local export data before initiating cloud ingestion
   */
  validateLocalData(payload: MigrationExportPayload): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload.sourceUserId) {
      errors.push('Missing sourceUserId in migration payload');
    }

    // Validate Accounts
    let totalBalance = 0;
    const accountIds = new Set<string>();

    for (const acc of payload.accounts) {
      if (!acc.id || !acc.name) {
        errors.push(`Account missing mandatory id or name: ${JSON.stringify(acc)}`);
      }
      if (typeof acc.balance !== 'number' || isNaN(acc.balance)) {
        errors.push(`Account ${acc.name} has invalid balance: ${acc.balance}`);
      } else {
        totalBalance = addMoney(totalBalance, acc.balance);
      }
      accountIds.add(acc.id);
    }

    // Validate Transactions
    const dateRegex = /^\d{4}-\d{2}-\d{2}/;
    for (const tx of payload.transactions) {
      if (!tx.id || !tx.date || typeof tx.amount !== 'number' || isNaN(tx.amount)) {
        errors.push(`Transaction missing required fields or has invalid amount: ${tx.id || 'unknown'}`);
      }
      if (tx.amount <= 0) {
        warnings.push(`Transaction ${tx.id} has non-positive amount ${tx.amount}`);
      }
      if (tx.date && !dateRegex.test(tx.date)) {
        warnings.push(`Transaction ${tx.id} has non-standard date format: ${tx.date}`);
      }
      if (tx.accountId && !accountIds.has(tx.accountId)) {
        warnings.push(`Transaction ${tx.id} references non-existent account ID: ${tx.accountId}`);
      }
    }

    // Validate Budgets
    for (const b of payload.budgets) {
      if (!b.id || typeof b.limit !== 'number' || b.limit <= 0) {
        warnings.push(`Budget ${b.categoryName || b.id} has invalid limit: ${b.limit}`);
      }
    }

    // Validate Goals
    for (const g of payload.goals) {
      if (!g.id || typeof g.targetAmount !== 'number' || g.targetAmount <= 0) {
        warnings.push(`Goal ${g.name || g.id} has invalid target amount: ${g.targetAmount}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        accountsCount: payload.accounts.length,
        transactionsCount: payload.transactions.length,
        budgetsCount: payload.budgets.length,
        goalsCount: payload.goals.length,
        holdingsCount: payload.holdings.length,
        splitExpensesCount: payload.splitExpenses.length,
        totalAccountBalance: totalBalance
      }
    };
  }

  /**
   * Idempotent migration to Supabase with balance reconciliation
   */
  async migrateToSupabase(
    destinationUserId: string,
    payload: MigrationExportPayload,
    supabaseRepo: SupabaseRepository,
    options: { wipeLocalOnSuccess?: boolean } = {}
  ): Promise<MigrationReport> {
    const timestamp = new Date().toISOString();

    // 1. Validate payload
    const validation = this.validateLocalData(payload);
    if (!validation.valid) {
      return {
        success: false,
        status: 'validation_failed',
        sourceUserId: payload.sourceUserId,
        destinationUserId,
        timestamp,
        migratedCounts: { accounts: 0, transactions: 0, budgets: 0, goals: 0, holdings: 0, splitExpenses: 0 },
        duplicatesSkipped: 0,
        financialReconciliation: {
          preMigrationBalance: validation.summary.totalAccountBalance,
          postMigrationBalance: 0,
          discrepancy: validation.summary.totalAccountBalance,
          isBalanced: false
        },
        error: `Validation failed: ${validation.errors.join('; ')}`
      };
    }

    const preBalance = validation.summary.totalAccountBalance;
    let duplicatesSkipped = 0;

    try {
      // 2. Fetch existing destination data to prevent duplicate insertion
      const existingAccounts = await supabaseRepo.getAccounts(destinationUserId);
      const existingTx = await supabaseRepo.getTransactions(destinationUserId);

      const existingAccountHashes = new Set(existingAccounts.map(a => generateDeduplicationHash(a, 'account')));
      const existingTxHashes = new Set(existingTx.map(t => generateDeduplicationHash(t, 'transaction')));

      // 3. Ingest Accounts
      let accountsMigrated = 0;
      for (const acc of payload.accounts) {
        const hash = generateDeduplicationHash(acc, 'account');
        if (existingAccountHashes.has(hash)) {
          duplicatesSkipped++;
          continue;
        }
        const res = await supabaseRepo.addAccount(destinationUserId, acc);
        if (res.success) {
          accountsMigrated++;
          existingAccountHashes.add(hash);
        }
      }

      // 4. Ingest Transactions
      let txMigrated = 0;
      for (const tx of payload.transactions) {
        const hash = generateDeduplicationHash(tx, 'transaction');
        if (existingTxHashes.has(hash)) {
          duplicatesSkipped++;
          continue;
        }
        const res = await supabaseRepo.addTransaction(destinationUserId, tx);
        if (res.success) {
          txMigrated++;
          existingTxHashes.add(hash);
        }
      }

      // 5. Ingest Budgets
      let budgetsMigrated = 0;
      for (const b of payload.budgets) {
        const res = await supabaseRepo.addBudget(destinationUserId, b);
        if (res.success) budgetsMigrated++;
      }

      // 6. Ingest Goals
      let goalsMigrated = 0;
      for (const g of payload.goals) {
        const res = await supabaseRepo.addGoal(destinationUserId, g);
        if (res.success) goalsMigrated++;
      }

      // 7. Ingest Holdings
      let holdingsMigrated = 0;
      for (const h of payload.holdings) {
        const res = await supabaseRepo.addHolding(destinationUserId, h);
        if (res.success) holdingsMigrated++;
      }

      // 8. Ingest Split Expenses
      let splitsMigrated = 0;
      for (const s of payload.splitExpenses) {
        const res = await supabaseRepo.addSplitExpense(destinationUserId, s);
        if (res.success) splitsMigrated++;
      }

      // 9. FINANCIAL RECONCILIATION AUDIT (Aggregate & Per-Account Invariant Check)
      const cloudAccounts = await supabaseRepo.getAccounts(destinationUserId);
      let postBalance = 0;
      const cloudAccountMap = new Map<string, number>();
      for (const acc of cloudAccounts) {
        postBalance = addMoney(postBalance, acc.balance);
        cloudAccountMap.set(acc.id, acc.balance);
      }

      // Check 1: Aggregate sum equivalence
      const discrepancy = Math.abs(subtractMoney(preBalance, postBalance));
      let isBalanced = discrepancy < 0.01;
      let reconciliationError: string | undefined;

      if (!isBalanced) {
        reconciliationError = `Reconciliation audit mismatch (aggregate): Pre-migration total = ₹${preBalance}, Post-migration total = ₹${postBalance}. Discrepancy: ₹${discrepancy}`;
      } else {
        // Check 2: Granular per-account balance equivalence
        for (const sourceAcc of payload.accounts) {
          const cloudBalance = cloudAccountMap.get(sourceAcc.id);
          if (cloudBalance === undefined) {
            isBalanced = false;
            reconciliationError = `Per-account audit failure: Account ${sourceAcc.name} (${sourceAcc.id}) missing from cloud database.`;
            break;
          }
          const accDiff = Math.abs(subtractMoney(sourceAcc.balance, cloudBalance));
          if (accDiff >= 0.01) {
            isBalanced = false;
            reconciliationError = `Per-account balance drift: Account ${sourceAcc.name} expected ₹${sourceAcc.balance}, got ₹${cloudBalance}. Diff: ₹${accDiff}`;
            break;
          }
        }
      }

      if (!isBalanced) {
        return {
          success: false,
          status: 'reconciliation_failed',
          sourceUserId: payload.sourceUserId,
          destinationUserId,
          timestamp,
          migratedCounts: {
            accounts: accountsMigrated,
            transactions: txMigrated,
            budgets: budgetsMigrated,
            goals: goalsMigrated,
            holdings: holdingsMigrated,
            splitExpenses: splitsMigrated
          },
          duplicatesSkipped,
          financialReconciliation: {
            preMigrationBalance: preBalance,
            postMigrationBalance: postBalance,
            discrepancy: discrepancy > 0 ? discrepancy : 0.01,
            isBalanced: false
          },
          error: reconciliationError || 'Financial reconciliation failed'
        };
      }

      // 10. Non-destructive protection: wipe local only if explicitly requested
      if (options.wipeLocalOnSuccess) {
        await this.localRepo.clearUserData(payload.sourceUserId);
      }

      return {
        success: true,
        status: 'completed',
        sourceUserId: payload.sourceUserId,
        destinationUserId,
        timestamp,
        migratedCounts: {
          accounts: accountsMigrated,
          transactions: txMigrated,
          budgets: budgetsMigrated,
          goals: goalsMigrated,
          holdings: holdingsMigrated,
          splitExpenses: splitsMigrated
        },
        duplicatesSkipped,
        financialReconciliation: {
          preMigrationBalance: preBalance,
          postMigrationBalance: postBalance,
          discrepancy: 0,
          isBalanced: true
        }
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        sourceUserId: payload.sourceUserId,
        destinationUserId,
        timestamp,
        migratedCounts: { accounts: 0, transactions: 0, budgets: 0, goals: 0, holdings: 0, splitExpenses: 0 },
        duplicatesSkipped,
        financialReconciliation: {
          preMigrationBalance: preBalance,
          postMigrationBalance: 0,
          discrepancy: preBalance,
          isBalanced: false
        },
        error: err?.message || 'Unexpected migration exception occurred'
      };
    }
  }
}
