import { DataQuery } from '@grafana/schema'
import { AssetQueryType } from './types';

export interface AssetSummaryQuery extends DataQuery {
  queryType: AssetQueryType;
}

export interface AssetSummaryResponse extends DataQuery {
  total: number;
  active: number;
  notActive: number;
  approachingRecommendedDueDate: number;
  pastRecommendedDueDate: number;
}

