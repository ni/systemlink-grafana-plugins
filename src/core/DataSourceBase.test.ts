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
    });

    describe('get', () => {
        it('should send GET request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.get('/test-endpoint', { param1: 'value1' });

            expect(backendSrv.fetch).toHaveBeenCalledWith({
                method: 'GET',
                url: '/test-endpoint',
                params: { param1: 'value1' },
            });
            expect(response).toEqual('test');
        });

        it('should send GET request with API ingress when useApiIngress is true', async () => {
            dataSource.apiSession = mockApiSessionUtils;

            const response = await dataSource.get('/test-endpoint', { param1: 'value1' }, true);


            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(backendSrv.fetch).toHaveBeenCalledWith({

                method: 'GET',
                url: 'http://api-ingress.com/test-endpoint',
                params: { param1: 'value1', 'x-ni-api-key': 'api-key-secret' }
            }
            );
            expect(response).toEqual('test');
        });
    });

    describe('post', () => {
        it('should send POST request with correct parameters when useApiIngress is not set', async () => {
            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' });

            expect(backendSrv.fetch).toHaveBeenCalledWith({
                method: 'POST',
                url: '/test-endpoint',
                data: { option1: 'optionValue' },
            });
            expect(response).toEqual('test');
        });

        it('should send POST request with API ingress when useApiIngress is true', async () => {
            dataSource.apiSession = mockApiSessionUtils;

            const response = await dataSource.post('/test-endpoint', { option1: 'optionValue' }, {}, true);

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(backendSrv.fetch).toHaveBeenCalledWith({
                method: 'POST',
                url: 'http://api-ingress.com/test-endpoint',
                data: { option1: 'optionValue' },
                headers: { 'x-ni-api-key': 'api-key-secret' },
            });
            expect(response).toEqual('test');
        });
    });
});
