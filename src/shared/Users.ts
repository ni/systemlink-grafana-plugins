import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { queryUntilComplete } from 'core/utils';
import { QueryResponse } from 'core/types';
import { User, QueryUsersRequest, QueryUsersResponse } from './types/QueryUsers.types';

export class Users {
  private static _usersCache: Promise<User[]> | null = null;
  private static _usersMapCache: Promise<Map<string, string>> | null = null;

  get usersCache(): Promise<User[]> {
    return this.loadUsers()
  }

  get usersMapCache(): Promise<Map<string, string>> {
    if (Users._usersMapCache) {
      return Users._usersMapCache;
    }
    return this.usersCache.then(users => {
      const userMap = new Map<string, string>();
      users.forEach(user => {
        const fullName = Users.getUserFullName(user);
        userMap.set(user.id, fullName);
      });
      return userMap;
    });

  }
  constructor(readonly instanceSettings: DataSourceInstanceSettings, readonly backendSrv: BackendSrv) {
    this.loadUsers();
  }

  public static getUserFullName(user: User): string {   
    return `${user.firstName} ${user.lastName}`;
  }

  public static getUserNameAndEmail(user: User): string {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''} (${user?.email ?? ''})`;
  }

  private async loadUsers(): Promise<User[]> {
    if (Users._usersCache) {
      return Users._usersCache;
    }
    Users._usersCache = this.queryUsersInBatches({}).then(response => response.users);
    return Users._usersCache;
  }

  private async queryUsersInBatches(body: QueryUsersRequest): Promise<QueryUsersResponse> {
    const queryRecord = async (currentTake: number, token?: string | null): Promise<QueryResponse<User>> => {
      const response = await this.queryUsers({
        ...body,
        take: 100,
        continuationToken: token ?? undefined,
      });

      return {
        data: response.users,
        continuationToken: response.continuationToken,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: 100,
      requestsPerSecond: 5,
    };

    const response = await queryUntilComplete(queryRecord, batchQueryConfig);

    return {
      users: response.data,
      continuationToken: response.continuationToken ?? undefined,
    };
  }

  private queryUsers(body: QueryUsersRequest): Promise<QueryUsersResponse> {
    return this.backendSrv.post<QueryUsersResponse>(`${this.instanceSettings.url}/niuser/v1/users/query`, body);
  }
}
