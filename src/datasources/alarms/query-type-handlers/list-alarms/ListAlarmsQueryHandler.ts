import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, LegacyMetricFindQueryOptions, MetricFindValue } from '@grafana/data';
import { AlarmsProperties, ListAlarmsQuery } from '../../types/ListAlarms.types';
import { AlarmsVariableQuery, QueryAlarmsRequest } from '../../types/types';
import { AlarmsQueryHandlerCore } from '../AlarmsQueryHandlerCore';
import { defaultListAlarmsQuery } from 'datasources/alarms/constants/DefaultQueries.constants';
import { Alarm } from 'datasources/alarms/types/types';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { User } from 'shared/types/QueryUsers.types';
import { UsersUtils } from 'shared/users.utils';
import { AlarmsPropertiesOptions } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';

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
    query.filter = this.transformAlarmsQuery(options.scopedVars || {}, query.filter);

    const alarmsResponse = await this.queryAlarmsData(query);
    const mappedFields = await this.mapPropertiesToSelect(query.properties || [], alarmsResponse);

    return {
      refId: query.refId,
      name: query.refId,
      fields: mappedFields,
    };
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

  private async queryAlarmsData(alarmsQuery: ListAlarmsQuery): Promise<Alarm[]> {
    const alarmsRequestBody: QueryAlarmsRequest = {
      filter: alarmsQuery.filter ?? '',
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

    const mappedFields = properties.map(property => {
      const field = AlarmsPropertiesOptions[property];
      const fieldName = field.label;
      const fieldValue = field.value as keyof Alarm;
      const fieldType = this.isTimeField(fieldValue) ? FieldType.time : FieldType.string;

      const mappedValues = alarms.map(alarm => {
        switch (property) {
          case AlarmsProperties.workspace:
            const workspace = workspaces.get(alarm.workspace);
            return workspace ? workspace.name : alarm.workspace;
          case AlarmsProperties.acknowledgedBy:
            const userId = alarm.acknowledgedBy as string ?? '';
            const user = users.get(userId);
            return user ? UsersUtils.getUserFullName(user) : userId;
          case AlarmsProperties.keywords:
          case AlarmsProperties.properties:
            return this.getSortedCustomProperties(alarm.properties);
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

  private getSortedCustomProperties(properties: { [key: string]: string }): string {
    if (Object.keys(properties).length <= 0) {
      return '';
    }

    const filteredEntries = Object.entries(properties)
    .filter(([key]) => !key.startsWith('nitag'))
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  
    const sortedProperties = Object.fromEntries(filteredEntries);
    
    return JSON.stringify(sortedProperties);
  }
}

