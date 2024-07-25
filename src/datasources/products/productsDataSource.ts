import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { ProductQueryOutput, ProductsQueryType, ProductsQuery, ProductsVariableQuery, QueryCountResponse, QueryProductResponse, QueryResultsHttpResponse, QuerySpecsResponse, QueryTestPlansResponse, StatusType } from './types';

export class productsDataSource extends DataSourceBase<ProductsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  // TODO: set base path of the service
  baseUrl = this.instanceSettings.url;

  queryProductsUrl = this.baseUrl + '/nitestmonitor/v2/query-products';
  queryResultsUrl = this.baseUrl + '/nitestmonitor/v2/query-results';
  querySpecsUrl = this.baseUrl + '/nispec/v1/query-specs';
  queryTestPlansUrl = this.baseUrl + '/niworkorder/v1/query-testplans'
  queryAssetsUrl = this.baseUrl + '/niapm/v1/query-assets'

  defaultQuery = {
    type: ProductsQueryType.Products,
    partNumber: '',
  };

  

  async queryProducts(filter: string, returnCount: boolean ): Promise<QueryProductResponse> {
    const response = await this.post<QueryProductResponse>(this.baseUrl + '/nitestmonitor/v2/query-products', {
      filter: filter,
      returnCount: returnCount
    });    
    return response;
  }

  async queryResults(filter: string , productFilter = ''): Promise<QueryResultsHttpResponse> {
    return await this.post<QueryResultsHttpResponse>(`${this.queryResultsUrl}`, {
      productFilter: productFilter,
      filter: filter,
      returnCount: true
    }).then(response => response);
  }

  async getTestResultsCountByStatusOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const statusTypes = Object.values(StatusType);
    const response = await this.queryResults(`partNumber = "${partNumber}"`);
    const statusOutputCount: { [key in StatusType]: number } = {
      Done: 0,
      Passed: 0,
      Failed: 0,
      Running: 0,
      Terminated: 0,
      Errored: 0
    };
    
    statusTypes.forEach(status => {
      statusOutputCount[status] = response.results.filter(r => r.status?.statusName === status).length;
    })

    return {
      refId,
      fields: [
        { name: 'Passed', values: [statusOutputCount.Passed] },
        { name: 'Errored', values: [statusOutputCount.Errored] },       
        { name: 'Running', values: [statusOutputCount.Running] },
        { name: 'Failed', values: [statusOutputCount.Failed] },
        { name: 'Terminated', values: [statusOutputCount.Terminated] },
        { name: 'Done', values: [statusOutputCount.Done] }
      ]
    }


  }

  async getTestPlansCountByStateOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const newCount = await this.getTestPlansCountByState(partNumber, 'New');
    const definedCount = await this.getTestPlansCountByState(partNumber, 'Defined');
    const reviewedCount = await this.getTestPlansCountByState(partNumber, 'Reviewed');
    const scheduledCount = await this.getTestPlansCountByState(partNumber, 'Scheduled');
    const inProgressCount = await this.getTestPlansCountByState(partNumber, 'InProgress');
    const pendingApprovalCount = await this.getTestPlansCountByState(partNumber, 'PendingApproval');
    const closedCount = await this.getTestPlansCountByState(partNumber, 'Closed');
    const canceledCount = await this.getTestPlansCountByState(partNumber, 'Canceled');

    return {
      refId,
      fields: [
        { name: 'New', values: [newCount] },
        { name: 'Defined', values: [definedCount] },
        { name: 'Reviewed', values: [reviewedCount] },
        { name: 'Scheduled', values: [scheduledCount] },
        { name: 'In Progress', values: [inProgressCount] },
        { name: 'Pending Approval', values: [pendingApprovalCount] },
        { name: 'Closed', values: [closedCount] },
        { name: 'Canceled', values: [canceledCount] }
      ],
    };
  }

  async getTestPlansCountByState(partNumber: string, state: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryTestPlansUrl}`, {
      filter: `partNumber = "${partNumber}" && state = "${state}"`,
      returnCount: true,
      take: 0
    }).then(response => response.totalCount);
  }

  async getEntityCountsOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const product = ((await this.queryProducts(`partNumber = "${partNumber}"`, false)));
    const productId = product.products[0].id;
    const specsCount = await this.getSpecsCount(productId);
    const testPlansCount = await this.getTestPlansCount(partNumber);
    const resultsCount = await this.getResultsCount(partNumber);
    const dutsCount = await this.getDutsCount(partNumber);
    return {
      refId,
      fields: [
        { name: 'Specs', values: [specsCount] },
        { name: 'Test Plans', values: [testPlansCount] },
        { name: 'Results', values: [resultsCount] },
        { name: 'Duts', values: [dutsCount] }
      ],
    };
  }

  async getSpecsCount(productId: string): Promise<number> {
    return await this.post<QuerySpecsResponse>(`${this.querySpecsUrl}`, {
      productIds: [
        productId
      ]
    }).then(response => response.specs.length);
  }

  async getTestPlansCount(partNumber: string): Promise<number> {
    return await this.post<QueryTestPlansResponse>(`${this.queryTestPlansUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    }).then(response => response.totalCount ?? 0);
  }

  async getResultsCount(partNumber: string): Promise<number> {
    const response = await this.queryResults('', `partNumber = "${partNumber}"`);
    return response.totalCount!;
  }

  async getDutsCount(partNumber: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryAssetsUrl}`, {
      filter: `(AssetType = "DEVICE_UNDER_TEST" && partNumber = "${partNumber}")`,
      take: 0
    }).then(response => response.totalCount);
  }

  async queryProductValues(field: string, startsWith: string): Promise<string[]> {
    if (!startsWith || startsWith.startsWith('$')) {
      return this.getVariableOptions();
    }
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.baseUrl + '/nitestmonitor/v2/query-product-values', data);
    return values.slice(0, 20).filter((value: string) => value);
  }

   getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => '$' + v.name);
  };

  async runQuery(query: ProductsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.type === ProductsQueryType.Products) {
      if (!query.productFilter) {
        return {
          refId: query.refId,
          fields: [ { name: 'Test program', values: [] },
                    { name: 'Serial number', values: [] }
            ],
          };
        } else {
        const responseData = (await this.queryProducts(query.productFilter,false)).products;
        return {
          refId: query.refId,
          fields: [
            { name: 'id', values: responseData.map(m => m.id) },
            { name: 'name', values: responseData.map(m => m.name) },
            { name: 'partNumber', values: responseData.map(m => m.partNumber) },
            { name: 'family', values: responseData.map(m => m.family) },
            { name: 'updatedAt', values: responseData.map(m => m.updatedAt), type: FieldType.time},
          ],
        };
      }
    } else {
      const partNumber = this.templateSrv.replace(query.partNumber, options.scopedVars);
      if (partNumber !== '') {
        switch (query.output) {
          case ProductQueryOutput.TestResultsCountByStatus:
            return await this.getTestResultsCountByStatusOutput(query.refId, partNumber);
          case ProductQueryOutput.TestPlansCountByState:
            return await this.getTestPlansCountByStateOutput(query.refId, partNumber);
          default:
            return await this.getEntityCountsOutput(query.refId, partNumber);
            }
      }
      else {
        return {
          refId: query.refId,
          fields: [ { name: 'Specs', values: [] },
                    { name: 'Test Plans', values: [] },
                    { name: 'Results', values: [] },
                    { name: 'Duts', values: [] }
                  ],
        };
      }
    }
  }

  shouldRunQuery(query: ProductsQuery): boolean {
    return true;
  }

  async metricFindQuery({ workspace }: ProductsVariableQuery): Promise<MetricFindValue[]> {
    const metadata = (await this.queryProducts('', false)).products;
    return metadata.map(frame => ({ text: frame.family, value: frame.family, }));
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl! + '/nitestmonitor/v2');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
