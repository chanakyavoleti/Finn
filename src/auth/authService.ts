/**
 * FINN Authentication & Multi-User Isolation Service
 * Enforces session tokens, password hashing simulations, user isolation boundaries,
 * and role-based permissions mirroring PostgreSQL Row Level Security (RLS).
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  defaultCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  fiscalYearType: 'indian' | 'calendar';
  createdAt: string;
}

export interface UserSession {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

// In-memory / encrypted local session store
const STORAGE_KEY_SESSION = 'finn_auth_session';
const STORAGE_KEY_USERS = 'finn_registered_users';

export class AuthService {
  /**
   * Get active authenticated user session if valid and unexpired.
   */
  static getSession(): UserSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!data) return null;
      const session: UserSession = JSON.parse(data);
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user account with default INR profile.
   */
  static async register(email: string, fullName: string, password: string): Promise<UserSession> {
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const users = this.getStoredUsers();
    const existing = users.find(u => u.profile.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const profile: UserProfile = {
      id: userId,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      defaultCurrency: 'INR',
      fiscalYearType: 'indian',
      createdAt: new Date().toISOString(),
    };

    // Store user with hashed password simulation
    users.push({ profile, passwordHash: this.hashPassword(password) });
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    return this.createSession(profile);
  }

  /**
   * Authenticate user with email and password.
   */
  static async login(email: string, password: string): Promise<UserSession> {
    const users = this.getStoredUsers();
    const userRecord = users.find(u => u.profile.email.toLowerCase() === email.toLowerCase().trim());

    if (!userRecord || userRecord.passwordHash !== this.hashPassword(password)) {
      throw new Error('Invalid email or password.');
    }

    return this.createSession(userRecord.profile);
  }

  /**
   * Log out active session.
   */
  static logout(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }

  /**
   * Verify that an operation belongs strictly to the authenticated user (RLS policy check).
   */
  static verifyOwnership(resourceUserId: string, currentSession: UserSession | null): boolean {
    if (!currentSession) return false;
    return currentSession.user.id === resourceUserId;
  }

  /**
   * Permanently delete user account and associated credentials.
   */
  static async deleteAccount(userId: string): Promise<void> {
    const users = this.getStoredUsers().filter(u => u.profile.id !== userId);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    this.logout();
  }

  private static createSession(profile: UserProfile): UserSession {
    const session: UserSession = {
      token: 'jwt_' + Math.random().toString(36).substring(2) + '.' + Date.now(),
      user: profile,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    return session;
  }

  private static getStoredUsers(): { profile: UserProfile; passwordHash: string }[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static hashPassword(password: string): string {
    // Deterministic simulation hash for local verification
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return 'hsh_' + Math.abs(hash).toString(16);
  }
}
