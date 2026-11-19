import { FareRule } from '../../domain/transit/types';

export const SEED_FARE_RULES: FareRule[] = [
  {
    id: 'fare-traditional',
    vehicleType: 'traditional_jeepney',
    label: 'Traditional PUJ (Classic Jeepney)',
    firstKmCount: 4,
    baseFarePhp: 13,
    perKmRatePhp: 1.8,
    discountPercent: 20,
    effectiveOrder: 'LTFRB MC 2023-052 baseline',
    updatedAt: '2026-11-01',
  },
  {
    id: 'fare-modern',
    vehicleType: 'modern_puv',
    label: 'Modern PUV (Class 2/3 Air-Conditioned)',
    firstKmCount: 4,
    baseFarePhp: 15,
    perKmRatePhp: 2.2,
    discountPercent: 20,
    effectiveOrder: 'LTFRB MC 2023-052 modern PUV tier',
    updatedAt: '2026-11-01',
  },
];
