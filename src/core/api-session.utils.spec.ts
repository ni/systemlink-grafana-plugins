import { AppEvents, DataSourceInstanceSettings, EventBus } from '@grafana/data';
import { BackendSrv, getAppEvents } from '@grafana/runtime';
import { ApiSession, ApiSessionUtils } from './api-session.utils';
import { post } from './utils';

jest.mock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    getAppEvents: jest.fn(),
}));

jest.mock('./utils', () => ({
    post: jest.fn(),
}));

const mockGetAppEvents = getAppEvents as jest.Mock;
const mockPost = post as jest.Mock;

describe('ApiSessionUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let appEvents: EventBus;
    let apiSessionUtils: ApiSessionUtils;

    beforeEach(() => {
        instanceSettings = {
            id: 1,
            uid: 'test-uid',
            name: 'Test-DataSource',
            type: 'test-type',
            meta: {} as any,
            jsonData: {},
            url: '/api/datasources/proxy/1',
            readOnly: false,
            access: 'proxy'
        };
        backendSrv = {} as BackendSrv;
        appEvents = { publish: jest.fn() } as any;
        mockGetAppEvents.mockReturnValue(appEvents);

        apiSessionUtils = new ApiSessionUtils(instanceSettings, backendSrv);

        mockPost.mockClear();
        (appEvents.publish as jest.Mock).mockClear();
    });

    const createMockSession = (expiryOffset: number): ApiSession => ({
        endpoint: 'http://localhost',
        sessionKey: {
            expiry: new Date(Date.now() + expiryOffset).toISOString(),
            secret: 'test-secret',
        },
    });

    describe('createApiSession', () => {
        it('should create a new session if cache is empty', async () => {
            const newSession = createMockSession(600_000); // 10 minutes expiry
            mockPost.mockResolvedValue(newSession);

            const result = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(result).toBe(newSession);
        });

        it('should return a valid cached session', async () => {
            const validSession = createMockSession(600_000); // 10 minutes expiry, well outside 5 min buffer
            mockPost.mockResolvedValue(validSession);

            const result1 = await apiSessionUtils.createApiSession();
            const result2 = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(result1).toBe(validSession);
            expect(result2).toBe(validSession);
        });

        it('should create a new session if cached session is expired', async () => {
            const expiredSession = createMockSession(240_000); // 4 minutes expiry (inside 5-minute buffer)
            const newSession = createMockSession(600_000);
            mockPost.mockResolvedValueOnce(expiredSession).mockResolvedValueOnce(newSession);

            const result1 = await apiSessionUtils.createApiSession();
            const result2 = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(2);
            expect(result1).toBe(expiredSession);
            expect(result2).toBe(newSession);
        });

        it('should handle errors during session creation and publish an event', async () => {
            const error = new Error('Network error');
            mockPost.mockRejectedValue(error);

            await expect(apiSessionUtils.createApiSession()).rejects.toThrow(
                'The query to create an API session failed. Please check the data source configuration and try again.'
            );

            expect(appEvents.publish).toHaveBeenCalledWith({
                type: AppEvents.alertError.name,
                payload: [
                    'Error during creating Session-keys',
                    `The query to create an API session failed. ${error.message} Please check the data source configuration and try again.`
                ],
            });
        });
    });
});
