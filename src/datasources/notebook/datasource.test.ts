import { DataSource } from './datasource';
import { NotebookDataSourceOptions, NotebookQuery } from './types';

import { DataSourceInstanceSettings, DataQueryRequest, FieldType } from '@grafana/data';

const replaceMock = jest.fn((a: string, ...rest: any) => a);
const executeMock = jest.fn((options) => mockNotebookApiResponse(options));

const successfulNotebookPath = '0';
const failedNotebookPath = '1';
const invalidNotebookPath = '2';

jest.mock('@grafana/runtime', () => ({
  // @ts-ignore
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({
    datasourceRequest: executeMock,
  }),
  getTemplateSrv: () => ({
    replace: replaceMock,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Notebook data source', () => {
  let ds: DataSource;
  const instanceSettings = {
    url: 'http://test',
  } as unknown as DataSourceInstanceSettings<NotebookDataSourceOptions>;
  const mockQuery = {
    refId: '123',
    id: '1234',
    workspace: '1234',
    parameters: null,
    output: 'test_output',
    cacheTimeout: 0,
  };

  beforeEach(() => {
    ds = new DataSource(instanceSettings);
  });

  describe('transformResultToDataFrames', () => {
    it('transforms xy data', () => {
      let dataFrame = {
        type: 'data_frame',
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

      expect(result.name).toBe('plot1');
      expect(result.fields).toHaveLength(2);
      expect(result.length).toBe(4);
      expect(result.get(0)).toHaveProperty('Field 2', 950);
    });

    it('transforms index data', () => {
      let dataFrame = {
        type: 'data_frame',
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

      expect(result.name).toBe('plot1');
      expect(result.fields).toHaveLength(2);
      expect(result.length).toBe(4);
      expect(result.get(0)).toEqual({ 'Field 2': 950, Index: 0 });
    });

    it('transforms scalar data', () => {
      let dataFrame = { type: 'scalar', id: 'output1', value: 2.5 };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect(result.fields).toHaveLength(1);
      expect(result.length).toBe(1);
      expect(Object.values(result.get(0))).toEqual([2.5]);
    });

    it('transforms tabular data', () => {
      let dataFrame = {
        type: 'data_frame',
        id: 'test_output',
        data: {
          columns: [
            { name: 'column1', type: 'string' },
            { name: 'column2', type: 'integer' },
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
      expect(result.length).toBe(3);
      expect(Object.values(result.get(0))).toEqual(['value1', 1]);
      expect(result.fields[0].type).toEqual(FieldType.string);
      expect(result.fields[1].type).toEqual(FieldType.number);
    });

    it('transforms tabular data with UTC datetime', () => {
      let dataFrame = {
        type: 'data_frame',
        id: 'test_output',
        data: {
          columns: [
            { name: 'column1', type: 'datetime', tz: 'UTC' },
            { name: 'column2', type: 'integer' },
          ],
          values: [
            ['2021-04-18T00:43:09.000000', 1],
            ['2021-04-18T00:57:06.000000', 2],
          ],
        },
      };

      let [result] = ds.transformResultToDataFrames(dataFrame, mockQuery);

      expect(result.fields).toHaveLength(2);
      expect(result.length).toBe(2);
      expect(Object.values(result.get(0))).toEqual(['2021-04-18T00:43:09Z', 1]);
      expect(Object.values(result.get(1))).toEqual(['2021-04-18T00:57:06Z', 2]);
      expect(result.fields[0].type).toEqual(FieldType.time);
    });
  });

  it('transforms array data', () => {
    let data = {
      type: 'array',
      id: 'test_output',
      data: ['dog', 'cat', 'zebra', 'ferret'],
    };

    let [result] = ds.transformResultToDataFrames(data, mockQuery);

    expect(result.fields).toHaveLength(1);
    expect(result.length).toBe(4);
    expect(Object.values(result.get(2))).toEqual(['zebra']);
    expect(result.fields[0].type).toEqual(FieldType.string);
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

      ds.replaceParameterVariables(parameters, options);

      expect(replaceMock).toHaveBeenCalledTimes(2);
      expect(replaceMock).toHaveBeenCalledWith(s1, expect.anything());
      expect(replaceMock).toHaveBeenCalledWith(s2, expect.anything());
    });

    it('does not attempt to replace variables in non-string parameters', () => {
      const parameters = {
        number_param: 1,
        object_param: { a: 1 },
      };
      const options = {
        scopedVars: {},
      } as unknown as DataQueryRequest<NotebookQuery>;

      ds.replaceParameterVariables(parameters, options);

      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('returns no data for no query', async () => {
      const options = { targets: [{}] } as unknown as DataQueryRequest<NotebookQuery>;

      let result = await ds.query(options);

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


      let result = await ds.query(options);

      expect(result.data.length).toBe(0);
      expect(executeMock).not.toHaveBeenCalled();
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

      let result = await ds.query(options);

      expect(result.data.length).not.toBe(0);
      expect(executeMock).toHaveBeenCalled();
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

      let result = await ds.query(options);

      expect(result.data).toHaveLength(1);
      let frame = result.data[0];
      expect(frame.fields).toHaveLength(1);
      expect(frame.length).toBe(1);
      expect(Object.values(frame.get(0))).toEqual([1]);
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

      let result = await ds.query(options);

      expect(result.data).toHaveLength(2);
      let frame = result.data[0];
      expect(frame.fields).toHaveLength(1);
      expect(frame.length).toBe(1);
      expect(Object.values(frame.get(0))).toEqual([1]);

      frame = result.data[1];
      expect(frame.fields).toHaveLength(1);
      expect(frame.length).toBe(1);
      expect(Object.values(frame.get(0))).toEqual([1]);
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

      await expect(ds.query(options)).rejects.toThrow();
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

      await expect(ds.query(options)).rejects.toThrow();
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

      await ds.query(options);

      expect(executeMock.mock.calls[0][0].data[0]).toEqual(expect.objectContaining({ resultCachePeriod: 12345 }));
    });
  });
});

// @ts-ignore
function mockNotebookApiResponse(options: any) {
  switch (options.url) {
    case 'http://test/ninbexecution/v1/executions':
      return {
        data: {
          executions: [{ id: options.data && options.data.length && options.data[0].notebookId }],
        },
      };
    case `http://test/ninbexecution/v1/executions/${successfulNotebookPath}`:
      return {
        data: {
          status: 'SUCCEEDED',
          result: {
            result: [
              {
                id: 'test',
                type: 'scalar',
                value: 1,
              },
            ],
          },
        },
      };
    case `http://test/ninbexecution/v1/executions/${failedNotebookPath}`:
      return {
        data: {
          status: 'FAILED',
          exception: 'a python exception',
        },
      };
    case `http://test/ninbexecution/v1/executions/${invalidNotebookPath}`:
      return {
        data: {
          status: 'SUCCEEDED',
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
        },
      };
    default:
      return {};
  }
}
