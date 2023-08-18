import { MockProxy } from 'jest-mock-extended';
import { TagDataSource } from './TagDataSource';
import { setupDataSource, createFetchError, getQueryBuilder, defaultQueryOptions } from 'test/fixtures';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { TagHistoryResponse, TagQuery, TagQueryType, TagsWithValues } from './types';

let ds: TagDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(TagDataSource);
});

const buildQuery = getQueryBuilder<TagQuery>()({ type: TagQueryType.Current, workspace: '' });

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

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data).toEqual([
      {
        fields: [{ name: 'value', values: ['3.14'] }],
        name: 'my.tag',
        refId: 'A',
      },
    ]);
  });

  test('applies query defaults when missing fields', async () => {
    backendSrv.post.mockResolvedValue(createQueryTagsResponse('my.tag', '3.14'));

    const result = await ds.query({ ...defaultQueryOptions, targets: [{ path: 'my.tag'} as TagQuery]});

    expect(result.data[0]).toHaveProperty('fields', [{ name: 'value', values: ['3.14'] }]);
  });

  test('uses displayName property', async () => {
    backendSrv.post.mockResolvedValue(createQueryTagsResponse('my.tag', '3.14', 'My cool tag'));

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data[0]).toEqual(expect.objectContaining({ name: 'My cool tag' }));
  });

  test('multiple targets - skips invalid queries', async () => {
    backendSrv.post
      .mockResolvedValueOnce(createQueryTagsResponse('my.tag1', '3.14'))
      .mockResolvedValueOnce(createQueryTagsResponse('my.tag2', 'foo'));

    const result = await ds.query(buildQuery({ path: 'my.tag1' }, { path: '' }, { path: 'my.tag2' }));

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

    await expect(ds.query(buildQuery({ path: 'my.tag' }))).rejects.toThrow(
      'my.tag'
    );
  });

  test('numeric tag history', async () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });

    backendSrv.post
      .calledWith('/nitag/v2/query-tags-with-values', expect.objectContaining({ filter: 'path = "my.tag"' }))
      .mockResolvedValue(createQueryTagsResponse('my.tag', '3.14'));

    backendSrv.post
      .calledWith(
        '/nitaghistorian/v2/tags/query-decimated-history',
        expect.objectContaining({
          paths: ['my.tag'],
          workspace: '1',
          startTime: queryRequest.range.from.toISOString(),
          endTime: queryRequest.range.to.toISOString(),
          decimation: 300,
        })
      )
      .mockResolvedValue(
        createTagHistoryResponse('my.tag', 'DOUBLE', [
          { timestamp: '2023-01-01T00:00:00Z', value: '1' },
          { timestamp: '2023-01-01T00:01:00Z', value: '2' },
        ])
      );

    const result = await ds.query(queryRequest);

    expect(result.data).toEqual([
      {
        fields: [
          { name: 'time', values: [1672531200000, 1672531260000] },
          { name: 'value', values: [1, 2] },
        ],
        name: 'my.tag',
        refId: 'A',
      },
    ]);
  });

  test('string tag history', async () => {
    backendSrv.post.mockResolvedValueOnce(createQueryTagsResponse('my.tag', 'foo'));
    backendSrv.post.mockResolvedValueOnce(
      createTagHistoryResponse('my.tag', 'STRING', [
        { timestamp: '2023-01-01T00:00:00Z', value: '3.14' },
        { timestamp: '2023-01-01T00:01:00Z', value: 'foo' },
      ])
    );

    const result = await ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' }));

    expect(result.data).toEqual([
      {
        fields: [
          { name: 'time', values: [1672531200000, 1672531260000] },
          { name: 'value', values: ['3.14', 'foo'] },
        ],
        name: 'my.tag',
        refId: 'A',
      },
    ]);
  });

  test('decimation parameter does not go above 1000', async () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });
    queryRequest.maxDataPoints = 1500;

    backendSrv.post.mockResolvedValueOnce(createQueryTagsResponse('my.tag', '3'));

    backendSrv.post.mockResolvedValueOnce(
      createTagHistoryResponse('my.tag', 'INT', [
        { timestamp: '2023-01-01T00:00:00Z', value: '1' },
        { timestamp: '2023-01-01T00:01:00Z', value: '2' },
      ])
    );

    await ds.query(queryRequest);

    expect(backendSrv.post.mock.lastCall?.[1]).toHaveProperty('decimation', 1000);
  });

  test('replaces tag path with variable', async () => {
    templateSrv.replace.calledWith('$my_variable').mockReturnValue('my.tag');
    backendSrv.post
      .calledWith('/nitag/v2/query-tags-with-values', expect.objectContaining({ filter: 'path = "my.tag"' }))
      .mockResolvedValue(createQueryTagsResponse('my.tag', '3.14'));

    const result = await ds.query(buildQuery({ type: TagQueryType.Current, path: '$my_variable' }));

    expect(result.data[0]).toHaveProperty('name', 'my.tag');
  });

  test('filters by workspace if provided', async () => {
    backendSrv.post.mockResolvedValueOnce(createQueryTagsResponse('my.tag', '3.14', undefined, '2'));
    backendSrv.post.mockResolvedValueOnce(createTagHistoryResponse('my.tag', 'DOUBLE', []));

    await ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag', workspace: '2' }));

    expect(backendSrv.post.mock.calls[0][1]).toHaveProperty('filter', 'path = "my.tag" && workspace = "2"');
    expect(backendSrv.post.mock.calls[1][1]).toHaveProperty('workspace', '2');
  });
});

function createQueryTagsResponse(path: string, value: string, displayName?: string, workspace_id = '1'): TagsWithValues {
  return {
    tagsWithValues: [
      {
        current: { value: { value } },
        tag: { path, properties: { displayName }, workspace_id },
      },
    ],
  };
}

function createTagHistoryResponse(
  path: string,
  type: string,
  values: Array<{ timestamp: string; value: string }>
): TagHistoryResponse {
  return { results: { [path]: { type, values } } };
}
