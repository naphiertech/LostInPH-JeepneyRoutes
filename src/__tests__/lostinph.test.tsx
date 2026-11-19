import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEMO_ACCOUNTS } from '../adapters/mock/demoAccounts';
import { createMockAuthAdapter } from '../adapters/mock/mockAuthAdapter';
import { createMockTransitStoreAdapter } from '../adapters/mock/mockTransitStoreAdapter';
import { SEED_CITIES } from '../adapters/mock/seedCities';
import { SEED_FARE_RULES } from '../adapters/mock/seedFareRules';
import { SEED_ROUTES } from '../adapters/mock/seedRoutes';
import { App } from '../app/App';
import { calculateLegFare, resolveFareRates } from '../domain/transit/fareEngine';
import {
  findNearestCity,
  planJeepneyTrips,
  rankRoutesNearPinpoint,
  sliceRoutePathForStops,
} from '../domain/transit/tripPlanner';
import { AuthWorkspace } from '../features/auth/AuthWorkspace';

describe('LostInPH Multi-City Transit Domain', () => {
  it('covers all 5 Philippine cities with routes, signboards, and fare rules', () => {
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

    expect(SEED_FARE_RULES).toHaveLength(2);
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
  });

  it('exposes strictly 2 demo accounts covering Admin and App roles', () => {
    expect(DEMO_ACCOUNTS).toHaveLength(2);
    expect(DEMO_ACCOUNTS.map((acc) => acc.shortLabel)).toEqual(['Admin', 'App']);
    expect(DEMO_ACCOUNTS.map((acc) => acc.role)).toEqual(['admin', 'app']);
  });
});

