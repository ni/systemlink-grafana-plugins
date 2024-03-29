import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TestDataSourceResponse, dateTime } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Product, Specs, QueryCountResponse, ProductQuery, QueryResultsHttpResponse, QueryProductsResponse, QuerySpecsResponse, ProductQueryOutput, Results } from './types';
import { Asset, AssetResponse } from './asset';
import { QueryTestPlansResponse, TestPlan } from './testPlans';

export class productDataSource extends DataSourceBase<ProductQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;
  // TODO: set base path of the service
  queryProductsUrl = this.baseUrl + '/nitestmonitor/v2/query-products';
  querySpecsUrl = this.baseUrl + '/nispec/v1/query-specs';
  queryTestPlansUrl = this.baseUrl + '/niworkorder/v1/query-testplans'
  queryResultsUrl = this.baseUrl + '/nitestmonitor/v2/query-results'
  queryAssetsUrl = this.baseUrl + '/niapm/v1/query-assets'

  defaultQuery = {
    partNumber: "part-number",
    output: ProductQueryOutput.ProductDetails
  };

  async runQuery(query: ProductQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const partNumber = this.templateSrv.replace(query.partNumber, options.scopedVars);
    const from  = this.templateSrv.replace(options.range.from.toISOString(), options.scopedVars);
    const to = this.templateSrv.replace(options.range.to.toISOString(), options.scopedVars);

    switch (query.output) {
      case ProductQueryOutput.ProductDetails:
        return await this.getProductDetailsOutput(query.refId, partNumber);
      case ProductQueryOutput.EntityCounts:
        return await this.getEntityCountsOutput(query.refId, partNumber);
      case ProductQueryOutput.TestResultsCountByStatus:
        return await this.getTestResultsCountByStatusOutput(query.refId, partNumber);
      case ProductQueryOutput.TestResults:
        const results = await this.getResults(partNumber, from, to);
        return {
          refId: query.refId,
          fields: [
            { name: 'Test program', values: results.map(r => r.programName) },
            { name: 'Serial number', values: results.map(r => r.serialNumber) },
            { name: 'System', values: results.map(r => r.systemId) },
            { name: 'Status', values: results.map(r => r.status?.statusType) },
            { name: 'Elapsed time (s)', values: results.map(r => r.totalTimeInSeconds) },
            { name: 'Started', values: results.map(r => dateTime(r.startedAt).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Updated', values: results.map(r => dateTime(r.updatedAt).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Part number', values: results.map(r => r.partNumber) },
            { name: 'Data tables', values: results.map(r => r.dataTableIds)},
            { name: 'File ids', values: results.map(r => r.fileIds)},
            { name: 'Id', values: results.map(r => r.id) },
            { name: 'Host name', values: results.map(r => r.hostName)},
            { name: 'Operator', values: results.map(r => r.operator)},
            { name: 'Keywords', values: results.map(r => r.keywords)},
            { name: 'Properties', values: results.map(r => r.properties)},
            { name: 'Status summary', values: results.map(r => r.statusTypeSummary)},
            { name: 'Workspace', values: results.map(r => r.workspace)},
          ],
        };
      case ProductQueryOutput.TestPlans:
        const testPlans = await this.getTestPlans(partNumber, from, to);
        return {
          refId: query.refId,
          fields: [
            { name: 'Name', values: testPlans.map(tp => tp.name) },
            { name: 'State', values: testPlans.map(tp => tp.state) },
            { name: 'Assigned to', values: testPlans.map(tp => tp.assignedTo) },
            { name: 'Dut', values: testPlans.map(tp => tp.dutId) },
            { name: 'Planned start date/time', values: testPlans.map(tp => dateTime(tp.plannedStartDateTime).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Estimation duration', values: testPlans.map(tp => tp.estimatedDurationInSeconds) },
            { name: 'System', values: testPlans.map(tp => tp.systemId) },
            { name: 'Updated', values: testPlans.map(tp => dateTime(tp.updatedAt).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Id', values: testPlans.map(tp => tp.id) },
            { name: 'Description', values: testPlans.map(tp => tp.description) },
            { name: 'Work order id', values: testPlans.map(tp => tp.workOrderId) },
            { name: 'Work order name', values: testPlans.map(tp => tp.workOrderName) },
            { name: 'Workspace', values: testPlans.map(tp => tp.workspace) },
            { name: 'Created by', values: testPlans.map(tp => tp.createdBy) },
            { name: 'Updated by', values: testPlans.map(tp => tp.updatedBy) },
            { name: 'Created at', values: testPlans.map(tp =>  dateTime(tp.createdAt).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Properties', values: testPlans.map(tp => tp.properties) },
            { name: 'Part numbet', values: testPlans.map(tp => tp.partNumber) },
            { name: 'Program name', values: testPlans.map(tp => tp.testProgram) },
            { name: 'System filter', values: testPlans.map(tp => tp.systemFilter) },
            { name: 'Planned start date/time', values: testPlans.map(tp => tp.plannedStartDateTime) },
            { name: 'Execution sctions', values: testPlans.map(tp => tp.executionActions) },
            { name: 'Execution history', values: testPlans.map(tp => tp.executionHistory) },
          ],
        };
      case ProductQueryOutput.Specs:
        const productId = await this.getProductDetails(partNumber).then(product => product.id);
        const specs = await this.getSpecs(productId, from, to);
        return {
          refId: query.refId,
          fields: [
            { name: 'ID', values: specs.map(sp => sp.id)},
            { name: 'Block', values: specs.map(sp => sp.block)},
            { name: 'Symbol', values: specs.map(sp => sp.symbol)},
            { name: 'Name', values: specs.map(sp => sp.name)},
            { name: 'Unit', values: specs.map(sp => sp.unit)},
            { name: 'Category', values: specs.map(sp => sp.category)},
            { name: "Workspace", values: specs.map(sp => sp.workspace)},
            { name: 'Type', values: specs.map(sp => sp.type?.toString())},
            { name: 'Limit', values: specs.map(sp => sp.limit?.toString())},
            { name: 'Version', values: specs.map(sp => sp.version)},
            { name: 'Product id', values: specs.map(sp => sp.productId)},
            { name: 'Spec id', values: specs.map(sp => sp.specId)},
            { name: 'Conditions', values: specs.map(sp => sp.conditions)},
            { name: 'Keywords', values: specs.map(sp => sp.keywords)},
            { name: 'Properties', values: specs.map(sp => sp.properties)},
            { name: 'Created at', values: specs.map(sp => dateTime(sp.createdAt).format('MMM DD, YYYY, h:mm:ss A'))},
            { name: 'Created by', values: specs.map(sp => sp.createdBy)},
            { name: 'Updated at', values: specs.map(sp => dateTime(sp.updatedAt).format('MMM DD, YYYY, h:mm:ss A'))},
            { name: 'Updated by', values: specs.map(sp => sp.updatedBy)}
          ],
        };
      case ProductQueryOutput.Duts:
        const duts = await this.getDuts(partNumber);

        return {
          refId: query.refId,
          fields: [
            { name: 'Name', values: duts.map(d => d.name) },
            { name: 'Part Number', values: duts.map(d => d.partNumber) },
            { name: 'Serial Number', values: duts.map(d => d.serialNumber) },
            { name: 'Asset Type', values: duts.map(d => d.assetType) },
            { name: 'Updated At', values: duts.map(d => dateTime(d.lastUpdatedTimestamp).format('MMM DD, YYYY, h:mm:ss A')) },
            { name: 'Workspace', values: duts.map(d => d.workspace) },
            { name: 'Properties', values: duts.map(d => d.properties?.toString()) },
            { name: 'DisCovery type', values: duts.map(d => d.discoveryType) },
            { name: 'Bust type', values: duts.map(d => d.busType) },
            { name: 'calibrationStatus', values: duts.map(d => d.calibrationStatus) },
            { name: 'calibrationStatus', values: duts.map(d => d.calibrationStatus) },
            { name: 'calibrationStatus', values: duts.map(d => d.calibrationStatus) },
            { name: 'hardwareVersion', values: duts.map(d => d.hardwareVersion) },
            { name: 'Id', values: duts.map(d => d.id) },
            { name: 'IsNIAsset', values: duts.map(d => d.isNIAsset) },
            { name: 'isSystemController', values: duts.map(d => d.isSystemController) },
            { name: 'Keywords', values: duts.map(d => d.keywords) },
            { name: 'Location', values: duts.map(d => d.location) },
            { name: 'Model name', values: duts.map(d => d.modelName) },
            { name: 'Model number', values: duts.map(d => d.modelNumber) },
            { name: 'Self calibration', values: duts.map(d => d.selfCalibration) },
            { name: 'Supports external calibration', values: duts.map(d => d.supportsExternalCalibration) },
            { name: 'Supports self calibration', values: duts.map(d => d.supportsSelfCalibration) },
            { name: 'Supports self test', values: duts.map(d => d.supportsSelfTest) },
            { name: 'Temperature sensors', values: duts.map(d => d.temperatureSensors) },
            { name: 'Vendor name', values: duts.map(d => d.vendorName) },
            { name: 'Vendor number', values: duts.map(d => d.vendorNumber) },
            { name: 'Visa resource name', values: duts.map(d => d.visaResourceName) },
            { name: 'File ids', values: duts.map(d => d.fileIds) },
            { name: 'Supports reset', values: duts.map(d => d.supportsReset) },
            { name: 'Status', values: duts.map(d => d.status) },
            { name: 'Job status', values: duts.map(d => d.jobStatus) },
            { name: 'Utilization status', values: duts.map(d => d.utilizationStatus) },
            { name: 'Tags', values: duts.map(d => d.tags) },
          ],
        };
    }
  }

  async getTestResultsCountByStatusOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const passedResultsCount = await this.getResultsCountByStatus(partNumber, 'Passed');
    const failedResultsCount = await this.getResultsCountByStatus(partNumber, 'Failed');
    return {
      refId,
      fields: [
        { name: 'Passed', values: [passedResultsCount] },
        { name: 'Failed', values: [failedResultsCount] }
      ],
    };
  }

  async getProductDetailsOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const product = await this.getProductDetails(partNumber);
    return {
      refId,
      fields: [
        { name: 'Name', values: [product.name] },
        { name: 'Family', values: [product.family] },
        { name: 'Part Number', values: [product.partNumber] },
        { name: 'Updated', values: [dateTime(product.updatedAt).format('MMM DD, YYYY, h:mm:ss A')] }
      ],
    };
  }

  async getEntityCountsOutput(refId: string, partNumber: string): Promise<DataFrameDTO> {
    const productId = (await this.getProductDetails(partNumber)).id;
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
  shouldRunQuery(query: ProductQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }

  async getProductDetails(partNumber: string): Promise<Product> {
    return await this.post<QueryProductsResponse>(`${this.queryProductsUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      take: 1
    }).then(response => response.products[0]);
  }

  async getResults(partNumber: string, from: string, to: string): Promise<Results[]> {
    return await this.post<QueryResultsHttpResponse>(`${this.queryResultsUrl}`, {
      productFilter: `partNumber = "${partNumber}"`,
      filter: `(DateTime(updatedAt) > DateTime.parse(\"${from}\") && DateTime(updatedAt) < DateTime.parse(\"${to}\"))`,
    }).then(response => response.results);
  }

  async getDuts(partNumber: string): Promise<Asset[]> {
    return await this.post<AssetResponse>(`${this.queryAssetsUrl}`, {
      filter: `(AssetType = "DEVICE_UNDER_TEST" && partNumber = "${partNumber}")`,
      take: 1000
    }).then(response => response.assets);
  }

  async getSpecsCount(productId: string): Promise<number> {
    return await this.post<QuerySpecsResponse>(`${this.querySpecsUrl}`, {
      productIds: [
        productId
      ]
    }).then(response => response.specs.length);
  }

  async getSpecs(productId: string, from: string, to: string): Promise<Specs[]> {
    return await this.post<QuerySpecsResponse>(`${this.querySpecsUrl}`, {
      productIds: [
        productId
      ],
      filter: `(DateTime(updatedAt) > DateTime.parse(\"${from}\") && DateTime(updatedAt) < DateTime.parse(\"${to}\"))`,
    }).then(response => response.specs);
  }

  async getTestPlansCount(partNumber: string): Promise<number> {
    return await this.post<QueryTestPlansResponse>(`${this.queryTestPlansUrl}`, {
      filter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    }).then(response => response.totalCount ?? 0);
  }

  async getTestPlans(partNumber: string, from: string, to: string): Promise<TestPlan[]> {
    return await this.post<QueryTestPlansResponse>(`${this.queryTestPlansUrl}`, {
      filter: `partNumber = "${partNumber}" && (DateTime(updatedAt) > DateTime.parse(\"${from}\") && DateTime(updatedAt) < DateTime.parse(\"${to}\"))`,
      returnCount: true
    }).then(response => response.testPlans);
  }

  async getResultsCount(partNumber: string): Promise<number> {
    const response = await this.post<QueryCountResponse>(`${this.queryResultsUrl}`, {
      productFilter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    });
    return response.totalCount;
  }

  async getResultsCountByStatus(partNumber: string, status: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryResultsUrl}`, {
      filter: `status.statusType = "${status}"`,
      productFilter: `partNumber = "${partNumber}"`,
      returnCount: true,
      take: 0
    }).then(response => response.totalCount);
  }

  async getDutsCount(partNumber: string): Promise<number> {
    return await this.post<QueryCountResponse>(`${this.queryAssetsUrl}`, {
      filter: `(AssetType = "DEVICE_UNDER_TEST" && partNumber = "${partNumber}")`,
      take: 0
    }).then(response => response.totalCount);
  }
}
