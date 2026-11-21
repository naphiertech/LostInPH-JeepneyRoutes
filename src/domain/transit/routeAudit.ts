import { haversineKm } from './tripPlanner';
import {
  CityId,
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
  RouteHealthIssue,
  RouteHealthReport,
  RouteStop,
} from './types';

const SPARSE_PATH_THRESHOLD = 20;
const MAX_STOP_GAP_KM = 4.5;

export function hasDuplicateRouteCode(
  routes: readonly JeepneyRoute[],
  cityId: CityId,
  code: string,
  excludeRouteId?: string
): boolean {
  const normalized = code.trim().toUpperCase();
  return routes.some(
    (r) =>
      r.id !== excludeRouteId &&
      r.cityId === cityId &&
      r.code.trim().toUpperCase() === normalized
  );
}

/**
 * Pure domain QA scanner: checks all corridors, stops, and active advisories
 * for structural defects before commuters hit them on the live map.
 */
export function auditTransitNetwork(
  routes: readonly JeepneyRoute[],
  advisories: readonly CorridorAdvisory[],
  cities: readonly CityInfo[]
): RouteHealthReport {
  const issues: RouteHealthIssue[] = [];
  const cityNameById = new Map(cities.map((c) => [c.id, c.name]));

  // O(1) lookup for duplicate route codes per city
  const routesByCityAndCode = new Map<string, JeepneyRoute[]>();
  const validCityCodeKeys = new Set<string>();
  let totalStops = 0;

  for (const route of routes) {
    totalStops += route.stops.length;
    const key = `${route.cityId}:${route.code.trim().toUpperCase()}`;
    validCityCodeKeys.add(key);
    const list = routesByCityAndCode.get(key) ?? [];
    list.push(route);
    routesByCityAndCode.set(key, list);

    if (route.stops.length < 2) {
      issues.push({
        id: `too-few-stops-${route.id}`,
        severity: 'error',
        code: 'too_few_stops',
        cityId: route.cityId,
        routeId: route.id,
        routeCode: route.code,
        title: `${route.code} has fewer than 2 mapped stops`,
        detail: `${route.name} (${cityNameById.get(route.cityId) ?? route.cityId}) needs at least an origin and destination stop to compute trips.`,
      });
    }

    if (route.path.length < SPARSE_PATH_THRESHOLD) {
      issues.push({
        id: `sparse-path-${route.id}`,
        severity: 'warning',
        code: 'sparse_geometry',
        cityId: route.cityId,
        routeId: route.id,
        routeCode: route.code,
        title: `${route.code} has sparse road geometry (${route.path.length} pts)`,
        detail: `Road-snapped corridors should have ≥${SPARSE_PATH_THRESHOLD} vertices so map polylines follow actual Philippine streets.`,
        canAutoSnap: route.stops.length >= 2,
      });
    }

    for (let i = 1; i < route.stops.length; i++) {
      const prev = route.stops[i - 1];
      const curr = route.stops[i];
      const gapKm = haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
      if (gapKm > MAX_STOP_GAP_KM) {
        issues.push({
          id: `stop-gap-${route.id}-${i}`,
          severity: 'warning',
          code: 'large_stop_gap',
          cityId: route.cityId,
          routeId: route.id,
          routeCode: route.code,
          title: `${route.code} has a ${gapKm.toFixed(1)} km stop gap`,
          detail: `Large gap between "${prev.name}" and "${curr.name}". Add an intermediate landmark stop for better pinpoint accuracy.`,
        });
        break;
      }
    }

    if (route.verificationStatus === 'field_draft') {
      issues.push({
        id: `draft-${route.id}`,
        severity: 'warning',
        code: 'unverified_draft',
        cityId: route.cityId,
        routeId: route.id,
        routeCode: route.code,
        title: `${route.code} is still an unverified field draft`,
        detail: `Verify windshield signboard ("${route.signboardText}") and stops in Routes & Stops to promote to verified.`,
      });
    }
  }

  for (const [, duplicates] of routesByCityAndCode) {
    if (duplicates.length > 1) {
      const sample = duplicates[0];
      issues.push({
        id: `dup-${sample.cityId}-${sample.code}`,
        severity: 'error',
        code: 'duplicate_code',
        cityId: sample.cityId,
        routeId: sample.id,
        routeCode: sample.code,
        title: `Duplicate route code ${sample.code} (${duplicates.length}x)`,
        detail: `${duplicates.length} routes share code ${sample.code} in ${cityNameById.get(sample.cityId) ?? sample.cityId}. Rename or remove the duplicate.`,
      });
    }
  }

  for (const adv of advisories) {
    if (!adv.active) continue;
    const key = `${adv.cityId}:${adv.routeCode.trim().toUpperCase()}`;
    if (!validCityCodeKeys.has(key)) {
      issues.push({
        id: `orphan-adv-${adv.id}`,
        severity: 'error',
        code: 'orphaned_advisory',
        cityId: adv.cityId,
        advisoryId: adv.id,
        routeCode: adv.routeCode,
        title: `Active advisory ${adv.id} targets unknown route ${adv.routeCode}`,
        detail: `"${adv.title}" does not match any active route code in ${cityNameById.get(adv.cityId) ?? adv.cityId}.`,
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - errorCount * 15 - warningCount * 4)
  );

  return {
    checkedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    totalRoutes: routes.length,
    totalStops,
    errorCount,
    warningCount,
    healthScore,
    issues,
  };
}

export type RouteImportValidationResult =
  | { ok: true; routes: JeepneyRoute[] }
  | { ok: false; error: string };

/**
 * Validates bulk JSON route payloads before merging into TransitStoreSnapshot.
 */
export function validateRouteImportPayload(
  rawJson: string,
  validCityIds: readonly CityId[],
  existingRoutes: readonly JeepneyRoute[]
): RouteImportValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: 'Invalid JSON syntax. Paste a JSON array of route objects.',
    };
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) {
    return { ok: false, error: 'JSON array is empty.' };
  }

  const validCities = new Set<string>(validCityIds);
  const seenKeys = new Set<string>(
    existingRoutes.map((r) => `${r.cityId}:${r.code.trim().toUpperCase()}`)
  );
  const normalizedRoutes: JeepneyRoute[] = [];

  for (let idx = 0; idx < list.length; idx++) {
    const item = list[idx] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Entry #${idx + 1} must be a JSON object.` };
    }

    const code = typeof item.code === 'string' ? item.code.trim().toUpperCase() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const cityId = typeof item.cityId === 'string' ? item.cityId : '';
    const signboardText =
      typeof item.signboardText === 'string' && item.signboardText.trim()
        ? item.signboardText.trim().toUpperCase()
        : `${code} CORRIDOR`;

    if (!code || !name) {
      return {
        ok: false,
        error: `Entry #${idx + 1} requires non-empty "code" and "name" strings.`,
      };
    }
    if (!validCities.has(cityId)) {
      return {
        ok: false,
        error: `Entry #${idx + 1} (${code}) has unsupported cityId "${cityId}". Use: ${validCityIds.join(', ')}.`,
      };
    }

    const dedupeKey = `${cityId}:${code}`;
    if (seenKeys.has(dedupeKey)) {
      return {
        ok: false,
        error: `Route code "${code}" already exists in ${cityId}. Remove or rename duplicate entries.`,
      };
    }
    seenKeys.add(dedupeKey);

    const rawStops = Array.isArray(item.stops) ? item.stops : [];
    const stops: RouteStop[] = [];
    for (let sIdx = 0; sIdx < rawStops.length; sIdx++) {
      const s = rawStops[sIdx] as Record<string, unknown> | null;
      if (
        !s ||
        typeof s.name !== 'string' ||
        typeof s.lat !== 'number' ||
        typeof s.lng !== 'number'
      ) {
        return {
          ok: false,
          error: `Entry #${idx + 1} (${code}) stop #${sIdx + 1} requires name, lat, and lng.`,
        };
      }
      stops.push({
        id:
          typeof s.id === 'string' && s.id.trim()
            ? s.id.trim()
            : `imp-${cityId}-${code.toLowerCase()}-stop-${sIdx + 1}`,
        name: s.name.trim(),
        lat: s.lat,
        lng: s.lng,
        landmark:
          typeof s.landmark === 'string' && s.landmark.trim()
            ? s.landmark.trim()
            : s.name.trim(),
        barangayOrDistrict:
          typeof s.barangayOrDistrict === 'string' && s.barangayOrDistrict.trim()
            ? s.barangayOrDistrict.trim()
            : cityId,
        isTerminal: Boolean(s.isTerminal ?? (sIdx === 0 || sIdx === rawStops.length - 1)),
        isTransferHub: Boolean(s.isTransferHub),
      });
    }

    if (stops.length < 2) {
      return {
        ok: false,
        error: `Entry #${idx + 1} (${code}) must include at least 2 valid stops with lat/lng.`,
      };
    }

    const rawPath = Array.isArray(item.path)
      ? item.path.filter(
          (pt): pt is [number, number] =>
            Array.isArray(pt) &&
            pt.length === 2 &&
            typeof pt[0] === 'number' &&
            typeof pt[1] === 'number'
        )
      : [];

    const vehicleType =
      item.vehicleType === 'modern_puv' ? 'modern_puv' : 'traditional_jeepney';

    normalizedRoutes.push({
      id:
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `imp-${cityId}-${code.toLowerCase()}-${Date.now()}-${idx}`,
      code,
      name,
      cityId: cityId as CityId,
      vehicleType,
      signboardText,
      color: typeof item.color === 'string' ? item.color : '#5D9B19',
      baseFare: vehicleType === 'modern_puv' ? 15 : 13,
      perKmRate: vehicleType === 'modern_puv' ? 2.2 : 1.8,
      totalDistanceKm:
        typeof item.totalDistanceKm === 'number' ? item.totalDistanceKm : 5.5,
      estimatedDurationMin:
        typeof item.estimatedDurationMin === 'number'
          ? item.estimatedDurationMin
          : 20,
      headwayMin:
        typeof item.headwayMin === 'string' ? item.headwayMin : '6–9 min',
      operatingHours:
        typeof item.operatingHours === 'string'
          ? item.operatingHours
          : '5:00 am – 10:00 pm',
      verificationStatus:
        item.verificationStatus === 'ltfrb_reference' ||
        item.verificationStatus === 'community_verified'
          ? item.verificationStatus
          : 'field_draft',
      verificationNote:
        typeof item.verificationNote === 'string'
          ? item.verificationNote
          : 'Bulk imported via Admin JSON importer.',
      peakHoursLabel:
        typeof item.peakHoursLabel === 'string'
          ? item.peakHoursLabel
          : 'Morning & evening peak',
      peakDemand: Array.isArray(item.peakDemand)
        ? (item.peakDemand as number[])
        : [45, 72, 84, 66, 54, 58, 60, 56, 62, 74, 80, 64],
      corridorSummary:
        typeof item.corridorSummary === 'string'
          ? item.corridorSummary
          : `Imported jeepney corridor for ${name}.`,
      stops,
      path:
        rawPath.length >= 2
          ? rawPath
          : stops.map((s) => [s.lat, s.lng] as [number, number]),
    });
  }

  return { ok: true, routes: normalizedRoutes };
}
