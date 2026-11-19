import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCw,
  X,
} from 'lucide-react';

export type NotificationScope = 'admin' | 'commuter';
export type NotificationCategory = 'transit_store' | 'system';
export type NotificationKind = 'detour' | 'saved_route' | 'fare_report' | 'system';
export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  category: NotificationCategory;
  kind?: NotificationKind;
  tone: NotificationTone;
  routeCode?: string;
  tagLabel?: string;
  tagColor?: string;
  timestampLabel: string;
  read: boolean;
  expandable?: boolean;
  actionLabel?: string;
}

export interface PushToastInput {
  title: string;
  description?: string;
  category?: NotificationCategory;
  kind?: NotificationKind;
  tone?: NotificationTone;
  routeCode?: string;
  tagLabel?: string;
  tagColor?: string;
  actionLabel?: string;
}

interface NotificationContextValue {
  scope: NotificationScope;
  notifications: AppNotification[];
  unreadCount: number;
  activeToasts: AppNotification[];
  notify: (input: PushToastInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  dismissToast: (id: string) => void;
  refreshNotifications: () => void;
}

const ADMIN_INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-12l-detour',
    title: 'Detour advisory active on 12L',
    description:
      'V. Rama Ave drainage works near Guadalupe Church remain active. Commuter route cards and pinpoint sheets now reflect the +8 min bypass.',
    category: 'transit_store',
    tone: 'danger',
    tagLabel: '12L · Labangon – Ayala',
    tagColor: '#EA580C',
    timestampLabel: '18m ago',
    read: false,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'notif-play-batch',
    title: 'Google Play Store · +18 paid downloads',
    description:
      'Settled ₱3,582.00 gross (₱3,044.70 net after 15% Small Business fee) from Cebu & Metro Manila Android commuters.',
    category: 'transit_store',
    tone: 'success',
    tagLabel: '₱199.00 · Android AAB',
    tagColor: '#5D9B19',
    timestampLabel: '2h ago',
    read: false,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'notif-17c-verified',
    title: '17C Apas – Carbon Market corridor verified',
    description:
      'OSRM road-snapped polyline (142 GPS vertices) and LTFRB MC 2023-038 base fare synced.',
    category: 'transit_store',
    tone: 'info',
    tagLabel: '17C · Cebu City',
    tagColor: '#0D9488',
    timestampLabel: '4h ago',
    read: false,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'notif-fare-matrix',
    title: 'LTFRB fare matrix audit completed',
    description:
      'Traditional PUJ (₱13.00 base) and Modern PUV (₱15.00 base) verified with 20% student/senior rounding.',
    category: 'system',
    tone: 'info',
    tagLabel: 'Fare Matrix · 5 Cities',
    tagColor: '#2563EB',
    timestampLabel: '6h ago',
    read: true,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'notif-rep-204',
    title: 'Field report REP-204 queued for review',
    description:
      'Commuter flagged updated loading bay signage along Alabang – Lawton corridor.',
    category: 'transit_store',
    tone: 'warning',
    tagLabel: '102 · Metro Manila',
    tagColor: '#D97706',
    timestampLabel: '12h ago',
    read: true,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'notif-osrm-sync',
    title: 'Road-snapped route geometry cache updated',
    description:
      'All 18 jeepney corridors across Cebu, Manila, Baguio, Davao, and CDO passed coordinate validation.',
    category: 'system',
    tone: 'success',
    tagLabel: 'System Sync · Completed',
    tagColor: '#15803D',
    timestampLabel: '20h ago',
    read: true,
    expandable: false,
  },
];

