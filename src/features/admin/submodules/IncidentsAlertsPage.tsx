import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  AdvisorySeverity,
  CityId,
  CityInfo,
  CorridorAdvisory,
} from '../../../domain/transit/types';
import { AdvisorySeverityPill } from '../../../shared/ui/StatusPill';

interface IncidentsAlertsPageProps {
  cities: CityInfo[];
  advisories: CorridorAdvisory[];
  globalCityFilter: 'all' | CityId;
  onToggleAdvisory: (id: string) => void;
  onAddAdvisory: (advisory: Omit<CorridorAdvisory, 'id' | 'reportedAt'>) => void;
}

export const IncidentsAlertsPage: React.FC<IncidentsAlertsPageProps> = ({
  cities,
  advisories,
  globalCityFilter,
  onToggleAdvisory,
  onAddAdvisory,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [cityId, setCityId] = useState<CityId>(
    globalCityFilter === 'all' ? 'cebu' : globalCityFilter
  );
  const [routeCode, setRouteCode] = useState('17C');
  const [severity, setSeverity] = useState<AdvisorySeverity>('detour');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const filtered = useMemo(() => {
    return advisories.filter((adv) => {
      if (globalCityFilter !== 'all' && adv.cityId !== globalCityFilter) {
        return false;
      }
      if (statusFilter === 'active' && !adv.active) return false;
      if (statusFilter === 'resolved' && adv.active) return false;
      return true;
    });
  }, [advisories, globalCityFilter, statusFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Provide both a headline and rerouting guidance.');
      return;
    }
    onAddAdvisory({
      cityId,
      routeCode: routeCode.trim().toUpperCase() || '17C',
      title: title.trim(),
      description: description.trim(),
      severity,
      active: true,
    });
    setTitle('');
    setDescription('');
    setError('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(['all', 'active', 'resolved'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${
                statusFilter === status
                  ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Publish advisory</span>
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((adv) => {
          const city = cityById.get(adv.cityId);
          return (
            <div
              key={adv.id}
              className="flex flex-col justify-between gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {adv.id}
                  </span>
                  <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[11px] font-medium">
                    {adv.routeCode}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {city?.name ?? adv.cityId}
                  </span>
                  <AdvisorySeverityPill severity={adv.severity} />
                  {!adv.active && (
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                      Resolved
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {adv.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {adv.description}
                </p>
                <div className="font-mono text-[11px] text-[var(--text-muted)]">
                  Updated {adv.reportedAt}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleAdvisory(adv.id)}
                className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  adv.active
                    ? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:bg-[var(--surface)]'
                    : 'border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]'
                }`}
              >
                {adv.active ? 'Mark resolved' : 'Re-activate'}
              </button>
            </div>
          );
        })}
      </div>

      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Publish corridor advisory"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Publish corridor advisory or detour
              </h2>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                aria-label="Close modal"
                className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="adv-city"
                    className="mb-1 block font-medium text-[var(--foreground)]"
                  >
                    City
                  </label>
                  <select
                    id="adv-city"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value as CityId)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)]"
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
                    htmlFor="adv-code"
                    className="mb-1 block font-medium text-[var(--foreground)]"
                  >
                    Route
                  </label>
                  <input
                    id="adv-code"
                    type="text"
                    value={routeCode}
                    onChange={(e) => setRouteCode(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="adv-severity"
                    className="mb-1 block font-medium text-[var(--foreground)]"
                  >
                    Severity
                  </label>
                  <select
                    id="adv-severity"
                    value={severity}
                    onChange={(e) =>
                      setSeverity(e.target.value as AdvisorySeverity)
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[var(--foreground)]"
                  >
                    <option value="advisory">Advisory</option>
                    <option value="detour">Detour</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="adv-title"
                  className="mb-1 block font-medium text-[var(--foreground)]"
                >
                  Headline
                </label>
                <input
                  id="adv-title"
                  type="text"
                  placeholder="Colon heritage walk temporary loading shift"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label
                  htmlFor="adv-desc"
                  className="mb-1 block font-medium text-[var(--foreground)]"
                >
                  Commuter rerouting guidance
                </label>
                <textarea
                  id="adv-desc"
                  rows={3}
                  placeholder="Board along P. del Rosario corner Junquera St..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-[var(--danger)]">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 font-medium text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-[var(--accent)] px-3.5 py-2 font-medium text-white"
                >
                  Publish live alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
