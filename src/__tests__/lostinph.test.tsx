import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMockAuthAdapter } from '@/adapters/mock/mockAuthAdapter';
import { createMockPresenceAdapter } from '@/adapters/mock/mockPresenceAdapter';
import { createMockTransitStoreAdapter } from '@/adapters/mock/mockTransitStoreAdapter';
import { DEMO_ACCOUNTS } from '@/adapters/mock/seeds/demoAccounts';
import { SEED_CITIES } from '@/adapters/mock/seeds/seedCities';
import { SEED_ROUTES } from '@/adapters/mock/seeds/seedRoutes';
import { App } from '@/app/App';
import {
  auditTransitNetwork,
  validateRouteImportPayload,
} from '@/domain/transit/routeAudit';
import {
  findNearestCity,
  planJeepneyTrips,
  rankRoutesNearPinpoint,
  recommendTripsFromOriginToPinpoint,
  sliceRoutePathForStops,
} from '@/domain/transit/tripPlanner';
import { AuthWorkspace } from '@/features/auth/AuthWorkspace';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

describe('LostInPH Multi-City Transit Domain', () => {
  it('covers all 5 Philippine cities with road-snapped routes and signboards', () => {
    expect(SEED_CITIES.map((c) => c.id)).toEqual([
      'cebu',
      'manila',
      'baguio',
      'davao',
      'cdo',
    ]);

    for (const city of SEED_CITIES) {
      const cityRoutes = SEED_ROUTES.filter((r) => r.cityId === city.id);
      expect(cityRoutes.length).toBeGreaterThanOrEqual(3);
      for (const route of cityRoutes) {
        expect(route.stops.length).toBeGreaterThanOrEqual(3);
        expect(route.signboardText.length).toBeGreaterThan(4);
        // Every route path is road-snapped with dense street geometry (no sparse 5-point zigzags)
        expect(route.path.length).toBeGreaterThan(100);
      }
    }
  });

  it('ranks IT Park pinpoint routes (17C & 04L) on top and slices road-snapped trip legs', () => {
    const cebuRoutes = SEED_ROUTES.filter((r) => r.cityId === 'cebu');
    const itParkStop = cebuRoutes[0].stops[0];
    const ranking = rankRoutesNearPinpoint(
      itParkStop.lat,
      itParkStop.lng,
      cebuRoutes
    );
    expect(ranking.recommended.map((m) => m.route.code)).toEqual(
      expect.arrayContaining(['17C', '04L'])
    );
    expect(ranking.others.map((m) => m.route.code)).toEqual(
      expect.arrayContaining(['01K', '12L'])
    );

    const route04L = cebuRoutes.find((r) => r.code === '04L')!;
    const slicedRoad = sliceRoutePathForStops(
      route04L,
      route04L.stops[0],
      route04L.stops[2]
    );
    expect(slicedRoad.length).toBeGreaterThan(20);

    // Real Origin -> Pinpoint recommendation recommends Direct 17C from IT Park -> Fuente
    const fuenteStop = cebuRoutes[0].stops.find((s) =>
      s.name.toLowerCase().includes('fuente')
    )!;
    const directRec = recommendTripsFromOriginToPinpoint(
      itParkStop.lat,
      itParkStop.lng,
      fuenteStop.lat,
      fuenteStop.lng,
      cebuRoutes
    );
    expect(directRec.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(directRec.recommendations[0].trip.type).toBe('direct');
    expect(directRec.recommendations[0].trip.legs[0].route.code).toBe('17C');
  });

  it('exposes strictly 2 demo accounts covering Admin and App roles', () => {
    expect(DEMO_ACCOUNTS).toHaveLength(2);
    expect(DEMO_ACCOUNTS.map((acc) => acc.shortLabel)).toEqual(['Admin', 'App']);
    expect(DEMO_ACCOUNTS.map((acc) => acc.role)).toEqual(['admin', 'app']);
  });
});

describe('Trip Planning & Supabase-Ready Async Ports', () => {
  it('detects the nearest Philippine city from coordinates', () => {
    expect(findNearestCity(10.3265, 123.8988, SEED_CITIES).id).toBe('cebu');
    expect(findNearestCity(14.5825, 120.9845, SEED_CITIES).id).toBe('manila');
    expect(findNearestCity(16.4119, 120.5988, SEED_CITIES).id).toBe('baguio');
    expect(findNearestCity(7.0715, 125.6129, SEED_CITIES).id).toBe('davao');
    expect(findNearestCity(8.4774, 124.6443, SEED_CITIES).id).toBe('cdo');
  });

  it('plans direct 17C and 1-transfer Cebu jeepney trips over injected routes', () => {
    const direct = planJeepneyTrips(
      'cebu',
      'Cebu IT Park Transport Terminal',
      'Fuente Osmeña Circle',
      SEED_ROUTES
    );
    expect(
      direct.some((o) => o.type === 'direct' && o.legs[0].route.code === '17C')
    ).toBe(true);

    const transfer = planJeepneyTrips(
      'cebu',
      'Cebu IT Park Transport Terminal',
      'Parkmall PUV Terminal',
      SEED_ROUTES
    );
    const firstTransfer = transfer.find((o) => o.type === 'transfer');
    expect(firstTransfer).toBeDefined();
    expect(firstTransfer!.legs).toHaveLength(2);
    expect(firstTransfer!.transferNote).toContain('Transfer at');
  });

  it('tracks live commuter online presence and cleans up on leave via PresencePort', () => {
    const presence = createMockPresenceAdapter();
    const baseline = presence.getAdoptionSnapshot();
    const stopTracking = presence.trackCommuterOnline('usr-live-1', 'cebu');

    const active = presence.getAdoptionSnapshot();
    expect(active.onlineNow).toBe(baseline.onlineNow + 1);
    expect(active.onlineByCity.cebu).toBe(baseline.onlineByCity.cebu + 1);

    stopTracking();
    const afterLeave = presence.getAdoptionSnapshot();
    expect(afterLeave.onlineNow).toBe(baseline.onlineNow);
    expect(afterLeave.onlineByCity.cebu).toBe(baseline.onlineByCity.cebu);
  });
});

describe('Split-Screen Login Module & Form Validation', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
    } catch {
      // Node 25 experimental localStorage fallback
    }
  });

  it('renders autofill attributes, revealable password, validation errors, and Sign up switch', async () => {
    const authPort = createMockAuthAdapter();
    render(
      <AuthWorkspace
        authPort={authPort}
        cities={SEED_CITIES}
        onAuthenticated={vi.fn()}
      />
    );

    const emailInput = screen.getByLabelText(/^email$/i);
    const passwordInput = screen.getByLabelText(/^password$/i, {
      selector: 'input',
    });

    expect(emailInput).toHaveAttribute('autocomplete', 'username');
    expect(emailInput).toHaveAttribute('spellcheck', 'false');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(
      await screen.findByText(/enter your email address/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(
      screen.getByRole('heading', { name: /create a lostinph account/i })
    ).toBeInTheDocument();
  });
});

