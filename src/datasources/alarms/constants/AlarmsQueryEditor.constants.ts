import { AlertVariant } from '@grafana/ui';
import { AlarmsProperties, ComputedAlarmProperty, NonTransitionAlarmProperty, TransitionAlarmProperty } from '../types/ListAlarms.types';
import { Alarm, AlarmTransition, TransitionInclusionOption } from '../types/types';

export const LABEL_WIDTH = 26;
export const CONTROL_WIDTH = 65;
export const SECONDARY_LABEL_WIDTH = 20;
export const SECONDARY_CONTROL_WIDTH = 26;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';
export const QUERY_EDITOR_MIN_TAKE = 1;
export const QUERY_EDITOR_MAX_TAKE = 10000;
export const DEFAULT_QUERY_EDITOR_TAKE = 1000;
export const DEFAULT_QUERY_EDITOR_DESCENDING = true;
export const DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION = TransitionInclusionOption.None;

export const ALARMS_TIME_FIELDS = [
  AlarmsProperties.occurredAt,
  AlarmsProperties.acknowledgedAt,
  AlarmsProperties.mostRecentSetOccurredAt,
  AlarmsProperties.mostRecentTransitionOccurredAt,
  AlarmsProperties.updatedAt,
  AlarmsProperties.transitionOccurredAt,
];

export const labels = {
  queryType: 'Query Type',
  queryBy: 'Query By',
  properties: 'Properties',
  descending: 'Descending',
  take: 'Take',
  transitionInclusion: 'Include Transition',
};

export const tooltips = {
  queryType: 'This field specifies the query type to display alarms data, count or trend.',
  queryBy: 'This optional field specifies the query filters.',
  properties: 'This field specifies the properties to use in the query.',
  descending: 'This toggle returns the alarms query in descending order.',
  take: 'This field specifies the maximum number of alarms to return.',
  transitionInclusion: 'This field specifies whether to include all transitions, only the most recent, or none.',
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
  [AlarmsProperties.transitionCondition]: {
    label: 'Transition condition',
    value: AlarmsProperties.transitionCondition,
  },
  [AlarmsProperties.transitionDetailText]: {
    label: 'Transition detail',
    value: AlarmsProperties.transitionDetailText,
  },
  [AlarmsProperties.transitionKeywords]: {
    label: 'Transition keywords',
    value: AlarmsProperties.transitionKeywords,
  },
  [AlarmsProperties.transitionOccurredAt]: {
    label: 'Transition occurred at',
    value: AlarmsProperties.transitionOccurredAt,
  },
  [AlarmsProperties.transitionProperties]: {
    label: 'Transition properties',
    value: AlarmsProperties.transitionProperties,
  },
  [AlarmsProperties.transitionSeverityLevel]: {
    label: 'Transition severity',
    value: AlarmsProperties.transitionSeverityLevel,
  },
  [AlarmsProperties.transitionShortText]: {
    label: 'Transition short text',
    value: AlarmsProperties.transitionShortText,
  },
  [AlarmsProperties.transitionType]: {
    label: 'Transition type',
    value: AlarmsProperties.transitionType,
  },
  [AlarmsProperties.transitionValue]: {
    label: 'Transition value',
    value: AlarmsProperties.transitionValue,
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

export const AlarmsTransitionInclusionOptions: Record<
  TransitionInclusionOption,
  {
    label: string;
    value: TransitionInclusionOption;
  }
> = {
  [TransitionInclusionOption.None]: {
    label: 'None',
    value: TransitionInclusionOption.None,
  },
  [TransitionInclusionOption.MostRecentOnly]: {
    label: 'Most recent only',
    value: TransitionInclusionOption.MostRecentOnly,
  },
  [TransitionInclusionOption.All]: {
    label: 'All',
    value: TransitionInclusionOption.All,
  },
};

export const TRANSITION_SPECIFIC_PROPERTIES = [
  AlarmsProperties.transitionCondition,
  AlarmsProperties.transitionDetailText,
  AlarmsProperties.transitionKeywords,
  AlarmsProperties.transitionOccurredAt,
  AlarmsProperties.transitionProperties,
  AlarmsProperties.transitionSeverityLevel,
  AlarmsProperties.transitionShortText,
  AlarmsProperties.transitionType,
  AlarmsProperties.transitionValue,
] as const;

export const TransitionPropertyKeyMap: Record<
  TransitionAlarmProperty,
  keyof AlarmTransition
> = {
  [AlarmsProperties.transitionCondition]: 'condition',
  [AlarmsProperties.transitionDetailText]: 'detailText',
  [AlarmsProperties.transitionKeywords]: 'keywords',
  [AlarmsProperties.transitionOccurredAt]: 'occurredAt',
  [AlarmsProperties.transitionProperties]: 'properties',
  [AlarmsProperties.transitionSeverityLevel]: 'severityLevel',
  [AlarmsProperties.transitionShortText]: 'shortText',
  [AlarmsProperties.transitionType]: 'transitionType',
  [AlarmsProperties.transitionValue]: 'value',
};

export const AlarmPropertyKeyMap: Record<
  Exclude<NonTransitionAlarmProperty, ComputedAlarmProperty>,
  keyof Alarm
> = {
  [AlarmsProperties.acknowledged]: 'acknowledged',
  [AlarmsProperties.acknowledgedAt]: 'acknowledgedAt',
  [AlarmsProperties.acknowledgedBy]: 'acknowledgedBy',
  [AlarmsProperties.active]: 'active',
  [AlarmsProperties.alarmId]: 'alarmId',
  [AlarmsProperties.channel]: 'channel',
  [AlarmsProperties.clear]: 'clear',
  [AlarmsProperties.condition]: 'condition',
  [AlarmsProperties.createdBy]: 'createdBy',
  [AlarmsProperties.currentSeverityLevel]: 'currentSeverityLevel',
  [AlarmsProperties.description]: 'description',
  [AlarmsProperties.displayName]: 'displayName',
  [AlarmsProperties.highestSeverityLevel]: 'highestSeverityLevel',
  [AlarmsProperties.instanceId]: 'instanceId',
  [AlarmsProperties.keywords]: 'keywords',
  [AlarmsProperties.mostRecentSetOccurredAt]: 'mostRecentSetOccurredAt',
  [AlarmsProperties.mostRecentTransitionOccurredAt]: 'mostRecentTransitionOccurredAt',
  [AlarmsProperties.occurredAt]: 'occurredAt',
  [AlarmsProperties.properties]: 'properties',
  [AlarmsProperties.resourceType]: 'resourceType',
  [AlarmsProperties.transitionOverflowCount]: 'transitionOverflowCount',
  [AlarmsProperties.updatedAt]: 'updatedAt',
  [AlarmsProperties.workspace]: 'workspace',
};
