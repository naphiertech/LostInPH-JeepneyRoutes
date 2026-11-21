---
trigger: always_on
---

# LostInPH Architecture Boundaries

## Dependency direction

- **`src/domain/` stays framework-free**: pure TypeScript types, ports (`AuthPort`, `TransitStorePort`, `PresencePort`), and transit algorithms (`tripPlanner.ts`). Keep React, Leaflet, browser storage, and Supabase imports out of `src/domain/`.
- **Outer details live behind ports in `src/adapters/`**: `mock/` (active default) and `supabase/` implement async `Promise`-based ports + realtime subscriptions (`onAuthStateChange`, `subscribe`, `trackCommuterOnline`).
- **Single composition root**: wire concrete adapters only in `src/app/container.ts` (selected via `src/config/env.ts` `VITE_DATA_PROVIDER`). Components receive ports or state via props, never instantiate adapters or import `src/adapters/mock/seeds/*` directly inside feature pages.

## Feature & product invariants

- **Strict role isolation**: unauthenticated -> `AuthWorkspace`; `admin` -> lazy `AdminWorkspace` (`src/features/admin/pages/*`); `app` -> lazy `CommuterWorkspace` (`src/features/commuter/{tabs,hooks,components}/*`). Keep role-scoped `NotificationProvider` keys (`auth`, `admin`, `commuter`) separate in `src/app/App.tsx`.
- **Commuter scope**: live GPS + pinpoint route recommendations across 5 tabs (`Home · Routes · Plan · Track · Profile`, landing on `Routes`) with zero fare UI or fare calculations.
- **Imports**: use `@/*` path aliases (`src/*`) for cross-layer imports; keep relative imports strictly within the same feature folder.
