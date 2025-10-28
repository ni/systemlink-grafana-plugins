import { AlertVariant } from '@grafana/ui';
import { AlarmsProperties } from '../types/ListAlarms.types';

export const LABEL_WIDTH = 26;
export const CONTROL_WIDTH = 65;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';

export const labels = {
  queryType: 'Query Type',
  queryBy: 'Query By',
  properties: 'Properties',
};

export const tooltips = {
  queryType: 'This field specifies the query type to display alarms data, count or trend.',
  queryBy: 'This optional field specifies the query filters.',
  properties: 'This field specifies the properties to use in the query.',
};

export const placeholders = {
  properties: 'Select the properties to query',
}

export const PROPERTIES_ERROR_MESSAGE = 'You must select at least one property.';

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
