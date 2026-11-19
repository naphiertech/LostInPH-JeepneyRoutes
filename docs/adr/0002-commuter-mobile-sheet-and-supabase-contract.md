# ADR 0002: Commuter Mobile-First Sheet Hierarchy, Two-Way Store Sync, and Supabase Seam

- **Status**: Accepted
- **Date**: 2026-11-14

## Context

Phase 1 delivered strict role separation (`AuthWorkspace` -> `AdminWorkspace` | `CommuterWorkspace`), yet two architectural gaps remained before backend wiring:
1. **Desktop-first stack in Commuter App**: On viewports under `1024px` (mobile / DevTools F12), verbose multi-line card blocks pushed the interactive map off the top viewport and buried key trip actions beneath long stop lists.
2. **One-way Admin-to-App read path**: Only `routes` reached `CommuterWorkspace`. Fare rule edits (`Fare Matrices`), active detours (`Incident & Detour Alerts`), and commuter `"Report Issue"` feedback (`Field Reports & Triage`) were not connected end-to-end across the store port, nor documented for Supabase Row-Level Security (RLS).

## Decision

1. **Responsive Map-First Mobile Sheet + Floating Dock**:
   - Below `lg` (`1024px`), `CommuterView` prioritizes the interactive map above an overlapping `rounded-t-[26px]` sheet and fixed dark bottom dock (`Plan` · `Routes` · `Track` · `Saved`).
   - On `lg+` desktop viewports, the same concise ticket/key-value views render inside a compact `420px` left workspace sheet beside the full-height map canvas.
   - Multi-paragraph guidance is replaced by tabular key-value spec grids, visual peak-hour bar strips, and collapsible stop drawers.

2. **Two-Way Sync & Least-Privilege App Boundary**:
   - `App.tsx` connects `routes`, `fareRules`, `advisories`, and a scoped `onSubmitFieldReport` handler into `CommuterWorkspace`.
   - Fare calculation (`fareEngine.ts` + `tripPlanner.ts`) consumes `snapshot.fareRules` (including live `firstKmCount`, `baseFarePhp`, `perKmRatePhp`, and `discountPercent`) rather than hardcoded percentages.
   - Commuters may read published/draft routes, fare matrices, and active advisories, and append new `Field Report` rows defaulting to `triageStatus = 'needs-triage'`, preserving operator write isolation for Supabase RLS.

## Consequences

- **Positive**: Mobile DevTools / `390x844` responsiveness matches modern transit & tracking ergonomics while remaining cohesive on desktop. Admin edits immediately update live fares and active detour badges in the App, and commuter `"Report Issue"` submissions land directly in Admin Triage.
- **Trade-off**: Stop lists require one tap to expand in the Route Ticket sheet on mobile instead of scrolling all stops inline.
- **Upgrade Path**: `docs/supabase-schema.md` maps `TransitStorePort` and `AuthPort` directly to PostgreSQL tables and RLS policies without changing React feature views.
