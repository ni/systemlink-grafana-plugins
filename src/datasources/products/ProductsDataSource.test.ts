import { BackendSrvRequest, FetchResponse } from '@grafana/runtime';
import { ProductsDataSource } from './ProductsDataSource';
import { ProductQuery, Properties, PropertiesOptions, QueryProductResponse } from './types';
import { Observable, of } from 'rxjs';
import { DataQueryRequest, DataSourceInstanceSettings, dateTime, Field } from '@grafana/data';
import { createFetchError } from 'test/fixtures';

jest.mock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    getBackendSrv: () => ({ fetch: fetchMock }),
    getTemplateSrv: () => ({ replace: replaceMock, containsTemplate: containsTemplateMock, getVariables: getVariablesMock }),
}));

const mockVariables = [
    { name: 'partNumber', current: { value: '123' } },
    { name: 'workspace', current: { value: 'Workspace 1, Workspace 2, Workspace 3' } },
]

const fetchMock = jest.fn<Observable<FetchResponse>, [BackendSrvRequest]>();
const replaceMock = jest.fn((a: string, ...rest: any) => a);
const containsTemplateMock = jest.fn((a: string) => mockVariables.map(v => `$${v.name}`).includes(a));
const getVariablesMock = jest.fn(() => mockVariables);
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
        },
        {
            id: '2',
            name: 'Product 2',
            partNumber: '456',
            family: 'Family 2',
            workspace: 'Workspace 2',
            updatedAt: '2021-08-02T00:00:00Z',
            properties: { prop2: 'value2' }
        },
    ],
    continuationToken: '',
    totalCount: 2
};

let ds: ProductsDataSource;

beforeEach(() => {
    jest.clearAllMocks();
    const instanceSettings = {
        url: '_',
        name: 'SystemLink Product',
    };
    ds = new ProductsDataSource(instanceSettings as DataSourceInstanceSettings);
    setupFetchMock();
});

describe('ProductsDataSource', () => {
    describe('queryProducts', () => {
        it('should call api with correct parameters', async () => {
            const orderBy = 'name';
            const filter = '';
            const projection = [PropertiesOptions.ID, PropertiesOptions.NAME] as Properties[];
            const recordCount = 500;
            const descending = true;
            const returnCount = true;

            const response = await ds.queryProducts(orderBy, projection, filter, recordCount, descending, returnCount);

            expect(response).toEqual(mockQueryProductResponse);
        });
    });

    it('should return data when there are valid queries', async () => {
        const query = buildQuery([
            { refId: 'A', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: undefined }, // initial state when creating a panel
            { refId: 'B', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: PropertiesOptions.ID }, // state after orderby is selected
        ]);

        const response = await ds.query(query);

        expect(response.data).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nitestmonitor/v2/query-products' }));
        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ url: '_/nitestmonitor/v2/query-product-values' }));
    });

    it('should return error when queryProducts fails', async () => {
        fetchMock.mockReturnValueOnce((createFetchError(400)));

        const query = buildQuery([
            { refId: 'A', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: undefined },
        ]);

        await expect(ds.query(query)).rejects.toThrow('An error occurred while querying products: Request to url \"_/nitestmonitor/v2/query-products\" failed with status code: 400. Error message: \"Error\"');
    });

    it('should return empty data when there are no products', async () => {
        fetchMock.mockReturnValueOnce(of(createFetchResponse(emptyProductsResponseMock())));

        const query = buildQuery([
            { refId: 'A', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: undefined },
        ]);

        const response = await ds.query(query);

        expect(response.data).toHaveLength(1);
        expect(response.data[0].fields).toHaveLength(0);
    });

    it('should replace variables with values when queryBy exists', async () => {
        replaceMock.mockReturnValueOnce('123');
        const query = buildQuery([
            { refId: 'A', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: undefined, queryBy: "PartNumber = '$partNumber'" }, // initial state when creating a panel
        ]);
        
        await ds.query(query);

        expect(replaceMock).toHaveBeenCalledTimes(1);
        expect(replaceMock).toHaveBeenCalledWith(query.targets[0].queryBy, expect.anything());
        expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ data: { } }));
    });

    it('should replace multi value variables with values when queryBy exists', async () => {
        replaceMock.mockReturnValueOnce('Workspace 1, Workspace 2');

        const query = buildQuery([
            { refId: 'A', properties: [PropertiesOptions.PART_NUMBER, PropertiesOptions.FAMILY, PropertiesOptions.NAME, PropertiesOptions.WORKSPACE] as Properties[], orderBy: undefined, queryBy: "Workspace IN ('$workspace')" }, // initial state when creating a panel
        ]);

        await ds.query(query);

        expect(replaceMock).toHaveBeenCalledTimes(1);
        expect(replaceMock).toHaveBeenCalledWith(query.targets[0].queryBy, expect.anything());
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

        const response = await ds.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toEqual([
            { name: 'partNumber', values: ['123', '456'], type: 'string' },
            { name: 'family', values: ['Family 1', 'Family 2'], type: 'string' },
            { name: 'name', values: ['Product 1', 'Product 2'], type: 'string' },
            { name: 'workspace', values: ['Workspace 1', 'Workspace 2'], type: 'string' },
            { name: 'updatedAt', values: ['2021-08-01T00:00:00Z', '2021-08-02T00:00:00Z'], type: 'time' },
            { name: 'properties', values: ['{"prop1":"value1"}', '{"prop2":"value2"}'], type: 'string' },
        ]);
    });
});

const buildQuery = (targets: ProductQuery[]): DataQueryRequest<ProductQuery> => {
    return {
        ...defaultQuery,
        targets,
    };
};

const setupFetchMock = () => {
    fetchMock.mockImplementation((options: BackendSrvRequest) => {
        if (/\/v2\/query-products/.test(options.url)) {
            return of(createFetchResponse<QueryProductResponse>(mockQueryProductResponse));
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

const emptyProductsResponseMock = (): QueryProductResponse => {
  return {
    products: [],
    continuationToken: '',
    totalCount: 0
  }
}

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
