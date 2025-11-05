import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsProperties, ListAlarmsQuery } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery, AlarmTransition, QueryAlarmsRequest } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { AlarmsPropertiesOptions, DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION, QUERY_EDITOR_MAX_TAKE, QUERY_EDITOR_MIN_TAKE } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { Alarm } from 'datasources/alarms/types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { User } from 'shared/types/QueryUsers.types';
import { UsersUtils } from 'shared/users.utils';
import { MINION_ID_CUSTOM_PROPERTY, PROPERTY_PREFIX_TO_EXCLUDE, SYSTEM_CUSTOM_PROPERTY } from 'datasources/alarms/constants/AlarmProperties.constants';

export class ListAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  private readonly usersUtils: UsersUtils;

  public constructor(
    instanceSettings: DataSourceInstanceSettings,
    backendSrv: BackendSrv = getBackendSrv(),
    templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.usersUtils = new UsersUtils(this.instanceSettings, this.backendSrv);
  }

  public async runQuery(query: ListAlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    let mappedFields: DataFrameDTO['fields'] | undefined;

    query.filter = this.transformAlarmsQuery(options.scopedVars, query.filter);
    const alarmsResponse = await this.queryAlarmsData(query);

    if (this.isPropertiesValid(query.properties)) {
      mappedFields = await this.mapPropertiesToSelect(query.properties, alarmsResponse);
    }

    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields ?? [],
    };
  }

  public async metricFindQuery(query: AlarmsVariableQuery, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    try {
      const take = query.take;
      if (!this.isTakeValid(take)) {
        return [];
      } 
      
      const filter = this.transformAlarmsQuery(options?.scopedVars || {}, query.filter) ?? '';
      const orderByDescending = query.descending ?? DEFAULT_QUERY_EDITOR_DESCENDING;
      const returnMostRecentlyOccurredOnly = true;
      const requestBody = { filter, take, orderByDescending, returnMostRecentlyOccurredOnly };
      const alarms = await this.queryAlarmsInBatches(requestBody);

      const alarmsOptions = alarms.map(alarm => ({
          text: `${alarm.displayName} (${alarm.alarmId})`,
          value: alarm.alarmId
        }));

      const sortedOptions = alarmsOptions.sort((a, b) => a.text.localeCompare(b.text));

      return sortedOptions;
    } catch (error) {
      return [];
    }
  }

  private isTakeValid(take?: number): boolean {
    return take !== undefined
      && take >= QUERY_EDITOR_MIN_TAKE
      && take <= QUERY_EDITOR_MAX_TAKE;
  }

  private isPropertiesValid(properties?: AlarmsProperties[]): properties is AlarmsProperties[] {
    return !!properties && properties.length > 0;
  }

  private async queryAlarmsData(alarmsQuery: ListAlarmsQuery): Promise<Alarm[]> {
    const alarmsRequestBody: QueryAlarmsRequest = {
      filter: alarmsQuery.filter ?? '',
      transitionInclusionOption: alarmsQuery.transitionInclusionOption ?? DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION,
    }

    return this.queryAlarmsInBatches(alarmsRequestBody);
  }

  private async loadUsers(): Promise<Map<string, User>> {
    try {
      return await this.usersUtils.getUsers();
    } catch (error) {
      if (!this.errorTitle) {
        this.handleDependenciesError(error);
      }
      return new Map<string, User>();
    }
  }

  private async mapPropertiesToSelect(
    properties: AlarmsProperties[],
    alarms: Alarm[]
  ): Promise<DataFrameDTO['fields']> {
    const workspaces = await this.loadWorkspaces();
    const users = await this.loadUsers();
    const flattenedRows = this.flattenAlarmsWithTransitions(alarms);

    const mappedFields = properties.map(property => {
      const field = AlarmsPropertiesOptions[property];
      const fieldName = field.label;
      const fieldValue = field.value;
      const fieldType = this.isTimeField(fieldValue) ? FieldType.time : FieldType.string;

      const fieldValues = flattenedRows.map(({ alarm, transition }) => {
        switch (property) {
          case AlarmsProperties.workspace:
            const workspace = workspaces.get(alarm.workspace);
            return workspace ? workspace.name : alarm.workspace;
          case AlarmsProperties.acknowledgedBy:
            const userId = alarm.acknowledgedBy ?? '';
            const user = users.get(userId);
            return user ? UsersUtils.getUserFullName(user) : userId;
          case AlarmsProperties.properties:
            return this.getSortedCustomProperties(alarm.properties);
          case AlarmsProperties.highestSeverityLevel:
          case AlarmsProperties.currentSeverityLevel:
            return this.getSeverityLabel(alarm[property]);
          case AlarmsProperties.state:
            return this.getAlarmState(alarm.clear, alarm.acknowledged);
          case AlarmsProperties.source:
            return this.getSource(alarm.properties);
          case AlarmsProperties.transitionSeverity:
            return transition ? this.getSeverityLabel(transition.severityLevel) : '';
          case AlarmsProperties.transitionProperties:
            return transition ? this.getSortedCustomProperties(transition.properties) : '';
          default:
            const value = alarm[fieldValue as keyof Alarm];
            console.log(fieldValue, value);
            if (fieldType === FieldType.time) {
              return value ?? null;
            }
            return value ?? '';
        }
      });
      return { name: fieldName, values: fieldValues, type: fieldType };
    });

    return mappedFields;
  }

  private flattenAlarmsWithTransitions(alarms: Alarm[]): Array<{ alarm: Alarm; transition?: AlarmTransition }> {
    const flattenedRows: Array<{ alarm: Alarm; transition: AlarmTransition }> = [];

    alarms.forEach(alarm => {
      if (alarm.transitions.length > 0) {
        alarm.transitions.forEach(transition => {
          flattenedRows.push({ alarm, transition });
        });
      } else {
        flattenedRows.push({ alarm, transition: [] as unknown as AlarmTransition });
      }
    });

    return flattenedRows;
  }

  private getSortedCustomProperties(properties: { [key: string]: string }): string {
    if (Object.keys(properties).length <= 0) {
      return '';
    }

    const filteredEntries = Object.entries(properties)
      .filter(([key]) => !key.startsWith(PROPERTY_PREFIX_TO_EXCLUDE))
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
    const sortedProperties = Object.fromEntries(filteredEntries);
    
    return JSON.stringify(sortedProperties);
  }

  private getSeverityLabel(severityLevel: number): string {
    switch (severityLevel) {
      case -1:
        return 'Clear';
      case 1:
        return 'Low (1)';
      case 2:
        return 'Moderate (2)';
      case 3:
        return 'High (3)';
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
    if (properties?.hasOwnProperty(SYSTEM_CUSTOM_PROPERTY)) {
      return properties[SYSTEM_CUSTOM_PROPERTY];
    }
    return properties?.hasOwnProperty(MINION_ID_CUSTOM_PROPERTY)
      ? properties[MINION_ID_CUSTOM_PROPERTY]
      : '';
  }
}
