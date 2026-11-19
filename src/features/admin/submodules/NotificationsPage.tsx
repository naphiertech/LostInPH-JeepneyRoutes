import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  RotateCw,
  Trash2,
} from 'lucide-react';
import {
  NotificationCategory,
  ToneGlyph,
  useNotifications,
} from '../../../shared/ui/NotificationCenter';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    notify,
    refreshNotifications,
  } = useNotifications();

  const [categoryFilter, setCategoryFilter] = useState<
    'all' | NotificationCategory
  >('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const counts = useMemo(() => {
    const transitStore = notifications.filter(
      (n) => n.category === 'transit_store'
    ).length;
    const system = notifications.filter((n) => n.category === 'system').length;
    return {
      all: notifications.length,
      transit_store: transitStore,
      system,
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (unreadOnly && item.read) {
        return false;
      }
      return true;
    });
  }, [notifications, categoryFilter, unreadOnly]);

  return (
    <div className="space-y-5">
      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Notification center filter"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1"
          >
            {(
              [
                { id: 'all', label: 'All', count: counts.all },
                {
                  id: 'transit_store',
                  label: 'Transit & Store',
                  count: counts.transit_store,
                },
                { id: 'system', label: 'System', count: counts.system },
              ] as const
            ).map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--surface)] font-semibold text-[var(--foreground)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--text-muted)] tabular-nums">
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
            className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
              unreadOnly
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              notify({
                title: 'Google Play ₱199 settlement check passed',
                description:
                  'Live payout batch GPL-2026-PH verified with 15% Small Business fee tier.',
                category: 'transit_store',
                tone: 'success',
                tagLabel: '₱199.00 · Store Audit',
                tagColor: '#5D9B19',
              })
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
          >
            <Bell className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
            <span>Trigger sample toast</span>
          </button>

          <button
            type="button"
            onClick={refreshNotifications}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3.5 py-2 text-xs font-medium text-[var(--surface)] hover:opacity-90"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {/* Full Notification Feed */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              No notifications match the active filter.
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Actions across Store Analytics, Fare Matrices, and Commuter Triage stream here automatically as toasts.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className={`flex flex-col justify-between gap-3 rounded-[14px] border p-4 transition-colors sm:flex-row sm:items-start ${
                item.read
                  ? 'border-[var(--border)] bg-[var(--surface)]'
                  : 'border-[var(--accent)]/40 bg-[var(--accent-subtle)]/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <ToneGlyph tone={item.tone} />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">
                      {item.title}
                    </h2>
                    {!item.read && (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Unread
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                      {item.timestampLabel}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  )}

                  {item.tagLabel && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: item.tagColor ?? 'var(--accent)',
                          }}
                        />
                        <span>{item.tagLabel}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                  >
                    {item.actionLabel ?? 'Okay'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissNotification(item.id)}
                  aria-label={`Dismiss ${item.title}`}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Dismiss</span>
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
