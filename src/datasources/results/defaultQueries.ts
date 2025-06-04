import { ResultsProperties, ResultsPropertiesOptions } from "./types/QueryResults.types";
import { StepsProperties } from "./types/QuerySteps.types";
import { OutputType, QueryType } from "./types/types";

export const defaultResultsQuery = {
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
  orderBy: "UPDATED_AT",
  descending: true,
  recordCount: 1000,
  useTimeRange: false,
  useTimeRangeFor: undefined,
  partNumberQuery: [],
  queryBy: '',
};

export const defaultStepsQuery = {
  queryType: QueryType.Steps,
  outputType: OutputType.Data,
  properties: [
    StepsProperties.name,
    StepsProperties.status,
    StepsProperties.totalTimeInSeconds
  ] as StepsProperties[],
  orderBy: "UPDATED_AT",
  descending: true,
  recordCount: 10_000,
  useTimeRange: false,
  useTimeRangeFor: undefined,
  partNumberQuery: [],
  resultsQuery: '',
  stepsQuery: '',
  isOnlyProgramNameFilter: false,
};

