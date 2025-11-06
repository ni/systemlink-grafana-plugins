import { AlarmsQuery, TransitionInclusionOption } from './types';

export interface ListAlarmsQuery extends AlarmsQuery {
  filter?: string;
  properties?: AlarmsProperties[];
  descending?: boolean;
  take?: number;
  transitionInclusionOption?: TransitionInclusionOption;
}

export enum AlarmsProperties {
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
  transitionCondition = 'transitionCondition',
  transitionDetailText = 'transitionDetailText',
  transitionKeywords = 'transitionKeywords',
  transitionOccurredAt = 'transitionOccurredAt',
  transitionOverflowCount = 'transitionOverflowCount',
  transitionProperties = 'transitionProperties',
  transitionSeverityLevel = 'transitionSeverityLevel',
  transitionShortText = 'transitionShortText',
  transitionType = 'transitionType',
  transitionValue = 'transitionValue',
  updatedAt = 'updatedAt',
  workspace = 'workspace',
}
