import React from 'react';
import {
  Bookmark,
  ChevronRight,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react';
import {
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
  MapPinpoint,
  PinpointRouteMatch,
  PinpointTripRecommendation,
  RouteStop,
  TripOption,
  UserLocation,
} from '@/domain/transit/types';
import { GpsStatus } from '../hooks/useGeolocation';
import { TransitVehicleArtwork } from '../components/TransitRouteArtwork';

export type RouteVehicleFilter =
  | 'all'
  | 'traditional_jeepney'
  | 'modern_puv'
  | 'saved';

interface RoutesTabProps {
  selectedCity: CityInfo;
  selectedRoute: JeepneyRoute;
  filteredRoutes: JeepneyRoute[];
  savedRouteIds: string[];
  activeAdvisories: CorridorAdvisory[];
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  vehicleFilter: RouteVehicleFilter;
  onChangeVehicleFilter: (f: RouteVehicleFilter) => void;
  userLocation: UserLocation;
  gpsStatus: GpsStatus;
  originPickMode: boolean;
  onToggleOriginPickMode: () => void;
  onDemoCityJump: () => void;
  mapPinpoint: MapPinpoint | null;
  onPinpointStop: (lat: number, lng: number) => void;
  onClearPinpoint: () => void;
  onOpenPinpointInPlanner: (destStopName: string) => void;
  quickPinStops: RouteStop[];
  filteredPinpointTrips: PinpointTripRecommendation[];
  otherFilteredMatches: PinpointRouteMatch[];
  originDistanceByRouteId: Map<string, PinpointRouteMatch>;
  onSelectRouteTicket: (route: JeepneyRoute) => void;
  onToggleSaveRoute: (routeId: string) => void;
  onFollowTrip: (trip: TripOption) => void;
}

export const RoutesTab: React.FC<RoutesTabProps> = ({
  selectedCity,
  selectedRoute,
  filteredRoutes,
  savedRouteIds,
  activeAdvisories,
  searchQuery,
  onChangeSearchQuery,
  vehicleFilter,
  onChangeVehicleFilter,
  userLocation,
  gpsStatus,
  originPickMode,
  onToggleOriginPickMode,
  onDemoCityJump,
  mapPinpoint,
  onPinpointStop,
  onClearPinpoint,
  onOpenPinpointInPlanner,
  quickPinStops,
  filteredPinpointTrips,
  otherFilteredMatches,
  originDistanceByRouteId,
  onSelectRouteTicket,
  onToggleSaveRoute,
  onFollowTrip,
}) => {
  const renderStandardRouteCard = (
    route: JeepneyRoute,
    nearYou?: PinpointRouteMatch
  ) => {
    const isSelected = selectedRoute.id === route.id;
    const isSaved = savedRouteIds.includes(route.id);
    const hasDetour = activeAdvisories.some((a) => a.routeCode === route.code);

    return (
      <div
        key={route.id}
        className={`t-card-lift relative flex items-stretch overflow-hidden rounded-2xl border transition-colors ${
          isSelected
            ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/25'
            : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]/60'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelectRouteTicket(route)}
          className="group flex min-w-0 flex-1 cursor-pointer items-stretch text-left"
        >
          <TransitVehicleArtwork
            color={route.color}
            vehicleType={route.vehicleType}
            size="row"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                style={{ backgroundColor: route.color }}
              >
                {route.code}
              </span>
              {nearYou && nearYou.stopDistanceM <= 900 && (
                <span className="shrink-0 rounded-full bg-blue-500/12 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
                  {nearYou.stopDistanceM} m away
                </span>
              )}
              {hasDetour && (
                <span className="shrink-0 rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                  Detour
                </span>
              )}
            </div>

            <div className="line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--foreground)]">
              {route.name}
            </div>

            <div className="flex flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-[var(--text-secondary)] tabular-nums">
              <span className="shrink-0">{route.headwayMin}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{route.stops.length} stops</span>
              <span aria-hidden="true">·</span>
              <span
                className={`shrink-0 font-medium ${
                  route.verificationStatus === 'field_draft'
                    ? 'text-[var(--peak)]'
                    : 'text-[var(--success)]'
                }`}
              >
                {route.verificationStatus === 'ltfrb_reference'
                  ? 'LTFRB'
                  : route.verificationStatus === 'community_verified'
                    ? 'Verified'
                    : 'Draft'}
              </span>
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 pr-2.5">
          <ChevronRight
            className="h-4 w-4 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => onToggleSaveRoute(route.id)}
            aria-label={
              isSaved
                ? `Remove ${route.code} from saved routes`
                : `Save ${route.code} route`
            }
            aria-pressed={isSaved}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            <Bookmark
              className={`h-4 w-4 ${
                isSaved ? 't-pop fill-[var(--accent)] text-[var(--accent)]' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="t-panel-reveal flex flex-col gap-3">
      {/* Live Origin Location Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/55 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[#2563EB]">
            <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)]">
              <span>You are here</span>
              <span className="rounded-full bg-blue-500/12 px-1.5 py-0.2 font-semibold text-blue-700 dark:text-blue-300">
                {gpsStatus === 'locating'
                  ? 'Locating…'
                  : userLocation.source === 'gps'
                    ? 'Live GPS'
                    : userLocation.source === 'manual'
                      ? 'Pinned'
                      : 'Default'}
              </span>
            </div>
            <div className="truncate text-xs font-semibold text-[var(--foreground)]">
              {userLocation.label}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleOriginPickMode}
            aria-pressed={originPickMode}
            className={`min-h-[30px] cursor-pointer rounded-lg border px-2 text-[11px] font-medium transition-colors ${
              originPickMode
                ? 'border-[#2563EB] bg-[#2563EB] text-white'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            {originPickMode ? 'Tap map…' : 'Set start'}
          </button>
          <button
            type="button"
            onClick={onDemoCityJump}
            title="Jump between demo cities"
            className="min-h-[30px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            Demo
          </button>
        </div>
      </div>

      {/* Search & Mode Filter */}
      <div role="search" className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <label htmlFor="route-search-input" className="visually-hidden">
            Search route or landmark
          </label>
          <input
            id="route-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder={`Search ${selectedCity.name} route or stop...`}
            className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] pr-3 pl-10 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'traditional_jeepney', label: 'Jeepney' },
                { id: 'modern_puv', label: 'Modern PUV' },
                { id: 'saved', label: 'Saved' },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChangeVehicleFilter(chip.id)}
                className={`min-h-[34px] cursor-pointer rounded-full px-2.5 text-xs font-medium transition-colors ${
                  vehicleFilter === chip.id
                    ? 'bg-[#111827] text-white'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {filteredRoutes.length} routes
          </span>
        </div>
      </div>

      {/* Pinpoint Strip / Active Pinpoint Banner */}
      {mapPinpoint ? (
        <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-subtle)]/35 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[var(--foreground)]">
                  You → {mapPinpoint.nearestStopName}
                </div>
                <div className="truncate text-[11px] text-[var(--text-secondary)] tabular-nums">
                  {filteredPinpointTrips.length} recommended{' '}
                  {filteredPinpointTrips.length === 1 ? 'ride' : 'rides'} ·{' '}
                  {mapPinpoint.distanceToNearestStopM} m to pin
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearPinpoint}
              aria-label="Clear map pinpoint"
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onOpenPinpointInPlanner(mapPinpoint.nearestStopName)
              }
              className="min-h-[32px] cursor-pointer rounded-lg bg-[var(--accent)] px-2.5 text-[11px] font-semibold text-white"
            >
              Open in Planner
            </button>
            <button
              type="button"
              onClick={onClearPinpoint}
              className="min-h-[32px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              Clear pin
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/65 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
            <MapPin
              className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <span>Tap map or pinpoint:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {quickPinStops.map((stop) => {
              const shortLabel = stop.name
                .split('·')[0]
                .replace(
                  /\b(Transport Terminal|PUV Terminal|Travellers Lounge|Public Market|Terminal)\b/gi,
                  ''
                )
                .trim();
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => onPinpointStop(stop.lat, stop.lng)}
                  className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:border-[var(--accent)]"
                >
                  {shortLabel || stop.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Route & Recommendation Cards */}
      {filteredRoutes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--text-secondary)]">
          No matching routes in {selectedCity.name}.
        </div>
      ) : mapPinpoint ? (
        <div className="flex flex-col gap-3.5">
          {filteredPinpointTrips.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-semibold tracking-wide text-[var(--accent)] uppercase">
                  Recommended for your trip ({filteredPinpointTrips.length})
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Direct first
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {filteredPinpointTrips.map((rec) => {
                  const primaryRoute = rec.trip.legs[0].route;
                  const isSelected = selectedRoute.id === primaryRoute.id;
                  const hasDetour = rec.trip.legs.some((leg) =>
                    activeAdvisories.some((a) => a.routeCode === leg.route.code)
                  );
                  return (
                    <div
                      key={rec.id}
                      className={`t-card-lift relative flex items-stretch overflow-hidden rounded-2xl border transition-colors ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/25'
                          : 'border-[var(--accent)]/45 bg-[var(--surface)] hover:bg-[var(--surface-raised)]/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectRouteTicket(primaryRoute)}
                        className="group flex min-w-0 flex-1 cursor-pointer items-stretch text-left"
                      >
                        <TransitVehicleArtwork
                          color={primaryRoute.color}
                          vehicleType={primaryRoute.vehicleType}
                          size="row"
                        />

                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {rec.trip.legs.map((leg, i) => (
                              <React.Fragment key={`${leg.route.id}-${i}`}>
                                <span
                                  className="inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                                  style={{ backgroundColor: leg.route.color }}
                                >
                                  {leg.route.code}
                                </span>
                                {i < rec.trip.legs.length - 1 && (
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    →
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                            <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                              {rec.trip.type === 'direct'
                                ? 'Direct'
                                : '1 transfer'}
                            </span>
                            {hasDetour && (
                              <span className="shrink-0 rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                                Detour
                              </span>
                            )}
                          </div>

                          <div className="line-clamp-1 text-[12.5px] leading-snug font-semibold text-[var(--foreground)]">
                            Board: {rec.boardStop.name.split('·')[0].trim()} →{' '}
                            {rec.alightStop.name.split('·')[0].trim()}
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--text-secondary)] tabular-nums">
                            <span>{rec.walkToBoardM} m walk</span>
                            <span aria-hidden="true">·</span>
                            <span>~{rec.trip.totalDurationMin} min</span>
                            <span aria-hidden="true">·</span>
                            <span>{rec.trip.totalDistanceKm} km</span>
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center pr-2.5">
                        <button
                          type="button"
                          onClick={() => onFollowTrip(rec.trip)}
                          aria-label={`Follow ${rec.trip.legs.map((l) => l.route.code).join(' to ')} ride`}
                          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-[var(--accent)] px-2.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Ride</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {otherFilteredMatches.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  Other routes in {selectedCity.name} (
                  {otherFilteredMatches.length})
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {otherFilteredMatches.map((m) =>
                  renderStandardRouteCard(m.route)
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredRoutes.map((route) =>
            renderStandardRouteCard(route, originDistanceByRouteId.get(route.id))
          )}
        </div>
      )}
    </div>
  );
};
