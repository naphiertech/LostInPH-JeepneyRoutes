import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LocateFixed,
} from 'lucide-react';
import {
  ColorSchemeSetting,
  CommuterNotificationPrefs,
} from '@/adapters/browser/storage';
import { AuthUser } from '@/domain/auth/types';
import {
  createMapPinpoint,
  getUniqueCityStops,
  planJeepneyTrips,
  rankRoutesNearPinpoint,
  recommendTripsFromOriginToPinpoint,
} from '@/domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  JeepneyRoute,
  MapPinpoint,
  NewFieldReportInput,
  TripOption,
  UserLocation,
} from '@/domain/transit/types';
import { TransitMap } from '@/shared/map/TransitMap';
import { LostInPhLogo } from '@/shared/ui/LostInPhLogo';
import {
  NotificationBellPopover,
  useNotifications,
} from '@/shared/ui/NotificationCenter';
import { BottomNavDock, CommuterTab } from './components/BottomNavDock';
import { FieldReportSheet } from './components/FieldReportSheet';
import { RouteTicketSheet } from './components/RouteTicketSheet';
import { useBottomSheetDrag } from './hooks/useBottomSheetDrag';
import { GpsStatus } from './hooks/useGeolocation';
import { CommuterHomeView } from './tabs/CommuterHomeView';
import { CommuterNotificationsView } from './tabs/CommuterNotificationsView';
import { CommuterProfileView } from './tabs/CommuterProfileView';
import { PlanTab } from './tabs/PlanTab';
import { RoutesTab, RouteVehicleFilter } from './tabs/RoutesTab';
import { TrackTab } from './tabs/TrackTab';

export type { CommuterTab };

