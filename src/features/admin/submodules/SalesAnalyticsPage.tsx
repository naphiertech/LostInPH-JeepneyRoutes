import React, { useMemo, useState } from 'react';
import {
  Download,
  Sliders,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import {
  APP_STORE_PRICE_PHP,
  CITY_STORE_PERFORMANCE,
  RECENT_STORE_RECEIPTS,
  SMALL_BUSINESS_FEE_RATE,
  STORE_MONTHLY_COHORTS,
} from '../../../adapters/mock/seedStoreAnalytics';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
} from '../../../domain/transit/types';
import {
  EvilAreaChart,
  EvilBarChart,
  EvilDonutChart,
  EvilRadarChart,
} from '../../../shared/ui/EvilCharts';
import { KpiMetric } from '../../../shared/ui/KpiMetric';
import { useNotifications } from '../../../shared/ui/NotificationCenter';
import { ResponsiveTable } from '../../../shared/ui/ResponsiveTable';

interface SalesAnalyticsPageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  globalCityFilter: 'all' | CityId;
}

type StoreFilter = 'all' | 'google_play' | 'app_store';
type TimeWindow = '30d' | '90d' | '6m';

function formatPhpWhole(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

function formatPhpExact(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const SalesAnalyticsPage: React.FC<SalesAnalyticsPageProps> = ({
  cities,
  routes,
  globalCityFilter,
}) => {
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('6m');
  const [activeMonthIdx, setActiveMonthIdx] = useState<number>(
    STORE_MONTHLY_COHORTS.length - 1
  );
  const [simPricePhp, setSimPricePhp] = useState<number>(APP_STORE_PRICE_PHP);
  const [simFeeRate, setSimFeeRate] = useState<number>(SMALL_BUSINESS_FEE_RATE);
  const [simMonthlyUnits, setSimMonthlyUnits] = useState<number>(1200);
  const { notify } = useNotifications();

  const cityById = useMemo(
    () => new Map(cities.map((c) => [c.id, c])),
    [cities]
  );

  const visibleCohorts = useMemo(() => {
    if (timeWindow === '30d') return STORE_MONTHLY_COHORTS.slice(-1);
    if (timeWindow === '90d') return STORE_MONTHLY_COHORTS.slice(-3);
    return STORE_MONTHLY_COHORTS;
  }, [timeWindow]);

  const cityScaleFactor = useMemo(() => {
    if (globalCityFilter === 'all') return 1;
    const totalUnits = CITY_STORE_PERFORMANCE.reduce(
      (sum, item) => sum + item.googlePlayUnits + item.appStoreUnits,
      0
    );
    const targetCity = CITY_STORE_PERFORMANCE.find(
      (item) => item.cityId === globalCityFilter
    );
    if (!targetCity || totalUnits === 0) return 0.2;
    return (targetCity.googlePlayUnits + targetCity.appStoreUnits) / totalUnits;
  }, [globalCityFilter]);

  const cohortSeries = useMemo(() => {
    return visibleCohorts.map((c) => {
      const playUnits = Math.round(c.googlePlayUnits * cityScaleFactor);
      const iosUnits = Math.round(c.appStoreUnits * cityScaleFactor);
      const units =
        storeFilter === 'google_play'
          ? playUnits
          : storeFilter === 'app_store'
            ? iosUnits
            : playUnits + iosUnits;
      const refunds = Math.max(
        1,
        Math.round(
          c.refundedUnits *
            cityScaleFactor *
            (storeFilter === 'all' ? 1 : storeFilter === 'google_play' ? 0.62 : 0.38)
        )
      );
      const netUnits = Math.max(0, units - refunds);
      const grossPhp = netUnits * APP_STORE_PRICE_PHP;
      const netPhp = grossPhp * (1 - SMALL_BUSINESS_FEE_RATE);
      const views = Math.round(
        c.storeViews *
          cityScaleFactor *
          (storeFilter === 'all' ? 1 : storeFilter === 'google_play' ? 0.64 : 0.36)
      );

      return {
        monthLabel: c.monthLabel,
        playUnits,
        iosUnits,
        units: netUnits,
        refunds,
        grossPhp,
        netPhp,
        views,
        activeCommuters: Math.round(c.activeCommuters * cityScaleFactor),
        pinpointQueries: Math.round(c.pinpointQueries * cityScaleFactor),
      };
    });
  }, [visibleCohorts, cityScaleFactor, storeFilter]);

  const totals = useMemo(() => {
    const totalPlay = cohortSeries.reduce((s, c) => s + c.playUnits, 0);
    const totalIos = cohortSeries.reduce((s, c) => s + c.iosUnits, 0);
    const totalNetUnits = cohortSeries.reduce((s, c) => s + c.units, 0);
    const totalRefunds = cohortSeries.reduce((s, c) => s + c.refunds, 0);
    const totalGrossPhp = cohortSeries.reduce((s, c) => s + c.grossPhp, 0);
    const totalNetPhp = cohortSeries.reduce((s, c) => s + c.netPhp, 0);
    const totalViews = cohortSeries.reduce((s, c) => s + c.views, 0);

    const combinedStoreUnits = Math.max(1, totalPlay + totalIos);
    const playSharePct = Math.round((totalPlay / combinedStoreUnits) * 100);
    const iosSharePct = 100 - playSharePct;
    const convPct =
      totalViews > 0 ? ((totalNetUnits / totalViews) * 100).toFixed(1) : '0.0';
    const refundPct =
      totalNetUnits + totalRefunds > 0
        ? ((totalRefunds / (totalNetUnits + totalRefunds)) * 100).toFixed(1)
        : '0.0';

    return {
      totalPlay,
      totalIos,
      totalNetUnits,
      totalRefunds,
      totalGrossPhp,
      totalNetPhp,
      totalViews,
      playSharePct,
      iosSharePct,
      convPct,
      refundPct,
    };
  }, [cohortSeries]);

  const selectedCohort =
    cohortSeries[Math.min(activeMonthIdx, cohortSeries.length - 1)] ??
    cohortSeries[0];

  const scopedCityPerformance = useMemo(() => {
    const base =
      globalCityFilter === 'all'
        ? CITY_STORE_PERFORMANCE
        : CITY_STORE_PERFORMANCE.filter((c) => c.cityId === globalCityFilter);
    return base.map((item) => {
      const units =
        storeFilter === 'google_play'
          ? item.googlePlayUnits
          : storeFilter === 'app_store'
            ? item.appStoreUnits
            : item.googlePlayUnits + item.appStoreUnits;
      const grossPhp = units * APP_STORE_PRICE_PHP;
      const netPhp = grossPhp * (1 - SMALL_BUSINESS_FEE_RATE);
      const cityRoutesCount = routes.filter(
        (r) => r.cityId === item.cityId
      ).length;
      return {
        ...item,
        cityName: cityById.get(item.cityId)?.name ?? item.cityId,
        units,
        grossPhp,
        netPhp,
        cityRoutesCount,
      };
    });
  }, [globalCityFilter, storeFilter, routes, cityById]);

  const maxCityUnits = Math.max(
    1,
    ...scopedCityPerformance.map((c) => c.units)
  );

  const filteredReceipts = useMemo(() => {
    return RECENT_STORE_RECEIPTS.filter((rec) => {
      if (globalCityFilter !== 'all' && rec.cityId !== globalCityFilter) {
        return false;
      }
      if (storeFilter !== 'all' && rec.store !== storeFilter) {
        return false;
      }
      return true;
    });
  }, [globalCityFilter, storeFilter]);

  const simResults = useMemo(() => {
    const grossMonthly = simMonthlyUnits * simPricePhp;
    const storeFeeMonthly = grossMonthly * simFeeRate;
    const netMonthly = grossMonthly - storeFeeMonthly;
    const netAnnual = netMonthly * 12;
    const netPerCopy = simPricePhp * (1 - simFeeRate);
    return {
      grossMonthly,
      storeFeeMonthly,
      netMonthly,
      netAnnual,
      netPerCopy,
    };
  }, [simMonthlyUnits, simPricePhp, simFeeRate]);

  const handleExportCsv = () => {
    const headers = [
      'Month',
      'GooglePlayUnits',
      'AppStoreUnits',
      'NetPaidUnits',
      'GrossRevenuePHP',
      'NetPayoutPHP_85pct',
      'PinpointQueries',
    ];
    const rows = cohortSeries.map((c) =>
      [
        c.monthLabel,
        c.playUnits,
        c.iosUnits,
        c.units,
        c.grossPhp,
        c.netPhp.toFixed(2),
        c.pinpointQueries,
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lostinph-store-analytics-${timeWindow}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback in non-Blob test environments
    }

    notify({
      title: `Exported ${cohortSeries.length} period cohort(s) at ₱${APP_STORE_PRICE_PHP}/copy.`,
      description: `Saved lostinph-store-analytics-${timeWindow}.csv`,
      category: 'system',
      tone: 'success',
      tagLabel: 'CSV Export',
    });
  };

  const chartRevenueData = useMemo(
    () =>
      cohortSeries.map((c) => {
        const playPhp =
          storeFilter === 'app_store' ? 0 : c.playUnits * APP_STORE_PRICE_PHP;
        const iosPhp =
          storeFilter === 'google_play' ? 0 : c.iosUnits * APP_STORE_PRICE_PHP;
        return {
          month: c.monthLabel,
          googlePlay: playPhp,
          appStore: iosPhp,
          evaluations: Math.round(c.views * 0.38),
          paidInstalls: c.units,
        };
      }),
    [cohortSeries, storeFilter]
  );

  const paymentMixSegments = useMemo(() => {
    const baseNet = Math.max(1000, totals.totalNetPhp);
    return [
      {
        id: 'gcash',
        label: 'GCash Wallet',
        value: Math.round(baseNet * 0.46),
        color: '#5D9B19',
        variant: 'solid' as const,
        helper: 'Direct Play Billing & iOS PH wallet',
      },
      {
        id: 'apple_pay',
        label: 'Apple Pay / Card',
        value: Math.round(baseNet * 0.28),
        color: '#0D9488',
        variant: 'hatched' as const,
        helper: 'App Store Tier ₱199 settlements',
      },
      {
        id: 'maya',
        label: 'Maya Wallet',
        value: Math.round(baseNet * 0.16),
        color: '#2563EB',
        variant: 'solid' as const,
        helper: 'In-app Android carrier & Maya checkout',
      },
      {
        id: 'play_balance',
        label: 'Play Gift / Telecom',
        value: Math.round(baseNet * 0.1),
        color: '#EA580C',
        variant: 'hatched' as const,
        helper: 'Globe / Smart carrier billing',
      },
    ];
  }, [totals.totalNetPhp]);

  const readinessRadarAxes = useMemo(
    () => [
      {
        label: 'Store Conv.',
        value: Math.min(100, Math.round(Number(totals.convPct) * 6.5)),
        secondaryValue: 82,
      },
      {
        label: 'Verified %',
        value:
          routes.length > 0
            ? Math.round(
                (routes.filter((r) => r.verificationStatus !== 'field_draft')
                  .length /
                  routes.length) *
                  100
              )
            : 88,
        secondaryValue: 95,
      },
      {
        label: '30d Retain',
        value: 91,
        secondaryValue: 85,
      },
      {
        label: 'Pinpoints',
        value: 87,
        secondaryValue: 78,
      },
      {
        label: 'Road Snap',
        value: 96,
        secondaryValue: 92,
      },
    ],
    [totals.convPct, routes]
  );

  return (
    <div className="space-y-6">
      {/* Top Filter & Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter store channel"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1"
          >
            {(
              [
                ['all', 'All Stores'],
                ['google_play', 'Google Play'],
                ['app_store', 'App Store'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStoreFilter(id)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  storeFilter === id
                    ? 'bg-[var(--surface)] font-semibold text-[var(--foreground)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Select analytics window"
            className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1"
          >
            {(
              [
                ['30d', '30D'],
                ['90d', '90D'],
                ['6m', '6M Launch'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTimeWindow(id);
                  setActiveMonthIdx(0);
                }}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  timeWindow === id
                    ? 'bg-[var(--foreground)] text-[var(--surface)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-3 py-1 text-xs font-semibold text-[var(--accent)] tabular-nums">
            Retail price: ₱{APP_STORE_PRICE_PHP}.00 · 15% store fee tier
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--border-subtle)]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Executive Commercial KPI Strip */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiMetric
          label="Gross store revenue (₱199)"
          value={formatPhpWhole(totals.totalGrossPhp)}
          deltaLabel="+21.8% vs prior"
          deltaTone="positive"
          helperText={`${totals.totalNetUnits.toLocaleString()} paid copies settled`}
        />
        <KpiMetric
          label="Net operator payout (85%)"
          value={formatPhpWhole(totals.totalNetPhp)}
          deltaLabel="₱169.15 / copy net"
          deltaTone="positive"
          helperText="After 15% Small Business store commission"
        />
        <KpiMetric
          label="Google Play vs App Store"
          value={`${totals.playSharePct}% / ${totals.iosSharePct}%`}
          deltaLabel={`${totals.totalPlay.toLocaleString()} Android · ${totals.totalIos.toLocaleString()} iOS`}
          deltaTone="neutral"
          helperText="Capacitor Android AAB & iOS IPA builds"
        />
        <KpiMetric
          label="Store listing conversion"
          value={`${totals.convPct}%`}
          deltaLabel={`${totals.refundPct}% refund rate`}
          deltaTone="positive"
          helperText={`${totals.totalViews.toLocaleString()} store product page views`}
        />
      </div>

      {/* Main Split: Monthly Gross/Net Revenue SVG Chart + Store Conversion Funnel */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* Chart 1: Monthly Gross & Net Store Revenue Bar + Line Chart */}
        <section
          aria-label="Gross and net store revenue chart"
          className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Google Play & App Store revenue trajectory (₱199 MSRP)
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Gross sales vs. 85% net operator payout after 15% store fee deduction
              </p>
            </div>

            {selectedCohort && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-right tabular-nums">
                <div className="text-[11px] font-medium text-[var(--text-muted)]">
                  {selectedCohort.monthLabel} 2026 cohort · {selectedCohort.units} copies
                </div>
                <div className="mt-0.5 flex items-center justify-end gap-2 text-xs">
                  <span className="font-semibold text-[var(--foreground)]">
                    Gross {formatPhpWhole(selectedCohort.grossPhp)}
                  </span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span className="font-semibold text-[var(--accent)]">
                    Net {formatPhpWhole(selectedCohort.netPhp)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* EvilCharts Stacked & Hatched Revenue Bar Chart */}
          <div className="mt-4">
            <EvilBarChart
              data={chartRevenueData}
              xKey="month"
              stacked
              activeIndex={activeMonthIdx}
              onSelectIndex={setActiveMonthIdx}
              formatValue={(v) => `₱${Math.round(v / 1000)}k`}
              series={[
                {
                  key: 'googlePlay',
                  label: 'Google Play (Android)',
                  color: '#5D9B19',
                  variant: 'solid',
                },
                {
                  key: 'appStore',
                  label: 'App Store (iOS)',
                  color: '#0D9488',
                  variant: 'hatched',
                },
              ]}
            />
          </div>
        </section>

        {/* Chart 2: EvilCharts Monotone Conversion Curve + Retention Funnel */}
        <section
          aria-label="Store acquisition and conversion funnel"
          className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Store conversion & retention funnel
              </h3>
              <Smartphone
                className="h-4 w-4 text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              From Google Play & App Store impressions to retained ₱199 commuters
            </p>

            <div className="mt-3">
              <EvilAreaChart
                data={chartRevenueData}
                xKey="month"
                height={155}
                series={[
                  {
                    key: 'evaluations',
                    label: 'Store page views',
                    color: '#0D9488',
                    variant: 'hatched',
                  },
                  {
                    key: 'paidInstalls',
                    label: '₱199 Paid copies',
                    color: '#5D9B19',
                    variant: 'gradient',
                    strokeVariant: 'dashed',
                  },
                ]}
              />
            </div>

            <div className="mt-3 space-y-2.5">
              {[
                {
                  stage: 'Store listing impressions',
                  count: totals.totalViews,
                  pct: 100,
                  note: 'Play Store & App Store search ("Cebu jeepney", "PH transit")',
                  barColor: 'bg-[var(--text-muted)]/45',
                },
                {
                  stage: 'Product page evaluations',
                  count: Math.round(totals.totalViews * 0.38),
                  pct: 38,
                  note: 'Screenshots & route map preview engagement',
                  barColor: 'bg-[#0D9488]',
                },
                {
                  stage: 'Paid downloads (₱199.00)',
                  count: totals.totalNetUnits,
                  pct: Math.max(8, Math.round(Number(totals.convPct) * 2.2)),
                  note: `${formatPhpWhole(totals.totalGrossPhp)} gross · ${totals.refundPct}% refund rate`,
                  barColor: 'bg-[var(--accent)]',
                },
                {
                  stage: '30-day active commuters',
                  count: Math.round(totals.totalNetUnits * 0.914),
                  pct: Math.max(7, Math.round(Number(totals.convPct) * 2.0)),
                  note: '91.4% 30-day retention across 5 Philippine cities',
                  barColor: 'bg-[#15803D]',
                },
              ].map((step) => (
                <div key={step.stage} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-[var(--foreground)]">
                      {step.stage}
                    </span>
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {step.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                    <div
                      style={{ width: `${Math.min(100, step.pct)}%` }}
                      className={`h-full rounded-full ${step.barColor}`}
                    />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {step.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-[var(--foreground)]">
              <span>Capacitor store build readiness</span>
              <span className="text-[var(--success)]">v1.4.0 Production</span>
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Android Play Billing (`com.lostinph.app`) & iOS StoreKit (`₱199` Tier 3) verified with offline seed fallback.
            </div>
          </div>
        </section>
      </div>

      {/* Second Split: Regional Store Sales by City + Interactive ₱199 Pricing & Payout Simulator */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        {/* Chart 3: Regional Store Sales & Pinpoint Demand */}
        <section
          aria-label="Regional store sales and pinpoint demand by city"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Regional store sales & map pinpoint volume
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Where ₱199 buyers live and which cities generate the highest daily pinpoint lookups
              </p>
            </div>
            <TrendingUp
              className="h-4 w-4 text-[var(--accent)]"
              aria-hidden="true"
            />
          </div>

          <div className="mt-4 space-y-3.5">
            {scopedCityPerformance.map((cityPerf) => {
              const barPct = Math.max(
                10,
                Math.round((cityPerf.units / maxCityUnits) * 100)
              );
              return (
                <div
                  key={cityPerf.cityId}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/55 p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {cityPerf.cityName}
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] tabular-nums">
                        {cityPerf.cityRoutesCount} routes · {cityPerf.storeRating}/5.0
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 text-xs tabular-nums">
                      <span className="font-semibold text-[var(--foreground)]">
                        {formatPhpWhole(cityPerf.netPhp)} net
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        ({cityPerf.units.toLocaleString()} copies)
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                    <div
                      style={{ width: `${barPct}%` }}
                      className="h-full rounded-full bg-[var(--accent)]"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)] tabular-nums">
                    <span>
                      {cityPerf.dailyRouteLookups.toLocaleString()} route lookups/day
                    </span>
                    <span>
                      {cityPerf.dailyPinpoints.toLocaleString()} map pinpoints/day
                    </span>
                    <span className="font-medium text-[var(--success)]">
                      {cityPerf.conversionRatePct}% store conv.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Chart 4: Interactive ₱199 Store Pricing & Payout Calculator */}
        <section
          aria-label="Store pricing and payout calculator"
          className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Store pricing & net payout simulator
              </h3>
              <Sliders
                className="h-4 w-4 text-[var(--accent)]"
                aria-hidden="true"
              />
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Forecast Google Play & App Store take-home revenue at ₱199 or custom tiers
            </p>

            <div className="mt-4 space-y-4">
              {/* Price Tier Selector */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-secondary)]">
                    Store listing price (PHP)
                  </span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    ₱{simPricePhp}.00
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[149, 199, 249, 299].map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => setSimPricePhp(price)}
                      className={`cursor-pointer rounded-xl border py-2 text-xs font-semibold tabular-nums transition-colors ${
                        simPricePhp === price
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:border-[var(--accent)]'
                      }`}
                    >
                      ₱{price}
                    </button>
                  ))}
                </div>
              </div>

              {/* Store Commission Tier */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-secondary)]">
                    Store commission tier
                  </span>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    {Math.round(simFeeRate * 100)}% fee
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimFeeRate(0.15)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      simFeeRate === 0.15
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/40 font-semibold text-[var(--foreground)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div>15% Small Business</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      First $1M USD annual revenue
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimFeeRate(0.3)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      simFeeRate === 0.3
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)]/40 font-semibold text-[var(--foreground)]'
                        : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div>30% Standard Tier</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Above $1M USD threshold
                    </div>
                  </button>
                </div>
              </div>

              {/* Target Monthly Paid Installs */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <label
                    htmlFor="sim-monthly-units"
                    className="font-medium text-[var(--text-secondary)]"
                  >
                    Projected monthly paid downloads
                  </label>
                  <span className="font-semibold text-[var(--foreground)] tabular-nums">
                    {simMonthlyUnits.toLocaleString()} copies/mo
                  </span>
                </div>
                <input
                  id="sim-monthly-units"
                  type="range"
                  min={200}
                  max={10000}
                  step={100}
                  value={simMonthlyUnits}
                  onChange={(e) => setSimMonthlyUnits(Number(e.target.value))}
                  className="w-full cursor-pointer accent-[var(--accent)]"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[500, 1200, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSimMonthlyUnits(preset)}
                      className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums hover:text-[var(--foreground)]"
                    >
                      {preset.toLocaleString()}/mo
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Output Card */}
          <div className="mt-5 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 tabular-nums">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Gross monthly sales</span>
              <span className="font-medium text-[var(--foreground)]">
                {formatPhpWhole(simResults.grossMonthly)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>
                Store fee ({Math.round(simFeeRate * 100)}% Play / App Store)
              </span>
              <span className="font-medium text-[var(--peak)]">
                −{formatPhpWhole(simResults.storeFeeMonthly)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm font-semibold text-[var(--foreground)]">
              <span>Net monthly payout</span>
              <span className="text-[var(--accent)]">
                {formatPhpWhole(simResults.netMonthly)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Projected annual net run-rate</span>
              <span className="font-semibold text-[var(--foreground)]">
                {formatPhpWhole(simResults.netAnnual)} / yr (
                {formatPhpExact(simResults.netPerCopy)} net/copy)
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* EvilCharts Store Payment Mix (Donut) + Launch Readiness Profile (Radar) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section
          aria-label="Store payment channel breakdown"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              ₱199 checkout payment channels
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Net settlement share across GCash, Apple Pay, Maya, and carrier billing
            </p>
          </div>
          <EvilDonutChart
            segments={paymentMixSegments}
            centerLabel="Net Payout"
            formatValue={(v) => formatPhpWhole(v)}
          />
        </section>

        <section
          aria-label="Transit and store launch readiness radar"
          className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Store & network production readiness radar
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Multi-axis benchmark comparing live App build metrics vs launch targets
            </p>
          </div>
          <EvilRadarChart
            axes={readinessRadarAxes}
            primaryLabel="Current v1.4 build"
            secondaryLabel="Play / iOS launch target"
          />
        </section>
      </div>

      {/* Recent Store Purchases Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Recent Google Play & App Store order receipts (₱199.00)
          </h2>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            Showing {filteredReceipts.length} recent orders
          </span>
        </div>

        <ResponsiveTable
          ariaLabel="Recent Google Play and App Store purchase receipts"
          columnLabels={{
            2: 'Commuter',
            3: 'City',
            4: 'Store & Device',
            5: 'Gross',
            6: 'Store Fee (15%)',
            7: 'Net Payout',
          }}
        >
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Commuter</th>
              <th scope="col">City</th>
              <th scope="col">Store & Device</th>
              <th scope="col" className="text-right">
                Gross
              </th>
              <th scope="col" className="text-right">
                Fee (15%)
              </th>
              <th scope="col" className="text-right">
                Net Payout
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map((rec) => {
              const city = cityById.get(rec.cityId);
              return (
                <tr key={rec.orderId}>
                  <th scope="row" className="font-mono text-xs font-medium">
                    <div>{rec.orderId}</div>
                    <div className="text-[10px] font-normal text-[var(--text-muted)]">
                      {rec.purchasedAt}
                    </div>
                  </th>
                  <td className="text-xs font-medium text-[var(--foreground)]">
                    {rec.buyerName}
                  </td>
                  <td className="text-xs text-[var(--text-secondary)]">
                    {city?.name ?? rec.cityId}
                  </td>
                  <td className="text-xs">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        rec.store === 'google_play'
                          ? 'border-[var(--accent)]/30 bg-[var(--accent-subtle)] text-[var(--accent)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)]'
                      }`}
                    >
                      {rec.store === 'google_play' ? 'Google Play' : 'App Store'}
                    </span>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {rec.deviceLabel}
                    </div>
                  </td>
                  <td className="tabular-nums text-right text-xs text-[var(--foreground)]">
                    {formatPhpExact(rec.pricePhp)}
                  </td>
                  <td className="tabular-nums text-right text-xs text-[var(--text-muted)]">
                    −{formatPhpExact(rec.feePhp)}
                  </td>
                  <td className="tabular-nums text-right text-xs font-semibold text-[var(--success)]">
                    {formatPhpExact(rec.netPhp)}
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
