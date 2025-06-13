import { QueryResults, ResultsProperties } from "./types/QueryResults.types";
import { QuerySteps, StepsProperties } from "./types/QuerySteps.types";
import { OutputType, QueryType } from "./types/types";

export const defaultResultsQuery: Omit<QueryResults, 'refId'> = {
  queryType: QueryType.Results,
  outputType: OutputType.Data,
  properties: [
    ResultsProperties.programName,
    ResultsProperties.partNumber,
    ResultsProperties.serialNumber,
    ResultsProperties.status,
    ResultsProperties.hostName,
    ResultsProperties.startedAt,
    ResultsProperties.updatedAt,
    ResultsProperties.workspace,
  ] as ResultsProperties[],
  orderBy: "STARTED_AT",
  descending: true,
  recordCount: 1000,
  useTimeRange: false,
  useTimeRangeFor: undefined,
  queryBy: '',
};

export const defaultStepsQuery: Omit<QuerySteps, 'refId'> = {
  queryType: QueryType.Steps,
  outputType: OutputType.Data,
  properties: [
    StepsProperties.name,
    StepsProperties.status,
    StepsProperties.totalTimeInSeconds
  ] as StepsProperties[],
  orderBy: "STARTED_AT",
  descending: false,
  recordCount: 1000,
  useTimeRange: false,
  useTimeRangeFor: undefined,
  resultsQuery: '',
  stepsQuery: '',
};

