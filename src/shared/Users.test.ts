import { Users } from './Users';
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
  let users: Users;

  beforeEach(() => {
    jest.clearAllMocks();
    users = new Users(mockInstanceSettings, mockBackendSrv);
  });

  describe('getUserFullName', () => {
    it('should return the full name of a user', () => {
      const fullName = Users.getUserFullName(mockUsers[0]);
      expect(fullName).toBe('John Doe');
    });
  });

  describe('getUserNameAndEmail', () => {
    it('should return the full name and email of a user', () => {
      const result = Users.getUserNameAndEmail(mockUsers[0]);
      expect(result).toBe('John Doe (john.doe@example.com)');
    });
  });

  describe('usersCache', () => {
    it('should fetch and cache users', async () => {
      const result = await users.usersCache;

      expect(result).toEqual(mockUsers);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
      expect(queryUntilComplete).toHaveBeenCalledWith(expect.any(Function), {
        maxTakePerRequest: QUERY_USERS_MAX_TAKE,
        requestsPerSecond: QUERY_USERS_REQUEST_PER_SECOND,
      });
    });

    it('should return cached users on subsequent calls', async () => {
      await users.usersCache; // First call to populate cache
      const cachedUsers = await users.usersCache;

      expect(cachedUsers).toEqual(mockUsers);
      expect(queryUntilComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('usersMapCache', () => {
    it('should generate a map of user IDs to full names', async () => {
      const userMap = await users.usersMapCache;

      expect(userMap.get('1')).toBe('John Doe');
      expect(userMap.get('2')).toBe('Jane Smith');
    });

    it('should return cached map', async () => {
      await users.usersMapCache; // First call to populate cache
      const userMap = await users.usersMapCache;

      expect(userMap.get('1')).toBe('John Doe');
      expect(userMap.get('2')).toBe('Jane Smith');
    });
  });
});
