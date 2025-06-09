import { UsersUtils } from './users.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { QUERY_USERS_MAX_TAKE, QUERY_USERS_REQUEST_PER_SECOND } from './constants/Users.constants';
import { User } from './types/QueryUsers.types';
const queryUntilComplete = require('core/utils').queryUntilComplete;

jest.mock('core/utils', () => ({
  queryUntilComplete: jest.fn(() => {
    return Promise.resolve({ data: mockUsers });
  }),
}));
const mockUsers = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    properties: {},
    keywords: [],
    created: '',
    updated: '',
    orgId: '',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    id: '2',
    email: '',
    properties: {},
    keywords: [],
    created: '',
    updated: '',
    orgId: '',
  },
];
const mockBackendSrv: BackendSrv = {
  post: jest.fn(),
} as unknown as BackendSrv;

const mockInstanceSettings: DataSourceInstanceSettings = {
  url: 'http://mock-url',
} as DataSourceInstanceSettings;

describe('UsersUtils', () => {
  let users: UsersUtils;

  beforeEach(() => {
    users = new UsersUtils(mockInstanceSettings, mockBackendSrv);
  });

  describe('getUsers', () => {
    it('should handle errors when fetching users', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (queryUntilComplete as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(new Error('Failed to fetch users'));
      });

      const result = await users.getUsers();

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('An error occurred while querying users:', expect.any(Error));
      expect(result).toEqual(new Map<string, UsersUtils>());
    });
    
    it('should fetch and cache users', async () => {
      const result = await users.getUsers();
      const expectedUsersMap = new Map<string, User>([
        [mockUsers[0].id, mockUsers[0]],
        [mockUsers[1].id, mockUsers[1]],
      ]);

      expect(result).toEqual(expectedUsersMap);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
      expect(queryUntilComplete).toHaveBeenCalledWith(expect.any(Function), {
        maxTakePerRequest: QUERY_USERS_MAX_TAKE,
        requestsPerSecond: QUERY_USERS_REQUEST_PER_SECOND,
      });

      const cachedUsers = await users.getUsers();
      expect(cachedUsers).toEqual(expectedUsersMap);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserFullName', () => {
    it('should return the full name of a user', () => {
      const fullName = UsersUtils.getUserFullName(mockUsers[0]);
      expect(fullName).toBe('John Doe');
    });
  });

  describe('getUserNameAndEmail', () => {
    it('should return the full name and email of a user', () => {
      const result = UsersUtils.getUserNameAndEmail(mockUsers[0]);
      expect(result).toBe('John Doe (john.doe@example.com)');
    });
  });
});
