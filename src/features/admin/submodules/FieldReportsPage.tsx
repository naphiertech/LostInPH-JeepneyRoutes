import React, { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  CityId,
  CityInfo,
  CommunityReport,
  TriageLabel,
} from '../../../domain/transit/types';
import { TriagePill } from '../../../shared/ui/StatusPill';

interface FieldReportsPageProps {
  cities: CityInfo[];
  reports: CommunityReport[];
  globalCityFilter: 'all' | CityId;
  onUpdateReportTriage: (reportId: string, nextStatus: TriageLabel) => void;
  onAddReport: (report: Omit<CommunityReport, 'id' | 'createdAt'>) => void;
}

const TRIAGE_OPTIONS: TriageLabel[] = [
  'needs-triage',
  'needs-info',
  'ready-for-agent',
  'ready-for-human',
  'wontfix',
];

export const FieldReportsPage: React.FC<FieldReportsPageProps> = ({
  cities,
  reports,
  globalCityFilter,
  onUpdateReportTriage,
  onAddReport,
}) => {
  const [triageFilter, setTriageFilter] = useState<'all' | TriageLabel>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [cityId, setCityId] = useState<CityId>(
    globalCityFilter === 'all' ? 'cebu' : globalCityFilter
  );
  const [routeCode, setRouteCode] = useState('17C');
  const [issueType, setIssueType] =
    useState<CommunityReport['issueType']>('landmark_update');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [formError, setFormError] = useState('');

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      if (globalCityFilter !== 'all' && rep.cityId !== globalCityFilter) {
        return false;
      }
      if (triageFilter !== 'all' && rep.triageStatus !== triageFilter) {
        return false;
      }
      return true;
    });
  }, [reports, globalCityFilter, triageFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() || !details.trim()) {
      setFormError('Enter both a summary and field verification details.');
      return;
    }
    onAddReport({
      cityId,
      routeCode: routeCode.trim().toUpperCase() || '17C',
      reporterName: 'Engr. Carlo Dizon',
      issueType,
      summary: summary.trim(),
      details: details.trim(),
      triageStatus: 'needs-triage',
    });
    setSummary('');
    setDetails('');
    setFormError('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter reports by workflow triage label"
        >
          <button
            type="button"
            onClick={() => setTriageFilter('all')}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              triageFilter === 'all'
                ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            All ({reports.length})
          </button>
          {TRIAGE_OPTIONS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setTriageFilter(label)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                triageFilter === label
                  ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Log field report</span>
        </button>
      </div>

      <div className="space-y-3">
        {filteredReports.map((rep) => {
          const city = cityById.get(rep.cityId);
          return (
            <article
              key={rep.id}
              className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-semibold text-[var(--foreground)]">
                      {rep.id}
                    </span>
                    <span className="rounded bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--foreground)]">
                      {rep.routeCode}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {city?.name ?? rep.cityId}
                    </span>
                    <TriagePill label={rep.triageStatus} />
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    {rep.summary}
                  </h2>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {rep.details}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <label
                    htmlFor={`triage-${rep.id}`}
                    className="text-[11px] font-medium text-[var(--text-muted)]"
                  >
                    Triage status
                  </label>
                  <select
                    id={`triage-${rep.id}`}
                    value={rep.triageStatus}
                    onChange={(e) =>
                      onUpdateReportTriage(rep.id, e.target.value as TriageLabel)
                    }
                    className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  >
                    {TRIAGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[var(--border-subtle)] pt-2.5 text-[11px] text-[var(--text-muted)]">
                <span>Reported by {rep.reporterName}</span>
                <span className="font-mono">{rep.createdAt}</span>
                <span>Category: {rep.issueType.replace('_', ' ')}</span>
              </div>
            </article>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] py-12 text-center text-xs text-[var(--text-muted)]">
            No field reports match the current triage filter.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="New field report"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Log new commuter field report
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
                className="cursor-pointer rounded-lg p-1 text-[var(--text-muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="rep-city"
                    className="mb-1 block font-medium text-[var(--foreground)]"
                  >
                    City
                  </label>
                  <select
                    id="rep-city"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value as CityId)}
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
                    htmlFor="rep-code"
                    className="mb-1 block font-medium text-[var(--foreground)]"
                  >
                    Route code
                  </label>
                  <input
                    id="rep-code"
                    type="text"
                    value={routeCode}
                    onChange={(e) => setRouteCode(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="rep-type"
                  className="mb-1 block font-medium text-[var(--foreground)]"
                >
                  Issue category
                </label>
                <select
                  id="rep-type"
                  value={issueType}
                  onChange={(e) =>
                    setIssueType(
                      e.target.value as CommunityReport['issueType']
                    )
                  }
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                >
                  <option value="landmark_update">Landmark update</option>
                  <option value="route_detour">Route detour / loading shift</option>
                  <option value="new_stop">New terminal / stop bay</option>
                  <option value="fare_change">Fare adjustment check</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="rep-summary"
                  className="mb-1 block font-medium text-[var(--foreground)]"
                >
                  Summary
                </label>
                <input
                  id="rep-summary"
                  type="text"
                  placeholder="Clarify loading zone landmark"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                />
              </div>

              <div>
                <label
                  htmlFor="rep-details"
                  className="mb-1 block font-medium text-[var(--foreground)]"
                >
                  Field verification details
                </label>
                <textarea
                  id="rep-details"
                  rows={3}
                  placeholder="Exact street corner, waiting shed, or signboard wording observed..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[var(--foreground)]"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs text-[var(--danger)]">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-lg border border-[var(--border)] px-3.5 py-2 font-medium text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-[var(--accent)] px-3.5 py-2 font-medium text-white"
                >
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
