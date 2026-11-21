import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { CityInfo, RouteStop } from '@/domain/transit/types';

export interface NavigationStopItem {
  stop: RouteStop;
  routeCode: string;
  signboardText: string;
}

interface TrackTabProps {
  selectedCity: CityInfo;
  navigationStops: NavigationStopItem[];
  navStepIndex: number;
  isAutoPlaying: boolean;
  trackStopsOpen: boolean;
  onToggleTrackStops: () => void;
  onPrevStop: () => void;
  onNextStop: () => void;
  onToggleAutoPlay: () => void;
  onRestart: () => void;
  onReportIssue: (routeCode?: string) => void;
}

export const TrackTab: React.FC<TrackTabProps> = ({
  selectedCity,
  navigationStops,
  navStepIndex,
  isAutoPlaying,
  trackStopsOpen,
  onToggleTrackStops,
  onPrevStop,
  onNextStop,
  onToggleAutoPlay,
  onRestart,
  onReportIssue,
}) => {
  const currentNavItem = navigationStops[navStepIndex] ?? navigationStops[0];
  const stopsRemaining = Math.max(0, navigationStops.length - 1 - navStepIndex);
  const isParaPoZone = stopsRemaining <= 1 && navigationStops.length > 1;

  return (
    <div className="t-panel-reveal flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            On the way
          </span>
          <span className="rounded-lg bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--foreground)]">
            {currentNavItem?.routeCode}
          </span>
        </div>
        <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
          {navStepIndex + 1} / {navigationStops.length}
        </span>
      </div>

      {isParaPoZone ? (
        <div
          role="status"
          className="t-pop rounded-2xl border border-[var(--peak)] bg-[var(--peak-subtle)] p-3.5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--peak)]">
            <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {stopsRemaining === 0
                ? `Arrived · Call "${selectedCity.localStopPhrase}"`
                : `Next stop · Call "${selectedCity.localStopPhrase}"`}
            </span>
          </div>
          <div className="mt-1 truncate text-xs text-[var(--foreground)]">
            {navigationStops[navigationStops.length - 1]?.stop.landmark}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/50 p-3.5">
          <div className="text-[11px] font-medium text-[var(--text-muted)]">
            Current stop · {stopsRemaining} left
          </div>
          <div className="mt-0.5 truncate font-display text-base font-semibold text-[var(--foreground)]">
            {currentNavItem?.stop.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
            {currentNavItem?.stop.landmark}
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevStop}
          disabled={navStepIndex === 0}
          aria-label="Previous stop"
          className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] disabled:opacity-45"
        >
          <SkipBack className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleAutoPlay}
          className="flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-white"
        >
          {isAutoPlaying ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Auto-advance</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onNextStop}
          disabled={navStepIndex >= navigationStops.length - 1}
          aria-label="Next stop"
          className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] disabled:opacity-45"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onRestart}
          aria-label="Restart journey"
          className="flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Collapsible Upcoming Stops */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs">
        <button
          type="button"
          onClick={onToggleTrackStops}
          aria-expanded={trackStopsOpen}
          className="flex min-h-[40px] w-full cursor-pointer items-center justify-between px-3.5 py-2 font-medium text-[var(--foreground)]"
        >
          <span>Route stops ({navigationStops.length})</span>
          {trackStopsOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        {trackStopsOpen && (
          <ol className="t-panel-reveal divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] px-3.5 py-1">
            {navigationStops.map((item, idx) => (
              <li
                key={`${item.stop.id}-${idx}`}
                className={`flex items-center justify-between gap-2 py-2 ${
                  idx === navStepIndex
                    ? 'font-semibold text-[var(--accent)]'
                    : idx < navStepIndex
                      ? 'text-[var(--text-muted)] line-through'
                      : 'text-[var(--foreground)]'
                }`}
              >
                <span className="truncate">{item.stop.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
                  {item.routeCode}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button
        type="button"
        onClick={() => onReportIssue(currentNavItem?.routeCode)}
        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        <span>Report Issue</span>
      </button>
    </div>
  );
};
