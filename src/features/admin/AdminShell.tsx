import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { AuthUser } from '../../domain/auth/types';
import { CityId, CityInfo } from '../../domain/transit/types';
import { LostInPhLogo } from '../../shared/ui/LostInPhLogo';
import { NotificationBellPopover } from '../../shared/ui/NotificationCenter';
import {
  ADMIN_NAV_GROUPS,
  AdminModuleId,
  findAdminNavItem,
} from './adminNavigation';

interface AdminShellProps {
  activeModule: AdminModuleId;
  onSelectModule: (id: AdminModuleId) => void;
  cities: CityInfo[];
  globalCityFilter: 'all' | CityId;
  onChangeGlobalCity: (city: 'all' | CityId) => void;
  currentUser: AuthUser;
  onSignOut: () => void;
  badges: Partial<Record<AdminModuleId, number | string>>;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  activeModule,
  onSelectModule,
  cities,
  globalCityFilter,
  onChangeGlobalCity,
  currentUser,
  onSignOut,
  badges,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_NAV_GROUPS.map((g) => [g.id, g.defaultOpen]))
  );

  const currentNav = findAdminNavItem(activeModule);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelectItem = (id: AdminModuleId) => {
    onSelectModule(id);
    setMobileOpen(false);
  };

  const renderSidebarBody = (isDrawer: boolean) => {
    const compact = sidebarCollapsed && !isDrawer;
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          {/* Product Header */}
          <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <LostInPhLogo size="sm" theme="darkTile" />
              {!compact && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-tight text-[var(--foreground)]">
                    LostInPH
                  </div>
                  <div className="truncate text-[11px] text-[var(--text-muted)]">
                    Transit Operations
                  </div>
                </div>
              )}
            </div>

            {isDrawer ? (
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="cursor-pointer rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden cursor-pointer rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] lg:inline-flex"
              >
                {compact ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Nav Groups & Sub-Modules */}
          <nav
            aria-label="Admin sidebar navigation"
            className="space-y-4 px-2.5 py-4"
          >
            {ADMIN_NAV_GROUPS.map((group) => {
              const isOpen = openGroups[group.id] ?? true;
              return (
                <div key={group.id}>
                  {!compact && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="mb-1 flex w-full cursor-pointer items-center justify-between px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--foreground)]"
                    >
                      <span>{group.title}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          isOpen ? '' : '-rotate-90'
                        }`}
                      />
                    </button>
                  )}

                  {(isOpen || compact) && (
                    <ul className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = item.id === activeModule;
                        const badgeVal = badges[item.id];
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectItem(item.id)}
                              title={compact ? item.label : undefined}
                              aria-current={active ? 'page' : undefined}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                                active
                                  ? 'bg-[var(--surface-raised)] font-medium text-[var(--foreground)]'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]/65 hover:text-[var(--foreground)]'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <Icon
                                  className={`h-4 w-4 shrink-0 ${
                                    active
                                      ? 'text-[var(--accent)]'
                                      : 'text-[var(--text-muted)]'
                                  }`}
                                  aria-hidden="true"
                                />
                                {!compact && (
                                  <span className="truncate">{item.label}</span>
                                )}
                              </span>

                              {!compact &&
                                badgeVal !== undefined &&
                                Number(badgeVal) !== 0 && (
                                  <span className="ml-2 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--foreground)]">
                                    {badgeVal}
                                  </span>
                                )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Operator Profile & Sign Out */}
        <div className="border-t border-[var(--border)] p-3">
          {!compact && (
            <div className="mb-2.5 flex items-center gap-2.5 px-1.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-xs font-semibold text-[var(--accent)]">
                {currentUser.avatarInitials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-[var(--foreground)]">
                  {currentUser.name}
                </div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">
                  Admin console
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSignOut}
            title={compact ? 'Sign out' : undefined}
            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--danger)]/40 hover:text-[var(--danger)] ${
              compact ? 'justify-center' : 'justify-between'
            }`}
          >
            {!compact && <span>Sign out</span>}
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-dvh w-full bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop Neutral Sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-150 lg:block ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[252px]'
        }`}
      >
        <div className="sticky top-0 h-dvh overflow-y-auto">
          {renderSidebarBody(false)}
        </div>
      </aside>

      {/* Mobile Slide-Over Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/35"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[272px] max-w-[85vw] border-r border-[var(--border)] bg-[var(--surface)] shadow-xl">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}

      {/* Main Operations Sheet */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur-xs lg:h-14 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] lg:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
              <span className="hidden text-[var(--text-muted)] sm:inline">
                {currentNav.groupTitle}
              </span>
              <span className="hidden text-[var(--text-muted)] sm:inline">
                ›
              </span>
              <span className="truncate font-semibold text-[var(--foreground)]">
                {currentNav.label}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationBellPopover
              onOpenNotificationCenter={() => onSelectModule('notifications')}
            />

            <label htmlFor="admin-global-city" className="visually-hidden">
              Scope dashboard to city
            </label>
            <select
              id="admin-global-city"
              value={globalCityFilter}
              onChange={(e) =>
                onChangeGlobalCity(e.target.value as 'all' | CityId)
              }
              className="max-w-[104px] cursor-pointer truncate rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs font-medium text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none sm:max-w-none sm:px-2.5"
            >
              <option value="all">All 5 Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] lg:hidden"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-5 sm:px-6 lg:py-6">
          <div className="mb-5 border-b border-[var(--border-subtle)] pb-4">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
              {currentNav.label}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {currentNav.description}
            </p>
          </div>

          <div key={activeModule} className="t-panel-reveal">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
