import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  LocateFixed,
  LogOut,
  MapPin,
  Monitor,
  Moon,
  Star,
  Sun,
} from 'lucide-react';
import { ColorSchemeSetting } from '@/adapters/browser/storage';
import { AuthUser } from '@/domain/auth/types';
import {
  CityId,
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
} from '@/domain/transit/types';
import { TransitMap } from '@/shared/map/TransitMap';
import { CommuterTab } from '../components/BottomNavDock';
import { TransitVehicleArtwork } from '../components/TransitRouteArtwork';

interface CommuterProfileViewProps {
  activeUser: AuthUser;
  selectedCity: CityInfo;
  cityRoutes: JeepneyRoute[];
  activeAdvisories: CorridorAdvisory[];
  savedRouteIds: string[];
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onLocateMe: () => void;
  onSelectCity: (cityId: CityId) => void;
  onOpenRouteTicket: (route: JeepneyRoute) => void;
  onToggleSaveRoute: (routeId: string) => void;
  onTabChange: (tab: CommuterTab) => void;
  onSignOut: () => void;
}

const WEEKLY_ACTIVITY = [
  { day: 'M', pct: 48, active: true },
  { day: 'T', pct: 82, active: true },
  { day: 'W', pct: 64, active: true },
  { day: 'T', pct: 94, active: true },
  { day: 'F', pct: 76, active: true },
  { day: 'S', pct: 40, active: false },
  { day: 'S', pct: 28, active: false },
] as const;

