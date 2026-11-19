import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BellOff,
  CheckCheck,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { CommuterNotificationPrefs } from '../../../adapters/browser/storage';
import {
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
} from '../../../domain/transit/types';
import {
  AppNotification,
  ToneGlyph,
  useNotifications,
} from '../../../shared/ui/NotificationCenter';

type CommuterFilter = 'all' | 'detours' | 'saved_routes' | 'fare_reports';

interface CommuterNotificationsViewProps {
  selectedCity: CityInfo;
  cityRoutes: JeepneyRoute[];
  activeAdvisories: CorridorAdvisory[];
  prefs: CommuterNotificationPrefs;
  onChangePrefs: (next: CommuterNotificationPrefs) => void;
  onBack: () => void;
  onOpenRouteByCode: (routeCode: string) => void;
}

function classifyNotification(
  item: AppNotification
): Exclude<CommuterFilter, 'all'> {
  if (item.kind === 'detour' || item.tone === 'danger') return 'detours';
  if (item.kind === 'saved_route') return 'saved_routes';
  if (item.kind === 'fare_report') return 'fare_reports';
  return item.category === 'transit_store' ? 'saved_routes' : 'fare_reports';
}

export const CommuterNotificationsView: React.FC<
  CommuterNotificationsViewProps
> = ({
  selectedCity,
  cityRoutes,
  activeAdvisories,
  prefs,
  onChangePrefs,
  onBack,
  onOpenRouteByCode,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<CommuterFilter>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const routeByCode = useMemo(() => {
    const map = new Map<string, JeepneyRoute>();
    for (const r of cityRoutes) {
      map.set(r.code.toUpperCase(), r);
    }
    return map;
  }, [cityRoutes]);

  const visibleAdvisories = useMemo(() => {
    if (!prefs.detours || unreadOnly) return [];
    if (filter !== 'all' && filter !== 'detours') return [];
    return activeAdvisories;
  }, [activeAdvisories, prefs.detours, unreadOnly, filter]);

  const enabledNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const bucket = classifyNotification(item);
      if (bucket === 'detours' && !prefs.detours) return false;
      if (bucket === 'saved_routes' && !prefs.savedRoutes) return false;
      if (bucket === 'fare_reports' && !prefs.fareAndReports) return false;
      return true;
    });
  }, [notifications, prefs]);

  const counts = useMemo(() => {
    let detours = prefs.detours ? activeAdvisories.length : 0;
    let savedRoutes = 0;
    let fareReports = 0;

    for (const item of enabledNotifications) {
      const bucket = classifyNotification(item);
      if (bucket === 'detours') detours += 1;
      else if (bucket === 'saved_routes') savedRoutes += 1;
      else fareReports += 1;
    }

    return {
      all: detours + savedRoutes + fareReports,
      detours,
      saved_routes: savedRoutes,
      fare_reports: fareReports,
    };
  }, [activeAdvisories.length, enabledNotifications, prefs.detours]);

  const filteredNotifications = useMemo(() => {
    return enabledNotifications.filter((item) => {
      if (filter !== 'all' && classifyNotification(item) !== filter) {
        return false;
      }
      if (unreadOnly && item.read) {
        return false;
      }
      return true;
    });
  }, [enabledNotifications, filter, unreadOnly]);

  const isSelectedCategoryMuted =
    (filter === 'detours' && !prefs.detours) ||
    (filter === 'saved_routes' && !prefs.savedRoutes) ||
    (filter === 'fare_reports' && !prefs.fareAndReports);

  const togglePref = (key: keyof CommuterNotificationPrefs) => {
    onChangePrefs({
      ...prefs,
      [key]: !prefs[key],
    });
  };

  return (
    <div className="t-panel-reveal flex flex-col gap-3.5 pb-2">
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back from notifications"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display truncate text-base font-bold text-[var(--foreground)]">
              Notifications
            </h1>
            <p className="truncate text-[11px] text-[var(--text-secondary)] tabular-nums">
              {selectedCity.name} · {unreadCount} unread
              {activeAdvisories.length > 0
                ? ` · ${activeAdvisories.length} live detour${activeAdvisories.length === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={refreshNotifications}
            aria-label="Sync commuter alerts"
            title="Sync alerts"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3 text-xs font-semibold text-[var(--surface)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Read all</span>
          </button>
        </div>
      </div>

      {/* Category Filter Strip + Unread Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Filter commuter notifications"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: 'all', label: 'All', count: counts.all },
              { id: 'detours', label: 'Detours', count: counts.detours },
              {
                id: 'saved_routes',
                label: 'Saved Routes',
                count: counts.saved_routes,
              },
              {
                id: 'fare_reports',
                label: 'Fare & Reports',
                count: counts.fare_reports,
              },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums ${
                    active
                      ? 'bg-white/20 text-[var(--surface)]'
                      : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setUnreadOnly((prev) => !prev)}
          aria-pressed={unreadOnly}
          className={`min-h-[34px] cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors tabular-nums ${
            unreadOnly
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Live City Advisories (Synced Live from Admin Incidents & Alerts) */}
      {visibleAdvisories.length > 0 && (
        <section aria-label={`Live ${selectedCity.name} corridor advisories`}>
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <h2 className="text-xs font-semibold text-[var(--foreground)]">
              Live corridor detours · {selectedCity.name}
            </h2>
            <span className="rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)] tabular-nums">
              {visibleAdvisories.length} active
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {visibleAdvisories.map((adv) => {
              const matchedRoute = routeByCode.get(adv.routeCode.toUpperCase());
              return (
                <article
                  key={adv.id}
                  className="rounded-2xl border border-[var(--peak)]/35 bg-[var(--peak-subtle)]/45 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--peak-subtle)] text-[var(--peak)]"
                        aria-hidden="true"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums"
                            style={{
                              backgroundColor:
                                matchedRoute?.color ?? '#EA580C',
                            }}
                          >
                            {adv.routeCode}
                          </span>
                          <span className="rounded-full bg-[var(--peak)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--peak)]">
                            {adv.severity}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                            {adv.reportedAt}
                          </span>
                        </div>
                        <h3 className="mt-1 text-xs font-semibold text-[var(--foreground)]">
                          {adv.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {adv.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {matchedRoute && (
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenRouteByCode(matchedRoute.code)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
                      >
                        <span>View {matchedRoute.code} route</span>
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Muted Category Callout */}
      {isSelectedCategoryMuted ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]/40 px-4 py-7 text-center">
          <BellOff
            className="h-5 w-5 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <p className="text-xs font-semibold text-[var(--foreground)]">
            This alert channel is currently muted
          </p>
          <p className="max-w-xs text-[11px] text-[var(--text-secondary)]">
            Turn it back on in Alert Preferences below to see these commuter updates here.
          </p>
          <button
            type="button"
            onClick={() => {
              if (filter === 'detours') togglePref('detours');
              else if (filter === 'saved_routes') togglePref('savedRoutes');
              else if (filter === 'fare_reports') togglePref('fareAndReports');
            }}
            className="mt-1 cursor-pointer rounded-xl bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Turn channel on
          </button>
        </div>
      ) : filteredNotifications.length === 0 &&
        visibleAdvisories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-raised)]/40 px-4 py-8 text-center">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            {unreadOnly
              ? 'No unread notifications right now.'
              : `Route updates, fare changes, and field report receipts for ${selectedCity.name} appear here.`}
          </p>
        </div>
      ) : (
        filteredNotifications.length > 0 && (
          <section aria-label="Commuter activity feed" className="space-y-2">
            {visibleAdvisories.length > 0 && (
              <h2 className="px-0.5 text-xs font-semibold text-[var(--foreground)]">
                Recent updates
              </h2>
            )}
            {filteredNotifications.map((item) => {
              const matchedRoute = item.routeCode
                ? routeByCode.get(item.routeCode.toUpperCase())
                : undefined;
              return (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-3.5 transition-colors ${
                    item.read
                      ? 'border-[var(--border)] bg-[var(--surface)]'
                      : 'border-[var(--accent)]/40 bg-[var(--accent-subtle)]/20'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <ToneGlyph tone={item.tone} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <h3 className="text-xs font-semibold text-[var(--foreground)]">
                            {item.title}
                          </h3>
                          {!item.read && (
                            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.2 text-[9px] font-bold text-white">
                              New
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-[var(--text-muted)] tabular-nums">
                          {item.timestampLabel}
                        </span>
                      </div>

                      {item.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        {item.tagLabel ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  item.tagColor ?? 'var(--accent)',
                              }}
                            />
                            <span>{item.tagLabel}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-1.5">
                          {matchedRoute && (
                            <button
                              type="button"
                              onClick={() => {
                                markAsRead(item.id);
                                onOpenRouteByCode(matchedRoute.code);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                            >
                              <span>Open {matchedRoute.code}</span>
                              <ArrowUpRight
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                            </button>
                          )}
                          {!item.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(item.id)}
                              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => dismissNotification(item.id)}
                            aria-label={`Dismiss ${item.title}`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )
      )}

      {/* Persisted Commuter Alert Preferences */}
      <section
        aria-label="Alert preferences"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
      >
        <div className="mb-2.5 flex items-center gap-2">
          <SlidersHorizontal
            className="h-3.5 w-3.5 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold text-[var(--foreground)]">
            Alert preferences
          </h2>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {(
            [
              {
                key: 'detours',
                label: 'Corridor detours & advisories',
                hint: `Live roadwork & reroute alerts in ${selectedCity.name}`,
              },
              {
                key: 'savedRoutes',
                label: 'Saved route updates',
                hint: 'Headway & stop changes on bookmarked corridors',
              },
              {
                key: 'fareAndReports',
                label: 'Fare pass & field reports',
                hint: 'LTFRB fare rule syncs and submitted tip receipts',
              },
            ] as const
          ).map((pref) => {
            const enabled = prefs[pref.key];
            return (
              <div
                key={pref.key}
                className="flex min-h-[48px] items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-[var(--foreground)]">
                    {pref.label}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {pref.hint}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={pref.label}
                  onClick={() => togglePref(pref.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    enabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform ${
                      enabled ? 'translate-x-[22px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
