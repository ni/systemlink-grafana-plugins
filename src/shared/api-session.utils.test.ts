import { AppEvents, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    getAppEvents: jest.fn(),
}));
jest.mock('../core/utils', () => ({
    post: jest.fn(),
}));
jest.resetModules();

describe('ApiSessionUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let appEvents: { publish: any; };
    let ApiSessionUtils: any;
    let apiSessionUtilsInstance: any;
    let mockGetAppEvents: jest.Mock;
    let mockPost: jest.Mock;

    beforeAll(async () => {
        // Dynamically import dependencies after mocks
        ApiSessionUtils = (await import('./api-session.utils')).ApiSessionUtils;
        let getAppEvents = (await import('@grafana/runtime')).getAppEvents;
        let post = (await import('../core/utils')).post;

        mockGetAppEvents = getAppEvents as jest.Mock;
        appEvents = { publish: jest.fn() };
        mockGetAppEvents.mockReturnValue(appEvents);

        mockPost = post as jest.Mock;

        instanceSettings = { url: 'http://api-example.com' } as DataSourceInstanceSettings;
        backendSrv = {} as BackendSrv;
        apiSessionUtilsInstance = new ApiSessionUtils(instanceSettings, backendSrv);
    });

    beforeEach(async () => {
        // Reset static cache before each test
        (ApiSessionUtils as any)._sessionCache = undefined;

        mockPost.mockClear();
        appEvents.publish.mockClear();
    });

    describe('createApiSession', () => {
        const createMockSession = (expiryOffset: number) => ({
            endpoint: 'http://test-endpoint',
            sessionKey: {
                expiry: new Date(Date.now() + expiryOffset).toISOString(),
                secret: 'test-secret',
            },
        });

        it('should create a new session if cache is empty', async () => {
            const newSession = createMockSession(600_000); // 10 minutes expiry
            mockPost.mockResolvedValue(newSession);

            const session = await apiSessionUtilsInstance.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                "http://api-example.com/user/create-api-session",
                {},
                { showErrorAlert: false },
            );
            expect(session).toBe(newSession);
        });

        it('should return a valid cached session', async () => {
            const validSession = createMockSession(600_000); // 10 minutes expiry, well outside 5 min buffer
            mockPost.mockResolvedValue(validSession);

            const session1 = await apiSessionUtilsInstance.createApiSession();
            const session2 = await apiSessionUtilsInstance.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(mockPost).toHaveBeenCalledWith(
                backendSrv,
                "http://api-example.com/user/create-api-session",
                {},
                { showErrorAlert: false },
            );
            expect(session1).toBe(validSession);
            expect(session2).toBe(validSession);
        });

        it('should create a new session if cached session is expired', async () => {
            const expiredSession = createMockSession(240_000); // 4 minutes expiry (inside 5-minute buffer)
            const newSession = createMockSession(600_000);
            mockPost.mockResolvedValueOnce(expiredSession)
                .mockResolvedValueOnce(newSession);

            const session1 = await apiSessionUtilsInstance.createApiSession();
            const session2 = await apiSessionUtilsInstance.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(2);
            expect(session1).toBe(expiredSession);
            expect(session2).toBe(newSession);
        });

        it('should handle errors during session creation and publish an event', async () => {
            const error = new Error('Network error');
            const errorMessage = `The query to create an API session failed. ${error?.message}.`

            mockPost.mockRejectedValue(error);

            await expect(apiSessionUtilsInstance.createApiSession()).rejects.toThrow(
                errorMessage
            );

            expect(appEvents.publish).toHaveBeenCalledWith({
                type: AppEvents.alertError.name,
                payload: [
                    'An error occurred while creating a session',
                    errorMessage
                ],
            });
        });
    });
});
