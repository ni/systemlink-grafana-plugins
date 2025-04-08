import { ResultsProperties, ResultsPropertiesOptions } from "./types/QueryResults.types";
import { StepsProperties } from "./types/QuerySteps.types";
import { OutputType } from "./types/types";

export const defaultResultsEditorValue = {
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
  orderBy: undefined,
  descending: false,
  recordCount: 1000,
  useTimeRange: false,
  useTimeRangeFor: undefined
};

export const defaultStepsEditorValue = {
  outputType: OutputType.Data,
  properties: [
    StepsProperties.name,
    StepsProperties.status,
    StepsProperties.totalTimeInSeconds
  ] as StepsProperties[],
  orderBy: undefined,
  descending: false,
  showMeasurements: false,
  recordCount: 1000,
  useTimeRange: false,
  useTimeRangeFor: undefined
};
