import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from './types';

export interface TransitStorePort {
  getCachedSnapshot(): TransitStoreSnapshot;
  loadSnapshot(): Promise<TransitStoreSnapshot>;
  saveSnapshot(snapshot: TransitStoreSnapshot): Promise<void>;
  resetSnapshot(): Promise<TransitStoreSnapshot>;
  submitFieldReport(input: NewFieldReportInput): Promise<CommunityReport>;
  subscribe(listener: (snapshot: TransitStoreSnapshot) => void): () => void;
}
