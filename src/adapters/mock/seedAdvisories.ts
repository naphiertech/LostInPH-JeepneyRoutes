import {
  CorridorAdvisory,
  NetworkDemandPoint,
} from '../../domain/transit/types';

export const SEED_ADVISORIES: CorridorAdvisory[] = [
  {
    id: 'ADV-401',
    cityId: 'cebu',
    routeCode: '12L',
    title: 'Escario Capitol lane concrete repair',
    description:
      'Eastbound 12L loading shifted 60 meters past Escario Central Mall driveway from 6:00 am to 10:00 am.',
    severity: 'detour',
    active: true,
    reportedAt: '2026-11-14 07:15',
  },
  {
    id: 'ADV-398',
    cityId: 'manila',
    routeCode: 'MNL-Q02',
    title: 'Divisoria Tutuban weekend night market rerouting',
    description:
      'After 6:00 pm, Recto turnaround loops via Reina Regente to Abad Santos before returning eastbound.',
    severity: 'advisory',
    active: true,
    reportedAt: '2026-11-13 18:10',
  },
  {
    id: 'ADV-394',
    cityId: 'baguio',
    routeCode: 'BAG-M01',
    title: 'Session Rd pedestrian weekend closure',
    description:
      'Sunday dispatch uses Lower Mabini bypass instead of Upper Session staging lanes.',
    severity: 'detour',
    active: false,
    reportedAt: '2026-11-10 08:00',
  },
  {
    id: 'ADV-391',
    cityId: 'davao',
    routeCode: 'DAV-A03',
    title: 'Quimpo Blvd Coastal junction unloading shed active',
    description:
      'Designated yellow bay opened 40 meters east of Davao Coastal bridge ramp.',
    severity: 'advisory',
    active: true,
    reportedAt: '2026-11-12 13:45',
  },
];

export const WEEKLY_NETWORK_TREND: NetworkDemandPoint[] = [
  { slotLabel: 'Mon', activeTripsK: 124, verifiedChecks: 18, reportsFiled: 11 },
  { slotLabel: 'Tue', activeTripsK: 138, verifiedChecks: 22, reportsFiled: 9 },
  { slotLabel: 'Wed', activeTripsK: 146, verifiedChecks: 25, reportsFiled: 14 },
  { slotLabel: 'Thu', activeTripsK: 141, verifiedChecks: 19, reportsFiled: 8 },
  { slotLabel: 'Fri', activeTripsK: 168, verifiedChecks: 31, reportsFiled: 17 },
  { slotLabel: 'Sat', activeTripsK: 152, verifiedChecks: 28, reportsFiled: 12 },
  { slotLabel: 'Sun', activeTripsK: 119, verifiedChecks: 15, reportsFiled: 6 },
];
