import {
  DataFrameDTO,
  DataQueryRequest,
  DataSourceInstanceSettings,
  MetricFindValue,
  TestDataSourceResponse
} from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { SystemQuery, SystemQueryType, SystemVariableQuery, SystemDataSourceOptions, SystemFeatureTogglesDefaults } from './types';
import { SystemsDataSourceBase } from './SystemsDataSourceBase';
import { Observable } from 'rxjs';
import { SystemAdvancedQueryHandler } from './datasource-query-handlers/SystemAdvancedQueryHandler';
import { SystemSimpleQueryHandler } from './datasource-query-handlers/SystemSimpleQueryHandler';
import { SystemQueryHandlerBase } from './datasource-query-handlers/SystemQueryHandlerBase';

export class SystemDataSource extends SystemsDataSourceBase {
  private readonly queryHandler: SystemQueryHandlerBase;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<SystemDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
    this.queryHandler = this.createQueryHandler();
  }

  baseUrl = this.instanceSettings.url + '/nisysmgmt/v1';

  defaultQuery = {
    queryKind: SystemQueryType.Summary,
    systemName: '',
    workspace: ''
  };

  get instanceSettingsUrl(): string {
    return this.instanceSettings.url!;
  }

  private createQueryHandler(): SystemQueryHandlerBase {
    if (this.isQueryBuilderActive()) {
      return new SystemAdvancedQueryHandler(this);
    }
    return new SystemSimpleQueryHandler(this);
  }

  prepareQuery(query: SystemQuery): SystemQuery {
    return this.queryHandler.prepareQuery(query);
  }

  runQuery(query: SystemQuery, options: DataQueryRequest): Observable<DataFrameDTO> {
    return this.queryHandler.runQuery(query, options);
  }

  shouldRunQuery(query: SystemQuery): boolean {
    return !query.hide;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(this.baseUrl + '/get-systems-summary');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async metricFindQuery(query: SystemVariableQuery): Promise<MetricFindValue[]> {
    return this.queryHandler.metricFindQuery(query);
  }

  isQueryBuilderActive(): boolean {
    return (
      this.instanceSettings.jsonData?.featureToggles?.systemQueryBuilder ??
      SystemFeatureTogglesDefaults.systemQueryBuilder ??
      false
    );
  }
}
