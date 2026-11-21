import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Download,
  MapPin,
  Pencil,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  hasDuplicateRouteCode,
  validateRouteImportPayload,
} from '@/domain/transit/routeAudit';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
  VehicleType,
  VerificationTier,
} from '@/domain/transit/types';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { useNotifications } from '@/shared/ui/NotificationCenter';
import { ResponsiveTable } from '@/shared/ui/ResponsiveTable';
import { VehiclePill, VerificationPill } from '@/shared/ui/StatusPill';
import { RouteEditorModal } from '../components/RouteEditorModal';

const StopsTerminalsPage = lazy(() =>
  import('./StopsTerminalsPage').then((m) => ({
    default: m.StopsTerminalsPage,
  }))
);

interface RoutesManagerPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  globalCityFilter: 'all' | CityId;
  activeSubView: 'registry' | 'stops';
  onChangeSubView: (view: 'registry' | 'stops') => void;
  selectedMapRoute: JeepneyRoute | null;
  onSelectMapRoute: (route: JeepneyRoute) => void;
  onAddRouteDraft: (draft: {
    code: string;
    name: string;
    cityId: CityId;
    vehicleType: VehicleType;
    signboardText: string;
    originName: string;
    destinationName: string;
  }) => void;
  onUpdateRoute: (updated: JeepneyRoute) => void;
  onDeleteRoute: (routeId: string) => void;
  onBulkImportRoutes: (imported: JeepneyRoute[]) => void;
  onPromoteRoute: (routeId: string, nextTier: VerificationTier) => void;
  onInspectOnMap: (route: JeepneyRoute) => void;
}

const SAMPLE_IMPORT_JSON = JSON.stringify(
  [
    {
      code: '21B',
      name: 'Mandaue – Cathedral – SM City',
      cityId: 'cebu',
      vehicleType: 'traditional_jeepney',
      signboardText: 'MANDAUE • CATHEDRAL • SM CITY',
      stops: [
        { name: 'Mandaue Mercado', lat: 10.3235, lng: 123.9412, isTerminal: true },
        { name: 'SM City Cebu Terminal', lat: 10.3114, lng: 123.9182, isTerminal: true },
      ],
    },
  ],
  null,
  2
);

