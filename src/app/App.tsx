import { useEffect, useState } from 'react';
import { ColorSchemeSetting, STORAGE_KEYS } from '../adapters/browser/storage';
import { createMockAuthAdapter } from '../adapters/mock/mockAuthAdapter';
import { createMockTransitStoreAdapter } from '../adapters/mock/mockTransitStoreAdapter';
import { SEED_CITIES } from '../adapters/mock/seedCities';
import { AuthPort } from '../domain/auth/authPort';
import { AuthSession } from '../domain/auth/types';
import { TransitStorePort } from '../domain/transit/transitStorePort';
import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from '../domain/transit/types';
import { AdminWorkspace } from '../features/admin/AdminWorkspace';
import { AuthWorkspace } from '../features/auth/AuthWorkspace';
import { CommuterWorkspace } from '../features/commuter/CommuterWorkspace';
import { NotificationProvider } from '../shared/ui/NotificationCenter';

interface AppProps {
  authPort?: AuthPort;
  transitStore?: TransitStorePort;
}

const defaultAuthPort = createMockAuthAdapter();
const defaultTransitStore = createMockTransitStoreAdapter();

export function App({
  authPort = defaultAuthPort,
  transitStore = defaultTransitStore,
}: AppProps) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    authPort.loadSession()
  );
  const [snapshot, setSnapshot] = useState<TransitStoreSnapshot>(() =>
    transitStore.loadSnapshot()
  );
  const [schemeSetting, setSchemeSetting] = useState<ColorSchemeSetting>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.colorScheme);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="color-scheme"]');
    const content = schemeSetting === 'system' ? 'light dark' : schemeSetting;
    if (meta) {
      meta.setAttribute('content', content);
    }

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const syncClasses = () => {
      const systemPrefersDark = media?.matches ?? false;
      const isDark =
        schemeSetting === 'dark' ||
        (schemeSetting === 'system' && systemPrefersDark);
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', schemeSetting === 'light');
    };
    syncClasses();

    if (schemeSetting === 'system' && media?.addEventListener) {
      media.addEventListener('change', syncClasses);
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.colorScheme, schemeSetting);
    } catch {
      // Ignore storage access restrictions
    }
    return () => {
      media?.removeEventListener?.('change', syncClasses);
    };
  }, [schemeSetting]);

  const handleUpdateSnapshot = (
    updater: (prev: TransitStoreSnapshot) => TransitStoreSnapshot
  ) => {
    setSnapshot((prev) => {
      const next = updater(prev);
      transitStore.saveSnapshot(next);
      return next;
    });
  };

  const handleResetSnapshot = () => {
    const fresh = transitStore.resetSnapshot();
    setSnapshot(fresh);
  };

  const handleSignOut = () => {
    authPort.signOut();
    setSession(null);
  };

  const handleSubmitFieldReport = (
    input: NewFieldReportInput
  ): CommunityReport => {
    const created = transitStore.submitFieldReport(input);
    setSnapshot((prev) => ({
      ...prev,
      reports: [created, ...prev.reports.filter((r) => r.id !== created.id)],
    }));
    return created;
  };

  // Strict Role Isolation Seam:
  // 1) Unauthenticated -> Split-screen Login only
  if (!session) {
    return (
      <NotificationProvider key="auth" scope="commuter">
        <AuthWorkspace
          authPort={authPort}
          cities={SEED_CITIES}
          onAuthenticated={setSession}
        />
      </NotificationProvider>
    );
  }

  // 2) Admin role -> Operations Dashboard ONLY
  if (session.user.role === 'admin') {
    return (
      <NotificationProvider key="admin" scope="admin">
        <AdminWorkspace
          currentUser={session.user}
          cities={SEED_CITIES}
          snapshot={snapshot}
          onUpdateSnapshot={handleUpdateSnapshot}
          onResetSnapshot={handleResetSnapshot}
          schemeSetting={schemeSetting}
          onChangeScheme={setSchemeSetting}
          onSignOut={handleSignOut}
        />
      </NotificationProvider>
    );
  }

  // 3) App role -> Commuter App UI ONLY
  return (
    <NotificationProvider key="commuter" scope="commuter">
      <CommuterWorkspace
        currentUser={session.user}
        cities={SEED_CITIES}
        routes={snapshot.routes}
        fareRules={snapshot.fareRules}
        advisories={snapshot.advisories}
        onSubmitFieldReport={handleSubmitFieldReport}
        schemeSetting={schemeSetting}
        onChangeScheme={setSchemeSetting}
        onSignOut={handleSignOut}
      />
    </NotificationProvider>
  );
}

export default App;
