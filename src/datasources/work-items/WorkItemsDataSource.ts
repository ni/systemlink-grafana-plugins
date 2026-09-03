import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  LegacyMetricFindQueryOptions,
  MetricFindValue,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemsVariableQuery,
  WorkItemsVariableQueryType,
  WorkItemTypeOptions,
} from './types';
import { DEFAULT_TAKE } from './constants';
import { WorkItemTypes } from './constants/QueryEditor.constants';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;

  defaultQuery = {
    outputType: OutputType.Properties,
    types: Object.values(WorkItemTypeOptions),
    properties: [
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.ASSIGNED_TO,
      WorkItemPropertiesOptions.PLANNED_START_DATE,
      WorkItemPropertiesOptions.DUE_DATE,
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: DEFAULT_TAKE,
  };

  // TODO: AB#3923375 - Query work items and return the requested properties instead of an empty frame.
  async runQuery(query: WorkItemsQuery, _options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  // TODO: AB#3923375 - Query work items and return the matching values instead of an empty list.
  async metricFindQuery(
    query: WorkItemsVariableQuery,
    _options: LegacyMetricFindQueryOptions
  ): Promise<MetricFindValue[]> {
    const variableQuery = this.prepareQuery(query);
    const queryType = variableQuery.queryType ?? WorkItemsVariableQueryType.ListWorkItems;

    if (queryType === WorkItemsVariableQueryType.ListWorkItemTypes) {
      return WorkItemTypes.map(type => ({ text: type.label, value: type.value }));
    }

    return [];
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 }, { showErrorAlert: false });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
