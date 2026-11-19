# LostInPH Design Direction

## Concept
LostInPH is a **Philippine Public Transportation Discovery & Operations Platform** combining a high-clarity **Split-Screen Access Gateway** (`Admin` & `App` role isolation), a calm **Transit Operations Admin Console** organized around expandable sub-modules, and a map-first commuter navigation app built around real street landmarks and windshield signboard placards.

## Visual Contract
- **No AI purple/indigo gradients or glowing blobs**: Clean `#F8F9FA` workspace frames, `#FFFFFF` cards, hairline `1px` borders, and deliberate green/amber signals.
- **Neutral sidebar chrome**: Light expandable sidebar (`#F4F5F6` / `#FFFFFF`) with neutral active pills (`#E9ECEF`), sentence-case group titles, and a mobile `48px` top bar + slide-over drawer.
- **Map-First Mobile Commuter Sheet**: Below `lg` (`1024px`), the Commuter App renders one unified top contextual bar (`[City Pill] [GPS] ... [Alert] [Avatar -> Profile]`, zero top-bar `Sign out` button) above a clean watermark-free interactive map and a bottom-anchored draggable sheet (`rounded-t-[26px]`, 3 snap states: `peek` headroom bar revealing the whole route map, `half` default, and `full` expanded, with zero dead gap above the floating bottom dock `Routes` · `Plan` · `Track` · `Profile`). Tapping anywhere on the map drops a **Map Pinpoint** that highlights matching corridors on the map and splits the `Routes` sheet into **Recommended near pinpoint** (top) and **Other city routes** (below). All route and trip-leg polylines follow real OpenStreetMap road geometry rather than straight stop-to-stop zigzags.
- **Illustrated Transit Pass Route Cards**: Route rows and route ticket headers feature studio-rendered, alpha-transparent front-left 3/4 isometric 3D miniature sprites of Traditional Jeepneys and Modern PUVs (`public/vehicles/*.webp` with PNG fallback) staged on subtle `route.color`-tinted neutral surfaces (`color-mix` over `--surface-raised`), paired with crisp native HTML route-code pills and live Admin-synced fare/detour metadata across both Light and Dark themes.
- **Modular Commuter Profile**: Dedicated Profile section combining identity, Home City mini-map card, weekly trip strip, Fare Discount Pass selector, saved corridors & places, local etiquette phrases, appearance toggle, and Sign Out.
- **Motion & Interaction Craft (`emil-design-eng` + `transitions.dev`)**: Shared motion tokens (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, `--ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1)`, durations `< 300ms`) power automatic tactile press (`scale: 0.97`), focus-visible rings, error shakes (`aria-invalid="true"`), panel/modal reveals, and accessible reduced-motion fallbacks across all current and future interactive controls.
- **Typographic KPIs & Tabular Figures**: KPI blocks use clear hierarchy (label above figure, quiet trend delta) with `tabular-nums`, right-aligned numeric columns in tables, and single-hue SVG trend charts.
- **Commercial Store & Ridership Analytics (`₱199` App Store / Google Play)**: Dedicated `Sales & Store Analytics` Admin sub-module tracking `₱199` paid unit sales across Google Play and Apple App Store, Gross vs. Net PHP payout (15% Small Business vs. 30% fee tiers), conversion funnels, regional city sales attribution, interactive pricing simulation, and CSV export.
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
