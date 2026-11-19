import {
  CommunityReport,
  NewFieldReportInput,
  TransitStoreSnapshot,
} from './types';

export interface TransitStorePort {
  loadSnapshot(): TransitStoreSnapshot;
  saveSnapshot(snapshot: TransitStoreSnapshot): void;
  resetSnapshot(): TransitStoreSnapshot;
  submitFieldReport(input: NewFieldReportInput): CommunityReport;
}
