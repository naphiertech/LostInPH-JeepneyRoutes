import React, { useMemo, useState } from 'react';
import {
  ColorSchemeSetting,
  CommuterNotificationPrefs,
  DEFAULT_COMMUTER_NOTIFICATION_PREFS,
  readStoredJson,
  STORAGE_KEYS,
  writeStoredJson,
} from '../../adapters/browser/storage';
import { AuthUser } from '../../domain/auth/types';
import { findNearestCity } from '../../domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  DiscountType,
  FareRule,
  JeepneyRoute,
  NewFieldReportInput,
  TripOption,
} from '../../domain/transit/types';
import { useNotifications } from '../../shared/ui/NotificationCenter';
import { CommuterTab, CommuterView } from './CommuterView';

interface CommuterWorkspaceProps {
  currentUser: AuthUser;
  cities: CityInfo[];
  routes: JeepneyRoute[];
  fareRules: FareRule[];
  advisories: CorridorAdvisory[];
  onSubmitFieldReport: (input: NewFieldReportInput) => CommunityReport;
  schemeSetting: ColorSchemeSetting;
  onChangeScheme: (scheme: ColorSchemeSetting) => void;
  onSignOut: () => void;
}

const SAMPLE_GPS_COORDS: Array<{ label: string; lat: number; lng: number }> = [
  { label: 'Lahug, Cebu City', lat: 10.3265, lng: 123.8988 },
  { label: 'Ermita, Metro Manila', lat: 14.5825, lng: 120.9845 },
  { label: 'Session Rd, Baguio City', lat: 16.4119, lng: 120.5988 },
  { label: 'Roxas Ave, Davao City', lat: 7.0715, lng: 125.6129 },
  { label: 'Divisoria, Cagayan de Oro', lat: 8.4774, lng: 124.6443 },
];

export const CommuterWorkspace: React.FC<CommuterWorkspaceProps> = ({
  currentUser,
  cities,
  routes,
  fareRules,
  advisories,
  onSubmitFieldReport,
  schemeSetting,
  onChangeScheme,
  onSignOut,
}) => {
  const [commuterTab, setCommuterTab] = useState<CommuterTab>('home');
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
  const [gpsCycleIdx, setGpsCycleIdx] = useState(0);
  const { notify } = useNotifications();
  const [discountType, setDiscountType] = useState<DiscountType>(
    currentUser.discountType
  );
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

  const handleSelectCity = (cityId: CityId) => {
    setSelectedCityId(cityId);
    const first = routes.find((r) => r.cityId === cityId);
    if (first) setSelectedRouteId(first.id);
    setActiveTrip(null);
  };

  const handleSimulateGps = () => {
    const sample = SAMPLE_GPS_COORDS[gpsCycleIdx % SAMPLE_GPS_COORDS.length];
    const detected = findNearestCity(sample.lat, sample.lng, cities);
    setGpsCycleIdx((i) => i + 1);
    handleSelectCity(detected.id);
    notify({
      title: `GPS: ${sample.label} · ${detected.name}`,
      description: `Switched commuter map & routes to ${detected.name}.`,
      category: 'system',
      tone: 'info',
      tagLabel: detected.name,
    });
  };

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
          : `Saved ${matched?.code ?? 'route'} for quick offline access`,
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
          fareRules={fareRules}
          cityAdvisories={cityAdvisories}
          activeTab={commuterTab}
          onTabChange={setCommuterTab}
          onSelectCity={handleSelectCity}
          onSelectRoute={(r) => setSelectedRouteId(r.id)}
          activeUser={currentUser}
          savedRouteIds={savedRouteIds}
          onToggleSaveRoute={handleToggleSaveRoute}
          discountType={discountType}
          onChangeDiscountType={setDiscountType}
          notificationPrefs={notificationPrefs}
          onChangeNotificationPrefs={handleChangeNotificationPrefs}
          schemeSetting={schemeSetting}
          onChangeScheme={onChangeScheme}
          onSimulateGpsCity={handleSimulateGps}
          onOpenAuth={onSignOut}
          activeTrip={activeTrip}
          onStartTripNavigation={(trip) => {
            setActiveTrip(trip);
            setCommuterTab('navigate');
          }}
          onClearTripNavigation={() => setActiveTrip(null)}
          onSubmitFieldReport={(input) => {
            const created = onSubmitFieldReport(input);
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
