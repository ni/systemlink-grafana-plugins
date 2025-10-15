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
    let originalDateNow: () => number;

    beforeEach(() => {
        // Store original Date.now
        originalDateNow = Date.now;
        
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

    afterEach(() => {
        // Restore original Date.now
        Date.now = originalDateNow;
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
            expect(result).toEqual(newSession);
        });

        it('should return a valid cached session', async () => {
            const validSession = createMockSession(600_000); // 10 minutes expiry, well outside 5 min buffer
            mockPost.mockResolvedValue(validSession);

            const result1 = await apiSessionUtils.createApiSession();
            const result2 = await apiSessionUtils.createApiSession();

            expect(mockPost).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(validSession);
            expect(result2).toEqual(validSession);
        });

        it('should create a new session if cached session is expired', async () => {
            // Set up a fixed timestamp for consistent testing
            const baseTime = 1610000000000; // Fixed timestamp
            Date.now = jest.fn().mockReturnValue(baseTime);
            
            // Create a session that will expire soon (just over 5 minutes)
            const expiredSession = {
                endpoint: 'http://localhost',
                sessionKey: {
                    expiry: new Date(baseTime + 310_000).toISOString(), // 5m10s from now
                    secret: 'test-secret-1',
                },
            };
            
            const newSession = {
                endpoint: 'http://localhost',
                sessionKey: {
                    expiry: new Date(baseTime + 600_000).toISOString(), // 10m from now
                    secret: 'test-secret-2',
                },
            };
            
            mockPost.mockResolvedValueOnce(expiredSession);
            
            // First call - should get and cache the session
            const result1 = await apiSessionUtils.createApiSession();
            expect(result1).toEqual(expiredSession);
            
            // Simulate time passing - move forward just beyond the buffer time (5m1s)
            Date.now = jest.fn().mockReturnValue(baseTime + 301_000);
            
            // Set up the mock for the second call
            mockPost.mockResolvedValueOnce(newSession);
            
            // Second call - should detect near-expiry and get a new session
            const result2 = await apiSessionUtils.createApiSession();
            
            // Verify behavior
            expect(mockPost).toHaveBeenCalledTimes(2);
            expect(result2).toEqual(newSession);
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
                    `The query to create an API session failed. ${error.message} Please check the data source configuration and try again.`
                ],
            });
        });
    });
});