const COMMUTER_INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'commuter-17c-verified',
    title: '17C Apas – Carbon Market stops verified',
    description:
      'Updated boarding bay landmarks at Cebu IT Park and Fuente Osmeña Circle are live for your saved 17C corridor.',
    category: 'transit_store',
    kind: 'saved_route',
    tone: 'success',
    routeCode: '17C',
    tagLabel: '17C · Saved route',
    tagColor: '#5D9B19',
    timestampLabel: '24m ago',
    read: false,
    expandable: true,
    actionLabel: 'Got it',
  },
  {
    id: 'commuter-04l-headway',
    title: '04L Modern PUV running steady 5–8 min headways',
    description:
      'Aircon units along Lahug – JY Square – SM City Cebu are operating on normal midday spacing.',
    category: 'transit_store',
    kind: 'saved_route',
    tone: 'info',
    routeCode: '04L',
    tagLabel: '04L · Modern PUV',
    tagColor: '#0D9488',
    timestampLabel: '1h ago',
    read: false,
    expandable: true,
    actionLabel: 'Got it',
  },
  {
    id: 'commuter-fare-matrix',
    title: 'LTFRB base fares synced for your Fare Pass',
    description:
      'Traditional PUJ (₱13.00 base) and Modern PUV (₱15.00 base) fares reflect automatic 20% Student / Senior / PWD discounts.',
    category: 'system',
    kind: 'fare_report',
    tone: 'info',
    tagLabel: 'LTFRB Fare Matrix',
    tagColor: '#2563EB',
    timestampLabel: '4h ago',
    read: true,
    expandable: true,
    actionLabel: 'Okay',
  },
  {
    id: 'commuter-13c-tip',
    title: 'Your landmark update on 13C was received',
    description:
      'Thanks for helping fellow commuters — Talamban (USC-TC) loading bay notes are queued for verification.',
    category: 'system',
    kind: 'fare_report',
    tone: 'success',
    routeCode: '13C',
    tagLabel: '13C · Field report',
    tagColor: '#EA580C',
    timestampLabel: 'Yesterday',
    read: true,
    expandable: true,
    actionLabel: 'Okay',
  },
];

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function ToneGlyph({
  tone,
  size = 'md',
}: {
  tone: NotificationTone;
  size?: 'sm' | 'md';
}) {
  const boxClass = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (tone === 'success') {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--success-subtle)] text-[var(--success)] ${boxClass}`}
        aria-hidden="true"
      >
        <CheckCircle2 className={iconClass} />
      </span>
    );
  }
  if (tone === 'danger') {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--danger-subtle)] text-[var(--danger)] ${boxClass}`}
        aria-hidden="true"
      >
        <AlertCircle className={iconClass} />
      </span>
    );
  }
  if (tone === 'warning') {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--peak-subtle)] text-[var(--peak)] ${boxClass}`}
        aria-hidden="true"
      >
        <AlertTriangle className={iconClass} />
      </span>
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 ${boxClass}`}
      aria-hidden="true"
    >
      <Info className={iconClass} />
    </span>
  );
}

