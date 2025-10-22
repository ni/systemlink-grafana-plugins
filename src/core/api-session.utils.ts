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
    private readonly cacheExpiryBufferTimeInMilliseconds = 5 * 60 * 1000; // 5 minutes buffer
    private static _sessionCache?: Promise<ApiSession>;

    constructor(
        private readonly instanceSettings: DataSourceInstanceSettings,
        private readonly backendSrv: BackendSrv
    ) {
        this.appEvents = getAppEvents();
    }

    public async createApiSession(): Promise<ApiSession> {
        if (!ApiSessionUtils._sessionCache || !await this.isSessionValid()) {
            ApiSessionUtils._sessionCache = this.createApiSessionData();
        }
        return ApiSessionUtils._sessionCache;
    }

    private async isSessionValid(): Promise<boolean> {
        if (!ApiSessionUtils._sessionCache) {
            return false;
        }
        const currentTimeWithBuffer = new Date(
            new Date().getTime() + this.cacheExpiryBufferTimeInMilliseconds
        );
        return currentTimeWithBuffer < new Date((await ApiSessionUtils._sessionCache).sessionKey.expiry);
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
            const errorMessage = `The query to create an API session failed. ${error?.message ?? ''}.`
            this.appEvents?.publish?.({
                type: AppEvents.alertError.name,
                payload: [
                    'Error creating session',
                    errorMessage
                ],
            });
            throw new Error(errorMessage);
        }
    }
}
