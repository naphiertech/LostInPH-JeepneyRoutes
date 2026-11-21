import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AccountRole, AuthUser } from '@/domain/auth/types';
import { AppAdoptionSnapshot } from '@/domain/telemetry/presencePort';
import { CityInfo } from '@/domain/transit/types';
import { KpiMetric } from '@/shared/ui/KpiMetric';
import { ResponsiveTable } from '@/shared/ui/ResponsiveTable';

interface UsersDirectoryPageProps {
  cities: CityInfo[];
  accounts: AuthUser[];
  adoption: AppAdoptionSnapshot;
}

export const UsersDirectoryPage: React.FC<UsersDirectoryPageProps> = ({
  cities,
  accounts: initialAccounts,
  adoption,
}) => {
  const [accounts, setAccounts] = useState<AuthUser[]>(initialAccounts);
  const [roleFilter, setRoleFilter] = useState<'all' | AccountRole>('all');
  const [presenceFilter, setPresenceFilter] = useState<
    'all' | 'online' | 'offline'
  >('all');
  const [query, setQuery] = useState('');

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (roleFilter !== 'all' && acc.role !== roleFilter) return false;
      if (presenceFilter === 'online' && !acc.isOnline) return false;
      if (presenceFilter === 'offline' && acc.isOnline) return false;
      if (!q) return true;
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.badgeLabel.toLowerCase().includes(q)
      );
    });
  }, [accounts, roleFilter, presenceFilter, query]);

  const onlineDirectoryCount = useMemo(
    () => accounts.filter((a) => a.isOnline).length,
    [accounts]
  );

  const approveAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: 'active' } : acc))
    );
  };

  return (
    <div className="space-y-5">
      {/* Live User Adoption & Presence Summary */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiMetric
          label="Total app downloads"
          value={adoption.totalDownloads.toLocaleString('en-PH')}
          deltaLabel="Android + iOS + Web"
          deltaTone="positive"
        />
        <KpiMetric
          label="Online commuters now"
          value={adoption.onlineNow.toLocaleString('en-PH')}
          deltaLabel={`${onlineDirectoryCount}/${accounts.length} directory live`}
          deltaTone="positive"
        />
        <KpiMetric
          label="Registered accounts"
          value={accounts.length}
          helperText={`${accounts.filter((a) => a.role === 'app').length} commuters · ${accounts.filter((a) => a.role === 'admin').length} operators`}
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['all', 'All roles'],
              ['app', 'Commuters'],
              ['admin', 'Admins'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(key)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                roleFilter === key
                  ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--surface)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-[var(--border)]" aria-hidden="true" />

          {(
            [
              ['all', 'All presence'],
              ['online', 'Online now'],
              ['offline', 'Offline'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPresenceFilter(key)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${
                presenceFilter === key
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[210px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email..."
            aria-label="Search accounts"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pr-3 pl-8 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      <ResponsiveTable
        ariaLabel="LostInPH registered users and live presence directory"
        columnLabels={{
          2: 'Email',
          3: 'Presence',
          4: 'Platform',
          5: 'Home City',
          6: 'Role',
          7: 'Rides',
          8: 'Status',
        }}
      >
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Email</th>
            <th scope="col">Presence</th>
            <th scope="col">Platform</th>
            <th scope="col">Home City</th>
            <th scope="col">Role</th>
            <th scope="col" className="text-right">
              Rides
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((acc) => {
            const city = cityById.get(acc.homeCity);
            const platform = acc.platform ?? 'web';
            return (
              <tr key={acc.id}>
                <th scope="row">
                  <div className="text-xs font-semibold text-[var(--foreground)]">
                    {acc.name}
                  </div>
                  <div className="text-[11px] font-normal text-[var(--text-muted)]">
                    {acc.badgeLabel}
                  </div>
                </th>
                <td className="font-mono text-xs text-[var(--text-secondary)]">
                  {acc.email}
                </td>
                <td>
                  {acc.isOnline ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--success)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
                      <span>{acc.lastSeenLabel ?? 'Offline'}</span>
                    </span>
                  )}
                </td>
                <td className="text-xs text-[var(--text-secondary)]">
                  {platform === 'android'
                    ? 'Android'
                    : platform === 'ios'
                      ? 'iOS'
                      : 'Web'}
                </td>
                <td className="text-xs text-[var(--text-secondary)]">
                  {city?.name ?? acc.homeCity}
                </td>
                <td>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      acc.role === 'admin'
                        ? 'border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)]'
                    }`}
                  >
                    {acc.role === 'admin' ? 'Admin' : 'Commuter'}
                  </span>
                </td>
                <td className="tabular-nums text-right text-xs">
                  {acc.tripsCompleted}
                </td>
                <td>
                  {acc.status === 'active' ? (
                    <span className="inline-flex rounded-full border border-[var(--success)]/30 bg-[var(--success-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => approveAccount(acc.id)}
                      className="cursor-pointer rounded-full border border-[var(--peak)]/35 bg-[var(--peak-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--peak)] hover:opacity-85"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </ResponsiveTable>
    </div>
  );
};