export const NotificationProvider: React.FC<{
  children: React.ReactNode;
  scope?: NotificationScope;
}> = ({ children, scope = 'admin' }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    scope === 'commuter'
      ? COMMUTER_INITIAL_NOTIFICATIONS
      : ADMIN_INITIAL_NOTIFICATIONS
  );
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (input: PushToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: AppNotification = {
        id,
        title: input.title,
        description: input.description,
        category: input.category ?? 'system',
        kind: input.kind,
        tone: input.tone ?? 'success',
        routeCode: input.routeCode,
        tagLabel: input.tagLabel,
        tagColor: input.tagColor,
        timestampLabel: 'Just now',
        read: false,
        expandable: Boolean(input.description),
        actionLabel: input.actionLabel ?? 'Okay',
      };

      setNotifications((prev) => [item, ...prev].slice(0, 40));
      setActiveToasts((prev) => [item, ...prev].slice(0, 3));

      const timer = window.setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 4200);
      timersRef.current.set(id, timer);
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const dismissNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      dismissToast(id);
    },
    [dismissToast]
  );

  const refreshNotifications = useCallback(() => {
    if (scope === 'commuter') {
      notify({
        title: 'Commuter alerts synced',
        description:
          'Active corridor detours, saved route headways, and LTFRB fare rules are up to date.',
        category: 'system',
        kind: 'fare_report',
        tone: 'info',
        tagLabel: 'Live Sync',
        tagColor: '#5D9B19',
      });
      return;
    }
    notify({
      title: 'Feed synced with LostInPH telemetry',
      description: 'Store receipts, LTFRB corridor audits, and commuter reports are up to date.',
      category: 'system',
      tone: 'info',
      tagLabel: 'Live Sync',
      tagColor: '#5D9B19',
    });
  }, [notify, scope]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      scope,
      notifications,
      unreadCount,
      activeToasts,
      notify,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      dismissToast,
      refreshNotifications,
    }),
    [
      scope,
      notifications,
      unreadCount,
      activeToasts,
      notify,
      markAsRead,
      markAllAsRead,
      dismissNotification,
      dismissToast,
      refreshNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Global Floating Toast Stack (replaces inline status pop-ups/banners) */}
      {activeToasts.length > 0 && (
        <div
          aria-label="Live notification toasts"
          className="pointer-events-none fixed right-4 bottom-20 z-[650] flex w-[calc(100vw-2rem)] max-w-[380px] flex-col gap-2 lg:bottom-4"
        >
          {activeToasts.map((toast, idx) => {
            const isNewest = idx === 0;
            return (
              <div
                key={toast.id}
                role={isNewest ? 'status' : undefined}
                aria-live={isNewest ? 'polite' : undefined}
                className="t-panel-reveal pointer-events-auto flex items-start gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
              >
                <ToneGlyph tone={toast.tone} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      {toast.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => dismissToast(toast.id)}
                      aria-label="Dismiss toast"
                      className="shrink-0 cursor-pointer rounded-md p-0.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {toast.description && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                      {toast.description}
                    </p>
                  )}

                  {toast.tagLabel && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: toast.tagColor ?? 'var(--accent)',
                        }}
                      />
                      <span>{toast.tagLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used inside <NotificationProvider>'
    );
  }
  return ctx;
}

interface NotificationBellPopoverProps {
  onOpenNotificationCenter?: () => void;
  onSelectRouteCode?: (routeCode: string) => void;
  compact?: boolean;
  isActive?: boolean;
  advisoryCount?: number;
}

export const NotificationBellPopover: React.FC<NotificationBellPopoverProps> = ({
  onOpenNotificationCenter,
  onSelectRouteCode,
  compact = false,
  isActive = false,
  advisoryCount = 0,
}) => {
  const {
    scope,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | NotificationCategory>(
    'all'
  );
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(
    (): Record<string, boolean> =>
      scope === 'commuter'
        ? { 'commuter-17c-verified': true }
        : { 'notif-12l-detour': true }
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

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

  const visibleItems = useMemo(() => {
    if (filterTab === 'all') return notifications;
    return notifications.filter((n) => n.category === filterTab);
  }, [notifications, filterTab]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`relative inline-flex cursor-pointer items-center justify-center rounded-full transition-colors ${
          compact
            ? `h-9 w-9 ${
                isOpen || isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-[var(--accent)]/40'
                  : 'text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
              }`
            : `h-9 gap-1.5 border px-2.5 lg:rounded-lg ${
                isOpen || isActive
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
              }`
        }`}
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!compact && (
          <span className="hidden text-xs font-medium sm:inline">Alerts</span>
        )}
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className={
              compact
                ? 'absolute top-0.5 right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--surface)] tabular-nums'
                : 'inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 py-0.2 text-[10px] font-bold text-white tabular-nums'
            }
          >
            {unreadCount}
          </span>
        )}
        {compact && advisoryCount > 0 && (
          <span
            aria-label={`${advisoryCount} corridor alert`}
            className="absolute bottom-1 left-1 h-2 w-2 rounded-full bg-[var(--peak)] ring-2 ring-[var(--surface)]"
          />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="t-panel-reveal fixed top-14 right-3 z-[620] flex w-[calc(100vw-1.5rem)] max-w-[390px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_42px_rgba(15,23,42,0.16)] sm:absolute sm:top-11 sm:right-0 sm:w-[385px]"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] tabular-nums">
                  {unreadCount} new
                </span>
              )}
              {advisoryCount > 0 && (
                <span className="rounded-full bg-[var(--peak-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--peak)] tabular-nums">
                  {advisoryCount} detour
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={refreshNotifications}
              aria-label="Sync notifications"
              title="Sync feed"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Segmented Tabs (Admin: All / Transit & Store / System · Commuter: All / Alerts / Updates) */}
          <div
            role="tablist"
            aria-label="Filter notification category"
            className="flex items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]/60 px-3 py-2"
          >
            {(
              [
                { id: 'all', label: 'All', count: counts.all },
                {
                  id: 'transit_store',
                  label: scope === 'commuter' ? 'Alerts' : 'Transit & Store',
                  count: counts.transit_store,
                },
                {
                  id: 'system',
                  label: scope === 'commuter' ? 'Updates' : 'System',
                  count: counts.system,
                },
              ] as const
            ).map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilterTab(tab.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border border-[var(--border)] bg-[var(--surface)] font-semibold text-[var(--foreground)]'
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

          {/* Notification Stack */}
          <div className="max-h-[340px] space-y-2 overflow-y-auto p-3">
            {visibleItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-xs text-[var(--text-muted)]">
                All caught up in this category.
              </div>
            ) : (
              visibleItems.map((item) => {
                const isExpanded = Boolean(expandedIds[item.id]);
                const canExpand = Boolean(item.description);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      item.read
                        ? 'border-[var(--border)] bg-[var(--surface)]'
                        : 'border-[var(--accent)]/35 bg-[var(--accent-subtle)]/20'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <ToneGlyph tone={item.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              markAsRead(item.id);
                              if (canExpand) toggleExpand(item.id);
                            }}
                            className="cursor-pointer text-left text-xs font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
                          >
                            {item.title}
                          </button>

                          <div className="flex shrink-0 items-center gap-0.5">
                            {canExpand && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(item.id)}
                                aria-label={
                                  isExpanded
                                    ? `Collapse details for ${item.title}`
                                    : `Expand details for ${item.title}`
                                }
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
                              >
                                {isExpanded ? (
                                  <ChevronUp
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ChevronDown
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => dismissNotification(item.id)}
                              aria-label={`Remove notification ${item.title}`}
                              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--danger)]"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && item.description && (
                          <div className="mt-2 space-y-2">
                            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                              {item.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.routeCode && onSelectRouteCode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    markAsRead(item.id);
                                    setIsOpen(false);
                                    onSelectRouteCode(item.routeCode!);
                                  }}
                                  className="cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                                >
                                  Open {item.routeCode}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  markAsRead(item.id);
                                  toggleExpand(item.id);
                                }}
                                className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                              >
                                {item.actionLabel ?? 'Okay'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
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
                          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                            {item.timestampLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2.5">
            <button
              type="button"
              onClick={markAllAsRead}
              className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Mark all as read
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenNotificationCenter) {
                  onOpenNotificationCenter();
                } else {
                  markAllAsRead();
                }
              }}
              className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
            >
              {onOpenNotificationCenter
                ? 'Go to notification center'
                : 'Done viewing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
