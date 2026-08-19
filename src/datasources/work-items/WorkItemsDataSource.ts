import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  FieldType,
  MetricFindValue,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import {
  OrderByOptions,
  OutputType,
  WorkItemsDataSourceOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from './types';

export class WorkItemsDataSource extends DataSourceBase<WorkItemsQuery, WorkItemsDataSourceOptions> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<WorkItemsDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkitem/v1`;
  queryWorkItemsUrl = `${this.baseUrl}/query-workitems`;

  defaultQuery = {
    outputType: OutputType.Properties,
    types: [WorkItemTypeOptions.All],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: 1000,
  };

  public prepareQuery(query: WorkItemsQuery): WorkItemsQuery {
    const prepared = super.prepareQuery(query);

    return {
      ...prepared,
      outputType: prepared.outputType ?? this.defaultQuery.outputType,
      orderBy: prepared.orderBy ?? this.defaultQuery.orderBy,
      descending: prepared.descending ?? this.defaultQuery.descending,
      types: this.normalizeTypes(prepared.types),
      take: this.normalizeTake(prepared.take),
    };
  }

  isTypesValid(types?: WorkItemTypeOptions[]): boolean {
    return Boolean(types && types.length > 0);
  }

  normalizeTypes(types?: WorkItemTypeOptions[]): WorkItemTypeOptions[] {
    return this.isTypesValid(types) ? [...types!] : [...this.defaultQuery.types];
  }

  normalizeTake(take?: number): number {
    return Number.isFinite(take) && (take as number) >= 0 ? (take as number) : this.defaultQuery.take;
  }

  async runQuery(query: WorkItemsQuery, _options: DataQueryRequest<WorkItemsQuery>): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      name: query.refId,
      fields: [
        {
          name: 'message',
          type: FieldType.string,
          values: ['Work Items datasource query implementation will be added in follow-up stories.'],
        },
      ],
    };
  }

  shouldRunQuery(query: WorkItemsQuery): boolean {
    return !query.hide;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async metricFindQuery(): Promise<MetricFindValue[]> {
    return [];
  }
}
