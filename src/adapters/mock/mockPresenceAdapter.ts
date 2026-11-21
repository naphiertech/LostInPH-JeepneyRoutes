import { AuthUser } from '@/domain/auth/types';
import {
  AppAdoptionSnapshot,
  PresencePort,
} from '@/domain/telemetry/presencePort';
import { CityId } from '@/domain/transit/types';
import {
  APP_ADOPTION_SNAPSHOT,
  DIRECTORY_ACCOUNTS,
} from './seeds/demoAccounts';

export function createMockPresenceAdapter(): PresencePort {
  const activeSessions = new Map<string, CityId>();

  return {
    getAdoptionSnapshot(): AppAdoptionSnapshot {
      const onlineByCity = { ...APP_ADOPTION_SNAPSHOT.onlineByCity };
      let extraOnline = 0;
      activeSessions.forEach((cityId) => {
        onlineByCity[cityId] = (onlineByCity[cityId] ?? 0) + 1;
        extraOnline += 1;
      });
      return {
        ...APP_ADOPTION_SNAPSHOT,
        onlineNow: APP_ADOPTION_SNAPSHOT.onlineNow + extraOnline,
        onlineByCity,
      };
    },

    listDirectoryAccounts(): AuthUser[] {
      return DIRECTORY_ACCOUNTS;
    },

    trackCommuterOnline(userId: string, cityId: CityId): () => void {
      activeSessions.set(userId, cityId);
      return () => {
        activeSessions.delete(userId);
      };
    },
  };
}
