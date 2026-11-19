import React, { useEffect, useState } from 'react';
import { Flag, X } from 'lucide-react';
import {
  CityInfo,
  CommunityReport,
  JeepneyRoute,
  NewFieldReportInput,
} from '../../../domain/transit/types';

interface FieldReportSheetProps {
  isOpen: boolean;
  city: CityInfo;
  cityRoutes: JeepneyRoute[];
  initialRouteCode: string;
  reporterName: string;
  onClose: () => void;
  onSubmitReport: (input: NewFieldReportInput) => CommunityReport;
}

const ISSUE_OPTIONS: ReadonlyArray<{
  id: CommunityReport['issueType'];
  label: string;
}> = [
  { id: 'route_detour', label: 'Detour' },
  { id: 'fare_change', label: 'Fare' },
  { id: 'landmark_update', label: 'Landmark' },
  { id: 'new_stop', label: 'New stop' },
];

/**
 * Compact modal/drawer allowing commuters to submit a live Field Report
 * directly into Admin's Field Reports & Triage queue.
 */
export const FieldReportSheet: React.FC<FieldReportSheetProps> = ({
  isOpen,
  city,
  cityRoutes,
  initialRouteCode,
  reporterName,
  onClose,
  onSubmitReport,
}) => {
  const [issueType, setIssueType] =
    useState<CommunityReport['issueType']>('route_detour');
  const [routeCode, setRouteCode] = useState(
    initialRouteCode || cityRoutes[0]?.code || ''
  );
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRouteCode(initialRouteCode || cityRoutes[0]?.code || '');
      setError(null);
      setSubmittedId(null);
    }
  }, [isOpen, initialRouteCode, cityRoutes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = summary.trim();
    if (trimmed.length < 4) {
      setError('Enter a short summary of what changed.');
      return;
    }
    const created = onSubmitReport({
      cityId: city.id,
      routeCode: routeCode || cityRoutes[0]?.code || 'GENERAL',
      reporterName,
      issueType,
      summary: trimmed,
      details: `Submitted from Commuter App (${city.name}).`,
    });
    setSubmittedId(created.id);
    setError(null);
    setSummary('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-report-title"
      className="fixed inset-0 z-[600] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-md rounded-t-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:rounded-[20px]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[var(--peak)]" aria-hidden="true" />
            <h2
              id="field-report-title"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Report route issue · {city.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmittedId(null);
              setError(null);
              onClose();
            }}
            aria-label="Close report sheet"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {submittedId ? (
          <div className="t-panel-reveal mt-4 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--success)]/30 bg-[var(--success-subtle)] p-3.5 text-xs text-[var(--success)]">
              <span className="t-success-check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    d="M3.5 8.5L6.5 11.5L12.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <div className="font-semibold">
                  Report {submittedId} sent to operator triage
                </div>
                <div className="mt-0.5 text-[var(--text-secondary)]">
                  Visible immediately in Admin Field Reports ({issueType}).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubmittedId(null);
                onClose();
              }}
              className="min-h-[44px] w-full cursor-pointer rounded-xl bg-[#111827] text-sm font-medium text-white"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <div>
              <div className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">
                Issue type
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {ISSUE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIssueType(opt.id)}
                    className={`min-h-[38px] cursor-pointer rounded-xl border px-2 text-xs font-medium transition-colors ${
                      issueType === opt.id
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="report-route-code"
                className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
              >
                Jeepney route
              </label>
              <select
                id="report-route-code"
                value={routeCode}
                onChange={(e) => setRouteCode(e.target.value)}
                className="min-h-[42px] w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--foreground)]"
              >
                {cityRoutes.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="report-summary-input"
                className="mb-1 block text-xs font-medium text-[var(--text-secondary)]"
              >
                What changed?
              </label>
              <input
                id="report-summary-input"
                type="text"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={Boolean(error)}
                placeholder="e.g. Escario loading zone moved 50m north"
                className="min-h-[44px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
              />
              {error && (
                <div role="alert" className="mt-1 text-xs text-[var(--danger)]">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="min-h-[44px] w-full cursor-pointer rounded-xl bg-[#111827] text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Submit Field Report
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
