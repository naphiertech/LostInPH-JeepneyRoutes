-- LostInPH Supabase Schema (PostgreSQL + PostGIS + RLS + Realtime)
-- Ready to apply when switching VITE_DATA_PROVIDER=supabase.

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- 1. Philippine Cities
create table if not exists public.cities (
  id text primary key,
  name text not null,
  region text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  default_zoom integer not null default 13,
  description text not null default '',
  local_stop_phrase text not null default 'Para po!',
  active_vehicles integer not null default 0,
  transit_notes text not null default '',
  created_at timestamptz not null default now()
);

-- 2. User Profiles (extends auth.users with role isolation & platform metadata)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'app' check (role in ('admin', 'app')),
  home_city_id text not null default 'cebu' references public.cities (id),
  avatar_initials text not null default 'LP',
  badge_label text not null default 'Commuter',
  platform text not null default 'web' check (platform in ('android', 'ios', 'web')),
  status text not null default 'active' check (status in ('active', 'pending_verification')),
  trips_completed integer not null default 0,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. Jeepney & Modern PUV Routes (PostGIS LineString + cached coordinate array)
create table if not exists public.routes (
  id text primary key,
  city_id text not null references public.cities (id) on delete cascade,
  code text not null,
  name text not null,
  vehicle_type text not null check (vehicle_type in ('traditional_jeepney', 'modern_puv')),
  signboard_text text not null,
  color text not null default '#5D9B19',
  total_distance_km double precision not null default 5.0,
  estimated_duration_min integer not null default 20,
  headway_min text not null default '5–8 min',
  operating_hours text not null default '5:00 am – 10:00 pm',
  verification_status text not null default 'field_draft'
    check (verification_status in ('ltfrb_reference', 'community_verified', 'field_draft')),
  verification_note text not null default '',
  peak_hours_label text not null default 'Morning & evening peak',
  peak_demand integer[] not null default '{40,70,85,65,50,55,60,55,62,74,82,60}',
  corridor_summary text not null default '',
  path_coords jsonb not null default '[]'::jsonb,
  geom geography(LineString, 4326),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routes_city on public.routes (city_id);
create index if not exists idx_routes_geom on public.routes using gist (geom);

-- 4. Ordered Route Stops & Landmarks (PostGIS Point)
create table if not exists public.route_stops (
  id text primary key,
  route_id text not null references public.routes (id) on delete cascade,
  stop_order integer not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  landmark text not null default '',
  barangay_or_district text not null default '',
  is_terminal boolean not null default false,
  is_transfer_hub boolean not null default false,
  geom geography(Point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  ) stored
);

create index if not exists idx_route_stops_route on public.route_stops (route_id, stop_order);
create index if not exists idx_route_stops_geom on public.route_stops using gist (geom);

-- 5. Live Corridor Detours & Advisories (synced via Supabase Realtime)
create table if not exists public.corridor_advisories (
  id text primary key,
  city_id text not null references public.cities (id) on delete cascade,
  route_code text not null,
  title text not null,
  description text not null default '',
  severity text not null default 'detour' check (severity in ('advisory', 'detour', 'suspended')),
  active boolean not null default true,
  reported_at timestamptz not null default now()
);

create index if not exists idx_advisories_city_active on public.corridor_advisories (city_id, active);

-- 6. Commuter Field Reports (Commuter insert -> Admin triage)
create table if not exists public.field_reports (
  id text primary key,
  city_id text not null references public.cities (id) on delete cascade,
  route_code text not null,
  reporter_id uuid references public.profiles (id) on delete set null,
  reporter_name text not null,
  issue_type text not null check (issue_type in ('landmark_update', 'route_detour', 'new_stop')),
  summary text not null,
  details text not null default '',
  triage_status text not null default 'needs-triage'
    check (triage_status in ('needs-triage', 'needs-info', 'ready-for-agent', 'ready-for-human', 'wontfix')),
  created_at timestamptz not null default now()
);

create index if not exists idx_field_reports_city on public.field_reports (city_id, triage_status);

-- 7. Commuter Saved Corridors & Places
create table if not exists public.saved_routes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  route_id text not null references public.routes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  city_id text not null references public.cities (id) on delete cascade,
  stop_id text not null,
  label text not null,
  landmark text not null default '',
  created_at timestamptz not null default now()
);

-- 8. App Installs / Downloads Telemetry (Android, iOS, Web PWA)
create table if not exists public.app_installs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  platform text not null check (platform in ('android', 'ios', 'web')),
  city_id text references public.cities (id) on delete set null,
  installed_at timestamptz not null default now()
);

create index if not exists idx_app_installs_platform on public.app_installs (platform, installed_at);

-- 10. Operator & system audit trail (who verified routes, published detours, triaged reports)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role text not null check (actor_role in ('admin', 'app', 'system')),
  category text not null check (category in ('route', 'advisory', 'report', 'system')),
  action text not null,
  target text not null,
  city_id text references public.cities(id) on delete set null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_category on public.audit_logs (category, city_id);

-- =====================================================================
-- Row-Level Security (RLS) Helpers & Policies
-- =====================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.corridor_advisories enable row level security;
alter table public.field_reports enable row level security;
alter table public.saved_routes enable row level security;
alter table public.saved_places enable row level security;
alter table public.app_installs enable row level security;
alter table public.audit_logs enable row level security;

-- Cities, routes, stops, advisories: readable by everyone; writable only by admins
create policy "cities_select_all" on public.cities for select using (true);
create policy "cities_admin_write" on public.cities for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "routes_select_all" on public.routes for select using (true);
create policy "routes_admin_write" on public.routes for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "route_stops_select_all" on public.route_stops for select using (true);
create policy "route_stops_admin_write" on public.route_stops for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "advisories_select_all" on public.corridor_advisories for select using (true);
create policy "advisories_admin_write" on public.corridor_advisories for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Profiles: users read/update own profile; admins read all & approve accounts
create policy "profiles_select_own_or_admin" on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');
create policy "profiles_update_own_or_admin" on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.current_user_role() = 'admin');

-- Field reports: authenticated commuters insert needs-triage; admins read & update triage
create policy "field_reports_commuter_insert" on public.field_reports for insert
  to authenticated
  with check (reporter_id = auth.uid() and triage_status = 'needs-triage');
create policy "field_reports_select_own_or_admin" on public.field_reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.current_user_role() = 'admin');
create policy "field_reports_admin_update" on public.field_reports for update
  to authenticated
  using (public.current_user_role() = 'admin');

-- Saved routes & places: strictly scoped to owner
create policy "saved_routes_owner_all" on public.saved_routes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "saved_places_owner_all" on public.saved_places for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- App installs: authenticated users log install once; admins read aggregated metrics
create policy "app_installs_insert_auth" on public.app_installs for insert
  to authenticated
  with check (user_id = auth.uid() or user_id is null);
create policy "app_installs_admin_select" on public.app_installs for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- Audit logs: append-only for admins & system triggers; readable only by admins
create policy "audit_logs_admin_select" on public.audit_logs for select
  to authenticated
  using (public.current_user_role() = 'admin');
create policy "audit_logs_admin_insert" on public.audit_logs for insert
  to authenticated
  with check (public.current_user_role() = 'admin' or actor_id = auth.uid());

-- Enable Realtime replication for live detours & commuter field reports
alter publication supabase_realtime add table public.corridor_advisories;
alter publication supabase_realtime add table public.field_reports;
