import React from 'react';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Navigation,
} from 'lucide-react';
import { CityInfo, RouteStop, TripOption } from '@/domain/transit/types';

interface PlanTabProps {
  selectedCity: CityInfo;
  cityStops: RouteStop[];
  originStop: string;
  destStop: string;
  onChangeOriginStop: (stop: string) => void;
  onChangeDestStop: (stop: string) => void;
  onSwapStops: () => void;
  plannedTrips: TripOption[];
  expandedTripId: string | null;
  onToggleExpandTrip: (id: string | null) => void;
  onStartTrip: (trip: TripOption) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  selectedCity,
  cityStops,
  originStop,
  destStop,
  onChangeOriginStop,
  onChangeDestStop,
  onSwapStops,
  plannedTrips,
  expandedTripId,
  onToggleExpandTrip,
  onStartTrip,
}) => {
  return (
    <div className="t-panel-reveal flex flex-col gap-3.5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/65 p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Plan journey
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            {selectedCity.name}
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <label
              htmlFor="origin-stop-select"
              className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
            >
              From
            </label>
            <select
              id="origin-stop-select"
              value={originStop}
              onChange={(e) => onChangeOriginStop(e.target.value)}
              className="min-h-[44px] w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {cityStops.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} · {s.barangayOrDistrict}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="dest-stop-select"
                className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
              >
                To
              </label>
              <select
                id="dest-stop-select"
                value={destStop}
                onChange={(e) => onChangeDestStop(e.target.value)}
                className="min-h-[44px] w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                {cityStops.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} · {s.barangayOrDistrict}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onSwapStops}
              aria-label="Swap origin and destination"
              className="flex h-[44px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Options */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--foreground)]">
            Best rides
          </span>
          <span className="text-[var(--text-muted)] tabular-nums">
            {plannedTrips.length} options
          </span>
        </div>

        {plannedTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--text-secondary)]">
            Select two distinct stops to compute jeepney routes.
          </div>
        ) : (
          plannedTrips.map((trip) => {
            const isOpen = expandedTripId === trip.id;

            return (
              <article
                key={trip.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              >
                <button
                  type="button"
                  onClick={() => onToggleExpandTrip(isOpen ? null : trip.id)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/50"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {trip.legs.map((leg, i) => (
                        <React.Fragment key={`${leg.route.id}-${i}`}>
                          <span
                            className="rounded-lg px-2 py-0.5 font-mono text-xs font-semibold text-white"
                            style={{ backgroundColor: leg.route.color }}
                          >
                            {leg.route.code}
                          </span>
                          {i < trip.legs.length - 1 && (
                            <span className="text-xs text-[var(--text-muted)]">
                              →
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                      <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        {trip.type === 'direct' ? 'Direct' : '1 transfer'}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-[var(--text-secondary)] tabular-nums">
                      {trip.totalDistanceKm} km · {trip.walkMeters}m walk
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-lg font-semibold text-[var(--foreground)] tabular-nums">
                      ~{trip.totalDurationMin} min
                    </span>
                    {isOpen ? (
                      <ChevronUp
                        className="h-4 w-4 text-[var(--text-muted)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronDown
                        className="h-4 w-4 text-[var(--text-muted)]"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]/40 p-3.5">
                    {trip.legs.map((leg, legIdx) => (
                      <dl
                        key={`${leg.route.id}-kv-${legIdx}`}
                        className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 py-2">
                          <dt className="text-[var(--text-muted)]">
                            Board ({leg.route.code})
                          </dt>
                          <dd className="truncate font-medium text-[var(--foreground)]">
                            {leg.boardStop.name}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-2">
                          <dt className="text-[var(--text-muted)]">
                            Signboard
                          </dt>
                          <dd className="truncate font-mono text-[11px] font-medium text-[var(--foreground)]">
                            {leg.route.signboardText}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 py-2">
                          <dt className="text-[var(--text-muted)]">
                            Alight ({leg.stopCount} stops)
                          </dt>
                          <dd className="truncate font-medium text-[var(--foreground)]">
                            {leg.alightStop.name}
                          </dd>
                        </div>
                      </dl>
                    ))}

                    {trip.transferNote && (
                      <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-subtle)] px-3 py-2 text-xs text-[var(--accent)]">
                        {trip.transferNote}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onStartTrip(trip)}
                      className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      <Navigation className="h-4 w-4" aria-hidden="true" />
                      <span>Start ride</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
