import { DataQuery } from '@grafana/schema'

export enum QueryType {
  Summmary = "SUMMARY",
  Whatever = "WHATEVER"
}

export interface JobQuery extends DataQuery {
  type: QueryType
}

export interface JobSummary {
  activeCount: number;
  failedCount: number;
  succeededCount: number;
}