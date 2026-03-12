import { Alarm, AlarmsQuery, TransitionInclusionOption } from './types';

export interface ListAlarmsQuery extends AlarmsQuery {
  outputType?: OutputType;
  filter?: string;
  properties?: AlarmsProperties[];
  descending?: boolean;
  take?: number;
  transitionInclusionOption?: TransitionInclusionOption;
}

export interface AlarmsQueryCache {
  requestInputs: string;
  selectedProperties: string;
  response: Alarm[];
}

export const alarmsCacheTTL = 1000 * 60 * 5;

export enum OutputType {
  Properties = 'Properties',
  TotalCount = 'Total Count',
}

export enum AlarmsSpecificProperties {
  acknowledged = 'acknowledged',
  acknowledgedAt = 'acknowledgedAt',
  acknowledgedBy = 'acknowledgedBy',
  active = 'active',
  alarmId = 'alarmId',
  channel = 'channel',
  clear = 'clear',
  condition = 'condition',
  createdBy = 'createdBy',
  currentSeverityLevel = 'currentSeverityLevel',
  description = 'description',
  displayName = 'displayName',
  highestSeverityLevel = 'highestSeverityLevel',
  instanceId = 'instanceId',
  keywords = 'keywords',
  mostRecentSetOccurredAt = 'mostRecentSetOccurredAt',
  mostRecentTransitionOccurredAt = 'mostRecentTransitionOccurredAt',
  occurredAt = 'occurredAt',
  properties = 'properties',
  resourceType = 'resourceType',
   // The Source field is derived from properties.system, with a fallback to
   // properties.minionId. If neither property is available, the source defaults to
   // an empty string.
  source = 'source',
  // The State column is determined using the values of clear and acknowledged.
  state = 'state',
  transitionOverflowCount = 'transitionOverflowCount',
  updatedAt = 'updatedAt',
  workspace = 'workspace',
}

export enum AlarmsTransitionProperties {
  transitionCondition = 'transitionCondition',
  transitionDetailText = 'transitionDetailText',
  transitionKeywords = 'transitionKeywords',
  transitionOccurredAt = 'transitionOccurredAt',
  transitionProperties = 'transitionProperties',
  transitionSeverityLevel = 'transitionSeverityLevel',
  transitionShortText = 'transitionShortText',
  transitionType = 'transitionType',
  transitionValue = 'transitionValue',
}

export type AlarmsProperties = AlarmsSpecificProperties | AlarmsTransitionProperties;

export type ComputedAlarmProperty = AlarmsSpecificProperties.state | AlarmsSpecificProperties.source;
