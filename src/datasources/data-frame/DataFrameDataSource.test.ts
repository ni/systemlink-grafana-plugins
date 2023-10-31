import { of, Observable } from 'rxjs';
import { DataQueryRequest, DataSourceInstanceSettings, dateTime, Field, FieldType } from '@grafana/data';
import { BackendSrvRequest, FetchResponse } from '@grafana/runtime';

import { DataFrameQuery, DataFrameQueryType, TableDataRows, TableMetadata } from './types';
import { DataFrameDataSource } from './DataFrameDataSource';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({ fetch: fetchMock }),
  getTemplateSrv: () => ({ replace: replaceMock }),
}));

const fetchMock = jest.fn<Observable<FetchResponse>, [BackendSrvRequest]>();
const replaceMock = jest.fn((a: string, ...rest: any) => a);

let ds: DataFrameDataSource;

beforeEach(() => {
  jest.clearAllMocks();
  const instanceSettings = {
    url: '_',
    name: 'SystemLink Data Frames',
  };
  ds = new DataFrameDataSource(instanceSettings as DataSourceInstanceSettings);
  setupFetchMock();
});

it('should return no data if there are no valid queries', async () => {
  const query = buildQuery([
    { refId: 'A', type: DataFrameQueryType.Data }, // initial state when creating a panel
    { refId: 'B', type: DataFrameQueryType.Data, tableId: '_', columns: [] }, // state after entering a table id, but no columns selected
  ]);

  const response = await ds.query(query);

  expect(response.data).toHaveLength(0);
});

it('should return data ignoring invalid queries', async () => {
  const query = buildQuery([
    { refId: 'A', type: DataFrameQueryType.Data, tableId: '_' }, // invalid
    { refId: 'B', type: DataFrameQueryType.Data, tableId: '1', columns: ['float'] },
  ]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/1/query-decimated-data' }));
});

it('should return data for multiple targets', async () => {
  const query = buildQuery([
    { refId: 'A', type: DataFrameQueryType.Data, tableId: '1', columns: ['int'] },
    { refId: 'B', type: DataFrameQueryType.Data, tableId: '2', columns: ['float'] },
  ]);

  const response = await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(4);
  expect(response.data).toHaveLength(2);
});

it('should convert columns to Grafana fields', async () => {
  const query = buildQuery([
    {
      refId: 'A',
      type: DataFrameQueryType.Data,
      tableId: '_',
      columns: ['int', 'float', 'string', 'time', 'bool', 'Value'],
    },
  ]);

  const response = await ds.query(query);

  const fields = response.data[0].fields as Field[];
  expect(fields).toEqual([
    { name: 'int', type: FieldType.number, values: [1, 2] },
    { name: 'float', type: FieldType.number, values: [1.1, 2.2] },
    { name: 'string', type: FieldType.string, values: ['first', 'second'] },
    { name: 'time', type: FieldType.time, values: [1663135260000, 1663135320000] },
    { name: 'bool', type: FieldType.boolean, values: [true, false] },
    { name: 'Value', type: FieldType.string, values: ['test1', 'test2'], config: { displayName: 'Value' } },
  ]);
});

it('should automatically apply time filters when index column is a timestamp', async () => {
  const query = buildQuery([
    {
      refId: 'A',
      type: DataFrameQueryType.Data,
      tableId: '_',
      columns: ['time'],
      applyTimeFilters: true,
    },
  ]);
  const from = dateTime('2022-09-14T00:00:00Z');
  const to = dateTime('2022-09-16T00:00:00Z');
  query.range = { from, to, raw: { from, to } };

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        filters: [
          { column: 'time', operation: 'GREATER_THAN_EQUALS', value: from.toISOString() },
          { column: 'time', operation: 'LESS_THAN_EQUALS', value: to.toISOString() },
        ],
      }),
    })
  );
});

it('should apply null and NaN filters', async () => {
  const query = buildQuery([
    {
      refId: 'A',
      type: DataFrameQueryType.Data,
      tableId: '_',
      columns: ['int', 'float', 'string'],
      filterNulls: true,
    },
  ]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        filters: [
          { column: 'float', operation: 'NOT_EQUALS', value: null },
          { column: 'float', operation: 'NOT_EQUALS', value: 'NaN' },
          { column: 'string', operation: 'NOT_EQUALS', value: null },
        ],
      }),
    })
  );
});

it('should provide decimation parameters correctly', async () => {
  const query = buildQuery([
    {
      refId: 'A',
      type: DataFrameQueryType.Data,
      tableId: '_',
      columns: ['int', 'string', 'float'],
      decimationMethod: 'ENTRY_EXIT',
    },
  ]);
  query.maxDataPoints = 300;

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        decimation: { intervals: 300, method: 'ENTRY_EXIT', yColumns: ['int', 'float'] },
      }),
    })
  );
});

