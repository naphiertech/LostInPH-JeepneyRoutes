import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  APP_STORE_PRICE_PHP,
  SMALL_BUSINESS_FEE_RATE,
  STORE_MONTHLY_COHORTS,
} from '../../../adapters/mock/seedStoreAnalytics';
import {
  CityInfo,
  CommunityReport,
  CorridorAdvisory,
  JeepneyRoute,
  NetworkDemandPoint,
} from '../../../domain/transit/types';
import { EvilAreaChart, EvilBarChart } from '../../../shared/ui/EvilCharts';
import { KpiMetric } from '../../../shared/ui/KpiMetric';
import { ResponsiveTable } from '../../../shared/ui/ResponsiveTable';
import { AdminModuleId } from '../adminNavigation';

interface NetworkOverviewPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  reports: CommunityReport[];
  advisories: CorridorAdvisory[];
  trendData: NetworkDemandPoint[];
  onNavigateModule: (moduleId: AdminModuleId) => void;
}

export const NetworkOverviewPage: React.FC<NetworkOverviewPageProps> = ({
  cities,
  routes,
  reports,
  advisories,
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
    };
  }, [routes, reports, advisories]);

  const insights = [
    {
      title: `${stats.draftCount} corridor${stats.draftCount === 1 ? '' : 's'} pending verification`,
      detail:
        stats.draftCount > 0
          ? 'Review signboard placards and stopping bays before promoting out of field_draft.'
          : 'All tracked corridors in current city filter are verified.',
      target: 'verification' as AdminModuleId,
      urgent: stats.draftCount > 0,
    },
    {
      title: `${stats.needsTriageCount} field report${stats.needsTriageCount === 1 ? '' : 's'} needing initial triage`,
      detail: 'Assign canonical labels (ready-for-human or ready-for-agent).',
      target: 'reports' as AdminModuleId,
      urgent: stats.needsTriageCount > 0,
    },
    {
      title: `${stats.activeAdvisories} active detour advisor${stats.activeAdvisories === 1 ? 'y' : 'ies'}`,
      detail: 'Escario Capitol lane repairs and Divisoria night rerouting live.',
      target: 'incidents' as AdminModuleId,
      urgent: false,
    },
    {
      title: 'Audit PHP fare matrix rules',
      detail: `Traditional PUJ & ${stats.modernCount} modern PUV corridors synced to LTFRB base.`,
      target: 'fares' as AdminModuleId,
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

  const storeSummary = useMemo(() => {
    const totalPlay = STORE_MONTHLY_COHORTS.reduce(
      (s, c) => s + c.googlePlayUnits,
      0
    );
    const totalIos = STORE_MONTHLY_COHORTS.reduce(
      (s, c) => s + c.appStoreUnits,
      0
    );
    const totalRefunds = STORE_MONTHLY_COHORTS.reduce(
      (s, c) => s + c.refundedUnits,
      0
    );
    const netUnits = totalPlay + totalIos - totalRefunds;
    const grossPhp = netUnits * APP_STORE_PRICE_PHP;
    const netPhp = Math.round(grossPhp * (1 - SMALL_BUSINESS_FEE_RATE));
    return {
      netUnits,
      grossPhp,
      netPhp,
      totalPlay,
      totalIos,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Typographic KPI Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetric
          label="Mapped jeepney routes"
          value={routes.length}
          deltaLabel={`${stats.verifiedRatio}% verified`}
          deltaTone="positive"
          helperText={`${stats.modernCount} modern PUV · ${routes.length - stats.modernCount} traditional`}
        />
        <KpiMetric
          label="Terminals & landmark stops"
          value={stats.totalStops}
          helperText="Verified turning bays & transfer hubs"
        />
        <KpiMetric
          label="Open field reports"
          value={stats.openReportsCount}
          deltaLabel={
            stats.needsTriageCount > 0
              ? `${stats.needsTriageCount} needs-triage`
              : 'Queue triaged'
          }
          deltaTone={stats.needsTriageCount > 0 ? 'warning' : 'positive'}
          helperText="Tracked via workflow triage labels"
        />
        <KpiMetric
          label="Store net payout (₱199 app)"
          value={`₱${storeSummary.netPhp.toLocaleString('en-PH')}`}
          deltaLabel={`${storeSummary.netUnits.toLocaleString()} paid copies`}
          deltaTone="positive"
          helperText={`Google Play (${storeSummary.totalPlay}) · App Store (${storeSummary.totalIos})`}
        />
      </div>

      {/* Main Split: EvilCharts Trend Area + Priority Actions */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section
          aria-label="Weekly commuter demand and verification checks"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Weekly commuter demand & route checks
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Monotone trend across daily trip lookups and verified checkpoints
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
                label: 'Active trip lookups (k)',
                color: '#5D9B19',
                variant: 'hatched',
              },
              {
                key: 'checks',
                label: 'Mapper verification checks',
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
              Operational queue insights
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule('reports')}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              <span>View triage</span>
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

      {/* Secondary Multi-Chart Row: Corridor Peak Ridership Bar Chart + Store Revenue Pulse */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <section
          aria-label="Highest demand corridors chart"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Peak corridor load index & rush-hour utilization
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Top routes ranked by peak commuter demand index (0–100 scale)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('routes')}
              className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Inspect routes ›
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
          aria-label="Store revenue and commercial pulse"
          className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Google Play & App Store · ₱199</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigateModule('analytics')}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                <span>Open analytics</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              Paid app sales & store payout trajectory
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              6-month cumulative gross sales of ₱
              {storeSummary.grossPhp.toLocaleString('en-PH')} across Android & iOS
            </p>

            <div className="mt-3">
              <EvilBarChart
                data={STORE_MONTHLY_COHORTS.map((c) => ({
                  month: c.monthLabel,
                  googlePlay: c.googlePlayUnits,
                  appStore: c.appStoreUnits,
                }))}
                xKey="month"
                height={185}
                stacked
                series={[
                  {
                    key: 'googlePlay',
                    label: 'Play Store',
                    color: '#5D9B19',
                    variant: 'solid',
                  },
                  {
                    key: 'appStore',
                    label: 'App Store',
                    color: '#0D9488',
                    variant: 'hatched',
                  },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs tabular-nums">
            <span className="text-[var(--text-secondary)]">
              Net operator take-home (85%)
            </span>
            <span className="font-semibold text-[var(--success)]">
              ₱{storeSummary.netPhp.toLocaleString('en-PH')}
            </span>
          </div>
        </section>
      </div>

      {/* Multi-City Snapshot Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Regional corridor readiness
          </h2>
          <button
            type="button"
            onClick={() => onNavigateModule('cities')}
            className="cursor-pointer text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Open city coverage ›
          </button>
        </div>

        <ResponsiveTable
          ariaLabel="Regional corridor readiness summary"
          columnLabels={{
            2: 'Region',
            3: 'Local Stop Callout',
            4: 'Routes',
            5: 'Verified',
            6: 'Estimated Fleet',
          }}
        >
          <thead>
            <tr>
              <th scope="col">City</th>
              <th scope="col">Region</th>
              <th scope="col">Local Stop Callout</th>
              <th scope="col" className="text-right">
                Routes
              </th>
              <th scope="col" className="text-right">
                Verified
              </th>
              <th scope="col" className="text-right">
                Est. Units
              </th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => {
              const cityRoutes = routes.filter((r) => r.cityId === city.id);
              const verified = cityRoutes.filter(
                (r) => r.verificationStatus !== 'field_draft'
              ).length;
              return (
                <tr key={city.id}>
                  <th scope="row" className="text-sm font-medium">
                    {city.name}
                  </th>
                  <td className="text-xs text-[var(--text-secondary)]">
                    {city.region}
                  </td>
                  <td className="font-mono text-xs text-[var(--foreground)]">
                    {city.localStopPhrase}
                  </td>
                  <td className="tabular-nums text-right text-sm">
                    {cityRoutes.length}
                  </td>
                  <td className="tabular-nums text-right text-sm text-[var(--success)]">
                    {verified}
                  </td>
                  <td className="tabular-nums text-right text-sm text-[var(--text-secondary)]">
                    {city.activeVehicles.toLocaleString()}
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
