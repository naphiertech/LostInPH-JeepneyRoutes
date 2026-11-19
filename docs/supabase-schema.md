# LostInPH Supabase Backend & RLS Contract (Phase 2 Blueprint)

This document maps the Phase 1 TypeScript domain contracts in `src/domain/` and `src/adapters/mock/` directly to Phase 2 Supabase PostgreSQL, Auth, Storage, and Realtime targets so `SupabaseAuthAdapter` and `SupabaseTransitStoreAdapter` drop behind `AuthPort` and `TransitStorePort` with zero UI rewrites.

## 1. Environment & Client Seam

Required frontend env vars when Phase 2 starts:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Adapter boundary:
- **Mock (Phase 1 active)**: `src/adapters/mock/mockAuthAdapter.ts`, `src/adapters/mock/mockTransitStoreAdapter.ts`
- **Live (Phase 2 target)**: `src/adapters/supabase/supabaseAuthAdapter.ts`, `src/adapters/supabase/supabaseTransitStoreAdapter.ts`

## 2. Relational Table Mapping

| Domain Type (`src/domain/`) | Supabase Table | Primary Key & Relationships | Notes |
| --- | --- | --- | --- |
| `AuthUser` (`admin` \| `app`) | `public.profiles` | `id uuid references auth.users` | Stores `role ('admin' | 'app')`, `full_name`, `home_city_id`, `discount_type`. |
| `CityInfo` | `public.cities` | `id text` (`cebu`, `manila`, `baguio`, `davao`, `cdo`) | Stores map center lat/lng, zoom, `local_stop_phrase`, `local_fare_word`. |
| `JeepneyRoute` | `public.routes` | `id uuid` / `text`, FK `city_id -> cities(id)` | Stores `code`, `signboard_text`, `vehicle_type`, `verification_status`, polyline `path_geojson` (`jsonb` or PostGIS `geometry`). |
| `RouteStop` | `public.route_stops` | `id uuid`, FK `route_id -> routes(id)` | Ordered (`stop_order int`) terminal, transfer hub, landmark, district, coordinates. |
| `FareRule` | `public.fare_rules` | `id text`, unique `vehicle_type` | `first_km_count`, `base_fare_php`, `per_km_rate_php`, `discount_percent`, `effective_order`. |
| `CorridorAdvisory` | `public.corridor_advisories` | `id uuid`, FK `city_id -> cities(id)` | `route_code`, `title`, `description`, `severity ('advisory'|'detour'|'suspended')`, `active`. |
| `CommunityReport` (`Field Report`) | `public.field_reports` | `id uuid`, FK `city_id -> cities(id)`, nullable `reporter_id -> profiles(id)` | Commuter submissions default `triage_status = 'needs-triage'`. |
| `SavedRoute` / `SavedPlace` | `public.saved_routes`, `public.saved_places` | `user_id -> profiles(id)` | Scoped strictly per commuter session. |

## 3. Draft SQL & Row-Level Security (RLS) Policies

```sql
-- Role lookup helper (non-recursive via SECURITY DEFINER)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Routes, stops, fare_rules, and advisories: public read, Admin-only write
alter table public.routes enable row level security;
create policy "routes_select_all" on public.routes for select using (true);
create policy "routes_admin_write" on public.routes for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

alter table public.fare_rules enable row level security;
create policy "fare_rules_select_all" on public.fare_rules for select using (true);
create policy "fare_rules_admin_write" on public.fare_rules for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

alter table public.corridor_advisories enable row level security;
create policy "advisories_select_all" on public.corridor_advisories for select using (true);
create policy "advisories_admin_write" on public.corridor_advisories for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Field reports: authenticated commuters may insert needs-triage reports; admins triage & read all
alter table public.field_reports enable row level security;
create policy "field_reports_commuter_insert" on public.field_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and triage_status = 'needs-triage'
  );
create policy "field_reports_select_own_or_admin" on public.field_reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.current_user_role() = 'admin'
  );
create policy "field_reports_admin_update" on public.field_reports for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
```

## 4. Realtime Sync Targets (Phase 2)

- Subscribe Commuter App clients to `postgres_changes` on `public.corridor_advisories` and `public.fare_rules` filtered by active `city_id`.
- Subscribe Admin `Field Reports & Triage` badge counter to `INSERT` events on `public.field_reports`.
