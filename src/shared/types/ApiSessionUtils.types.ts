export interface ApiSession {
    endpoint: string;
    sessionKey: {
        expiry: string,
        secret: string
    };
}
