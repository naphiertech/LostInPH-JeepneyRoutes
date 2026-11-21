import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { hasDuplicateRouteCode } from '@/domain/transit/routeAudit';
import {
  CityInfo,
  JeepneyRoute,
  RouteStop,
  VehicleType,
} from '@/domain/transit/types';

interface RouteEditorModalProps {
  route: JeepneyRoute | null;
  allRoutes: JeepneyRoute[];
  cities: CityInfo[];
  onClose: () => void;
  onSave: (updated: JeepneyRoute) => void;
}

export const RouteEditorModal: React.FC<RouteEditorModalProps> = ({
  route,
  allRoutes,
  cities,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [signboardText, setSignboardText] = useState('');
  const [vehicleType, setVehicleType] =
    useState<VehicleType>('traditional_jeepney');
  const [operatingHours, setOperatingHours] = useState('');
  const [headwayMin, setHeadwayMin] = useState('');
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [newStopName, setNewStopName] = useState('');
  const [newStopLandmark, setNewStopLandmark] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!route) return;
    setCode(route.code);
    setName(route.name);
    setSignboardText(route.signboardText);
    setVehicleType(route.vehicleType);
    setOperatingHours(route.operatingHours);
    setHeadwayMin(route.headwayMin);
    setStops(route.stops);
    setNewStopName('');
    setNewStopLandmark('');
    setError('');
  }, [route]);

  useEffect(() => {
    if (!route) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [route, onClose]);

  if (!route) return null;

  const city = cities.find((c) => c.id === route.cityId);

  const handleAddStop = () => {
    const trimmed = newStopName.trim();
    if (!trimmed) return;
    const anchor = stops[stops.length - 1];
    const lat = anchor ? Number((anchor.lat + 0.0022).toFixed(5)) : city?.center[0] ?? 10.3157;
    const lng = anchor ? Number((anchor.lng + 0.0022).toFixed(5)) : city?.center[1] ?? 123.8854;
    setStops((prev) => [
      ...prev,
      {
        id: `stop-${Date.now()}-${prev.length + 1}`,
        name: trimmed,
        lat,
        lng,
        landmark: newStopLandmark.trim() || `${trimmed} jeepney stop`,
        barangayOrDistrict: city?.name ?? route.cityId,
      },
    ]);
    setNewStopName('');
    setNewStopLandmark('');
  };

  const handleMoveStop = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= stops.length) return;
    setStops((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleRemoveStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanSignboard = signboardText.trim().toUpperCase();

    if (!cleanCode || !cleanName || !cleanSignboard) {
      setError('Route code, corridor name, and signboard placard are required.');
      return;
    }
    if (stops.length < 2) {
      setError('A corridor must keep at least 2 stops.');
      return;
    }
    if (hasDuplicateRouteCode(allRoutes, route.cityId, cleanCode, route.id)) {
      setError(
        `Route code "${cleanCode}" already exists in ${city?.name ?? route.cityId}.`
      );
      return;
    }

    onSave({
      ...route,
      code: cleanCode,
      name: cleanName,
      signboardText: cleanSignboard,
      vehicleType,
      operatingHours: operatingHours.trim() || route.operatingHours,
      headwayMin: headwayMin.trim() || route.headwayMin,
      stops,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit route ${route.code}`}
    >
      <div className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Edit corridor · {route.code} ({city?.name ?? route.cityId})
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Updates sync immediately to Commuter Routes, Pinpoint recommendations, and Route QA.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close route editor"
            className="cursor-pointer rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="edit-route-code"
                className="mb-1 block font-medium text-[var(--foreground)]"
              >
                Route code
              </label>
              <input
                id="edit-route-code"
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono uppercase text-[var(--foreground)]"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="edit-route-name"
                className="mb-1 block font-medium text-[var(--foreground)]"
              >
                Corridor title
              </label>
              <input
                id="edit-route-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-route-signboard"
              className="mb-1 block font-medium text-[var(--foreground)]"
            >
              Windshield signboard text
            </label>
            <input
              id="edit-route-signboard"
              type="text"
              value={signboardText}
              onChange={(e) => setSignboardText(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono uppercase text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="edit-route-vehicle"
                className="mb-1 block font-medium text-[var(--foreground)]"
              >
                Vehicle type
              </label>
              <select
                id="edit-route-vehicle"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
              >
                <option value="traditional_jeepney">Traditional Jeepney</option>
                <option value="modern_puv">Modern PUV</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="edit-route-hours"
                className="mb-1 block font-medium text-[var(--foreground)]"
              >
                Operating hours
              </label>
              <input
                id="edit-route-hours"
                type="text"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
              />
            </div>
            <div>
              <label
                htmlFor="edit-route-headway"
                className="mb-1 block font-medium text-[var(--foreground)]"
              >
                Headway
              </label>
              <input
                id="edit-route-headway"
                type="text"
                value={headwayMin}
                onChange={(e) => setHeadwayMin(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
              />
            </div>
          </div>

          {/* Ordered Stops Editor */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/45 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-[var(--foreground)]">
                Ordered stops ({stops.length})
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Minimum 2 stops
              </span>
            </div>

            <ol className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {stops.map((stop, idx) => (
                <li
                  key={stop.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--foreground)]">
                      {idx + 1}. {stop.name}
                    </div>
                    <div className="truncate text-[11px] text-[var(--text-muted)]">
                      {stop.landmark}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${stop.name} up`}
                      className="cursor-pointer rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-35"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveStop(idx, 1)}
                      disabled={idx === stops.length - 1}
                      aria-label={`Move ${stop.name} down`}
                      className="cursor-pointer rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] disabled:opacity-35"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      disabled={stops.length <= 2}
                      aria-label={`Remove ${stop.name}`}
                      className="cursor-pointer rounded p-1 text-[var(--danger)] hover:bg-[var(--danger-subtle)] disabled:opacity-35"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
                placeholder="New stop name"
                aria-label="New stop name"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[var(--foreground)]"
              />
              <input
                type="text"
                value={newStopLandmark}
                onChange={(e) => setNewStopLandmark(e.target.value)}
                placeholder="Nearby landmark (optional)"
                aria-label="New stop landmark"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={handleAddStop}
                className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add stop</span>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-[var(--danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-[var(--foreground)] px-4 py-2 font-medium text-[var(--surface)] hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
