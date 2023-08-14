import { MockProxy } from 'jest-mock-extended';
import { TagDataSource } from './TagDataSource';
import { createQueryRequest, createDataSource, createFetchError } from 'test/fixtures';
import { BackendSrv } from '@grafana/runtime';
import { TagsWithValues } from './types';

let ds: TagDataSource, backendSrv: MockProxy<BackendSrv>;

beforeEach(() => {
  [ds, backendSrv] = createDataSource(TagDataSource);
});

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.get.calledWith('/nitag/v2/tags-count').mockResolvedValue(25);

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.get.calledWith('/nitag/v2/tags-count').mockRejectedValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
});

describe('queries', () => {
  test('tag current value', async () => {
    backendSrv.post
      .calledWith('/nitag/v2/query-tags-with-values', expect.objectContaining({ filter: 'path = "my.tag"' }))
      .mockResolvedValue(createQueryTagsResponse('my.tag', '3.14'));

    const result = await ds.query(createQueryRequest({ path: 'my.tag' }));

    expect(result.data).toEqual([
      {
        fields: [{ name: 'value', values: ['3.14'] }],
        name: 'my.tag',
        refId: 'A',
      },
    ]);
  });

  test('uses displayName property', async () => {
    backendSrv.post.mockResolvedValue(createQueryTagsResponse('my.tag', '3.14', 'My cool tag'));

    const result = await ds.query(createQueryRequest({ path: 'my.tag' }));

    expect(result.data[0]).toEqual(expect.objectContaining({ name: 'My cool tag' }));
  });

  test('multiple targets - skips invalid queries', async () => {
    backendSrv.post
      .mockResolvedValueOnce(createQueryTagsResponse('my.tag1', '3.14'))
      .mockResolvedValueOnce(createQueryTagsResponse('my.tag2', 'foo'));

    const result = await ds.query(createQueryRequest({ path: 'my.tag1' }, { path: '' }, { path: 'my.tag2' }));

    expect(backendSrv.post.mock.calls[0][1]).toHaveProperty('filter', 'path = "my.tag1"');
    expect(backendSrv.post.mock.calls[1][1]).toHaveProperty('filter', 'path = "my.tag2"');
    expect(result.data).toEqual([
      {
        fields: [{ name: 'value', values: ['3.14'] }],
        name: 'my.tag1',
        refId: 'A',
      },
      {
        fields: [{ name: 'value', values: ['foo'] }],
        name: 'my.tag2',
        refId: 'C',
      },
    ]);
  });

  test('throw when no tags matched', async () => {
    backendSrv.post.mockResolvedValue({ tagsWithValues: [] });

    await expect(ds.query(createQueryRequest({ path: 'my.tag' }))).rejects.toThrow('my.tag');
  });
});

function createQueryTagsResponse(path: string, value: string, displayName?: string): TagsWithValues {
  return { tagsWithValues: [{ current: { value: { value } }, tag: { path, properties: { displayName } } }] };
}
