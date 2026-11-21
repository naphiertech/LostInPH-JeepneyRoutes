import React, { useMemo, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
  RouteStop,
} from '../../../domain/transit/types';
import { TransitMap } from '../../../shared/map/TransitMap';

interface StopsTerminalsPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  globalCityFilter: 'all' | CityId;
  selectedMapRoute: JeepneyRoute | null;
  onSelectMapRoute: (route: JeepneyRoute) => void;
}

export const StopsTerminalsPage: React.FC<StopsTerminalsPageProps> = ({
  cities,
  routes,
  globalCityFilter,
  selectedMapRoute,
  onSelectMapRoute,
}) => {
  const [focusedStop, setFocusedStop] = useState<RouteStop | null>(null);
  const [stopQuery, setStopQuery] = useState('');
  const [stopFilter, setStopFilter] = useState<
    'all' | 'terminals' | 'transfer_hubs'
  >('all');

  const activeCity = useMemo(() => {
    if (globalCityFilter !== 'all') {
      return cities.find((c) => c.id === globalCityFilter) ?? cities[0];
    }
    if (selectedMapRoute) {
      return (
        cities.find((c) => c.id === selectedMapRoute.cityId) ?? cities[0]
      );
    }
    return cities[0];
  }, [cities, globalCityFilter, selectedMapRoute]);

  const cityRoutes = useMemo(
    () => routes.filter((r) => r.cityId === activeCity.id),
    [routes, activeCity.id]
  );

  const displayedRoute = useMemo(() => {
    if (selectedMapRoute && selectedMapRoute.cityId === activeCity.id) {
      return selectedMapRoute;
    }
    return cityRoutes[0] ?? null;
  }, [selectedMapRoute, cityRoutes, activeCity.id]);

  const stopEntries = useMemo(() => {
    const q = stopQuery.trim().toLowerCase();
    const entries: Array<{ stop: RouteStop; route: JeepneyRoute }> = [];
    for (const r of cityRoutes) {
      for (const s of r.stops) {
        if (stopFilter === 'terminals' && !s.isTerminal) continue;
        if (stopFilter === 'transfer_hubs' && !s.isTransferHub) continue;
        if (
          q &&
          !s.name.toLowerCase().includes(q) &&
          !s.landmark.toLowerCase().includes(q) &&
          !s.barangayOrDistrict.toLowerCase().includes(q) &&
          !r.code.toLowerCase().includes(q)
        ) {
          continue;
        }
        entries.push({ stop: s, route: r });
      }
    }
    return entries;
  }, [cityRoutes, stopFilter, stopQuery]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs">
          <div>
            <span className="font-semibold text-[var(--foreground)]">
              {activeCity.name}
            </span>
            <span className="mx-2 text-[var(--text-muted)]">·</span>
            <span className="text-[var(--text-secondary)]">
              {displayedRoute
                ? `${displayedRoute.code} (${displayedRoute.signboardText})`
                : 'Select a corridor'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--text-muted)]">
            Alighting phrase: {activeCity.localStopPhrase}
          </span>
        </div>

        <TransitMap
          city={activeCity}
          cityRoutes={cityRoutes}
          selectedRoute={displayedRoute}
          activeTrip={null}
          liveStopPosition={focusedStop}
          onSelectRoute={(r) => {
            setFocusedStop(null);
            onSelectMapRoute(r);
          }}
          heightClass="h-[460px] lg:h-[540px]"
        />
      </div>

      {/* Directory of Stops, Terminals & Transfer Hubs */}
      <div className="flex h-full flex-col rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Mapped stops &amp; hubs
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Click any entry to center map coordinates
            </p>
          </div>
          <div className="flex gap-1">
            {(
              [
                ['all', 'All'],
                ['terminals', 'Terminals'],
                ['transfer_hubs', 'Transfers'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStopFilter(key)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium ${
                  stopFilter === key
                    ? 'bg-[var(--surface-raised)] text-[var(--foreground)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={stopQuery}
            onChange={(e) => setStopQuery(e.target.value)}
            placeholder={`Search ${activeCity.name} stops, landmarks, barangays...`}
            aria-label="Search stops and terminals"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-1.5 pr-3 pl-8 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        <ul className="mt-3 max-h-[460px] divide-y divide-[var(--border-subtle)] overflow-y-auto pr-1">
          {stopEntries.map(({ stop, route }) => {
            const isSelected = focusedStop?.id === stop.id;
            return (
              <li key={stop.id} className="py-2 first:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    onSelectMapRoute(route);
                    setFocusedStop(stop);
                  }}
                  className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg p-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-subtle)]'
                      : 'hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MapPin
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isSelected
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        {stop.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        {stop.landmark}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono font-medium text-[var(--foreground)]">
                          {route.code}
                        </span>
                        {stop.isTerminal && (
                          <span className="rounded bg-[var(--success-subtle)] px-1.5 py-0.5 font-medium text-[var(--success)]">
                            Terminal bay
                          </span>
                        )}
                        {stop.isTransferHub && (
                          <span className="rounded bg-[var(--peak-subtle)] px-1.5 py-0.5 font-medium text-[var(--peak)]">
                            Transfer hub
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
