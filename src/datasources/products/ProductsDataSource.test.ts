import { BackendSrv } from '@grafana/runtime';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductQuery, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { Field, LegacyMetricFindQueryOptions } from '@grafana/data';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { MockProxy } from 'jest-mock-extended';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';

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

const mockVariableQueryProductResponse: QueryProductResponse = {
  products: [
    {
      id: '1',
      partNumber: '123',
      family: 'Family 1',
    },
    {
      id: '2',
      partNumber: '456',
      family: 'Family 2',
    }
  ],
  continuationToken: '',
  totalCount: 0
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

  test('raises an error when API fails', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.queryProducts())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-products" failed with status code: 400. Error message: "Error"');
  });
});

describe('queryProductValues', () => {
  test('returns data when there are valid queries', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchResponse(['value1']));

    const response = await datastore.queryProductValues(ProductsQueryBuilderFieldNames.PART_NUMBER);

    expect(response).toMatchSnapshot();
  });

  test('raises an error when API fails', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.queryProductValues(ProductsQueryBuilderFieldNames.PART_NUMBER))
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-product-values" failed with status code: 400. Error message: "Error"');
  });
});

describe('getFamilyNames', () => {
  test('returns family names', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchResponse(['Family 1', 'Family 2']));

    await datastore.getFamilyNames();

    expect(datastore.familyNamesCache.get('Family 1')).toBe('Family 1');
    expect(datastore.familyNamesCache.get('Family 2')).toBe('Family 2');
  });

  test('should not query family values if cache exists', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchResponse(['value1']));
    datastore.familyNamesCache.set('family', 'value1');
    backendServer.fetch.mockClear();

    await datastore.getFamilyNames()

    expect(backendServer.fetch).not.toHaveBeenCalled();
  });
});

describe('query', () => {
  test('returns data when there are valid queries', async () => {
    const query = buildQuery(
      {
        refId: 'A',
        properties: [
          PropertiesOptions.PART_NUMBER,
          PropertiesOptions.FAMILY,
          PropertiesOptions.NAME,
          PropertiesOptions.WORKSPACE
        ] as Properties[],
        queryBy: `${ProductsQueryBuilderFieldNames.PART_NUMBER} = "123"`,
        orderBy: PropertiesOptions.ID,
        descending: false,
        recordCount: 1
      },
    );

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

    const query = buildQuery();

    const response = await datastore.query(query);

    expect(response.data).toMatchSnapshot();
  });

  test('returns no data when Query Products returns error', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    const query = buildQuery(
      {
        refId: 'A',
        properties: [
          PropertiesOptions.PART_NUMBER,
          PropertiesOptions.FAMILY,
          PropertiesOptions.NAME,
          PropertiesOptions.WORKSPACE
        ] as Properties[], orderBy: undefined
      },
    );

    await expect(datastore.query(query))
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-products" failed with status code: 400. Error message: "Error"');
  });

  it('should convert properties to Grafana fields', async () => {
    const query = buildQuery(
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
    );

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

    const query = buildQuery(
      {
        refId: 'A',
        properties: [
          PropertiesOptions.PROPERTIES
        ] as Properties[], orderBy: undefined
      },
    );

    const response = await datastore.query(query);
    const fields = response.data[0].fields as Field[];
    expect(fields).toEqual([
      { name: 'properties', values: [''], type: 'string' },
    ]);
  });

  test('should not query product values if cache exists', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchResponse(['value1']));
    datastore.partNumbersCache.set('partNumber', 'value1');
    backendServer.fetch.mockClear();

    await datastore.query(buildQuery())

    expect(backendServer.fetch).not.toHaveBeenCalled();
  });

  test('should not query workspace values if cache exists', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/niauth/v1/user' }))
      .mockReturnValue(createFetchResponse(['workspace1']));
    datastore.workspacesCache.set('workspace', { id: 'workspace1', name: 'workspace1', default: false, enabled: true });
    backendServer.fetch.mockClear();

    await datastore.query(buildQuery())

    expect(backendServer.fetch).not.toHaveBeenCalled();
  });

  describe('Query builder queries', () => {
    test('should transform fields with single value', async () => {
      const query = buildQuery(
        {
          refId: 'A',
          properties: [
            PropertiesOptions.PART_NUMBER
          ] as Properties[],
          orderBy: undefined,
          queryBy: `${PropertiesOptions.PART_NUMBER} = '123'`
        },
      );

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            filter: "partNumber = '123'",
            orderBy: undefined,
            projection: ["partNumber"],
            returnCount: false, take: 1000
          }
        })
      );
    });

    test('should transform fields with multiple values', async () => {
      const query = buildQuery(
        {
          refId: 'A',
          properties: [
            PropertiesOptions.PART_NUMBER
          ] as Properties[],
          orderBy: undefined,
          queryBy: `${ProductsQueryBuilderFieldNames.PART_NUMBER} = "{partNumber1,partNumber2}"`
        },
      );

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            filter: "PartNumber = \"partNumber1\" || PartNumber = \"partNumber2\"",
            orderBy: undefined,
            projection: ["partNumber"],
            returnCount: false, take: 1000
          }
        })
      );
    });

  });

  describe('metricFindQuery', () => {
    let options: LegacyMetricFindQueryOptions;
    beforeEach(() => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
        .mockReturnValue(
          createFetchResponse<QueryProductResponse>(mockVariableQueryProductResponse));
      options = {
        scopedVars: {}
      }
    });

    it('should return partNumber with family Name when queryBy is not provided', async () => {
      const query: ProductVariableQuery = {
        refId: '',
        queryBy: '',
      };

      const results = await datastore.metricFindQuery(query, options);

      expect(results).toMatchSnapshot();
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            orderBy: "partNumber",
            projection: ["PART_NUMBER", "FAMILY"],
            returnCount: false,
          }
        })
      );
    });

    it('should return partNumber when queryBy is provided', async () => {
      const query: ProductVariableQuery = {
        refId: '',
        queryBy: 'partNumber = "123"',
      };

      const results = await datastore.metricFindQuery(query, options);

      expect(results).toMatchSnapshot();
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            filter: "partNumber = \"123\"",
            orderBy: "partNumber",
            projection: ["PART_NUMBER", "FAMILY"],
            returnCount: false,
          }
        })
      );
    });

    it('should replace variables with values', async () => {
      datastore.templateSrv.replace = jest.fn().mockImplementation((value) => {"partNumber = \"123\""});
      const query: ProductVariableQuery = {
        refId: '',
        queryBy: 'partNumber = "$partNumber"',
      }

      const results = await datastore.metricFindQuery(query, options);

      expect(results).toMatchSnapshot();
      
    }); 

    it('should return empty array when queryBy is invalid', async () => {
      const query: ProductVariableQuery = {
        refId: '',
        queryBy: 'invalidQuery',
      };
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
        .mockReturnValue(
          createFetchResponse({
            products: [],
            continuationToken: null,
            totalCount: 0
          } as unknown as QueryProductResponse));
      options = {
        scopedVars: {}
      }

      const results = await datastore.metricFindQuery(query, options);

      expect(results).toEqual([]);
    })
  });
});

const buildQuery = getQueryBuilder<ProductQuery>()({
  refId: 'A',
  properties: [
    PropertiesOptions.PART_NUMBER,
    PropertiesOptions.FAMILY,
    PropertiesOptions.NAME,
    PropertiesOptions.WORKSPACE
  ] as Properties[],
  orderBy: undefined
});
