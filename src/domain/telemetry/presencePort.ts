import { AuthUser } from '@/domain/auth/types';
import { CityId } from '@/domain/transit/types';

export interface AppAdoptionSnapshot {
  totalDownloads: number;
  androidDownloads: number;
  iosDownloads: number;
  webPwaInstalls: number;
  onlineNow: number;
  onlineByCity: Record<CityId, number>;
  monthlyDownloadTrend: ReadonlyArray<{
    month: string;
    android: number;
    ios: number;
  }>;
}

export interface PresencePort {
  getAdoptionSnapshot(): AppAdoptionSnapshot;
  listDirectoryAccounts(): AuthUser[];
  trackCommuterOnline(userId: string, cityId: CityId): () => void;
}
