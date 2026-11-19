import { CityInfo } from '../../domain/transit/types';

export const SEED_CITIES: CityInfo[] = [
  {
    id: 'cebu',
    name: 'Cebu City',
    region: 'Central Visayas (Region VII)',
    center: [10.3157, 123.8854],
    defaultZoom: 13,
    description:
      'Alphanumeric jeepney codes (17C, 04L, 13C) connecting IT Park, Fuente Osmeña, Ayala, and Colon.',
    localStopPhrase: 'Lugar lang po!',
    localFareWord: 'Plite',
    activeVehicles: 4280,
    transitNotes:
      'Cebu jeepneys use alphanumeric codes on side panels and windshield signboards. Modern PUVs use air-conditioned bays at Ayala and IT Park.',
  },
  {
    id: 'manila',
    name: 'Metro Manila',
    region: 'National Capital Region (NCR)',
    center: [14.5995, 120.9842],
    defaultZoom: 12,
    description:
      'High-frequency arterial jeepneys along Taft, Aurora Blvd, Commonwealth, and Makati corridors.',
    localStopPhrase: 'Para po sa tabi!',
    localFareWord: 'Pamasahe',
    activeVehicles: 18450,
    transitNotes:
      'Manila jeepneys primarily identify routes via windshield destination signboards paired with corridor codes.',
  },
  {
    id: 'baguio',
    name: 'Baguio City',
    region: 'Cordillera Administrative Region (CAR)',
    center: [16.4023, 120.596],
    defaultZoom: 13,
    description:
      'Designated central plaza staging terminals serving mountain ridge barangays and La Trinidad.',
    localStopPhrase: 'Para po!',
    localFareWord: 'Pamasahe',
    activeVehicles: 1940,
    transitNotes:
      'Baguio jeepneys line up at fixed downtown staging bays around Harrison Rd, Kayang St, and Magsaysay Ave.',
  },
  {
    id: 'davao',
    name: 'Davao City',
    region: 'Davao Region (Region XI)',
    center: [7.0731, 125.6128],
    defaultZoom: 13,
    description:
      'Strict loading/unloading zones along Toril, Ecoland, Roxas, and Buhangin corridors.',
    localStopPhrase: 'Lugar lang!',
    localFareWord: 'Plite',
    activeVehicles: 3620,
    transitNotes:
      'Davao strictly enforces designated jeepney loading/unloading stops along major highways and downtown one-way loops.',
  },
  {
    id: 'cdo',
    name: 'Cagayan de Oro',
    region: 'Northern Mindanao (Region X)',
    center: [8.4803, 124.6498],
    defaultZoom: 13,
    description:
      'R-coded and barangay-coded jeepneys linking Carmen, Cogon Market, Divisoria, and Limketkai.',
    localStopPhrase: 'Lugar lang!',
    localFareWord: 'Plite',
    activeVehicles: 2180,
    transitNotes:
      'CDO routes converge around Cogon Market, Divisoria Plaza, and Agora Integrated Terminal.',
  },
];
