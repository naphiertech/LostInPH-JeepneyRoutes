# ADR 0003: Single-Row Commuter Nav, Profile Hub, and Illustrated Route Cards

- **Status:** Accepted
- **Date:** 2026-11-14

## Context

Visual review of the first mobile commuter sheet surfaced two UX rough edges and one domain-expressiveness opportunity:
1. Stacking a `<header>` (`LostInPH Commuter | Sign out`) above a separate `[City] [GPS] [Alert]` utility strip wasted vertical height and exposed `Sign out` directly in primary navigation chrome.
2. Commuter identity, discount selection, saved places, and account actions belonged in a cohesive **Commuter Profile** hub rather than being split between top header chrome and a generic `Saved` tab.
3. Plain colored code squares (`17C`, `04L`) missed the tactile Philippine commuting cue commuters rely on: recognizing the **traditional jeepney roof signboard** or **modern PUV LED strip** plus local destination landmarks.

## Decisions

1. **Unified Top Utility Bar + `Profile` Dock Tab**: Remove the standalone top header bar and move account/session controls (`Sign out`, Light/Dark theme switch, commuter activity, Home City mini-map, Discount Pass, Saved Routes & Places, and City Advisories) into `CommuterProfileView.tsx`, reachable via the top-right Avatar chip (`MS`) or the 4th bottom dock tab (`Routes · Plan · Track · Profile`).
2. **Studio-Rendered 3D Miniature Vehicle Sprites (`TransitRouteArtwork.tsx`)**: Replace the initial primitive inline SVG drawings and `CityLandmarkWatermark` silhouettes with two alpha-transparent, front-left 3/4 isometric matte-studio 3D miniature sprites (`public/vehicles/traditional-jeepney.webp/.png` and `public/vehicles/modern-puv.webp/.png`) staged inside a subtle `color-mix` `route.color`-tinted neutral surface (`--surface-raised`) that adapts cleanly to Light and Dark mode. Route codes live exclusively in crisp native HTML pills (including `CommuterProfileView` saved rows) rather than duplicated inside tiny thumbnail graphics, so any route added by an Admin operator renders cleanly without per-route image files.
3. **Shared `ColorSchemeSetting` Browser Contract**: Move `ColorSchemeSetting` into `src/adapters/browser/storage.ts` and pass `schemeSetting` / `onChangeScheme` from `App.tsx` to both `AdminWorkspace` and `CommuterWorkspace`, preserving zero cross-feature imports between `admin` and `commuter`.

## Consequences

- `BottomNavDock` keeps 4 spacious touch-friendly tabs while adding a quick `Saved` filter chip directly inside `Routes`.
- On `< lg` mobile screens, selecting `Profile` hides the redundant upper map section so the commuter opens directly into the modular Profile dashboard and its embedded compact `Home City` mini-map preview.
