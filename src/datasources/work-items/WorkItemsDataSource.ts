import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  TestDataSourceResponse,
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryBuilderOption } from 'core/types';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from './types';
import { TAKE_LIMIT } from './constants/QueryEditor.constants';

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
    types: [WorkItemTypeOptions.All],
    properties: [
      WorkItemPropertiesOptions.ID,
      WorkItemPropertiesOptions.NAME,
      WorkItemPropertiesOptions.TYPE,
      WorkItemPropertiesOptions.STATE,
      WorkItemPropertiesOptions.WORKSPACE,
    ],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    take: 1000,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  public prepareQuery(query: WorkItemsQuery): WorkItemsQuery {
    const prepared = super.prepareQuery(query);

    return {
      ...prepared,
      outputType: prepared.outputType ?? this.defaultQuery.outputType,
      orderBy: prepared.orderBy ?? this.defaultQuery.orderBy,
      descending: prepared.descending ?? this.defaultQuery.descending,
      types: this.normalizeTypes(prepared.types),
      properties: this.normalizeProperties(prepared.properties),
      take: this.normalizeTake(prepared.take),
    };
  }

  isTypesValid(types?: WorkItemTypeOptions[]): boolean {
    return Boolean(types && types.length > 0);
  }

  normalizeTypes(types?: WorkItemTypeOptions[]): WorkItemTypeOptions[] {
    return this.isTypesValid(types) ? [...types!] : [...this.defaultQuery.types];
  }

  isPropertiesValid(properties?: WorkItemPropertiesOptions[]): boolean {
    return Boolean(properties && properties.length > 0);
  }

  normalizeProperties(properties?: WorkItemPropertiesOptions[]): WorkItemPropertiesOptions[] {
    return properties ?? [...this.defaultQuery.properties];
  }

  normalizeTake(take?: number): number {
    return Number.isFinite(take) && (take as number) >= 0 && (take as number) <= TAKE_LIMIT
      ? (take as number)
      : this.defaultQuery.take;
  }

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

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryWorkItemsUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
