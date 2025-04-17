import { ResultsProperties, ResultsPropertiesOptions } from "./types/QueryResults.types";
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
};
