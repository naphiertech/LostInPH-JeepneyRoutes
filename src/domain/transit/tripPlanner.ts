import { calculateLegFare } from './fareEngine';
import {
  CityId,
  CityInfo,
  FareRule,
  JeepneyRoute,
  MapPinpoint,
  PinpointRouteMatch,
  RouteStop,
  TripLeg,
  TripOption,
} from './types';

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const earthRadiusKm = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findNearestCity(
  lat: number,
  lng: number,
  cities: readonly CityInfo[]
): CityInfo {
  let closest = cities[0];
  let minDistance = Infinity;
  for (const city of cities) {
    const dist = haversineKm(lat, lng, city.center[0], city.center[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }
  return closest;
}

export function getUniqueCityStops(
  cityId: CityId,
  routes: readonly JeepneyRoute[]
): RouteStop[] {
  const cityRoutes = routes.filter((r) => r.cityId === cityId);
  const byName = new Map<string, RouteStop>();
  for (const route of cityRoutes) {
    for (const stop of route.stops) {
      if (!byName.has(stop.name)) {
        byName.set(stop.name, stop);
      }
    }
  }
  return Array.from(byName.values());
}

function buildLeg(
  route: JeepneyRoute,
  originIndex: number,
  destIndex: number,
  fareRules?: readonly FareRule[]
): TripLeg {
  const forward = originIndex <= destIndex;
  const slice = forward
    ? route.stops.slice(originIndex, destIndex + 1)
    : route.stops.slice(destIndex, originIndex + 1).reverse();

  let dist = 0;
  for (let i = 0; i < slice.length - 1; i++) {
    dist += haversineKm(
      slice[i].lat,
      slice[i].lng,
      slice[i + 1].lat,
      slice[i + 1].lng
    );
  }

  // Account for street curvature vs straight-line distance
  const roadDistanceKm = Math.max(0.8, Number((dist * 1.24).toFixed(1)));
  const durationMin = Math.max(4, Math.round(roadDistanceKm * 3.6 + slice.length));
  const fares = calculateLegFare(route, roadDistanceKm, fareRules);

  return {
    route,
    boardStop: slice[0],
    alightStop: slice[slice.length - 1],
    stopCount: slice.length - 1,
    distanceKm: roadDistanceKm,
    durationMin,
    fareRegular: fares.regular,
    fareDiscounted: fares.discounted,
    stopsInLeg: slice,
  };
}

export function planJeepneyTrips(
  cityId: CityId,
  originName: string,
  destinationName: string,
  routes: readonly JeepneyRoute[],
  fareRules?: readonly FareRule[]
): TripOption[] {
  if (!originName || !destinationName || originName === destinationName) {
    return [];
  }

  const cityRoutes = routes.filter((r) => r.cityId === cityId);
  const results: TripOption[] = [];

  for (const route of cityRoutes) {
    const oIdx = route.stops.findIndex((s) => s.name === originName);
    const dIdx = route.stops.findIndex((s) => s.name === destinationName);
    if (oIdx !== -1 && dIdx !== -1 && oIdx !== dIdx) {
      const leg = buildLeg(route, oIdx, dIdx, fareRules);
      results.push({
        id: `direct-${route.id}-${oIdx}-${dIdx}`,
        type: 'direct',
        totalFareRegular: leg.fareRegular,
        totalFareDiscounted: leg.fareDiscounted,
        totalDurationMin: leg.durationMin,
        totalDistanceKm: leg.distanceKm,
        walkMeters: 80,
        legs: [leg],
        summaryNote: `Direct ${route.code} ride, no transfer needed.`,
      });
    }
  }

  const originRoutes = cityRoutes.filter((r) =>
    r.stops.some((s) => s.name === originName)
  );
  const destRoutes = cityRoutes.filter((r) =>
    r.stops.some((s) => s.name === destinationName)
  );

  for (const r1 of originRoutes) {
    for (const r2 of destRoutes) {
      if (r1.id === r2.id) continue;
      let bestTransfer: {
        s1Idx: number;
        s2Idx: number;
        walkM: number;
        hubName: string;
      } | null = null;

      const oIdx = r1.stops.findIndex((s) => s.name === originName);
      const dIdx = r2.stops.findIndex((s) => s.name === destinationName);

      for (let i = 0; i < r1.stops.length; i++) {
        if (i === oIdx) continue;
        for (let j = 0; j < r2.stops.length; j++) {
          if (j === dIdx) continue;
          const s1 = r1.stops[i];
          const s2 = r2.stops[j];
          const distKm =
            s1.name === s2.name
              ? 0.04
              : haversineKm(s1.lat, s1.lng, s2.lat, s2.lng);
          if (distKm <= 0.35) {
            const walkM = Math.max(25, Math.round(distKm * 1000));
            if (!bestTransfer || walkM < bestTransfer.walkM) {
              bestTransfer = {
                s1Idx: i,
                s2Idx: j,
                walkM,
                hubName: s1.name,
              };
            }
          }
        }
      }

      if (bestTransfer) {
        const leg1 = buildLeg(r1, oIdx, bestTransfer.s1Idx, fareRules);
        const leg2 = buildLeg(r2, bestTransfer.s2Idx, dIdx, fareRules);
        const transferWaitMin = 5;
        results.push({
          id: `transfer-${r1.id}-${r2.id}`,
          type: 'transfer',
          totalFareRegular: Number(
            (leg1.fareRegular + leg2.fareRegular).toFixed(2)
          ),
          totalFareDiscounted: Number(
            (leg1.fareDiscounted + leg2.fareDiscounted).toFixed(2)
          ),
          totalDurationMin:
            leg1.durationMin + leg2.durationMin + transferWaitMin,
          totalDistanceKm: Number((leg1.distanceKm + leg2.distanceKm).toFixed(1)),
          walkMeters: bestTransfer.walkM,
          transferNote: `Transfer at ${bestTransfer.hubName} (${bestTransfer.walkM}m walk to ${r2.code} loading point)`,
          legs: [leg1, leg2],
          summaryNote: `1 transfer at ${bestTransfer.hubName} via ${r1.code} then ${r2.code}.`,
        });
      }
    }
  }

  const seen = new Set<string>();
  return results
    .filter((item) => {
      const key = item.legs.map((l) => l.route.code).join('->');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'direct' ? -1 : 1;
      return a.totalDurationMin - b.totalDurationMin;
    })
    .slice(0, 4);
}

export function sliceRoutePathForStops(
  route: JeepneyRoute,
  boardStop: RouteStop,
  alightStop: RouteStop
): [number, number][] {
  if (!route.path || route.path.length < 2) {
    return [
      [boardStop.lat, boardStop.lng],
      [alightStop.lat, alightStop.lng],
    ];
  }

  let startIdx = 0;
  let minStartDist = Infinity;
  let endIdx = 0;
  let minEndDist = Infinity;

  for (let i = 0; i < route.path.length; i++) {
    const [lat, lng] = route.path[i];
    const dStart = haversineKm(boardStop.lat, boardStop.lng, lat, lng);
    if (dStart < minStartDist) {
      minStartDist = dStart;
      startIdx = i;
    }
    const dEnd = haversineKm(alightStop.lat, alightStop.lng, lat, lng);
    if (dEnd < minEndDist) {
      minEndDist = dEnd;
      endIdx = i;
    }
  }

  if (startIdx === endIdx) {
    return [
      [boardStop.lat, boardStop.lng],
      [alightStop.lat, alightStop.lng],
    ];
  }

  if (startIdx < endIdx) {
    return route.path.slice(startIdx, endIdx + 1);
  }
  return route.path.slice(endIdx, startIdx + 1).slice().reverse();
}

export function createMapPinpoint(
  lat: number,
  lng: number,
  cityRoutes: readonly JeepneyRoute[],
  cityName: string
): MapPinpoint {
  let nearestStop: RouteStop | null = null;
  let minDistKm = Infinity;

  for (const route of cityRoutes) {
    for (const stop of route.stops) {
      const dist = haversineKm(lat, lng, stop.lat, stop.lng);
      if (dist < minDistKm) {
        minDistKm = dist;
        nearestStop = stop;
      }
    }
  }

  if (!nearestStop) {
    return {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      label: `Pin in ${cityName}`,
      nearestStopName: cityName,
      nearestLandmark: 'Selected map coordinate',
      distanceToNearestStopM: 0,
    };
  }

  const distanceToNearestStopM = Math.max(10, Math.round(minDistKm * 1000));
  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    label:
      distanceToNearestStopM <= 450
        ? `Near ${nearestStop.name}`
        : `${nearestStop.barangayOrDistrict} · Near ${nearestStop.name}`,
    nearestStopName: nearestStop.name,
    nearestLandmark: nearestStop.landmark,
    distanceToNearestStopM,
  };
}

export function rankRoutesNearPinpoint(
  lat: number,
  lng: number,
  cityRoutes: readonly JeepneyRoute[],
  maxRadiusM = 680
): {
  recommended: PinpointRouteMatch[];
  others: PinpointRouteMatch[];
  allByRouteId: Map<string, PinpointRouteMatch>;
} {
  const rawMatches: PinpointRouteMatch[] = cityRoutes.map((route) => {
    let closestStop = route.stops[0];
    let minStopKm = Infinity;

    for (const stop of route.stops) {
      const d = haversineKm(lat, lng, stop.lat, stop.lng);
      if (d < minStopKm) {
        minStopKm = d;
        closestStop = stop;
      }
    }

    let minPathKm = minStopKm;
    for (const [pLat, pLng] of route.path) {
      const d = haversineKm(lat, lng, pLat, pLng);
      if (d < minPathKm) {
        minPathKm = d;
      }
    }

    const stopDistanceM = Math.max(10, Math.round(minStopKm * 1000));
    const corridorDistanceM = Math.max(10, Math.round(minPathKm * 1000));
    const effectiveDistanceM = Math.min(stopDistanceM, corridorDistanceM);

    return {
      route,
      closestStop,
      stopDistanceM,
      corridorDistanceM,
      effectiveDistanceM,
      isRecommended: effectiveDistanceM <= maxRadiusM,
    };
  });

  rawMatches.sort((a, b) => {
    if (a.effectiveDistanceM !== b.effectiveDistanceM) {
      return a.effectiveDistanceM - b.effectiveDistanceM;
    }
    return a.stopDistanceM - b.stopDistanceM;
  });

  // Ensure at least the closest route is recommended if within 2.5km of city corridor
  if (
    rawMatches.length > 0 &&
    !rawMatches.some((m) => m.isRecommended) &&
    rawMatches[0].effectiveDistanceM <= 2500
  ) {
    rawMatches[0] = {
      ...rawMatches[0],
      isRecommended: true,
    };
  }

  const recommended = rawMatches.filter((m) => m.isRecommended);
  const others = rawMatches.filter((m) => !m.isRecommended);
  const allByRouteId = new Map<string, PinpointRouteMatch>();
  for (const m of rawMatches) {
    allByRouteId.set(m.route.id, m);
  }

  return {
    recommended,
    others,
    allByRouteId,
  };
}

export async function snapStopsToRoadPath(
  stops: readonly Pick<RouteStop, 'lat' | 'lng'>[]
): Promise<[number, number][] | null> {
  if (stops.length < 2 || typeof fetch !== 'function') return null;
  try {
    const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,
      { signal: controller.signal }
    );
    window.clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const rawCoords: [number, number][] | undefined =
      data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(rawCoords) || rawCoords.length < 2) return null;
    return rawCoords.map(([lng, lat]) => [
      Number(lat.toFixed(5)),
      Number(lng.toFixed(5)),
    ]);
  } catch {
    return null;
  }
}
