import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, dateTime, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryResultsHttpResponse, QueryStepsHttpResponse, ResultsQuery, ResultsQueryType } from './types';
import { take } from 'lodash';

export class ResultsDataSource extends DataSourceBase<ResultsQuery> {
  constructor(
    readonly instanceSettings: DataSourceInstanceSettings,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);
  }

  baseUrl = this.instanceSettings.url;
  getResultsUrl = this.baseUrl + '/nitestmonitor/v2/results';
  queryStepsUrl = this.baseUrl + '/nitestmonitor/v2/query-steps';

  defaultQuery = {
    type: ResultsQueryType.MetaData,
    outputType: OutputType.Data
  };

  async queryResults(): Promise<QueryResultsHttpResponse> {
    return await this.get<QueryResultsHttpResponse>(`${this.getResultsUrl}`, {
      returnCount: true
    }).then(response => response);
  }

  async queryTestResultValues(field: string, startsWith: string): Promise<string[]> {
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

  async runQuery(query: ResultsQuery, { range }: DataQueryRequest): Promise<DataFrameDTO> {
    if (query.type === ResultsQueryType.MetaData) {
      if (query.outputType === OutputType.Data) {
        const results = (await this.queryResults()).results;
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
      }
    else {
      return {
      refId: query.refId,
      fields: [
       { name: 'Total count', values: take([(await this.queryResults()).totalCount], 1),}
      ],
    };
    }
  } else {
    const response = await this.post<QueryStepsHttpResponse>(this.queryStepsUrl, {
      resultFilter: query.resultFilter,
      filter: query.stepFilter,
    });
    return {
      refId: query.refId,
      fields:  [
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

  shouldRunQuery(query: ResultsQuery): boolean {
    return true;
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    // TODO: Implement a health and authentication check
    await this.backendSrv.get(this.baseUrl + '/bar');
    return { status: 'success', message: 'Data source connected and authentication successful!' };
  }
}
