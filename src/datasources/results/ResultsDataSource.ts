import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, dateTime, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryResultsHttpResponse, QueryStepsHttpResponse, ResultsQuery as TestResultsQuery, ResultsQueryType, ResultsVariableQuery } from './types';

export class TestResultsDataSource extends DataSourceBase<TestResultsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;
  queryResultsUrl = this.baseUrl + '/nitestmonitor/v2/query-results';
  getResultsCountUrl = this.baseUrl + '/nitestmonitor/v2/results';
  queryStepsUrl = this.baseUrl + '/nitestmonitor/v2/query-steps';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  }
  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

  defaultQuery = {
    type: ResultsQueryType.MetaData,
    recordCount: 1000,
    outputType: OutputType.Data,
    useTimeRange: false,
  };

  async queryResults(filter: string, orderBy?: string, recordCount = 1000, descending = false, returnCount = false): Promise<QueryResultsHttpResponse> {
    return await this.post<QueryResultsHttpResponse>(`${this.queryResultsUrl}`, {
      filter: filter,
      orderBy: orderBy,
      descending: descending,
      take: recordCount,
      returnCount: returnCount
    }).then(response => response);
  }

  async queryTestResultValues(field: string, startsWith: string, filter?: string): Promise<string[]> {
    if (!startsWith || startsWith.startsWith('$')) {
      return this.getVariableOptions();
    }
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.baseUrl + '/nitestmonitor/v2/query-result-values', data);
    return values.slice(0, 20).filter((value: string) => value);
  }
  getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => '$' + v.name);
  };

  async queryStepsValues(field: string, startsWith: string): Promise<string[]> {
    if (!startsWith || startsWith.startsWith('$')) {
      return this.getVariableOptions();
    }
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.baseUrl + '/nitestmonitor/v2/query-step-values', data);
    return values.slice(0, 20).filter((value: string) => value);
  }

  async runQuery(query: TestResultsQuery, options: DataQueryRequest): Promise<DataFrameDTO> {
    const filter = [
      query.partNumber ? `partNumber = (\"${query.partNumber}\")` : '',
      query.testProgram ? `programName = (\"${query.testProgram}\")` : '',
      query.workspace ? `workspace = (\"${query.workspace}\")` : '',
    ].filter(Boolean).join(' && ');

    if (query.type === ResultsQueryType.MetaData || query.type === ResultsQueryType.DataTables) {
      let queryByFilter = filter && query.queryBy ? `${filter} && ${query.queryBy}` : filter || query.queryBy;
      if (query.useTimeRange && query.useTimeRangeFor) {
        const timeFilter = `(${this.timeRange[query.useTimeRangeFor]} >= \"${this.fromDateString}\" && ${this.timeRange[query.useTimeRangeFor]} <= \"${this.toDateString}\")`
        queryByFilter = queryByFilter ? `${queryByFilter} && ${timeFilter}` : timeFilter
      }
      const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars)

      const responseData = (await this.queryResults(variableReplacedFilter, query.orderBy, query.recordCount, query.descending, true));
      if (query.type === ResultsQueryType.MetaData) {
        if (query.outputType === OutputType.Data) {
          const results = responseData.results;
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
              { name: 'Data tables', values: results.map(r => r.dataTableIds) },
              { name: 'File ids', values: results.map(r => r.fileIds) },
              { name: 'Id', values: results.map(r => r.id) },
              { name: 'Host name', values: results.map(r => r.hostName) },
              { name: 'Operator', values: results.map(r => r.operator) },
              { name: 'Keywords', values: results.map(r => r.keywords) },
              { name: 'Properties', values: results.map(r => r.properties) },
              { name: 'Status summary', values: results.map(r => r.statusTypeSummary) },
              { name: 'Workspace', values: results.map(r => r.workspace) },
            ],
          };
        }
        else {
          return {
            refId: query.refId,
            fields: [
              { name: 'Total count', values: [responseData.totalCount] }
            ],
          };
        }
      }
      else {
        const dataTableIds = responseData.results.map(r => r.dataTableIds)
        if (query.outputType === OutputType.Data) {
          return {
            refId: query.refId,
            fields: [
              { name: 'DataTables', values: [...dataTableIds.flat()] }
            ]
          }
        } else {
          return {
            refId: query.refId,
            fields: [
              { name: 'Total count', values: [dataTableIds.length] }
            ]
          }
        }
      }
    } else {
      const response = await this.post<QueryStepsHttpResponse>(this.queryStepsUrl, {
        resultFilter: query.resultFilter,
        take: 1000,
        filter: query.stepFilter,
      });
      return {
        refId: query.refId,
        fields: [
          { name: 'Step Name', values: response.steps.map(step => step.name) },
          { name: 'Step Type', values: response.steps.map(step => step.stepType) },
          { name: 'Step Id', values: response.steps.map(step => step.stepId) },
          { name: 'Parent Id', values: response.steps.map(step => step.parentId) },
          { name: 'Result Id', values: response.steps.map(step => step.resultId) },
          { name: 'Path', values: response.steps.map(step => step.path) },
          { name: 'Path Ids', values: response.steps.map(step => step.pathIds) },
          { name: 'Status', values: response.steps.map(step => step.status) },
          { name: 'Total Time (s)', values: response.steps.map(step => step.totalTimeInSeconds) },
          { name: 'Started At', values: response.steps.map(step => step.startedAt) },
          { name: 'Updated At', values: response.steps.map(step => step.updatedAt) },
          { name: 'Inputs', values: response.steps.map(step => step.inputs) },
          { name: 'Outputs', values: response.steps.map(step => step.outputs) },
          { name: 'Data Model', values: response.steps.map(step => step.dataModel) },
          { name: 'Data', values: response.steps.map(step => step.data) },
          { name: 'Has Children', values: response.steps.map(step => step.hasChildren) },
          { name: 'Workspace', values: response.steps.map(step => step.workspace) },
          { name: 'Keywords', values: response.steps.map(step => step.keywords) },
          { name: 'Properties', values: response.steps.map(step => step.properties) },
        ],
      };
    }
  }

  async metricFindQuery({ type, queryBy, workspace, useTimeRange, useTimeRangeFor, resultFilter, stepFilter }: ResultsVariableQuery, options: DataQueryRequest): Promise<MetricFindValue[]> {
    const workspaceFilter = `workspace = (\"${workspace}\")`;
    if (type === ResultsQueryType.MetaData || type === ResultsQueryType.DataTables) {
      let queryByFilter = workspace && queryBy ? `${workspaceFilter} && ${queryBy}` : `${workspaceFilter}` || queryBy;
      const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars);
      const responseData = (await this.queryResults(variableReplacedFilter, '', 1000, false, false)).results;
      if (type === ResultsQueryType.MetaData) {
        return responseData.map(frame => ({ text: `${frame.programName}`, value: frame.partNumber, }));
      } else {
        const dataTableIds = responseData.map(frame => frame.dataTableIds).flat();
        return dataTableIds.map(dataTableId => ({ text: dataTableId, value: dataTableId }));
      }
    } else {
      const response = await this.post<QueryStepsHttpResponse>(this.queryStepsUrl, {
        resultFilter: resultFilter,
        take: 1000,
        filter: stepFilter,
      });
      return response.steps.map(step => ({ text: step.name, value: step.name }));
    }
  }

  shouldRunQuery(query: TestResultsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/bar');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
