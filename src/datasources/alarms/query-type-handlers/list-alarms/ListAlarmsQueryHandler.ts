import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsCacheProperties, alarmsCacheTTL, AlarmsProperties, AlarmsSpecificProperties, AlarmsTransitionProperties, ListAlarmsQuery, OutputType } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery, QueryAlarmsRequest, TransitionInclusionOption } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { AlarmPropertyKeyMap, AlarmsPropertiesOptions, DEFAULT_QUERY_EDITOR_DESCENDING, DEFAULT_QUERY_EDITOR_TRANSITION_INCLUSION_OPTION, QUERY_EDITOR_MAX_TAKE, QUERY_EDITOR_MIN_TAKE, TransitionPropertyKeyMap, QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL, TRANSITION_SPECIFIC_PROPERTIES } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { Alarm } from 'datasources/alarms/types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { User } from 'shared/types/QueryUsers.types';
import { UsersUtils } from 'shared/users.utils';
import { MINION_ID_CUSTOM_PROPERTY, PROPERTY_PREFIX_TO_EXCLUDE, SYSTEM_CUSTOM_PROPERTY } from 'datasources/alarms/constants/AlarmProperties.constants';
import { MINIMUM_TAKE } from 'datasources/alarms/constants/QueryAlarms.constants';
import TTLCache from '@isaacs/ttlcache';

export class ListAlarmsQueryHandler extends AlarmsQueryHandlerCore {
  public readonly defaultQuery = defaultListAlarmsQuery;

  private readonly usersUtils: UsersUtils;
  private readonly alarmsResponseCache: TTLCache<string, AlarmsCacheProperties> = new TTLCache(
    {
      ttl: alarmsCacheTTL
    }
  );

  public constructor(
    instanceSettings: DataSourceInstanceSettings,
    backendSrv: BackendSrv = getBackendSrv(),
    templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.usersUtils = new UsersUtils(this.instanceSettings, this.backendSrv);
  }

