import { AppEvents, DataSourceInstanceSettings, EventBus } from "@grafana/data";
import { BackendSrv, getAppEvents } from "@grafana/runtime";
import { post } from "./utils";

export interface ApiSession {
    endpoint: string;
    sessionKey: {
        expiry: string,
        secret: string
    };
}

export class ApiSessionUtils {
    private readonly appEvents: EventBus;
    private readonly cacheExpiryBufferTimeInMilliseconds = 5 * 60 * 1000;
    private sessionKeyCache?: ApiSession;

    constructor(
        private readonly instanceSettings: DataSourceInstanceSettings,
        private readonly backendSrv: BackendSrv
    ) {
        this.appEvents = getAppEvents();
    }

    public async createApiSession(): Promise<ApiSession> {
        if (this.sessionKeyCache) {
            if (this.isSessionKeyValid()) {
                return this.sessionKeyCache;
            }
        }

        const sessionData = await this.createApiSessionKey();
        this.sessionKeyCache = sessionData;
        return sessionData;
    }

    private isSessionKeyValid(): boolean {
        if (!this.sessionKeyCache) {
            return false;
        }
        const currentTimeWithBuffer = new Date(
            new Date().getTime() + this.cacheExpiryBufferTimeInMilliseconds
        );
        return currentTimeWithBuffer < new Date(this.sessionKeyCache.sessionKey.expiry);
    }

    private async createApiSessionKey(): Promise<ApiSession> {
        try {
            return await post<ApiSession>(
                this.backendSrv,
                `${this.instanceSettings.url}/user/create-api-session`,
                {},
                { showErrorAlert: false }
            );
        } catch (error: any) {
            this.appEvents?.publish?.({
                type: AppEvents.alertError.name,
                payload: [
                    'Error during creating Session-keys',
                    `The query to create an API session failed. ${error?.message ?? ''} Please check the data source configuration and try again.`
                ],
            });
            throw new Error('The query to create an API session failed. Please check the data source configuration and try again.');
        }
    }
}
