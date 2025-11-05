import { AlarmsQuery } from './types';

export interface ListAlarmsQuery extends AlarmsQuery {
  filter?: string;
  properties?: AlarmsProperties[];
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
  // TODO(AB-3356927): Add transition property support
  transitionOverflowCount = 'transitionOverflowCount',
  updatedAt = 'updatedAt',
  workspace = 'workspace',
}
