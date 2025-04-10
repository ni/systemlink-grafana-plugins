import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { QueryTestPlansResponse, TestPlansQuery, ITestPlan, OutputType } from './types';
import { QueryBuilderOption } from 'core/types';
import { ExpressionTransformFunction, transformComputedFieldsQuery } from 'core/query-builder.utils';
import { TestPlansQueryBuilderFieldNames } from './constants/TestPlansQueryBuilder.constants';
import { QueryBuilderOperations } from 'core/query-builder.constants';

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
    queryBy: '',
    outputType: OutputType.Data,
  };

  readonly globalVariableOptions = (): QueryBuilderOption[] => this.getVariableOptions();

  async queryTestPlans (
    filter?: string,
    take?: number,
    returnCount = true
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


  async runQuery (query: TestPlansQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const filter = query.queryBy
          ? transformComputedFieldsQuery(
            this.templateSrv.replace(query.queryBy, options.scopedVars),
            this.testPlansComputedDataFields
)
          : undefined;
    const responseData = (
      await this.queryTestPlans(
        filter,
      ))

      if (query.outputType === OutputType.Data) {
        const testPlansResponse = responseData.testPlans;
        const fields = ['id', 'name', 'state', 'workspace' ] as const;
      const mappedFields = fields.map((field) => {
        return {
          name: field,
          values: testPlansResponse.map((testPlan: ITestPlan) => testPlan[field]),
        };
      });

      return {
        refId: query.refId,
        fields: mappedFields,
      };
      } else {
        return {
          refId: query.refId,
          fields: [{ name: 'Total count', values: [responseData.totalCount] }],
        };
      }
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

    readonly testPlansComputedDataFields = new Map<string, ExpressionTransformFunction>(
      Object.values(TestPlansQueryBuilderFieldNames).map(field => [
        field,
        this.multipleValuesQuery(field)
      ])
    );

    protected multipleValuesQuery(field: string): ExpressionTransformFunction {
      return (value: string, operation: string, _options?: any) => {
        const isMultiSelect = this.isMultiSelectValue(value);
        const valuesArray = this.getMultipleValuesArray(value);
        const logicalOperator = this.getLogicalOperator(operation);
  
        return isMultiSelect ? `(${valuesArray
          .map(val => `${field} ${operation} "${val}"`)
          .join(` ${logicalOperator} `)})` : `${field} ${operation} "${value}"`;
      }
    }
  
    private isMultiSelectValue(value: string): boolean {
      return value.startsWith('{') && value.endsWith('}');
    }
  
    private getMultipleValuesArray(value: string): string[] {
      return value.replace(/({|})/g, '').split(',');
    }

    private getLogicalOperator(operation: string): string {
        return operation === QueryBuilderOperations.EQUALS.name ? '||' : '&&';
      }
  
}
