import { QueryResults, ResultsProperties, ResultsPropertiesOptions } from "./types/QueryResults.types";
import { QuerySteps, StepsProperties } from "./types/QuerySteps.types";
import { OutputType, QueryType } from "./types/types";

export const defaultResultsQuery: Omit<QueryResults, 'refId'> = {
  queryType: QueryType.Results,
  outputType: OutputType.Data,
  properties: [
    ResultsPropertiesOptions.PROGRAM_NAME,
    ResultsPropertiesOptions.PART_NUMBER,
    ResultsPropertiesOptions.SERIAL_NUMBER,
    ResultsPropertiesOptions.STATUS,
    ResultsPropertiesOptions.HOST_NAME,
    ResultsPropertiesOptions.STARTED_AT,
    ResultsPropertiesOptions.UPDATED_AT,
    ResultsPropertiesOptions.WORKSPACE
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
  partNumberQuery: [],
  resultsQuery: '',
  stepsQuery: '',
};