export const RoutesManagerPage: React.FC<RoutesManagerPageProps> = ({
  cities,
  routes,
  globalCityFilter,
  activeSubView,
  onChangeSubView,
  selectedMapRoute,
  onSelectMapRoute,
  onAddRouteDraft,
  onUpdateRoute,
  onDeleteRoute,
  onBulkImportRoutes,
  onPromoteRoute,
  onInspectOnMap,
}) => {
  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | VerificationTier>('all');
  const [inspectedRouteId, setInspectedRouteId] = useState<string | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Add Route Draft form state
  const [draftCity, setDraftCity] = useState<CityId>(
    globalCityFilter === 'all' ? 'cebu' : globalCityFilter
  );
  const [draftCode, setDraftCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftSignboard, setDraftSignboard] = useState('');
  const [draftVehicle, setDraftVehicle] = useState<VehicleType>('modern_puv');
  const [draftOrigin, setDraftOrigin] = useState('');
  const [draftDestination, setDraftDestination] = useState('');
  const [draftError, setDraftError] = useState('');

  // Bulk JSON Import state
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const { notify } = useNotifications();

  useEffect(() => {
    if (!isDraftOpen && !isImportOpen && !inspectedRouteId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isDraftOpen) setIsDraftOpen(false);
      else if (isImportOpen) setIsImportOpen(false);
      else if (inspectedRouteId) setInspectedRouteId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDraftOpen, isImportOpen, inspectedRouteId]);

  const handleExportRegistry = () => {
    const payload = JSON.stringify(filteredRoutes, null, 2);
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lostinph-routes-${globalCityFilter}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Non-Blob test environment fallback
    }
    notify({
      title: `Exported ${filteredRoutes.length} route corridor(s) to JSON registry.`,
      description: `File: lostinph-routes-${globalCityFilter}.json`,
      category: 'system',
      tone: 'success',
      tagLabel: 'Registry JSON',
    });
  };

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return routes.filter((route) => {
      if (globalCityFilter !== 'all' && route.cityId !== globalCityFilter) {
        return false;
      }
      if (tierFilter !== 'all' && route.verificationStatus !== tierFilter) {
        return false;
      }
      if (!q) return true;
      return (
        route.code.toLowerCase().includes(q) ||
        route.name.toLowerCase().includes(q) ||
        route.signboardText.toLowerCase().includes(q)
      );
    });
  }, [routes, globalCityFilter, tierFilter, query]);

  const inspectedRoute = useMemo(
    () => routes.find((r) => r.id === inspectedRouteId) ?? null,
    [routes, inspectedRouteId]
  );

  const editingRoute = useMemo(
    () => routes.find((r) => r.id === editingRouteId) ?? null,
    [routes, editingRouteId]
  );

  const handleSubmitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = draftCode.trim().toUpperCase();
    if (!cleanCode || !draftName.trim() || !draftSignboard.trim()) {
      setDraftError('Route code, corridor title, and signboard text are required.');
      return;
    }
    if (hasDuplicateRouteCode(routes, draftCity, cleanCode)) {
      const cityName = cityById.get(draftCity)?.name ?? draftCity;
      setDraftError(
        `Route code "${cleanCode}" already exists in ${cityName}. Edit the existing route or choose another code.`
      );
      return;
    }
    onAddRouteDraft({
      code: cleanCode,
      name: draftName.trim(),
      cityId: draftCity,
      vehicleType: draftVehicle,
      signboardText: draftSignboard.trim().toUpperCase(),
      originName: draftOrigin.trim() || 'Origin Terminal Bay',
      destinationName: draftDestination.trim() || 'Destination Turning Point',
    });
    setDraftCode('');
    setDraftName('');
    setDraftSignboard('');
    setDraftOrigin('');
    setDraftDestination('');
    setDraftError('');
    setIsDraftOpen(false);
  };

  const handleSubmitImport = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateRouteImportPayload(
      importJson,
      cities.map((c) => c.id),
      routes
    );
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    onBulkImportRoutes(result.routes);
    setImportJson('');
    setImportError('');
    setIsImportOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Sub-module Switcher: Routes Registry | Stops & Map */}
      <div
        role="tablist"
        aria-label="Routes and stops workspace views"
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubView === 'registry'}
          onClick={() => onChangeSubView('registry')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeSubView === 'registry'
              ? 'bg-[var(--surface)] font-semibold text-[var(--foreground)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
          }`}
        >
          <Route className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Routes Registry ({filteredRoutes.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubView === 'stops'}
          onClick={() => onChangeSubView('stops')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
            activeSubView === 'stops'
              ? 'bg-[var(--surface)] font-semibold text-[var(--foreground)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Stops &amp; Map</span>
        </button>
      </div>

      {activeSubView === 'stops' ? (
        <ErrorBoundary scopeLabel="Stops & Map inspector">
          <Suspense
            fallback={
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--text-muted)]">
                Loading Stops &amp; Map…
              </div>
            }
          >
            <StopsTerminalsPage
              cities={cities}
              routes={routes}
              globalCityFilter={globalCityFilter}
              selectedMapRoute={selectedMapRoute}
              onSelectMapRoute={onSelectMapRoute}
            />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search code (17C), placard, corridor..."
                  aria-label="Search routes"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pr-3 pl-9 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <select
                aria-label="Filter by verification tier"
                value={tierFilter}
                onChange={(e) =>
                  setTierFilter(e.target.value as 'all' | VerificationTier)
                }
                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="all">All verification tiers</option>
                <option value="ltfrb_reference">LTFRB reference</option>
                <option value="community_verified">Community verified</option>
                <option value="field_draft">Field draft (unverified)</option>
              </select>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setImportError('');
                  setIsImportOpen(true);
                }}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Import JSON</span>
              </button>

              <button
                type="button"
                onClick={handleExportRegistry}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDraftError('');
                  setIsDraftOpen(true);
                }}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-90 sm:flex-initial"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New route draft</span>
              </button>
            </div>
          </div>

          {/* Main Accessible Table */}
          <ResponsiveTable
            ariaLabel="Philippine jeepney and modern PUV route registry"
            columnLabels={{
              2: 'Corridor & Signboard',
              3: 'City',
              4: 'Vehicle',
              5: 'Stops',
              6: 'Verification',
              7: 'Action',
            }}
          >
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Corridor &amp; Signboard</th>
                <th scope="col">City</th>
                <th scope="col">Vehicle</th>
                <th scope="col" className="text-right">
                  Stops
                </th>
                <th scope="col">Verification</th>
                <th scope="col" className="text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => {
                const city = cityById.get(route.cityId);
                const confirmingDelete = confirmDeleteId === route.id;
                return (
                  <tr key={route.id}>
                    <th scope="row" className="font-mono text-xs font-semibold">
                      {route.code}
                    </th>
                    <td>
                      <div className="text-xs font-medium text-[var(--foreground)]">
                        {route.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                        {route.signboardText}
                      </div>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {city?.name ?? route.cityId}
                    </td>
                    <td>
                      <VehiclePill type={route.vehicleType} />
                    </td>
                    <td className="tabular-nums text-right text-xs">
                      {route.stops.length}
                    </td>
                    <td>
                      <VerificationPill tier={route.verificationStatus} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {route.verificationStatus === 'field_draft' && (
                          <button
                            type="button"
                            onClick={() =>
                              onPromoteRoute(route.id, 'community_verified')
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--success)]/35 bg-[var(--success-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--success)] hover:opacity-85"
                          >
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                            <span>Verify</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingRouteId(route.id)}
                          aria-label={`Edit ${route.code}`}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedRouteId(route.id)}
                          className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectOnMap(route)}
                          className="cursor-pointer rounded-md border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:opacity-85"
                        >
                          Map
                        </button>
                        {confirmingDelete ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRoute(route.id);
                                setConfirmDeleteId(null);
                              }}
                              className="cursor-pointer rounded-md bg-[var(--danger)] px-2 py-1 text-xs font-medium text-white"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="cursor-pointer rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(route.id)}
                            aria-label={`Delete ${route.code}`}
                            className="cursor-pointer rounded-md border border-[var(--border)] p-1 text-[var(--text-muted)] hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRoutes.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-xs text-[var(--text-muted)]"
                  >
                    No jeepney routes match the current city or verification filter.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>

          {/* Route Details Slide-Over Drawer */}
          {inspectedRoute && (
            <div
              className="fixed inset-0 z-50 flex justify-end bg-black/35"
              role="dialog"
              aria-modal="true"
              aria-label={`Route ${inspectedRoute.code} inspector`}
            >
              <div className="flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
                <div>
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[var(--accent-subtle)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--accent)]">
                          {inspectedRoute.code}
                        </span>
                        <VerificationPill
                          tier={inspectedRoute.verificationStatus}
                        />
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                        {inspectedRoute.name}
                      </h2>
                      <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                        Signboard: {inspectedRoute.signboardText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedRouteId(null)}
                      aria-label="Close route details"
                      className="cursor-pointer rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4 text-xs">
                    <p className="leading-relaxed text-[var(--text-secondary)]">
                      {inspectedRoute.corridorSummary}
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                      <div>
                        <div className="text-[var(--text-muted)]">
                          Operating hours
                        </div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">
                          {inspectedRoute.operatingHours}
                        </div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">
                          Dispatch headway
                        </div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">
                          {inspectedRoute.headwayMin}
                        </div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">Distance</div>
                        <div className="mt-0.5 tabular-nums font-medium text-[var(--foreground)]">
                          {inspectedRoute.totalDistanceKm} km
                        </div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)]">
                          Verification note
                        </div>
                        <div className="mt-0.5 font-medium text-[var(--foreground)]">
                          {inspectedRoute.verificationNote}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 font-semibold text-[var(--foreground)]">
                        Ordered stops ({inspectedRoute.stops.length})
                      </h3>
                      <ol className="space-y-2 border-l border-[var(--border)] pl-3">
                        {inspectedRoute.stops.map((stop, idx) => (
                          <li key={stop.id} className="relative">
                            <div className="font-medium text-[var(--foreground)]">
                              {idx + 1}. {stop.name}
                              {(stop.isTerminal || stop.isTransferHub) && (
                                <span className="ml-1.5 rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                  {stop.isTerminal ? 'Terminal' : 'Transfer hub'}
                                </span>
                              )}
                            </div>
                            <div className="text-[var(--text-secondary)]">
                              {stop.landmark}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRouteId(inspectedRoute.id);
                      setInspectedRouteId(null);
                    }}
                    className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                  >
                    Edit route
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onInspectOnMap(inspectedRoute);
                      setInspectedRouteId(null);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-xs font-medium text-white hover:opacity-90"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Inspect stops on map</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Route Field Draft Modal */}
          {isDraftOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Create new route field draft"
            >
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Add unverified route field draft
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsDraftOpen(false)}
                    aria-label="Close modal"
                    className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmitDraft}
                  className="mt-4 space-y-3 text-xs"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="draft-city"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        City
                      </label>
                      <select
                        id="draft-city"
                        value={draftCity}
                        onChange={(e) => setDraftCity(e.target.value as CityId)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      >
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="draft-vehicle"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        Vehicle class
                      </label>
                      <select
                        id="draft-vehicle"
                        value={draftVehicle}
                        onChange={(e) =>
                          setDraftVehicle(e.target.value as VehicleType)
                        }
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      >
                        <option value="traditional_jeepney">
                          Traditional Jeepney
                        </option>
                        <option value="modern_puv">Modern PUV</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="draft-code"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        Route code
                      </label>
                      <input
                        id="draft-code"
                        type="text"
                        placeholder="21B"
                        value={draftCode}
                        onChange={(e) => {
                          setDraftCode(e.target.value);
                          if (draftError) setDraftError('');
                        }}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="draft-name"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        Corridor title
                      </label>
                      <input
                        id="draft-name"
                        type="text"
                        placeholder="Mandaue – Cathedral – SM City"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="draft-signboard"
                      className="mb-1 block font-medium text-[var(--foreground)]"
                    >
                      Windshield signboard placard
                    </label>
                    <input
                      id="draft-signboard"
                      type="text"
                      placeholder="MANDAUE • JONES • CARBON"
                      value={draftSignboard}
                      onChange={(e) => setDraftSignboard(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono text-[var(--foreground)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="draft-origin"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        Origin terminal
                      </label>
                      <input
                        id="draft-origin"
                        type="text"
                        placeholder="Mandaue Mercado"
                        value={draftOrigin}
                        onChange={(e) => setDraftOrigin(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="draft-dest"
                        className="mb-1 block font-medium text-[var(--foreground)]"
                      >
                        End terminal
                      </label>
                      <input
                        id="draft-dest"
                        type="text"
                        placeholder="Cathedral Plaza"
                        value={draftDestination}
                        onChange={(e) => setDraftDestination(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                      />
                    </div>
                  </div>

                  {draftError && (
                    <p role="alert" className="text-xs text-[var(--danger)]">
                      {draftError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDraftOpen(false)}
                      className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 font-medium text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg bg-[var(--accent)] px-3.5 py-2 font-medium text-white"
                    >
                      Save as field draft
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Bulk JSON Import Modal */}
          {isImportOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Bulk import routes JSON"
            >
              <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      Bulk import jeepney routes (JSON)
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      Validates city IDs, stop coordinates, and duplicate codes before adding.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    aria-label="Close import modal"
                    className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmitImport}
                  className="mt-4 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="bulk-import-json"
                      className="font-medium text-[var(--foreground)]"
                    >
                      Routes JSON array
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setImportJson(SAMPLE_IMPORT_JSON);
                        setImportError('');
                      }}
                      className="cursor-pointer text-[11px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Load sample template
                    </button>
                  </div>

                  <textarea
                    id="bulk-import-json"
                    rows={9}
                    value={importJson}
                    onChange={(e) => {
                      setImportJson(e.target.value);
                      if (importError) setImportError('');
                    }}
                    placeholder='[{"code":"21B","name":"...","cityId":"cebu","stops":[...]}]'
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/40 p-3 font-mono text-[11px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  />

                  {importError && (
                    <p role="alert" className="text-xs text-[var(--danger)]">
                      {importError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsImportOpen(false)}
                      className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 font-medium text-[var(--text-secondary)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg bg-[var(--foreground)] px-4 py-2 font-medium text-[var(--surface)] hover:opacity-90"
                    >
                      Validate &amp; import
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Route & Stop Editor Modal */}
          <RouteEditorModal
            route={editingRoute}
            allRoutes={routes}
            cities={cities}
            onClose={() => setEditingRouteId(null)}
            onSave={onUpdateRoute}
          />
        </>
      )}
    </div>
  );
};
