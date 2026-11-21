/**
 * Ready-to-wire Supabase adapter contracts.
 * When enabling VITE_DATA_PROVIDER=supabase:
 *   1. pnpm add @supabase/supabase-js
 *   2. Fill VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in .env.local
 *   3. Apply supabase/migrations/001_initial_schema.sql
 *   4. Replace the stub bodies below with createClient(url, anonKey) calls.
 */
import { AuthPort } from '@/domain/auth/authPort';
import { PresencePort } from '@/domain/telemetry/presencePort';
import { TransitStorePort } from '@/domain/transit/transitStorePort';
import { createMockAuthAdapter } from '@/adapters/mock/mockAuthAdapter';
import { createMockPresenceAdapter } from '@/adapters/mock/mockPresenceAdapter';
import { createMockTransitStoreAdapter } from '@/adapters/mock/mockTransitStoreAdapter';

export interface SupabaseAdapterConfig {
  url: string;
  anonKey: string;
}

export function createSupabaseAdapters(_config: SupabaseAdapterConfig): {
  authPort: AuthPort;
  transitStore: TransitStorePort;
  presencePort: PresencePort;
} {
  // Falls back safely to the local mock adapters until @supabase/supabase-js is installed & wired.
  return {
    authPort: createMockAuthAdapter(),
    transitStore: createMockTransitStoreAdapter(),
    presencePort: createMockPresenceAdapter(),
  };
}
