import { useCallback, useEffect, useState } from 'react';
import {
  createMapPinpoint,
  findNearestCity,
  haversineKm,
} from '@/domain/transit/tripPlanner';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
  UserLocation,
} from '@/domain/transit/types';
import { PushToastInput } from '@/shared/ui/NotificationCenter';

export type GpsStatus = 'idle' | 'locating' | 'live' | 'denied' | 'manual';

const DEMO_GPS_POINTS: Array<{ label: string; lat: number; lng: number }> = [
  { label: 'Lahug, Cebu City', lat: 10.3265, lng: 123.8988 },
  { label: 'Ermita, Metro Manila', lat: 14.5825, lng: 120.9845 },
  { label: 'Session Rd, Baguio City', lat: 16.4119, lng: 120.5988 },
  { label: 'Roxas Ave, Davao City', lat: 7.0715, lng: 125.6129 },
  { label: 'Divisoria, Cagayan de Oro', lat: 8.4774, lng: 124.6443 },
];

export function buildDefaultCityLocation(
  city: CityInfo,
  cityRoutes: readonly JeepneyRoute[]
): UserLocation {
  const firstStop = cityRoutes[0]?.stops[0];
  if (firstStop) {
    return {
      lat: firstStop.lat,
      lng: firstStop.lng,
      label: firstStop.name.split('·')[0].trim(),
      source: 'city_default',
    };
  }
  return {
    lat: city.center[0],
    lng: city.center[1],
    label: city.name,
    source: 'city_default',
  };
}

interface UseGeolocationOptions {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  selectedCity: CityInfo;
  cityRoutes: JeepneyRoute[];
  onSwitchCity: (cityId: CityId) => void;
  notify: (input: PushToastInput) => void;
}

export function useGeolocation({
  cities,
  routes,
  selectedCity,
  cityRoutes,
  onSwitchCity,
  notify,
}: UseGeolocationOptions) {
  const [gpsCycleIdx, setGpsCycleIdx] = useState(0);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [userLocation, setUserLocation] = useState<UserLocation>(() =>
    buildDefaultCityLocation(selectedCity, cityRoutes)
  );

  const resetToCityDefault = useCallback(
    (city: CityInfo, nextCityRoutes: readonly JeepneyRoute[]) => {
      setUserLocation(buildDefaultCityLocation(city, nextCityRoutes));
      setGpsStatus('idle');
    },
    []
  );

  const setManualLocation = useCallback(
    (lat: number, lng: number) => {
      const pinInfo = createMapPinpoint(lat, lng, cityRoutes, selectedCity.name);
      setUserLocation({
        lat,
        lng,
        label: pinInfo.label,
        source: 'manual',
      });
      setGpsStatus('manual');
      notify({
        title: `Starting point set: ${pinInfo.label}`,
        description: 'Now tap anywhere on the map to pinpoint your destination.',
        category: 'system',
        kind: 'fare_report',
        tone: 'info',
        tagLabel: 'Start Pin',
      });
    },
    [cityRoutes, selectedCity.name, notify]
  );

  const jumpDemoCity = useCallback(() => {
    const sample = DEMO_GPS_POINTS[gpsCycleIdx % DEMO_GPS_POINTS.length];
    const detected = findNearestCity(sample.lat, sample.lng, cities);
    setGpsCycleIdx((i) => i + 1);
    onSwitchCity(detected.id);
    setUserLocation({
      lat: sample.lat,
      lng: sample.lng,
      label: sample.label,
      source: 'manual',
    });
    setGpsStatus('manual');
    notify({
      title: `Demo location: ${sample.label}`,
      description: `Switched map & jeepney corridors to ${detected.name}.`,
      category: 'system',
      kind: 'fare_report',
      tone: 'info',
      tagLabel: detected.name,
    });
  }, [gpsCycleIdx, cities, onSwitchCity, notify]);

  const locateMe = useCallback(
    (silent = false) => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.geolocation ||
        typeof navigator.geolocation.getCurrentPosition !== 'function'
      ) {
        if (!silent) {
          jumpDemoCity();
        }
        return;
      }

      setGpsStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const nearestCity = findNearestCity(latitude, longitude, cities);
          const distKm = haversineKm(
            latitude,
            longitude,
            nearestCity.center[0],
            nearestCity.center[1]
          );

          if (distKm <= 35) {
            const matchedRoutes = routes.filter(
              (r) => r.cityId === nearestCity.id
            );
            const pinInfo = createMapPinpoint(
              latitude,
              longitude,
              matchedRoutes,
              nearestCity.name
            );
            onSwitchCity(nearestCity.id);
            setUserLocation({
              lat: Number(latitude.toFixed(5)),
              lng: Number(longitude.toFixed(5)),
              label: pinInfo.label,
              source: 'gps',
              accuracyM: Math.round(accuracy || 25),
            });
            setGpsStatus('live');
            if (!silent) {
              notify({
                title: `Located near ${pinInfo.nearestStopName}`,
                description: `Live GPS locked in ${nearestCity.name}. Tap anywhere on the map to pinpoint your destination.`,
                category: 'system',
                kind: 'fare_report',
                tone: 'success',
                tagLabel: 'Live GPS',
              });
            }
          } else {
            setGpsStatus('denied');
            if (!silent) {
              notify({
                title: 'Outside covered jeepney cities',
                description: `Showing ${selectedCity.name}. Tap "Set start" on the map or pick a demo city to test routes.`,
                category: 'system',
                kind: 'fare_report',
                tone: 'info',
                tagLabel: selectedCity.name,
              });
            }
          }
        },
        () => {
          setGpsStatus('denied');
          if (!silent) {
            notify({
              title: 'Location access unavailable',
              description:
                'Use "Set start" to drop your starting pin on the map, or switch cities.',
              category: 'system',
              kind: 'fare_report',
              tone: 'warning',
              tagLabel: 'Manual Pin Ready',
            });
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    },
    [cities, routes, selectedCity.name, onSwitchCity, jumpDemoCity, notify]
  );

  useEffect(() => {
    locateMe(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    userLocation,
    gpsStatus,
    locateMe,
    setManualLocation,
    jumpDemoCity,
    resetToCityDefault,
  };
}
