import { BackendSrv } from '@grafana/runtime';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductQuery, ProductVariableQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { Field, LegacyMetricFindQueryOptions } from '@grafana/data';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { MockProxy } from 'jest-mock-extended';
import { ProductsQueryBuilderFieldNames } from './constants/ProductsQueryBuilder.constants';
import { Workspace } from 'core/types';

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
      name: 'product 1',
    },
    {
      id: '2',
      partNumber: '456',
      name: 'product 2',
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

  it('should throw error with status code when API returns error with status', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.queryProducts())
      .rejects
      .toThrow('The query failed due to the following error: (status 400) "Error".');
  });

  it('should throw error with unknown error when API returns error without status', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockImplementation(() => { throw new Error('Error'); });

    await expect(datastore.queryProducts())
      .rejects
      .toThrow('The query failed due to an unknown error.');
  });

  it('should publish alertError event when error occurs', async () => {
    const publishMock = jest.fn();
    (datastore as any).appEvents = { publish: publishMock };
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-products' }))
      .mockReturnValue(createFetchError(400));

    await expect(datastore.queryProducts())
      .rejects
      .toThrow('The query failed due to the following error: (status 400) "Error".');

    expect(publishMock).toHaveBeenCalledWith({
      type: 'alert-error',
      payload: ['Error during product query', expect.stringContaining('The query failed due to the following error: (status 400) "Error".')],
    });
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

  it('should handle errors and set error and innerError fields', async () => {
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchError(500));

    await datastore.getFamilyNames();

    expect(datastore.errorTitle).toBe('Warning during product value query');
    expect(datastore.errorDescription).toContain('Some values may not be available in the query builder lookups due to an unknown error.');
  });

  it('should handle errors and set innerError fields with error message detail', async () => {
    datastore.errorTitle = '';
    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-product-values' }))
      .mockReturnValue(createFetchError(500));

    await datastore.getFamilyNames();

    expect(datastore.errorTitle).toBe('Warning during product value query');
    expect(datastore.errorDescription).toContain('Some values may not be available in the query builder lookups due to the following error: \"Error\".');
  })

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
      .toThrow('The query failed due to the following error: (status 400) \"Error\".');
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

  it('should convert workspaceIds to workspace names for workspace field', async () => {
    datastore.workspacesCache.set('Workspace 1', { id: 'Workspace 1', name: 'WorkspaceName'} as Workspace);

    const query = buildQuery(
      {
        refId: 'A',
        properties: [
          PropertiesOptions.WORKSPACE
        ] as Properties[], orderBy: undefined
      },
    );

    const response = await datastore.query(query);

    const fields = response.data[0].fields as Field[];
    expect(fields).toEqual([
      { name: 'workspace', values: ['WorkspaceName'], type: 'string' },
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
          queryBy: `${PropertiesOptions.PART_NUMBER} = '123'`,
          descending: false
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
          queryBy: `${ProductsQueryBuilderFieldNames.PART_NUMBER} = "{partNumber1,partNumber2}"`,
          descending: false
        },
      );

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            filter: "(PartNumber = \"partNumber1\" || PartNumber = \"partNumber2\")",
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
        scopedVars: { partNumber: { value : '123' } }
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
            projection: ["PART_NUMBER", "NAME"],
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
            projection: ["PART_NUMBER", "NAME"],
            returnCount: false,
          }
        })
      );
    });

    it('should replace variables with values', async () => {
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

    it('should handle multiple values in queryBy', async () => {
      const query: ProductVariableQuery = {
        refId: '',
        queryBy: `${ProductsQueryBuilderFieldNames.PART_NUMBER} = "{partNumber1,partNumber2}"`,
      };

      await datastore.metricFindQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            descending: false,
            filter:"(PartNumber = \"partNumber1\" || PartNumber = \"partNumber2\")",
            orderBy: "partNumber",
            projection: ["PART_NUMBER", "NAME"],
            returnCount: false,
          }
        })
      );
    });
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
