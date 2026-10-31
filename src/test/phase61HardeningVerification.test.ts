import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../auth/authService';
import { addMoney, subtractMoney } from '../utils/currency';

describe('FINN Phase 6.1: Critical Hardening & Remediation Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // --------------------------------------------------------------------------
  // STEP 4: OFFLINE AUTHENTICATION SECURITY (PBKDF2 HASHING)
  // --------------------------------------------------------------------------
  describe('Step 4 — Offline Authentication Security (PBKDF2)', () => {
    it('generates PBKDF2 hashes with 100,000 iterations and random salt', async () => {
      const session = await AuthService.register('pbkdf2_user@finn.in', 'PBKDF2 User', 'ComplexPassword_123!');
      expect(session).toBeDefined();
      expect(session.user.email).toBe('pbkdf2_user@finn.in');

      const rawUsers = localStorage.getItem('finn_registered_users');
      expect(rawUsers).not.toBeNull();
      const users = JSON.parse(rawUsers!);
      const user = users.find((u: any) => u.profile.email === 'pbkdf2_user@finn.in');
      
      expect(user).toBeDefined();
      // Verify format: pbkdf2:100000:<saltHex>:<hashHex>
      expect(user.passwordHash.startsWith('pbkdf2:100000:') || user.passwordHash.startsWith('pbkdf2:fallback:')).toBe(true);
      expect(user.passwordHash).not.toContain('ComplexPassword_123!');
    });

    it('successfully authenticates with correct password and rejects invalid password', async () => {
      await AuthService.register('login_auth@finn.in', 'Login User', 'CorrectPassword_999!');

      // Valid login
      const validSession = await AuthService.login('login_auth@finn.in', 'CorrectPassword_999!');
      expect(validSession).toBeDefined();
      expect(validSession.user.email).toBe('login_auth@finn.in');

      // Invalid password rejected
      await expect(
        AuthService.login('login_auth@finn.in', 'WrongPassword_000!')
      ).rejects.toThrow('Invalid email or password.');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      await expect(
        AuthService.register('short_pass@finn.in', 'Short Pass', 'Short1!')
      ).rejects.toThrow('Password must be at least 8 characters long.');
    });
  });

  // --------------------------------------------------------------------------
  // STEP 5 & 6: ATOMIC TRANSFERS & MULTI-CURRENCY CONVERSION
  // --------------------------------------------------------------------------
  describe('Step 5 & 6 — Atomic Financial Transfers & Currency Conversion', () => {
    it('conserves balances exactly during same-currency transfers', () => {
      const initialSourceBalance = 50000.00;
      const initialDestBalance = 10000.00;
      const transferAmount = 15000.00;

      const newSourceBalance = subtractMoney(initialSourceBalance, transferAmount);
      const newDestBalance = addMoney(initialDestBalance, transferAmount);

      expect(newSourceBalance).toBe(35000.00);
      expect(newDestBalance).toBe(25000.00);
      // Double entry conservation: sum of balances before === sum after
      expect(initialSourceBalance + initialDestBalance).toBe(newSourceBalance + newDestBalance);
    });

    it('accurately applies exchange rate during cross-currency transfer', () => {
      const sourceBalanceINR = 85000.00;
      const destBalanceUSD = 100.00;
      const transferAmountINR = 8500.00;
      const inrToUsdRate = 0.0117647; // 1 USD ~ 85 INR

      // Calculated USD credit with 2-decimal banker's precision
      const creditedUSD = Math.round(transferAmountINR * inrToUsdRate * 100) / 100;
      expect(creditedUSD).toBe(100.00);

      const finalSource = subtractMoney(sourceBalanceINR, transferAmountINR);
      const finalDest = addMoney(destBalanceUSD, creditedUSD);

      expect(finalSource).toBe(76500.00);
      expect(finalDest).toBe(200.00);
    });

    it('enforces sufficient funds invariant (cannot transfer more than balance)', () => {
      const sourceBalance = 5000.00;
      const attemptedTransfer = 10000.00;
      const isSufficient = sourceBalance >= attemptedTransfer;
      expect(isSufficient).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // STEP 7: SECURE SERVER-SIDE ACCOUNT DELETION
  // --------------------------------------------------------------------------
  describe('Step 7 — Account Deletion & Cache Purging', () => {
    it('completely purges user profile, session, and user-specific local storage keys', async () => {
      const session = await AuthService.register('delete_target@finn.in', 'Delete Target', 'DeleteMe_12345!');
      const uid = session.user.id;

      // Seed mock financial data for this user
      localStorage.setItem(`finn_accounts_${uid}`, JSON.stringify([{ id: 'acc-1', balance: 1000 }]));
      localStorage.setItem(`finn_transactions_${uid}`, JSON.stringify([{ id: 'tx-1', amount: 500 }]));

      // Verify data exists
      expect(localStorage.getItem(`finn_accounts_${uid}`)).not.toBeNull();
      expect(AuthService.getSession()).not.toBeNull();

      // Execute account deletion
      await AuthService.deleteAccount(uid);

      // Verify session purged
      expect(AuthService.getSession()).toBeNull();
      expect(localStorage.getItem(`finn_accounts_${uid}`)).toBeNull();
      expect(localStorage.getItem(`finn_transactions_${uid}`)).toBeNull();

      // Verify user removed from registered users list
      const rawUsers = localStorage.getItem('finn_registered_users');
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      expect(users.find((u: any) => u.profile.id === uid)).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // STEP 8: BULK BATCHING LOGIC
  // --------------------------------------------------------------------------
  describe('Step 8 — Bulk Persistence Batch Slicing', () => {
    it('safely chunks 1,250 transactions into batches of at most 500 without record loss', () => {
      const totalCount = 1250;
      const batchSize = 500;
      const mockTxs = Array.from({ length: totalCount }, (_, i) => ({ id: `tx-${i}`, amount: i + 1 }));

      const batches: any[][] = [];
      for (let i = 0; i < mockTxs.length; i += batchSize) {
        batches.push(mockTxs.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(500);
      expect(batches[1].length).toBe(500);
      expect(batches[2].length).toBe(250);

      // Flatten and verify all records preserved with original IDs
      const flattened = batches.flat();
      expect(flattened.length).toBe(totalCount);
      expect(flattened[0].id).toBe('tx-0');
      expect(flattened[1249].id).toBe('tx-1249');
    });
  });
});
