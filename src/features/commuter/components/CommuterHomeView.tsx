import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Building2,
  Bus,
  Calculator,
  ChevronRight,
  Flag,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import {
  calculateFareFromRates,
  formatFare,
  getDisplayFare,
  getMinimumDisplayFare,
  resolveFareRates,
} from '../../../domain/transit/fareEngine';
import {
  CityId,
  CityInfo,
  CorridorAdvisory,
  DiscountType,
  FareRule,
  JeepneyRoute,
  RouteStop,
} from '../../../domain/transit/types';
import { useNotifications } from '../../../shared/ui/NotificationCenter';
import { TransitVehicleArtwork } from './TransitRouteArtwork';

interface OpenRoutesOptions {
  modeFilter?: 'all' | 'traditional_jeepney' | 'modern_puv' | 'saved';
  searchQuery?: string;
  pinpointStop?: RouteStop;
}

interface CommuterHomeViewProps {
  selectedCity: CityInfo;
  userName: string;
  cityRoutes: JeepneyRoute[];
  cityStops: RouteStop[];
  selectedRoute: JeepneyRoute;
  fareRules: FareRule[];
  activeAdvisories: CorridorAdvisory[];
  savedRouteIds: string[];
  discountType: DiscountType;
  onChangeDiscountType: (discount: DiscountType) => void;
  onOpenRoutes: (options?: OpenRoutesOptions) => void;
  onSelectRouteTicket: (route: JeepneyRoute) => void;
  onOpenPlanner: (destStopName?: string) => void;
  onOpenTracker: () => void;
  onOpenReportIssue: (routeCode?: string) => void;
}

const CITY_GREETINGS: Record<CityId, string> = {
  cebu: 'Maayong adlaw',
  davao: 'Maayong adlaw',
  cdo: 'Maayong buntag',
  manila: 'Magandang araw',
  baguio: 'Magandang araw',
};

const PASS_CYCLE: ReadonlyArray<{
  id: DiscountType;
  label: string;
  shortTag: string;
}> = [
  { id: 'regular', label: 'Regular Pass', shortTag: 'Standard' },
  { id: 'student', label: 'Student Pass', shortTag: '-20%' },
  { id: 'senior_pwd', label: 'Senior / PWD', shortTag: '-20%' },
];

function formatShortStopLabel(stopName: string): string {
  return (
    stopName
      .split('·')[0]
      .replace(
        /\b(Transport Terminal|PUV Terminal|Travellers Lounge|Public Market|Terminal)\b/gi,
        ''
      )
      .trim() || stopName
  );
}

/**
 * Grab & Maxim-inspired Jeepney Commuter Super-App Home Hub.
 * Syncs live with Admin route verifications, LTFRB fare rules, and corridor advisories.
 */
