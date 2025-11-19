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
import { Observable, forkJoin, of, timer, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
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
  NotebookResult,
  NotebookDataFrame,
  TableColumn,
} from './types';

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
      .map(q => this.runQueryInternal$(q, request), this);

    if (queries$.length === 0) {
      return of({ data: [] });
    }

    return forkJoin(queries$).pipe(
      map((results) => ({ data: results.flat() })),
    );
  }

  private runQueryInternal$(query: NotebookQuery, options: DataQueryRequest<NotebookQuery>): Observable<DataFrameDTO[]> {
    const parameters = this.replaceParameterVariables(query.parameters, options);
    return this.executeNotebook$(query.id, query.workspace, parameters, query.cacheTimeout).pipe(
      map(execution => {
        if (execution.status !== ExecutionStatus.SUCCEEDED) {
          throw new Error(
            `Notebook execution failed with status: ${execution.status} and error code: ${execution.errorCode}. Exception: ${execution.exception}.`
          );
        }

        if (!this.validateExecution(execution.result)) {
          throw new Error('The output for the notebook does not match the expected SystemLink format.');
        }

        const result = query.output
          ? execution.result.result.find((result: NotebookResult) => result.id === query.output)
          : execution.result.result[0];

        if (!result) {
          throw new Error(`The output of the notebook does not contain an output with id '${query.output}'.`);
        }

        const frames = this.transformResultToDataFrames(result, query);
        return frames.length > 0 ? frames : [{ refId: query.refId, fields: [] }];
      })
    );
  }

  runQuery(query: NotebookQuery, options: DataQueryRequest<NotebookQuery>): Observable<DataFrameDTO> {
    return this.runQueryInternal$(query, options).pipe(
      map(frames => frames[0] || { refId: query.refId, fields: [] })
    );
  }

  replaceParameterVariables(parameters: Record<string, any>, options: DataQueryRequest<NotebookQuery>): Record<string, any> {
    return Object.keys(parameters).reduce((result, key) => {
      result[key] =
        typeof parameters[key] === 'string'
          ? this.templateSrv.replace(parameters[key], options.scopedVars)
          : parameters[key];

      return result;
    }, {} as Record<string, any>);
  }

  transformResultToDataFrames(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    switch (result.type) {
      case ResultType.DATA_FRAME:
        return this.handleDataFrameResult(result, query);
      case ResultType.ARRAY:
        return this.handleArrayResult(result, query);
      case ResultType.SCALAR:
        return this.handleScalarResult(result, query);
      default:
        return [];
    }
  }

  private handleDataFrameResult(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    if (Array.isArray(result.data)) {
      return this.handleArrayDataFrame(result, query);
    }
    return this.handleTableDataFrame(result, query);
  }

  private handleArrayDataFrame(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    const frames = [];
    for (let [ix, dataframe] of (result.data as NotebookDataFrame[]).entries()) {
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

  private addDataFrameFields(frame: DataFrameDTO, dataframe: NotebookDataFrame): void {
    if (dataframe.format === DataFrameFormat.XY) {
      this.addXYFields(frame, dataframe);
    } else if (dataframe.format === DataFrameFormat.INDEX) {
      this.addIndexFields(frame, dataframe);
    }
  }

  private addXYFields(frame: DataFrameDTO, dataframe: NotebookDataFrame): void {
    if (dataframe.x && typeof dataframe.x[0] === 'string') {
      frame.fields.push({ name: '', values: dataframe.x, type: FieldType.time });
    } else if (dataframe.x) {
      frame.fields.push({ name: '', values: dataframe.x });
    }
    frame.fields.push({ name: '', values: dataframe.y });
  }

  private addIndexFields(frame: DataFrameDTO, dataframe: NotebookDataFrame): void {
    frame.fields.push({ name: 'Index', values: range(0, dataframe.y.length) });
    frame.fields.push({ name: '', values: dataframe.y });
  }

  private handleTableDataFrame(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    const frame: DataFrameDTO = { refId: query.refId, fields: [] };
    const tableData = result.data as { columns: TableColumn[]; values: any[][] };
    for (let [ix, column] of tableData.columns.entries()) {
      const values = tableData.values.map((row: any[]) => row[ix]);
      frame.fields.push({ name: column.name, ...this.getFieldTypeAndValues(column, values) });
    }
    return [frame];
  }

  private handleArrayResult(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    return [{ refId: query.refId, fields: [{ name: result.id, values: result.data as any[] }] }];
  }

  private handleScalarResult(result: NotebookResult, query: NotebookQuery): DataFrameDTO[] {
    const field = { name: result.id, values: [result.value] };
    return [{ refId: query.refId, fields: [field] }];
  }

  private getFieldTypeAndValues(column: TableColumn, values: any[]): { type: FieldType; values: any[] } {
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

  private executeNotebook$(notebookId: string, workspaceId: string, parameters: Record<string, any>, cacheTimeout: number): Observable<Execution> {
    return this.post$<{ executions: Array<{ id: string }> }>(
      `${this.executionUrl}/executions`,
      [{ notebookId, workspaceId, parameters, resultCachePeriod: cacheTimeout, priority: ExecutionPriority.MEDIUM }]
    ).pipe(
      switchMap(response => this.handleNotebookExecution$(response.executions[0].id)),
      catchError((e) => throwError(() => new Error(
        `The request to execute the notebook failed with error: ${(e as Error).message}`
      )))
    );
  }

  private handleNotebookExecution$(id: string): Observable<Execution> {
    return this.get$<Execution>(`${this.executionUrl}/executions/${id}`).pipe(
      switchMap(execution => {
        if (execution.status === ExecutionStatus.QUEUED || execution.status === ExecutionStatus.IN_PROGRESS) {
          return timer(3000).pipe(switchMap(() => this.handleNotebookExecution$(id)));
        }

        return of(execution);
      })
    );
  }

  queryNotebooks$(path: string): Observable<Notebook[]> {
    const filter = `name.Contains("${path}") && type == "Notebook"`;
    return this.post$<{ webapps: Notebook[] }>(
      `${this.webappsUrl}/webapps/query`,
      { filter, take: 1000 }
    ).pipe(
      map(response => response.webapps),
      catchError((e) => throwError(() => new Error(
        `The query for SystemLink notebooks failed with error: ${(e as Error).message}`
      )))
    );
  }

  getNotebookMetadata$(id: string): Observable<{ metadata: Record<string, any>; parameters: Record<string, any> }> {
    return this.get$<{ metadata: Record<string, any>; parameters: Record<string, any> }>(
      `${this.parserUrl}/notebook/${id}`
    ).pipe(
      map(response => {
        if (!this.validateMetadata(response)) {
          throw new Error('The metadata of the notebook does not match the expected SystemLink format.');
        }
        return { metadata: response.metadata, parameters: response.parameters };
      }),
      catchError((error) => throwError(() => new Error(
        `The query for notebook metadata failed with error: ${(error as Error).message}`
      )))
    );
  }

  queryTestResultValues$(field: string, startsWith: string): Observable<string[]> {
    return this.post$<string[]>(
      `${this.testMonitorUrl}/query-result-values`,
      { field, startsWith }
    ).pipe(
      // Filter out values that are '' or null
      map(values => values.slice(0, 20).filter((value: string) => value))
    );
  }

  async testDatasource(): Promise<TestDataSourceResponse> {
    await this.get(`${this.authUrl}/auth`);
    return { status: 'success', message: 'Success' };
  }
}
