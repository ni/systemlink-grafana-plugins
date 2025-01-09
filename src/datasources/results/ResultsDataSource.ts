import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, FieldType, MetricFindValue, TestDataSourceResponse } from '@grafana/data';
import { BackendSrv, TemplateSrv, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { OutputType, QueryResultsHttpResponse, QueryStepsHttpResponse, ResultsQuery as TestResultsQuery, ResultsQueryType, ResultsVariableQuery, ResultsProperties, QueryDataTablesHttpResponse, DataTablesProperties, ResultsVariableQueryType } from './types';

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
  queryTablesUrl = this.baseUrl + '/nidataframe/v1/tables';
  getResultsCountUrl = this.baseUrl + '/nitestmonitor/v2/results';
  queryStepsUrl = this.baseUrl + '/nitestmonitor/v2/query-steps';

  private timeRange: { [key: string]: string } = {
    Started: 'startedAt',
    Updated: 'updatedAt',
  }
  private fromDateString = '${__from:date}';
  private toDateString = '${__to:date}';

  defaultQuery = {
    type: ResultsQueryType.Results,
    recordCount: 1000,
    outputType: OutputType.Data,
    useTimeRange: false,
  };

  async getWorkspaceNames(): Promise<{ label: string, value: string }[]> {
    const workspaces = await this.getWorkspaces();
    const workspaceOptions = workspaces.map(w => ({ label: w.name, value: w.id }));
    const variables = this.getVariableOptions().map(v => ({ label: v, value: v }))
    workspaceOptions?.unshift(...variables)
    return workspaceOptions;
  }

  async queryResults(filter: string, projection?: ResultsProperties[], orderBy?: string, recordCount = 1000, descending = false, returnCount = false): Promise<QueryResultsHttpResponse> {
    return await this.post<QueryResultsHttpResponse>(`${this.queryResultsUrl}`, {
      filter: filter,
      projection: projection ? projection : undefined,
      orderBy: orderBy,
      orderByDescending: descending,
      take: recordCount,
      returnCount: returnCount
    }).then(response => response);
  }

  async queryDataTables(id: string, orderBy?: string, workspace?: string[], recordCount = 1000, descending = false): Promise<QueryDataTablesHttpResponse> {
    return await this.get<QueryDataTablesHttpResponse>(`${this.queryTablesUrl}`, {
      id: id,
      orderBy: orderBy,
      descending: descending,
      take: recordCount,
      workspace: workspace
    }).then(response => response);
  }

  async queryTestResultValues(field: string, startsWith: string,): Promise<string[]> {
    if (!startsWith || startsWith.startsWith('$')) {
      return this.getVariableOptions();
    }
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.baseUrl + '/nitestmonitor/v2/query-result-values', data);
    return values.slice(0, 20).filter((value: string) => value);
  }

  private getVariableOptions = () => {
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
    if (query.type === ResultsQueryType.Results) {
      let queryByFilter = query.queryBy ? query.queryBy : '';
      if (query.useTimeRange && query.useTimeRangeFor) {
        const timeFilter = `(${this.timeRange[query.useTimeRangeFor]} >= \"${this.fromDateString}\" && ${this.timeRange[query.useTimeRangeFor]} <= \"${this.toDateString}\")`
        queryByFilter = queryByFilter ? `${queryByFilter} && ${timeFilter}` : timeFilter
      }
      const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars)
      if (query.type === ResultsQueryType.Results) {
        const responseData = (await this.queryResults(variableReplacedFilter, query.properties?.length ? query.properties : undefined, query.orderBy, query.recordCount, query.descending, true));
        if (query.outputType === OutputType.Data) {
          const response = responseData.results;

          const filteredFields = query.properties?.filter((field: ResultsProperties) => Object.keys(response[0]).includes(field)) || [];

          const status = response.map(result => result['status']?.statusType);

          const fields = filteredFields.map((field) => {
            const fieldType = field === ResultsProperties.updated ? FieldType.time : FieldType.string;
            const values = response.map(m => m[field]);
            if (field === ResultsProperties.status.toLowerCase()) {
              return { name: field, values: status.flat(), type: FieldType.string };
            }
            return { name: field, values, type: fieldType };
          });

          return {
            refId: query.refId,
            fields: fields,
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
        const responseData = (await this.queryResults(variableReplacedFilter, [ResultsProperties.dataTablesIds], query.orderBy, query.recordCount, query.descending, true));
        const dataTableIds = responseData.results.map(r => r.dataTableIds).flat();
        const dataTables = await this.queryDataTables(dataTableIds.join(','), query.orderBy, query.workspace ? [query.workspace] : undefined, query.recordCount, query.descending); console.log(query.properties)
        if (query.outputType === OutputType.Data) {
          if (dataTables.dataTables.length === 0) {
            return {
              refId: query.refId,
              fields: [
                { name: 'ID', values: [dataTableIds] }
              ]
            };
          } else {
            const fields = (query.properties as unknown as DataTablesProperties[])?.map((field) => {
              const values = dataTables!.dataTables.map(m => m[field]);
              return { name: field, values };
            })
            return {
              refId: query.refId,
              fields: fields

            }
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
      let queryByStepFilter = query.stepFilter;
      if (query.useTimeRange && query.useTimeRangeFor) {
        const timeFilter = `(${this.timeRange[query.useTimeRangeFor]} >= \"${this.fromDateString}\" && ${this.timeRange[query.useTimeRangeFor]} <= \"${this.toDateString}\")`
        queryByStepFilter = queryByStepFilter ? `${queryByStepFilter} && ${timeFilter}` : timeFilter
      }

      const variableReplacedResultFilter = getTemplateSrv().replace(query.resultFilter, options.scopedVars);
      const variableReplacedStepFilter = getTemplateSrv().replace(queryByStepFilter, options.scopedVars);
      const response = await this.post<QueryStepsHttpResponse>(this.queryStepsUrl, {
        resultFilter: variableReplacedResultFilter,
        projection: query.properties ? query.properties : undefined,
        orderBy: query.orderBy,
        descending: query.descending,
        take: query.recordCount,
        filter: variableReplacedStepFilter,
      });
      if (!query.measurementAsEntries) {
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
      } else {
        const measurementName = response.steps.map(step => step.data.parameters.map(param => param.name))
        const measurementStatus = response.steps.map(step => step.data.parameters.map(param => param.status))
        const measurementValue = response.steps.map(step => step.data.parameters.map(param => param.measurement))
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
            { name: 'MeasurementName', values: measurementName.flat() },
            { name: 'MeasurementValue', values: measurementValue.flat() },
            { name: 'MeasurementStatus', values: measurementStatus.flat() },
            { name: 'Has Children', values: response.steps.map(step => step.hasChildren) },
            { name: 'Workspace', values: response.steps.map(step => step.workspace) },
            { name: 'Keywords', values: response.steps.map(step => step.keywords) },
            { name: 'Properties', values: response.steps.map(step => step.properties) },
          ],
        };
      }
    }
  }

  async metricFindQuery({ type, queryBy, workspace, resultFilter, stepFilter, properties }: ResultsVariableQuery, options: DataQueryRequest): Promise<MetricFindValue[]> {
    const workspaceFilter = `workspace = (\"${workspace}\")`;
    if (type === ResultsVariableQueryType.Results) {
      let queryByFilter = workspace && queryBy ? `${workspaceFilter} && ${queryBy}` : `${workspaceFilter}` || queryBy;
      const variableReplacedFilter = getTemplateSrv().replace(queryByFilter, options.scopedVars);
      if (type === ResultsVariableQueryType.Results) {
        const responseData = (await this.queryResults(variableReplacedFilter, [ResultsProperties.programName], undefined, 1000, false, false)).results;
        return responseData.map(frame => ({ text: frame.programName, value: frame.programName, }));
      } else {
        const responseData = (await this.queryResults(variableReplacedFilter, [ResultsProperties.dataTablesIds], undefined, 1000, false, false)).results;
        const dataTableIds = responseData.map(frame => frame.dataTableIds).flat();
        return dataTableIds.map(dataTableId => ({ text: dataTableId, value: dataTableId }));
      }
    } else {
      const variableReplacedResultFilter = getTemplateSrv().replace(resultFilter, options.scopedVars);
      const variableReplacedStepFilter = getTemplateSrv().replace(stepFilter, options.scopedVars);
      const response = await this.post<QueryStepsHttpResponse>(this.queryStepsUrl, {
        resultFilter: variableReplacedResultFilter,
        take: 1000,
        filter: variableReplacedStepFilter,
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
