import React from 'react';
import { Compass, Home, Navigation, Route, User } from 'lucide-react';

export type CommuterTab = 'home' | 'explore' | 'planner' | 'navigate' | 'profile';

interface BottomNavDockProps {
  activeTab: CommuterTab | null;
  onTabChange: (tab: CommuterTab) => void;
  advisoryCount?: number;
}

const NAV_ITEMS: ReadonlyArray<{
  id: CommuterTab;
  label: string;
  icon: typeof Compass;
}> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'explore', label: 'Routes', icon: Compass },
  { id: 'planner', label: 'Plan', icon: Route },
  { id: 'navigate', label: 'Track', icon: Navigation },
  { id: 'profile', label: 'Profile', icon: User },
];

/**
 * Single-DOM responsive navigation: floating dark 5-tab bottom dock on mobile (< lg)
 * and inline light/adaptive segmented pill bar inside the desktop sheet (lg+).
 */
export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  advisoryCount = 0,
}) => {
  return (
    <nav
      aria-label="Commuter navigation"
      className="fixed bottom-3 left-1/2 z-[500] w-[calc(100%-20px)] max-w-[404px] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111827] p-1.5 shadow-lg lg:static lg:z-auto lg:w-full lg:max-w-none lg:translate-x-0 lg:border-[var(--border)] lg:bg-[var(--surface-raised)] lg:p-1 lg:shadow-none"
    >
      <div
        role="tablist"
        aria-label="Commuter tools"
        className="grid grid-cols-5 gap-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onTabChange(item.id)}
              className={`relative flex min-h-[46px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors lg:min-h-[38px] lg:flex-row lg:gap-1 lg:px-1 lg:text-[11px] ${
                active
                  ? 'bg-white text-[#111827] lg:bg-[var(--surface)] lg:text-[var(--foreground)] lg:ring-1 lg:ring-[var(--border)]'
                  : 'text-[#D1D5DB] hover:text-white lg:text-[var(--text-secondary)] lg:hover:text-[var(--foreground)]'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 lg:h-3.5 lg:w-3.5 ${
                  active ? 'lg:text-[var(--accent)]' : ''
                }`}
                aria-hidden="true"
              />
              <span className="whitespace-nowrap">{item.label}</span>
              {item.id === 'profile' && advisoryCount > 0 && (
                <span
                  aria-label={`${advisoryCount} city alerts`}
                  className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-[#FB923C] lg:top-1.5 lg:right-1.5"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
