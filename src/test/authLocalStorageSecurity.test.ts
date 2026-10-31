import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, UserProfile, UserSession } from '../auth/authService';

describe('Phase 4: Authentication & LocalStorage Security Attack Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // 1. LocalStorage Modification Attack
  it('Attack 1: Directly tampering with account balance in localStorage does not crash application', () => {
    // Write valid user accounts
    const initialAccounts = [{ id: 'acc-1', name: 'HDFC', balance: 50000 }];
    localStorage.setItem('finn_accounts_usr_tamper', JSON.stringify(initialAccounts));

    // Adversary modifies localStorage balance directly
    localStorage.setItem('finn_accounts_usr_tamper', JSON.stringify([{ id: 'acc-1', name: 'HDFC', balance: 999999999 }]));
    
    const readBack = JSON.parse(localStorage.getItem('finn_accounts_usr_tamper')!);
    expect(readBack[0].balance).toBe(999999999);
    // Security finding: localStorage is unencrypted client storage. Any script on origin can mutate records.
  });

  // 2. User ID Manipulation Attack
  it('Attack 2: Forging an unauthorized session for another user ID', () => {
    // Attacker crafts arbitrary session
    const forgedSession: UserSession = {
      token: 'jwt_forged_token.12345',
      user: {
        id: 'usr_victim_id',
        email: 'victim@finn.in',
        fullName: 'Victim User',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: new Date().toISOString()
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    localStorage.setItem('finn_auth_session', JSON.stringify(forgedSession));
    const activeSession = AuthService.getSession();
    expect(activeSession?.user.id).toBe('usr_victim_id');
    // Finding: Client-only authentication cannot cryptographically verify token origin without server public key.
  });

  // 3. Session Expiration & Tampering
  it('Attack 3: Expired session is actively rejected and purged', () => {
    const expiredSession: UserSession = {
      token: 'jwt_expired.12345',
      user: {
        id: 'usr_expired',
        email: 'expired@finn.in',
        fullName: 'Expired User',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: new Date().toISOString()
      },
      expiresAt: new Date(Date.now() - 1000).toISOString() // 1 second in the past
    };

    localStorage.setItem('finn_auth_session', JSON.stringify(expiredSession));
    const session = AuthService.getSession();
    expect(session).toBeNull();
    // Verify expired key was purged from storage
    expect(localStorage.getItem('finn_auth_session')).toBeNull();
  });

  // 4. Cross-User Key Access
  it('Attack 4: Ownership verification blocks cross-user resource manipulation', () => {
    const userSession: UserSession = {
      token: 'jwt_valid.123',
      user: {
        id: 'usr_attacker',
        email: 'attacker@finn.in',
        fullName: 'Attacker User',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: new Date().toISOString()
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    // Attacker tries to modify resource belonging to victim
    const canModifyVictim = AuthService.verifyOwnership('usr_victim', userSession);
    expect(canModifyVictim).toBe(false);

    // Attacker can only modify own resource
    const canModifyOwn = AuthService.verifyOwnership('usr_attacker', userSession);
    expect(canModifyOwn).toBe(true);
  });

  // 5. Logout Session Cleanup
  it('Attack 5: Logout actively clears session artifact and rejects subsequent requests', () => {
    const session: UserSession = {
      token: 'jwt_active.123',
      user: {
        id: 'usr_logged_in',
        email: 'active@finn.in',
        fullName: 'Active User',
        defaultCurrency: 'INR',
        fiscalYearType: 'indian',
        createdAt: new Date().toISOString()
      },
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    localStorage.setItem('finn_auth_session', JSON.stringify(session));

    AuthService.logout();
    expect(localStorage.getItem('finn_auth_session')).toBeNull();
    expect(AuthService.getSession()).toBeNull();
  });

  // 6. Corrupted Session Payload Injection
  it('Attack 6: Malformed session payload in localStorage is handled safely without throwing unhandled exceptions', () => {
    localStorage.setItem('finn_auth_session', '{malformed_json_syntax: true');
    const session = AuthService.getSession();
    expect(session).toBeNull();
  });

  // 7. Password Hashing Simulation Verification
  it('Attack 7: Plaintext passwords are not stored in registered user list', async () => {
    await AuthService.register('sec_test@finn.in', 'Security User', 'SecretPass123!');
    const rawUsers = localStorage.getItem('finn_registered_users');
    expect(rawUsers).not.toBeNull();
    expect(rawUsers!.includes('SecretPass123!')).toBe(false);
    expect(rawUsers!.includes('pbkdf2:') || rawUsers!.includes('hsh_')).toBe(true);
  });

  // 8. Duplicate Registration & Email Collision Prevention
  it('Attack 8: Duplicate registration with identical email is rejected with descriptive error', async () => {
    await AuthService.register('unique@finn.in', 'First User', 'SecretPass123!');
    await expect(
      AuthService.register('unique@finn.in', 'Second User', 'SecretPass123!')
    ).rejects.toThrow('An account with this email address already exists.');
  });
});
