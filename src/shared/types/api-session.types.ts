/**
 * AuthStatement represents a statement in an authentication policy.
 */
export interface AuthStatement {
    actions: string[];
    resource: string[];
    workspace: string;
}

export interface AuthPolicy {
    statements: AuthStatement[];
}

/**
 * Represents an API session created using /user/create-api-session route.
 */
export interface ApiSession {
    endpoint: string;
    sessionKey: {
        expiry: string,
        secret: string
    };
}

export interface SessionData {
    session: ApiSession;
    policyKey: string;
}