import { FinanceRepository } from './FinanceRepository';
import { LocalStorageRepository } from './LocalStorageRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { isSupabaseConfigured, defaultSupabaseClient } from '../supabaseClient';

export type StorageMode = 'local' | 'supabase';

let activeStorageModeOverride: StorageMode | null = null;

export const RepositoryFactory = {
  /**
   * Sets explicit storage mode override (used for testing or runtime toggle)
   */
  setStorageMode(mode: StorageMode | null): void {
    activeStorageModeOverride = mode;
  },

  /**
   * Resolves the active storage mode:
   * 1. Manual override if specified
   * 2. VITE_STORAGE_MODE if configured and credentials exist
   * 3. Defaults to 'local' for security and zero-breakage resilience
   */
  getActiveStorageMode(): StorageMode {
    if (activeStorageModeOverride) {
      return activeStorageModeOverride;
    }

    try {
      const envMode = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STORAGE_MODE) || 'local';
      if (envMode === 'supabase' && isSupabaseConfigured()) {
        return 'supabase';
      }
    } catch {
      // In testing or non-Vite environment
    }

    return 'local';
  },

  /**
   * Obtains a repository instance matching the active storage mode
   */
  getRepository(): FinanceRepository {
    const mode = this.getActiveStorageMode();
    if (mode === 'supabase') {
      return new SupabaseRepository(defaultSupabaseClient);
    }
    return new LocalStorageRepository();
  }
};
