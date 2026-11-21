import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColorSchemeSetting,
  CommuterNotificationPrefs,
  DEFAULT_COMMUTER_NOTIFICATION_PREFS,
  readStoredJson,
  STORAGE_KEYS,
  writeStoredJson,
} from '@/adapters/browser/storage';
import { AuthUser } from '@/domain/auth/types';
import { PresencePort } from '@/domain/telemetry/presencePort';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  JeepneyRoute,
  NewFieldReportInput,
  TripOption,
} from '@/domain/transit/types';
import { useNotifications } from '@/shared/ui/NotificationCenter';
import { CommuterTab, CommuterView } from './CommuterView';
import { useGeolocation } from './hooks/useGeolocation';

interface CommuterWorkspaceProps {
  currentUser: AuthUser;
  cities: CityInfo[];
  routes: JeepneyRoute[];
  advisories: CorridorAdvisory[];
  presencePort: PresencePort;
  onSubmitFieldReport: (
    input: NewFieldReportInput
  ) => Promise<CommunityReport> | CommunityReport;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onSignOut: () => void;
}

export const CommuterWorkspace: React.FC<CommuterWorkspaceProps> = ({
  currentUser,
  cities,
  routes,
  advisories,
  presencePort,
  onSubmitFieldReport,
  schemeSetting,
  onChangeScheme,
  onSignOut,
}) => {
  // Open directly onto Routes (live GPS map + pinpoint first) while keeping all 5 dock tabs
  const [commuterTab, setCommuterTab] = useState<CommuterTab>('explore');
  const [selectedCityId, setSelectedCityId] = useState<CityId>(
    currentUser.homeCity
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    () =>
      routes.find((r) => r.cityId === currentUser.homeCity)?.id ??
      routes[0]?.id ??
      ''
  );
  const [activeTrip, setActiveTrip] = useState<TripOption | null>(null);

  const { notify } = useNotifications();
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>(() => {
    return (
      readStoredJson<string[]>(STORAGE_KEYS.savedRoutes, 'local') ??
      currentUser.savedRouteIds
    );
  });
  const [notificationPrefs, setNotificationPrefs] =
    useState<CommuterNotificationPrefs>(() => {
      const stored = readStoredJson<Partial<CommuterNotificationPrefs>>(
        STORAGE_KEYS.commuterNotificationPrefs,
        'local'
      );
      return {
        ...DEFAULT_COMMUTER_NOTIFICATION_PREFS,
        ...(stored ?? {}),
      };
    });

  const handleChangeNotificationPrefs = (next: CommuterNotificationPrefs) => {
    setNotificationPrefs(next);
    writeStoredJson(STORAGE_KEYS.commuterNotificationPrefs, next, 'local');
  };

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );

  const cityRoutes = useMemo(
    () => routes.filter((r) => r.cityId === selectedCity.id),
    [routes, selectedCity.id]
  );

  const cityAdvisories = useMemo(
    () => advisories.filter((a) => a.cityId === selectedCity.id),
    [advisories, selectedCity.id]
  );

  const selectedRoute = useMemo(
    () =>
      cityRoutes.find((r) => r.id === selectedRouteId) ??
      cityRoutes[0] ??
      routes[0],
    [cityRoutes, selectedRouteId, routes]
  );

  const switchCityCore = useCallback(
    (cityId: CityId) => {
      setSelectedCityId(cityId);
      const nextRoutes = routes.filter((r) => r.cityId === cityId);
      if (nextRoutes[0]) setSelectedRouteId(nextRoutes[0].id);
      setActiveTrip(null);
    },
    [routes]
  );

  const {
    userLocation,
    gpsStatus,
    locateMe,
    setManualLocation,
    jumpDemoCity,
    resetToCityDefault,
  } = useGeolocation({
    cities,
    routes,
    selectedCity,
    cityRoutes,
    onSwitchCity: switchCityCore,
    notify,
  });

  // Track live commuter presence (swaps cleanly to Supabase Realtime Presence)
  useEffect(() => {
    return presencePort.trackCommuterOnline(currentUser.id, selectedCity.id);
  }, [presencePort, currentUser.id, selectedCity.id]);

  const handleSelectCity = useCallback(
    (cityId: CityId) => {
      switchCityCore(cityId);
      const nextCity = cities.find((c) => c.id === cityId) ?? cities[0];
      const nextRoutes = routes.filter((r) => r.cityId === cityId);
      resetToCityDefault(nextCity, nextRoutes);
    },
    [switchCityCore, cities, routes, resetToCityDefault]
  );

  const handleToggleSaveRoute = (routeId: string) => {
    const matched = routes.find((r) => r.id === routeId);
    const alreadySaved = savedRouteIds.includes(routeId);
    setSavedRouteIds((prev) => {
      const next = prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId];
      writeStoredJson(STORAGE_KEYS.savedRoutes, next, 'local');
      return next;
    });
    if (notificationPrefs.savedRoutes) {
      notify({
        title: alreadySaved
          ? `Removed ${matched?.code ?? 'route'} from saved routes`
          : `Saved ${matched?.code ?? 'route'} for quick access`,
        category: 'transit_store',
        kind: 'saved_route',
        routeCode: matched?.code,
        tone: alreadySaved ? 'info' : 'success',
        tagLabel: matched?.name ?? routeId,
      });
    }
  };

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 pt-2.5 pb-0 lg:block lg:p-5">
        <CommuterView
          cities={cities}
          selectedCity={selectedCity}
          cityRoutes={cityRoutes}
          selectedRoute={selectedRoute}
          cityAdvisories={cityAdvisories}
          activeTab={commuterTab}
          onTabChange={setCommuterTab}
          onSelectCity={handleSelectCity}
          onSelectRoute={(r) => setSelectedRouteId(r.id)}
          activeUser={currentUser}
          savedRouteIds={savedRouteIds}
          onToggleSaveRoute={handleToggleSaveRoute}
          userLocation={userLocation}
          gpsStatus={gpsStatus}
          onLocateMe={() => locateMe(false)}
          onSetManualUserLocation={setManualLocation}
          onDemoCityJump={jumpDemoCity}
          notificationPrefs={notificationPrefs}
          onChangeNotificationPrefs={handleChangeNotificationPrefs}
          schemeSetting={schemeSetting}
          onChangeScheme={onChangeScheme}
          onOpenAuth={onSignOut}
          activeTrip={activeTrip}
          onStartTripNavigation={(trip) => {
            setActiveTrip(trip);
            setCommuterTab('navigate');
          }}
          onClearTripNavigation={() => setActiveTrip(null)}
          onSubmitFieldReport={async (input) => {
            const created = await onSubmitFieldReport(input);
            if (notificationPrefs.fareAndReports) {
              notify({
                title: `Report ${created.id} sent for verification`,
                description: `${created.routeCode}: ${created.summary}`,
                category: 'system',
                kind: 'fare_report',
                routeCode: created.routeCode,
                tone: 'success',
                tagLabel: `${created.routeCode} · Sent`,
              });
            }
            return created;
          }}
        />
      </main>
    </div>
  );
};
