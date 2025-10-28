import { AlertVariant } from '@grafana/ui';

export const LABEL_WIDTH = 26;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';
export const MIN_TAKE = 1;
export const MAX_TAKE = 1000;
export const DEFAULT_VARIABLE_QUERY_EDITOR_TAKE = 1000;
export const DEFAULT_VARIABLE_QUERY_EDITOR_DESCENDING = true;

export const labels = {
  queryBy: 'Query By',
  descending: 'Descending',
  take: 'Take',
};

export const tooltips = {
  queryBy: 'This optional field specifies the query filters.',
  descending: 'This toggle returns the alarms query in descending order.',
  take: 'This field specifies the maximum number of alarms to return.'
};

export const takeErrorMessages = {
  minErrorMsg: `Enter a value greater than or equal to ${MIN_TAKE}`,
  maxErrorMsg: `Enter a value less than or equal to ${MAX_TAKE}`,
};

export const placeholders = {
  take: 'Enter take value',
}
