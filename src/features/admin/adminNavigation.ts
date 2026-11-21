import {
  Activity,
  AlertTriangle,
  Bell,
  ClipboardList,
  History,
  Route,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminModuleId =
  | 'overview'
  | 'users'
  | 'routes'
  | 'qa'
  | 'incidents'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'notifications';

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
    id: 'pulse-group',
    title: 'Overview',
    defaultOpen: true,
    items: [
      {
        id: 'overview',
        label: 'Overview & Live Pulse',
        groupTitle: 'Overview',
        description:
          'App downloads, live online commuters, active cities, and top pinpointed jeepney corridors.',
        icon: Activity,
      },
      {
        id: 'users',
        label: 'Users Directory',
        groupTitle: 'Overview',
        description:
          'Registered commuters, live online presence, platform breakdown, and account access.',
        icon: Users,
      },
    ],
  },
  {
    id: 'transit-group',
    title: 'Transit & alerts',
    defaultOpen: true,
    items: [
      {
        id: 'routes',
        label: 'Routes & Stops',
        groupTitle: 'Transit & alerts',
        description:
          'Manage jeepney codes, windshield signboards, verification badges, bulk JSON imports, and mapped stops.',
        icon: Route,
      },
      {
        id: 'qa',
        label: 'Route QA & Simulator',
        groupTitle: 'Transit & alerts',
        description:
          'Automated data integrity checks and Origin-to-Pinpoint jeepney recommendation simulator.',
        icon: ShieldCheck,
      },
      {
        id: 'incidents',
        label: 'Detours & Advisories',
        groupTitle: 'Transit & alerts',
        description:
          'Publish active lane repairs, rerouting notices, and live corridor advisories to commuters.',
        icon: AlertTriangle,
      },
      {
        id: 'reports',
        label: 'Commuter Reports',
        groupTitle: 'Transit & alerts',
        description:
          'Triage rider-submitted landmark, detour, and new stop tips with 1-click advisory conversion.',
        icon: ClipboardList,
      },
    ],
  },
  {
    id: 'system-group',
    title: 'System',
    defaultOpen: true,
    items: [
      {
        id: 'audit',
        label: 'Audit & Activity Log',
        groupTitle: 'System',
        description:
          'Chronological trail of route edits, verifications, detours, and commuter submissions.',
        icon: History,
      },
      {
        id: 'settings',
        label: 'Settings',
        groupTitle: 'System',
        description:
          'Configure appearance mode, brand assets, and local demo dataset maintenance.',
        icon: Settings,
      },
    ],
  },
];

const EXTRA_ADMIN_MODULES: Record<'notifications', AdminNavItem> = {
  notifications: {
    id: 'notifications',
    label: 'Notifications',
    groupTitle: 'Alerts',
    description:
      'Live operator toast stream, corridor alerts, commuter surges, and system events.',
    icon: Bell,
  },
};

export function findAdminNavItem(id: AdminModuleId): AdminNavItem {
  if (id === 'notifications') {
    return EXTRA_ADMIN_MODULES.notifications;
  }
  for (const group of ADMIN_NAV_GROUPS) {
    const found = group.items.find((item) => item.id === id);
    if (found) return found;
  }
  return ADMIN_NAV_GROUPS[0].items[0];
}
