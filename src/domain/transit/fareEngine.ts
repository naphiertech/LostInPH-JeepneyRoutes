import { DiscountType, FareRule, JeepneyRoute } from './types';

export function calculateFareFromRates(
  baseFare: number,
  perKmRate: number,
  distanceKm: number,
  discountPercent = 20,
  firstKmCount = 4
): { regular: number; discounted: number } {
  const extraKm = Math.max(0, distanceKm - firstKmCount);
  const rawRegular = baseFare + extraKm * perKmRate;
  const regular = Math.round(rawRegular * 4) / 4; // LTFRB ₱0.25 rounding increment
  const discountFactor = 1 - discountPercent / 100;
  const discounted = Math.round(regular * discountFactor * 4) / 4;
  return { regular, discounted };
}

export function resolveFareRates(
  route: Pick<JeepneyRoute, 'vehicleType' | 'baseFare' | 'perKmRate'>,
  fareRules?: readonly FareRule[]
): {
  baseFare: number;
  perKmRate: number;
  discountPercent: number;
  firstKmCount: number;
} {
  const matched = fareRules?.find((r) => r.vehicleType === route.vehicleType);
  if (!matched) {
    return {
      baseFare: route.baseFare,
      perKmRate: route.perKmRate,
      discountPercent: 20,
      firstKmCount: 4,
    };
  }
  return {
    baseFare: matched.baseFarePhp,
    perKmRate: matched.perKmRatePhp,
    discountPercent: matched.discountPercent,
    firstKmCount: matched.firstKmCount,
  };
}

export function calculateLegFare(
  route: Pick<JeepneyRoute, 'vehicleType' | 'baseFare' | 'perKmRate'>,
  distanceKm: number,
  fareRules?: readonly FareRule[]
): { regular: number; discounted: number } {
  const rates = resolveFareRates(route, fareRules);
  return calculateFareFromRates(
    rates.baseFare,
    rates.perKmRate,
    distanceKm,
    rates.discountPercent,
    rates.firstKmCount
  );
}

export function getMinimumDisplayFare(
  route: Pick<JeepneyRoute, 'vehicleType' | 'baseFare' | 'perKmRate'>,
  fareRules: readonly FareRule[] | undefined,
  discountType: DiscountType
): number {
  const fares = calculateLegFare(route, 0, fareRules);
  return getDisplayFare(fares.regular, fares.discounted, discountType);
}

export function formatFare(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

export function getDisplayFare(
  regular: number,
  discounted: number,
  discountType: DiscountType
): number {
  return discountType === 'regular' ? regular : discounted;
}

export function applyFareRuleToRoutes(
  routes: JeepneyRoute[],
  updatedRule: FareRule
): JeepneyRoute[] {
  return routes.map((route) =>
    route.vehicleType === updatedRule.vehicleType
      ? {
          ...route,
          baseFare: updatedRule.baseFarePhp,
          perKmRate: updatedRule.perKmRatePhp,
        }
      : route
  );
}
