import { AlertVariant } from '@grafana/ui';

export const LABEL_WIDTH = 26;
export const CONTROL_WIDTH = 65;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';

export const labels = {
  queryType: 'Query Type',
  queryBy: 'Query By',
};

export const tooltips = {
  queryType: 'This field specifies the query type to display alarms data, count or trend.',
  queryBy: 'This optional field specifies the query filters.',
};
