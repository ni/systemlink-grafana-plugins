import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import _ from 'lodash';
import {
  createFetchError,
  createFetchResponse,
  getQueryBuilder,
  requestMatching,
  setupDataSource,
} from 'test/fixtures';
import { WorkspaceDataSource } from './WorkspaceDataSource';
import { WorkspaceQuery } from './types';

let ds: WorkspaceDataSource, backendSrv: MockProxy<BackendSrv>;

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(WorkspaceDataSource);
});

const buildQuery = getQueryBuilder<WorkspaceQuery>()({});

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
      { name: 'name', values: ['Default workspace', 'Other workspace'] }
    ]);
  });

  test('metricFindQuery returns all workspaces', async () => {
    const result = await ds.metricFindQuery();

    expect(result).toEqual([
      { value: '1', text: 'Default workspace' },
      { value: '2', text: 'Other workspace' }
    ]);
  });
});
