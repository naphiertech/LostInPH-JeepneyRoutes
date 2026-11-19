import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AccountRole, AuthUser } from '../../../domain/auth/types';
import { CityInfo } from '../../../domain/transit/types';
import { ResponsiveTable } from '../../../shared/ui/ResponsiveTable';

interface UsersDirectoryPageProps {
  cities: CityInfo[];
  accounts: AuthUser[];
}

export const UsersDirectoryPage: React.FC<UsersDirectoryPageProps> = ({
  cities,
  accounts: initialAccounts,
}) => {
  const [accounts, setAccounts] = useState<AuthUser[]>(initialAccounts);
  const [roleFilter, setRoleFilter] = useState<'all' | AccountRole>('all');
  const [query, setQuery] = useState('');

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (roleFilter !== 'all' && acc.role !== roleFilter) return false;
      if (!q) return true;
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.badgeLabel.toLowerCase().includes(q)
      );
    });
  }, [accounts, roleFilter, query]);

  const paidAccountsCount = useMemo(
    () => accounts.filter((a) => (a.licensePaidPhp ?? 0) > 0).length,
    [accounts]
  );

  const approveAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, status: 'active' } : acc))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['all', 'All roles'],
              ['admin', 'Admin Operators'],
              ['app', 'Commuter App Users'],
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
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px]">
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
          <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--accent)] tabular-nums">
            {paidAccountsCount} paid store licenses (₱199)
          </span>
        </div>
      </div>

      <ResponsiveTable
        ariaLabel="LostInPH platform accounts directory"
        columnLabels={{
          2: 'Email',
          3: 'Workspace Role',
          4: 'Store License',
          5: 'Home City',
          6: 'Fare Discount',
          7: 'Trips',
          8: 'Status',
        }}
      >
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Store License</th>
            <th scope="col">Home City</th>
            <th scope="col">Fare Tier</th>
            <th scope="col" className="text-right">
              Trips
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((acc) => {
            const city = cityById.get(acc.homeCity);
            const channel = acc.purchaseChannel ?? 'operator_grant';
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
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      acc.role === 'admin'
                        ? 'border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)]'
                    }`}
                  >
                    {acc.role === 'admin' ? 'Admin' : 'App'}
                  </span>
                </td>
                <td className="text-xs tabular-nums">
                  {channel === 'google_play' ? (
                    <span className="inline-flex rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                      Google Play · ₱{acc.licensePaidPhp ?? 199}
                    </span>
                  ) : channel === 'app_store' ? (
                    <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--foreground)]">
                      App Store · ₱{acc.licensePaidPhp ?? 199}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                      Operator grant
                    </span>
                  )}
                </td>
                <td className="text-xs text-[var(--text-secondary)]">
                  {city?.name ?? acc.homeCity}
                </td>
                <td className="text-xs capitalize text-[var(--text-secondary)]">
                  {acc.discountType.replace('_', ' / ')}
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
                      Approve verifier
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
