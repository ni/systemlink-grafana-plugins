import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import _ from 'lodash';
import {
  createFetchError,
  createFetchResponse,
  defaultQueryOptions,
  getQueryBuilder,
  mockTimers,
  requestMatching,
  setupDataSource,
} from 'test/fixtures';
import { WorkspaceDataSource } from './WorkspaceDataSource';
import { ArrayVector } from '@grafana/data';
import { WorkspaceQuery } from './types';

let ds: WorkspaceDataSource, backendSrv: MockProxy<BackendSrv>;

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(WorkspaceDataSource);
});

const buildQuery = getQueryBuilder<WorkspaceQuery>()({});
mockTimers();

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niuser/v1/workspaces' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/niuser/v1/workspaces' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
});

describe('queries', () => {
  test('returns all workspaces', async () => {
    const result = await ds.query(buildQuery({}));

    expect(result.data[0]).toHaveProperty('fields', [
      { config: {}, name: 'ID', type: 'number', values: new ArrayVector(['1', '2']) },
      { config: {}, name: 'Name', type: 'string', values: new ArrayVector(['Default workspace', 'Other workspace']) }
    ]);
  });

  test('returns expected field names in query variable editor', async () => {
    const queryOptions = defaultQueryOptions;
    queryOptions.app = 'dashboard';
    const result = await ds.query(buildQuery({ ...queryOptions } as Partial<WorkspaceQuery>));

    expect(result.data[0]).toHaveProperty('fields', [
      { config: {}, name: 'value', type: 'number', values: new ArrayVector(['1', '2']) },
      { config: {}, name: 'text', type: 'string', values: new ArrayVector(['Default workspace', 'Other workspace']) }
    ]);
  });
});
