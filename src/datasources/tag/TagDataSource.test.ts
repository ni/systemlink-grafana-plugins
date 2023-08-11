import { MockProxy } from 'jest-mock-extended';
import { TagDataSource } from './TagDataSource';
import { createDataSource, createFetchError } from 'test/fixtures';
import { BackendSrv } from '@grafana/runtime';

let ds: TagDataSource, backendSrv: MockProxy<BackendSrv>;

beforeEach(() => {
  [ds, backendSrv] = createDataSource(TagDataSource);
});

describe('testDatasource', () => {
  test('returns success', async () => {
    // Given - data source configured correctly
    backendSrv.get.calledWith('/nitag/v2/tags-count').mockResolvedValue(25);

    // When - user tests connection
    const result = await ds.testDatasource();

    // Then - successful message
    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.get.calledWith('/nitag/v2/tags-count').mockRejectedValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
});
