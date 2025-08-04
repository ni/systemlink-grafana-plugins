import { Subject } from "rxjs";
import { ApiSession, AuthPolicy, SessionData } from "./types/api-session.types";
import { SESSION_EXPIRY_BUFFER_TIME_IN_MILLISECONDS } from "./constants/api-session.constants";
import { BackendSrv } from "@grafana/runtime";
import { DataSourceInstanceSettings } from "@grafana/data";

export class ApiSessionUtils {
    private readonly sessionKeyMap = new Map<Subject<void>, SessionData>();

    private readonly createSessionUrl = 'https://test.lifecyclesolutions.ni.com/user/create-api-session';
    constructor(
        readonly instanceSettings: DataSourceInstanceSettings,
        readonly backendSrv: BackendSrv
    ){
    }

    public async createApiSession(owner$: Subject<void>, policies: AuthPolicy[] = []): Promise<ApiSession | null> {
        const policyKey = this.generateKey(policies);

        for (const [key, sessionData] of this.sessionKeyMap.entries()) {
            if (key === owner$ && sessionData.policyKey === policyKey) {
                if (!this.isSessionExpired(sessionData)) {
                    return sessionData.session;
                }
                this.sessionKeyMap.delete(key);
                break;
            }
        }

        return await this.createSessionKey().then((session: ApiSession) => {
            this.sessionKeyMap.set(owner$, { session, policyKey });
            
            owner$.subscribe(() => {
                this.invalidateSession(policyKey, owner$);
            });
            return session;
        });
    }

    /**
     * Creates a session key
     * @returns An observable that emits the session key
     */
    private async createSessionKey(): Promise<ApiSession> {
        return await this.backendSrv.post<ApiSession>(
            this.createSessionUrl,
            {});
    }

    /**
     * Generates a key for the session key map
     * @param policies The policies to generate the key from
     * @returns The generated key
     */
    private generateKey(policies: AuthPolicy[]): string {
        return JSON.stringify(policies);
    }


    /**
     * Checks if the session key is expired
     * @param sessionData The session data to check
     * @returns True if the session key is expired, false otherwise
     */
    private isSessionExpired(sessionData: SessionData): boolean {
        const currentTimeWithBuffer = new Date(new Date().getTime() + SESSION_EXPIRY_BUFFER_TIME_IN_MILLISECONDS);

        return currentTimeWithBuffer >= new Date(sessionData.session.sessionKey.expiry);
    }

    /**
     * Invalidates the session key and removes it from the session key map
     * @param policyKey The key of the policy to invalidate
     * @param owner$ The owner of the session key
     */
    private async invalidateSession(policyKey: string, owner$: Subject<void>): Promise<void> {
        for (const [key, sessionData] of this.sessionKeyMap.entries()) {
            if (key === owner$ && sessionData.policyKey === policyKey) {
                if (!this.isSessionExpired(sessionData)) {
                    await this.deleteSessionKey(sessionData.session).then(() => {
                        this.sessionKeyMap.delete(owner$);
                    });
                } else {
                    this.sessionKeyMap.delete(owner$);
                }
            }
        }
    }

    /**
     * Deletes the session key
     * @param apiSession The session key to delete
     * @returns An observable that completes when the session key is deleted
     */
    private async deleteSessionKey(apiSession: ApiSession): Promise<void> {
        const url = `${apiSession.endpoint}/niauth/v1/session-keys/self`;
        return await this.backendSrv.delete<undefined>(url, {
            headers: { 'x-ni-api-key': apiSession.sessionKey.secret }
        });
    }
}