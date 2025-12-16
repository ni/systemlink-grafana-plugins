import { AlertVariant, ComboboxOption } from '@grafana/ui';
import { AlarmsProperties, AlarmsSpecificProperties, AlarmsTransitionProperties, ComputedAlarmProperty } from '../types/ListAlarms.types';
import { Alarm, AlarmTransition, QueryType, TransitionInclusionOption } from '../types/types';

export const LABEL_WIDTH = 26;
export const CONTROL_WIDTH = 65;
export const SECONDARY_LABEL_WIDTH = 20;
export const SECONDARY_CONTROL_WIDTH = 26;
export const ERROR_SEVERITY_WARNING: AlertVariant = 'warning';
export const QUERY_EDITOR_MIN_TAKE = 1;
export const QUERY_EDITOR_MAX_TAKE = 10000;
export const QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL = 500;
export const DEFAULT_QUERY_EDITOR_TAKE = 1000;
export const DEFAULT_QUERY_EDITOR_DESCENDING = true;
export const DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION = TransitionInclusionOption.None;

export const ALARMS_TIME_FIELDS = [
  AlarmsSpecificProperties.occurredAt,
  AlarmsSpecificProperties.acknowledgedAt,
  AlarmsSpecificProperties.mostRecentSetOccurredAt,
  AlarmsSpecificProperties.mostRecentTransitionOccurredAt,
  AlarmsSpecificProperties.updatedAt,
  AlarmsTransitionProperties.transitionOccurredAt,
];

export const labels = {
  queryType: 'Query Type',
  outputType: 'Output',
  queryBy: 'Query By',
  properties: 'Properties',
  descending: 'Descending',
  take: 'Take',
  groupBySeverity: 'Group By Severity',
  transitionInclusion: 'Transitions',
};

export const tooltips = {
  queryType: 'This field specifies the query type for a query that displays data or trends about alarms.',
  outputType: 'This field specifies the output type for a query to return the properties or the total count of alarms.',
  queryBy: 'This optional field specifies the query filters.',
  properties: 'This field specifies the properties to use in the query.',
  descending: 'This toggle returns the alarms query in descending order.',
  take: 'This field specifies the maximum number of alarms to return.',
  groupBySeverity: 'This toggle groups alarm trends by severity.',
  transitionInclusion: 'This field specifies whether to include no transitions, only the most recent transitions, or all transitions in the alarm query.',
};

export const queryTypeOptions: ComboboxOption[] = [
  {
    label: QueryType.ListAlarms,
    value: QueryType.ListAlarms,
    description: 'List alarms allows you to search alarms based on various filters.'
  },
  {
    label: QueryType.AlarmTrend,
    value: QueryType.AlarmTrend,
    description: 'Alarm trend allows you to visualize active alarm trends over time.'
  },
];

