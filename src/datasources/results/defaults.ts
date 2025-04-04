import { ResultsProperties, ResultsPropertiesOptions } from "./types/QueryResults.types";
import { OutputType } from "./types/types";

export const ResultsDefaults = {
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
    outputType: OutputType.Data,
    recordCount: 1000,
};

export const StepsDefaults = {
    properties: [
        ResultsPropertiesOptions.PROGRAM_NAME,
    ] as ResultsProperties[],
    outputType: OutputType.Data,
    recordCount: 1000,
};
