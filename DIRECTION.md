# LostInPH Design Direction

## Concept
LostInPH is a **Philippine Public Transportation Discovery & Operations Platform** combining a high-clarity **Split-Screen Access Gateway** (`Admin` & `App` role isolation), a calm **Transit Operations Admin Console** organized around expandable sub-modules, and a map-first commuter navigation app built around real street landmarks and windshield signboard placards.

## Visual Contract
- **No AI purple/indigo gradients or glowing blobs**: Clean `#F8F9FA` workspace frames, `#FFFFFF` cards, hairline `1px` borders, and deliberate green/amber signals.
- **Neutral sidebar chrome**: Light expandable sidebar (`#F4F5F6` / `#FFFFFF`) with neutral active pills (`#E9ECEF`), sentence-case group titles, and a mobile `48px` top bar + slide-over drawer.
- **Map-First Mobile Commuter Sheet**: Below `lg` (`1024px`), the Commuter App opens directly onto the **`Routes`** tab with live browser Geolocation (`navigator.geolocation` + manual "Set start" pin & demo city jump fallback), plotting a pulsing **"YOU"** marker on a watermark-free interactive map above a bottom-anchored draggable sheet (`rounded-t-[26px]`, 3 snap states: `peek`, `half`, `full`) and the 5-tab floating bottom dock (`Home · Routes · Plan · Track · Profile`). Tapping anywhere on the map drops a destination **Pinpoint** that runs real **`Your Location → Pinpoint`** recommendations (Direct rides first, 1-transfer fallback) with boarding/alighting stops and 1-tap `Ride` navigation. All route polylines follow real OpenStreetMap road geometry; all fare UI and fare calculators are intentionally omitted so the app stays focused on accurate routes, signboards, and stops.
- **Illustrated Transit Pass Route Cards**: Route rows and route ticket headers feature studio-rendered, alpha-transparent front-left 3/4 isometric 3D miniature sprites of Traditional Jeepneys and Modern PUVs (`public/vehicles/*.webp` with PNG fallback) staged on subtle `route.color`-tinted neutral surfaces (`color-mix` over `--surface-raised`), paired with crisp native HTML route-code pills, walking proximity badges, and live Admin-synced detour metadata across both Light and Dark themes.
- **Modular Commuter Profile & Dedicated Notification Center**: Dedicated Profile section combining identity, Home City mini-map card, weekly trip strip, saved corridors & places, local stop callout, appearance toggle, and Sign Out — plus a dedicated role-isolated Commuter Notification Center page (`CommuterNotificationsView`) with live city detours, route deep-links, and persisted alert preference toggles.
- **Motion & Interaction Craft (`emil-design-eng` + `transitions.dev`)**: Shared motion tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, `--ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1)`, durations `< 300ms`) power automatic tactile press (`scale: 0.97`), focus-visible rings, error shakes (`aria-invalid="true"`), panel/modal reveals, and accessible reduced-motion fallbacks across all current and future interactive controls.
- **Typographic KPIs & Tabular Figures**: KPI blocks use clear hierarchy (label above figure, quiet trend delta) with `tabular-nums`, right-aligned numeric columns in tables, and single-hue SVG trend charts.
- **Streamlined 6-Module Admin Operations Console**: Focused on real adoption and transit ops — `Overview & Live Pulse` (App Downloads/Installs, Users Online Now, active cities, top pinpointed corridors), `Users Directory` (registered commuters, Online/Offline live presence, Android/iOS/Web platform), tabbed `Routes & Stops` (with inline route verification promote), `Detours & Advisories`, `Commuter Reports`, and `Settings` (plus header-bell `Notifications`).
- **Unique Geometric Brand Mark & Favicon (`LostInPhLogo`)**: Custom vector emblem fusing an `L` transit corridor loop, a wayfinding compass pin, and a Jeepney roof signboard crown (`public/favicon.svg` + `<LostInPhLogo />`), replacing generic bus icons across Login, Admin, and Commuter surfaces.
- **No emoji icons in UI chrome**: Crisp `lucide-react` vector icons (`strokeWidth={1.75}`) and custom SVG map markers.

## Color System
- **Workspace Ground**: Soft Cool Neutral `#F8F9FA` (Light) / Charcoal `#0B0D10` (Dark)
- **Elevated Sheet Surface**: Pure White `#FFFFFF` (Light) / Slate `#13161B` (Dark)
- **Primary Ink**: `#111827` (Light) / `#F3F4F6` (Dark)
- **Mobility Green (`--accent`)**: `#5D9B19` (Light) / `#78BE20` (Dark) — owns primary verified indicators, Login hero framing, active route pins, and single-hue trend lines.
- **Peak & Warning Amber (`--peak`)**: `#EA580C` (Light) / `#FB923C` (Dark) — owns drop-off zones, peak congestion indicators, and triage warnings.
- **Verified Green (`--success`)**: `#15803D` (Light) / `#4ADE80` (Dark) — owns LTFRB-referenced route verification states.

## Entry & Role Isolation Flow
1. **Login First**: Opening LostInPH renders the split-screen Sign In page with form autofill, Sign-up mode, and **two** isolated demo accounts: **Admin** (`Web Operations Dashboard`) and **App** (`Commuter Navigation App`).
2. **Strict Workspace Boundary**: Signing in as **Admin** mounts only the Operations Dashboard and its collapsible sub-modules; signing in as **App** mounts only the Commuter App interface. Signing out returns directly to Login.
