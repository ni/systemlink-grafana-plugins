import { AlertVariant } from '@grafana/ui';
import { AlarmsProperties } from '../types/ListAlarms.types';

export const LABEL_WIDTH = 26;
export const CONTROL_WIDTH = 65;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';
export const QUERY_EDITOR_MIN_TAKE = 1;
export const QUERY_EDITOR_MAX_TAKE = 10000;
export const DEFAULT_QUERY_EDITOR_TAKE = 1000;
export const DEFAULT_QUERY_EDITOR_DESCENDING = true;

export const ALARMS_TIME_FIELDS = [
  AlarmsProperties.occurredAt,
  AlarmsProperties.acknowledgedAt,
  AlarmsProperties.mostRecentSetOccurredAt,
  AlarmsProperties.mostRecentTransitionOccurredAt,
  AlarmsProperties.updatedAt,
];

export const labels = {
  queryType: 'Query Type',
  queryBy: 'Query By',
  properties: 'Properties',
  descending: 'Descending',
  take: 'Take',
  groupBySeverity: 'Group by severity',
};

export const tooltips = {
  queryType: 'This field specifies the query type to display alarms data, count or trend.',
  queryBy: 'This optional field specifies the query filters.',
  properties: 'This field specifies the properties to use in the query.',
  descending: 'This toggle returns the alarms query in descending order.',
  take: 'This field specifies the maximum number of alarms to return.',
  groupBySeverity: 'This toggle returns the alarms trend grouped by severity.',
};

export const takeErrorMessages = {
  minErrorMsg: `Enter a value greater than or equal to ${QUERY_EDITOR_MIN_TAKE.toLocaleString()}`,
  maxErrorMsg: `Enter a value less than or equal to ${QUERY_EDITOR_MAX_TAKE.toLocaleString()}`,
};

export const PROPERTIES_ERROR_MESSAGE = 'You must select at least one property.';

export const placeholders = {
  take: 'Enter take value',
  properties: 'Select the properties to query',
}

export const AlarmsPropertiesOptions: Record<
  AlarmsProperties,
  {
    label: string;
    value: AlarmsProperties;
  }
> = {
  [AlarmsProperties.acknowledged]: {
    label: 'Acknowledged',
    value: AlarmsProperties.acknowledged,
  },
  [AlarmsProperties.acknowledgedBy]: {
    label: 'Acknowledged by',
    value: AlarmsProperties.acknowledgedBy,
  },
  [AlarmsProperties.acknowledgedAt]: {
    label: 'Acknowledged on',
    value: AlarmsProperties.acknowledgedAt,
  },
  [AlarmsProperties.active]: {
    label: 'Active',
    value: AlarmsProperties.active,
  },
  [AlarmsProperties.alarmId]: {
    label: 'Alarm ID',
    value: AlarmsProperties.alarmId,
  },
  [AlarmsProperties.displayName]: {
    label: 'Alarm name',
    value: AlarmsProperties.displayName,
  },
  [AlarmsProperties.channel]: {
    label: 'Channel',
    value: AlarmsProperties.channel,
  },
  [AlarmsProperties.clear]: {
    label: 'Clear',
    value: AlarmsProperties.clear,
  },
  [AlarmsProperties.condition]: {
    label: 'Condition',
    value: AlarmsProperties.condition,
  },
  [AlarmsProperties.createdBy]: {
    label: 'Created by',
    value: AlarmsProperties.createdBy,
  },
  [AlarmsProperties.currentSeverityLevel]: {
    label: 'Current severity',
    value: AlarmsProperties.currentSeverityLevel,
  },
  [AlarmsProperties.description]: {
    label: 'Description',
    value: AlarmsProperties.description,
  },
  [AlarmsProperties.occurredAt]: {
    label: 'First occurrence',
    value: AlarmsProperties.occurredAt,
  },
  [AlarmsProperties.highestSeverityLevel]: {
    label: 'Highest severity',
    value: AlarmsProperties.highestSeverityLevel,
  },
  [AlarmsProperties.instanceId]: {
    label: 'Instance ID',
    value: AlarmsProperties.instanceId,
  },
  [AlarmsProperties.keywords]: {
    label: 'Keywords',
    value: AlarmsProperties.keywords,
  },
  [AlarmsProperties.mostRecentSetOccurredAt]: {
    label: 'Last occurrence',
    value: AlarmsProperties.mostRecentSetOccurredAt,
  },
  [AlarmsProperties.mostRecentTransitionOccurredAt]: {
    label: 'Last transition occurrence',
    value: AlarmsProperties.mostRecentTransitionOccurredAt,
  },
  [AlarmsProperties.properties]: {
    label: 'Properties',
    value: AlarmsProperties.properties,
  },
  [AlarmsProperties.resourceType]: {
    label: 'Resource type',
    value: AlarmsProperties.resourceType,
  },
  [AlarmsProperties.source]: {
    label: 'Source',
    value: AlarmsProperties.source,
  },
  [AlarmsProperties.state]: {
    label: 'State',
    value: AlarmsProperties.state,
  },
  [AlarmsProperties.transitionOverflowCount]: {
    label: 'Transition overflow count',
    value: AlarmsProperties.transitionOverflowCount,
  },
  [AlarmsProperties.updatedAt]: {
    label: 'Updated',
    value: AlarmsProperties.updatedAt,
  },
  [AlarmsProperties.workspace]: {
    label: 'Workspace',
    value: AlarmsProperties.workspace,
  },
}
