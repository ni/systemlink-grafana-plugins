import { BackendSrv } from '@grafana/runtime';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { DataQueryRequest, dateTime, Field } from '@grafana/data';
import { createFetchError, createFetchResponse, requestMatching, setupDataSource } from 'test/fixtures';
import { MockProxy } from 'jest-mock-extended';

const mockQueryProductResponse: QueryProductResponse = {
  products: [
    {
      id: '1',
      name: 'Product 1',
      partNumber: '123',
      family: 'Family 1',
      workspace: 'Workspace 1',
      updatedAt: '2021-08-01T00:00:00Z',
      properties: { prop1: 'value1' }
    }
  ],
  continuationToken: '',
  totalCount: 2
};

let datastore: ProductsDataSource, backendServer: MockProxy<BackendSrv>

beforeEach(() => {
  [datastore, backendServer] = setupDataSource(ProductsDataSource);

  backendServer.fetch
    .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
    .mockReturnValue(
        createFetchResponse<QueryProductResponse>(mockQueryProductResponse)
    );
});

describe('testDatasource', () => {
  test('returns success', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/products?take=1' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await datastore.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/products?take=1' }))
      .mockReturnValue(createFetchError(400));  

    await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/products?take=1" failed with status code: 400. Error message: "Error"');
  });
});

describe('queryProducts', () => {
  test('returns data when there are valid queries', async () => {
    const response = await datastore.queryProducts();

    expect(response).toMatchSnapshot();
  });

  test('raises an error returns API fails', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.queryProducts())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-products" failed with status code: 400. Error message: "Error"');
  });
});

describe('query', () => {
  test('returns data when there are valid queries', async () => {
    const query = buildQuery([
      { 
        refId: 'A', 
        properties: [
            PropertiesOptions.PART_NUMBER, 
            PropertiesOptions.FAMILY, 
            PropertiesOptions.NAME, 
            PropertiesOptions.WORKSPACE
        ] as Properties[], 
        orderBy: PropertiesOptions.ID , 
        descending: false, 
        recordCount: 1
      }, 
    ]);

    const response = await datastore.query(query);

    expect(response.data).toHaveLength(1);
    expect(response.data).toMatchSnapshot();
  });

  test('returns no data when Query Products returns no data', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(
        createFetchResponse(
            { 
              products: [], 
              continuationToken: null, 
              totalCount: 0
            } as unknown as QueryProductResponse));

    const query = buildQuery([
      { 
        refId: 'A',
        properties: [
            PropertiesOptions.PART_NUMBER, 
            PropertiesOptions.FAMILY, 
            PropertiesOptions.NAME, 
            PropertiesOptions.WORKSPACE
        ] as Properties[], orderBy: undefined 
      },
    ]);

    const response = await datastore.query(query);

    expect(response.data).toMatchSnapshot();
  });

  test('returns no data when Query Products returns error', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    const query = buildQuery([
      {
        refId: 'A',
        properties: [
            PropertiesOptions.PART_NUMBER,
            PropertiesOptions.FAMILY,
            PropertiesOptions.NAME,
            PropertiesOptions.WORKSPACE
        ] as Properties[], orderBy: undefined
      },
    ]);

    await expect(datastore.query(query))
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-products" failed with status code: 400. Error message: "Error"');
  });

  it('should convert properties to Grafana fields', async () => {
    const query = buildQuery([
      {
        refId: 'A',
        properties: [
            PropertiesOptions.PART_NUMBER,
            PropertiesOptions.FAMILY,
            PropertiesOptions.NAME,
            PropertiesOptions.WORKSPACE,
            PropertiesOptions.UPDATEDAT,
            PropertiesOptions.PROPERTIES
        ] as Properties[], orderBy: undefined
      },
    ]);

    const response = await datastore.query(query);

    const fields = response.data[0].fields as Field[];
    expect(fields).toEqual([
      { name: 'partNumber', values: ['123'], type: 'string' },
      { name: 'family', values: ['Family 1'], type: 'string' },
      { name: 'name', values: ['Product 1'], type: 'string' },
      { name: 'workspace', values: ['Workspace 1'], type: 'string' },
      { name: 'updatedAt', values: ['2021-08-01T00:00:00Z'], type: 'time' },
      { name: 'properties', values: ['{"prop1":"value1"}'], type: 'string' },
    ]);
  });

  test('should handle null and undefined properties', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchResponse({
        products: [
            {
                id: '1',
                name: 'Product 1',
                properties: null
            }
        ], continuationToken: null, totalCount: 0
    } as unknown as QueryProductResponse));

    const query = buildQuery([
      {
        refId: 'A',
        properties: [
            PropertiesOptions.PROPERTIES
        ] as Properties[], orderBy: undefined
      },
    ]);

    const response = await datastore.query(query);
    const fields = response.data[0].fields as Field[];
    expect(fields).toEqual([
      { name: 'properties', values: [''], type: 'string' },
    ]);
  });
});

const buildQuery = (targets: ProductQuery[]): DataQueryRequest<ProductQuery> => {
  return {
    ...defaultQuery,
    targets,
  };
};

const defaultQuery: DataQueryRequest<ProductQuery> = {
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
