import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import {
  AuditCategory,
  AuditLogEntry,
  CityId,
  CityInfo,
} from '@/domain/transit/types';
import { useNotifications } from '@/shared/ui/NotificationCenter';
import { ResponsiveTable } from '@/shared/ui/ResponsiveTable';

interface AuditLogPageProps {
  cities: CityInfo[];
  auditLogs: AuditLogEntry[];
  globalCityFilter: 'all' | CityId;
}

const CATEGORY_STYLES: Record<AuditCategory, string> = {
  route: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  advisory: 'bg-[var(--danger-subtle)] text-[var(--danger)]',
  report: 'bg-[var(--peak-subtle)] text-[var(--peak)]',
  system: 'bg-[var(--surface-raised)] text-[var(--text-secondary)]',
};

export const AuditLogPage: React.FC<AuditLogPageProps> = ({
  cities,
  auditLogs,
  globalCityFilter,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>(
    'all'
  );
  const [query, setQuery] = useState('');
  const { notify } = useNotifications();

  const cityNameById = useMemo(
    () => new Map(cities.map((c) => [c.id, c.name])),
    [cities]
  );

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return auditLogs.filter((entry) => {
      if (
        globalCityFilter !== 'all' &&
        entry.cityId &&
        entry.cityId !== 'all' &&
        entry.cityId !== globalCityFilter
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.target.toLowerCase().includes(q) ||
        entry.actorName.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q)
      );
    });
  }, [auditLogs, globalCityFilter, categoryFilter, query]);

  const handleExport = (format: 'csv' | 'json') => {
    const content =
      format === 'json'
        ? JSON.stringify(filteredLogs, null, 2)
        : [
            'id,timestamp,actorName,actorRole,category,action,target,cityId,details',
            ...filteredLogs.map((row) =>
              [
                row.id,
                row.timestamp,
                row.actorName,
                row.actorRole,
                row.category,
                row.action,
                row.target,
                row.cityId ?? 'all',
                row.details,
              ]
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(',')
            ),
          ].join('\n');

    try {
      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lostinph-audit-log.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Test environment fallback
    }

    notify({
      title: `Exported ${filteredLogs.length} audit log row(s) (${format.toUpperCase()})`,
      category: 'system',
      tone: 'success',
      tagLabel: 'Audit Export',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, route code, action..."
              aria-label="Search audit log"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pr-3 pl-9 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'route', 'advisory', 'report', 'system'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-xs font-medium capitalize ${
                    categoryFilter === cat
                      ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      <ResponsiveTable
        ariaLabel="LostInPH operator and commuter audit log"
        columnLabels={{
          2: 'Actor',
          3: 'Category',
          4: 'Action & Details',
          5: 'Target',
          6: 'City',
        }}
      >
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Actor</th>
            <th scope="col">Category</th>
            <th scope="col">Action &amp; Details</th>
            <th scope="col">Target</th>
            <th scope="col">City</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map((entry) => (
            <tr key={entry.id}>
              <th scope="row" className="font-mono text-[11px] font-medium">
                {entry.timestamp}
              </th>
              <td className="text-xs">
                <div className="font-medium text-[var(--foreground)]">
                  {entry.actorName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  {entry.actorRole}
                </div>
              </td>
              <td>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                    CATEGORY_STYLES[entry.category]
                  }`}
                >
                  {entry.category}
                </span>
              </td>
              <td className="text-xs">
                <div className="font-medium text-[var(--foreground)]">
                  {entry.action}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  {entry.details}
                </div>
              </td>
              <td className="font-mono text-xs font-semibold text-[var(--foreground)]">
                {entry.target}
              </td>
              <td className="text-xs text-[var(--text-secondary)]">
                {!entry.cityId || entry.cityId === 'all'
                  ? 'All Cities'
                  : cityNameById.get(entry.cityId) ?? entry.cityId}
              </td>
            </tr>
          ))}
          {filteredLogs.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="py-10 text-center text-xs text-[var(--text-muted)]"
              >
                No activity matches this filter.
              </td>
            </tr>
          )}
        </tbody>
      </ResponsiveTable>
    </div>
  );
};
