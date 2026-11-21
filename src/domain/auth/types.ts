import { CityId, DiscountType, SavedPlace } from '../transit/types';

export type AccountRole = 'admin' | 'app';

export type AppPlatform = 'android' | 'ios' | 'web';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  homeCity: CityId;
  discountType: DiscountType;
  avatarInitials: string;
  badgeLabel: string;
  savedPlaces: SavedPlace[];
  savedRouteIds: string[];
  tripsCompleted: number;
  status: 'active' | 'pending_verification';
  isOnline?: boolean;
  lastSeenLabel?: string;
  platform?: AppPlatform;
  joinedAt?: string;
}

export interface DemoAccount extends AuthUser {
  password: string;
  shortLabel: 'Admin' | 'App';
  workspaceSummary: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  homeCity: CityId;
  discountType: DiscountType;
  role: AccountRole;
}

export interface AuthSession {
  user: AuthUser;
  remembered: boolean;
  authenticatedAt: string;
}