export const CommuterProfileView: React.FC<CommuterProfileViewProps> = ({
  activeUser,
  selectedCity,
  cityRoutes,
  activeAdvisories,
  savedRouteIds,
  schemeSetting,
  onChangeScheme,
  onLocateMe,
  onSelectCity,
  onOpenRouteTicket,
  onToggleSaveRoute,
  onTabChange,
  onSignOut,
}) => {
  const savedRoutes = useMemo(
    () => cityRoutes.filter((r) => savedRouteIds.includes(r.id)),
    [cityRoutes, savedRouteIds]
  );

  const fleetMix = useMemo(() => {
    const jeepCount = cityRoutes.filter(
      (r) => r.vehicleType === 'traditional_jeepney'
    ).length;
    const puvCount = cityRoutes.length - jeepCount;
    return { jeepCount, puvCount };
  }, [cityRoutes]);

  const cycleTheme = () => {
    const next: ColorSchemeSetting =
      schemeSetting === 'light'
        ? 'dark'
        : schemeSetting === 'dark'
          ? 'system'
          : 'light';
    onChangeScheme(next);
  };

  return (
    <div className="t-panel-reveal flex flex-col gap-4">
      {/* Header Strip */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('explore')}
            aria-label="Back to routes"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h1 className="font-display text-lg font-semibold text-[var(--foreground)]">
            Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={cycleTheme}
          aria-label={`Switch theme (${schemeSetting})`}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--foreground)]"
        >
          {schemeSetting === 'dark' ? (
            <Moon className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          ) : schemeSetting === 'light' ? (
            <Sun className="h-3.5 w-3.5 text-[var(--peak)]" aria-hidden="true" />
          ) : (
            <Monitor className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
          )}
          <span className="capitalize">{schemeSetting}</span>
        </button>
      </div>

      {/* Commuter Identity Row */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] text-sm font-bold text-[var(--accent)]">
            {activeUser.avatarInitials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-display text-base font-semibold text-[var(--foreground)]">
                {activeUser.name}
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--peak-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--peak)] tabular-nums">
                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                4.9
              </span>
            </div>
            <div className="truncate text-xs text-[var(--text-secondary)]">
              Commuter · {selectedCity.name}
            </div>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--success-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">
          Verified
        </span>
      </div>

      {/* My Home City Location Preview Card (inspired by Profile map tile) */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-[var(--foreground)]">
              My city
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {selectedCity.region} · {cityRoutes.length} corridors
            </div>
          </div>
          <button
            type="button"
            onClick={onLocateMe}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)]"
          >
            <LocateFixed className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
            <span>Locate me (GPS)</span>
          </button>
        </div>

        <div className="relative h-[116px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="pointer-events-none h-full w-full">
            <TransitMap
              city={selectedCity}
              cityRoutes={cityRoutes}
              selectedRoute={cityRoutes[0] ?? null}
              activeTrip={null}
              compact={true}
              heightClass="h-full"
            />
          </div>
          <div className="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5 z-[400] flex items-center justify-between gap-2">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]">
              {selectedCity.name}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
              {fleetMix.jeepCount} Jeep · {fleetMix.puvCount} PUV
            </span>
          </div>
        </div>
      </div>

      {/* Commute Activity Bento Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Commute dashboard
          </span>
          <button
            type="button"
            onClick={() => onTabChange('planner')}
            aria-label="Plan a new trip"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 items-end gap-3">
          <div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Completed rides
            </div>
            <div className="mt-0.5 font-display text-2xl font-semibold text-[var(--foreground)] tabular-nums">
              {activeUser.tripsCompleted} trips
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)] tabular-nums">
              {savedRoutes.length} saved · 5 cities ready
            </div>
          </div>

          <div
            className="flex h-14 items-end justify-between gap-1.5"
            aria-label="Weekly transit activity"
          >
            {WEEKLY_ACTIVITY.map((item, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-full items-end rounded-full bg-[var(--surface-raised)] p-0.5">
                  <div
                    className="w-full rounded-full"
                    style={{
                      height: `${item.pct}%`,
                      backgroundColor: item.active
                        ? 'var(--accent)'
                        : 'var(--border)',
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Advisories & Etiquette Guide */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {selectedCity.name} advisories
          </span>
          <span className="text-[var(--text-muted)] tabular-nums">
            {activeAdvisories.length} live
          </span>
        </div>

        {activeAdvisories.length === 0 ? (
          <div className="rounded-xl bg-[var(--surface-raised)]/60 px-3 py-2.5 text-xs text-[var(--text-secondary)]">
            All monitored corridors operating normally.
          </div>
        ) : (
          <div className="space-y-2">
            {activeAdvisories.map((adv) => {
              const targetRoute = cityRoutes.find((r) => r.code === adv.routeCode);
              return (
                <button
                  key={adv.id}
                  type="button"
                  onClick={() => targetRoute && onOpenRouteTicket(targetRoute)}
                  className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--peak)]/30 bg-[var(--peak-subtle)]/75 p-2.5 text-left text-xs"
                >
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--peak)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--peak)]">
                        {adv.routeCode} · {adv.severity.toUpperCase()}
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 text-[var(--peak)]"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-0.5 font-medium text-[var(--foreground)]">
                      {adv.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-raised)]/65 px-3 py-2.5 text-xs">
          <span className="text-[11px] text-[var(--text-muted)]">
            Local stop callout
          </span>
          <span className="font-semibold text-[var(--foreground)]">
            &ldquo;{selectedCity.localStopPhrase}&rdquo;
          </span>
        </div>
      </div>

      {/* Saved Routes */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--foreground)]">
            Saved corridors ({savedRoutes.length})
          </span>
          <button
            type="button"
            onClick={() => onTabChange('explore')}
            className="cursor-pointer font-medium text-[var(--accent)]"
          >
            Browse all
          </button>
        </div>

        {savedRoutes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-3.5 text-center text-xs text-[var(--text-secondary)]">
            Bookmark any jeepney route to keep it pinned here.
          </div>
        ) : (
          <div className="space-y-2">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"
              >
                <button
                  type="button"
                  onClick={() => onOpenRouteTicket(route)}
                  className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                >
                  <TransitVehicleArtwork
                    color={route.color}
                    vehicleType={route.vehicleType}
                    size="compact"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums"
                        style={{ backgroundColor: route.color }}
                      >
                        {route.code}
                      </span>
                      <span className="truncate text-[10px] font-medium text-[var(--text-muted)]">
                        {route.vehicleType === 'modern_puv'
                          ? 'Modern PUV'
                          : 'Trad. Jeep'}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-[var(--foreground)]">
                      {route.name}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                      {route.headwayMin} · {route.stops.length} stops
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSaveRoute(route.id)}
                  aria-label={`Remove ${route.code} from saved`}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] text-[var(--accent)]"
                >
                  <Bookmark className="h-4 w-4 fill-current" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Places */}
      {activeUser.savedPlaces.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold text-[var(--foreground)]">
            Saved places
          </div>
          <div className="space-y-1.5">
            {activeUser.savedPlaces.map((place) => (
              <div
                key={place.id}
                className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-[var(--peak)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--foreground)]">
                      {place.label}
                    </div>
                    <div className="truncate text-[var(--text-muted)]">
                      {place.landmark}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCity(place.cityId);
                    onTabChange('planner');
                  }}
                  className="min-h-[34px] shrink-0 cursor-pointer rounded-lg border border-[var(--border)] px-2.5 text-[11px] font-medium text-[var(--foreground)]"
                >
                  Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Sign Out */}
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span>Sign out of LostInPH</span>
      </button>
    </div>
  );
};
