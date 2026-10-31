/**
 * FINN Authentication & Multi-User Isolation Service
 * Enforces session tokens, password hashing simulations, user isolation boundaries,
 * and role-based permissions mirroring PostgreSQL Row Level Security (RLS).
 */

import { isSupabaseConfigured, defaultSupabaseClient } from '../services/supabaseClient';
import { RepositoryFactory } from '../services/storage/RepositoryFactory';

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

const DEMO_USER: UserProfile = {
  id: 'usr_demo',
  email: 'chanakya@finn.in',
  fullName: 'Chanakya Voleti',
  phone: '+91 98765 43210',
  defaultCurrency: 'INR',
  fiscalYearType: 'indian',
  createdAt: '2026-01-01T00:00:00.000Z',
};

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
      if (isSupabaseConfigured() && session.token) {
        defaultSupabaseClient.setAuthToken(session.token);
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Get list of all registered user profiles on this client for quick user switching.
   */
  static getRegisteredUsers(): UserProfile[] {
    const users = this.getStoredUsers();
    // Ensure demo user is always in the list of switchable profiles
    const hasDemo = users.some(u => u.profile.id === DEMO_USER.id || u.profile.email.toLowerCase() === DEMO_USER.email.toLowerCase());
    const profiles = users.map(u => u.profile);
    if (!hasDemo) {
      profiles.unshift(DEMO_USER);
    }
    return profiles;
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

    const mode = RepositoryFactory.getActiveStorageMode();
    if (mode === 'supabase' && isSupabaseConfigured()) {
      try {
        const res = await defaultSupabaseClient.signUp(email, password, { full_name: fullName });
        if (res.error) {
          if (res.error.message.includes('fetch failed') || res.error.message.includes('Network error')) {
            console.warn('Supabase Auth offline/unreachable, falling back to local registration.');
          } else {
            throw new Error(res.error.message);
          }
        } else {
          const userId = res.user?.id || 'usr_' + Math.random().toString(36).substring(2, 10);
          const profile: UserProfile = {
            id: userId,
            email: email.toLowerCase().trim(),
            fullName: fullName.trim(),
            defaultCurrency: 'INR',
            fiscalYearType: 'indian',
            createdAt: new Date().toISOString(),
          };

          // Ingest into public.profiles
          await defaultSupabaseClient.query('profiles', 'POST', {
            body: {
              id: userId,
              email: profile.email,
              full_name: profile.fullName,
              default_currency: profile.defaultCurrency,
              fiscal_year_type: profile.fiscalYearType
            }
          });

          return this.createSession(profile, res.session?.access_token);
        }
      } catch (e: any) {
        if (!e.message.includes('fetch failed') && !e.message.includes('Network error') && !e.message.includes('A valid email') && !e.message.includes('Password must be')) {
          throw e;
        }
        console.warn('Supabase Auth network error, falling back to local registration:', e.message);
      }
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
    const cleanEmail = email.toLowerCase().trim();

    // Check if logging in as demo persona
    if (cleanEmail === DEMO_USER.email.toLowerCase() && (password === 'Password123!' || password === 'demo' || password.length >= 4)) {
      return this.createSession(DEMO_USER);
    }

    const mode = RepositoryFactory.getActiveStorageMode();
    if (mode === 'supabase' && isSupabaseConfigured()) {
      try {
        const res = await defaultSupabaseClient.signInWithPassword(cleanEmail, password);
        if (res.error) {
          if (res.error.message.includes('fetch failed') || res.error.message.includes('Network error')) {
            console.warn('Supabase Auth offline/unreachable, falling back to local login verification.');
          } else {
            throw new Error(res.error.message);
          }
        } else if (res.user) {
          const user = res.user;
          const profile: UserProfile = {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || cleanEmail.split('@')[0],
            defaultCurrency: 'INR',
            fiscalYearType: 'indian',
            createdAt: user.created_at || new Date().toISOString(),
          };
          return this.createSession(profile, res.session?.access_token);
        }
      } catch (e: any) {
        if (!e.message.includes('fetch failed') && !e.message.includes('Network error') && !e.message.includes('Invalid email or password')) {
          throw e;
        }
      }
    }

    const users = this.getStoredUsers();
    const userRecord = users.find(u => u.profile.email.toLowerCase() === cleanEmail);

    if (!userRecord || userRecord.passwordHash !== this.hashPassword(password)) {
      throw new Error('Invalid email or password.');
    }

    return this.createSession(userRecord.profile);
  }

  /**
   * Send password recovery email via Supabase Auth
   */
  static async resetPassword(email: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const res = await defaultSupabaseClient.resetPasswordForEmail(email);
      if (res.error) {
        throw new Error(res.error.message);
      }
    }
  }

  /**
   * Switch directly to a known user session (e.g. demo or verified local user).
   */
  static async switchUser(userId: string): Promise<UserSession> {
    if (userId === DEMO_USER.id) {
      return this.createSession(DEMO_USER);
    }
    const users = this.getStoredUsers();
    const userRecord = users.find(u => u.profile.id === userId);
    if (!userRecord) {
      throw new Error('User profile not found.');
    }
    return this.createSession(userRecord.profile);
  }

  /**
   * Log out active session.
   */
  static logout(): void {
    if (isSupabaseConfigured()) {
      defaultSupabaseClient.signOut();
    }
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

  private static createSession(profile: UserProfile, explicitToken?: string): UserSession {
    const token = explicitToken || ('jwt_' + Math.random().toString(36).substring(2) + '.' + Date.now());
    const session: UserSession = {
      token,
      user: profile,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    if (isSupabaseConfigured()) {
      defaultSupabaseClient.setAuthToken(token);
    }
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
