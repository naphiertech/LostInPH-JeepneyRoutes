export type CityId = 'cebu' | 'manila' | 'baguio' | 'davao' | 'cdo';

export type VehicleType = 'traditional_jeepney' | 'modern_puv';

export type VerificationTier =
  | 'ltfrb_reference'
  | 'community_verified'
  | 'field_draft';

export type TriageLabel =
  | 'needs-triage'
  | 'needs-info'
  | 'ready-for-agent'
  | 'ready-for-human'
  | 'wontfix';

export type DiscountType = 'regular' | 'student' | 'senior_pwd';

export interface CityInfo {
  id: CityId;
  name: string;
  region: string;
  center: [number, number];
  defaultZoom: number;
  description: string;
  localStopPhrase: string;
  localFareWord: string;
  activeVehicles: number;
  transitNotes: string;
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  landmark: string;
  isTerminal?: boolean;
  isTransferHub?: boolean;
  barangayOrDistrict: string;
}

export interface JeepneyRoute {
  id: string;
  code: string;
  name: string;
  cityId: CityId;
  vehicleType: VehicleType;
  signboardText: string;
  color: string;
  baseFare: number;
  perKmRate: number;
  totalDistanceKm: number;
  estimatedDurationMin: number;
  headwayMin: string;
  operatingHours: string;
  verificationStatus: VerificationTier;
  verificationNote: string;
  peakHoursLabel: string;
  peakDemand: number[];
  stops: RouteStop[];
  path: [number, number][];
  corridorSummary: string;
}

export interface FareRule {
  id: string;
  vehicleType: VehicleType;
  label: string;
  firstKmCount: number;
  baseFarePhp: number;
  perKmRatePhp: number;
  discountPercent: number;
  effectiveOrder: string;
  updatedAt: string;
}

export interface TripLeg {
  route: JeepneyRoute;
  boardStop: RouteStop;
  alightStop: RouteStop;
  stopCount: number;
  distanceKm: number;
  durationMin: number;
  fareRegular: number;
  fareDiscounted: number;
  stopsInLeg: RouteStop[];
}

export interface TripOption {
  id: string;
  type: 'direct' | 'transfer';
  totalFareRegular: number;
  totalFareDiscounted: number;
  totalDurationMin: number;
  totalDistanceKm: number;
  walkMeters: number;
  transferNote?: string;
  legs: TripLeg[];
  summaryNote: string;
}

export interface SavedPlace {
  id: string;
  label: string;
  cityId: CityId;
  stopId: string;
  landmark: string;
}

export interface CommunityReport {
  id: string;
  cityId: CityId;
  routeCode: string;
  reporterName: string;
  createdAt: string;
  issueType: 'landmark_update' | 'fare_change' | 'route_detour' | 'new_stop';
  summary: string;
  details: string;
  triageStatus: TriageLabel;
}

export type NewFieldReportInput = Omit<
  CommunityReport,
  'id' | 'createdAt' | 'triageStatus'
>;

export type AdvisorySeverity = 'advisory' | 'detour' | 'suspended';

export interface CorridorAdvisory {
  id: string;
  cityId: CityId;
  routeCode: string;
  title: string;
  description: string;
  severity: AdvisorySeverity;
  active: boolean;
  reportedAt: string;
}

export interface NetworkDemandPoint {
  slotLabel: string;
  activeTripsK: number;
  verifiedChecks: number;
  reportsFiled: number;
}

export type AuditCategory = 'route' | 'advisory' | 'report' | 'system';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'admin' | 'app' | 'system';
  category: AuditCategory;
  action: string;
  target: string;
  cityId?: CityId | 'all';
  details: string;
}

export type RouteHealthSeverity = 'error' | 'warning';

export interface RouteHealthIssue {
  id: string;
  severity: RouteHealthSeverity;
  code:
    | 'duplicate_code'
    | 'sparse_geometry'
    | 'large_stop_gap'
    | 'too_few_stops'
    | 'unverified_draft'
    | 'orphaned_advisory';
  cityId: CityId;
  routeId?: string;
  routeCode: string;
  advisoryId?: string;
  title: string;
  detail: string;
  canAutoSnap?: boolean;
}

export interface RouteHealthReport {
  checkedAt: string;
  totalRoutes: number;
  totalStops: number;
  errorCount: number;
  warningCount: number;
  healthScore: number;
  issues: RouteHealthIssue[];
}

export interface TransitStoreSnapshot {
  routes: JeepneyRoute[];
  reports: CommunityReport[];
  advisories: CorridorAdvisory[];
  auditLogs: AuditLogEntry[];
}

export interface UserLocation {
  lat: number;
  lng: number;
  label: string;
  source: 'gps' | 'manual' | 'city_default';
  accuracyM?: number;
}

export interface MapPinpoint {
  lat: number;
  lng: number;
  label: string;
  nearestStopName: string;
  nearestLandmark: string;
  distanceToNearestStopM: number;
}

export interface PinpointRouteMatch {
  route: JeepneyRoute;
  closestStop: RouteStop;
  stopDistanceM: number;
  corridorDistanceM: number;
  effectiveDistanceM: number;
  isRecommended: boolean;
}

export interface PinpointTripRecommendation {
  id: string;
  trip: TripOption;
  walkToBoardM: number;
  walkFromAlightM: number;
  totalWalkM: number;
  boardStop: RouteStop;
  alightStop: RouteStop;
}
