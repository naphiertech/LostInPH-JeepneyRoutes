import { CityId } from '../../domain/transit/types';

export const APP_STORE_PRICE_PHP = 199;
export const SMALL_BUSINESS_FEE_RATE = 0.15;

export interface StoreMonthlyPeriod {
  monthLabel: string;
  googlePlayUnits: number;
  appStoreUnits: number;
  refundedUnits: number;
  storeViews: number;
  activeCommuters: number;
  pinpointQueries: number;
}

export interface CityStorePerformance {
  cityId: CityId;
  googlePlayUnits: number;
  appStoreUnits: number;
  dailyRouteLookups: number;
  dailyPinpoints: number;
  storeRating: number;
  conversionRatePct: number;
}

export interface StorePurchaseReceipt {
  orderId: string;
  buyerName: string;
  cityId: CityId;
  store: 'google_play' | 'app_store';
  deviceLabel: string;
  pricePhp: number;
  feePhp: number;
  netPhp: number;
  purchasedAt: string;
  status: 'settled' | 'refunded';
}

export const STORE_MONTHLY_COHORTS: StoreMonthlyPeriod[] = [
  {
    monthLabel: 'Jun',
    googlePlayUnits: 218,
    appStoreUnits: 114,
    refundedUnits: 5,
    storeViews: 4820,
    activeCommuters: 312,
    pinpointQueries: 4920,
  },
  {
    monthLabel: 'Jul',
    googlePlayUnits: 294,
    appStoreUnits: 162,
    refundedUnits: 6,
    storeViews: 6340,
    activeCommuters: 742,
    pinpointQueries: 8140,
  },
  {
    monthLabel: 'Aug',
    googlePlayUnits: 376,
    appStoreUnits: 208,
    refundedUnits: 8,
    storeViews: 8190,
    activeCommuters: 1298,
    pinpointQueries: 12650,
  },
  {
    monthLabel: 'Sep',
    googlePlayUnits: 425,
    appStoreUnits: 244,
    refundedUnits: 9,
    storeViews: 9410,
    activeCommuters: 1934,
    pinpointQueries: 17820,
  },
  {
    monthLabel: 'Oct',
    googlePlayUnits: 512,
    appStoreUnits: 291,
    refundedUnits: 11,
    storeViews: 11280,
    activeCommuters: 2690,
    pinpointQueries: 23490,
  },
  {
    monthLabel: 'Nov',
    googlePlayUnits: 615,
    appStoreUnits: 361,
    refundedUnits: 12,
    storeViews: 13840,
    activeCommuters: 3618,
    pinpointQueries: 31240,
  },
];

export const CITY_STORE_PERFORMANCE: CityStorePerformance[] = [
  {
    cityId: 'cebu',
    googlePlayUnits: 894,
    appStoreUnits: 542,
    dailyRouteLookups: 4820,
    dailyPinpoints: 1940,
    storeRating: 4.9,
    conversionRatePct: 8.4,
  },
  {
    cityId: 'manila',
    googlePlayUnits: 782,
    appStoreUnits: 498,
    dailyRouteLookups: 5610,
    dailyPinpoints: 2310,
    storeRating: 4.8,
    conversionRatePct: 7.6,
  },
  {
    cityId: 'baguio',
    googlePlayUnits: 312,
    appStoreUnits: 174,
    dailyRouteLookups: 1890,
    dailyPinpoints: 820,
    storeRating: 4.9,
    conversionRatePct: 9.1,
  },
  {
    cityId: 'davao',
    googlePlayUnits: 258,
    appStoreUnits: 102,
    dailyRouteLookups: 1420,
    dailyPinpoints: 590,
    storeRating: 4.8,
    conversionRatePct: 6.9,
  },
  {
    cityId: 'cdo',
    googlePlayUnits: 194,
    appStoreUnits: 64,
    dailyRouteLookups: 1150,
    dailyPinpoints: 460,
    storeRating: 4.7,
    conversionRatePct: 6.4,
  },
];

export const RECENT_STORE_RECEIPTS: StorePurchaseReceipt[] = [
  {
    orderId: 'GPA.3394-8821-1049',
    buyerName: 'Maya Santos',
    cityId: 'cebu',
    store: 'google_play',
    deviceLabel: 'Samsung Galaxy S24 · Android 15',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-14 14:12',
    status: 'settled',
  },
  {
    orderId: 'APPL-MX9204118',
    buyerName: 'Bea Reyes',
    cityId: 'manila',
    store: 'app_store',
    deviceLabel: 'iPhone 15 Pro · iOS 18.2',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-14 13:48',
    status: 'settled',
  },
  {
    orderId: 'GPA.3394-7740-9912',
    buyerName: 'Kyle Mendoza',
    cityId: 'cebu',
    store: 'google_play',
    deviceLabel: 'Pixel 8a · Android 15',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-14 12:05',
    status: 'settled',
  },
  {
    orderId: 'APPL-MX9203890',
    buyerName: 'Lianne Cariño',
    cityId: 'baguio',
    store: 'app_store',
    deviceLabel: 'iPhone 14 · iOS 18.1',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-14 10:31',
    status: 'settled',
  },
  {
    orderId: 'GPA.3394-6102-4418',
    buyerName: 'Paolo Uy',
    cityId: 'cdo',
    store: 'google_play',
    deviceLabel: 'Xiaomi 14T · Android 14',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-13 21:19',
    status: 'settled',
  },
  {
    orderId: 'GPA.3394-5591-3004',
    buyerName: 'Jessa Alcantara',
    cityId: 'davao',
    store: 'google_play',
    deviceLabel: 'Nothing Phone (2a) · Android 14',
    pricePhp: 199,
    feePhp: 29.85,
    netPhp: 169.15,
    purchasedAt: '2026-11-13 18:42',
    status: 'settled',
  },
];
