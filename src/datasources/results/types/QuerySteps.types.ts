import { QueryBuilderField } from 'smart-webcomponents-react';
import { OutputType, ResultsQuery } from './types';

export interface QuerySteps extends ResultsQuery {
  outputType: OutputType;
  properties?: StepsProperties[];
  orderBy?: string;
  descending?: boolean;
  useTimeRange?: boolean;
  useTimeRangeFor?: string;
  recordCount?: number;
  showMeasurements?: boolean;
}

export const OrderBy = [
  {
    value: 'NAME',
    label: 'Step name',
    description: 'Name of the step',
  },
  {
    value: 'STEP_TYPE',
    label: 'Step type',
    description: 'Type of the step',
  },
  {
    value: 'STEP_ID',
    label: 'Step ID',
    description: 'ID of the step',
  },
  {
    value: 'PARENT_ID',
    label: 'Parent ID',
    description: 'ID of the parent step',
  },
  {
    value: 'RESULT_ID',
    label: 'Result ID',
    description: 'ID of the associated result',
  },
  {
    value: 'TOTAL_TIME_IN_SECONDS',
    label: 'Total time in seconds',
    description: 'Total time taken to run the step in seconds',
  },
  {
    value: 'STARTED_AT',
    label: 'Started at',
    description: 'Timestamp when the step started',
  },
  {
    value: 'UPDATED_AT',
    label: 'Updated at',
    description: 'Timestamp when the step was last updated',
  },
  {
    value: 'DATA_MODEL',
    label: 'Data model',
    description: 'Data model of the step',
  },
];

export const StepsPropertiesOptions = {
  STEP_ID: 'stepId',
  NAME: 'name',
  STEP_TYPE: 'stepType',
  PARENT_ID: 'parentId',
  RESULT_ID: 'resultId',
  STATUS: 'status',
  TOTAL_TIME_IN_SECONDS: 'totalTimeInSeconds',
  STARTED_AT: 'startedAt',
  UPDATED_AT: 'updatedAt',
  INPUTS: 'inputs',
  OUTPUTS: 'outputs',
  DATA_MODEL: 'dataModel',
  DATA: 'data',
  WORKSPACE: 'workspace',
  KEYWORDS: 'keywords',
  PROPERTIES: 'properties',
};

export enum StepsProperties {
  name = 'name',
  stepType = 'stepType',
  stepId = 'stepId',
  parentId = 'parentId',
  resultId = 'resultId',
  status = 'status',
  totalTimeInSeconds = 'totalTimeInSeconds',
  startedAt = 'startedAt',
  updatedAt = 'updatedAt',
  inputs = 'inputs',
  outputs = 'outputs',
  dataModel = 'dataModel',
  data = 'data',
  workspace = 'workspace',
  keywords = 'keywords',
  properties = 'properties',
}

export interface StatusHttp {
  statusType: string;
  statusName?: string;
};

export interface InputOutputValues {
  name: string;
  value?: string;
};

export interface StepData {
  text?: string;
  parameters?: Array<{ [key: string]: string }>;
};

export interface StepsResponseProperties {
  name?: string;
  stepType?: string;
  stepId?: string;
  parentId?: string;
  resultId?: string;
  status?: StatusHttp;
  totalTimeInSeconds?: number;
  startedAt?: string;
  updatedAt?: string;
  inputs?: InputOutputValues[];
  outputs?: InputOutputValues[];
  dataModel?: string;
  data?: StepData;
  workspace?: string;
  keywords?: string[];
  properties?: { [key: string]: string };
};

export interface QueryStepsResponse {
  steps: StepsResponseProperties[];
  continuationToken?: string;
  totalCount?: number;
  error?: ErrorBody
};

export interface ErrorBody {
  name?: string;
  code?: number;
  message?: string;
  args?: string[];
  innerErrors?: ErrorBody[];
}

export interface QueryResponse<T> {
  data: T[];
  continuationToken?: string;
  totalCount?: number;
};

export interface BatchQueryConfig {
  maxTakePerRequest: number;
  requestsPerSecond: number;
};

export interface QBField extends QueryBuilderField {
  lookup?: {
    readonly?: boolean;
    dataSource: Array<{
      label: string,
      value: string
    }>;
  },
}
