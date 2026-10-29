import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, UserSession } from '../auth/authService';

describe('Authentication & Multi-User Data Isolation (Row Level Security Simulation)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registers a new user and creates an active session with INR defaults', async () => {
    const session = await AuthService.register('chanakya@finn.in', 'Chanakya Voleti', 'SecurePassword123!');
    expect(session.user.email).toBe('chanakya@finn.in');
    expect(session.user.defaultCurrency).toBe('INR');
    expect(session.user.fiscalYearType).toBe('indian');
    expect(session.token).toMatch(/^jwt_/);

    // Verify session retrieval
    const current = AuthService.getSession();
    expect(current?.user.id).toBe(session.user.id);
  });

  it('rejects duplicate email registrations', async () => {
    await AuthService.register('user@example.com', 'User One', 'Password123');
    await expect(AuthService.register('user@example.com', 'User Duplicate', 'Password123')).rejects.toThrow(
      /already exists/
    );
  });

  it('enforces multi-user data isolation (User A cannot access User B records)', async () => {
    // User A session
    const sessionA = await AuthService.register('usera@finn.in', 'User A', 'Pass123456');
    // User B session
    const sessionB = await AuthService.register('userb@finn.in', 'User B', 'Pass123456');

    const resourceBelongingToA = sessionA.user.id;
    const resourceBelongingToB = sessionB.user.id;

    // Verify User A can access own records
    expect(AuthService.verifyOwnership(resourceBelongingToA, sessionA)).toBe(true);

    // Verify User B CANNOT access User A's records
    expect(AuthService.verifyOwnership(resourceBelongingToA, sessionB)).toBe(false);

    // Verify Unauthenticated request is rejected
    expect(AuthService.verifyOwnership(resourceBelongingToA, null)).toBe(false);
  });

  it('clears session on logout', async () => {
    await AuthService.register('logout@test.com', 'Test Logout', 'Password123');
    expect(AuthService.getSession()).not.toBeNull();

    AuthService.logout();
    expect(AuthService.getSession()).toBeNull();
  });
});
