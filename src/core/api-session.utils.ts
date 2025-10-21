import { AppEvents, DataSourceInstanceSettings, EventBus } from "@grafana/data";
import { BackendSrv, getAppEvents } from "@grafana/runtime";
import { post } from "./utils";

export interface ApiSession {
    endpoint: string;
    session: {
        expiry: string,
        secret: string
    };
}

export class ApiSessionUtils {
    private readonly appEvents: EventBus;
    private readonly cacheExpiryBufferTimeInMilliseconds = 5 * 60 * 1000; // 5 minutes buffer
    private sessionCache?: ApiSession;

    constructor(
        private readonly instanceSettings: DataSourceInstanceSettings,
        private readonly backendSrv: BackendSrv
    ) {
        this.appEvents = getAppEvents();
    }

    public async createApiSession(): Promise<ApiSession> {
        if (this.sessionCache && this.isSessionValid()) {
            return this.sessionCache;
        }

        const apiSession = await this.createApiSessionData();
        this.sessionCache = apiSession;
        return apiSession;
    }

    private isSessionValid(): boolean {
        if (!this.sessionCache) {
            return false;
        }
        const currentTimeWithBuffer = new Date(
            new Date().getTime() + this.cacheExpiryBufferTimeInMilliseconds
        );
        return currentTimeWithBuffer < new Date(this.sessionCache.session.expiry);
    }

    private async createApiSessionData(): Promise<ApiSession> {
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
                    'Error creating session',
                    `The query to create an API session failed. ${error?.message ?? ''}. Please check the data source configuration and try again.`
                ],
            });
            throw new Error('The query to create an API session failed. Please check the data source configuration and try again.');
        }
    }
}
