import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv } from '@grafana/runtime';
import { post, queryUntilComplete } from 'core/utils';
import { QueryResponse } from 'core/types';
import { User, QueryUsersRequest, QueryUsersResponse } from './types/QueryUsers.types';
import { QUERY_USERS_MAX_TAKE, QUERY_USERS_REQUEST_PER_SECOND } from './constants/Users.constants';

/**
 * Represents a utility class for managing and querying user data.
 */
export class UsersUtils {
  /**
   * A cached promise that resolves to an map of users.
   * This cache is used to avoid redundant user data fetches.
   */
  private static _usersCache?: Promise<Map<string, User>>;

  
  /**
   * Retrieves the cached promise for the list of users.
   * If the cache is not initialized, it triggers the loading of users.
   * 
   * Note: This implementation corresponds to the SLE users service implementation.
   * Ensure that any changes made here are kept in sync with the SLE service implementation:
   * [Link to SLE service implementation] (https://dev.azure.com/ni/DevCentral/_git/Skyline?path=/Web/Workspaces/SystemLinkShared/projects/systemlink-lib-angular/src/services/sl-users-service.ts&version=GBusers/jmeyer/grafana-app-update&_a=contents)
   */
  public async getUsers(): Promise<Map<string, User>> {
    if (!UsersUtils._usersCache) {
      UsersUtils._usersCache = this.loadUsers();
    }
    return UsersUtils._usersCache;
  }

  constructor(readonly instanceSettings: DataSourceInstanceSettings, readonly backendSrv: BackendSrv) {}

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
   * In case of an error during the query, an empty map is returned, and the cache is cleared.
   */
  private async loadUsers(): Promise<Map<string, User>> {
    const users = await this.queryUsersInBatches()
    const usersMap = new Map<string, User>();
    users.users.forEach((user) => {
      usersMap.set(user.id, user);
    });
    return usersMap;
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
    return post<QueryUsersResponse>(
      this.backendSrv,
      `${this.instanceSettings.url}/niuser/v1/users/query`,
      body,
      { showErrorAlert: false } // suppress default error alert since we handle errors manually
    );
  }
}
