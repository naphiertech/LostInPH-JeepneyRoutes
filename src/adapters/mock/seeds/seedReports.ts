import { CommunityReport } from '@/domain/transit/types';

export const SEED_REPORTS: CommunityReport[] = [
  {
    id: 'REP-204',
    cityId: 'cebu',
    routeCode: '12L',
    reporterName: 'Kyle Mendoza',
    createdAt: '2026-11-12 08:40',
    issueType: 'route_detour',
    summary: 'Escario St lane repair shifts 12L loading 60m north',
    details:
      'Modern PUV 12L units currently pick up just past Escario Central Mall driveway instead of the Capitol corner during morning peak.',
    triageStatus: 'needs-triage',
  },
  {
    id: 'REP-201',
    cityId: 'cebu',
    routeCode: '17C',
    reporterName: 'Maya Santos',
    createdAt: '2026-11-11 17:15',
    issueType: 'landmark_update',
    summary: 'Clarify Carbon Unit II unloading landmark for tourists',
    details:
      'Drivers announce Freedom Park before turning into Carbon Unit II; adding Freedom Park to the signboard note prevents missed stops.',
    triageStatus: 'ready-for-agent',
  },
  {
    id: 'REP-198',
    cityId: 'baguio',
    routeCode: 'BAG-M01',
    reporterName: 'Engr. Carlo Dizon',
    createdAt: '2026-11-10 14:22',
    issueType: 'new_stop',
    summary: 'Verify Lower Mabini staging queue signage',
    details:
      'Need photo confirmation of updated Mines View vs Pacdal queuing posts at Baguio Plaza.',
    triageStatus: 'needs-info',
  },
  {
    id: 'REP-195',
    cityId: 'davao',
    routeCode: 'DAV-A03',
    reporterName: 'Rico Villanueva',
    createdAt: '2026-11-09 11:05',
    issueType: 'landmark_update',
    summary: 'Add Davao Coastal Rd junction unloading bay',
    details:
      'DAV-A03 stops at the newly opened Quimpo Blvd Coastal junction shed before turning toward Magsaysay Park.',
    triageStatus: 'ready-for-human',
  },
  {
    id: 'REP-190',
    cityId: 'manila',
    routeCode: 'MNL-Q02',
    reporterName: 'Bea Reyes',
    createdAt: '2026-11-07 19:30',
    issueType: 'fare_change',
    summary: 'Confirm ₱15 modern PUV minimum fare on Cubao–Divisoria',
    details:
      'Duplicate report already reflected in LTFRB 2026 fare matrix.',
    triageStatus: 'wontfix',
  },
];
