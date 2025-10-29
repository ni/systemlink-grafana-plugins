import { DataFrameDTO, DataQueryRequest, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsProperties, ListAlarmsQuery } from '../../types/ListAlarms.types';
import { Alarm, AlarmsVariableQuery, AlarmTransitionType, QueryAlarmsRequest } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { AlarmsPropertiesOptions } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { MINION_ID_CUSTOM_PROPERTY, SYSTEM_CUSTOM_PROPERTY } from 'datasources/alarms/constants/SourceProperties.constants';
const sampleAlarm: Alarm = {
  instanceId: 'INST-001',
  alarmId: 'ALARM-001',
  workspace: 'Lab-1',
  active: true,
  clear: false,
  acknowledged: true,
  acknowledgedAt: '2025-09-16T10:30:00Z',
  acknowledgedBy: 'user123',
  occurredAt: '2025-09-16T09:00:00Z',
  updatedAt: '2025-09-16T10:29:00Z',
  createdBy: 'admin',
  transitions: [
    {
      transitionType: AlarmTransitionType.Set,
      occurredAt: '2025-09-16T09:00:00Z',
      severityLevel: 3,
      value: 'High',
      condition: 'Temperature',
      shortText: 'Temp High',
      detailText: 'Temperature exceeded threshold',
      keywords: ['temperature', 'high'],
      properties: {
        sensorId: 'SENSOR-12',
      },
    },
    {
      transitionType: AlarmTransitionType.Clear,
      occurredAt: '2025-09-16T09:00:00Z',
      severityLevel: 3,
      value: 'High',
      condition: 'Temperature',
      shortText: 'Temp High',
      detailText: 'Temperature exceeded threshold',
      keywords: ['temperature', 'high'],
      properties: {
        sensorId: 'SENSOR-12',
      },
    },
  ],
  transitionOverflowCount: 0,
  currentSeverityLevel: 3,
  highestSeverityLevel: 3,
  mostRecentSetOccurredAt: '2025-09-16T09:00:00Z',
  mostRecentTransitionOccurredAt: '2025-09-16T10:00:00Z',
  channel: 'Main',
  condition: 'Temperature',
  displayName: 'High Temperature Alarm',
  description: 'Alarm triggered when temperature exceeds safe limit.',
  keywords: ['temperature'],
  properties: {
    location: 'Lab-1',
  },
  resourceType: ''
};

export class ListAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  public async runQuery(query: ListAlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    query.filter = this.transformAlarmsQuery(options.scopedVars, query.filter);

    // #AB:3449773 Map queryAlarmsData response to user-selected properties
    const alarmsResponse = await this.queryAlarmsData(query);
    // const mappedFields = await this.mapPropertiesToSelect(query.properties || [], [sampleAlarm]);
const flattenedAlarms = this.flattenAlarmsByTransitions([sampleAlarm]);
const mappedFields = await this.mapPropertiesToSelect(query.properties || [], flattenedAlarms);
    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields,
    };
  }

  private async queryAlarmsData(alarmsQuery: ListAlarmsQuery): Promise<Alarm[]> {
    const alarmsRequestBody: QueryAlarmsRequest = {
      filter: alarmsQuery.filter ?? '',
    };

    return await this.queryAlarmsInBatches(alarmsRequestBody);
  }

  public async metricFindQuery(
    query: AlarmsVariableQuery,
    options?: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    try {
      const filter = this.transformAlarmsQuery(options?.scopedVars || {}, query.filter);
      const response = await this.queryAlarms({ filter });

      const alarmsOptions = response.alarms
        ? response.alarms.map(alarm => ({
            text: `${alarm.displayName} (${alarm.alarmId})`,
            value: alarm.alarmId,
          }))
        : [];

      const uniqueOptions = Array.from(new Map(alarmsOptions.map(option => [option.value, option])).values());

      const sortedOptions = uniqueOptions.sort((a, b) => a.text.localeCompare(b.text));

      return sortedOptions;
    } catch (error) {
      return [];
    }
  }

  private flattenAlarmsByTransitions(alarms: Alarm[]): Alarm[] {
  const flattened: Alarm[] = [];
  for (const alarm of alarms) {
    if (Array.isArray(alarm.transitions) && alarm.transitions.length > 0) {
      for (const transition of alarm.transitions) {
        flattened.push({
          ...alarm,
          ...transition,
        });
      }
    } else {
      flattened.push(alarm);
    }
  }
  return flattened;
}

  private async mapPropertiesToSelect(
    properties: AlarmsProperties[],
    alarms: Alarm[]
  ): Promise<DataFrameDTO['fields']> {
    const workspaces = await this.loadWorkspaces();

    const mappedFields = properties.map(property => {
      const field = AlarmsPropertiesOptions[property];
      const fieldName = field.label;
      const fieldValue = field.value as keyof Alarm;
      const fieldType = this.isTimeField(fieldValue) ? FieldType.time : FieldType.string;

      console.log('fieldType:', fieldType, fieldName);

      const mappedValues = alarms.map(alarm => {
        switch (property) {
          case AlarmsProperties.workspace:
            const workspace = workspaces.get(alarm.workspace);
            return workspace ? workspace.name : alarm.workspace;
          case AlarmsProperties.currentSeverityLevel:
          case AlarmsProperties.highestSeverityLevel:
            return this.getSeverityLabel(alarm[fieldValue] as number);
          case AlarmsProperties.source:
            return this.getSource(alarm.properties);
          case AlarmsProperties.state:
            return this.getAlarmState(alarm.clear, alarm.acknowledged);
          case AlarmsProperties.keywords:
          case AlarmsProperties.properties:
            return JSON.stringify(this.getSortedCustomProperties(alarm.properties));
          default:
            return fieldType === FieldType.time
              ? alarm[fieldValue] ?? null
              : alarm[fieldValue] ?? '';
        }
      });
      return { name: fieldName, values: mappedValues, type: fieldType };
    });

    return mappedFields;
  }

private getSortedCustomProperties(properties: { [key: string]: string }): Array<{ key: string; value: string }> {
  return Object.entries(properties)
    .filter(([key]) => !key.startsWith('nitag'))
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => ({ key, value }));
}
  private getSeverityLabel(severityLevel: number): string {
    switch (severityLevel) {
      case -1:
        return `Clear`;
      case 1:
        return `Low (1)`;
      case 2:
        return `Moderate (2)`;
      case 3:
        return `High (3)`;
      default:
        if (severityLevel >= 4) {
          return `Critical (${severityLevel})`;
        }
        return '';
    }
  }

  private getAlarmState(isCleared: boolean, isAcknowledged: boolean): string {
    if (isCleared) {
      return isAcknowledged ? 'Cleared' : 'Cleared; NotAcknowledged';
    }
    return isAcknowledged ? 'Acknowledged' : 'Set';
  }

  private getSource(properties: { [key: string]: string }): string {
    if (Object.prototype.hasOwnProperty.call(properties, SYSTEM_CUSTOM_PROPERTY)) {
      return properties[SYSTEM_CUSTOM_PROPERTY];
    }
    return Object.prototype.hasOwnProperty.call(properties, MINION_ID_CUSTOM_PROPERTY)
      ? properties[MINION_ID_CUSTOM_PROPERTY]
      : '';
  }
}
