import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Navigation,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { auditTransitNetwork } from '@/domain/transit/routeAudit';
import {
  createMapPinpoint,
  getUniqueCityStops,
  recommendTripsFromOriginToPinpoint,
} from '@/domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
  MapPinpoint,
  RouteHealthSeverity,
} from '@/domain/transit/types';
import { TransitMap } from '@/shared/map/TransitMap';
import { KpiMetric } from '@/shared/ui/KpiMetric';

interface RouteQaSimulatorPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  advisories: CorridorAdvisory[];
  globalCityFilter: 'all' | CityId;
  onInspectRoute: (route: JeepneyRoute) => void;
  onAutoSnapRoute: (routeId: string) => void;
  onResolveAdvisory: (advisoryId: string) => void;
}

export const RouteQaSimulatorPage: React.FC<RouteQaSimulatorPageProps> = ({
  cities,
  routes,
  advisories,
  globalCityFilter,
  onInspectRoute,
  onAutoSnapRoute,
  onResolveAdvisory,
}) => {
  const [severityFilter, setSeverityFilter] = useState<
    'all' | RouteHealthSeverity
  >('all');

  const scopedRoutes = useMemo(
    () =>
      globalCityFilter === 'all'
        ? routes
        : routes.filter((r) => r.cityId === globalCityFilter),
    [routes, globalCityFilter]
  );

  const scopedAdvisories = useMemo(
    () =>
      globalCityFilter === 'all'
        ? advisories
        : advisories.filter((a) => a.cityId === globalCityFilter),
    [advisories, globalCityFilter]
  );

  const healthReport = useMemo(
    () => auditTransitNetwork(scopedRoutes, scopedAdvisories, cities),
    [scopedRoutes, scopedAdvisories, cities]
  );

  const filteredIssues = useMemo(
    () =>
      severityFilter === 'all'
        ? healthReport.issues
        : healthReport.issues.filter((i) => i.severity === severityFilter),
    [healthReport.issues, severityFilter]
  );

  const routeById = useMemo(
    () => new Map(routes.map((r) => [r.id, r])),
    [routes]
  );

  // Origin -> Pinpoint Recommendation Simulator State
  const [simCityId, setSimCityId] = useState<CityId>(
    globalCityFilter === 'all' ? 'cebu' : globalCityFilter
  );

  useEffect(() => {
    if (globalCityFilter !== 'all') {
      setSimCityId(globalCityFilter);
    }
  }, [globalCityFilter]);

  const simCity = useMemo(
    () => cities.find((c) => c.id === simCityId) ?? cities[0],
    [cities, simCityId]
  );

  const simCityRoutes = useMemo(
    () => routes.filter((r) => r.cityId === simCity.id),
    [routes, simCity.id]
  );

  const simStops = useMemo(
    () => getUniqueCityStops(simCity.id, simCityRoutes),
    [simCity.id, simCityRoutes]
  );

  const [originStopId, setOriginStopId] = useState<string>(
    simStops[0]?.id ?? ''
  );
  const [destStopId, setDestStopId] = useState<string>(
    simStops[Math.min(4, simStops.length - 1)]?.id ?? ''
  );
  const [customPin, setCustomPin] = useState<MapPinpoint | null>(null);

  useEffect(() => {
    if (simStops.length >= 2) {
      setOriginStopId(simStops[0].id);
      setDestStopId(simStops[Math.min(4, simStops.length - 1)].id);
    }
    setCustomPin(null);
  }, [simCity.id, simStops]);

  const originStop =
    simStops.find((s) => s.id === originStopId) ?? simStops[0] ?? null;
  const destStop =
    simStops.find((s) => s.id === destStopId) ??
    simStops[simStops.length - 1] ??
    null;

  const targetLat = customPin?.lat ?? destStop?.lat ?? simCity.center[0];
  const targetLng = customPin?.lng ?? destStop?.lng ?? simCity.center[1];

  const simPlan = useMemo(() => {
    if (!originStop) return null;
    return recommendTripsFromOriginToPinpoint(
      originStop.lat,
      originStop.lng,
      targetLat,
      targetLng,
      simCityRoutes
    );
  }, [originStop, targetLat, targetLng, simCityRoutes]);

  const activeSimPinpoint = useMemo<MapPinpoint | null>(() => {
    if (customPin) return customPin;
    if (!destStop) return null;
    return createMapPinpoint(
      destStop.lat,
      destStop.lng,
      simCityRoutes,
      simCity.name
    );
  }, [customPin, destStop, simCityRoutes, simCity.name]);

  const topRecRoute =
    simPlan?.recommendations[0]?.trip.legs[0]?.route ?? simCityRoutes[0];

  return (
    <div className="space-y-5">
      {/* Top QA Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMetric
          label="Network health score"
          value={`${healthReport.healthScore}%`}
          deltaLabel={
            healthReport.errorCount === 0
              ? 'Zero blocking errors'
              : `${healthReport.errorCount} blocking`
          }
          deltaTone={healthReport.errorCount === 0 ? 'positive' : 'warning'}
          helperText={`${healthReport.totalRoutes} routes · ${healthReport.totalStops} stops`}
        />
        <KpiMetric
          label="Blocking errors"
          value={String(healthReport.errorCount)}
          deltaLabel={healthReport.errorCount === 0 ? 'Clean' : 'Needs fix'}
          deltaTone={healthReport.errorCount === 0 ? 'positive' : 'warning'}
          helperText="Duplicates, orphan alerts, <2 stops"
        />
        <KpiMetric
          label="Quality warnings"
          value={String(healthReport.warningCount)}
          deltaTone="neutral"
          helperText="Drafts, sparse paths, stop gaps"
        />
        <KpiMetric
          label="Simulated options"
          value={String(simPlan?.recommendations.length ?? 0)}
          deltaLabel={simCity.name}
          deltaTone="positive"
          helperText="Direct & 1-transfer jeepney rides"
        />
      </div>

      {/* Main Split: Left = Automated Integrity Audit, Right = Origin -> Pinpoint Simulator */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1.15fr]">
        {/* Automated Network QA Scanner */}
        <section
          aria-label="Automated route integrity scanner"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Automated QA integrity scan
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Auto-checks geometry density, duplicate codes, stop gaps, drafts, and orphaned advisories.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {(['all', 'error', 'warning'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverityFilter(lvl)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                    severityFilter === lvl
                      ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {filteredIssues.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--success)]/30 bg-[var(--success-subtle)] p-4 text-xs text-[var(--success)]">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  All checked routes, stops, and advisories passed automated QA!
                </span>
              </div>
            ) : (
              filteredIssues.map((issue) => {
                const matchedRoute = issue.routeId
                  ? routeById.get(issue.routeId)
                  : undefined;
                return (
                  <article
                    key={issue.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {issue.severity === 'error' ? (
                          <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]">
                            <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px]">
                              {issue.routeCode}
                            </span>
                            <span>{issue.title}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {issue.detail}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {issue.canAutoSnap && issue.routeId && (
                          <button
                            type="button"
                            onClick={() => onAutoSnapRoute(issue.routeId!)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--accent)]/35 bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] hover:opacity-85"
                          >
                            <Sparkles className="h-3 w-3" aria-hidden="true" />
                            <span>Auto-snap</span>
                          </button>
                        )}
                        {matchedRoute && (
                          <button
                            type="button"
                            onClick={() => onInspectRoute(matchedRoute)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                          >
                            <Wrench className="h-3 w-3" aria-hidden="true" />
                            <span>Inspect</span>
                          </button>
                        )}
                        {issue.advisoryId && (
                          <button
                            type="button"
                            onClick={() => onResolveAdvisory(issue.advisoryId!)}
                            className="cursor-pointer rounded-md border border-[var(--danger)]/35 bg-[var(--danger-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--danger)] hover:opacity-85"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Origin -> Pinpoint Recommendation Simulator */}
        <section
          aria-label="Origin to pinpoint recommendation simulator"
          className="space-y-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Pinpoint recommendation simulator
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Test exact commuter jeepney matches (Direct &amp; 1-Transfer) without switching accounts.
              </p>
            </div>

            <select
              aria-label="Simulator city"
              value={simCity.id}
              onChange={(e) => setSimCityId(e.target.value as CityId)}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)]"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="qa-sim-origin"
                className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
              >
                Simulated rider start (GPS)
              </label>
              <select
                id="qa-sim-origin"
                value={originStop?.id ?? ''}
                onChange={(e) => setOriginStopId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[var(--foreground)]"
              >
                {simStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="qa-sim-dest"
                className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
              >
                Pinpoint destination (or click map)
              </label>
              <select
                id="qa-sim-dest"
                value={destStop?.id ?? ''}
                onChange={(e) => {
                  setCustomPin(null);
                  setDestStopId(e.target.value);
                }}
                className="w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[var(--foreground)]"
              >
                {simStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {topRecRoute && (
            <TransitMap
              city={simCity}
              cityRoutes={simCityRoutes}
              selectedRoute={topRecRoute}
              activeTrip={simPlan?.recommendations[0]?.trip ?? null}
              userLocation={
                originStop
                  ? {
                      lat: originStop.lat,
                      lng: originStop.lng,
                      label: originStop.name,
                      source: 'manual',
                    }
                  : undefined
              }
              pinpoint={activeSimPinpoint}
              recommendedRouteIds={simPlan?.recommendedRouteIds}
              onPinpointMap={(lat, lng) => {
                setCustomPin(
                  createMapPinpoint(lat, lng, simCityRoutes, simCity.name)
                );
              }}
              onClearPinpoint={() => setCustomPin(null)}
              heightClass="h-[260px]"
            />
          )}

          {/* Simulated Recommendation Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--foreground)]">
                Commuter recommendation preview
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {simPlan?.recommendations.length ?? 0} match(es)
              </span>
            </div>

            {!simPlan || simPlan.recommendations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
                No direct or 1-transfer jeepney corridor covers this pair yet.
              </div>
            ) : (
              simPlan.recommendations.slice(0, 4).map((rec, idx) => (
                <div
                  key={rec.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/50 px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {idx === 0 && (
                        <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                          Top pick
                        </span>
                      )}
                      {rec.trip.legs.map((leg, lIdx) => (
                        <React.Fragment key={`${rec.id}-${leg.route.id}-${lIdx}`}>
                          {lIdx > 0 && (
                            <span className="text-[var(--text-muted)]">→</span>
                          )}
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-white"
                            style={{ backgroundColor: leg.route.color }}
                          >
                            {leg.route.code}
                          </span>
                        </React.Fragment>
                      ))}
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {rec.trip.type === 'direct' ? 'Direct' : '1 Transfer'}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-secondary)]">
                      Board {rec.boardStop.name} → Alight {rec.alightStop.name}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      <Navigation className="h-3 w-3" aria-hidden="true" />~
                      {rec.trip.totalDurationMin}m
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {rec.totalWalkM}m walk
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
