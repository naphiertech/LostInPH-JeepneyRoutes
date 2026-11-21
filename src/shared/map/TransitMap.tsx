import React, { useCallback, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  Crosshair,
  LocateFixed,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { sliceRoutePathForStops } from '../../domain/transit/tripPlanner';
import {
  CityInfo,
  JeepneyRoute,
  MapPinpoint,
  RouteStop,
  TripOption,
  UserLocation,
} from '../../domain/transit/types';

interface TransitMapProps {
  city: CityInfo;
  cityRoutes: JeepneyRoute[];
  selectedRoute: JeepneyRoute | null;
  activeTrip: TripOption | null;
  liveStopPosition?: RouteStop | null;
  userLocation?: UserLocation | null;
  originPickMode?: boolean;
  pinpoint?: MapPinpoint | null;
  recommendedRouteIds?: ReadonlySet<string>;
  pinpointClosestStop?: RouteStop | null;
  onSelectRoute?: (route: JeepneyRoute) => void;
  onPinpointMap?: (lat: number, lng: number) => void;
  onSetUserLocationMap?: (lat: number, lng: number) => void;
  onClearPinpoint?: () => void;
  onPickStopAsOrigin?: (stopName: string) => void;
  onPickStopAsDestination?: (stopName: string) => void;
  onLocateMe?: () => void;
  compact?: boolean;
  showFullRouteOverview?: boolean;
  heightClass?: string;
}

const BOARD_GREEN = '#5D9B19';
const DROP_AMBER = '#EA580C';
const SECONDARY_TEAL = '#0D9488';
const PINPOINT_SLATE = '#0F172A';
const USER_BLUE = '#2563EB';

function createPinIcon(
  kind: 'board' | 'drop' | 'live' | 'pinpoint' | 'user',
  label?: string
) {
  if (kind === 'user') {
    return L.divIcon({
      className: 'lostinph-div-icon',
      html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);">
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;inset:-6px;border-radius:9999px;background:rgba(37,99,235,0.22);border:1.5px solid rgba(37,99,235,0.35);"></span>
          <span style="width:14px;height:14px;border-radius:9999px;background:${USER_BLUE};border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(37,99,235,0.45);"></span>
        </div>
        <span style="margin-top:3px;background:${USER_BLUE};color:#ffffff;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;padding:1px 5px;border-radius:9999px;white-space:nowrap;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,0.25);">YOU</span>
      </div>`,
      iconSize: [24, 36],
      iconAnchor: [12, 12],
    });
  }
  if (kind === 'live') {
    return L.divIcon({
      className: 'lostinph-div-icon',
      html: `<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
        <span style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(93,155,25,0.28);"></span>
        <span style="width:14px;height:14px;border-radius:9999px;background:${BOARD_GREEN};border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,0.35);"></span>
      </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  const fill =
    kind === 'board'
      ? BOARD_GREEN
      : kind === 'pinpoint'
        ? PINPOINT_SLATE
        : DROP_AMBER;
  const badge =
    label ??
    (kind === 'board'
      ? 'BOARD'
      : kind === 'pinpoint'
        ? 'PINPOINT'
        : 'DROP');

  return L.divIcon({
    className: 'lostinph-div-icon',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:${fill};color:#fff;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;padding:2px 6px;border-radius:9999px;white-space:nowrap;border:1.5px solid #fff;box-shadow:0 3px 8px rgba(15,23,42,0.28);margin-bottom:2px;">${badge}</div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C12 22 19 15.1 19 9.5C19 5.36 15.87 2 12 2C8.13 2 5 5.36 5 9.5C5 15.1 12 22 12 22Z" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="12" cy="9.5" r="3" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [24, 38],
    iconAnchor: [12, 38],
  });
}

function MapClickPinController({
  onPinpointMap,
  disabled,
}: {
  onPinpointMap?: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(event) {
      if (disabled || !onPinpointMap) return;
      onPinpointMap(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function isFiniteLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function MapViewportController({
  city,
  selectedRoute,
  activeTrip,
  liveStopPosition,
  compact,
  showFullRouteOverview,
}: {
  city: CityInfo;
  selectedRoute: JeepneyRoute | null;
  activeTrip: TripOption | null;
  liveStopPosition?: RouteStop | null;
  compact: boolean;
  showFullRouteOverview: boolean;
}) {
  const map = useMap();

  const applyTargetViewport = useCallback(
    (animate: boolean) => {
      const container = map.getContainer();
      if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) {
        return false;
      }

      // Always refresh Leaflet's cached size synchronously before computing fitBounds / flyTo
      // so hidden -> visible tab transitions never divide by zero container dimensions (NaN LatLng).
      map.invalidateSize({ pan: false, animate: false });
      const size = map.getSize();
      if (
        !Number.isFinite(size.x) ||
        !Number.isFinite(size.y) ||
        size.x < 16 ||
        size.y < 16
      ) {
        return false;
      }

      const fitPadding: [number, number] = compact ? [24, 24] : [38, 38];
      const maxZoom = compact ? 13 : 15;

      if (
        liveStopPosition &&
        !showFullRouteOverview &&
        isFiniteLatLng(liveStopPosition.lat, liveStopPosition.lng)
      ) {
        const curCenter = map.getCenter();
        const curZoom = map.getZoom();
        const hasFiniteStart =
          isFiniteLatLng(curCenter?.lat, curCenter?.lng) &&
          Number.isFinite(curZoom);

        if (animate && hasFiniteStart) {
          map.flyTo([liveStopPosition.lat, liveStopPosition.lng], 15, {
            duration: 0.65,
          });
        } else {
          map.setView([liveStopPosition.lat, liveStopPosition.lng], 15, {
            animate: false,
          });
        }
        return true;
      }

      if (activeTrip && activeTrip.legs.length > 0) {
        const coords: [number, number][] = [];
        for (const leg of activeTrip.legs) {
          for (const s of leg.stopsInLeg) {
            if (isFiniteLatLng(s.lat, s.lng)) {
              coords.push([s.lat, s.lng]);
            }
          }
        }
        if (coords.length >= 2) {
          map.fitBounds(L.latLngBounds(coords), {
            padding: fitPadding,
            maxZoom,
            animate,
          });
          return true;
        }
      }

      if (selectedRoute && selectedRoute.path.length >= 2) {
        const validPath = selectedRoute.path.filter(([lat, lng]) =>
          isFiniteLatLng(lat, lng)
        );
        if (validPath.length >= 2) {
          map.fitBounds(L.latLngBounds(validPath), {
            padding: fitPadding,
            maxZoom,
            animate,
          });
          return true;
        }
      }

      if (isFiniteLatLng(city.center[0], city.center[1])) {
        map.setView(city.center, city.defaultZoom, { animate });
        return true;
      }

      return false;
    },
    [map, city, selectedRoute, activeTrip, liveStopPosition, compact, showFullRouteOverview]
  );

  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      if (container.clientWidth <= 0 || container.clientHeight <= 0) return;
      applyTargetViewport(false);
    });
    ro.observe(container);
    const timer = window.setTimeout(() => {
      applyTargetViewport(false);
    }, 120);
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
    };
  }, [map, applyTargetViewport]);

  useEffect(() => {
    applyTargetViewport(true);
  }, [applyTargetViewport]);

  return null;
}

export const TransitMap: React.FC<TransitMapProps> = ({
  city,
  cityRoutes,
  selectedRoute,
  activeTrip,
  liveStopPosition,
  userLocation,
  originPickMode = false,
  pinpoint,
  recommendedRouteIds,
  pinpointClosestStop,
  onSelectRoute,
  onPinpointMap,
  onSetUserLocationMap,
  onClearPinpoint,
  onPickStopAsOrigin,
  onPickStopAsDestination,
  onLocateMe,
  compact = false,
  showFullRouteOverview = false,
  heightClass = 'h-full min-h-[380px]',
}) => {
  const boardIcon = useMemo(() => createPinIcon('board', 'BOARD'), []);
  const dropIcon = useMemo(() => createPinIcon('drop', 'DROP OFF'), []);
  const liveIcon = useMemo(() => createPinIcon('live'), []);
  const userIcon = useMemo(() => createPinIcon('user'), []);
  const pinpointIcon = useMemo(
    () => createPinIcon('pinpoint', 'PINPOINT'),
    []
  );

  const primaryStops = useMemo(() => {
    if (activeTrip) {
      return activeTrip.legs.flatMap((leg) => leg.stopsInLeg);
    }
    return selectedRoute?.stops ?? [];
  }, [activeTrip, selectedRoute]);

  const boardStop = activeTrip
    ? activeTrip.legs[0]?.boardStop
    : selectedRoute?.stops[0];

  const dropStop = activeTrip
    ? activeTrip.legs[activeTrip.legs.length - 1]?.alightStop
    : selectedRoute?.stops[selectedRoute.stops.length - 1];

  return (
    <div
      className={`relative w-full overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface-raised)] ${heightClass}`}
    >
      <MapContainer
        center={city.center}
        zoom={city.defaultZoom}
        zoomControl={!compact}
        attributionControl={false}
        scrollWheelZoom={!compact}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapClickPinController
          onPinpointMap={(lat, lng) => {
            if (originPickMode && onSetUserLocationMap) {
              onSetUserLocationMap(lat, lng);
              return;
            }
            onPinpointMap?.(lat, lng);
          }}
          disabled={compact}
        />

        <MapViewportController
          city={city}
          selectedRoute={selectedRoute}
          activeTrip={activeTrip}
          liveStopPosition={liveStopPosition}
          compact={compact}
          showFullRouteOverview={showFullRouteOverview}
        />

        {cityRoutes.map((route) => {
          const isPrimaryHighlighted =
            selectedRoute?.id === route.id ||
            activeTrip?.legs.some((l) => l.route.id === route.id);
          if (isPrimaryHighlighted) return null;

          const isRecommendedNearPin =
            Boolean(pinpoint) && Boolean(recommendedRouteIds?.has(route.id));

          if (isRecommendedNearPin) {
            return (
              <React.Fragment key={route.id}>
                <Polyline
                  positions={route.path}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 7,
                    opacity: 0.72,
                  }}
                  eventHandlers={{
                    click: () => onSelectRoute?.(route),
                  }}
                />
                <Polyline
                  positions={route.path}
                  pathOptions={{
                    color: route.color,
                    weight: 4.5,
                    opacity: 0.85,
                  }}
                  eventHandlers={{
                    click: () => onSelectRoute?.(route),
                  }}
                />
              </React.Fragment>
            );
          }

          return (
            <Polyline
              key={route.id}
              positions={route.path}
              pathOptions={{
                color: route.color,
                weight: pinpoint ? 2.5 : 3,
                opacity: pinpoint ? 0.16 : 0.28,
                dashArray: '6 6',
              }}
              eventHandlers={{
                click: () => onSelectRoute?.(route),
              }}
            />
          );
        })}

        {activeTrip ? (
          activeTrip.legs.map((leg, idx) => {
            const roadPositions = sliceRoutePathForStops(
              leg.route,
              leg.boardStop,
              leg.alightStop
            );
            return (
              <React.Fragment key={`${leg.route.id}-${idx}`}>
                <Polyline
                  positions={roadPositions}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: 9,
                    opacity: 0.9,
                  }}
                />
                <Polyline
                  positions={roadPositions}
                  pathOptions={{
                    color: idx === 0 ? BOARD_GREEN : SECONDARY_TEAL,
                    weight: 5,
                    opacity: 0.95,
                  }}
                />
              </React.Fragment>
            );
          })
        ) : selectedRoute ? (
          <>
            <Polyline
              positions={selectedRoute.path}
              pathOptions={{
                color: '#FFFFFF',
                weight: 9,
                opacity: 0.9,
              }}
            />
            <Polyline
              positions={selectedRoute.path}
              pathOptions={{
                color: selectedRoute.color,
                weight: 5,
                opacity: 0.95,
              }}
            />
          </>
        ) : null}

        {!compact && pinpoint && pinpointClosestStop && (
          <Polyline
            positions={[
              [pinpoint.lat, pinpoint.lng],
              [pinpointClosestStop.lat, pinpointClosestStop.lng],
            ]}
            pathOptions={{
              color: PINPOINT_SLATE,
              weight: 3,
              opacity: 0.78,
              dashArray: '4 6',
            }}
          />
        )}

        {primaryStops.map((stop) => (
          <CircleMarker
            key={stop.id}
            center={[stop.lat, stop.lng]}
            radius={
              pinpointClosestStop?.id === stop.id
                ? 8
                : stop.isTerminal || stop.isTransferHub
                  ? 7
                  : 5
            }
            pathOptions={{
              color: '#FFFFFF',
              weight: 2,
              fillColor: stop.isTransferHub ? DROP_AMBER : BOARD_GREEN,
              fillOpacity: 1,
            }}
          >
            {!compact && (
              <Popup>
                <div className="min-w-[200px] space-y-2 p-0.5 text-xs">
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">
                      {stop.name}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      {stop.landmark}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                      District: {stop.barangayOrDistrict}
                    </div>
                  </div>
                  {(onPickStopAsOrigin || onPickStopAsDestination) && (
                    <div className="flex gap-1.5 pt-1">
                      {onPickStopAsOrigin && (
                        <button
                          type="button"
                          onClick={() => onPickStopAsOrigin(stop.name)}
                          className="cursor-pointer rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-medium text-white"
                        >
                          Board here
                        </button>
                      )}
                      {onPickStopAsDestination && (
                        <button
                          type="button"
                          onClick={() => onPickStopAsDestination(stop.name)}
                          className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)]"
                        >
                          Drop off here
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            )}
          </CircleMarker>
        ))}

        {!compact && boardStop && (
          <Marker position={[boardStop.lat, boardStop.lng]} icon={boardIcon} />
        )}
        {!compact && dropStop && (
          <Marker position={[dropStop.lat, dropStop.lng]} icon={dropIcon} />
        )}

        {!compact && userLocation && isFiniteLatLng(userLocation.lat, userLocation.lng) && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userIcon}
            zIndexOffset={500}
          />
        )}

        {!compact && pinpoint && (
          <Marker
            position={[pinpoint.lat, pinpoint.lng]}
            icon={pinpointIcon}
          />
        )}

        {liveStopPosition && (
          <Marker
            position={[liveStopPosition.lat, liveStopPosition.lng]}
            icon={liveIcon}
          />
        )}
      </MapContainer>

      {!compact && (
        <div className="pointer-events-none absolute top-2.5 right-2.5 left-12 z-[400] flex items-center justify-between gap-2">
          <div className="pointer-events-auto flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-[11px] shadow-sm sm:px-3 sm:py-1.5 sm:text-xs">
            {originPickMode ? (
              <>
                <LocateFixed
                  className="h-3.5 w-3.5 shrink-0 text-[#2563EB]"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-[#2563EB]">
                  Tap map to set your start location
                </span>
              </>
            ) : selectedRoute?.verificationStatus === 'field_draft' ? (
              <>
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 text-[var(--peak)]"
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-[var(--peak)]">
                  Field draft · Verify signboard
                </span>
              </>
            ) : (
              <>
                <ShieldCheck
                  className="h-3.5 w-3.5 shrink-0 text-[var(--success)]"
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-[var(--foreground)]">
                  {selectedRoute
                    ? `${selectedRoute.code} · ${
                        selectedRoute.verificationStatus === 'ltfrb_reference'
                          ? 'LTFRB ref'
                          : 'Verified'
                      }`
                    : city.name}
                </span>
              </>
            )}
          </div>

          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
            {pinpoint && onClearPinpoint ? (
              <button
                type="button"
                onClick={onClearPinpoint}
                aria-label="Clear map pinpoint"
                className="flex cursor-pointer items-center gap-1 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-[11px] font-semibold text-[var(--background)] shadow-sm transition-colors sm:px-3 sm:py-1.5 sm:text-xs"
              >
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="max-w-[110px] truncate sm:max-w-[160px]">
                  {pinpoint.nearestStopName}
                </span>
                <X className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
              </button>
            ) : (
              onPinpointMap && (
                <button
                  type="button"
                  onClick={() => {
                    const targetStop =
                      selectedRoute?.stops[0] ?? cityRoutes[0]?.stops[0];
                    if (targetStop) {
                      onPinpointMap(targetStop.lat, targetStop.lng);
                    } else {
                      onPinpointMap(city.center[0], city.center[1]);
                    }
                  }}
                  aria-label="Pinpoint on map"
                  className="flex cursor-pointer items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-raised)] sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  <MapPin
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <span>Pinpoint</span>
                </button>
              )
            )}

            {onLocateMe && (
              <button
                type="button"
                onClick={onLocateMe}
                aria-label="Locate my position using GPS"
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-raised)] sm:px-3 sm:py-1.5 sm:text-xs"
              >
                <LocateFixed
                  className="h-3.5 w-3.5 text-[#2563EB]"
                  aria-hidden="true"
                />
                <span className="sm:hidden">GPS</span>
                <span className="hidden sm:inline">Locate me</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!compact && selectedRoute && (
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-[400] hidden items-end justify-between gap-2 sm:flex">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-3.5 py-2 text-xs shadow-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
              <span className="text-[var(--text-secondary)]">You</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5D9B19]" />
              <span className="text-[var(--text-secondary)]">Board / Route</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EA580C]" />
              <span className="text-[var(--text-secondary)]">
                Transfer / Drop-off
              </span>
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <Crosshair
                className="h-3.5 w-3.5 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <span className="text-[var(--text-muted)]">
                Tap anywhere on map to pinpoint destination
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