it('should cache table metadata for subsequent requests', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '1', columns: ['int'] }]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/1' }));

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('should return error if query columns do not match table metadata', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '1', columns: ['nonexistent'] }]);

  await expect(ds.query(query)).rejects.toEqual(expect.anything());
});

it('should migrate queries using columns of arrays of objects', async () => {
  const query = buildQuery([
    {
      refId: 'B',
      tableId: '1',
      columns: [{ name: 'float', dataType: 'FLOAT32', columnType: 'NORMAL' }],
    } as unknown as DataFrameQuery,
  ]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ columns: ['float'] }) }));
});

it('attempts to replace variables in metadata query', async () => {
  const tableId = '$tableId';
  replaceMock.mockReturnValue('1');

  await ds.getTableMetadata(tableId);

  expect(replaceMock).toHaveBeenCalledTimes(1);
  expect(replaceMock).toHaveBeenCalledWith(tableId);
});

it('attempts to replace variables in data query', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '$tableId', columns: ['float'] }]);
  replaceMock.mockReturnValue('1');

  await ds.query(query);

  expect(replaceMock).toHaveBeenCalledTimes(2);
  expect(replaceMock).toHaveBeenCalledWith(query.targets[0].tableId, expect.anything());
});

it('returns table properties for metadata query', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Metadata, tableId: '1' }]);

  const response = await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/1' }));
  expect(response.data[0].fields).toEqual([
    { name: 'name', values: ['hello', 'foo'] },
    { name: 'value', values: ['world', 'bar'] },
  ])
});

const buildQuery = (targets: DataFrameQuery[]): DataQueryRequest<DataFrameQuery> => {
  return {
    ...defaultQuery,
    targets,
  };
};

const setupFetchMock = () => {
  fetchMock.mockImplementation((options: BackendSrvRequest) => {
    if (/\/tables\/\w+$/.test(options.url)) {
      return of(createFetchResponse(fakeMetadataResponse));
    }
    if (/\/tables\/\w+\/query-decimated-data$/.test(options.url)) {
      return of(createFetchResponse(getFakeDataResponse(options.data.columns)));
    }

    throw new Error('Unexpected request');
  });
};

const createFetchResponse = <T>(data: T): FetchResponse<T> => {
  return {
    data,
    status: 200,
    url: 'http://localhost:3000/api/ds/query',
    config: { url: 'http://localhost:3000/api/ds/query' },
    type: 'basic',
    statusText: 'Ok',
    redirected: false,
    headers: {} as unknown as Headers,
    ok: true,
  };
};

const fakeMetadataResponse: TableMetadata = {
  columns: [
    { name: 'time', dataType: 'TIMESTAMP', columnType: 'INDEX', properties: {} },
    { name: 'int', dataType: 'INT32', columnType: 'NORMAL', properties: {} },
    { name: 'float', dataType: 'FLOAT32', columnType: 'NULLABLE', properties: {} },
    { name: 'string', dataType: 'STRING', columnType: 'NULLABLE', properties: {} },
    { name: 'bool', dataType: 'BOOL', columnType: 'NORMAL', properties: {} },
    { name: 'Value', dataType: 'STRING', columnType: 'NULLABLE', properties: {} },
  ],
  id: '_',
  properties: { hello: 'world', foo: 'bar' },
  name: 'Test Table',
  workspace: '_',
};

const fakeData: Record<string, string[]> = {
  int: ['1', '2'],
  float: ['1.1', '2.2'],
  string: ['first', 'second'],
  time: ['2022-09-14T06:01:00.0000000Z', '2022-09-14T06:02:00.0000000Z'],
  bool: ['True', 'False'],
  Value: ['test1', 'test2'],
};

function getFakeDataResponse(columns: string[]): TableDataRows {
  return {
    frame: {
      columns,
      data: [columns.map(c => fakeData[c][0]), columns.map(c => fakeData[c][1])]
    }
  }
};

const defaultQuery: DataQueryRequest<DataFrameQuery> = {
  requestId: '1',
  dashboardId: 0,
  interval: '0',
  intervalMs: 10,
  panelId: 0,
  scopedVars: {},
  range: {
    from: dateTime().subtract(1, 'h'),
    to: dateTime(),
    raw: { from: '1h', to: 'now' },
  },
  timezone: 'browser',
  app: 'explore',
  startTime: 0,
  targets: [],
};