describe('Role-Isolated Root Flow & Admin Sub-Modules', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
    } catch {
      // Node 25 experimental localStorage fallback
    }
  });

  it('boots into Login, isolates Admin Dashboard + sub-modules, and isolates App view on sign-out/switch', async () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();
    const presencePort = createMockPresenceAdapter();

    render(
      <App
        authPort={authPort}
        transitStore={storePort}
        presencePort={presencePort}
      />
    );

    // 1. Starts on Login screen ONLY
    expect(
      screen.getByRole('heading', { name: /sign in to your account/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: /admin sidebar navigation/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('banner', { name: /lostinph commuter workspace/i })
    ).not.toBeInTheDocument();

    // 2. Click Admin demo -> ONLY streamlined 6-module Admin Dashboard mounts
    fireEvent.click(screen.getByRole('button', { name: /admin dashboard/i }));
    expect(
      await screen.findByRole('navigation', {
        name: /admin sidebar navigation/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^overview & live pulse$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/app downloads & installs/i)).toBeInTheDocument();
    expect(screen.getByText(/users online now/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('banner', { name: /lostinph commuter workspace/i })
    ).not.toBeInTheDocument();

    // 2b. Navigate to Users Directory & test live presence filter
    fireEvent.click(
      screen.getByRole('button', { name: /users directory/i })
    );
    expect(
      screen.getByRole('heading', { name: /^users directory$/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /online now/i }));
    expect(screen.getByText(/maya santos/i)).toBeInTheDocument();

    // 2c. Open top-nav Notifications popover and jump to Notification Center sub-module
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    expect(
      screen.getByRole('dialog', { name: /notifications panel/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /transit & users/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /go to notification center/i })
    );
    expect(
      screen.getByRole('heading', { name: /^notifications$/i })
    ).toBeInTheDocument();

    // 3. Navigate to merged Routes & Stops module, verify inline draft promotion & Stops & Map tab
    fireEvent.click(
      screen.getByRole('button', { name: /routes & stops/i })
    );
    expect(
      screen.getByRole('region', {
        name: /philippine jeepney and modern puv route registry/i,
      })
    ).toHaveAttribute('tabindex', '0');
    const verifyButtons = screen.getAllByRole('button', { name: /^verify$/i });
    expect(verifyButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(verifyButtons[0]);
    fireEvent.click(screen.getByRole('tab', { name: /stops & map/i }));
    expect(
      await screen.findByText(/mapped stops & hubs/i)
    ).toBeInTheDocument();

    // 4. Navigate to Commuter Reports and test triage filter
    fireEvent.click(
      screen.getByRole('button', { name: /^commuter reports/i })
    );
    fireEvent.click(screen.getByRole('button', { name: 'needs-triage' }));
    expect(screen.getByText('REP-204')).toBeInTheDocument();
    expect(screen.queryByText('REP-201')).not.toBeInTheDocument();

    // 5. Sign out returns cleanly to Login
    const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButtons[0]);
    expect(
      await screen.findByRole('heading', { name: /sign in to your account/i })
    ).toBeInTheDocument();

    // 6. Click App demo -> ONLY Commuter App UI mounts, landing directly on Routes map + live location
    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));
    expect(
      await screen.findByRole('banner', {
        name: /lostinph commuter workspace/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/you are here/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /sign out/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open maya santos profile/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open notifications/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: /admin sidebar navigation/i })
    ).not.toBeInTheDocument();
  });

  it('lands on live GPS Routes, recommends Origin -> Pinpoint rides with zero fare UI, and syncs Commuter reports back to Admin', async () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();
    const presencePort = createMockPresenceAdapter();

    render(
      <App
        authPort={authPort}
        transitStore={storePort}
        presencePort={presencePort}
      />
    );

    // Sign directly into Commuter App -> lands on Routes map with live location & zero fare UI
    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));
    expect(await screen.findByText(/you are here/i)).toBeInTheDocument();
    expect(screen.getByText('Detour')).toBeInTheDocument();
    expect(screen.queryByText(/₱13\.00/i)).not.toBeInTheDocument();

    // Pinpoint a Cebu landmark -> shows You -> Pinpoint recommended jeepney rides
    fireEvent.click(
      screen.getByRole('button', { name: /fuente osmeña circle/i })
    );
    expect(
      screen.getByText(/recommended for your trip/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear pin/i }));

    // Open 17C Route Ticket Sheet -> shows Stops metric (no Min fare) & collapsible stops
    fireEvent.click(screen.getByRole('button', { name: /17c.*apas/i }));
    expect(screen.queryByText(/min fare/i)).not.toBeInTheDocument();
    expect(screen.getByText(/8 stops · 7\.4 km/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view stops/i }));
    expect(
      screen.getByText(/^cebu it park transport terminal$/i)
    ).toBeInTheDocument();

    // Check Home tab has Your location & Near Me (no Fare Matrix or Fare Pass)
    fireEvent.click(screen.getByRole('tab', { name: /^home$/i }));
    expect(
      screen.getByText(
        /saan tayo\? pick a landmark, jeepney code, or pinpoint on map/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/your location/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /near me/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /fare matrix/i })
    ).not.toBeInTheDocument();

    // Switch to Track tab, verify Leaflet watermark is absent, test Peek bar, and submit a Field Report
    fireEvent.click(screen.getByRole('tab', { name: /track/i }));
    expect(
      document.querySelector('.leaflet-control-attribution')
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: /drag down or tap to collapse bottom sheet and view full route map/i,
      })
    );
    expect(
      screen.getByText(/full route map · tap or drag up to open sheet/i)
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /expand bottom sheet/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /report issue/i }));
    const summaryInput = screen.getByLabelText(/what changed\?/i);
    fireEvent.change(summaryInput, {
      target: { value: '17C boarding bay moved near Ayala exit' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /submit field report/i })
    );
    expect(
      await screen.findByText(/sent to operator triage/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    // Switch to Profile -> verify no Fare discount pass card, test Profile -> Track safety
    fireEvent.click(
      screen.getByRole('button', { name: /open maya santos profile/i })
    );
    expect(
      screen.getByRole('heading', { name: /^profile$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/commute dashboard/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/fare discount pass/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^track$/i }));
    expect(screen.getByText(/on the way/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /profile/i }));

    // Switch to Admin -> verify Field Report landed in Commuter Reports
    fireEvent.click(
      screen.getByRole('button', { name: /sign out of lostinph/i })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /admin dashboard/i })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /^commuter reports/i })
    );
    expect(
      screen.getByRole('heading', {
        name: /17c boarding bay moved near ayala exit/i,
      })
    ).toBeInTheDocument();
  });

  it('renders studio 3D vehicle sprites across Home, Routes, Ticket Sheet, and Profile with saved route code pills', async () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();
    const presencePort = createMockPresenceAdapter();

    const { container } = render(
      <App
        authPort={authPort}
        transitStore={storePort}
        presencePort={presencePort}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));
    await screen.findByText(/you are here/i);

    // 1. Routes (initial landing tab) & RouteTicketSheet render WebP/PNG sprites cleanly
    const routeSources = Array.from(
      container.querySelectorAll('picture source')
    ).map((el) => el.getAttribute('srcset'));
    expect(routeSources).toContain('/vehicles/traditional-jeepney.webp');
    expect(routeSources).toContain('/vehicles/modern-puv.webp');

    const routeImgs = Array.from(container.querySelectorAll('picture img'));
    expect(routeImgs.length).toBeGreaterThanOrEqual(4);
    for (const img of routeImgs) {
      expect(img).toHaveAttribute('width', '480');
      expect(img).toHaveAttribute('height', '360');
      expect(img).toHaveAttribute('alt', '');
    }

    fireEvent.click(screen.getByRole('button', { name: /17c.*apas/i }));
    expect(
      container.querySelector(
        'picture img[src="/vehicles/traditional-jeepney.png"]'
      )
    ).toBeInTheDocument();

    // 2. Home popular routes render sprites
    fireEvent.click(screen.getByRole('tab', { name: /^home$/i }));
    expect(
      container.querySelector(
        'picture source[srcset="/vehicles/traditional-jeepney.webp"]'
      )
    ).toBeInTheDocument();

    // 3. Profile saved routes show both 3D sprite and explicit route-code pill (17C)
    fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
    expect(screen.getByText('17C')).toBeInTheDocument();
    expect(
      container.querySelector(
        'picture source[srcset="/vehicles/traditional-jeepney.webp"]'
      )
    ).toBeInTheDocument();
  });

  it('opens a dedicated role-isolated Commuter Notification Center page instead of Profile', async () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();
    const presencePort = createMockPresenceAdapter();

    render(
      <App
        authPort={authPort}
        transitStore={storePort}
        presencePort={presencePort}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));
    await screen.findByText(/you are here/i);

    // Open bell popover -> commuter-native tabs, zero Admin operational leaks
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    expect(
      screen.getByRole('dialog', { name: /notifications panel/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^updates/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/342 commuters online/i)
    ).not.toBeInTheDocument();

    // Go to notification center -> opens dedicated Notifications page (NOT Profile!)
    fireEvent.click(
      screen.getByRole('button', { name: /go to notification center/i })
    );
    expect(
      screen.getByRole('heading', { name: /^notifications$/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /^profile$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/escario capitol lane concrete repair/i)
    ).toBeInTheDocument();

    // Alert preference switch genuinely mutes & restores live detours
    const detourSwitch = screen.getByRole('switch', {
      name: /corridor detours & advisories/i,
    });
    expect(detourSwitch).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(detourSwitch);
    expect(detourSwitch).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.queryByText(/escario capitol lane concrete repair/i)
    ).not.toBeInTheDocument();
    fireEvent.click(detourSwitch);
    expect(
      screen.getByText(/escario capitol lane concrete repair/i)
    ).toBeInTheDocument();

    // Back returns to Routes cleanly
    fireEvent.click(
      screen.getByRole('button', { name: /back from notifications/i })
    );
    expect(screen.getByText(/you are here/i)).toBeInTheDocument();

    // Re-open notification center and deep-link straight to 17C RouteTicketSheet
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    fireEvent.click(
      screen.getByRole('button', { name: /go to notification center/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /^open 17c$/i }));
    expect(screen.getByText(/8 stops · 7\.4 km/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /apas · it park – carbon market/i })
    ).toBeInTheDocument();
  });
});

