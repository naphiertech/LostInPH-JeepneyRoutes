import { TransitStorePort } from '@/domain/transit/transitStorePort';
import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from '@/domain/transit/types';
import {
  readStoredJson,
  removeStoredKey,
  STORAGE_KEYS,
  writeStoredJson,
} from '@/adapters/browser/storage';
import { SEED_ADVISORIES } from './seeds/seedAdvisories';
import { SEED_AUDIT_LOGS } from './seeds/seedAuditLogs';
import { SEED_REPORTS } from './seeds/seedReports';
import { SEED_ROUTES } from './seeds/seedRoutes';

export function buildSeedSnapshot(): TransitStoreSnapshot {
  return {
    routes: SEED_ROUTES,
    reports: SEED_REPORTS,
    advisories: SEED_ADVISORIES,
    auditLogs: SEED_AUDIT_LOGS,
  };
}

export function createMockTransitStoreAdapter(): TransitStorePort {
  let memorySnapshot: TransitStoreSnapshot | null = null;
  const listeners = new Set<(snapshot: TransitStoreSnapshot) => void>();

  const emit = (snapshot: TransitStoreSnapshot) => {
    listeners.forEach((fn) => fn(snapshot));
  };

  const readSnapshotSync = (): TransitStoreSnapshot => {
    const stored = readStoredJson<Partial<TransitStoreSnapshot>>(
      STORAGE_KEYS.transitSnapshot,
      'local'
    );
    if (stored) {
      const seed = buildSeedSnapshot();
      const seedRouteMap = new Map(seed.routes.map((r) => [r.id, r]));
      const hydratedRoutes =
        Array.isArray(stored.routes) && stored.routes.length > 0
          ? stored.routes.map((r) => {
              const seedRoute = seedRouteMap.get(r.id);
              if (seedRoute && r.path.length < seedRoute.path.length) {
                return {
                  ...r,
                  stops: seedRoute.stops,
                  path: seedRoute.path,
                };
              }
              return r;
            })
          : seed.routes;
      const hydrated: TransitStoreSnapshot = {
        routes: hydratedRoutes,
        reports: Array.isArray(stored.reports) ? stored.reports : seed.reports,
        advisories: Array.isArray(stored.advisories)
          ? stored.advisories
          : seed.advisories,
        auditLogs: Array.isArray(stored.auditLogs)
          ? stored.auditLogs
          : seed.auditLogs,
      };
      memorySnapshot = hydrated;
      return hydrated;
    }

    if (memorySnapshot) return memorySnapshot;

    const seed = buildSeedSnapshot();
    memorySnapshot = seed;
    return seed;
  };

  return {
    getCachedSnapshot(): TransitStoreSnapshot {
      return readSnapshotSync();
    },

    async loadSnapshot(): Promise<TransitStoreSnapshot> {
      return readSnapshotSync();
    },

    async saveSnapshot(snapshot: TransitStoreSnapshot): Promise<void> {
      memorySnapshot = snapshot;
      writeStoredJson(STORAGE_KEYS.transitSnapshot, snapshot, 'local');
      emit(snapshot);
    },

    async resetSnapshot(): Promise<TransitStoreSnapshot> {
      const fresh = buildSeedSnapshot();
      memorySnapshot = fresh;
      removeStoredKey(STORAGE_KEYS.transitSnapshot, 'local');
      emit(fresh);
      return fresh;
    },

    async submitFieldReport(
      input: NewFieldReportInput
    ): Promise<CommunityReport> {
      const current = readSnapshotSync();
      const created: CommunityReport = {
        ...input,
        id: `REP-${210 + current.reports.length}`,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        triageStatus: 'needs-triage',
      };
      const next: TransitStoreSnapshot = {
        ...current,
        reports: [created, ...current.reports],
        auditLogs: [
          {
            id: `AUD-${105 + current.auditLogs.length}`,
            timestamp: created.createdAt,
            actorName: created.reporterName,
            actorRole: 'app',
            category: 'report',
            action: 'Submitted commuter report',
            target: `${created.id} (${created.routeCode})`,
            cityId: created.cityId,
            details: created.summary,
          },
          ...current.auditLogs,
        ],
      };
      memorySnapshot = next;
      writeStoredJson(STORAGE_KEYS.transitSnapshot, next, 'local');
      emit(next);
      return created;
    },

    subscribe(listener: (snapshot: TransitStoreSnapshot) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
