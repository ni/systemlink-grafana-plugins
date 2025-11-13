/**
 * DataSource is a TypeScript class that implements the logic for executing and querying
 * notebooks. The 'query' method is called from Grafana's internals when a panel requests data.
 */
import range from 'lodash/range';
import Ajv, { ValidateFunction } from 'ajv';

import {
  DataQueryRequest,
  DataSourceInstanceSettings,
  DataFrameDTO,
  FieldType,
  toUtc,
  TestDataSourceResponse,
  DataQueryResponse,
} from '@grafana/data';
import { BackendSrv, getBackendSrv, getTemplateSrv, TemplateSrv } from '@grafana/runtime';
import { DataSourceBase } from 'core/DataSourceBase';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  NotebookQuery,
  NotebookDataSourceOptions,
  defaultQuery,
  Notebook,
  Execution,
  ExecutionPriority,
  ExecutionStatus,
  ResultType,
  DataFrameFormat,
} from './types';
import { timeout } from './utils';

import { NotebookVariableSupport } from './variables';
import { notebookMetadataSchema, executionResultSchema } from './data/schema';


export class DataSource extends DataSourceBase<NotebookQuery, NotebookDataSourceOptions> {
  public defaultQuery: Partial<NotebookQuery> & Omit<NotebookQuery, 'refId'> = {
    ...defaultQuery,
    id: defaultQuery.id!,
    workspace: defaultQuery.workspace!,
    parameters: defaultQuery.parameters!,
    output: defaultQuery.output!,
    cacheTimeout: defaultQuery.cacheTimeout!,
  };

  private readonly executionUrl = this.instanceSettings.url + '/ninbexecution/v1';
  private readonly parserUrl = this.instanceSettings.url + '/ninbparser/v1';
  private readonly webappsUrl = this.instanceSettings.url + '/niapp/v1';
  private readonly testMonitorUrl = this.instanceSettings.url + '/nitestmonitor/v2';
  private readonly authUrl = this.instanceSettings.url + '/niauth/v1';

  private validateExecution: ValidateFunction<any>;
  private validateMetadata: ValidateFunction<any>;

  constructor(
    readonly instanceSettings: DataSourceInstanceSettings<NotebookDataSourceOptions>,
    readonly backendSrv: BackendSrv = getBackendSrv(),
    readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings, backendSrv, templateSrv);

    let ajv = new Ajv({ strictTuples: false });
    this.validateExecution = ajv.compile(executionResultSchema);
    this.validateMetadata = ajv.compile(notebookMetadataSchema);

