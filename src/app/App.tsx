import { lazy, Suspense, useEffect, useState } from 'react';
import { ColorSchemeSetting, STORAGE_KEYS } from '@/adapters/browser/storage';
import { SEED_CITIES } from '@/adapters/mock/seeds/seedCities';
import { AuthPort } from '@/domain/auth/authPort';
import { AuthSession } from '@/domain/auth/types';
import { PresencePort } from '@/domain/telemetry/presencePort';
import { TransitStorePort } from '@/domain/transit/transitStorePort';
import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from '@/domain/transit/types';
import { AuthWorkspace } from '@/features/auth/AuthWorkspace';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { NotificationProvider } from '@/shared/ui/NotificationCenter';
import { createAppContainer } from './container';

const AdminWorkspace = lazy(() =>
  import('@/features/admin/AdminWorkspace').then((m) => ({
    default: m.AdminWorkspace,
  }))
);

const CommuterWorkspace = lazy(() =>
  import('@/features/commuter/CommuterWorkspace').then((m) => ({
    default: m.CommuterWorkspace,
  }))
);

interface AppProps {
  authPort?: AuthPort;
  transitStore?: TransitStorePort;
  presencePort?: PresencePort;
}

const defaultContainer = createAppContainer();

function WorkspaceLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh items-center justify-center bg-[var(--background)] text-sm text-[var(--text-secondary)]"
    >
      Loading workspace…
    </div>
  );
}

export function App({
  authPort = defaultContainer.authPort,
  transitStore = defaultContainer.transitStore,
  presencePort = defaultContainer.presencePort,
}: AppProps) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    authPort.getCachedSession()
  );
  const [snapshot, setSnapshot] = useState<TransitStoreSnapshot>(() =>
    transitStore.getCachedSnapshot()
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

  // Hydrate async session & transit store + subscribe to Supabase-ready realtime updates
  useEffect(() => {
    let active = true;
    void authPort.loadSession().then((loaded) => {
      if (active) setSession(loaded);
    });
    const unsubscribeAuth = authPort.onAuthStateChange((next) => {
      if (active) setSession(next);
    });
    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, [authPort]);

  useEffect(() => {
    let active = true;
    void transitStore.loadSnapshot().then((loaded) => {
      if (active) setSnapshot(loaded);
    });
    const unsubscribeStore = transitStore.subscribe((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
      unsubscribeStore();
    };
  }, [transitStore]);

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
      void transitStore.saveSnapshot(next);
      return next;
    });
  };

  const handleResetSnapshot = () => {
    void transitStore.resetSnapshot().then((fresh) => setSnapshot(fresh));
  };

  const handleSignOut = () => {
    void authPort.signOut().then(() => setSession(null));
  };

  const handleSubmitFieldReport = async (
    input: NewFieldReportInput
  ): Promise<CommunityReport> => {
    const created = await transitStore.submitFieldReport(input);
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

  // 2) Admin role -> Operations Dashboard ONLY (lazy-loaded chunk)
  if (session.user.role === 'admin') {
    return (
      <NotificationProvider key="admin" scope="admin">
        <ErrorBoundary scopeLabel="Admin Dashboard">
          <Suspense fallback={<WorkspaceLoadingFallback />}>
            <AdminWorkspace
              currentUser={session.user}
              cities={SEED_CITIES}
              snapshot={snapshot}
              presencePort={presencePort}
              onUpdateSnapshot={handleUpdateSnapshot}
              onResetSnapshot={handleResetSnapshot}
              schemeSetting={schemeSetting}
              onChangeScheme={setSchemeSetting}
              onSignOut={handleSignOut}
            />
          </Suspense>
        </ErrorBoundary>
      </NotificationProvider>
    );
  }

  // 3) App role -> Commuter App UI ONLY (lazy-loaded chunk)
  return (
    <NotificationProvider key="commuter" scope="commuter">
      <ErrorBoundary scopeLabel="Commuter Workspace">
        <Suspense fallback={<WorkspaceLoadingFallback />}>
          <CommuterWorkspace
            currentUser={session.user}
            cities={SEED_CITIES}
            routes={snapshot.routes}
            advisories={snapshot.advisories}
            presencePort={presencePort}
            onSubmitFieldReport={handleSubmitFieldReport}
            schemeSetting={schemeSetting}
            onChangeScheme={setSchemeSetting}
            onSignOut={handleSignOut}
          />
        </Suspense>
      </ErrorBoundary>
    </NotificationProvider>
  );
}

export default App;
