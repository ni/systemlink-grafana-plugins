import { DataQuery } from '@grafana/schema';

export interface ResultsQuery extends DataQuery {
  queryType: QueryType;
}

export enum QueryType {
  Results = 'Results',
  Steps = 'Steps'
}

export enum OutputType {
  Data = 'Data',
  TotalCount = 'Total Count'
}

export enum UseTimeRangeFor {
  Started = 'Started',
  Updated = 'Updated'
}