    this.variables = new NotebookVariableSupport();
  }

  shouldRunQuery(query: NotebookQuery): boolean {
    return !query.hide && Boolean(query.id) && Boolean(query.workspace);
  }

  // Override query method to handle multiple frames per query
  query(request: DataQueryRequest<NotebookQuery>): Observable<DataQueryResponse> {
    const queries$ = request.targets
      .map(this.prepareQuery, this)
      .filter(this.shouldRunQuery, this)
      .map(q => from(this.runQueryInternal(q, request)), this);

    if (queries$.length === 0) {
      return of({ data: [] });
    }

    return forkJoin(queries$).pipe(
      map((results) => ({ data: results.flat() })),
    );
  }

  private async runQueryInternal(query: NotebookQuery, options: DataQueryRequest<NotebookQuery>): Promise<DataFrameDTO[]> {
    const parameters = this.replaceParameterVariables(query.parameters, options);
    const execution = await this.executeNotebook(query.id, query.workspace, parameters, query.cacheTimeout);

    if (execution.status !== ExecutionStatus.SUCCEEDED) {
      throw new Error(
        `Notebook execution failed with status: ${execution.status} and error code: ${execution.errorCode}. Exception: ${execution.exception}.`
      );
    }

    if (!this.validateExecution(execution.result)) {
      throw new Error('The output for the notebook does not match the expected SystemLink format.');
    }

    const result = query.output
      ? execution.result.result.find((result: any) => result.id === query.output)
      : execution.result.result[0];

    if (!result) {
      throw new Error(`The output of the notebook does not contain an output with id '${query.output}'.`);
    }

    const frames = this.transformResultToDataFrames(result, query);
    return frames.length > 0 ? frames : [{ refId: query.refId, fields: [] }];
  }

  async runQuery(query: NotebookQuery, options: DataQueryRequest<NotebookQuery>): Promise<DataFrameDTO> {
    const frames = await this.runQueryInternal(query, options);
    return frames[0] || { refId: query.refId, fields: [] };
  }

  replaceParameterVariables(parameters: any, options: DataQueryRequest<NotebookQuery>) {
    return Object.keys(parameters).reduce((result, key) => {
      result[key] =
        typeof parameters[key] === 'string'
          ? this.templateSrv.replace(parameters[key], options.scopedVars)
          : parameters[key];

      return result;
    }, {} as { [key: string]: any });
  }

  transformResultToDataFrames(result: any, query: NotebookQuery) {
    const typeHandlers = {
      [ResultType.DATA_FRAME]: () => this.handleDataFrameResult(result, query),
      [ResultType.ARRAY]: () => this.handleArrayResult(result, query),
      [ResultType.SCALAR]: () => this.handleScalarResult(result, query),
    };

    const handler = typeHandlers[result.type as keyof typeof typeHandlers];
    return handler ? handler() : [];
  }

  private handleDataFrameResult(result: any, query: NotebookQuery) {
    if (Array.isArray(result.data)) {
      return this.handleArrayDataFrame(result, query);
    }
    return this.handleTableDataFrame(result, query);
  }

  private handleArrayDataFrame(result: any, query: NotebookQuery) {
    const frames = [];
    for (let [ix, dataframe] of result.data.entries()) {
      const frame: DataFrameDTO = {
        refId: query.refId,
        fields: [],
        name: result.config?.graph?.plot_labels?.[ix],
      };

      this.addDataFrameFields(frame, dataframe);
      frames.push(frame);
    }
    return frames;
  }

  private addDataFrameFields(frame: DataFrameDTO, dataframe: any) {
    if (dataframe.format === DataFrameFormat.XY) {
      this.addXYFields(frame, dataframe);
    } else if (dataframe.format === DataFrameFormat.INDEX) {
      this.addIndexFields(frame, dataframe);
    }
  }

  private addXYFields(frame: DataFrameDTO, dataframe: any) {
    if (typeof dataframe.x[0] === 'string') {
      frame.fields.push({ name: '', values: dataframe.x, type: FieldType.time });
    } else {
      frame.fields.push({ name: '', values: dataframe.x });
    }
    frame.fields.push({ name: '', values: dataframe.y });
  }

  private addIndexFields(frame: DataFrameDTO, dataframe: any) {
    frame.fields.push({ name: 'Index', values: range(0, dataframe.y.length) });
    frame.fields.push({ name: '', values: dataframe.y });
  }

  private handleTableDataFrame(result: any, query: NotebookQuery) {
    const frame: DataFrameDTO = { refId: query.refId, fields: [] };
    for (let [ix, column] of result.data.columns.entries()) {
      const values = result.data.values.map((row: any) => row[ix]);
      frame.fields.push({ name: column.name, ...this.getFieldTypeAndValues(column, values) });
    }
    return [frame];
  }

  private handleArrayResult(result: any, query: NotebookQuery) {
    return [{ refId: query.refId, fields: [{ name: result.id, values: result.data }] }];
  }

  private handleScalarResult(result: any, query: NotebookQuery) {
    const field = { name: result.id, values: [result.value] };
    return [{ refId: query.refId, fields: [field] }];
  }

  private getFieldTypeAndValues(column: any, values: any[]) {
    const result = { type: FieldType.other, values };
    switch (column.type) {
      case 'string':
        result.type = FieldType.string;
        break;
      case 'boolean':
        result.type = FieldType.boolean;
        break;
      case 'number':
      case 'integer':
        result.type = FieldType.number;
        break;
      case 'datetime':
        result.type = FieldType.time;
        if (column.tz === 'UTC') {
          result.values = values.map((dateString) => {
            return toUtc(dateString).format();
          });
        }
        break;
    }

    return result;
  }

  private async executeNotebook(notebookId: string, workspaceId: string, parameters: any, cacheTimeout: number) {
    try {
      const response = await this.post<{ executions: Array<{ id: string }> }>(
        `${this.executionUrl}/executions`,
        [{ notebookId, workspaceId, parameters, resultCachePeriod: cacheTimeout, priority: ExecutionPriority.MEDIUM }]
      );

      return this.handleNotebookExecution(response.executions[0].id);
    } catch (e) {
      throw new Error(
        `The request to execute the notebook failed with error: ${(e as Error).message}`
      );
    }
  }

  private async handleNotebookExecution(id: string): Promise<Execution> {
    const execution = await this.get<Execution>(`${this.executionUrl}/executions/${id}`);

    if (execution.status === ExecutionStatus.QUEUED || execution.status === ExecutionStatus.IN_PROGRESS) {
      await timeout(3000);
      return this.handleNotebookExecution(id);
    }

    return execution;
  }

  async queryNotebooks(path: string): Promise<Notebook[]> {
    const filter = `name.Contains("${path}") && type == "Notebook"`;
    try {
      const response = await this.post<{ webapps: Notebook[] }>(
        `${this.webappsUrl}/webapps/query`,
        { filter, take: 1000 }
      );
      return response.webapps;
    } catch (e) {
      throw new Error(
        `The query for SystemLink notebooks failed with error: ${(e as Error).message}`
      );
    }
  }

  async getNotebookMetadata(id: string): Promise<{ metadata: any; parameters: any }> {
    let response;
    try {
      response = await this.get<{ metadata: any; parameters: any }>(
        `${this.parserUrl}/notebook/${id}`
      );

      if (!this.validateMetadata(response)) {
        throw new Error('The metadata of the notebook does not match the expected SystemLink format.');
      }

      return { metadata: response.metadata, parameters: response.parameters };
    } catch (error) {
      throw new Error(`The query for notebook metadata failed with error ${error}.`);
    }
  }

  async queryTestResultValues(field: string, startsWith: string): Promise<string[]> {
    const values = await this.post<string[]>(
      `${this.testMonitorUrl}/query-result-values`,
      { field, startsWith }
    );
    // Filter out values that are '' or null
    return values.slice(0, 20).filter((value: string) => value);
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(`${this.authUrl}/auth`);
    return { status: 'success', message: 'Success' };
  }
}
