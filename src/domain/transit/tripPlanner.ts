import {
  CityId,
  CityInfo,
  JeepneyRoute,
  MapPinpoint,
  PinpointRouteMatch,
  PinpointTripRecommendation,
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
  destIndex: number
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

  return {
    route,
    boardStop: slice[0],
    alightStop: slice[slice.length - 1],
    stopCount: slice.length - 1,
    distanceKm: roadDistanceKm,
    durationMin,
    fareRegular: 0,
    fareDiscounted: 0,
    stopsInLeg: slice,
  };
}

export function planJeepneyTrips(
  cityId: CityId,
  originName: string,
  destinationName: string,
  routes: readonly JeepneyRoute[]
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
      const leg = buildLeg(route, oIdx, dIdx);
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
        const leg1 = buildLeg(r1, oIdx, bestTransfer.s1Idx);
        const leg2 = buildLeg(r2, bestTransfer.s2Idx, dIdx);
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

function closestStopOnRoute(
  lat: number,
  lng: number,
  route: JeepneyRoute
): { index: number; stop: RouteStop; distanceM: number } {
  let bestIdx = 0;
  let minKm = Infinity;
  for (let i = 0; i < route.stops.length; i++) {
    const d = haversineKm(lat, lng, route.stops[i].lat, route.stops[i].lng);
    if (d < minKm) {
      minKm = d;
      bestIdx = i;
    }
  }
  return {
    index: bestIdx,
    stop: route.stops[bestIdx],
    distanceM: Math.max(10, Math.round(minKm * 1000)),
  };
}

/**
 * Recommends real Origin (User Location) -> Destination (Map Pinpoint) jeepney rides.
 * Prioritizes Direct 1-jeepney rides first, then falls back to 1-transfer rides
 * across shared transfer hubs within 350m.
 */
export function recommendTripsFromOriginToPinpoint(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  cityRoutes: readonly JeepneyRoute[],
  maxWalkRadiusM = 1200
): {
  recommendations: PinpointTripRecommendation[];
  recommendedRouteIds: Set<string>;
} {
  if (cityRoutes.length === 0) {
    return { recommendations: [], recommendedRouteIds: new Set() };
  }

  const directResults: PinpointTripRecommendation[] = [];

  const routeOriginProx = new Map<
    string,
    { index: number; stop: RouteStop; distanceM: number }
  >();
  const routeDestProx = new Map<
    string,
    { index: number; stop: RouteStop; distanceM: number }
  >();

  for (const route of cityRoutes) {
    const o = closestStopOnRoute(originLat, originLng, route);
    const d = closestStopOnRoute(destLat, destLng, route);
    routeOriginProx.set(route.id, o);
    routeDestProx.set(route.id, d);

    if (
      o.index !== d.index &&
      o.distanceM <= maxWalkRadiusM &&
      d.distanceM <= maxWalkRadiusM
    ) {
      const leg = buildLeg(route, o.index, d.index);
      const totalWalkM = o.distanceM + d.distanceM;
      directResults.push({
        id: `pin-direct-${route.id}-${o.index}-${d.index}`,
        walkToBoardM: o.distanceM,
        walkFromAlightM: d.distanceM,
        totalWalkM,
        boardStop: o.stop,
        alightStop: d.stop,
        trip: {
          id: `pin-direct-${route.id}-${o.index}-${d.index}`,
          type: 'direct',
          totalFareRegular: leg.fareRegular,
          totalFareDiscounted: leg.fareDiscounted,
          totalDurationMin: leg.durationMin + Math.max(1, Math.round(totalWalkM / 80)),
          totalDistanceKm: leg.distanceKm,
          walkMeters: totalWalkM,
          legs: [leg],
          summaryNote: `Direct ${route.code} from ${o.stop.name} to ${d.stop.name}.`,
        },
      });
    }
  }

  // Also compute 1-transfer options linking a route near origin to a route near destination
  const transferResults: PinpointTripRecommendation[] = [];
  const originCandidates = [...cityRoutes]
    .filter((r) => (routeOriginProx.get(r.id)?.distanceM ?? Infinity) <= maxWalkRadiusM)
    .sort(
      (a, b) =>
        (routeOriginProx.get(a.id)?.distanceM ?? Infinity) -
        (routeOriginProx.get(b.id)?.distanceM ?? Infinity)
    )
    .slice(0, 5);

  const destCandidates = [...cityRoutes]
    .filter((r) => (routeDestProx.get(r.id)?.distanceM ?? Infinity) <= maxWalkRadiusM)
    .sort(
      (a, b) =>
        (routeDestProx.get(a.id)?.distanceM ?? Infinity) -
        (routeDestProx.get(b.id)?.distanceM ?? Infinity)
    )
    .slice(0, 5);

  for (const r1 of originCandidates) {
    const o = routeOriginProx.get(r1.id)!;
    for (const r2 of destCandidates) {
      if (r1.id === r2.id) continue;
      const d = routeDestProx.get(r2.id)!;

      let bestTransfer: {
        s1Idx: number;
        s2Idx: number;
        walkM: number;
        hubName: string;
      } | null = null;

      for (let i = 0; i < r1.stops.length; i++) {
        if (i === o.index) continue;
        for (let j = 0; j < r2.stops.length; j++) {
          if (j === d.index) continue;
          const s1 = r1.stops[i];
          const s2 = r2.stops[j];
          const distKm =
            s1.name === s2.name
              ? 0.04
              : haversineKm(s1.lat, s1.lng, s2.lat, s2.lng);
          if (distKm <= 0.35) {
            const walkM = Math.max(25, Math.round(distKm * 1000));
            if (!bestTransfer || walkM < bestTransfer.walkM) {
              bestTransfer = { s1Idx: i, s2Idx: j, walkM, hubName: s1.name };
            }
          }
        }
      }

      if (bestTransfer) {
        const leg1 = buildLeg(r1, o.index, bestTransfer.s1Idx);
        const leg2 = buildLeg(r2, bestTransfer.s2Idx, d.index);
        const totalWalkM = o.distanceM + bestTransfer.walkM + d.distanceM;
        transferResults.push({
          id: `pin-transfer-${r1.id}-${r2.id}`,
          walkToBoardM: o.distanceM,
          walkFromAlightM: d.distanceM,
          totalWalkM,
          boardStop: o.stop,
          alightStop: d.stop,
          trip: {
            id: `pin-transfer-${r1.id}-${r2.id}`,
            type: 'transfer',
            totalFareRegular: Number(
              (leg1.fareRegular + leg2.fareRegular).toFixed(2)
            ),
            totalFareDiscounted: Number(
              (leg1.fareDiscounted + leg2.fareDiscounted).toFixed(2)
            ),
            totalDurationMin:
              leg1.durationMin +
              leg2.durationMin +
              5 +
              Math.max(1, Math.round(totalWalkM / 80)),
            totalDistanceKm: Number(
              (leg1.distanceKm + leg2.distanceKm).toFixed(1)
            ),
            walkMeters: totalWalkM,
            transferNote: `Transfer at ${bestTransfer.hubName} (${bestTransfer.walkM}m walk to ${r2.code})`,
            legs: [leg1, leg2],
            summaryNote: `Ride ${r1.code} to ${bestTransfer.hubName}, then transfer to ${r2.code}.`,
          },
        });
      }
    }
  }

  const sortByScore = (a: PinpointTripRecommendation, b: PinpointTripRecommendation) =>
    a.totalWalkM + a.trip.totalDurationMin * 22 - (b.totalWalkM + b.trip.totalDurationMin * 22);

  directResults.sort(sortByScore);
  transferResults.sort(sortByScore);

  const seen = new Set<string>();
  const combined = [...directResults, ...transferResults]
    .filter((rec) => {
      const key = rec.trip.legs.map((l) => l.route.code).join('->');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);

  // Fallback: if origin or destination is slightly outside walking radius,
  // still pick the closest direct corridor connecting the nearest stops.
  if (combined.length === 0) {
    const fallback = [...cityRoutes]
      .map((route) => {
        const o = routeOriginProx.get(route.id)!;
        const d = routeDestProx.get(route.id)!;
        return { route, o, d, score: o.distanceM + d.distanceM };
      })
      .filter((x) => x.o.index !== x.d.index)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);

    for (const { route, o, d } of fallback) {
      const leg = buildLeg(route, o.index, d.index);
      const totalWalkM = o.distanceM + d.distanceM;
      combined.push({
        id: `pin-fallback-${route.id}`,
        walkToBoardM: o.distanceM,
        walkFromAlightM: d.distanceM,
        totalWalkM,
        boardStop: o.stop,
        alightStop: d.stop,
        trip: {
          id: `pin-fallback-${route.id}`,
          type: 'direct',
          totalFareRegular: leg.fareRegular,
          totalFareDiscounted: leg.fareDiscounted,
          totalDurationMin: leg.durationMin,
          totalDistanceKm: leg.distanceKm,
          walkMeters: totalWalkM,
          legs: [leg],
          summaryNote: `Closest corridor ${route.code} near your pin.`,
        },
      });
    }
  }

  const recommendedRouteIds = new Set<string>();
  for (const rec of combined) {
    for (const leg of rec.trip.legs) {
      recommendedRouteIds.add(leg.route.id);
    }
  }

  return { recommendations: combined, recommendedRouteIds };
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
