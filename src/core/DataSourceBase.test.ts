import { DataQuery, DataSourceInstanceSettings, TestDataSourceResponse } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";

jest.mock('./utils', () => ({
    get: jest.fn(),
    post: jest.fn(),
}));

describe('DataSourceBase', () => {
    let backendSrv: BackendSrv;
    let dataSource: any;
    let mockGet: jest.Mock;
    let mockPost: jest.Mock;

    const mockApiSession = {
        endpoint: 'http://api-ingress.com',
        sessionKey: { secret: 'api-key-secret' }
    };
    const mockApiSessionUtils = {
        createApiSession: jest.fn().mockResolvedValue(mockApiSession)
    };

    beforeAll(async () => {
        jest.resetModules();

        const { DataSourceBase } = await import('./DataSourceBase');
        const utils = await import('./utils');

        mockGet = utils.get as jest.Mock;
        mockPost = utils.post as jest.Mock;
        mockGet.mockResolvedValue('test');
        mockPost.mockResolvedValue('test');

        backendSrv = {} as BackendSrv;

        dataSource = setupMockDataSource(DataSourceBase);
        dataSource.apiSessionUtils = mockApiSessionUtils;
    });

    describe('get', () => {
        it('should send GET request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.get('/test-endpoint', { param1: 'value1' });

            expect(mockGet).toHaveBeenCalledWith(
                backendSrv,
                '/test-endpoint',
                { param1: 'value1' },
            );
            expect(response).toEqual('test');
        });

        it('should send GET request with API ingress when useApiIngress is true', async () => {
            const response = await dataSource.get('/test-endpoint', { param1: 'value1' }, true);

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    'param1': 'value1',
                    'x-ni-api-key': 'api-key-secret'
                },
            );
            expect(response).toEqual('test');
        });

        it('should send GET request with API ingress endpoints and api key when useApiIngress is true and params is empty', async () => {
            const response = await dataSource.get('/test-endpoint', {}, true);
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    'x-ni-api-key': 'api-key-secret'
                },
            );
            expect(response).toEqual('test');
        });

        it('should not send GET request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            await expect(dataSource.get('/test-endpoint', { param1: 'value1' }, true))
                .rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet).not.toHaveBeenCalled();
        });
    });

    describe('post', () => {
        it('should send POST request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.post('/test-endpoint', { body: 'body' }, { options: 'optionValue' });

            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                '/test-endpoint',
                { body: 'body' },
                { options: 'optionValue' }
            );
            expect(response).toEqual('test');
        });

        it('should send POST request with API ingress when useApiIngress is true', async () => {
            const response = await dataSource.post(
                '/test-endpoint',
                { body: 'body' },
                {
                    headers: {
                        testHeader: 'headerValue'
                    }
                },
                true
            );

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                { body: 'body' },
                {

                    headers: {
                        testHeader: 'headerValue',
                        "x-ni-api-key": "api-key-secret"
                    }

                },
            );
            expect(response).toEqual('test');
        });

        it('should not send POST request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            await expect(dataSource.post('/test-endpoint', { options: 'optionValue' }, {}, true))
                .rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).not.toHaveBeenCalled();
        });
    });

    function setupMockDataSource(DataSourceBase: any) {
        const instanceSettings = {
            url: 'http://api-example.com',
        } as DataSourceInstanceSettings;
        class MockDataSource extends DataSourceBase<DataQuery> {
            public constructor() {
                super(instanceSettings, backendSrv, {} as any);
            }
            public defaultQuery = {};
            public runQuery(_query: DataQuery, _options: any) {
                return Promise.resolve({
                    fields: [],
                });
            }
            public shouldRunQuery() {
                return true;
            }
            testDatasource(): Promise<TestDataSourceResponse> {
                throw new Error("Method not implemented.");
            }
        }
        return new MockDataSource();
    }
});
