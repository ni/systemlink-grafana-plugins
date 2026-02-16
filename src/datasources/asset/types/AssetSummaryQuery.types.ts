import { AssetQuery } from './types';

export interface AssetSummaryQuery extends AssetQuery {
}

export interface AssetSummaryResponse {
  total: number;
  active: number;
  notActive: number;
  approachingRecommendedDueDate: number;
  pastRecommendedDueDate: number;
  outForCalibration: number;
}

