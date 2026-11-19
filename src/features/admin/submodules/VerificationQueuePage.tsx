import React, { useMemo } from 'react';
import { CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
  VerificationTier,
} from '../../../domain/transit/types';
import { VerificationPill } from '../../../shared/ui/StatusPill';

interface VerificationQueuePageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  globalCityFilter: 'all' | CityId;
  onPromoteRoute: (routeId: string, nextTier: VerificationTier) => void;
  onInspectOnMap: (route: JeepneyRoute) => void;
}

export const VerificationQueuePage: React.FC<VerificationQueuePageProps> = ({
  cities,
  routes,
  globalCityFilter,
  onPromoteRoute,
  onInspectOnMap,
}) => {
  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const candidates = useMemo(() => {
    return routes
      .filter((r) =>
        globalCityFilter === 'all' ? true : r.cityId === globalCityFilter
      )
      .sort((a, b) => {
        const order: Record<VerificationTier, number> = {
          field_draft: 0,
          community_verified: 1,
          ltfrb_reference: 2,
        };
        return order[a.verificationStatus] - order[b.verificationStatus];
      });
  }, [routes, globalCityFilter]);

  return (
    <div className="space-y-3">
      {candidates.map((route) => {
        const city = cityById.get(route.cityId);
        const isDraft = route.verificationStatus === 'field_draft';
        const isCommunity = route.verificationStatus === 'community_verified';
        return (
          <div
            key={route.id}
            className="flex flex-col justify-between gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--foreground)]">
                  {route.code}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {city?.name ?? route.cityId}
                </span>
                <VerificationPill tier={route.verificationStatus} />
              </div>

              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {route.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {route.verificationNote}
              </p>

              <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-[var(--success)]"
                    aria-hidden="true"
                  />
                  {route.stops.length} stops mapped
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-[var(--success)]"
                    aria-hidden="true"
                  />
                  Signboard recorded
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onInspectOnMap(route)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspect</span>
              </button>

              {isDraft && (
                <button
                  type="button"
                  onClick={() => onPromoteRoute(route.id, 'community_verified')}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Verify corridor</span>
                </button>
              )}

              {isCommunity && (
                <button
                  type="button"
                  onClick={() => onPromoteRoute(route.id, 'ltfrb_reference')}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--success)]/35 bg-[var(--success-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--success)] hover:opacity-85"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Anchor LTFRB ref</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
