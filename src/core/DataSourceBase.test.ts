import { DataSourceInstanceSettings } from "@grafana/data";
import { of } from "rxjs";

type MockedBackendSrv = jest.Mocked<{
    get: jest.Mock;
    post: jest.Mock;
    fetch: jest.Mock;
}>;

describe('DataSourceBase', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: MockedBackendSrv;
    let DataSourceBaseStub: any;
    let dataSource: any;

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
        backendSrv = {
            get: jest.fn(),
            post: jest.fn(),
            fetch: jest.fn().mockReturnValue(of({ data: 'test' }))
        };
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
        let getSpy: jest.SpyInstance;

        beforeEach(() => {
            getSpy = jest.spyOn(dataSource, 'get');
        });

        it('should send GET request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.get('/test-endpoint', { param1: 'value1' });

            expect(getSpy).toHaveBeenCalledWith(
                '/test-endpoint',
                { param1: 'value1' },
            );
            expect(response).toEqual('test');
        });

        it('should send GET request with API ingress when useApiIngress is true', async () => {
            const response = await dataSource.get('/test-endpoint', { param1: 'value1' }, true);

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(getSpy).toHaveBeenCalledWith(
                '/test-endpoint',
                { param1: 'value1' },
                true
            );
            expect(response).toEqual('test');
        });
    });

    describe('post', () => {
        let postSpy: jest.SpyInstance;

        beforeEach(() => {
            postSpy = jest.spyOn(dataSource, 'post');
        });

        it('should send POST request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' });

            expect(postSpy).toHaveBeenCalledWith(
                '/test-endpoint',
                { option1: 'optionValue' },
            );
            expect(response).toEqual('test');
        });

        it('should send POST request with API ingress when useApiIngress is true', async () => {
            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' }, {}, true);

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(postSpy).toHaveBeenCalledWith(
                '/test-endpoint',
                { option1: 'optionValue' },
                {},
                true
            );
            expect(response).toEqual('test');
        });
    });
});
