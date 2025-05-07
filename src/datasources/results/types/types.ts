import { DataQuery, DataSourceJsonData } from '@grafana/schema';

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

export interface ResultsFeatureToggles {
  queryByResults: boolean;
  queryBySteps: boolean;
}

export interface ResultsDataSourceOptions extends DataSourceJsonData {
  featureToggles: ResultsFeatureToggles;
}

export const ResultsFeatureTogglesDefaults: ResultsFeatureToggles = {
  queryByResults: true,
  queryBySteps: true
}

export enum TestMeasurementStatus {
  Done = 'DONE',
  Errored = 'ERRORED',
  Failed = 'FAILED',
  Passed = 'PASSED',
  Skipped = 'SKIPPED',
  Terminated = 'TERMINATED',
  TimedOut = 'TIMED_OUT',
  Custom = 'CUSTOM',
  Looping = 'LOOPING',
  Running = 'RUNNING',
  Waiting = 'WAITING',
}
