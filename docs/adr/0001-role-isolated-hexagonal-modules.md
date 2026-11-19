# ADR 0001: Role-Isolated Hexagonal Modules for LostInPH

- **Status**: Accepted
- **Date**: 2026-11-14

## Context

LostInPH serves two fundamentally different workflows from one platform:
1. **Transit Operations (`Admin`)**: A multi-module web operations dashboard used by route mappers and transit administrators to audit corridors, manage jeepney signboards, adjust fare matrices, monitor incidents, and triage field reports.
2. **Commuter Navigation (`App`)**: A map-first passenger interface used on phones and browsers to discover jeepney routes, plan origin-to-destination trips, and track stop progress.

Mixing both surfaces inside one shared navigation shell created tight coupling across authentication, state mutation, and presentation, while direct imports from static mock arrays prevented incremental migration toward Phase 2 database persistence and Phase 3 native Capacitor capabilities.

## Decision

Organize `src/` into four explicit layers connected through pure TypeScript **interfaces** (**seams**):
- **`src/domain/`**: Pure Philippine transit calculations (`fareEngine`, `tripPlanner`), entity types, and port interfaces (`AuthPort`, `TransitStorePort`) with zero React or storage dependencies.
- **`src/adapters/`**: Swappable Phase 1 mock and browser persistence implementations behind the domain interfaces.
- **`src/features/`**: Strictly role-isolated UI slices (`auth`, `admin`, `commuter`). Root composition checks the authenticated session role and mounts **only** the matching workspace (`AuthWorkspace` -> `AdminWorkspace` or `CommuterWorkspace`).
- **`src/shared/`**: Reusable stateless UI primitives (`KpiMetric`, `ResponsiveTable`, `StatusPill`, `TrendLineChart`) and the shared Leaflet `TransitMap`.

## Consequences

- **Enforced isolation**: Admin sub-modules and scripts never leak into a signed-in Commuter App session, and Commuter widgets do not clutter the Admin Operations sidebar.
- **Locality & testability**: Pure fare and trip-planning logic accepts injected route collections, allowing deterministic Vitest coverage without browser globals.
- **Upgrade path**: Phase 2 Supabase/backend integration replaces only `src/adapters/mock/*` implementations behind `AuthPort` and `TransitStorePort` without modifying feature views.
- **Trade-off**: Switching between Admin and App views requires signing out through the authentication flow rather than flipping an in-app workspace tab.
