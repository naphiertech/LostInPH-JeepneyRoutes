import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  MapPin,
  ReceiptText,
  Route,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminModuleId =
  | 'overview'
  | 'analytics'
  | 'notifications'
  | 'routes'
  | 'stops'
  | 'fares'
  | 'cities'
  | 'reports'
  | 'verification'
  | 'incidents'
  | 'users'
  | 'settings';

export interface AdminNavItem {
  id: AdminModuleId;
  label: string;
  groupTitle: string;
  description: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  id: string;
  title: string;
  defaultOpen: boolean;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview-group',
    title: 'Overview',
    defaultOpen: true,
    items: [
      {
        id: 'overview',
        label: 'Network Overview',
        groupTitle: 'Overview',
        description:
          'Operational health, commuter demand trends, and priority route triage.',
        icon: Activity,
      },
      {
        id: 'analytics',
        label: 'Sales & Store Analytics',
        groupTitle: 'Overview',
        description:
          '₱199 Google Play & App Store revenue, 15% store fee payouts, conversion funnel, and regional demand charts.',
        icon: BarChart3,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        groupTitle: 'Overview',
        description:
          'Live operator toast stream, corridor alerts, store order receipts, and system events.',
        icon: Bell,
      },
    ],
  },
  {
    id: 'network-group',
    title: 'Transit network',
    defaultOpen: true,
    items: [
      {
        id: 'routes',
        label: 'Routes & Signboards',
        groupTitle: 'Transit network',
        description:
          'Audit Philippine jeepney route codes, windshield placards, and corridors.',
        icon: Route,
      },
      {
        id: 'stops',
        label: 'Terminals & Stops',
        groupTitle: 'Transit network',
        description:
          'Inspect turning bays, transfer hubs, and Para Po loading zones on map.',
        icon: MapPin,
      },
      {
        id: 'fares',
        label: 'Fare Matrices',
        groupTitle: 'Transit network',
        description:
          'Manage first-4km minimum fares, per-km rates, and 20% student/senior discounts.',
        icon: ReceiptText,
      },
      {
        id: 'cities',
        label: 'City Coverage',
        groupTitle: 'Transit network',
        description:
          'Multi-city rollout status and local boarding guidance across 5 regions.',
        icon: Building2,
      },
    ],
  },
  {
    id: 'ops-group',
    title: 'Operations & trust',
    defaultOpen: true,
    items: [
      {
        id: 'reports',
        label: 'Field Reports & Triage',
        groupTitle: 'Operations & trust',
        description:
          'Triage commuter reports using canonical workflow labels.',
        icon: ClipboardList,
      },
      {
        id: 'verification',
        label: 'Route Verification',
        groupTitle: 'Operations & trust',
        description:
          'Promote field drafts to community-verified or LTFRB-referenced status.',
        icon: ShieldCheck,
      },
      {
        id: 'incidents',
        label: 'Incident & Detour Alerts',
        groupTitle: 'Operations & trust',
        description:
          'Manage active lane repairs, market rerouting, and corridor advisories.',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'system-group',
    title: 'System',
    defaultOpen: true,
    items: [
      {
        id: 'users',
        label: 'Commuter Accounts',
        groupTitle: 'System',
        description:
          'Review platform access roles and 20% fare privilege tiers.',
        icon: Users,
      },
      {
        id: 'settings',
        label: 'Settings',
        groupTitle: 'System',
        description:
          'Configure appearance mode, default city scope, and demo data reset.',
        icon: Settings,
      },
    ],
  },
];

export function findAdminNavItem(id: AdminModuleId): AdminNavItem {
  for (const group of ADMIN_NAV_GROUPS) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found;
  }
  return ADMIN_NAV_GROUPS[0].items[0];
}