describe('Trip Planning & PHP Fare Engine', () => {
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
    expect(direct.some((o) => o.type === 'direct' && o.legs[0].route.code === '17C')).toBe(true);

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

  it('rounds 20% discounted PHP fare to nearest ₱0.25 increment', () => {
    const route17c = SEED_ROUTES.find((r) => r.code === '17C')!;
    const shortRide = calculateLegFare(route17c, 2.5);
    expect(shortRide.regular).toBe(13);
    expect(shortRide.discounted).toBe(10.5);
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

  it('renders autofill attributes, revealable password, validation errors, and Sign up switch', () => {
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
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();

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

  it('boots into Login, isolates Admin Dashboard + sub-modules, and isolates App view on sign-out/switch', () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();

    render(<App authPort={authPort} transitStore={storePort} />);

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

    // 2. Click Admin demo -> ONLY Admin Dashboard mounts
    fireEvent.click(screen.getByRole('button', { name: /admin dashboard/i }));
    expect(
      screen.getByRole('navigation', { name: /admin sidebar navigation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^network overview$/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('banner', { name: /lostinph commuter workspace/i })
    ).not.toBeInTheDocument();

    // 2b. Navigate to Sales & Store Analytics sub-module (₱199 Google Play & App Store + EvilCharts + Toast)
    fireEvent.click(
      screen.getByRole('button', { name: /sales & store analytics/i })
    );
    expect(
      screen.getByRole('heading', { name: /sales & store analytics/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/store conversion & retention funnel/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/₱199 checkout payment channels/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/store & network production readiness radar/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '₱249' }));
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/exported/i);

    // 2c. Open top-nav Notifications popover and jump to Notification Center sub-module
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    expect(
      screen.getByRole('dialog', { name: /notifications panel/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /transit & store/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /go to notification center/i })
    );
    expect(
      screen.getByRole('heading', { name: /^notifications$/i })
    ).toBeInTheDocument();

    // 3. Navigate to Routes & Signboards sub-module
    fireEvent.click(
      screen.getByRole('button', { name: /routes & signboards/i })
    );
    expect(
      screen.getByRole('region', {
        name: /philippine jeepney and modern puv route registry/i,
      })
    ).toHaveAttribute('tabindex', '0');

    // 4. Navigate to Field Reports & Triage sub-module and test triage filter
    fireEvent.click(
      screen.getByRole('button', { name: /field reports & triage/i })
    );
    fireEvent.click(screen.getByRole('button', { name: 'needs-triage' }));
    expect(screen.getByText('REP-204')).toBeInTheDocument();
    expect(screen.queryByText('REP-201')).not.toBeInTheDocument();

    // 5. Navigate to Route Verification sub-module and promote 12L draft
    fireEvent.click(
      screen.getByRole('button', { name: /route verification/i })
    );
    const verifyButtons = screen.getAllByRole('button', {
      name: /verify corridor/i,
    });
    expect(verifyButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(verifyButtons[0]);

    // 6. Navigate to Fare Matrices sub-module
    fireEvent.click(screen.getByRole('button', { name: /fare matrices/i }));
    expect(
      screen.getByText(/interactive ₱ fare matrix verifier/i)
    ).toBeInTheDocument();

    // 7. Sign out returns cleanly to Login
    const signOutButtons = screen.getAllByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButtons[0]);
    expect(
      screen.getByRole('heading', { name: /sign in to your account/i })
    ).toBeInTheDocument();

    // 8. Click App demo -> ONLY Commuter App UI mounts (no top-bar Sign out clutter)
    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));
    expect(
      screen.getByRole('banner', { name: /lostinph commuter workspace/i })
    ).toBeInTheDocument();
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

  it('syncs Admin fare rule edits + advisories into App and sends Commuter field reports back to Admin triage', () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();

    render(<App authPort={authPort} transitStore={storePort} />);

    // Sign into Admin -> Fare Matrices -> update Traditional PUJ base fare to ₱16.00
    fireEvent.click(screen.getByRole('button', { name: /admin dashboard/i }));
    fireEvent.click(screen.getByRole('button', { name: /fare matrices/i }));
    const editButtons = screen.getAllByRole('button', { name: /edit rates/i });
    fireEvent.click(editButtons[0]);
    const baseFareInput = screen.getByLabelText(
      /base fare for traditional puj/i
    );
    fireEvent.change(baseFareInput, { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));

    // Verify pure fare engine helper picks up live rule
    const updatedRates = resolveFareRates(SEED_ROUTES[0], storePort.loadSnapshot().fareRules);
    expect(updatedRates.baseFare).toBe(16);

    // Switch cleanly from Admin -> Login -> Commuter App
    fireEvent.click(screen.getAllByRole('button', { name: /sign out/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));

    // Verify Commuter App lands on Grab/Maxim-inspired Home Hub with live Admin ₱16.00 fare sync
    expect(
      screen.getByText(/saan tayo\? pick a landmark, jeepney code, or terminal/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText('₱16.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/live corridor updates/i)).toBeInTheDocument();

    // Test interactive LTFRB Fare Matrix Calculator on Home
    fireEvent.click(screen.getByRole('button', { name: /fare matrix/i }));
    expect(
      screen.getByRole('heading', { name: /ltfrb fare matrix calculator/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^hide$/i }));

    // Switch to Routes tab -> verify Admin ₱16.00 fare AND seeded active 12L detour appear
    fireEvent.click(screen.getByRole('tab', { name: /^routes$/i }));
    expect(screen.getAllByText('₱16.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Detour')).toBeInTheDocument();

    // Open 17C Route Ticket Sheet & expand collapsible stops
    fireEvent.click(screen.getByRole('button', { name: /17c.*apas/i }));
    expect(screen.getByText(/min fare/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view stops/i }));
    expect(screen.getByText(/cebu it park transport terminal/i)).toBeInTheDocument();

    // Switch to Track tab, verify Leaflet watermark is absent, test draggable sheet Peek headroom bar, and submit a Field Report
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
    fireEvent.click(screen.getByRole('button', { name: /submit field report/i }));
    expect(screen.getByText(/sent to operator triage/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));

    // Return to Routes tab, close ticket sheet, test Map Pinpoint (IT Park), and filter Saved corridors inline
    fireEvent.click(screen.getByRole('tab', { name: /routes/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to routes/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cebu it park$/i }));
    expect(
      screen.getByText(/recommended near pinpoint/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/other routes in cebu city/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear pin/i }));

    fireEvent.click(screen.getByRole('button', { name: /^saved$/i }));
    expect(screen.getByText(/2 routes/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    // Switch cleanly into Commuter Profile via top-right avatar button -> test Discount Pass -> Sign out
    fireEvent.click(
      screen.getByRole('button', { name: /open maya santos profile/i })
    );
    expect(
      screen.getByRole('heading', { name: /^profile$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/commute dashboard/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /student/i }));
    expect(screen.getByText(/save ₱3\.25\/ride/i)).toBeInTheDocument();

    // Regression check: Profile -> Track navigation must never crash even from hidden map container state
    fireEvent.click(screen.getByRole('tab', { name: /^track$/i }));
    expect(screen.getByText(/on the way/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /profile/i }));

    // Switch back to Admin via Profile Sign out -> verify Field Report landed in Field Reports & Triage
    fireEvent.click(
      screen.getByRole('button', { name: /sign out of lostinph/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /admin dashboard/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /field reports & triage/i })
    );
    expect(
      screen.getByRole('heading', {
        name: /17c boarding bay moved near ayala exit/i,
      })
    ).toBeInTheDocument();
  });

  it('renders studio 3D vehicle sprites across Home, Routes, Ticket Sheet, and Profile with saved route code pills', () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();

    const { container } = render(
      <App authPort={authPort} transitStore={storePort} />
    );

    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));

    // 1. Home popular routes render both Traditional Jeepney & Modern PUV WebP/PNG sprites
    const homeSources = Array.from(container.querySelectorAll('picture source')).map(
      (el) => el.getAttribute('srcset')
    );
    expect(homeSources).toContain('/vehicles/traditional-jeepney.webp');
    expect(homeSources).toContain('/vehicles/modern-puv.webp');

    const homeImgs = Array.from(container.querySelectorAll('picture img'));
    expect(homeImgs.length).toBeGreaterThanOrEqual(4);
    for (const img of homeImgs) {
      expect(img).toHaveAttribute('width', '480');
      expect(img).toHaveAttribute('height', '360');
      expect(img).toHaveAttribute('alt', '');
    }

    // 2. Routes list & RouteTicketSheet render sprites cleanly
    fireEvent.click(screen.getByRole('tab', { name: /^routes$/i }));
    expect(
      container.querySelector('picture source[srcset="/vehicles/traditional-jeepney.webp"]')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /17c.*apas/i }));
    expect(
      container.querySelector('picture img[src="/vehicles/traditional-jeepney.png"]')
    ).toBeInTheDocument();

    // 3. Profile saved routes show both 3D sprite and explicit route-code pill (17C)
    fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
    expect(screen.getByText('17C')).toBeInTheDocument();
    expect(
      container.querySelector('picture source[srcset="/vehicles/traditional-jeepney.webp"]')
    ).toBeInTheDocument();
  });

  it('opens a dedicated role-isolated Commuter Notification Center page instead of Profile', () => {
    const authPort = createMockAuthAdapter();
    const storePort = createMockTransitStoreAdapter();

    render(<App authPort={authPort} transitStore={storePort} />);

    fireEvent.click(screen.getByRole('button', { name: /commuter app ui/i }));

    // Open bell popover -> commuter-native tabs, zero Admin store revenue leaks
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    expect(
      screen.getByRole('dialog', { name: /notifications panel/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^alerts/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^updates/i })).toBeInTheDocument();
    expect(
      screen.queryByText(/google play store/i)
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

    // Back returns to Home cleanly
    fireEvent.click(
      screen.getByRole('button', { name: /back from notifications/i })
    );
    expect(
      screen.getByText(/saan tayo\? pick a landmark, jeepney code, or terminal/i)
    ).toBeInTheDocument();

    // Re-open notification center and deep-link straight to 17C RouteTicketSheet
    fireEvent.click(
      screen.getByRole('button', { name: /open notifications/i })
    );
    fireEvent.click(
      screen.getByRole('button', { name: /go to notification center/i })
    );
    fireEvent.click(screen.getByRole('button', { name: /^open 17c$/i }));
    expect(screen.getByText(/min fare/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /apas · it park – carbon market/i })
    ).toBeInTheDocument();
  });
});
