import { AppEvents, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';

jest.mock('@grafana/runtime', () => ({
    ...jest.requireActual('@grafana/runtime'),
    getAppEvents: jest.fn(),
}));
jest.mock('./utils', () => ({
    post: jest.fn(),
}));
jest.resetModules();

let post, getAppEvents, ApiSessionUtils;
let mockGetAppEvents: jest.Mock;
let mockPost: jest.Mock;

describe('ApiSessionUtils', () => {
    let instanceSettings: DataSourceInstanceSettings;
    let backendSrv: BackendSrv;
    let appEvents: { publish: any; };
    let apiSessionUtils: any;

    beforeEach(async () => {
        // Dynamically import dependencies after mocks
        ApiSessionUtils = (await import('./api-session.utils')).ApiSessionUtils;
        getAppEvents = (await import('@grafana/runtime')).getAppEvents;
        post = (await import('./utils')).post;

        mockGetAppEvents = getAppEvents as jest.Mock;
        mockPost = post as jest.Mock;

        instanceSettings = { url: 'http://api-example.com' } as DataSourceInstanceSettings;
        backendSrv = {} as BackendSrv;
        appEvents = { publish: jest.fn() };
        mockGetAppEvents.mockReturnValue(appEvents);

        apiSessionUtils = new ApiSessionUtils(instanceSettings, backendSrv);

        mockPost.mockClear();
        appEvents.publish.mockClear();
    });

    const createMockSession = (expiryOffset: number) => ({
        endpoint: 'http://localhost',
        session: {
            expiry: new Date(Date.now() + expiryOffset).toISOString(),
            secret: 'test-secret',
        },
    });

    describe('createApiSession', () => {
        it('should create a new session if cache is empty', async () => {
            const newSession = createMockSession(600_000); // 10 minutes expiry
            mockPost.mockResolvedValue(newSession);

            const session = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(session).toBe(newSession);
        });

        it('should return a valid cached session', async () => {
            const validSession = createMockSession(600_000); // 10 minutes expiry, well outside 5 min buffer
            mockPost.mockResolvedValue(validSession);

            const session1 = await apiSessionUtils.createApiSession();
            const session2 = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(session1).toBe(validSession);
            expect(session2).toBe(validSession);
        });

        it('should create a new session if cached session is expired', async () => {
            const expiredSession = createMockSession(240_000); // 4 minutes expiry (inside 5-minute buffer)
            const newSession = createMockSession(600_000);
            mockPost.mockResolvedValueOnce(expiredSession).mockResolvedValueOnce(newSession);

            const session1 = await apiSessionUtils.createApiSession();
            const session2 = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(2);
            expect(session1).toBe(expiredSession);
            expect(session2).toBe(newSession);
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
                    'Error creating session',
                    `The query to create an API session failed. ${error.message}. Please check the data source configuration and try again.`
                ],
            });
        });
    });
});