  public async runQuery(query: ListAlarmsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    query.filter = this.transformAlarmsQuery(options.scopedVars, query.filter);

    if (query.outputType === OutputType.TotalCount) {
      return this.handleTotalCountQuery(query);
    }

    return this.handlePropertiesQuery(query);
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

  public isAlarmTransitionProperty(property: AlarmsProperties): property is AlarmsTransitionProperties {
    return (TRANSITION_SPECIFIC_PROPERTIES as readonly AlarmsProperties[]).includes(property);
  }

  private async handleTotalCountQuery(query: ListAlarmsQuery): Promise<DataFrameDTO> {
    const requestBody = {
      filter: query.filter ?? '',
      take: MINIMUM_TAKE,
      returnCount: true,
    };

    const response = await this.queryAlarms(requestBody);
    const alarmsCount = response.totalCount ?? 0;

    return {
      refId: query.refId,
      name: query.refId,
      fields: [{ name: query.refId, type: FieldType.number, values: [alarmsCount] }],
    };
  }
  
  private async handlePropertiesQuery(query: ListAlarmsQuery): Promise<DataFrameDTO> {
    let mappedFields: DataFrameDTO['fields'] | undefined;

    if (
      this.isTakeValid(query.take, query.transitionInclusionOption) &&
      this.isPropertiesValid(query.properties)
    ) {
      const alarmsResponse = await this.getAlarms(query);

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

  private buildQueryParameter(query: ListAlarmsQuery): string {
    return JSON.stringify({
      filter: query.filter,
      take: query.take,
      descending: query.descending,
      transitionInclusionOption: query.transitionInclusionOption,
    });
  }

  private async getAlarms(query: ListAlarmsQuery): Promise<Alarm[]> {
    const alarmQueryParameters = this.buildQueryParameter(query);
    const propertiesSelected = JSON.stringify(query.properties);
    const cachedAlarmsData = this.alarmsResponseCache.get(query.refId);

    if (cachedAlarmsData
      && cachedAlarmsData.alarmQueryParameters === alarmQueryParameters
      && cachedAlarmsData.propertiesSelected !== propertiesSelected
    ) {
      this.updateAlarmsCache(
        query.refId, 
        alarmQueryParameters,
        propertiesSelected,
        cachedAlarmsData.response
      );
      return cachedAlarmsData.response;
    }

    const alarmsResponse = await this.queryAlarmsData(query);
    this.updateAlarmsCache(
      query.refId, 
      alarmQueryParameters,
      propertiesSelected,
      alarmsResponse
    );
    return alarmsResponse;
  }

  private updateAlarmsCache(
    refId: string, 
    alarmQueryParameters: string, 
    propertiesSelected: string, 
    response: Alarm[]
  ) {
    const updatedCacheEntry = { alarmQueryParameters, propertiesSelected, response };
    this.alarmsResponseCache.set(refId, updatedCacheEntry);
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
      const fieldValue = field.value;
      const fieldType = this.getFieldTypeForProperty(fieldValue);

      const fieldValues = flattenedAlarms.map(alarm => {
        const transition = alarm.transitions[0];

        switch (property) {
          case AlarmsSpecificProperties.workspace:
            const workspace = workspaces.get(alarm.workspace);
            return workspace ? workspace.name : alarm.workspace;
          case AlarmsSpecificProperties.acknowledgedBy:
            const userId = alarm.acknowledgedBy ?? '';
            const user = users.get(userId);
            return user ? UsersUtils.getUserFullName(user) : userId;
          case AlarmsSpecificProperties.properties:
            return this.getSortedCustomProperties(alarm.properties);
          case AlarmsSpecificProperties.highestSeverityLevel:
          case AlarmsSpecificProperties.currentSeverityLevel:
            return this.getSeverityLabel(alarm[property]);
          case AlarmsSpecificProperties.state:
            return this.getAlarmState(alarm.clear, alarm.acknowledged);
          case AlarmsSpecificProperties.source:
            return this.getSource(alarm.properties);
          case AlarmsTransitionProperties.transitionSeverityLevel:
            return this.getSeverityLabel(transition.severityLevel);
          case AlarmsTransitionProperties.transitionProperties:
            return this.getSortedCustomProperties(transition.properties);
          default:
            let value;

            if (this.isAlarmTransitionProperty(property)) {
              const transitionKey = TransitionPropertyKeyMap[property];
              value = transition[transitionKey];
            } else {
              const alarmKey = AlarmPropertyKeyMap[property];
              value = alarm[alarmKey];
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

  private getFieldTypeForProperty(field: AlarmsProperties): FieldType {
    switch (true) {
      case this.isTimeField(field):
        return FieldType.time;
      case this.isNumberField(field):
        return FieldType.number;
      case this.isBooleanField(field):
        return FieldType.boolean;
      case this.isObjectField(field):
      case this.isArrayField(field):
        return FieldType.other;
      default:
        return FieldType.string;
    }
  }

  private isNumberField(field: AlarmsProperties): boolean {
    return field === AlarmsSpecificProperties.transitionOverflowCount;
  }

  private isBooleanField(field: AlarmsProperties): boolean {
    return (
      field === AlarmsSpecificProperties.acknowledged ||
      field === AlarmsSpecificProperties.active ||
      field === AlarmsSpecificProperties.clear
    );
  }

  private isObjectField(field: AlarmsProperties): boolean {
    return (
      field === AlarmsSpecificProperties.properties ||
      field === AlarmsTransitionProperties.transitionProperties
    );
  }

  private isArrayField(field: AlarmsProperties): boolean {
    return (
      field === AlarmsSpecificProperties.keywords ||
      field === AlarmsTransitionProperties.transitionKeywords
    );
  }

  private hasTransitionProperties(properties: AlarmsProperties[]): boolean {
    return properties.some(prop => this.isAlarmTransitionProperty(prop));
  }

  private duplicateAlarmsByTransitions(alarms: Alarm[]): Alarm[] {
    return alarms.flatMap(alarm => 
      alarm.transitions?.length 
        ? alarm.transitions.map(transition => ({ ...alarm, transitions: [transition] }))
        : alarm
    );
  }

  private getSortedCustomProperties(properties: { [key: string]: string }): { [key: string]: string } {
    if (Object.keys(properties).length <= 0) {
      return {};
    }

    const filteredEntries = Object.entries(properties)
      .filter(([key]) => !key.startsWith(PROPERTY_PREFIX_TO_EXCLUDE))
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
    const sortedProperties = Object.fromEntries(filteredEntries);
    
    return sortedProperties;
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
      return isAcknowledged ? 'Cleared' : 'Cleared; Not Acknowledged';
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