interface CommuterViewProps {
  cities: CityInfo[];
  selectedCity: CityInfo;
  cityRoutes: JeepneyRoute[];
  selectedRoute: JeepneyRoute;
  cityAdvisories: CorridorAdvisory[];
  activeTab: CommuterTab;
  onTabChange: (tab: CommuterTab) => void;
  onSelectCity: (cityId: CityId) => void;
  onSelectRoute: (route: JeepneyRoute) => void;
  activeUser: AuthUser | null;
  savedRouteIds: string[];
  onToggleSaveRoute: (routeId: string) => void;
  userLocation: UserLocation;
  gpsStatus: GpsStatus;
  onLocateMe: () => void;
  onSetManualUserLocation: (lat: number, lng: number) => void;
  onDemoCityJump: () => void;
  notificationPrefs: CommuterNotificationPrefs;
  onChangeNotificationPrefs: (next: CommuterNotificationPrefs) => void;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onOpenAuth: () => void;
  activeTrip: TripOption | null;
  onStartTripNavigation: (trip: TripOption) => void;
  onClearTripNavigation: () => void;
  onSubmitFieldReport: (
    input: NewFieldReportInput
  ) => Promise<CommunityReport> | CommunityReport;
}

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
  cityAdvisories,
  activeTab,
  onTabChange,
  onSelectCity,
  onSelectRoute,
  activeUser,
  savedRouteIds,
  onToggleSaveRoute,
  userLocation,
  gpsStatus,
  onLocateMe,
  onSetManualUserLocation,
  onDemoCityJump,
  notificationPrefs,
  onChangeNotificationPrefs,
  schemeSetting,
  onChangeScheme,
  onOpenAuth,
  activeTrip,
  onStartTripNavigation,
  onClearTripNavigation,
  onSubmitFieldReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] =
    useState<RouteVehicleFilter>('all');
  const [exploreMode, setExploreMode] = useState<'list' | 'ticket'>('list');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [trackStopsOpen, setTrackStopsOpen] = useState(false);
  const [reportSheetRoute, setReportSheetRoute] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [originPickMode, setOriginPickMode] = useState(false);
  const [mapPinpoint, setMapPinpoint] = useState<MapPinpoint | null>(null);
  const { notify } = useNotifications();

  const {
    sheetSnap,
    setSheetSnap,
    dragOffsetY,
    handleSheetPointerDown,
    handleSheetPointerMove,
    finishSheetDrag,
    cancelSheetDrag,
    togglePeek,
  } = useBottomSheetDrag('half');

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

  const originRanking = useMemo(
    () =>
      rankRoutesNearPinpoint(userLocation.lat, userLocation.lng, cityRoutes, 900),
    [userLocation.lat, userLocation.lng, cityRoutes]
  );

  const pinpointRanking = useMemo(() => {
    if (!mapPinpoint) return null;
    return rankRoutesNearPinpoint(mapPinpoint.lat, mapPinpoint.lng, cityRoutes);
  }, [mapPinpoint, cityRoutes]);

  const pinpointTripPlan = useMemo(() => {
    if (!mapPinpoint) return null;
    return recommendTripsFromOriginToPinpoint(
      userLocation.lat,
      userLocation.lng,
      mapPinpoint.lat,
      mapPinpoint.lng,
      cityRoutes
    );
  }, [userLocation.lat, userLocation.lng, mapPinpoint, cityRoutes]);

  const recommendedRouteIds = useMemo(() => {
    if (pinpointTripPlan && pinpointTripPlan.recommendedRouteIds.size > 0) {
      return pinpointTripPlan.recommendedRouteIds;
    }
    if (!pinpointRanking) return new Set<string>();
    return new Set(pinpointRanking.recommended.map((m) => m.route.id));
  }, [pinpointTripPlan, pinpointRanking]);

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

  const filteredPinpointTrips = useMemo(() => {
    if (!pinpointTripPlan) return [];
    return pinpointTripPlan.recommendations.filter((rec) =>
      rec.trip.legs.some((leg) => filteredRouteIds.has(leg.route.id))
    );
  }, [pinpointTripPlan, filteredRouteIds]);

  const otherFilteredMatches = useMemo(() => {
    if (!pinpointRanking) return [];
    const recIds = new Set<string>();
    for (const rec of filteredPinpointTrips) {
      for (const leg of rec.trip.legs) recIds.add(leg.route.id);
    }
    return [...pinpointRanking.recommended, ...pinpointRanking.others].filter(
      (m) => filteredRouteIds.has(m.route.id) && !recIds.has(m.route.id)
    );
  }, [pinpointRanking, filteredPinpointTrips, filteredRouteIds]);

  const quickPinStops = useMemo(() => {
    const hubs = cityStops.filter((s) => s.isTerminal || s.isTransferHub);
    return (hubs.length >= 3 ? hubs : cityStops).slice(0, 3);
  }, [cityStops]);

  const plannedTrips = useMemo(
    () => planJeepneyTrips(selectedCity.id, originStop, destStop, cityRoutes),
    [selectedCity.id, originStop, destStop, cityRoutes]
  );

  useEffect(() => {
    setExpandedTripId(plannedTrips[0]?.id ?? null);
  }, [plannedTrips]);

  const activeAdvisories = useMemo(
    () => cityAdvisories.filter((a) => a.active),
    [cityAdvisories]
  );

  const currentNavItem = navigationStops[navStepIndex] ?? navigationStops[0];

  const handlePinpointOnMap = (lat: number, lng: number) => {
    const pin = createMapPinpoint(lat, lng, cityRoutes, selectedCity.name);
    setMapPinpoint(pin);
    setOriginPickMode(false);
    const plan = recommendTripsFromOriginToPinpoint(
      userLocation.lat,
      userLocation.lng,
      lat,
      lng,
      cityRoutes
    );
    const topRec = plan.recommendations[0];
    const topRoute = topRec?.trip.legs[0]?.route;
    if (topRoute) {
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
      title: `Route recommendations to ${pin.nearestStopName}`,
      description: topRec
        ? topRec.trip.summaryNote
        : `${plan.recommendations.length} jeepney option(s) found.`,
      category: 'transit_store',
      kind: 'saved_route',
      routeCode: topRoute?.code,
      tone: 'info',
      tagLabel: topRoute ? `Ride: ${topRoute.code}` : selectedCity.name,
    });
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

  const handleStartRouteAsNav = (route: JeepneyRoute) => {
    onSelectRoute(route);
    onClearTripNavigation();
    setNavStepIndex(0);
    setSheetSnap('half');
    onTabChange('navigate');
  };

  const isFullSheetView =
    notificationsOpen || activeTab === 'profile' || activeTab === 'home';

  return (
    <>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[448px_1fr] lg:items-start lg:gap-4">
        {/* Top Bar: Left (Brand + City + GPS) / Right (Alerts + Bell + Profile) */}
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
              onClick={onLocateMe}
              aria-label="Locate my position using GPS"
              title="Locate my position using GPS"
              className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors sm:w-auto sm:px-2.5 ${
                gpsStatus === 'live'
                  ? 'bg-blue-500/12 text-blue-700 dark:text-blue-300'
                  : 'bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)]'
              }`}
            >
              <LocateFixed
                className={`h-3.5 w-3.5 shrink-0 ${
                  gpsStatus === 'live'
                    ? 'text-[#2563EB]'
                    : 'text-[var(--accent)]'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {gpsStatus === 'locating' ? 'Locating…' : 'GPS'}
              </span>
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
                <AlertTriangle
                  className="h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
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

        {/* Interactive Map */}
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
              userLocation={userLocation}
              originPickMode={originPickMode}
              pinpoint={mapPinpoint}
              recommendedRouteIds={recommendedRouteIds}
              pinpointClosestStop={pinpointClosestStopOnSelected}
              onPinpointMap={handlePinpointOnMap}
              onSetUserLocationMap={(lat, lng) => {
                onSetManualUserLocation(lat, lng);
                setOriginPickMode(false);
              }}
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
              onLocateMe={onLocateMe}
              heightClass="h-full"
            />
          </div>
        </section>

        {/* Mobile Bottom Sheet / Desktop Left Panel */}
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
              onPointerCancel={cancelSheetDrag}
              onClick={togglePeek}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  togglePeek();
                }
              }}
              className="cursor-grab touch-none py-1.5 select-none active:cursor-grabbing lg:hidden"
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
                {activeTab === 'home' && (
                  <CommuterHomeView
                    selectedCity={selectedCity}
                    userName={activeUser?.name ?? 'Commuter'}
                    cityRoutes={cityRoutes}
                    cityStops={cityStops}
                    selectedRoute={selectedRoute}
                    activeAdvisories={activeAdvisories}
                    savedRouteIds={savedRouteIds}
                    userLocation={userLocation}
                    gpsStatus={gpsStatus}
                    onLocateMe={onLocateMe}
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

                {activeTab === 'explore' &&
                  (exploreMode === 'ticket' ? (
                    <RouteTicketSheet
                      route={selectedRoute}
                      advisories={activeAdvisories}
                      isSaved={savedRouteIds.includes(selectedRoute.id)}
                      onBackToList={() => setExploreMode('list')}
                      onToggleSave={onToggleSaveRoute}
                      onStartRide={handleStartRouteAsNav}
                      onOpenReportIssue={(code) => setReportSheetRoute(code)}
                    />
                  ) : (
                    <RoutesTab
                      selectedCity={selectedCity}
                      selectedRoute={selectedRoute}
                      filteredRoutes={filteredRoutes}
                      savedRouteIds={savedRouteIds}
                      activeAdvisories={activeAdvisories}
                      searchQuery={searchQuery}
                      onChangeSearchQuery={setSearchQuery}
                      vehicleFilter={vehicleFilter}
                      onChangeVehicleFilter={setVehicleFilter}
                      userLocation={userLocation}
                      gpsStatus={gpsStatus}
                      originPickMode={originPickMode}
                      onToggleOriginPickMode={() =>
                        setOriginPickMode((prev) => !prev)
                      }
                      onDemoCityJump={onDemoCityJump}
                      mapPinpoint={mapPinpoint}
                      onPinpointStop={handlePinpointOnMap}
                      onClearPinpoint={() => setMapPinpoint(null)}
                      onOpenPinpointInPlanner={(destStopName) => {
                        setDestStop(destStopName);
                        onTabChange('planner');
                      }}
                      quickPinStops={quickPinStops}
                      filteredPinpointTrips={filteredPinpointTrips}
                      otherFilteredMatches={otherFilteredMatches}
                      originDistanceByRouteId={originRanking.allByRouteId}
                      onSelectRouteTicket={(route) => {
                        onClearTripNavigation();
                        onSelectRoute(route);
                        setExploreMode('ticket');
                      }}
                      onToggleSaveRoute={onToggleSaveRoute}
                      onFollowTrip={(trip) => {
                        onStartTripNavigation(trip);
                        setNavStepIndex(0);
                        setSheetSnap('half');
                        onTabChange('navigate');
                      }}
                    />
                  ))}

                {activeTab === 'planner' && (
                  <PlanTab
                    selectedCity={selectedCity}
                    cityStops={cityStops}
                    originStop={originStop}
                    destStop={destStop}
                    onChangeOriginStop={setOriginStop}
                    onChangeDestStop={setDestStop}
                    onSwapStops={() => {
                      setOriginStop(destStop);
                      setDestStop(originStop);
                    }}
                    plannedTrips={plannedTrips}
                    expandedTripId={expandedTripId}
                    onToggleExpandTrip={setExpandedTripId}
                    onStartTrip={(trip) => {
                      onStartTripNavigation(trip);
                      setNavStepIndex(0);
                      onTabChange('navigate');
                    }}
                  />
                )}

                {activeTab === 'navigate' && (
                  <TrackTab
                    selectedCity={selectedCity}
                    navigationStops={navigationStops}
                    navStepIndex={navStepIndex}
                    isAutoPlaying={isAutoPlaying}
                    trackStopsOpen={trackStopsOpen}
                    onToggleTrackStops={() => setTrackStopsOpen((o) => !o)}
                    onPrevStop={() => {
                      setIsAutoPlaying(false);
                      setNavStepIndex((i) => Math.max(0, i - 1));
                    }}
                    onNextStop={() => {
                      setIsAutoPlaying(false);
                      setNavStepIndex((i) =>
                        Math.min(navigationStops.length - 1, i + 1)
                      );
                    }}
                    onToggleAutoPlay={() => setIsAutoPlaying((p) => !p)}
                    onRestart={() => {
                      setIsAutoPlaying(false);
                      setNavStepIndex(0);
                    }}
                    onReportIssue={(code) =>
                      setReportSheetRoute(code ?? selectedRoute.code)
                    }
                  />
                )}

                {activeTab === 'profile' && activeUser && (
                  <CommuterProfileView
                    activeUser={activeUser}
                    selectedCity={selectedCity}
                    cityRoutes={cityRoutes}
                    activeAdvisories={activeAdvisories}
                    savedRouteIds={savedRouteIds}
                    schemeSetting={schemeSetting}
                    onChangeScheme={onChangeScheme}
                    onLocateMe={onLocateMe}
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
