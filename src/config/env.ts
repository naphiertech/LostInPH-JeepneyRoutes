export type DataProviderKind = 'mock' | 'supabase';

export interface AppEnvConfig {
  dataProvider: DataProviderKind;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseReady: boolean;
}

function readEnv(key: string): string {
  const value = (import.meta as unknown as { env?: Record<string, string | undefined> })
    .env?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function getAppEnv(): AppEnvConfig {
  const supabaseUrl = readEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY');
  const rawProvider = readEnv('VITE_DATA_PROVIDER').toLowerCase();
  const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey);
  const dataProvider: DataProviderKind =
    rawProvider === 'supabase' && isSupabaseReady ? 'supabase' : 'mock';

  return {
    dataProvider,
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseReady,
  };
}
