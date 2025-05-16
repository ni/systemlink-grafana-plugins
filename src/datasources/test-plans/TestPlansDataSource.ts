import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OrderByOptions, OutputType, Properties, PropertiesOptions, TestPlansQuery } from './types';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = `${this.instanceSettings.url}/niworkorder/v1`;
  queryTestPlansUrl = `${this.baseUrl}/query-testplans`;

  defaultQuery = {
    outputType: OutputType.Properties,
    properties: [
      PropertiesOptions.NAME,
      PropertiesOptions.STATE,
      PropertiesOptions.ASSIGNED_TO,
      PropertiesOptions.PRODUCT,
      PropertiesOptions.DUT,
      PropertiesOptions.PLANNED_START_DATE,
      PropertiesOptions.ESTIMATED_DURATION,
      PropertiesOptions.SYSTEM,
      PropertiesOptions.UPDATED_AT
    ] as Properties[],
    orderBy: OrderByOptions.UPDATED_AT,
    descending: true,
    recordCount: 1000
  };

  async runQuery(query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [],
    };
  }

  shouldRunQuery(query: TestPlansQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.post(this.queryTestPlansUrl, { take: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
