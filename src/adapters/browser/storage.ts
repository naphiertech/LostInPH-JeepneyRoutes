export function readStoredJson<T>(
  key: string,
  storageKind: 'local' | 'session' = 'local'
): T | null {
  try {
    const store =
      storageKind === 'local' ? window.localStorage : window.sessionStorage;
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStoredJson<T>(
  key: string,
  value: T,
  storageKind: 'local' | 'session' = 'local'
): void {
  try {
    const store =
      storageKind === 'local' ? window.localStorage : window.sessionStorage;
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function removeStoredKey(
  key: string,
  storageKind: 'local' | 'session' | 'both' = 'both'
): void {
  try {
    if (storageKind === 'local' || storageKind === 'both') {
      window.localStorage.removeItem(key);
    }
    if (storageKind === 'session' || storageKind === 'both') {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export type ColorSchemeSetting = 'system' | 'light' | 'dark';

export interface CommuterNotificationPrefs {
  detours: boolean;
  savedRoutes: boolean;
  fareAndReports: boolean;
}

export const DEFAULT_COMMUTER_NOTIFICATION_PREFS: CommuterNotificationPrefs = {
  detours: true,
  savedRoutes: true,
  fareAndReports: true,
};

export const STORAGE_KEYS = {
  authSession: 'lostinph.auth.session.v2',
  transitSnapshot: 'lostinph.transit.snapshot.v2',
  savedRoutes: 'lostinph.commuter.savedRoutes.v2',
  commuterNotificationPrefs: 'lostinph.commuter.notificationPrefs.v1',
  colorScheme: 'color-scheme',
  defaultAdminCity: 'lostinph.admin.defaultCity.v2',
} as const;
