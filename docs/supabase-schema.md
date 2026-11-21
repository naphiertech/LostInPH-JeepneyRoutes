# LostInPH Supabase Backend & RLS Contract (Phase 2 Blueprint)

This document maps the async TypeScript ports in `src/domain/` and `src/adapters/mock/` directly to Supabase (PostgreSQL + PostGIS + Auth + Realtime Presence). The executable SQL migration lives in [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql).

## 1. Environment & Adapter Seam

Copy `.env.example` to `.env.local` when switching from `mock` to `supabase`:

- `VITE_DATA_PROVIDER` — `mock` (default) or `supabase`
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key

Composition root (`src/app/container.ts`):

| Port (`src/domain/`) | Mock Adapter (Active) | Supabase Adapter (Phase 2) |
| --- | --- | --- |
| `AuthPort` (`src/domain/auth/authPort.ts`) | `src/adapters/mock/mockAuthAdapter.ts` | `src/adapters/supabase/index.ts` -> `supabase.auth` |
| `TransitStorePort` (`src/domain/transit/transitStorePort.ts`) | `src/adapters/mock/mockTransitStoreAdapter.ts` | `src/adapters/supabase/index.ts` -> PostGIS tables + `postgres_changes` |
| `PresencePort` (`src/domain/telemetry/presencePort.ts`) | `src/adapters/mock/mockPresenceAdapter.ts` | `src/adapters/supabase/index.ts` -> Realtime Presence + `app_installs` |

## 2. Relational & PostGIS Schema (`supabase/migrations/001_initial_schema.sql`)

| Domain Type (`src/domain/`) | Supabase Table | Key Columns & Spatial Types | Notes |
| --- | --- | --- | --- |
| `CityInfo` | `public.cities` | `id text PK`, `center geography(Point, 4326)`, `local_stop_phrase` | Covers Cebu, Manila, Baguio, Davao, CDO. |
| `AuthUser` | `public.profiles` | `id uuid PK -> auth.users`, `role ('admin'\|'app')`, `home_city_id` | Auto-provisioned on signup; `role` drives RLS. |
| `JeepneyRoute` | `public.routes` | `id text PK`, `city_id`, `path_geojson jsonb`, `geom geography(LineString, 4326)` | Road-snapped jeepney corridors; zero fare columns. |
| `RouteStop` | `public.route_stops` | `id text PK`, `route_id`, `stop_order`, `location geography(Point, 4326)` | Indexed with PostGIS `GIST` for nearby-stop RPCs. |
| `CorridorAdvisory` | `public.corridor_advisories` | `id text PK`, `city_id`, `route_code`, `severity`, `active` | Realtime broadcast to commuter alerts. |
| `CommunityReport` | `public.field_reports` | `id text PK`, `city_id`, `reporter_id`, `triage_status` | Commuter submissions default to `'needs-triage'`. |
| Saved bookmarks | `public.saved_routes`, `public.saved_places` | `user_id -> profiles(id)` | Strictly owner-scoped via RLS. |
| Adoption metrics | `public.app_installs` | `id uuid PK`, `user_id`, `platform ('android'\|'ios'\|'web_pwa')` | Powers Admin Overview Downloads KPI. |
| `AuditLogEntry` | `public.audit_logs` | `id uuid PK`, `actor_id`, `category`, `action`, `target`, `city_id` | Powers Admin Audit & Activity Log (Admin read/append). |

## 3. Row-Level Security & Realtime

All policies and publication tables are defined in [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql):

- **Public read / Admin-only write**: `cities`, `routes`, `route_stops`, `corridor_advisories`.
- **Authenticated commuter insert + own/admin read**: `field_reports` (insert restricted to `triage_status = 'needs-triage'`).
- **Owner-scoped**: `profiles` (admin can list all), `saved_routes`, `saved_places`.
- **Realtime publication**: `corridor_advisories`, `field_reports`, `routes`, plus Supabase Realtime Presence channels (`presence:commuters`) for Admin "Users Online Now".
