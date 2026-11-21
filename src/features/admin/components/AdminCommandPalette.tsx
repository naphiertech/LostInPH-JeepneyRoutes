import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CornerDownLeft,
  Globe,
  Route,
  Search,
  X,
} from 'lucide-react';
import {
  CityId,
  CityInfo,
  CorridorAdvisory,
  JeepneyRoute,
} from '@/domain/transit/types';
import { ADMIN_NAV_GROUPS, AdminModuleId } from '../adminNavigation';

interface CommandItem {
  id: string;
  group: 'Modules' | 'Cities' | 'Routes' | 'Advisories';
  label: string;
  meta: string;
  onSelect: () => void;
}

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  cities: CityInfo[];
  routes: JeepneyRoute[];
  advisories: CorridorAdvisory[];
  onSelectModule: (id: AdminModuleId) => void;
  onSelectCity: (cityId: 'all' | CityId) => void;
  onInspectRoute: (route: JeepneyRoute) => void;
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  cities,
  routes,
  advisories,
  onSelectModule,
  onSelectCity,
  onInspectRoute,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const cityNameById = useMemo(
    () => new Map(cities.map((c) => [c.id, c.name])),
    [cities]
  );

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const results: CommandItem[] = [];

    for (const group of ADMIN_NAV_GROUPS) {
      for (const item of group.items) {
        if (
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        ) {
          results.push({
            id: `mod-${item.id}`,
            group: 'Modules',
            label: item.label,
            meta: item.groupTitle,
            onSelect: () => {
              onSelectModule(item.id);
              onClose();
            },
          });
        }
      }
    }

    if (!q || 'all 5 cities'.includes(q)) {
      results.push({
        id: 'city-all',
        group: 'Cities',
        label: 'Scope: All 5 Cities',
        meta: 'Global filter',
        onSelect: () => {
          onSelectCity('all');
          onClose();
        },
      });
    }

    for (const city of cities) {
      if (
        !q ||
        city.name.toLowerCase().includes(q) ||
        city.region.toLowerCase().includes(q)
      ) {
        results.push({
          id: `city-${city.id}`,
          group: 'Cities',
          label: `Filter city: ${city.name}`,
          meta: city.region,
          onSelect: () => {
            onSelectCity(city.id);
            onClose();
          },
        });
      }
    }

    for (const route of routes) {
      const cityName = cityNameById.get(route.cityId) ?? route.cityId;
      if (
        !q ||
        route.code.toLowerCase().includes(q) ||
        route.name.toLowerCase().includes(q) ||
        route.signboardText.toLowerCase().includes(q) ||
        route.stops.some((s) => s.name.toLowerCase().includes(q))
      ) {
        results.push({
          id: `route-${route.id}`,
          group: 'Routes',
          label: `${route.code} · ${route.name}`,
          meta: `${cityName} · ${route.stops.length} stops`,
          onSelect: () => {
            onInspectRoute(route);
            onClose();
          },
        });
      }
    }

    for (const adv of advisories) {
      if (
        adv.active &&
        (!q ||
          adv.title.toLowerCase().includes(q) ||
          adv.routeCode.toLowerCase().includes(q))
      ) {
        results.push({
          id: `adv-${adv.id}`,
          group: 'Advisories',
          label: `${adv.routeCode} · ${adv.title}`,
          meta: adv.severity,
          onSelect: () => {
            onSelectModule('incidents');
            onClose();
          },
        });
      }
    }

    return results.slice(0, 14);
  }, [
    query,
    cities,
    routes,
    advisories,
    cityNameById,
    onSelectModule,
    onSelectCity,
    onInspectRoute,
    onClose,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length === 0 ? 0 : (prev + 1) % items.length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          items.length === 0 ? 0 : (prev - 1 + items.length) % items.length
        );
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, items, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick jump command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] px-4 py-3">
          <Search
            className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to route (17C), stop, city, or module..."
            aria-label="Quick jump search"
            className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick jump"
            className="cursor-pointer rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-muted)]">
              No matching modules, routes, or cities.
            </div>
          ) : (
            <ul role="listbox" aria-label="Quick jump results" className="space-y-0.5">
              {items.map((item, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={item.onSelect}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                        isActive
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'text-[var(--foreground)] hover:bg-[var(--surface-raised)]'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {item.group === 'Routes' ? (
                          <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        ) : item.group === 'Advisories' ? (
                          <AlertTriangle
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate font-medium">{item.label}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <span>{item.meta}</span>
                        {isActive && (
                          <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]/60 px-4 py-2 text-[11px] text-[var(--text-muted)]">
          <span>↑↓ Navigate · Enter Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
