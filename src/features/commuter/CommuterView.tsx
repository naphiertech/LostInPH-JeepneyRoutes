import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Flag,
  LocateFixed,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import {
  ColorSchemeSetting,
  CommuterNotificationPrefs,
} from '../../adapters/browser/storage';
import { AuthUser } from '../../domain/auth/types';
import {
  formatFare,
  getDisplayFare,
  getMinimumDisplayFare,
} from '../../domain/transit/fareEngine';
import {
  createMapPinpoint,
  getUniqueCityStops,
  planJeepneyTrips,
  rankRoutesNearPinpoint,
} from '../../domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  DiscountType,
  FareRule,
  JeepneyRoute,
  MapPinpoint,
  NewFieldReportInput,
  TripOption,
} from '../../domain/transit/types';
import { TransitMap } from '../../shared/map/TransitMap';
import { LostInPhLogo } from '../../shared/ui/LostInPhLogo';
import {
  NotificationBellPopover,
  useNotifications,
} from '../../shared/ui/NotificationCenter';
import { BottomNavDock, CommuterTab } from './components/BottomNavDock';
import { CommuterHomeView } from './components/CommuterHomeView';
import { CommuterNotificationsView } from './components/CommuterNotificationsView';
import { CommuterProfileView } from './components/CommuterProfileView';
import { FieldReportSheet } from './components/FieldReportSheet';
import { RouteTicketSheet } from './components/RouteTicketSheet';
import { TransitVehicleArtwork } from './components/TransitRouteArtwork';

export type { CommuterTab };

interface CommuterViewProps {
  cities: CityInfo[];
  selectedCity: CityInfo;
  cityRoutes: JeepneyRoute[];
  selectedRoute: JeepneyRoute;
  fareRules: FareRule[];
  cityAdvisories: CorridorAdvisory[];
  activeTab: CommuterTab;
  onTabChange: (tab: CommuterTab) => void;
  onSelectCity: (cityId: CityId) => void;
  onSelectRoute: (route: JeepneyRoute) => void;
  activeUser: AuthUser | null;
  savedRouteIds: string[];
  onToggleSaveRoute: (routeId: string) => void;
  discountType: DiscountType;
  onChangeDiscountType: (discount: DiscountType) => void;
  notificationPrefs: CommuterNotificationPrefs;
  onChangeNotificationPrefs: (next: CommuterNotificationPrefs) => void;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onSimulateGpsCity: () => void;
  onOpenAuth: () => void;
  activeTrip: TripOption | null;
  onStartTripNavigation: (trip: TripOption) => void;
  onClearTripNavigation: () => void;
  onSubmitFieldReport: (input: NewFieldReportInput) => CommunityReport;
}

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  regular: 'Regular',
  student: 'Student (-20%)',
  senior_pwd: 'Senior / PWD (-20%)',
};

interface SelectPillProps {
  id: string;
  value: string;
  displayLabel: string;
  onChange: (value: string) => void;
  pillClassName: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}

