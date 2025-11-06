import { DataQuery, DataSourceInstanceSettings, TestDataSourceResponse } from "@grafana/data";
import { BackendSrv } from "@grafana/runtime";
import { firstValueFrom, map, of, timer } from "rxjs";

jest.mock('./utils', () => ({
    get: jest.fn(),
    post: jest.fn(),
    get$: jest.fn(),
    post$: jest.fn(),
}));

describe('DataSourceBase', () => {
    let backendSrv: BackendSrv;
    let dataSource: any;
    let mockGet: jest.Mock;
    let mockPost: jest.Mock;
    let mockGet$: jest.Mock;
    let mockPost$: jest.Mock;

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
        mockGet$ = utils.get$ as jest.Mock;
        mockPost$ = utils.post$ as jest.Mock;
        mockGet.mockResolvedValue('test');
        mockPost.mockResolvedValue('test');
        mockGet$.mockReturnValue(of('observable-test'));
        mockPost$.mockReturnValue(of('observable-test'));

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
            const response = await dataSource.get('/test-endpoint', { params: { param1: 'value1' }, useApiIngress: true });

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    params: {
                        'param1': 'value1',
                        'x-ni-api-key': 'api-key-secret'
                    }
                },
            );
            expect(response).toEqual('test');
        });

        it('should send GET request with API ingress endpoints and api key when useApiIngress is true and params is empty', async () => {
            const response = await dataSource.get('/test-endpoint', { useApiIngress: true });
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    params: {
                        'x-ni-api-key': 'api-key-secret'
                    }
                },
            );
            expect(response).toEqual('test');
        });

        it('should not send GET request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            await expect(dataSource.get('/test-endpoint', { param1: 'value1', useApiIngress: true }))
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
                    },
                    useApiIngress: true
                },
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

        it('should send POST request with API ingress endpoints and api key when useApiIngress is true and no options are provided', async () => {
            const response = await dataSource.post(
                '/test-endpoint',
                { body: 'body' },
                { useApiIngress: true }
            );

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                { body: 'body' },
                {
                    headers: {
                        "x-ni-api-key": "api-key-secret"
                    }
                },
            );
            expect(response).toEqual('test');
        });

        it('should not send POST request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            await expect(dataSource.post('/test-endpoint', { options: 'optionValue' }, { useApiIngress: true }))
                .rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost).not.toHaveBeenCalled();
        });
    });

    describe('get$', () => {
        it('should send GET$ request with correct parameters when useApiIngress is not set', async () => {
            const response = await firstValueFrom(dataSource.get$('/test-endpoint', { param1: 'value1' }));

            expect(mockGet$).toHaveBeenCalledWith(
                backendSrv,
                '/test-endpoint',
                { param1: 'value1' }
            );
            expect(response).toEqual('observable-test');
        });

        it('should send GET$ request with API ingress when useApiIngress is true', async () => {
            const response = await firstValueFrom(
                dataSource.get$('/test-endpoint', { params: { param1: 'value1' }, useApiIngress: true })
            );

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet$).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    params: {
                        'param1': 'value1',
                        'x-ni-api-key': 'api-key-secret'
                    }
                }
            );
            expect(response).toEqual('observable-test');
        });

        it('should not send GET$ request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            const response = firstValueFrom(dataSource.get$('/test-endpoint', { params: { param1: 'value1' }, useApiIngress: true }));

            await expect(response).rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet$).not.toHaveBeenCalled();
        });

        it('should send GET$ request with API ingress endpoints and api key when useApiIngress is true and params is empty', async () => {
            const response = await firstValueFrom(dataSource.get$('/test-endpoint', { useApiIngress: true}));

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockGet$).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                {
                    params: {
                        'x-ni-api-key': 'api-key-secret'
                    }
                }
            );
            expect(response).toEqual('observable-test');
        });
    });

    describe('post$', () => {
        it('should send POST$ request with correct parameters when useApiIngress is not set', async () => {
            const response = await firstValueFrom(
                dataSource.post$(
                    '/test-endpoint',
                    { body: 'body' },
                    { options: 'optionValue' }
                )
            );

            expect(mockPost$).toHaveBeenCalledWith(
                backendSrv,
                '/test-endpoint',
                { body: 'body' },
                { options: 'optionValue' }
            );
            expect(response).toEqual('observable-test');
        });

        it('should send POST$ request with API ingress when useApiIngress is true', async () => {
            const options = {
                headers: {
                    testHeader: 'headerValue'
                },
                useApiIngress: true
            };

            const response = await firstValueFrom(
                dataSource.post$(
                    '/test-endpoint',
                    { body: 'body' },
                    options
                )
            );

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            const updatedOptions = {
                headers: {
                    ...options.headers,
                    "x-ni-api-key": "api-key-secret"
                }
            };
            expect(mockPost$).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                { body: 'body' },
                updatedOptions,
            );
            expect(response).toEqual('observable-test');
        });

        it('should send POST$ request with API ingress endpoints and api key when useApiIngress is true and no options are provided', async () => {
            const response = await firstValueFrom(
                dataSource.post$(
                    '/test-endpoint',
                    { body: 'body' },
                    { useApiIngress: true }
                )
            );

            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost$).toHaveBeenCalledWith(
                backendSrv,
                "http://api-ingress.com/test-endpoint",
                { body: 'body' },
                {
                    headers: {
                        "x-ni-api-key": "api-key-secret"
                    }
                }
            );
            expect(response).toEqual('observable-test');
        });

        it('should not send POST$ request if no API session is returned', async () => {
            jest.clearAllMocks();
            mockApiSessionUtils.createApiSession.mockRejectedValueOnce(new Error('No session created'));

            const response = firstValueFrom(dataSource.post$('/test-endpoint', { options: 'optionValue' }, { useApiIngress: true }));

            await expect(response).rejects.toThrow('No session created');
            expect(mockApiSessionUtils.createApiSession).toHaveBeenCalled();
            expect(mockPost$).not.toHaveBeenCalled();
        });
    });

    describe('query', () => {
        it('should run queries for all targets that should run', async () => {
            const querySpy = jest.spyOn(dataSource, 'runQuery').mockResolvedValue('frame-data');
            const prepareSpy = jest.spyOn(dataSource, 'prepareQuery').mockReturnValueOnce({ key: 'value' });
            const shouldRunSpy = jest.spyOn(dataSource, 'shouldRunQuery').mockReturnValue(true);

            const request = {
                targets: [
                    { refId: 'A' },
                    { refId: 'B' }
                ],
            };

            const response = await firstValueFrom(dataSource.query(request));

            expect(prepareSpy).toHaveBeenCalledTimes(2);
            expect(shouldRunSpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledWith(
                { key: 'value' },
                {
                    targets: [ { refId: 'A' }, { refId: 'B' } ]
                }
            );
            expect(response).toEqual({
                data: ['frame-data', 'frame-data'],
            });
        });

        it('should skip queries for targets that should not run', async () => {
            const querySpy = jest.spyOn(dataSource, 'runQuery').mockResolvedValue('frame-data');
            const prepareSpy = jest.spyOn(dataSource, 'prepareQuery').mockReturnValue({ key: 'value' });
            const shouldRunSpy = jest.spyOn(dataSource, 'shouldRunQuery')
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);

            const request = {
                targets: [
                    { refId: 'A' },
                    { refId: 'B' }
                ],
            };

            const response = await firstValueFrom(dataSource.query(request));

            expect(prepareSpy).toHaveBeenCalledTimes(2);
            expect(shouldRunSpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledTimes(1);
            expect(querySpy).toHaveBeenCalledWith(
                { key: 'value' },
                {
                    targets: [ { refId: 'A' }, { refId: 'B' } ]
                }
            );
            expect(response).toEqual({
                data: ['frame-data']
            });
        });

        it('should return empty data if no targets should run', async () => {
            const querySpy = jest.spyOn(dataSource, 'runQuery').mockResolvedValue('frame-data');
            const prepareSpy = jest.spyOn(dataSource, 'prepareQuery');
            const shouldRunSpy = jest.spyOn(dataSource, 'shouldRunQuery').mockReturnValue(false);

            const request = {
                targets: [
                    { refId: 'A' }, { refId: 'B' }
                ],
            };

            const response = await firstValueFrom(dataSource.query(request));

            expect(prepareSpy).toHaveBeenCalledTimes(2);
            expect(shouldRunSpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledTimes(0);
            expect(response).toEqual({
                data: [],
            });
        });

        it('should handle mixed Observable and Promise runQuery results', async () => {
            const querySpy = jest.spyOn(dataSource, 'runQuery')
                .mockImplementationOnce(() => Promise.resolve('async-frame-data'))
                .mockImplementationOnce(() => of('observable-frame-data'));
            const prepareSpy = jest.spyOn(dataSource, 'prepareQuery');
            const shouldRunSpy = jest.spyOn(dataSource, 'shouldRunQuery').mockReturnValue(true);

            const request = {
                targets: [
                    { refId: 'A' },
                    { refId: 'B' },
                ],
            };

            const response = await firstValueFrom(dataSource.query(request));

            expect(prepareSpy).toHaveBeenCalledTimes(2);
            expect(shouldRunSpy).toHaveBeenCalledTimes(2);
            expect(querySpy).toHaveBeenCalledTimes(2);
            expect(response).toEqual({
                data: ['async-frame-data', 'observable-frame-data'],
            });
        });

        it('should wait for the longest running Observable to complete before emitting the final value', async () => {
            jest.useFakeTimers();
            jest.spyOn(dataSource, 'prepareQuery');
            jest.spyOn(dataSource, 'shouldRunQuery').mockReturnValue(true);            
            const querySpy = jest.spyOn(dataSource, 'runQuery')
                .mockImplementationOnce(() => {
                    return timer(50).pipe(map(() => 'Data-A-Slow'));
                })
                .mockImplementationOnce(() => {
                    return timer(10).pipe(map(() => 'Data-B-Fast'));
                });

            const request = {
                targets: [{ refId: 'A' }, { refId: 'B' }],
            };

            let responseResolved = false;
            const responsePromise = firstValueFrom(dataSource.query(request))
                .then(res => {
                    responseResolved = true;
                    return res;
                });

            jest.advanceTimersByTime(10);
            expect(responseResolved).toBe(false);
    
            jest.advanceTimersByTime(39);
            expect(responseResolved).toBe(false);
    
            jest.advanceTimersByTime(1);
            await Promise.resolve();
            expect(responseResolved).toBe(true);
    
            const response = await responsePromise;
    
            expect(querySpy).toHaveBeenCalledTimes(2);
            expect(response).toEqual({
                data: ['Data-A-Slow', 'Data-B-Fast'],
            });
            jest.useRealTimers();
        });
    });
    
    describe('getVariableOptions', () => {
        it('returns variables as SelectableValue array', () => {
            expect(dataSource.getVariableOptions()).toEqual([
                { label: '$var1', value: '$var1' },
                { label: '$var2', value: '$var2' }
            ]);
        });
    });

    function setupMockDataSource(DataSourceBase: any) {
        const instanceSettings = {
            url: 'http://api-example.com',
        } as DataSourceInstanceSettings;
        const mockTemplateSrv = {
            getVariables: () => [
                { name: 'var1' },
                { name: 'var2' }
            ]
        };
        class MockDataSource extends DataSourceBase<DataQuery> {
            public constructor() {
                super(instanceSettings, backendSrv, mockTemplateSrv);
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
