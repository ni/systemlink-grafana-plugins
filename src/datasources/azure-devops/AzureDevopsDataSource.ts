import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType } from '@grafana/data';
import { BackendSrv, TemplateSrv, TestingStatus, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { AzureDevopsQuery } from './types';

export class AzureDevopsDataSource extends DataSourceBase<AzureDevopsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
  }

  projectsUrl = this.instanceSettings.url + '/_apis/projects';

  defaultQuery = {
    constant: 3.14,
  };

  async runQuery(query: AzureDevopsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    return {
      refId: query.refId,
      fields: [
        { name: 'Time', values: [range.from.valueOf(), range.to.valueOf()], type: FieldType.time },
        { name: 'Value', values: [query.constant, query.constant], type: FieldType.number },
      ],
    };
  }

  async testDatasource(): Promise<TestingStatus> {
    await this.backendSrv.get(this.projectsUrl, { $top: 1 });
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
