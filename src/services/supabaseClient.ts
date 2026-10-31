/**
 * Supabase Client & Configuration Adapter
 * 
 * Provides typed access to Supabase PostgREST & Auth endpoints.
 * Operates gracefully even when Supabase environment variables are missing,
 * allowing FINN to fall back automatically to LocalStorageRepository.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: { message: string; details?: string; code?: string } | null;
  status: number;
}

export class SupabaseClientAdapter {
  private config: SupabaseConfig | null = null;
  private currentAccessToken: string | null = null;

  constructor(config?: SupabaseConfig | null) {
    if (config === null) {
      this.config = null;
    } else if (config && config.url && config.anonKey) {
      this.config = config;
    } else {
      this.config = this.loadConfigFromEnv();
    }
  }

  private loadConfigFromEnv(): SupabaseConfig | null {
    try {
      const url = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
      const anonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';
      if (url && anonKey) {
        return { url, anonKey };
      }
    } catch {
      // In non-Vite or Node testing environments
    }
    return null;
  }

  public isConfigured(): boolean {
    return Boolean(this.config && this.config.url && this.config.anonKey);
  }

  public getConfig(): SupabaseConfig | null {
    return this.config;
  }

  public setAuthToken(token: string | null): void {
    this.currentAccessToken = token;
  }

  public getAuthToken(): string | null {
    return this.currentAccessToken;
  }

  /**
   * Universal PostgREST query execution
   */
  public async query<T = any>(
    table: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    params: {
      select?: string;
      filters?: Record<string, string>;
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<SupabaseResponse<T>> {
    if (!this.isConfigured() || !this.config) {
      return {
        data: null,
        error: { message: 'Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.' },
        status: 0
      };
    }

    try {
      const url = new URL(`${this.config.url.replace(/\/$/, '')}/rest/v1/${table}`);
      if (params.select) {
        url.searchParams.set('select', params.select);
      }
      if (params.filters) {
        Object.entries(params.filters).forEach(([col, val]) => {
          url.searchParams.set(col, val);
        });
      }

      const reqHeaders: Record<string, string> = {
        'apikey': this.config.anonKey,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal',
        ...params.headers
      };

      if (this.currentAccessToken) {
        reqHeaders['Authorization'] = `Bearer ${this.currentAccessToken}`;
      } else {
        reqHeaders['Authorization'] = `Bearer ${this.config.anonKey}`;
      }

      const response = await fetch(url.toString(), {
        method,
        headers: reqHeaders,
        body: params.body ? JSON.stringify(params.body) : undefined
      });

      let resData: any = null;
      const text = await response.text();
      if (text) {
        try {
          resData = JSON.parse(text);
        } catch {
          resData = text;
        }
      }

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: resData?.message || `Supabase query failed with HTTP ${response.status}`,
            details: resData?.details || resData?.hint,
            code: resData?.code || String(response.status)
          },
          status: response.status
        };
      }

      return {
        data: resData as T,
        error: null,
        status: response.status
      };
    } catch (err: any) {
      return {
        data: null,
        error: { message: err?.message || 'Network error communicating with Supabase' },
        status: 0
      };
    }
  }


  /**
   * Universal PostgREST RPC function execution: POST /rest/v1/rpc/{functionName}
   */
  public async rpc<T = any>(
    functionName: string,
    params: Record<string, any> = {}
  ): Promise<SupabaseResponse<T>> {
    if (!this.isConfigured() || !this.config) {
      return {
        data: null,
        error: { message: 'Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.' },
        status: 0
      };
    }

    try {
      const url = `${this.config.url.replace(/\/$/, '')}/rest/v1/rpc/${functionName}`;
      const reqHeaders: Record<string, string> = {
        'apikey': this.config.anonKey,
        'Content-Type': 'application/json'
      };

      if (this.currentAccessToken) {
        reqHeaders['Authorization'] = `Bearer ${this.currentAccessToken}`;
      } else {
        reqHeaders['Authorization'] = `Bearer ${this.config.anonKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(params)
      });

      let resData: any = null;
      const text = await response.text();
      if (text) {
        try {
          resData = JSON.parse(text);
        } catch {
          resData = text;
        }
      }

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: resData?.message || `RPC ${functionName} failed with HTTP ${response.status}`,
            details: resData?.details || resData?.hint,
            code: resData?.code || String(response.status)
          },
          status: response.status
        };
      }

      return {
        data: resData as T,
        error: null,
        status: response.status
      };
    } catch (err: any) {
      return {
        data: null,
        error: { message: err?.message || `Network error executing RPC ${functionName}` },
        status: 0
      };
    }
  }

  // ============================================================================
  // GENUINE SUPABASE AUTHENTICATION API METHODS (/auth/v1)
  // ============================================================================

  /**
   * Register a user with Supabase Auth: POST /auth/v1/signup
   */
  public async signUp(
    email: string,
    password: string,
    data: { full_name?: string } = {}
  ): Promise<{ session: any | null; user: any | null; error: { message: string } | null }> {
    if (!this.isConfigured() || !this.config) {
      return { session: null, user: null, error: { message: 'Supabase is not configured' } };
    }

    try {
      const url = `${this.config.url.replace(/\/$/, '')}/auth/v1/signup`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          data
        })
      });

      const body = await res.json();
      if (!res.ok) {
        return { session: null, user: null, error: { message: body.msg || body.message || body.error_description || 'Signup failed' } };
      }

      if (body.access_token) {
        this.setAuthToken(body.access_token);
      }

      return {
        session: body.access_token ? body : null,
        user: body.user || body,
        error: null
      };
    } catch (err: any) {
      return { session: null, user: null, error: { message: err?.message || 'Network error during signup' } };
    }
  }

  /**
   * Authenticate a user with email and password: POST /auth/v1/token?grant_type=password
   */
  public async signInWithPassword(
    email: string,
    password: string
  ): Promise<{ session: any | null; user: any | null; error: { message: string } | null }> {
    if (!this.isConfigured() || !this.config) {
      return { session: null, user: null, error: { message: 'Supabase is not configured' } };
    }

    try {
      const url = `${this.config.url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const body = await res.json();
      if (!res.ok) {
        return { session: null, user: null, error: { message: body.error_description || body.msg || body.message || 'Invalid login credentials' } };
      }

      if (body.access_token) {
        this.setAuthToken(body.access_token);
      }

      return {
        session: body,
        user: body.user,
        error: null
      };
    } catch (err: any) {
      return { session: null, user: null, error: { message: err?.message || 'Network error during login' } };
    }
  }

  /**
   * Log out active session: POST /auth/v1/logout
   */
  public async signOut(): Promise<{ error: { message: string } | null }> {
    if (!this.isConfigured() || !this.config) {
      this.setAuthToken(null);
      return { error: null };
    }

    try {
      if (this.currentAccessToken) {
        const url = `${this.config.url.replace(/\/$/, '')}/auth/v1/logout`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': this.config.anonKey,
            'Authorization': `Bearer ${this.currentAccessToken}`
          }
        });
      }
    } catch {
      // Ignore network errors on logout to ensure client session is always cleared
    } finally {
      this.setAuthToken(null);
    }

    return { error: null };
  }

  /**
   * Send password recovery email: POST /auth/v1/recover
   */
  public async resetPasswordForEmail(
    email: string
  ): Promise<{ error: { message: string } | null }> {
    if (!this.isConfigured() || !this.config) {
      return { error: { message: 'Supabase is not configured' } };
    }

    try {
      const url = `${this.config.url.replace(/\/$/, '')}/auth/v1/recover`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.config.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const body = await res.json();
        return { error: { message: body.msg || body.message || 'Failed to send recovery email' } };
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Network error during password reset' } };
    }
  }

  /**
   * Fetch current user info with JWT: GET /auth/v1/user
   */
  public async getUser(): Promise<{ user: any | null; error: { message: string } | null }> {
    if (!this.isConfigured() || !this.config || !this.currentAccessToken) {
      return { user: null, error: { message: 'No active session or Supabase not configured' } };
    }

    try {
      const url = `${this.config.url.replace(/\/$/, '')}/auth/v1/user`;
      const res = await fetch(url, {
        headers: {
          'apikey': this.config.anonKey,
          'Authorization': `Bearer ${this.currentAccessToken}`
        }
      });

      if (!res.ok) {
        return { user: null, error: { message: 'Session expired or invalid' } };
      }

      const user = await res.json();
      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: { message: err?.message || 'Network error checking user session' } };
    }
  }
}

export const defaultSupabaseClient = new SupabaseClientAdapter();

export function isSupabaseConfigured(): boolean {
  return defaultSupabaseClient.isConfigured();
}
