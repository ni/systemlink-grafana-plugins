import { OutputType, ResultsQuery } from './types';

export interface QuerySteps extends ResultsQuery {
  outputType: OutputType;
  properties?: StepsProperties[];
  orderBy?: string;
  descending?: boolean;
  useTimeRange?: boolean;
  recordCount?: number;
  showMeasurements?: boolean;
  resultsQuery: string;
  stepsQuery?: string;
}

export interface QueryStepsDefaultValues extends QuerySteps {
  orderBy: string;
  descending: boolean;
  useTimeRangeFor: string;
}

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

export const stepsProjectionLabelLookup: Record<StepsProperties, {
  label: string,
  projection: StepsProperties
}> = {
  [StepsProperties.name]: {
    label: 'Step name',
    projection: StepsProperties.name
  },
  [StepsProperties.stepType]: {
    label: 'Step type',
    projection: StepsProperties.stepType
  },
  [StepsProperties.stepId]: {
    label: 'Step ID',
    projection: StepsProperties.stepId
  },
  [StepsProperties.parentId]: {
    label: 'Parent ID',
    projection: StepsProperties.parentId
  },
  [StepsProperties.resultId]: {
    label: 'Result ID',
    projection: StepsProperties.resultId
  },
  [StepsProperties.status]: {
    label: 'Status', projection: StepsProperties.status
  },
  [StepsProperties.totalTimeInSeconds]: {
    label: 'Total time (s)',
    projection: StepsProperties.totalTimeInSeconds
  },
  [StepsProperties.startedAt]: {
    label: 'Started at',
    projection: StepsProperties.startedAt
  },
  [StepsProperties.updatedAt]: {
    label: 'Updated at',
    projection: StepsProperties.updatedAt
  },
  [StepsProperties.inputs]: {
    label: 'Inputs',
    projection: StepsProperties.inputs
  },
  [StepsProperties.outputs]: {
    label: 'Outputs',
    projection: StepsProperties.outputs
  },
  [StepsProperties.dataModel]: {
    label: 'Data model',
    projection: StepsProperties.dataModel
  },
  [StepsProperties.data]: {
    label: 'Data',
    projection: StepsProperties.data
  },
  [StepsProperties.workspace]: {
    label: 'Workspace',
    projection: StepsProperties.workspace
  },
  [StepsProperties.keywords]: {
    label: 'Keywords',
    projection: StepsProperties.keywords
  },
  [StepsProperties.properties]: {
    label: 'Properties',
    projection: StepsProperties.properties
  },
}

export interface StatusHttp {
  statusType: string;
  statusName?: string;
};

export interface InputOutputValues {
  name: string;
  value?: string | number | boolean | object;
};

export interface StepData {
  text?: string;
  parameters: Array<{ [key: string]: string }>;
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

export enum StepsPathProperties {
  path = 'path'
};

export interface StepPath {
  label: string;
  value: string;
};

export interface QueryStepPathsResponse {
  paths: StepPathResponseProperties[];
  continuationToken?: string;
  totalCount?: number;
  error?: ErrorBody
};

export interface StepPathResponseProperties {
  path: string;
};
