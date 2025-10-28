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
  source = 'source',
  state = 'state',
  transitionOverflowCount = 'transitionOverflowCount',
  updatedAt = 'updatedAt',
  workspace = 'workspace',
}
