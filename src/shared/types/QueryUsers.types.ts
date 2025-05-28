export interface QueryUsersRequest {
  take?: number;
  filter?: string;
  continuationToken?: string;
}

export interface QueryUsersResponse {
  users: User[];
  continuationToken?: string;
  totalCount?: number;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    properties: {
        [key: string]: string
    };
    keywords: string[];
    created: string;
    updated: string;
    orgId: string;
}
