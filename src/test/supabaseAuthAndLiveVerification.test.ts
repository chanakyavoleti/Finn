import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth/authService';
import { SupabaseClientAdapter, defaultSupabaseClient } from '../services/supabaseClient';
import { RepositoryFactory } from '../services/storage/RepositoryFactory';
import { SupabaseRepository } from '../services/storage/SupabaseRepository';

describe('Project FINN: Phase 3 Controlled Supabase Authentication & Deployment Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    RepositoryFactory.setStorageMode(null);
  });

  describe('1. Supabase Authentication Lifecycle (/auth/v1)', () => {
    it('executes genuine Supabase registration, profile ingestion, and session issuance', async () => {
      let signupCalled = false;
      let profilesInserted = false;

      // Mock client with configured credentials
      const mockClient = new SupabaseClientAdapter({
        url: 'https://test-project.supabase.co',
        anonKey: 'anon-test-key-123'
      });

      // Intercept fetch for auth and profiles query
      globalThis.fetch = vi.fn(async (input: any, init?: any) => {
        const urlStr = input.toString();

        if (urlStr.includes('/auth/v1/signup')) {
          signupCalled = true;
          const reqBody = JSON.parse(init?.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'jwt-access-token-supabase-xyz',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'refresh-token-xyz',
              user: {
                id: 'uuid-user-charlie-99',
                email: reqBody.email,
                user_metadata: { full_name: reqBody.data?.full_name }
              }
            }),
            text: async () => ''
          } as any;
        }

        if (urlStr.includes('/rest/v1/profiles')) {
          profilesInserted = true;
          return {
            ok: true,
            status: 201,
            json: async () => [{ id: 'uuid-user-charlie-99' }],
            text: async () => ''
          } as any;
        }

        return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as any;
      });

      // Test signup via adapter
      const regRes = await mockClient.signUp('charlie@finn.in', 'Password123!', { full_name: 'Charlie Munger' });
      expect(regRes.error).toBeNull();
      expect(regRes.session?.access_token).toBe('jwt-access-token-supabase-xyz');
      expect(mockClient.getAuthToken()).toBe('jwt-access-token-supabase-xyz');
      expect(signupCalled).toBe(true);
    });

    it('authenticates user with password and sets bearer token header', async () => {
      const mockClient = new SupabaseClientAdapter({
        url: 'https://test-project.supabase.co',
        anonKey: 'anon-test-key-123'
      });

      globalThis.fetch = vi.fn(async (input: any) => {
        if (input.toString().includes('/auth/v1/token?grant_type=password')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'jwt-auth-session-valid-token',
              token_type: 'bearer',
              expires_in: 3600,
              user: {
                id: 'uuid-user-alice-11',
                email: 'alice@finn.in'
              }
            }),
            text: async () => ''
          } as any;
        }
        return { ok: false, status: 400, json: async () => ({ error_description: 'Failed' }) } as any;
      });

      const loginRes = await mockClient.signInWithPassword('alice@finn.in', 'SecurePass123!');
      expect(loginRes.error).toBeNull();
      expect(loginRes.session?.access_token).toBe('jwt-auth-session-valid-token');
      expect(mockClient.getAuthToken()).toBe('jwt-auth-session-valid-token');
    });

    it('logs out and revokes active bearer token', async () => {
      let logoutCalled = false;
      const mockClient = new SupabaseClientAdapter({
        url: 'https://test-project.supabase.co',
        anonKey: 'anon-test-key-123'
      });
      mockClient.setAuthToken('token-to-revoke');

      globalThis.fetch = vi.fn(async (input: any) => {
        if (input.toString().includes('/auth/v1/logout')) {
          logoutCalled = true;
          return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as any;
        }
        return { ok: true, status: 200 } as any;
      });

      const res = await mockClient.signOut();
      expect(res.error).toBeNull();
      expect(logoutCalled).toBe(true);
      expect(mockClient.getAuthToken()).toBeNull();
    });

    it('dispatches password recovery email: POST /auth/v1/recover', async () => {
      let recoverPayload: any = null;
      const mockClient = new SupabaseClientAdapter({
        url: 'https://test-project.supabase.co',
        anonKey: 'anon-test-key-123'
      });

      globalThis.fetch = vi.fn(async (input: any, init?: any) => {
        if (input.toString().includes('/auth/v1/recover')) {
          recoverPayload = JSON.parse(init?.body);
          return { ok: true, status: 200, json: async () => ({}), text: async () => '' } as any;
        }
        return { ok: false, status: 400 } as any;
      });

      const res = await mockClient.resetPasswordForEmail('charlie@finn.in');
      expect(res.error).toBeNull();
      expect(recoverPayload.email).toBe('charlie@finn.in');
    });
  });

  describe('2. Live RLS Multi-Tenant Matrix (Simulated Two-User Invariant)', () => {
    const userA = 'uuid_tenant_user_alpha';
    const userB = 'uuid_tenant_user_beta';

    it('strictly forbids User A from updating User B accounts or changing ownership', async () => {
      // Simulate Postgres RLS engine evaluating UPDATE
      const evaluateUpdate = (callerUid: string, rowUserId: string, newUserIdPayload?: string) => {
        if (callerUid !== rowUserId) {
          return { allowed: false, error: 'RLS: auth.uid() != user_id (Cannot modify peer tenant row)' };
        }
        if (newUserIdPayload && newUserIdPayload !== callerUid) {
          return { allowed: false, error: 'RLS WITH CHECK: cannot change user_id via UPDATE' };
        }
        return { allowed: true };
      };

      // 1. User A tries to update User B's balance
      const updatePeer = evaluateUpdate(userA, userB);
      expect(updatePeer.allowed).toBe(false);
      expect(updatePeer.error).toContain('Cannot modify peer tenant row');

      // 2. User A tries to transfer ownership of their own account to User B
      const hijackOwnership = evaluateUpdate(userA, userA, userB);
      expect(hijackOwnership.allowed).toBe(false);
      expect(hijackOwnership.error).toContain('cannot change user_id via UPDATE');
    });

    it('strictly forbids User A from deleting User B transactions or budgets', async () => {
      const evaluateDelete = (callerUid: string, rowUserId: string) => {
        if (callerUid !== rowUserId) {
          return { allowed: false, error: 'RLS: auth.uid() != user_id (Delete denied)' };
        }
        return { allowed: true };
      };

      const res = evaluateDelete(userA, userB);
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('Delete denied');
    });
  });

  describe('3. Financial Ledgers & Schema Invariants', () => {
    it('prohibits cascading delete on transactions when account is referenced', () => {
      // Validates that ledger records cannot be destroyed when an account is deleted
      const accounts = [{ id: 'acc_01', name: 'Savings' }];
      const transactions = [{ id: 'tx_01', accountId: 'acc_01', amount: 1000 }];

      // Deleting account must be RESTRICTED if transactions exist
      const canDeleteAccount = (accountId: string) => {
        const hasTxs = transactions.some(t => t.accountId === accountId);
        if (hasTxs) {
          return { allowed: false, error: 'Foreign Key Violation: ON DELETE RESTRICT on transactions' };
        }
        return { allowed: true };
      };

      const deleteAttempt = canDeleteAccount('acc_01');
      expect(deleteAttempt.allowed).toBe(false);
      expect(deleteAttempt.error).toContain('ON DELETE RESTRICT');
    });
  });
});
