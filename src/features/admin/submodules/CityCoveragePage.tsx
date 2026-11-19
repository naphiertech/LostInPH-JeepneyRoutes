import React from 'react';
import { MapPin } from 'lucide-react';
import {
  APP_STORE_PRICE_PHP,
  CITY_STORE_PERFORMANCE,
  SMALL_BUSINESS_FEE_RATE,
} from '../../../adapters/mock/seedStoreAnalytics';
import {
  CityId,
  CityInfo,
  JeepneyRoute,
} from '../../../domain/transit/types';

interface CityCoveragePageProps {
  cities: CityInfo[];
  routes: JeepneyRoute[];
  onScopeCity: (cityId: CityId) => void;
}

export const CityCoveragePage: React.FC<CityCoveragePageProps> = ({
  cities,
  routes,
  onScopeCity,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {cities.map((city) => {
        const cityRoutes = routes.filter((r) => r.cityId === city.id);
        const verifiedCount = cityRoutes.filter(
          (r) => r.verificationStatus !== 'field_draft'
        ).length;
        const readinessPct =
          cityRoutes.length > 0
            ? Math.round((verifiedCount / cityRoutes.length) * 100)
            : 100;
        const stopCount = cityRoutes.reduce(
          (sum, r) => sum + r.stops.length,
          0
        );
        const perf = CITY_STORE_PERFORMANCE.find((p) => p.cityId === city.id);
        const paidCopies = perf
          ? perf.googlePlayUnits + perf.appStoreUnits
          : 250;
        const netRevenuePhp = Math.round(
          paidCopies * APP_STORE_PRICE_PHP * (1 - SMALL_BUSINESS_FEE_RATE)
        );

        return (
          <div
            key={city.id}
            className="flex flex-col justify-between rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {city.region}
                  </span>
                  <h2 className="mt-0.5 text-base font-semibold text-[var(--foreground)]">
                    {city.name}
                  </h2>
                </div>
                <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)] tabular-nums">
                  {verifiedCount}/{cityRoutes.length} verified ({readinessPct}%)
                </span>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                <div
                  style={{ width: `${readinessPct}%` }}
                  className="h-full rounded-full bg-[var(--accent)]"
                />
              </div>

              <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                {city.description}
              </p>

              <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3 text-xs">
                <div className="font-medium text-[var(--foreground)]">
                  Local transit etiquette
                </div>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {city.transitNotes}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 font-mono text-[11px] text-[var(--text-foreground)]">
                  <span>Alight cue: “{city.localStopPhrase}”</span>
                  <span>Fare term: {city.localFareWord}</span>
                </div>
              </div>

              {perf && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs tabular-nums">
                  <span className="text-[var(--text-secondary)]">
                    Store sales: <strong className="text-[var(--foreground)]">{paidCopies.toLocaleString()} copies</strong>
                  </span>
                  <span className="font-semibold text-[var(--success)]">
                    ₱{netRevenuePhp.toLocaleString('en-PH')} net
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {perf.dailyPinpoints.toLocaleString()} pinpoints/day
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-xs">
              <div className="flex gap-4 tabular-nums text-[var(--text-secondary)]">
                <span>{cityRoutes.length} routes</span>
                <span>{stopCount} mapped stops</span>
                <span>{city.activeVehicles.toLocaleString()} est. PUJs</span>
              </div>

              <button
                type="button"
                onClick={() => onScopeCity(city.id)}
                className="inline-flex cursor-pointer items-center gap-1 font-medium text-[var(--accent)] hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Inspect city</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
