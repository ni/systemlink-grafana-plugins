import { DataQuery } from '@grafana/schema'

export interface AssetSummaryQuery extends DataQuery {
    total: number;
    active: number;
    notActive: number;
    approachingRecommendedDueDate: number;
    pastRecommendedDueDate: number;
  }