describe('Admin QA Automation, Audit Log & Hardening', () => {
  beforeEach(() => {
    try {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
    } catch {
      // Node 25 experimental localStorage fallback
    }
  });

  it('detects duplicate codes, sparse geometry, and orphaned advisories via auditTransitNetwork & validates JSON imports', () => {
    const cebuRoutes = SEED_ROUTES.filter((r) => r.cityId === 'cebu');
    const duplicate = {
      ...cebuRoutes[0],
      id: 'dup-17c',
      path: [
        [10.33, 123.9],
        [10.31, 123.89],
      ] as [number, number][],
    };
    const report = auditTransitNetwork(
      [...cebuRoutes, duplicate],
      [
        {
          id: 'ADV-ORPHAN',
          cityId: 'cebu',
          routeCode: '99Z',
          title: 'Ghost corridor repair',
          description: 'Invalid route target',
          severity: 'detour',
          active: true,
          reportedAt: '2026-11-21 10:00',
        },
      ],
      SEED_CITIES
    );

    expect(report.issues.some((i) => i.code === 'duplicate_code')).toBe(true);
    expect(report.issues.some((i) => i.code === 'sparse_geometry')).toBe(true);
    expect(report.issues.some((i) => i.code === 'orphaned_advisory')).toBe(true);
    expect(report.errorCount).toBeGreaterThanOrEqual(2);

    const invalidImport = validateRouteImportPayload(
      JSON.stringify([
        {
          code: '17C',
          name: 'Duplicate route',
          cityId: 'cebu',
          stops: [
            { name: 'A', lat: 10.32, lng: 123.9 },
            { name: 'B', lat: 10.31, lng: 123.89 },
          ],
        },
      ]),
      SEED_CITIES.map((c) => c.id),
      cebuRoutes
    );
    expect(invalidImport.ok).toBe(false);

    const validImport = validateRouteImportPayload(
      JSON.stringify([
        {
          code: '21B',
          name: 'Mandaue – Cathedral',
          cityId: 'cebu',
          stops: [
            { name: 'Mandaue Mercado', lat: 10.3235, lng: 123.9412 },
            { name: 'SM City Cebu', lat: 10.3114, lng: 123.9182 },
          ],
        },
      ]),
      SEED_CITIES.map((c) => c.id),
      cebuRoutes
    );
    expect(validImport.ok).toBe(true);
    if (validImport.ok) {
      expect(validImport.routes[0].code).toBe('21B');
    }
  });

  it('blocks duplicate drafts, converts reports to advisories in 1 click, logs audit entries, simulates pinpoints, and confirms dataset reset', async () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();
    const presencePort = createMockPresenceAdapter();

    render(
      <App
        authPort={authPort}
        transitStore={storePort}
        presencePort={presencePort}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /admin dashboard/i }));
    await screen.findByRole('heading', { name: /^overview & live pulse$/i });

    // 1. Routes & Stops: duplicate route code guard + Edit route
    fireEvent.click(screen.getByRole('button', { name: /^routes & stops/i }));
    fireEvent.click(screen.getByRole('button', { name: /new route draft/i }));
    fireEvent.change(screen.getByLabelText(/route code/i), {
      target: { value: '17C' },
    });
    fireEvent.change(screen.getByLabelText(/corridor title/i), {
      target: { value: 'Duplicate 17C' },
    });
    fireEvent.change(screen.getByLabelText(/windshield signboard placard/i), {
      target: { value: 'DUP 17C' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /save as field draft/i })
    );
    expect(screen.getByText(/already exists in cebu/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    // Bulk JSON Import adds 21B
    fireEvent.click(screen.getByRole('button', { name: /import json/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /load sample template/i })
    );
    fireEvent.click(
      screen.getByRole('button', { name: /validate & import/i })
    );
    expect(
      screen.getByRole('rowheader', { name: '21B' })
    ).toBeInTheDocument();

    // 2. Route QA & Simulator (lazy-loaded)
    fireEvent.click(
      screen.getByRole('button', { name: /route qa & simulator/i })
    );
    expect(
      await screen.findByText(/automated qa integrity scan/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pinpoint recommendation simulator/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/commuter recommendation preview/i)
    ).toBeInTheDocument();

    // 3. Commuter Reports -> 1-click Convert to Advisory
    fireEvent.click(
      screen.getByRole('button', { name: /^commuter reports/i })
    );
    const convertButtons = screen.getAllByRole('button', {
      name: /convert to advisory/i,
    });
    fireEvent.click(convertButtons[0]);

    // 4. Audit & Activity Log records both bulk import and advisory conversion
    fireEvent.click(
      screen.getByRole('button', { name: /audit & activity log/i })
    );
    expect(
      screen.getByText(/converted report to live advisory/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/bulk imported 1 route/i)).toBeInTheDocument();

    // 5. Settings: zero stale "fare rules" text + 2-step reset confirmation
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    expect(screen.queryByText(/fare rules/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /reset demo dataset/i })
    );
    expect(
      screen.getByRole('button', { name: /confirm reset/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
  });

  it('recovers cleanly via ErrorBoundary when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BrokenChild = () => {
      throw new Error('Simulated map crash');
    };
    render(
      <ErrorBoundary scopeLabel="Transit Map">
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(
      screen.getByText(/transit map encountered an error/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/simulated map crash/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload view/i })
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});
