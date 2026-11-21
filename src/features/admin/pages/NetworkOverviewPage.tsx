import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Download,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AuthUser } from '@/domain/auth/types';
import { AppAdoptionSnapshot } from '@/domain/telemetry/presencePort';
import {
  CityId,
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  JeepneyRoute,
  NetworkDemandPoint,
} from '@/domain/transit/types';
import { EvilAreaChart, EvilBarChart } from '@/shared/ui/EvilCharts';
import { KpiMetric } from '@/shared/ui/KpiMetric';
import { ResponsiveTable } from '@/shared/ui/ResponsiveTable';
import { AdminModuleId } from '../adminNavigation';

interface NetworkOverviewPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  reports: CommunityReport[];
  advisories: CorridorAdvisory[];
  accounts: AuthUser[];
  adoption: AppAdoptionSnapshot;
  globalCityFilter: 'all' | CityId;
  trendData: NetworkDemandPoint[];
  onNavigateModule: (moduleId: AdminModuleId) => void;
}

export const NetworkOverviewPage: React.FC<NetworkOverviewPageProps> = ({
  cities,
  routes,
  reports,
  advisories,
  accounts,
  adoption,
  globalCityFilter,
  trendData,
  onNavigateModule,
}) => {
  const stats = useMemo(() => {
    const totalStops = routes.reduce((sum, r) => sum + r.stops.length, 0);
    const verifiedRoutes = routes.filter(
      (r) => r.verificationStatus !== 'field_draft'
    ).length;
    const draftCount = routes.length - verifiedRoutes;
    const modernCount = routes.filter(
      (r) => r.vehicleType === 'modern_puv'
    ).length;
    const openReports = reports.filter((r) => r.triageStatus !== 'wontfix');
    const activeAdvisories = advisories.filter((a) => a.active).length;

    const onlineNow =
      globalCityFilter === 'all'
        ? adoption.onlineNow
        : adoption.onlineByCity[globalCityFilter] ?? 0;

    const scopedAccounts =
      globalCityFilter === 'all'
        ? accounts
        : accounts.filter((a) => a.homeCity === globalCityFilter);
    const onlineDirectoryCount = scopedAccounts.filter((a) => a.isOnline).length;

    return {
      totalStops,
      verifiedRoutes,
      draftCount,
      verifiedRatio:
        routes.length > 0
          ? Math.round((verifiedRoutes / routes.length) * 100)
          : 0,
      modernCount,
      openReportsCount: openReports.length,
      needsTriageCount: openReports.filter(
        (r) => r.triageStatus === 'needs-triage'
      ).length,
      activeAdvisories,
      onlineNow,
      registeredCount: scopedAccounts.length,
      onlineDirectoryCount,
    };
  }, [routes, reports, advisories, accounts, globalCityFilter]);

  const insights = [
    {
      title: `${stats.onlineNow} commuters online right now`,
      detail: `${stats.onlineDirectoryCount} of ${stats.registeredCount} tracked accounts active on map & pinpoint.`,
      target: 'users' as AdminModuleId,
      urgent: false,
    },
    {
      title: `${stats.draftCount} route${stats.draftCount === 1 ? '' : 's'} pending verification`,
      detail:
        stats.draftCount > 0
          ? 'Review signboard placards and promote draft corridors directly in Routes & Stops.'
          : 'All tracked corridors in current city filter are verified.',
      target: 'routes' as AdminModuleId,
      urgent: stats.draftCount > 0,
    },
    {
      title: `${stats.needsTriageCount} commuter report${stats.needsTriageCount === 1 ? '' : 's'} needing triage`,
      detail: 'Assign workflow labels to rider-reported stops and detours.',
      target: 'reports' as AdminModuleId,
      urgent: stats.needsTriageCount > 0,
    },
    {
      title: `${stats.activeAdvisories} active detour advisor${stats.activeAdvisories === 1 ? 'y' : 'ies'}`,
      detail: 'Synced live to Commuter routes, Home, and Notification Center.',
      target: 'incidents' as AdminModuleId,
      urgent: false,
    },
  ];

  const topDemandRoutes = useMemo(() => {
    return [...routes]
      .map((route) => {
        const avgDemand = Math.round(
          route.peakDemand.reduce((s, v) => s + v, 0) /
            Math.max(1, route.peakDemand.length)
        );
        const peakMax = Math.max(...route.peakDemand, 50);
        return {
          route,
          avgDemand,
          peakMax,
        };
      })
      .sort((a, b) => b.peakMax - a.peakMax)
      .slice(0, 6);
  }, [routes]);

  return (
    <div className="space-y-6">
      {/* Live Adoption & Network KPI Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetric
          label="App downloads & installs"
          value={adoption.totalDownloads.toLocaleString('en-PH')}
          deltaLabel="+14.2% MoM"
          deltaTone="positive"
          helperText={`Android (${adoption.androidDownloads.toLocaleString()}) · iOS (${adoption.iosDownloads.toLocaleString()}) · Web (${adoption.webPwaInstalls.toLocaleString()})`}
        />
        <KpiMetric
          label="Users online now"
          value={stats.onlineNow.toLocaleString('en-PH')}
          deltaLabel="Live presence"
          deltaTone="positive"
          helperText={
            globalCityFilter === 'all'
              ? 'Active GPS & pinpoint sessions across 5 PH cities'
              : `Active commuters currently locating rides in ${
                  cities.find((c) => c.id === globalCityFilter)?.name ??
                  globalCityFilter
                }`
          }
        />
        <KpiMetric
          label="Mapped jeepney routes"
          value={routes.length}
          deltaLabel={`${stats.verifiedRatio}% verified`}
          deltaTone="positive"
          helperText={`${stats.totalStops} mapped stops · ${stats.modernCount} modern PUV`}
        />
        <KpiMetric
          label="Commuter reports & alerts"
          value={stats.openReportsCount}
          deltaLabel={
            stats.needsTriageCount > 0
              ? `${stats.needsTriageCount} needs-triage`
              : `${stats.activeAdvisories} live detours`
          }
          deltaTone={stats.needsTriageCount > 0 ? 'warning' : 'positive'}
          helperText={`${stats.activeAdvisories} active corridor detour advisories`}
        />
      </div>

      {/* Main Split: Weekly Pinpoint & Route Lookup Trend + Live Queue */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section
          aria-label="Weekly commuter lookups and route checks"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Weekly route lookups &amp; pinpoint activity
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Daily commuter GPS route recommendations and verified stop checks
              </p>
            </div>
            <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)] tabular-nums">
              +18.4% 7d
            </span>
          </div>

          <EvilAreaChart
            data={trendData.map((pt) => ({
              day: pt.slotLabel,
              lookups: pt.activeTripsK,
              checks: pt.verifiedChecks,
            }))}
            xKey="day"
            formatValue={(v) => `${v}`}
            series={[
              {
                key: 'lookups',
                label: 'Pinpoint & route lookups (k)',
                color: '#5D9B19',
                variant: 'hatched',
              },
              {
                key: 'checks',
                label: 'Stop verification checks',
                color: '#0D9488',
                variant: 'gradient',
                strokeVariant: 'dashed',
              },
            ]}
          />
        </section>

        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Live operations pulse
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule('users')}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              <span>View users</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
            {insights.map((item) => (
              <li key={item.title} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => onNavigateModule(item.target)}
                  className="group flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <div className="flex items-start gap-2.5">
                    {item.urgent ? (
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--peak)]"
                        aria-hidden="true"
                      />
                    ) : (
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-[var(--foreground)]">
                        {item.title}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Secondary Row: Top Pinpointed Corridors + Monthly Downloads Growth */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section
          aria-label="Most requested jeepney corridors"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Most pinpointed jeepney corridors
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Top routes ranked by rush-hour commuter recommendation demand
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('routes')}
              className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Manage routes ›
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {topDemandRoutes.map(({ route, avgDemand, peakMax }) => (
              <div key={route.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums"
                      style={{ backgroundColor: route.color }}
                    >
                      {route.code}
                    </span>
                    <span className="truncate font-medium text-[var(--foreground)]">
                      {route.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--foreground)] tabular-nums">
                    Peak {peakMax}% · Avg {avgDemand}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                  <div
                    style={{ width: `${Math.min(100, peakMax)}%` }}
                    className="h-full rounded-full bg-[var(--accent)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label="Monthly app downloads by platform"
          className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>App Installs · Android &amp; iOS</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('users')}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                <span>Users</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              Monthly app downloads
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {adoption.totalDownloads.toLocaleString('en-PH')} total installs across Android, iOS, and Web PWA
            </p>

            <div className="mt-3">
              <EvilBarChart
                data={adoption.monthlyDownloadTrend.map((pt) => ({
                  month: pt.month,
                  android: pt.android,
                  ios: pt.ios,
                }))}
                xKey="month"
                height={185}
                stacked
                series={[
                  {
                    key: 'android',
                    label: 'Android',
                    color: '#5D9B19',
                    variant: 'solid',
                  },
                  {
                    key: 'ios',
                    label: 'iOS',
                    color: '#0D9488',
                    variant: 'hatched',
                  },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Users className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
              <span>Active online right now</span>
            </span>
            <span className="font-semibold text-[var(--success)]">
              {stats.onlineNow} online
            </span>
          </div>
        </section>
      </div>

      {/* Multi-City Online Users & Corridor Readiness Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Active cities &amp; live commuter coverage
          </h2>
          <button
            type="button"
            onClick={() => onNavigateModule('routes')}
            className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Open routes &amp; stops ›
          </button>
        </div>

        <ResponsiveTable
          ariaLabel="Active cities and live commuter coverage summary"
          columnLabels={{
            2: 'Region',
            3: 'Online Now',
            4: 'Routes',
            5: 'Verified',
            6: 'Local Stop Callout',
          }}
        >
          <thead>
            <tr>
              <th scope="col">City</th>
              <th scope="col">Region</th>
              <th scope="col" className="text-right">
                Online Now
              </th>
              <th scope="col" className="text-right">
                Routes
              </th>
              <th scope="col" className="text-right">
                Verified
              </th>
              <th scope="col">Stop Callout</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => {
              const cityRoutes = routes.filter((r) => r.cityId === city.id);
              const verified = cityRoutes.filter(
                (r) => r.verificationStatus !== 'field_draft'
              ).length;
              const online = adoption.onlineByCity[city.id] ?? 0;
              return (
                <tr key={city.id}>
                  <th scope="row" className="text-sm font-medium">
                    {city.name}
                  </th>
                  <td className="text-xs text-[var(--text-secondary)]">
                    {city.region}
                  </td>
                  <td className="tabular-nums text-right text-sm font-semibold text-[var(--success)]">
                    {online}
                  </td>
                  <td className="tabular-nums text-right text-sm">
                    {cityRoutes.length}
                  </td>
                  <td className="tabular-nums text-right text-sm text-[var(--foreground)]">
                    {verified}
                  </td>
                  <td className="font-mono text-xs text-[var(--text-secondary)]">
                    {city.localStopPhrase}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ResponsiveTable>
      </div>
    </div>
  );
};