export const CommuterHomeView: React.FC<CommuterHomeViewProps> = ({
  selectedCity,
  userName,
  cityRoutes,
  cityStops,
  selectedRoute,
  fareRules,
  activeAdvisories,
  savedRouteIds,
  discountType,
  onChangeDiscountType,
  onOpenRoutes,
  onSelectRouteTicket,
  onOpenPlanner,
  onOpenTracker,
  onOpenReportIssue,
}) => {
  const [heroQuery, setHeroQuery] = useState('');
  const [fareCalcOpen, setFareCalcOpen] = useState(false);
  const [calcRouteId, setCalcRouteId] = useState<string>(
    selectedRoute?.id ?? cityRoutes[0]?.id ?? ''
  );
  const [calcDistanceKm, setCalcDistanceKm] = useState<number>(6);
  const { notify } = useNotifications();

  const firstName = userName.trim().split(' ')[0] || 'Commuter';
  const greeting = CITY_GREETINGS[selectedCity.id] ?? 'Magandang araw';

  const activePassMeta =
    PASS_CYCLE.find((p) => p.id === discountType) ?? PASS_CYCLE[0];

  const handleCyclePass = () => {
    const idx = PASS_CYCLE.findIndex((p) => p.id === discountType);
    const next = PASS_CYCLE[(idx + 1) % PASS_CYCLE.length];
    onChangeDiscountType(next.id);
    notify({
      title: `Switched to ${next.label}`,
      description: `All ${selectedCity.name} fares now reflect ${next.shortTag}.`,
      category: 'system',
      kind: 'fare_report',
      tone: 'info',
      tagLabel: next.shortTag,
    });
  };

  const baseFareSummary = useMemo(() => {
    const tradSample =
      cityRoutes.find((r) => r.vehicleType === 'traditional_jeepney') ??
      cityRoutes[0];
    const puvSample =
      cityRoutes.find((r) => r.vehicleType === 'modern_puv') ?? tradSample;
    const tradMin = tradSample
      ? getMinimumDisplayFare(tradSample, fareRules, discountType)
      : 13;
    const puvMin = puvSample
      ? getMinimumDisplayFare(puvSample, fareRules, discountType)
      : 15;
    return { tradMin, puvMin };
  }, [cityRoutes, fareRules, discountType]);

  const quickLandmarks = useMemo(() => {
    const hubs = cityStops.filter((s) => s.isTerminal || s.isTransferHub);
    return (hubs.length >= 3 ? hubs : cityStops).slice(0, 3);
  }, [cityStops]);

  const primaryTerminalStop = useMemo(
    () => cityStops.find((s) => s.isTerminal) ?? cityStops[0],
    [cityStops]
  );

  const popularRoutes = useMemo(() => {
    const sorted = [...cityRoutes].sort((a, b) => {
      const aSaved = savedRouteIds.includes(a.id) ? 1 : 0;
      const bSaved = savedRouteIds.includes(b.id) ? 1 : 0;
      if (aSaved !== bSaved) return bSaved - aSaved;
      return a.vehicleType === b.vehicleType
        ? 0
        : a.vehicleType === 'traditional_jeepney'
          ? -1
          : 1;
    });
    return sorted.slice(0, 4);
  }, [cityRoutes, savedRouteIds]);

  const resolvedCalcRouteId = useMemo(
    () =>
      cityRoutes.some((r) => r.id === calcRouteId)
        ? calcRouteId
        : selectedRoute?.id ?? cityRoutes[0]?.id ?? '',
    [cityRoutes, calcRouteId, selectedRoute]
  );

  const calcSampleRoutes = useMemo(() => {
    const trad =
      cityRoutes.find(
        (r) =>
          r.id === resolvedCalcRouteId &&
          r.vehicleType === 'traditional_jeepney'
      ) ??
      cityRoutes.find((r) => r.vehicleType === 'traditional_jeepney') ??
      selectedRoute;
    const puv =
      cityRoutes.find(
        (r) =>
          r.id === resolvedCalcRouteId && r.vehicleType === 'modern_puv'
      ) ??
      cityRoutes.find((r) => r.vehicleType === 'modern_puv') ??
      selectedRoute;

    const tradRates = resolveFareRates(
      trad ?? { vehicleType: 'traditional_jeepney', baseFare: 13, perKmRate: 1.8 },
      fareRules
    );
    const puvRates = resolveFareRates(
      puv ?? { vehicleType: 'modern_puv', baseFare: 15, perKmRate: 2.2 },
      fareRules
    );

    const tradPair = calculateFareFromRates(
      tradRates.baseFare,
      tradRates.perKmRate,
      calcDistanceKm,
      tradRates.discountPercent,
      tradRates.firstKmCount
    );
    const puvPair = calculateFareFromRates(
      puvRates.baseFare,
      puvRates.perKmRate,
      calcDistanceKm,
      puvRates.discountPercent,
      puvRates.firstKmCount
    );

    return {
      tradFare: getDisplayFare(tradPair.regular, tradPair.discounted, discountType),
      puvFare: getDisplayFare(puvPair.regular, puvPair.discounted, discountType),
      tradRates,
      puvRates,
    };
  }, [cityRoutes, calcRouteId, selectedRoute, fareRules, calcDistanceKm, discountType]);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenRoutes({
      modeFilter: 'all',
      searchQuery: heroQuery.trim(),
    });
  };

  const serviceTiles = [
    {
      id: 'trad-jeep',
      label: 'Trad. Jeep',
      icon: Bus,
      toneClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
      onClick: () => onOpenRoutes({ modeFilter: 'traditional_jeepney' }),
    },
    {
      id: 'modern-puv',
      label: 'Modern PUV',
      icon: ShieldCheck,
      toneClass: 'bg-teal-500/12 text-teal-700 dark:text-teal-300',
      onClick: () => onOpenRoutes({ modeFilter: 'modern_puv' }),
    },
    {
      id: 'plan-trip',
      label: 'Plan Trip',
      icon: RouteIcon,
      toneClass: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
      onClick: () => onOpenPlanner(),
    },
    {
      id: 'pinpoint-map',
      label: 'Pinpoint',
      icon: LocateFixed,
      toneClass: 'bg-amber-500/14 text-amber-700 dark:text-amber-300',
      onClick: () =>
        onOpenRoutes({
          modeFilter: 'all',
          pinpointStop: quickLandmarks[0] ?? primaryTerminalStop,
        }),
    },
    {
      id: 'fare-matrix',
      label: 'Fare Matrix',
      icon: Calculator,
      toneClass: fareCalcOpen
        ? 'bg-[var(--accent)] text-white'
        : 'bg-[#111827]/10 text-[#111827] dark:bg-white/12 dark:text-white',
      onClick: () => setFareCalcOpen((open) => !open),
    },
    {
      id: 'para-po',
      label: 'Para Po',
      icon: Navigation,
      toneClass: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
      onClick: () => onOpenTracker(),
    },
    {
      id: 'terminals',
      label: 'Terminals',
      icon: Building2,
      toneClass: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
      onClick: () =>
        onOpenRoutes({
          modeFilter: 'all',
          pinpointStop: primaryTerminalStop,
        }),
    },
    {
      id: 'report-issue',
      label: 'Report',
      icon: Flag,
      toneClass: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
      onClick: () => onOpenReportIssue(selectedRoute?.code),
    },
  ] as const;

  return (
    <div className="t-panel-reveal flex flex-col gap-3.5 pb-2">
      {/* 1. Grab / Maxim Inspired Emerald Hero Card + Floating "Saan tayo?" Search */}
      <div className="rounded-2xl bg-[#0F291E] p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-emerald-300/90">
              {selectedCity.name} · {cityRoutes.length} live corridors
            </div>
            <h1 className="mt-0.5 truncate text-lg font-bold tracking-tight text-white">
              {greeting}, {firstName}
            </h1>
            <p className="mt-0.5 text-xs text-emerald-100/80">
              Saan tayo? Pick a landmark, jeepney code, or terminal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenRoutes({ modeFilter: 'all' })}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
          >
            <span>All routes</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        {/* Elevated "Where to?" Search + Pinpoint Trigger */}
        <form
          onSubmit={handleHeroSearchSubmit}
          role="search"
          aria-label="Commuter home destination search"
          className="mt-3.5 flex items-center gap-1.5 rounded-xl border border-white/15 bg-[var(--surface)] p-1 text-[var(--foreground)] shadow-sm"
        >
          <Search
            className="ml-2 h-4 w-4 shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <label htmlFor="home-where-to-input" className="visually-hidden">
            Saan tayo? Search destination or jeepney code
          </label>
          <input
            id="home-where-to-input"
            type="search"
            value={heroQuery}
            onChange={(e) => setHeroQuery(e.target.value)}
            placeholder={`Where to in ${selectedCity.name}?`}
            className="min-h-[38px] min-w-0 flex-1 bg-transparent px-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() =>
              onOpenRoutes({
                modeFilter: 'all',
                pinpointStop: quickLandmarks[0] ?? primaryTerminalStop,
              })
            }
            aria-label="Pinpoint destination on map"
            title="Pinpoint destination"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="submit"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg bg-[#15803D] px-3 text-xs font-semibold text-white hover:opacity-95"
          >
            Go
          </button>
        </form>

        {/* Quick Landmark Chips */}
        {quickLandmarks.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {quickLandmarks.map((stop) => (
              <button
                key={stop.id}
                type="button"
                onClick={() =>
                  onOpenRoutes({ modeFilter: 'all', pinpointStop: stop })
                }
                className="inline-flex min-h-[28px] cursor-pointer items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium text-emerald-50 transition-colors hover:bg-white/20"
              >
                <MapPin className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                <span>{formatShortStopLabel(stop.name)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Commuter Pass & LTFRB Base Fare Strip (GrabPay / Maxim Balance Equivalent) */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={handleCyclePass}
          aria-label={`Switch commuter fare pass (currently ${activePassMeta.label})`}
          className="flex min-w-0 cursor-pointer flex-col justify-center gap-1 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-raised)]"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="truncate text-[11px] font-medium text-[var(--text-muted)]">
              Fare pass
            </span>
            <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
              {activePassMeta.shortTag}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ticket
              className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <span className="truncate text-xs font-semibold text-[var(--foreground)]">
              {activePassMeta.label}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenRoutes({ modeFilter: 'saved' })}
          aria-label="View saved routes and LTFRB base fares"
          className="flex min-w-0 cursor-pointer items-center justify-between gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-raised)]"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                LTFRB min
              </span>
              <span className="shrink-0 text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
                {savedRouteIds.length} saved
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1 whitespace-nowrap text-xs font-semibold text-[var(--foreground)] tabular-nums">
              <span>{formatFare(baseFareSummary.tradMin)}</span>
              <span className="text-[10px] font-normal text-[var(--text-secondary)]">
                PUJ · {formatFare(baseFareSummary.puvMin)} PUV
              </span>
            </div>
          </div>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* 3. 2-Row Jeepney Mobility Service Grid (8 Tiles) */}
      <section aria-label="Jeepney services">
        <div className="grid grid-cols-4 gap-2">
          {serviceTiles.map((tile) => {
            const Icon = tile.icon;
            const isFareExpanded = tile.id === 'fare-matrix' && fareCalcOpen;
            return (
              <button
                key={tile.id}
                type="button"
                aria-expanded={tile.id === 'fare-matrix' ? fareCalcOpen : undefined}
                onClick={tile.onClick}
                className={`t-card-lift flex min-h-[78px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center transition-colors ${
                  isFareExpanded
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/35'
                    : 'border-[var(--border)] bg-[var(--surface-raised)]/65 hover:bg-[var(--surface-raised)]'
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile.toneClass}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="whitespace-nowrap text-[10.5px] leading-tight font-semibold text-[var(--foreground)]">
                  {tile.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Interactive LTFRB Fare Matrix Calculator (Toggled from Service Grid) */}
      {fareCalcOpen && (
        <section
          aria-label="LTFRB Fare Matrix Calculator"
          className="t-panel-reveal rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface)] p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                LTFRB Fare Matrix Calculator
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Synced with Admin fare rules · First{' '}
                {calcSampleRoutes.tradRates.firstKmCount} km base
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFareCalcOpen(false)}
              className="cursor-pointer rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              Hide
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="home-calc-route"
                className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]"
              >
                Sample route distance
              </label>
              <select
                id="home-calc-route"
                value={resolvedCalcRouteId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCalcRouteId(nextId);
                  const found = cityRoutes.find((r) => r.id === nextId);
                  if (found) {
                    setCalcDistanceKm(
                      Math.max(1, Math.min(25, Math.round(found.totalDistanceKm)))
                    );
                  }
                }}
                className="min-h-[38px] w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-xs text-[var(--foreground)]"
              >
                {cityRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} · {r.name} ({r.totalDistanceKm.toFixed(1)} km)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1 block text-[11px] font-medium text-[var(--text-muted)]">
                Trip distance (km)
              </span>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1">
                <button
                  type="button"
                  aria-label="Decrease distance"
                  onClick={() => setCalcDistanceKm((km) => Math.max(1, km - 1))}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="text-sm font-bold text-[var(--foreground)] tabular-nums">
                  {calcDistanceKm} km
                </span>
                <button
                  type="button"
                  aria-label="Increase distance"
                  onClick={() => setCalcDistanceKm((km) => Math.min(25, km + 1))}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Discount Tier Pills */}
          <div
            role="radiogroup"
            aria-label="Fare discount pass"
            className="mt-2.5 grid grid-cols-3 gap-1.5"
          >
            {PASS_CYCLE.map((pass) => {
              const selected = discountType === pass.id;
              return (
                <button
                  key={pass.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChangeDiscountType(pass.id)}
                  className={`min-h-[34px] cursor-pointer rounded-xl border px-2 text-[11px] font-semibold transition-colors ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {pass.id === 'regular'
                    ? 'Regular'
                    : pass.id === 'student'
                      ? 'Student -20%'
                      : 'Senior -20%'}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-2.5">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">
                Traditional PUJ
              </div>
              <div className="mt-0.5 text-lg font-bold text-[var(--foreground)] tabular-nums">
                {formatFare(calcSampleRoutes.tradFare)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                +₱{calcSampleRoutes.tradRates.perKmRate.toFixed(2)}/km past{' '}
                {calcSampleRoutes.tradRates.firstKmCount} km
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 p-2.5">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">
                Modern Aircon PUV
              </div>
              <div className="mt-0.5 text-lg font-bold text-[var(--foreground)] tabular-nums">
                {formatFare(calcSampleRoutes.puvFare)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] tabular-nums">
                +₱{calcSampleRoutes.puvRates.perKmRate.toFixed(2)}/km past{' '}
                {calcSampleRoutes.puvRates.firstKmCount} km
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Popular & Saved Jeepneys in Active City */}
      <section aria-label={`Popular corridors in ${selectedCity.name}`}>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Popular in {selectedCity.name}
          </h2>
          <button
            type="button"
            onClick={() => onOpenRoutes({ modeFilter: 'all' })}
            className="inline-flex cursor-pointer items-center gap-0.5 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>See all ({cityRoutes.length})</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {popularRoutes.map((route) => {
            const isSaved = savedRouteIds.includes(route.id);
            const minFare = getMinimumDisplayFare(
              route,
              fareRules,
              discountType
            );
            const hasDetour = activeAdvisories.some(
              (a) => a.routeCode === route.code
            );
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onSelectRouteTicket(route)}
                className="group t-card-lift flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 pr-3 text-left transition-colors hover:bg-[var(--surface-raised)]/65"
              >
                <TransitVehicleArtwork
                  color={route.color}
                  vehicleType={route.vehicleType}
                  size="compact"
                />

                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums"
                      style={{ backgroundColor: route.color }}
                    >
                      {route.code}
                    </span>
                    {isSaved && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        <Bookmark className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                        <span>Saved</span>
                      </span>
                    )}
                    {hasDetour && (
                      <span className="rounded-full bg-[var(--peak-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                        Detour
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 truncate text-xs font-semibold text-[var(--foreground)]">
                    {route.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] tabular-nums">
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatFare(minFare)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{route.headwayMin}</span>
                  </div>
                </div>

                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* 6. Live City & LTFRB Advisories Feed (Connected Live to Admin Portal) */}
      <section aria-label="Live corridor advisories">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Live corridor updates
          </h2>
          <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
            {activeAdvisories.length} active
          </span>
        </div>

        {activeAdvisories.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/50 px-3.5 py-3 text-xs text-[var(--text-secondary)]">
            <ShieldCheck
              className="h-4 w-4 shrink-0 text-[var(--success)]"
              aria-hidden="true"
            />
            <span>
              All {selectedCity.name} jeepney &amp; PUV corridors running normal headways.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeAdvisories.map((adv) => {
              const affectedRoute = cityRoutes.find(
                (r) => r.code === adv.routeCode
              );
              return (
                <div
                  key={adv.id}
                  className="rounded-2xl border border-[var(--peak)]/30 bg-[var(--peak-subtle)]/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <AlertTriangle
                        className="h-3.5 w-3.5 shrink-0 text-[var(--peak)]"
                        aria-hidden="true"
                      />
                      <span className="truncate text-xs font-semibold text-[var(--foreground)]">
                        {adv.title}
                      </span>
                    </div>
                    {affectedRoute ? (
                      <button
                        type="button"
                        onClick={() => onSelectRouteTicket(affectedRoute)}
                        className="shrink-0 cursor-pointer rounded-md px-2 py-0.5 font-mono text-[10px] font-bold text-white"
                        style={{ backgroundColor: affectedRoute.color }}
                      >
                        {adv.routeCode}
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-md bg-[#111827] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                        {adv.routeCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">
                    {adv.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
