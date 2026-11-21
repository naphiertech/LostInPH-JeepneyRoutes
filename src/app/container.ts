import { createMockAuthAdapter } from '@/adapters/mock/mockAuthAdapter';
import { createMockPresenceAdapter } from '@/adapters/mock/mockPresenceAdapter';
import { createMockTransitStoreAdapter } from '@/adapters/mock/mockTransitStoreAdapter';
import { createSupabaseAdapters } from '@/adapters/supabase';
import { getAppEnv } from '@/config/env';
import { AuthPort } from '@/domain/auth/authPort';
import { PresencePort } from '@/domain/telemetry/presencePort';
import { TransitStorePort } from '@/domain/transit/transitStorePort';

export interface AppContainer {
  authPort: AuthPort;
  transitStore: TransitStorePort;
  presencePort: PresencePort;
}

export function createAppContainer(): AppContainer {
  const env = getAppEnv();
  if (env.dataProvider === 'supabase' && env.isSupabaseReady) {
    return createSupabaseAdapters({
      url: env.supabaseUrl,
      anonKey: env.supabaseAnonKey,
    });
  }

  return {
    authPort: createMockAuthAdapter(),
    transitStore: createMockTransitStoreAdapter(),
    presencePort: createMockPresenceAdapter(),
  };
}
