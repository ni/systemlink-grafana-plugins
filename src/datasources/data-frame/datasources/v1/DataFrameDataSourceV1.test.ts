import { of, Observable } from 'rxjs';
import { DataQueryRequest, DataSourceInstanceSettings, dateTime, Field, FieldType } from '@grafana/data';
import { BackendSrvRequest, FetchResponse } from '@grafana/runtime';

import { DataFrameDataSourceOptions, DataFrameQueryV1, DataFrameQueryType, TableDataRows, TableProperties } from '../../types';
import { DataFrameDataSourceV1 } from './DataFrameDataSourceV1';
import { LEGACY_METADATA_TYPE } from 'core/types';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({ fetch: fetchMock }),
  getTemplateSrv: () => ({ replace: replaceMock, containsTemplate: containsTemplateMock }),
}));

const mockVariables = [{
  name: 'tableId',
  value: '1'
}, {
  name: 'columns',
  value: '{time,int}'
}];

const fetchMock = jest.fn<Observable<FetchResponse>, [BackendSrvRequest]>();
const replaceMock = jest.fn((variable: string) => {
  const matchedVariable = mockVariables.find(v => `$${v.name}` === variable);
  return matchedVariable ? matchedVariable.value : variable;
});
const containsTemplateMock = jest.fn((a: string) => mockVariables.map(v => `$${v.name}`).includes(a));

let ds: DataFrameDataSourceV1;

beforeEach(() => {
  jest.clearAllMocks();
  const instanceSettings = {
    url: '_',
    name: 'SystemLink Data Frames',
  };
  ds = new DataFrameDataSourceV1(instanceSettings as DataSourceInstanceSettings<DataFrameDataSourceOptions>);
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
    { refId: 'B', type: DataFrameQueryType.Data, tableId: '1', columns: ['float'] },
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
      tableId: '1',
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
      tableId: '1',
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
      tableId: '1',
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
      tableId: '1',
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

it('should cache table properties for subsequent requests', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '1', columns: ['int'] }]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/1' }));

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('should return error if query columns do not match table properties', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '1', columns: ['nonexistent'] }]);

  await expect(ds.query(query)).rejects.toEqual(expect.anything());
});

it('should migrate queries using columns of arrays of objects', async () => {
  const query = buildQuery([
    {
      refId: 'B',
      tableId: '1',
      columns: [{ name: 'float', dataType: 'FLOAT32', columnType: 'NORMAL' }],
    } as unknown as DataFrameQueryV1,
  ]);

  await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ columns: ['float'] }) }));
});

it('attempts to replace variables in properties query', async () => {
  const tableId = '$tableId';

  await ds.getTableProperties(tableId);

  expect(replaceMock).toHaveBeenCalledTimes(1);
  expect(replaceMock).toHaveBeenCalledWith(tableId);
});

it('attempts to replace variables in data query', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Data, tableId: '$tableId', columns: ['$columns'] }]);

  await ds.query(query);

  expect(replaceMock).toHaveBeenCalledTimes(3);
  expect(replaceMock).toHaveBeenCalledWith(query.targets[0].tableId, expect.anything());
  expect(containsTemplateMock).toHaveBeenCalledTimes(1);
  expect(containsTemplateMock).toHaveBeenCalledWith(query.targets[0].columns![0]);
});

it('metricFindQuery returns table columns', async () => {
  const tableId = '1';
  const expectedColumns = fakePropertiesResponse.columns.map(col => ({ text: col.name, value: col.name }));

  const columns = await ds.metricFindQuery({ tableId } as DataFrameQueryV1);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: `_/nidataframe/v1/tables/${tableId}` }));
  expect(columns).toEqual(expect.arrayContaining(expectedColumns));
});

it('returns table properties for properties query', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Properties, tableId: '1' }]);

  const response = await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/1' }));
  expect(response.data[0].fields).toEqual([
    { name: 'hello', values: ['world'] },
    { name: 'foo', values: ['bar'] },
  ])
});

it('should migrate legacy metadata type to properties type', () => {
  const query: DataFrameQueryV1 = { refId: 'A', type: LEGACY_METADATA_TYPE as any, tableId: '1', columns: [] };

  const result = ds.processQuery(query);
  expect(result.type).toBe(DataFrameQueryType.Properties);
});

it('handles properties query when table has no properties', async () => {
  const query = buildQuery([{ refId: 'A', type: DataFrameQueryType.Properties, tableId: '2' }]);

  const response = await ds.query(query);

  expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nidataframe/v1/tables/2' }));
  expect(response.data[0].fields).toEqual([]);
});

const buildQuery = (targets: DataFrameQueryV1[]): DataQueryRequest<DataFrameQueryV1> => {
  return {
    ...defaultQuery,
    targets,
  };
};

const setupFetchMock = () => {
  fetchMock.mockImplementation((options: BackendSrvRequest) => {
    if (/\/tables\/1$/.test(options.url)) {
      return of(createFetchResponse(fakePropertiesResponse));
    }

    if (/\/tables\/2$/.test(options.url)) {
      return of(createFetchResponse(fakePropertiesResponseNoProperties));
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

const fakePropertiesResponse: TableProperties = {
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

const fakePropertiesResponseNoProperties: TableProperties = {
  columns: [{ name: 'time', dataType: 'TIMESTAMP', columnType: 'INDEX', properties: {} }],
  id: '_',
  properties: {},
  name: 'Test Table no properties',
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

const defaultQuery: DataQueryRequest<DataFrameQueryV1> = {
  requestId: '1',
  dashboardUID: '1',
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
