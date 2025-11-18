import { MockProxy } from 'jest-mock-extended';
import { setupDataSource, createFetchResponse } from '../../test/fixtures';
import { DataSource } from './datasource';
import { NotebookDataSourceOptions, NotebookQuery, ExecutionStatus, ResultType } from './types';

import { DataSourceInstanceSettings, DataQueryRequest, FieldType } from '@grafana/data';
import { firstValueFrom } from 'rxjs';
import { BackendSrv } from '@grafana/runtime';

const successfulNotebookPath = '0';
const failedNotebookPath = '1';
const invalidNotebookPath = '2';

const successfulExecutionResponse = {
  status: ExecutionStatus.SUCCEEDED,
  result: {
    result: [
      {
        id: 'test',
        type: 'scalar',
        value: 1,
      },
    ],
  },
};

const failedExecutionResponse = {
  status: ExecutionStatus.FAILED,
  exception: 'a python exception',
};

const invalidExecutionResponse = {
  status: ExecutionStatus.SUCCEEDED,
  result: {
    result: [
      {
        id: 'test',
        type: 'data_frame',
        data: {
          values: [1, 2, 3],
        },
      },
    ],
  },
};

const createExecutionResponse = (id: string) => ({
  executions: [{ id }]
});


describe('Notebook data source', () => {
  let ds: DataSource, backendSrv: MockProxy<BackendSrv>;
  const instanceSettings = {
    url: 'http://test',
  } as unknown as DataSourceInstanceSettings<NotebookDataSourceOptions>;
  const mockQuery = {
    refId: '123',
    id: '1234',
    workspace: '1234',
    parameters: {},
    output: 'test_output',
    cacheTimeout: 0,
  };

  beforeEach(() => {
    [ds, backendSrv] = setupDataSource(DataSource, () => instanceSettings);

    // Mock backendSrv.fetch to handle POST and GET requests
    backendSrv.fetch.mockImplementation((options: any) => {
      const url = options.url;
      const method = options.method;

      // POST to /executions - create execution
      if (method === 'POST' && url.includes('/executions')) {
        const notebookId = options.data?.[0]?.notebookId;
        return createFetchResponse(createExecutionResponse(notebookId));
      }

      // GET execution status
      if (method === 'GET' && url.includes('/executions/')) {
        if (url.includes(successfulNotebookPath)) {
          return createFetchResponse(successfulExecutionResponse);
        }
        if (url.includes(failedNotebookPath)) {
          return createFetchResponse(failedExecutionResponse);
        }
        if (url.includes(invalidNotebookPath)) {
          return createFetchResponse(invalidExecutionResponse);
        }
      }

      return createFetchResponse({});
    });
  });

  describe('transformResultToDataFrames', () => {
    it('transforms xy data', () => {
      let dataFrame = {
        type: ResultType.DATA_FRAME,
        id: 'horizontal_graph',
        data: [{ format: 'XY', x: [0, 1, 2, 3], y: [950, 412, 1390, 1009] }],
        config: {
          title: 'Horizontal Bar Chart',
          graph: {
            axis_labels: ['Labels', 'Values'],
            tick_labels: [
              { x: 0, label: 'label 1' },
              { x: 1, label: 'label 2' },
              { x: 2, label: 'label 3' },
              { x: 3, label: 'label 4' },
            ],
            orientation: 'HORIZONTAL',
            plot_style: ['BAR'],
            plot_labels: ['plot1'],
          },
        },
      };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect((result as any).name).toBe('plot1');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].values).toHaveLength(4);
      expect(result.fields[1]!.values![0]).toBe(950);
    });

    it('transforms index data', () => {
      let dataFrame = {
        type: ResultType.DATA_FRAME,
        id: 'horizontal_graph',
        data: [{ format: 'INDEX', y: [950, 412, 1390, 1009] }],
        config: {
          title: 'Horizontal Bar Chart',
          graph: {
            axis_labels: ['Labels', 'Values'],
            tick_labels: [
              { x: 0, label: 'label 1' },
              { x: 1, label: 'label 2' },
              { x: 2, label: 'label 3' },
              { x: 3, label: 'label 4' },
            ],
            orientation: 'HORIZONTAL',
            plot_style: ['BAR'],
            plot_labels: ['plot1'],
          },
        },
      };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect((result as any).name).toBe('plot1');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].values).toHaveLength(4);
      expect(result.fields[0].values).toEqual([0, 1, 2, 3]);
      expect(result.fields[1]!.values![0]).toBe(950);
    });

    it('transforms scalar data', () => {
      let dataFrame = { type: ResultType.SCALAR, id: 'output1', value: 2.5 };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].values).toHaveLength(1);
      expect(result.fields[0]!.values![0]).toEqual(2.5);
    });

    it('transforms tabular data', () => {
      let dataFrame = {
        type: ResultType.DATA_FRAME,
        id: 'test_output',
        data: {
          columns: [
            { name: 'column1', type: 'string' as const },
            { name: 'column2', type: 'integer' as const },
          ],
          values: [
            ['value1', 1],
            ['value2', 2],
            ['value3', 3],
          ],
        },
      };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].values).toHaveLength(3);
      expect(result.fields[0].values).toEqual(['value1', 'value2', 'value3']);
      expect(result.fields[1].values).toEqual([1, 2, 3]);
      expect((result.fields[0] as any).type).toEqual(FieldType.string);
      expect((result.fields[1] as any).type).toEqual(FieldType.number);
    });

    it('transforms tabular data with UTC datetime', () => {
      let dataFrame = {
        type: ResultType.DATA_FRAME,
        id: 'test_output',
        data: {
          columns: [
            { name: 'column1', type: 'datetime' as const, tz: 'UTC' },
            { name: 'column2', type: 'integer' as const },
          ],
          values: [
            ['2021-04-18T00:43:09.000000', 1],
            ['2021-04-18T00:57:06.000000', 2],
          ],
        },
      };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].values).toHaveLength(2);
      expect(result.fields[0].values).toEqual(['2021-04-18T00:43:09Z', '2021-04-18T00:57:06Z']);
      expect(result.fields[1].values).toEqual([1, 2]);
      expect((result.fields[0] as any).type).toEqual(FieldType.time);
    });
  });

  it('transforms array data', () => {
    let data = {
      type: ResultType.ARRAY,
      id: 'test_output',
      data: ['dog', 'cat', 'zebra', 'ferret'],
    };

    let [result] = ds.transformResultToDataFrames(data, mockQuery);

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].values).toHaveLength(4);
    expect(result.fields[0]!.values![2]).toEqual('zebra');
  });

  describe('replaceParameterVariables', () => {
    it('attempts to replace variables in string parameters', () => {
      const s1 = 'startedAt > "${__from:date}" && startedAt < "${__to:date}" && partNumber == "$partNumber"';
      const s2 = '$system';
      const parameters = {
        string_param: s1,
        another_string_param: s2,
        number_param: 1,
        object_param: { a: 1 },
      };
      const options = {
        scopedVars: {},
      } as unknown as DataQueryRequest<NotebookQuery>;

      const result = ds.replaceParameterVariables(parameters, options);

      // The method should attempt to replace string parameters only
      expect(result).toHaveProperty('string_param');
      expect(result).toHaveProperty('another_string_param');
      expect(result).toHaveProperty('number_param', 1);
      expect(result).toHaveProperty('object_param');
    });

    it('does not attempt to replace variables in non-string parameters', () => {
      const parameters = {
        number_param: 1,
        object_param: { a: 1 },
      };
      const options = {
        scopedVars: {},
      } as unknown as DataQueryRequest<NotebookQuery>;

      const result = ds.replaceParameterVariables(parameters, options);

      expect(result).toEqual(parameters);
    });
  });

  describe('query', () => {
    it('returns no data for no query', async () => {
      const options = { targets: [{}] } as unknown as DataQueryRequest<NotebookQuery>;

      const result = await firstValueFrom(ds.query(options));

      expect(result.data.length).toBe(0);
    });

    it('does not execute when query is hidden', async () => {
      const options = {
        targets: [
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
            hide: true
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;


      const result = await firstValueFrom(ds.query(options));

      expect(result.data.length).toBe(0);
      expect(backendSrv.get).not.toHaveBeenCalled();
      expect(backendSrv.post).not.toHaveBeenCalled();
    });

    it('executes when query is not hidden', async () => {
      const options = {
        targets: [
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
            hide: false
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      const result = await firstValueFrom(ds.query(options));

      expect(result.data.length).not.toBe(0);
    });

    it('returns frame for successful notebook execution', async () => {
      const options = {
        targets: [
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      const result = await firstValueFrom(ds.query(options));

      expect(result.data).toHaveLength(1);
      let frame = result.data[0];
      expect(frame.fields).toHaveLength(1);
      expect(frame.fields[0].values).toHaveLength(1);
      expect(frame.fields[0].values[0]).toEqual(1);
    });

    it('returns frames for multiple successful notebook executions', async () => {
      const options = {
        targets: [
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
          },
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      const result = await firstValueFrom(ds.query(options));

      expect(result.data).toHaveLength(2);
      let frame = result.data[0];
      expect(frame.fields).toHaveLength(1);
      expect(frame.fields[0].values).toHaveLength(1);
      expect(frame.fields[0].values[0]).toEqual(1);

      frame = result.data[1];
      expect(frame.fields).toHaveLength(1);
      expect(frame.fields[0].values).toHaveLength(1);
      expect(frame.fields[0].values[0]).toEqual(1);
    });

    it('throws error for failed notebook execution', async () => {
      const options = {
        targets: [
          {
            id: failedNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      await expect(firstValueFrom(ds.query(options))).rejects.toThrow();
    });

    it('throws error for notebook execution with invalid output', async () => {
      const options = {
        targets: [
          {
            id: invalidNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      await expect(firstValueFrom(ds.query(options))).rejects.toThrow();
    });

    it('executes notebook with resultCachePeriod', async () => {
      const options = {
        targets: [
          {
            id: successfulNotebookPath,
            workspace: '1234',
            parameters: [],
            output: 'test',
            cacheTimeout: 12345,
          },
        ],
      } as unknown as DataQueryRequest<NotebookQuery>;

      await firstValueFrom(ds.query(options));

      expect(backendSrv.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('/executions'),
          method: 'POST',
          data: expect.arrayContaining([expect.objectContaining({ resultCachePeriod: 12345 })])
        })
      );
    });
  });
});
