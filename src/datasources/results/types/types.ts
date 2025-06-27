import { DataQuery } from '@grafana/schema';

export interface ResultsQuery extends DataQuery {
  queryType?: QueryType;
}

export enum QueryType {
  Results = 'Results',
  Steps = 'Steps'
}

export const defaultResultsQueryType: QueryType = QueryType.Results;

export enum OutputType {
  Data = 'Data',
  TotalCount = 'Total Count'
}

export enum TestMeasurementStatus {
  Done = 'Done',
  Errored = 'Errored',
  Failed = 'Failed',
  Passed = 'Passed',
  Skipped = 'Skipped',
  Terminated = 'Terminated',
  TimedOut = 'Timed out',
  Custom = 'Custom',
  Looping = 'Looping',
  Running = 'Running',
  Waiting = 'Waiting',
}

export interface QueryProductResponse {
  products: ProductResponseProperties[],
  continuationToken?: string,
  totalCount?: number
}

export interface ProductResponseProperties {
  partNumber: string;
  name?: string;
}

export enum ProductProperties {
  partNumber = 'PART_NUMBER',
  name = 'NAME',
}