/** Accessible native select overlaid onto a flex-centered pill so Chromium never top-aligns labels. */
function SelectPill({
  id,
  value,
  displayLabel,
  onChange,
  pillClassName,
  options,
}: SelectPillProps) {
  return (
    <div className="group relative inline-flex shrink-0 items-center">
      <span aria-hidden="true" className={pillClassName}>
        <span>{displayLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const CommuterView: React.FC<CommuterViewProps> = ({
  cities,
  selectedCity,
  cityRoutes,
  selectedRoute,
  fareRules,
  cityAdvisories,
  activeTab,
  onTabChange,
  onSelectCity,
  onSelectRoute,
  activeUser,
  savedRouteIds,
  onToggleSaveRoute,
  discountType,
  onChangeDiscountType,
  notificationPrefs,
  onChangeNotificationPrefs,
  schemeSetting,
  onChangeScheme,
  onSimulateGpsCity,
  onOpenAuth,
  activeTrip,
  onStartTripNavigation,
  onClearTripNavigation,
  onSubmitFieldReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<
    'all' | 'traditional_jeepney' | 'modern_puv' | 'saved'
  >('all');
  const [exploreMode, setExploreMode] = useState<'list' | 'ticket'>('list');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [trackStopsOpen, setTrackStopsOpen] = useState(false);
  const [reportSheetRoute, setReportSheetRoute] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mapPinpoint, setMapPinpoint] = useState<MapPinpoint | null>(null);
  const [sheetSnap, setSheetSnap] = useState<'peek' | 'half' | 'full'>('half');
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartRef = useRef<{ y: number; time: number } | null>(null);
  const didDragRef = useRef(false);
  const { notify } = useNotifications();

  const cityStops = useMemo(
    () => getUniqueCityStops(selectedCity.id, cityRoutes),
    [selectedCity.id, cityRoutes]
  );

  const [originStop, setOriginStop] = useState<string>(
    cityStops[0]?.name ?? ''
  );
  const [destStop, setDestStop] = useState<string>(
    cityStops[Math.min(4, cityStops.length - 1)]?.name ?? ''
  );

  useEffect(() => {
    if (cityStops.length >= 2) {
      setOriginStop(cityStops[0].name);
      setDestStop(cityStops[Math.min(4, cityStops.length - 1)].name);
    }
    setMapPinpoint(null);
    setExploreMode('list');
  }, [selectedCity.id, cityStops]);

  const navigationStops = useMemo(() => {
    if (activeTrip) {
      return activeTrip.legs.flatMap((leg) =>
        leg.stopsInLeg.map((stop) => ({
          stop,
          routeCode: leg.route.code,
          signboardText: leg.route.signboardText,
        }))
      );
    }
    return selectedRoute.stops.map((stop) => ({
      stop,
      routeCode: selectedRoute.code,
      signboardText: selectedRoute.signboardText,
    }));
  }, [activeTrip, selectedRoute]);

  const [navStepIndex, setNavStepIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    setNavStepIndex(0);
    setIsAutoPlaying(false);
  }, [activeTrip?.id, selectedRoute.id]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = window.setInterval(() => {
      setNavStepIndex((prev) => {
        if (prev >= navigationStops.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [isAutoPlaying, navigationStops.length]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cityRoutes.filter((route) => {
      if (vehicleFilter === 'saved' && !savedRouteIds.includes(route.id)) {
        return false;
      }
      const matchesVehicle =
        vehicleFilter === 'all' ||
        vehicleFilter === 'saved' ||
        route.vehicleType === vehicleFilter;
      if (!matchesVehicle) return false;
      if (!q) return true;
      return (
        route.code.toLowerCase().includes(q) ||
        route.name.toLowerCase().includes(q) ||
        route.signboardText.toLowerCase().includes(q) ||
        route.stops.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.landmark.toLowerCase().includes(q)
        )
      );
    });
  }, [cityRoutes, searchQuery, vehicleFilter, savedRouteIds]);

  const pinpointRanking = useMemo(() => {
    if (!mapPinpoint) return null;
    return rankRoutesNearPinpoint(mapPinpoint.lat, mapPinpoint.lng, cityRoutes);
  }, [mapPinpoint, cityRoutes]);

  const recommendedRouteIds = useMemo(() => {
    if (!pinpointRanking) return new Set<string>();
    return new Set(pinpointRanking.recommended.map((m) => m.route.id));
  }, [pinpointRanking]);

  const pinpointClosestStopOnSelected = useMemo(() => {
    if (!pinpointRanking) return null;
    return (
      pinpointRanking.allByRouteId.get(selectedRoute.id)?.closestStop ??
      pinpointRanking.recommended[0]?.closestStop ??
      null
    );
  }, [pinpointRanking, selectedRoute.id]);

  const filteredRouteIds = useMemo(
    () => new Set(filteredRoutes.map((r) => r.id)),
    [filteredRoutes]
  );

  const recommendedFilteredMatches = useMemo(
    () =>
      pinpointRanking
        ? pinpointRanking.recommended.filter((m) =>
            filteredRouteIds.has(m.route.id)
          )
        : [],
    [pinpointRanking, filteredRouteIds]
  );

  const otherFilteredMatches = useMemo(
    () =>
      pinpointRanking
        ? pinpointRanking.others.filter((m) => filteredRouteIds.has(m.route.id))
        : [],
    [pinpointRanking, filteredRouteIds]
  );

  const quickPinStops = useMemo(() => {
    const hubs = cityStops.filter((s) => s.isTerminal || s.isTransferHub);
    return (hubs.length >= 3 ? hubs : cityStops).slice(0, 3);
  }, [cityStops]);

  const handlePinpointOnMap = (lat: number, lng: number) => {
    const pin = createMapPinpoint(lat, lng, cityRoutes, selectedCity.name);
    setMapPinpoint(pin);
    const ranking = rankRoutesNearPinpoint(lat, lng, cityRoutes);
    const topRoute = ranking.recommended[0]?.route;
    if (
      topRoute &&
      !ranking.recommended.some((m) => m.route.id === selectedRoute.id)
    ) {
      onClearTripNavigation();
      onSelectRoute(topRoute);
    }
    setExploreMode('list');
    if (activeTab !== 'explore') {
      onTabChange('explore');
    }
    if (sheetSnap === 'peek') {
      setSheetSnap('half');
    }
    notify({
      title: `Pinpoint near ${pin.nearestStopName}`,
      description: `${ranking.recommended.length} jeepney corridor(s) recommended first.`,
      category: 'transit_store',
      tone: 'info',
      tagLabel: topRoute ? `Top: ${topRoute.code}` : selectedCity.name,
    });
  };

  const plannedTrips = useMemo(
    () =>
      planJeepneyTrips(
        selectedCity.id,
        originStop,
        destStop,
        cityRoutes,
        fareRules
      ),
    [selectedCity.id, originStop, destStop, cityRoutes, fareRules]
  );

  useEffect(() => {
    setExpandedTripId(plannedTrips[0]?.id ?? null);
  }, [plannedTrips]);

  const activeAdvisories = useMemo(
    () => cityAdvisories.filter((a) => a.active),
    [cityAdvisories]
  );

  const currentNavItem = navigationStops[navStepIndex] ?? navigationStops[0];
  const stopsRemaining = Math.max(0, navigationStops.length - 1 - navStepIndex);
  const isParaPoZone = stopsRemaining <= 1 && navigationStops.length > 1;

  const handleSwapStops = () => {
    setOriginStop(destStop);
    setDestStop(originStop);
  };

  const handleStartRouteAsNav = (route: JeepneyRoute) => {
    onSelectRoute(route);
    onClearTripNavigation();
    setNavStepIndex(0);
    setSheetSnap('half');
    onTabChange('navigate');
  };

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStartRef.current = { y: e.clientY, time: Date.now() };
    didDragRef.current = false;
    setDragOffsetY(0);
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dy) >= 9) {
      didDragRef.current = true;
    }
    setDragOffsetY(Math.max(-140, Math.min(180, dy)));
  };

  const finishSheetDrag = (clientY: number) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDragOffsetY(0);

    const dy = clientY - start.y;
    const dt = Math.max(1, Date.now() - start.time);
    const velocity = dy / dt;

    if (Math.abs(dy) < 9) {
      return;
    }

    // Dragged down -> collapse toward peek so user sees the whole route map
    if (dy > 28 || velocity > 0.25) {
      setSheetSnap((prev) => {
        if (prev === 'full' && dy < 110 && velocity < 0.65) return 'half';
        return 'peek';
      });
      return;
    }

    // Dragged up -> expand from peek -> half -> full
    if (dy < -28 || velocity < -0.25) {
      setSheetSnap((prev) => {
        if (prev === 'peek' && dy > -120 && velocity > -0.65) return 'half';
        return 'full';
      });
    }
  };

  const handleOpenRouteByCode = (routeCode: string) => {
    const target = cityRoutes.find(
      (r) => r.code.toUpperCase() === routeCode.toUpperCase()
    );
    if (!target) return;
    onClearTripNavigation();
    onSelectRoute(target);
    setExploreMode('ticket');
    setNotificationsOpen(false);
    setSheetSnap('half');
    onTabChange('explore');
  };

  const isFullSheetView =
    notificationsOpen || activeTab === 'profile' || activeTab === 'home';

  return (
    <>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[448px_1fr] lg:items-start lg:gap-4">
        {/* Architectural Top Bar: Left (Brand + City + Inline GPS) / Right (Quiet Bell + Avatar) */}
        <header
          role="banner"
          aria-label="LostInPH Commuter workspace"
          className="order-1 mb-2.5 flex h-12 items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-2 sm:px-3 lg:col-span-2 lg:mb-0 lg:px-4"
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setExploreMode('list');
                onTabChange('home');
              }}
              aria-label="LostInPH home"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-opacity hover:opacity-90"
            >
              <LostInPhLogo size="sm" theme="darkTile" />
            </button>

            <span
              aria-hidden="true"
              className="h-4 w-px shrink-0 bg-[var(--border)]"
            />

            <label htmlFor="commuter-city-select" className="visually-hidden">
              Select Philippine city
            </label>
            <SelectPill
              id="commuter-city-select"
              value={selectedCity.id}
              displayLabel={selectedCity.name}
              onChange={(v) => onSelectCity(v as CityId)}
              pillClassName="pointer-events-none inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-sm font-semibold tracking-tight text-[var(--foreground)] transition-colors group-hover:bg-[var(--surface-raised)]"
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
            />

            <button
              type="button"
              onClick={onSimulateGpsCity}
              aria-label="Detect my city using GPS"
              title="Detect my city using GPS"
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[var(--surface-raised)] text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] sm:w-auto sm:px-2.5"
            >
              <LocateFixed
                className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">GPS</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <span className="hidden text-xs text-[var(--text-secondary)] lg:inline">
              Call{' '}
              <strong className="font-medium text-[var(--foreground)]">
                &ldquo;{selectedCity.localStopPhrase}&rdquo;
              </strong>
            </span>

            {activeAdvisories.length > 0 && (
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                aria-pressed={notificationsOpen}
                className="hidden cursor-pointer items-center gap-1 rounded-full bg-[var(--peak-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--peak)] tabular-nums transition-opacity hover:opacity-85 md:inline-flex"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{activeAdvisories.length} alert</span>
              </button>
            )}

            <NotificationBellPopover
              compact
              isActive={notificationsOpen}
              advisoryCount={activeAdvisories.length}
              onOpenNotificationCenter={() => setNotificationsOpen(true)}
              onSelectRouteCode={handleOpenRouteByCode}
            />

            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                onTabChange('profile');
              }}
              aria-label={`Open ${activeUser?.name ?? 'Commuter'} profile`}
              aria-pressed={!notificationsOpen && activeTab === 'profile'}
              className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full p-0.5 transition-colors sm:pr-2.5 ${
                !notificationsOpen && activeTab === 'profile'
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
                {activeUser?.avatarInitials ?? 'LP'}
              </span>
              <span className="hidden text-xs font-semibold sm:inline">
                {activeUser?.name.split(' ')[0] ?? 'Profile'}
              </span>
            </button>
          </div>
        </header>

        {/* Interactive Map First on Mobile (< lg, hidden inside Home, Profile & Notifications), Right Sticky on Desktop */}
        <section
          aria-label="Interactive transit map"
          className={`order-2 w-full lg:sticky lg:top-[16px] lg:order-3 ${
            isFullSheetView ? 'hidden lg:block' : ''
          }`}
        >
          <div
            className={`w-full ${
              sheetSnap === 'peek'
                ? 'h-[calc(100dvh-218px)] min-h-[390px] lg:h-[calc(100dvh-6rem)] lg:max-h-none lg:min-h-[580px]'
                : sheetSnap === 'full'
                  ? 'h-[18dvh] min-h-[136px] max-h-[175px] lg:h-[calc(100dvh-6rem)] lg:max-h-none lg:min-h-[580px]'
                  : activeTab === 'navigate'
                    ? 'h-[35dvh] min-h-[210px] max-h-[280px] lg:h-[calc(100dvh-6rem)] lg:max-h-none lg:min-h-[580px]'
                    : 'h-[32dvh] min-h-[210px] max-h-[290px] lg:h-[calc(100dvh-6rem)] lg:max-h-none lg:min-h-[580px]'
            }`}
          >
            <TransitMap
              city={selectedCity}
              cityRoutes={cityRoutes}
              selectedRoute={selectedRoute}
              activeTrip={activeTrip}
              showFullRouteOverview={sheetSnap === 'peek'}
              liveStopPosition={
                activeTab === 'navigate' ? currentNavItem?.stop ?? null : null
              }
              pinpoint={mapPinpoint}
              recommendedRouteIds={recommendedRouteIds}
              pinpointClosestStop={pinpointClosestStopOnSelected}
              onPinpointMap={handlePinpointOnMap}
              onClearPinpoint={() => setMapPinpoint(null)}
              onSelectRoute={(route) => {
                onClearTripNavigation();
                onSelectRoute(route);
                setExploreMode('ticket');
                setSheetSnap('half');
                onTabChange('explore');
              }}
              onPickStopAsOrigin={(name) => {
                setOriginStop(name);
                setSheetSnap('half');
                onTabChange('planner');
              }}
              onPickStopAsDestination={(name) => {
                setDestStop(name);
                setSheetSnap('half');
                onTabChange('planner');
              }}
              onSimulateGpsCity={onSimulateGpsCity}
              heightClass="h-full"
            />
          </div>
        </section>

        {/* Mobile Overlapping Draggable Bottom Sheet (flex-1 so zero empty gap) / Desktop Left Card */}
        <section
          aria-label="Commuter workspace"
          style={
            dragOffsetY !== 0
              ? { transform: `translateY(${Math.round(dragOffsetY * 0.35)}px)` }
              : undefined
          }
          className={`relative z-10 order-3 -mx-3 flex min-w-0 flex-1 flex-col gap-3.5 bg-[var(--surface)] px-4 pb-28 lg:order-2 lg:mx-0 lg:mt-0 lg:flex-initial lg:rounded-[22px] lg:border lg:border-[var(--border)] lg:p-5 lg:pb-5 lg:shadow-none ${
            isFullSheetView
              ? 'mt-0 rounded-t-[26px] border-t border-[var(--border)] pt-4 shadow-none'
              : '-mt-5 rounded-t-[26px] border-t border-[var(--border)] pt-2 shadow-[0_-6px_24px_rgba(17,24,39,0.06)]'
          }`}
        >
          {/* Interactive Mobile Sheet Drag Handle + Headroom Peek Bar */}
          {!isFullSheetView && (
            <div
              role="button"
              tabIndex={0}
              aria-expanded={sheetSnap !== 'peek'}
              aria-label={
                sheetSnap === 'peek'
                  ? 'Expand bottom sheet'
                  : 'Drag down or tap to collapse bottom sheet and view full route map'
              }
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={(e) => finishSheetDrag(e.clientY)}
              onPointerCancel={() => {
                dragStartRef.current = null;
                didDragRef.current = false;
                setDragOffsetY(0);
              }}
              onClick={() => {
                if (didDragRef.current) {
                  didDragRef.current = false;
                  return;
                }
                setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'peek'));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSheetSnap((prev) => (prev === 'peek' ? 'half' : 'peek'));
                }
              }}
              className=" cursor-grab touch-none py-1.5 select-none active:cursor-grabbing lg:hidden"
            >
              <div className="mx-auto h-1.5 w-11 rounded-full bg-[var(--border)]" />

              {sheetSnap === 'peek' ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                      style={{ backgroundColor: selectedRoute.color }}
                    >
                      {currentNavItem?.routeCode ?? selectedRoute.code}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-[var(--foreground)]">
                        {activeTab === 'navigate'
                          ? currentNavItem?.stop.name ?? selectedRoute.name
                          : selectedRoute.name}
                      </div>
                      <div className="truncate text-[11px] text-[var(--text-secondary)]">
                        Full route map · Tap or drag up to open sheet
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Expand</span>
                  </span>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between px-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  <span>
                    {sheetSnap === 'full'
                      ? 'Expanded sheet · Drag down for map'
                      : 'Drag down for full route map'}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[var(--text-secondary)]">
                    <span>{sheetSnap === 'full' ? 'Collapse' : 'Full map'}</span>
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Responsive Navigation (Inline desktop bar + Fixed dark mobile dock) */}
          <BottomNavDock
            activeTab={notificationsOpen ? null : activeTab}
            onTabChange={(tab) => {
              setNotificationsOpen(false);
              if (tab === 'explore' && activeTab === 'explore') {
                setExploreMode('list');
              }
              setSheetSnap('half');
              onTabChange(tab);
            }}
            advisoryCount={activeAdvisories.length}
          />

          <div
            className={
              sheetSnap === 'peek' && !isFullSheetView
                ? 'hidden lg:flex lg:flex-col lg:gap-4'
                : 'flex flex-1 flex-col gap-4'
            }
          >
          {/* DEDICATED COMMUTER NOTIFICATION CENTER PAGE */}
          {notificationsOpen ? (
            <CommuterNotificationsView
              selectedCity={selectedCity}
              cityRoutes={cityRoutes}
              activeAdvisories={activeAdvisories}
              prefs={notificationPrefs}
              onChangePrefs={onChangeNotificationPrefs}
              onBack={() => setNotificationsOpen(false)}
              onOpenRouteByCode={handleOpenRouteByCode}
            />
          ) : (
            <>
          {/* TAB 0: SUPER-APP HOME HUB */}
          {activeTab === 'home' && (
            <CommuterHomeView
              selectedCity={selectedCity}
              userName={activeUser?.name ?? 'Commuter'}
              cityRoutes={cityRoutes}
              cityStops={cityStops}
              selectedRoute={selectedRoute}
              fareRules={fareRules}
              activeAdvisories={activeAdvisories}
              savedRouteIds={savedRouteIds}
              discountType={discountType}
              onChangeDiscountType={onChangeDiscountType}
              onOpenRoutes={(options) => {
                setVehicleFilter(options?.modeFilter ?? 'all');
                setSearchQuery(options?.searchQuery ?? '');
                setSheetSnap('half');
                if (options?.pinpointStop) {
                  handlePinpointOnMap(
                    options.pinpointStop.lat,
                    options.pinpointStop.lng
                  );
                } else {
                  setExploreMode('list');
                  onTabChange('explore');
                }
              }}
              onSelectRouteTicket={(route) => {
                onClearTripNavigation();
                onSelectRoute(route);
                setExploreMode('ticket');
                setSheetSnap('half');
                onTabChange('explore');
              }}
              onOpenPlanner={(destStopName) => {
                if (destStopName) setDestStop(destStopName);
                setSheetSnap('half');
                onTabChange('planner');
              }}
              onOpenTracker={() => {
                setSheetSnap('half');
                onTabChange('navigate');
              }}
              onOpenReportIssue={(routeCode) =>
                setReportSheetRoute(routeCode ?? selectedRoute.code)
              }
            />
          )}

          {/* TAB 1: ROUTES */}
          {activeTab === 'explore' &&
            (exploreMode === 'ticket' ? (
              <RouteTicketSheet
                route={selectedRoute}
                fareRules={fareRules}
                discountType={discountType}
                advisories={activeAdvisories}
                isSaved={savedRouteIds.includes(selectedRoute.id)}
                onBackToList={() => setExploreMode('list')}
                onToggleSave={onToggleSaveRoute}
                onStartRide={handleStartRouteAsNav}
                onOpenReportIssue={(code) => setReportSheetRoute(code)}
              />
            ) : (
              <div className="t-panel-reveal flex flex-col gap-3">
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
                      onChange={(e) => setSearchQuery(e.target.value)}
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
                          onClick={() => setVehicleFilter(chip.id)}
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

                {/* Map Pinpoint Discovery Strip / Active Pinpoint Banner */}
                {mapPinpoint ? (
                  <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-subtle)]/35 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[var(--foreground)]">
                            Pinpoint · {mapPinpoint.nearestStopName}
                          </div>
                          <div className="truncate text-[11px] text-[var(--text-secondary)] tabular-nums">
                            {mapPinpoint.distanceToNearestStopM} m to stop ·{' '}
                            {recommendedFilteredMatches.length} recommended{' '}
                            {recommendedFilteredMatches.length === 1
                              ? 'jeep'
                              : 'jeeps'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMapPinpoint(null)}
                        aria-label="Clear map pinpoint"
                        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setOriginStop(mapPinpoint.nearestStopName);
                          setSheetSnap('half');
                          onTabChange('planner');
                        }}
                        className="min-h-[32px] cursor-pointer rounded-lg bg-[var(--accent)] px-2.5 text-[11px] font-semibold text-white"
                      >
                        Board here
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDestStop(mapPinpoint.nearestStopName);
                          setSheetSnap('half');
                          onTabChange('planner');
                        }}
                        className="min-h-[32px] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-medium text-[var(--foreground)]"
                      >
                        Go here
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapPinpoint(null)}
                        className="min-h-[32px] cursor-pointer rounded-lg px-2 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]"
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
                            onClick={() => handlePinpointOnMap(stop.lat, stop.lng)}
                            className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:border-[var(--accent)]"
                          >
                            {shortLabel || stop.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Illustrated Jeepney & Modern PUV Route Cards */}
                {filteredRoutes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-center text-xs text-[var(--text-secondary)]">
                    No matching routes in {selectedCity.name}.
                  </div>
                ) : mapPinpoint ? (
                  <div className="flex flex-col gap-3.5">
                    {recommendedFilteredMatches.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-[11px] font-semibold tracking-wide text-[var(--accent)] uppercase">
                            Recommended near pinpoint (
                            {recommendedFilteredMatches.length})
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Closest first
                          </span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {recommendedFilteredMatches.map((match) => {
                            const route = match.route;
                            const isSelected = selectedRoute.id === route.id;
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
                              <div
                                key={route.id}
                                className={`t-card-lift relative flex items-stretch overflow-hidden rounded-2xl border transition-colors ${
                                  isSelected
                                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/25'
                                    : 'border-[var(--accent)]/45 bg-[var(--surface)] hover:bg-[var(--surface-raised)]/60'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClearTripNavigation();
                                    onSelectRoute(route);
                                    setExploreMode('ticket');
                                  }}
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
                                      <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] tabular-nums">
                                        {match.stopDistanceM} m walk ·{' '}
                                        {match.closestStop.name.split('·')[0].trim()}
                                      </span>
                                      {hasDetour && (
                                        <span className="shrink-0 rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                                          Detour
                                        </span>
                                      )}
                                    </div>

                                    <div className="relative z-[1] line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--foreground)]">
                                      {route.name}
                                    </div>

                                    <div className="relative z-[1] flex flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-[var(--text-secondary)] tabular-nums">
                                      <span className="shrink-0 font-semibold text-[var(--foreground)]">
                                        {formatFare(minFare)}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span className="shrink-0">
                                        {route.headwayMin}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span
                                        className={`shrink-0 font-medium ${
                                          route.verificationStatus ===
                                          'field_draft'
                                            ? 'text-[var(--peak)]'
                                            : 'text-[var(--success)]'
                                        }`}
                                      >
                                        {route.verificationStatus ===
                                        'ltfrb_reference'
                                          ? 'LTFRB'
                                          : route.verificationStatus ===
                                              'community_verified'
                                            ? 'Verified'
                                            : 'Draft'}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                <div className="relative z-[1] flex shrink-0 items-center gap-1 pr-2.5">
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
                                        isSaved
                                          ? 't-pop fill-[var(--accent)] text-[var(--accent)]'
                                          : ''
                                      }`}
                                      aria-hidden="true"
                                    />
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
                          {otherFilteredMatches.map((match) => {
                            const route = match.route;
                            const isSelected = selectedRoute.id === route.id;
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
                                  onClick={() => {
                                    onClearTripNavigation();
                                    onSelectRoute(route);
                                    setExploreMode('ticket');
                                  }}
                                  className="group flex min-w-0 flex-1 cursor-pointer items-stretch text-left"
                                >
                                  <TransitVehicleArtwork
                                    color={route.color}
                                    vehicleType={route.vehicleType}
                                    size="row"
                                  />

                                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className="inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                                        style={{ backgroundColor: route.color }}
                                      >
                                        {route.code}
                                      </span>
                                      {hasDetour && (
                                        <span className="shrink-0 rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                                          Detour
                                        </span>
                                      )}
                                    </div>

                                    <div className="relative z-[1] line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--foreground)]">
                                      {route.name}
                                    </div>

                                    <div className="relative z-[1] flex flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-[var(--text-secondary)] tabular-nums">
                                      <span className="shrink-0 font-semibold text-[var(--foreground)]">
                                        {formatFare(minFare)}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span className="shrink-0">
                                        {route.headwayMin}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span
                                        className={`shrink-0 font-medium ${
                                          route.verificationStatus ===
                                          'field_draft'
                                            ? 'text-[var(--peak)]'
                                            : 'text-[var(--success)]'
                                        }`}
                                      >
                                        {route.verificationStatus ===
                                        'ltfrb_reference'
                                          ? 'LTFRB'
                                          : route.verificationStatus ===
                                              'community_verified'
                                            ? 'Verified'
                                            : 'Draft'}
                                      </span>
                                    </div>
                                  </div>
                                </button>

                                <div className="relative z-[1] flex shrink-0 items-center gap-1 pr-2.5">
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
                                        isSaved
                                          ? 't-pop fill-[var(--accent)] text-[var(--accent)]'
                                          : ''
                                      }`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filteredRoutes.map((route) => {
                      const isSelected = selectedRoute.id === route.id;
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
                            onClick={() => {
                              onClearTripNavigation();
                              onSelectRoute(route);
                              setExploreMode('ticket');
                            }}
                            className="group flex min-w-0 flex-1 cursor-pointer items-stretch text-left"
                          >
                            <TransitVehicleArtwork
                              color={route.color}
                              vehicleType={route.vehicleType}
                              size="row"
                            />

                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                                  style={{ backgroundColor: route.color }}
                                >
                                  {route.code}
                                </span>
                                {hasDetour && (
                                  <span className="shrink-0 rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)]">
                                    Detour
                                  </span>
                                )}
                              </div>

                              <div className="relative z-[1] line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--foreground)]">
                                {route.name}
                              </div>

                              <div className="relative z-[1] flex flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-[var(--text-secondary)] tabular-nums">
                                <span className="shrink-0 font-semibold text-[var(--foreground)]">
                                  {formatFare(minFare)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="shrink-0">{route.headwayMin}</span>
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
                                    : route.verificationStatus ===
                                        'community_verified'
                                      ? 'Verified'
                                      : 'Draft'}
                                </span>
                              </div>
                            </div>
                          </button>

                          <div className="relative z-[1] flex shrink-0 items-center gap-1 pr-2.5">
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
                                  isSaved
                                    ? 't-pop fill-[var(--accent)] text-[var(--accent)]'
                                    : ''
                                }`}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

          {/* TAB 2: PLAN TRIP */}
          {activeTab === 'planner' && (
            <div className="t-panel-reveal flex flex-col gap-3.5">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/65 p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    Plan journey
                  </span>
                  <label htmlFor="discount-select" className="visually-hidden">
                    Fare discount tier
                  </label>
                  <SelectPill
                    id="discount-select"
                    value={discountType}
                    displayLabel={DISCOUNT_LABELS[discountType]}
                    onChange={(v) => onChangeDiscountType(v as DiscountType)}
                    pillClassName="pointer-events-none inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-medium text-[var(--foreground)]"
                    options={(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map(
                      (key) => ({ value: key, label: DISCOUNT_LABELS[key] })
                    )}
                  />
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
                      onChange={(e) => setOriginStop(e.target.value)}
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
                        onChange={(e) => setDestStop(e.target.value)}
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
                      onClick={handleSwapStops}
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
                    const displayFare = getDisplayFare(
                      trip.totalFareRegular,
                      trip.totalFareDiscounted,
                      discountType
                    );
                    const isOpen = expandedTripId === trip.id;

                    return (
                      <article
                        key={trip.id}
                        className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedTripId(isOpen ? null : trip.id)
                          }
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
                                {trip.type === 'direct'
                                  ? 'Direct'
                                  : '1 transfer'}
                              </span>
                            </div>
                            <div className="mt-1.5 text-xs text-[var(--text-secondary)] tabular-nums">
                              {trip.totalDurationMin}m · {trip.totalDistanceKm}{' '}
                              km · {trip.walkMeters}m walk
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-display text-xl font-semibold text-[var(--foreground)] tabular-nums">
                              {formatFare(displayFare)}
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
                              onClick={() => {
                                onStartTripNavigation(trip);
                                setNavStepIndex(0);
                                onTabChange('navigate');
                              }}
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
          )}

          {/* TAB 3: LIVE TRACK */}
          {activeTab === 'navigate' && (
            <div className="t-panel-reveal flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                    On the way
                  </span>
                  <span className="rounded-lg bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--foreground)]">
                    {currentNavItem?.routeCode}
                  </span>
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                  {navStepIndex + 1} / {navigationStops.length}
                </span>
              </div>

              {isParaPoZone ? (
                <div
                  role="status"
                  className="t-pop rounded-2xl border border-[var(--peak)] bg-[var(--peak-subtle)] p-3.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--peak)]">
                    <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {stopsRemaining === 0
                        ? `Arrived · Call "${selectedCity.localStopPhrase}"`
                        : `Next stop · Call "${selectedCity.localStopPhrase}"`}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--foreground)]">
                    {navigationStops[navigationStops.length - 1]?.stop.landmark}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/50 p-3.5">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    Current stop · {stopsRemaining} left
                  </div>
                  <div className="mt-0.5 truncate font-display text-base font-semibold text-[var(--foreground)]">
                    {currentNavItem?.stop.name}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                    {currentNavItem?.stop.landmark}
                  </div>
                </div>
              )}

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setNavStepIndex((i) => Math.max(0, i - 1));
                  }}
                  disabled={navStepIndex === 0}
                  aria-label="Previous stop"
                  className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] disabled:opacity-45"
                >
                  <SkipBack className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAutoPlaying((p) => !p)}
                  className="flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white"
                >
                  {isAutoPlaying ? (
                    <>
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      <span>Auto-advance</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setNavStepIndex((i) =>
                      Math.min(navigationStops.length - 1, i + 1)
                    );
                  }}
                  disabled={navStepIndex >= navigationStops.length - 1}
                  aria-label="Next stop"
                  className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] disabled:opacity-45"
                >
                  <SkipForward className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setNavStepIndex(0);
                  }}
                  aria-label="Restart journey"
                  className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Collapsible Upcoming Stops */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
                <button
                  type="button"
                  onClick={() => setTrackStopsOpen((o) => !o)}
                  aria-expanded={trackStopsOpen}
                  className="flex min-h-[40px] w-full cursor-pointer items-center justify-between px-3.5 py-2 font-medium text-[var(--foreground)]"
                >
                  <span>Route stops ({navigationStops.length})</span>
                  {trackStopsOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                {trackStopsOpen && (
                  <ol className="t-panel-reveal divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] px-3.5 py-1">
                    {navigationStops.map((item, idx) => (
                      <li
                        key={`${item.stop.id}-${idx}`}
                        className={`flex items-center justify-between gap-2 py-2 ${
                          idx === navStepIndex
                            ? 'font-semibold text-[var(--accent)]'
                            : idx < navStepIndex
                              ? 'text-[var(--text-muted)] line-through'
                              : 'text-[var(--foreground)]'
                        }`}
                      >
                        <span className="truncate">{item.stop.name}</span>
                        <span className="shrink-0 font-mono text-[10px]">
                          {item.routeCode}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Dark Report Issue CTA */}
              <button
                type="button"
                onClick={() =>
                  setReportSheetRoute(
                    currentNavItem?.routeCode ?? selectedRoute.code
                  )
                }
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                <span>Report Issue</span>
              </button>
            </div>
          )}

          {/* TAB 4: PROFILE HUB (Identity, City Map, Activity, Pass, Saved, Appearance, Sign out) */}
          {activeTab === 'profile' && activeUser && (
            <CommuterProfileView
              activeUser={activeUser}
              selectedCity={selectedCity}
              cityRoutes={cityRoutes}
              fareRules={fareRules}
              activeAdvisories={activeAdvisories}
              savedRouteIds={savedRouteIds}
              discountType={discountType}
              schemeSetting={schemeSetting}
              onChangeScheme={onChangeScheme}
              onChangeDiscountType={onChangeDiscountType}
              onSimulateGpsCity={onSimulateGpsCity}
              onSelectCity={onSelectCity}
              onOpenRouteTicket={(route) => {
                onClearTripNavigation();
                onSelectRoute(route);
                setExploreMode('ticket');
                onTabChange('explore');
              }}
              onToggleSaveRoute={onToggleSaveRoute}
              onTabChange={onTabChange}
              onSignOut={onOpenAuth}
            />
          )}
            </>
          )}
          </div>
        </section>
      </div>

      {/* Commuter -> Admin Two-Way Field Report Drawer */}
      <FieldReportSheet
        isOpen={reportSheetRoute !== null}
        city={selectedCity}
        cityRoutes={cityRoutes}
        initialRouteCode={reportSheetRoute ?? selectedRoute.code}
        reporterName={activeUser?.name ?? 'Commuter'}
        onClose={() => setReportSheetRoute(null)}
        onSubmitReport={onSubmitFieldReport}
      />
    </>
  );
};
