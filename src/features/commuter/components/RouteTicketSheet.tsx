import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Flag,
  Navigation,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { formatFare, getMinimumDisplayFare } from '../../../domain/transit/fareEngine';
import {
  CorridorAdvisory,
  DiscountType,
  FareRule,
  JeepneyRoute,
} from '../../../domain/transit/types';
import { TransitVehicleArtwork } from './TransitRouteArtwork';

interface RouteTicketSheetProps {
  route: JeepneyRoute;
  fareRules: FareRule[];
  discountType: DiscountType;
  advisories: CorridorAdvisory[];
  isSaved: boolean;
  onBackToList: () => void;
  onToggleSave: (routeId: string) => void;
  onStartRide: (route: JeepneyRoute) => void;
  onOpenReportIssue: (routeCode: string) => void;
}

/**
 * Concise scannable route specification card featuring key-value metrics,
 * hourly peak demand capsule strip, and a collapsible stop sequence.
 */
export const RouteTicketSheet: React.FC<RouteTicketSheetProps> = ({
  route,
  fareRules,
  discountType,
  advisories,
  isSaved,
  onBackToList,
  onToggleSave,
  onStartRide,
  onOpenReportIssue,
}) => {
  const [stopsExpanded, setStopsExpanded] = useState(false);

  const minFare = getMinimumDisplayFare(route, fareRules, discountType);
  const matchingAdvisories = advisories.filter(
    (a) => a.active && a.routeCode === route.code
  );
  const tierLabel =
    route.verificationStatus === 'ltfrb_reference'
      ? 'LTFRB ref'
      : route.verificationStatus === 'community_verified'
        ? 'Verified'
        : 'Field draft';

  return (
    <div className="t-panel-reveal flex flex-col gap-3.5">
      {/* Top Action Seam: Back | Vehicle Signboard Preview | Bookmark */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToList}
          aria-label="Back to routes"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="rounded-xl px-3.5 py-1.5 font-mono text-sm font-semibold text-white tabular-nums"
            style={{ backgroundColor: route.color }}
          >
            {route.code}
          </span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
            {route.vehicleType === 'modern_puv' ? 'Modern PUV' : 'Traditional'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSave(route.id)}
          aria-label={isSaved ? `Unsave ${route.code}` : `Save ${route.code}`}
          aria-pressed={isSaved}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:text-[var(--foreground)]"
        >
          <Bookmark
            className={`h-4 w-4 ${
              isSaved ? 'fill-[var(--accent)] text-[var(--accent)]' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Illustrated Route Pass Summary Strip */}
      <div className="group relative flex items-stretch gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] pr-3.5">
        <TransitVehicleArtwork
          color={route.color}
          vehicleType={route.vehicleType}
          size="detail"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-2.5">
          <h2 className="font-display text-base leading-snug font-semibold text-[var(--foreground)]">
            {route.name}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)] tabular-nums">
            {route.totalDistanceKm} km · ~{route.estimatedDurationMin} min
          </p>
        </div>
      </div>

      {/* Active Admin Advisory Alert */}
      {matchingAdvisories.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-[var(--peak)]/30 bg-[var(--peak-subtle)] px-3 py-2 text-xs text-[var(--peak)]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold">
              {matchingAdvisories[0].severity.toUpperCase()}:{' '}
            </span>
            <span>{matchingAdvisories[0].title}</span>
          </div>
        </div>
      )}

      {/* 2x2 Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 px-3 py-2.5">
          <Coins className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--text-muted)]">Min fare</div>
            <div className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {formatFare(minFare)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 px-3 py-2.5">
          <Timer className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--text-muted)]">Headway</div>
            <div className="truncate text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {route.headwayMin}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 px-3 py-2.5">
          <Clock className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--text-muted)]">Hours</div>
            <div className="truncate text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {route.operatingHours}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)]/60 px-3 py-2.5">
          <ShieldCheck
            className={`h-4 w-4 shrink-0 ${
              route.verificationStatus === 'field_draft'
                ? 'text-[var(--peak)]'
                : 'text-[var(--success)]'
            }`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--text-muted)]">Status</div>
            <div className="truncate text-sm font-semibold text-[var(--foreground)]">
              {tierLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Capsule Peak Demand Strip (6a - 6p) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--foreground)]">
            {route.peakHoursLabel}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">6a – 6p</span>
        </div>
        <div
          className="mt-2 flex h-9 items-end gap-1.5"
          aria-label="Hourly demand strip"
        >
          {route.peakDemand.map((val, idx) => {
            const isPeak = val >= 80;
            return (
              <div
                key={idx}
                title={`${6 + idx}:00 — ${val}% load`}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.max(22, val)}%`,
                  backgroundColor: isPeak ? 'var(--peak)' : 'var(--border)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Concise Key-Value Signboard + Collapsible Stops */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3.5 py-2.5">
          <span className="text-[var(--text-muted)]">Signboard</span>
          <span className="truncate font-mono font-medium text-[var(--foreground)]">
            {route.signboardText}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setStopsExpanded((v) => !v)}
          aria-expanded={stopsExpanded}
          className="flex min-h-[42px] w-full cursor-pointer items-center justify-between px-3.5 py-2 text-left transition-colors hover:bg-[var(--surface-raised)]"
        >
          <span className="font-medium text-[var(--foreground)] tabular-nums">
            {route.stops.length} mapped stops
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--accent)]">
            <span>{stopsExpanded ? 'Hide' : 'View stops'}</span>
            {stopsExpanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
        </button>

        {stopsExpanded && (
          <ol className="t-panel-reveal divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] px-3.5 py-1.5">
            {route.stops.map((stop, idx) => (
              <li key={stop.id} className="flex items-center gap-2.5 py-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold tabular-nums ${
                    idx === 0
                      ? 'bg-[var(--accent)] text-white'
                      : idx === route.stops.length - 1
                        ? 'bg-[var(--peak)] text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-[var(--foreground)]">
                    {stop.name}
                  </div>
                  <div className="truncate text-[11px] text-[var(--text-muted)]">
                    {stop.landmark}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Dark Ticket Footer Strip */}
      <div className="flex items-center gap-2 rounded-2xl bg-[#111827] p-2">
        <button
          type="button"
          onClick={() => onStartRide(route)}
          className="flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          <span>Start ride</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenReportIssue(route.code)}
          aria-label={`Report issue for ${route.code}`}
          className="flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/20"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Report</span>
        </button>
      </div>
    </div>
  );
};
