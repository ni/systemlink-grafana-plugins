import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AlarmsQuery } from './types';

export class AlarmsDataSource extends DataSourceBase<AlarmsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url + '/nifoo/v2';

  defaultQuery = {
    constant: 3.14,
  };

  async runQuery(query: AlarmsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },
        { name: 'Value', values: [query.constant, query.constant], type: FieldType.number },
      ],
    };
  }

  shouldRunQuery(query: AlarmsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/bar');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