export const takeErrorMessages = {
  minErrorMsg: `Enter a value greater than or equal to ${QUERY_EDITOR_MIN_TAKE.toLocaleString()}.`,
  maxErrorMsg: `Enter a value less than or equal to ${QUERY_EDITOR_MAX_TAKE.toLocaleString()}.`,
  transitionAllMaxTakeErrorMsg: `Enter a value less than or equal to ${QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL.toLocaleString()}.`,
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
  [AlarmsSpecificProperties.acknowledged]: {
    label: 'Acknowledged',
    value: AlarmsSpecificProperties.acknowledged,
  },
  [AlarmsSpecificProperties.acknowledgedBy]: {
    label: 'Acknowledged by',
    value: AlarmsSpecificProperties.acknowledgedBy,
  },
  [AlarmsSpecificProperties.acknowledgedAt]: {
    label: 'Acknowledged on',
    value: AlarmsSpecificProperties.acknowledgedAt,
  },
  [AlarmsSpecificProperties.active]: {
    label: 'Active',
    value: AlarmsSpecificProperties.active,
  },
  [AlarmsSpecificProperties.alarmId]: {
    label: 'Alarm ID',
    value: AlarmsSpecificProperties.alarmId,
  },
  [AlarmsSpecificProperties.displayName]: {
    label: 'Alarm name',
    value: AlarmsSpecificProperties.displayName,
  },
  [AlarmsSpecificProperties.channel]: {
    label: 'Channel',
    value: AlarmsSpecificProperties.channel,
  },
  [AlarmsSpecificProperties.clear]: {
    label: 'Clear',
    value: AlarmsSpecificProperties.clear,
  },
  [AlarmsSpecificProperties.condition]: {
    label: 'Condition',
    value: AlarmsSpecificProperties.condition,
  },
  [AlarmsSpecificProperties.createdBy]: {
    label: 'Created by',
    value: AlarmsSpecificProperties.createdBy,
  },
  [AlarmsSpecificProperties.currentSeverityLevel]: {
    label: 'Current severity',
    value: AlarmsSpecificProperties.currentSeverityLevel,
  },
  [AlarmsSpecificProperties.description]: {
    label: 'Description',
    value: AlarmsSpecificProperties.description,
  },
  [AlarmsSpecificProperties.occurredAt]: {
    label: 'First occurrence',
    value: AlarmsSpecificProperties.occurredAt,
  },
  [AlarmsSpecificProperties.highestSeverityLevel]: {
    label: 'Highest severity',
    value: AlarmsSpecificProperties.highestSeverityLevel,
  },
  [AlarmsSpecificProperties.instanceId]: {
    label: 'Instance ID',
    value: AlarmsSpecificProperties.instanceId,
  },
  [AlarmsSpecificProperties.keywords]: {
    label: 'Keywords',
    value: AlarmsSpecificProperties.keywords,
  },
  [AlarmsSpecificProperties.mostRecentSetOccurredAt]: {
    label: 'Last occurrence',
    value: AlarmsSpecificProperties.mostRecentSetOccurredAt,
  },
  [AlarmsSpecificProperties.mostRecentTransitionOccurredAt]: {
    label: 'Last transition occurrence',
    value: AlarmsSpecificProperties.mostRecentTransitionOccurredAt,
  },
  [AlarmsSpecificProperties.properties]: {
    label: 'Properties',
    value: AlarmsSpecificProperties.properties,
  },
  [AlarmsSpecificProperties.resourceType]: {
    label: 'Resource type',
    value: AlarmsSpecificProperties.resourceType,
  },
  [AlarmsSpecificProperties.source]: {
    label: 'Source',
    value: AlarmsSpecificProperties.source,
  },
  [AlarmsSpecificProperties.state]: {
    label: 'State',
    value: AlarmsSpecificProperties.state,
  },
  [AlarmsTransitionProperties.transitionCondition]: {
    label: 'Transition condition',
    value: AlarmsTransitionProperties.transitionCondition,
  },
  [AlarmsTransitionProperties.transitionDetailText]: {
    label: 'Transition detail',
    value: AlarmsTransitionProperties.transitionDetailText,
  },
  [AlarmsTransitionProperties.transitionKeywords]: {
    label: 'Transition keywords',
    value: AlarmsTransitionProperties.transitionKeywords,
  },
  [AlarmsTransitionProperties.transitionOccurredAt]: {
    label: 'Transition occurred at',
    value: AlarmsTransitionProperties.transitionOccurredAt,
  },
  [AlarmsSpecificProperties.transitionOverflowCount]: {
    label: 'Transition overflow count',
    value: AlarmsSpecificProperties.transitionOverflowCount,
  },
  [AlarmsTransitionProperties.transitionProperties]: {
    label: 'Transition properties',
    value: AlarmsTransitionProperties.transitionProperties,
  },
  [AlarmsTransitionProperties.transitionSeverityLevel]: {
    label: 'Transition severity',
    value: AlarmsTransitionProperties.transitionSeverityLevel,
  },
  [AlarmsTransitionProperties.transitionShortText]: {
    label: 'Transition short text',
    value: AlarmsTransitionProperties.transitionShortText,
  },
  [AlarmsTransitionProperties.transitionType]: {
    label: 'Transition type',
    value: AlarmsTransitionProperties.transitionType,
  },
  [AlarmsTransitionProperties.transitionValue]: {
    label: 'Transition value',
    value: AlarmsTransitionProperties.transitionValue,
  },
  [AlarmsSpecificProperties.updatedAt]: {
    label: 'Updated',
    value: AlarmsSpecificProperties.updatedAt,
  },
  [AlarmsSpecificProperties.workspace]: {
    label: 'Workspace',
    value: AlarmsSpecificProperties.workspace,
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

export const TRANSITION_SPECIFIC_PROPERTIES = Object.values(AlarmsTransitionProperties);

export const TransitionPropertyKeyMap: Record<
  AlarmsTransitionProperties,
  keyof AlarmTransition
> = {
  [AlarmsTransitionProperties.transitionCondition]: 'condition',
  [AlarmsTransitionProperties.transitionDetailText]: 'detailText',
  [AlarmsTransitionProperties.transitionKeywords]: 'keywords',
  [AlarmsTransitionProperties.transitionOccurredAt]: 'occurredAt',
  [AlarmsTransitionProperties.transitionProperties]: 'properties',
  [AlarmsTransitionProperties.transitionSeverityLevel]: 'severityLevel',
  [AlarmsTransitionProperties.transitionShortText]: 'shortText',
  [AlarmsTransitionProperties.transitionType]: 'transitionType',
  [AlarmsTransitionProperties.transitionValue]: 'value',
};

export const AlarmPropertyKeyMap: Record<
  Exclude<AlarmsSpecificProperties, ComputedAlarmProperty>,
  keyof Alarm
> = {
  [AlarmsSpecificProperties.acknowledged]: 'acknowledged',
  [AlarmsSpecificProperties.acknowledgedAt]: 'acknowledgedAt',
  [AlarmsSpecificProperties.acknowledgedBy]: 'acknowledgedBy',
  [AlarmsSpecificProperties.active]: 'active',
  [AlarmsSpecificProperties.alarmId]: 'alarmId',
  [AlarmsSpecificProperties.channel]: 'channel',
  [AlarmsSpecificProperties.clear]: 'clear',
  [AlarmsSpecificProperties.condition]: 'condition',
  [AlarmsSpecificProperties.createdBy]: 'createdBy',
  [AlarmsSpecificProperties.currentSeverityLevel]: 'currentSeverityLevel',
  [AlarmsSpecificProperties.description]: 'description',
  [AlarmsSpecificProperties.displayName]: 'displayName',
  [AlarmsSpecificProperties.highestSeverityLevel]: 'highestSeverityLevel',
  [AlarmsSpecificProperties.instanceId]: 'instanceId',
  [AlarmsSpecificProperties.keywords]: 'keywords',
  [AlarmsSpecificProperties.mostRecentSetOccurredAt]: 'mostRecentSetOccurredAt',
  [AlarmsSpecificProperties.mostRecentTransitionOccurredAt]: 'mostRecentTransitionOccurredAt',
  [AlarmsSpecificProperties.occurredAt]: 'occurredAt',
  [AlarmsSpecificProperties.properties]: 'properties',
  [AlarmsSpecificProperties.resourceType]: 'resourceType',
  [AlarmsSpecificProperties.transitionOverflowCount]: 'transitionOverflowCount',
  [AlarmsSpecificProperties.updatedAt]: 'updatedAt',
  [AlarmsSpecificProperties.workspace]: 'workspace',
};
