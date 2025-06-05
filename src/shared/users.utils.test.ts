import { UsersUtils } from './users.utils';
import { BackendSrv } from '@grafana/runtime';
import { DataSourceInstanceSettings } from '@grafana/data';
import { QUERY_USERS_MAX_TAKE, QUERY_USERS_REQUEST_PER_SECOND } from './constants/Users.constants';
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

describe('Users', () => {
  let users: UsersUtils;

  beforeEach(() => {
    users = new UsersUtils(mockInstanceSettings, mockBackendSrv);
  });

  describe('users', () => {
    it('should handle errors when fetching users', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (queryUntilComplete as jest.Mock).mockImplementationOnce(() => {
        return Promise.reject(new Error('Failed to fetch users'));
      });

      const result = await users.getUsers;

      expect(console.error).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('An error occurred while querying users:', expect.any(Error));
      expect(result).toEqual([]);
    });
    
    it('should fetch and cache users', async () => {
      const result = await users.getUsers;

      expect(result).toEqual(mockUsers);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
      expect(queryUntilComplete).toHaveBeenCalledWith(expect.any(Function), {
        maxTakePerRequest: QUERY_USERS_MAX_TAKE,
        requestsPerSecond: QUERY_USERS_REQUEST_PER_SECOND,
      });

      const cachedUsers = await users.getUsers;
      expect(cachedUsers).toEqual(mockUsers);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('usersMap', () => {
    it('should generate a map of user IDs to full names', async () => {
      const userMap = await users.getusersMap();

      expect(userMap.get('1')).toBe('John Doe');
      expect(userMap.get('2')).toBe('Jane Smith');
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
