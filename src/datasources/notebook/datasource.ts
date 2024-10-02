/**
 * DataSource is a TypeScript class that implements the logic for executing and querying
 * notebooks. The 'query' method is called from Grafana's internals when a panel requests data.
 */
import defaults from 'lodash/defaults';
import range from 'lodash/range';
import Ajv, { ValidateFunction } from 'ajv';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  DataQueryResponseData,
  toUtc,
} from '@grafana/data';
import { getBackendSrv, getTemplateSrv, FetchError } from '@grafana/runtime';
import {
  NotebookQuery,
  NotebookDataSourceOptions,
  defaultQuery,
  Notebook,
  Execution,
  ExecutionPriority,
} from './types';
import { timeout } from './utils';

import { NotebookVariableSupport } from './variables';
import { notebookMetadataSchema, executionResultSchema } from './data/schema';

export class DataSource extends DataSourceApi<NotebookQuery, NotebookDataSourceOptions> {
  url?: string;
  private validateExecution: ValidateFunction<any>;
  private validateMetadata: ValidateFunction<any>;

  constructor(instanceSettings: DataSourceInstanceSettings<NotebookDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;

    let ajv = new Ajv({ strictTuples: false });
    this.validateExecution = ajv.compile(executionResultSchema);
    this.validateMetadata = ajv.compile(notebookMetadataSchema);

    this.variables = new NotebookVariableSupport();
  }

  async query(options: DataQueryRequest<NotebookQuery>): Promise<DataQueryResponse> {
    if (!options.targets || !options.targets.length) {
      throw new Error('The SystemLink notebook datasource is not configured properly.');
    }

    let data: DataQueryResponseData[] = [];
    for (const target of options.targets) {
      const query = defaults(target, defaultQuery);

      if (!query.id || !query.workspace) {
        continue;
      }

      const parameters = this.replaceParameterVariables(query.parameters, options);
      const execution = await this.executeNotebook(query.id, query.workspace, parameters, query.cacheTimeout);
      if (execution.status === 'SUCCEEDED') {
        if (this.validateExecution(execution.result)) {
          const result = query.output
            ? execution.result.result.find((result: any) => result.id === query.output)
            : execution.result.result[0];
          if (!result) {
            throw new Error(`The output of the notebook does not contain an output with id '${query.output}'.`);
          } else {
            const frames = this.transformResultToDataFrames(result, query);
            data = data.concat(frames);
          }
        } else {
          throw new Error('The output for the notebook does not match the expected SystemLink format.');
        }
      } else {
        throw new Error(`Notebook execution failed with status: ${execution.status} and error code: ${execution.errorCode}. Exception: ${execution.exception}.`);
      }
    }

    return { data };
  }

  replaceParameterVariables(parameters: any, options: DataQueryRequest<NotebookQuery>) {
    return Object.keys(parameters).reduce((result, key) => {
      result[key] =
        typeof parameters[key] === 'string'
          ? getTemplateSrv().replace(parameters[key], options.scopedVars)
          : parameters[key];

      return result;
    }, {} as { [key: string]: any });
  }

  transformResultToDataFrames(result: any, query: NotebookQuery) {
    const frames = [];

    if (result.type === 'data_frame') {
      if (Array.isArray(result.data)) {
        for (let [ix, dataframe] of result.data.entries()) {
          const frame = new MutableDataFrame({
            refId: query.refId,
            fields: [],
            name: result.config?.graph?.plot_labels?.[ix],
          });

          if (dataframe.format === 'XY') {
            if (typeof dataframe.x[0] === 'string') {
              frame.addField({ name: '', values: dataframe.x, type: FieldType.time });
            } else {
              frame.addField({ name: '', values: dataframe.x });
            }

            frame.addField({ name: '', values: dataframe.y });
          } else if (dataframe.format === 'INDEX') {
            frame.addField({ name: 'Index', values: range(0, dataframe.y.length) });
            frame.addField({ name: '', values: dataframe.y });
          }

          frames.push(frame);
        }
      } else {
        // Dataframe table format
        const frame = new MutableDataFrame({ refId: query.refId, fields: [] });
        for (let [ix, column] of result.data.columns.entries()) {
          const values = result.data.values.map((row: any) => row[ix]);
          frame.addField({ name: column.name, ...this.getFieldTypeAndValues(column, values) });
        }

        frames.push(frame);
      }
    } else if (result.type === 'array') {
      frames.push(new MutableDataFrame({ refId: query.refId, fields: [{ name: result.id, values: result.data }] }));
    } else if (result.type === 'scalar') {
      const field = { name: result.id, values: [result.value] };
      frames.push(new MutableDataFrame({ refId: query.refId, fields: [field] }));
    }

    return frames;
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
      const response = await getBackendSrv().datasourceRequest({
        url: this.url + '/ninbexecution/v1/executions',
        method: 'POST',
        data: [
          { notebookId, workspaceId, parameters, resultCachePeriod: cacheTimeout, priority: ExecutionPriority.MEDIUM },
        ],
      });

      return this.handleNotebookExecution(response.data.executions[0].id);
    } catch (e) {
      // TODO: use fetch method from getBackendSrv to get properly typed error
      throw new Error(
        `The request to execute the notebook failed with error ${(e as FetchError).status}: ${
          (e as FetchError).statusText
        }.`
      );
    }
  }

  private async handleNotebookExecution(id: string): Promise<Execution> {
    const response = await getBackendSrv().datasourceRequest({
      url: this.url + '/ninbexecution/v1/executions/' + id,
      method: 'GET',
    });
    const execution: Execution = response.data;
    if (execution.status === 'QUEUED' || execution.status === 'IN_PROGRESS') {
      await timeout(3000);
      return this.handleNotebookExecution(id);
    } else {
      return execution;
    }
  }

  async queryNotebooks(path: string): Promise<Notebook[]> {
    const filter = `name.Contains("${path}") && type == "Notebook"`;
    try {
      const response = await getBackendSrv().post(this.url + '/niapp/v1/webapps/query', { filter, take: 1000 });
      return response.webapps as Notebook[];
    } catch (e) {
      throw new Error(
        `The query for SystemLink notebooks failed with error ${(e as FetchError).status}: ${
          (e as FetchError).statusText
        }.`
      );
    }
  }

  async getNotebookMetadata(id: string): Promise<{ metadata: any; parameters: any }> {
    let response;
    try {
      response = await getBackendSrv().get(this.url + `/ninbparser/v1/notebook/${id}`);
    } catch (e) {
      const { status, statusText } = e as FetchError;
      throw new Error(`The query for notebook metadata failed with error ${status}: ${statusText}.`);
    }
    if (!this.validateMetadata(response)) {
      throw new Error('The metadata of the notebook does not match the expected SystemLink format.');
    }
    return { metadata: response.metadata, parameters: response.parameters };
  }

  async queryTestResultValues(field: string, startsWith: string): Promise<string[]> {
    const data = { field, startsWith };
    const values = await getBackendSrv().post(this.url + '/nitestmonitor/v2/query-result-values', data);
    // Fiter out values that are '' or null
    return values.slice(0, 20).filter((value: string) => value);
  }

  async testDatasource() {
    await getBackendSrv().get(this.url + '/niauth/v1/auth');
    return { status: 'success', message: 'Success' };
  }
}
