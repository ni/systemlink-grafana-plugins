import { DataSourceInstanceSettings } from "@grafana/data";

jest.mock('./utils', () => ({
    get: jest.fn(),
    post: jest.fn(),
}));

describe('DataSourceBase', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: any;
    let DataSourceBaseStub: any;
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
        DataSourceBaseStub = DataSourceBase;
        const utils = require('./utils');
        mockGet = utils.get as jest.Mock;
        mockPost = utils.post as jest.Mock;

        backendSrv = {};
        instanceSettings = {
            url: 'http://api-example.com',
        } as DataSourceInstanceSettings;

        dataSource = new DataSourceBaseStub(
            instanceSettings,
            backendSrv,
            {}
        );
        dataSource.apiSessionUtils = mockApiSessionUtils;
    });

    describe('get', () => {
        beforeEach(() => {
            mockGet.mockResolvedValue('test');
        });

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
        beforeEach(() => {
            mockPost.mockResolvedValue('test');
        });

        it('should send POST request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' });

            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                '/test-endpoint',
                { option1: 'optionValue' },
                {}
            );
            expect(response).toEqual('test');
        });

        it('should send POST request with API ingress when useApiIngress is true', async () => {
            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' }, {}, true);

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                { option1: 'optionValue' },
                { headers: { "x-ni-api-key": "api-key-secret" } },
            );
            expect(response).toEqual('test');
        });

        it('should not send POST request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            await expect(dataSource.post('/test-endpoint', { option1: 'optionValue' }, {}, true))
                .rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).not.toHaveBeenCalled();
        });
    });
});
