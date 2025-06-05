import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { queryUntilComplete } from 'core/utils';
import { QueryResponse } from 'core/types';
import { User, QueryUsersRequest, QueryUsersResponse } from './types/QueryUsers.types';
import { QUERY_USERS_MAX_TAKE, QUERY_USERS_REQUEST_PER_SECOND } from './constants/Users.constants';

/**
 * Represents a utility class for managing and querying user data.
 */
export class UsersUtils {
  /**
   * A cached promise that resolves to an array of users.
   * This cache is used to avoid redundant user data fetches.
   */
  private static _usersCache: Promise<User[]> | null = null;
  /**
   * A cache that stores a promise resolving to a map of user IDs to user names.   
   */
  private static _usersMapCache: Promise<Map<string, string>> | null = null;

  
  /**
   * Retrieves the cached promise for the list of users.
   * If the cache is not initialized, it triggers the loading of users.
   */
  public get getUsers(): Promise<User[]> {
    return UsersUtils._usersCache ?? this.loadUsers();
  }

  constructor(readonly instanceSettings: DataSourceInstanceSettings, readonly backendSrv: BackendSrv) {}

  /**
   * Retrieves the cached promise for the map of user IDs to full names.
   * If the cache is not initialized, it generates the map from the user list.
   */
  public async getusersMap(): Promise<Map<string, string>> {
    if(!UsersUtils._usersMapCache) {
      const users = await this.getUsers;
      const userMap = new Map<string, string>();
      users.forEach(user => {
        const fullName = UsersUtils.getUserFullName(user);
        userMap.set(user.id, fullName);
      });
      UsersUtils._usersMapCache = Promise.resolve(userMap);
    };
    return UsersUtils._usersMapCache;
  }

  /**
   * Generates the full name of a user by combining their first and last names.
   * @param user - The user object.
   * @returns The full name of the user.
   */
  public static getUserFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Generates a string containing the user's full name and email address.
   * @param user - The user object.
   * @returns A string in the format "FirstName LastName (Email)".
   */
  public static getUserNameAndEmail(user: User): string {
    return `${user?.firstName ?? ''} ${user?.lastName ?? ''} (${user?.email ?? ''})`;
  }

  /**
   * Loads the list of users, utilizing a cache to avoid redundant queries.
   * In case of an error during the query, an empty array is returned, and the cache is cleared.
   */
  private async loadUsers(): Promise<User[]> {
    if (UsersUtils._usersCache) {
        return UsersUtils._usersCache;
    }
    try {
      const users = await this.queryUsersInBatches()
      UsersUtils._usersCache = Promise.resolve(users.users);
      return users.users;
    } catch (error) {
        console.error('An error occurred while querying users:', error);
        UsersUtils._usersCache = null;
        return [];
    }
  }

  /**
   * Queries users in batches to retrieve user data from the backend.
   * This method handles pagination and ensures all users are fetched.
   * @returns A promise that resolves to the complete user query response.
   */
  private async queryUsersInBatches(): Promise<QueryUsersResponse> {
    const queryRecord = async (take: number, token?: string | null): Promise<QueryResponse<User>> => {
      const response = await this.queryUsers({
        take,
        continuationToken: token ?? undefined,
      });

      return {
        data: response.users,
        continuationToken: response.continuationToken,
      };
    };

    const batchQueryConfig = {
      maxTakePerRequest: QUERY_USERS_MAX_TAKE,
      requestsPerSecond: QUERY_USERS_REQUEST_PER_SECOND,
    };

    const response = await queryUntilComplete(queryRecord, batchQueryConfig);
    return {
      users: response.data,
      continuationToken: response.continuationToken ?? undefined,
    };
  }

  /**
   * Sends a query request to retrieve user data from the backend.
   * @param body - The request body for querying users.
   * @returns A promise that resolves to the user query response.
   */
  private queryUsers(body: QueryUsersRequest): Promise<QueryUsersResponse> {
    return this.backendSrv.post<QueryUsersResponse>(`${this.instanceSettings.url}/niuser/v1/users/query`, body);
  }
}
