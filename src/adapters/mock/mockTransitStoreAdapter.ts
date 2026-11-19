import { TransitStorePort } from '../../domain/transit/transitStorePort';
import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from '../../domain/transit/types';
import {
  readStoredJson,
  removeStoredKey,
  STORAGE_KEYS,
  writeStoredJson,
} from '../browser/storage';
import { SEED_ADVISORIES } from './seedAdvisories';
import { SEED_FARE_RULES } from './seedFareRules';
import { SEED_REPORTS } from './seedReports';
import { SEED_ROUTES } from './seedRoutes';

export function buildSeedSnapshot(): TransitStoreSnapshot {
  return {
    routes: SEED_ROUTES,
    reports: SEED_REPORTS,
    fareRules: SEED_FARE_RULES,
    advisories: SEED_ADVISORIES,
  };
}

export function createMockTransitStoreAdapter(): TransitStorePort {
  let memorySnapshot: TransitStoreSnapshot | null = null;

  return {
    loadSnapshot(): TransitStoreSnapshot {
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
          fareRules: Array.isArray(stored.fareRules) && stored.fareRules.length > 0 ? stored.fareRules : seed.fareRules,
          advisories: Array.isArray(stored.advisories) ? stored.advisories : seed.advisories,
        };
        memorySnapshot = hydrated;
        return hydrated;
      }

      if (memorySnapshot) return memorySnapshot;

      const seed = buildSeedSnapshot();
      memorySnapshot = seed;
      return seed;
    },

    saveSnapshot(snapshot: TransitStoreSnapshot): void {
      memorySnapshot = snapshot;
      writeStoredJson(STORAGE_KEYS.transitSnapshot, snapshot, 'local');
    },

    resetSnapshot(): TransitStoreSnapshot {
      const fresh = buildSeedSnapshot();
      memorySnapshot = fresh;
      removeStoredKey(STORAGE_KEYS.transitSnapshot, 'local');
      return fresh;
    },

    submitFieldReport(input: NewFieldReportInput): CommunityReport {
      const current = this.loadSnapshot();
      const created: CommunityReport = {
        ...input,
        id: `REP-${210 + current.reports.length}`,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        triageStatus: 'needs-triage',
      };
      const next: TransitStoreSnapshot = {
        ...current,
        reports: [created, ...current.reports],
      };
      this.saveSnapshot(next);
      return created;
    },
  };
}
