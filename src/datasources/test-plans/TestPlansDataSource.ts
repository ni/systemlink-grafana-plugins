import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryTestPlansResponse, TestPlansQuery, ITestPlan } from './types';
import { QueryBuilderOption } from 'core/types';

export class TestPlansDataSource extends DataSourceBase<TestPlansQuery> {
  constructor (
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url + '/niworkorder/v1';
  queryTestPlansUrl = this.baseUrl + '/query-testplans';

  defaultQuery = {
    queryBy: ''
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  async queryTestPlans (
    filter?: string,
    take?: number,
    returnCount = false
  ): Promise<QueryTestPlansResponse> {
    try {
      const response = await this.post<QueryTestPlansResponse>(this.queryTestPlansUrl, {
        filter,
        take,
        returnCount
      });
      return response;
    } catch (error) {
      throw new Error(`An error occurred while querying products: ${ error }`);
    }
  }


  async runQuery (query: TestPlansQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    const testPlans = (
      await this.queryTestPlans(
        query.queryBy,
      ))

    if (testPlans.testPlans.length > 0) {
      const fields = [ 'name', 'state', 'workspace' ] as const;
      const mappedFields = fields.map((field) => {
        return {
          name: field,
          values: testPlans.testPlans.map((testPlan: ITestPlan) => testPlan[field]),
        };
      });

      return {
        refId: query.refId,
        fields: mappedFields,
      };
    }
    return {
      refId: query.refId,
      fields: []
    };
  }

  shouldRunQuery (query: TestPlansQuery): boolean {
    return true;
  }

  async testDatasource (): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/query-testplans');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  private getVariableOptions () {
    return this.templateSrv
      .getVariables()
      .map(variable => ({ label: '$' + variable.name, value: '$' + variable.name }));
  }
}
