import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsProperties, ListAlarmsQuery } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery, AlarmTransition, QueryAlarmsRequest, TransitionInclusionOption } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { AlarmsPropertiesOptions, DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION, QUERY_EDITOR_MAX_TAKE, QUERY_EDITOR_MIN_TAKE, QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL, TRANSITION_SPECIFIC_PROPERTIES } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
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

    if (this.isTakeValid(query.take, query.transitionInclusionOption) && this.isPropertiesValid(query.properties)) {
      query.filter = this.transformAlarmsQuery(options.scopedVars, query.filter);
      const alarmsResponse = await this.queryAlarmsData(query);
      const flattenedAlarms  =
        query.transitionInclusionOption === TransitionInclusionOption.All
        && this.hasTransitionProperties(query.properties)
          ? this.duplicateAlarmsByTransitions(alarmsResponse)
          : alarmsResponse;

      mappedFields = await this.mapPropertiesToSelect(query.properties, flattenedAlarms);
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

  private isTakeValid(take?: number, transitionInclusionOption?: TransitionInclusionOption): boolean {
    if (!take || take < QUERY_EDITOR_MIN_TAKE) {
      return false;
    }

    const maxTake =
      transitionInclusionOption === TransitionInclusionOption.All
        ? QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL
        : QUERY_EDITOR_MAX_TAKE;

    return take <= maxTake;
  }

  private isPropertiesValid(properties?: AlarmsProperties[]): properties is AlarmsProperties[] {
    return !!properties && properties.length > 0;
  }

  private async queryAlarmsData(alarmsQuery: ListAlarmsQuery): Promise<Alarm[]> {
    const alarmsRequestBody: QueryAlarmsRequest = {
      filter: alarmsQuery.filter ?? '',
      take: alarmsQuery.take,
      orderByDescending: alarmsQuery.descending ?? DEFAULT_QUERY_EDITOR_DESCENDING,
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
    flattenedAlarms: Alarm[]
  ): Promise<DataFrameDTO['fields']> {
    const workspaces = await this.loadWorkspaces();
    const users = await this.loadUsers();

    const mappedFields = properties.map(property => {
      const field = AlarmsPropertiesOptions[property];
      const fieldName = field.label;
      const fieldValue = field.field;
      const fieldType = this.isTimeField(fieldValue as AlarmsProperties) ? FieldType.time : FieldType.string;

      const fieldValues = flattenedAlarms.map(alarm => {
        const transition = alarm.transitions?.[0];

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
          case AlarmsProperties.transitionSeverityLevel:
            return transition ? this.getSeverityLabel(transition.severityLevel) : '';
          case AlarmsProperties.transitionProperties:
            return transition ? this.getSortedCustomProperties(transition.properties) : '';
          default:
            let value;
            if (TRANSITION_SPECIFIC_PROPERTIES.includes(property)) {
              value = transition?.[fieldValue as keyof AlarmTransition];
            } else {
              value = alarm[fieldValue as keyof Alarm];
            }
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

  private hasTransitionProperties(properties: AlarmsProperties[]): boolean {
    return properties.some(prop =>
      TRANSITION_SPECIFIC_PROPERTIES.includes(prop)
    );
  }

  private duplicateAlarmsByTransitions(alarms: Alarm[]): Alarm[] {
    return alarms.flatMap(alarm => 
      alarm.transitions?.length 
        ? alarm.transitions.map(transition => ({ ...alarm, transitions: [transition] }))
        : alarm
    );
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
