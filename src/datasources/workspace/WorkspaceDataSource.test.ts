import { BackendSrv } from '@grafana/runtime';
import { MockProxy } from 'jest-mock-extended';
import _ from 'lodash';
import {
  createFetchError,
  createFetchResponse,
  requestMatching,
  setupDataSource,
} from 'test/fixtures';
import { WorkspaceDataSource } from './WorkspaceDataSource';

let ds: WorkspaceDataSource, backendSrv: MockProxy<BackendSrv>;

beforeEach(() => {
  [ds, backendSrv] = setupDataSource(WorkspaceDataSource);
});

fdescribe('testDatasource', () => {
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
