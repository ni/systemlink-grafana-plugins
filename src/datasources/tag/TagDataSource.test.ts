import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DeepPartial } from 'core/types';
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
import { TagDataSource } from './TagDataSource';
import { TagQuery, TagQueryType, TagWithValue } from './types';

let ds: TagDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

beforeEach(() => {
  jest.clearAllMocks();
  [ds, backendSrv, templateSrv] = setupDataSource(TagDataSource);
});

const buildQuery = getQueryBuilder<TagQuery>()({ type: TagQueryType.Current, workspace: '' });
mockTimers();

describe('testDatasource', () => {
  test('returns success', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/tags-count' }))
      .mockReturnValue(createFetchResponse(25));

    const result = await ds.testDatasource();

    expect(result.status).toEqual('success');
  });

  test('bubbles up exception', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/tags-count' }))
      .mockReturnValue(createFetchError(400));

    await expect(ds.testDatasource()).rejects.toHaveProperty('status', 400);
  });
});

describe('queries', () => {
  test('tag current value', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: 'path = "my.tag"' } }))
      .mockReturnValue(createQueryTagsResponse());

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data).toEqual([
      {
        fields: [{ name: 'my.tag', values: [3.14] }],
        refId: 'A',
      },
    ]);
  });

  test('applies query defaults when missing fields', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse());

    const result = await ds.query({ ...defaultQueryOptions, targets: [{ path: 'my.tag' } as TagQuery] });

    expect(result.data[0]).toHaveProperty('fields', [{ name: 'my.tag', values: [3.14] }]);
  });

  test('uses displayName property', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse({ properties: { displayName: 'My cool tag' } }));

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data[0].fields[0]).toHaveProperty('name', 'My cool tag');
  });

  test('handles null tag properties', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse({ properties: null }));

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data[0]).toHaveProperty('fields', [{ name: 'my.tag', values: [3.14] }]);
  });

  test('handles tag with no current value', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse({}, null));

    const result = await ds.query(buildQuery({ path: 'my.tag' }));

    expect(result.data[0]).toHaveProperty('fields', [{ name: 'my.tag', values: [] }]);
  });

  test('multiple targets - skips invalid queries', async () => {
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: 'path = "my.tag1"' } }))
      .mockReturnValue(createQueryTagsResponse({ path: 'my.tag1' }));
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: 'path = "my.tag2"' } }))
      .mockReturnValue(createQueryTagsResponse({ path: 'my.tag2' }, { value: { value: '41.3' } }));

    const result = await ds.query(buildQuery({ path: 'my.tag1' }, { path: '' }, { path: 'my.tag2' }));

    expect(result.data).toEqual([
      {
        fields: [{ name: 'my.tag1', values: [3.14] }],
        refId: 'A',
      },
      {
        fields: [{ name: 'my.tag2', values: [41.3] }],
        refId: 'C',
      },
    ]);
  });

  test('current value for all data types', async () => {
    backendSrv.fetch
      .mockReturnValueOnce(createQueryTagsResponse({ datatype: 'INT', path: 'tag1' }, { value: { value: '3' } }))
      .mockReturnValueOnce(createQueryTagsResponse({ datatype: 'DOUBLE', path: 'tag2' }, { value: { value: '3.3' } }))
      .mockReturnValueOnce(createQueryTagsResponse({ datatype: 'STRING', path: 'tag3' }, { value: { value: 'foo' } }))
      .mockReturnValueOnce(createQueryTagsResponse({ datatype: 'BOOLEAN', path: 'tag4' }, { value: { value: 'True' } }))
      .mockReturnValueOnce(
        createQueryTagsResponse({ datatype: 'U_INT64', path: 'tag5' }, { value: { value: '2147483648' } })
      );

    const result = await ds.query(
      buildQuery({ path: 'tag1' }, { path: 'tag2' }, { path: 'tag3' }, { path: 'tag4' }, { path: 'tag5' })
    );

    expect(result.data.map(frames => frames.fields[0])).toEqual([
      { name: 'tag1', values: [3] },
      { name: 'tag2', values: [3.3] },
      { name: 'tag3', values: ['foo'] },
      { name: 'tag4', values: ['True'] },
      { name: 'tag5', values: [2147483648] },
    ]);
  });

  test('throw when no tags matched', async () => {
    backendSrv.fetch.mockReturnValue(createFetchResponse({ tagsWithValues: [] }));

    await expect(ds.query(buildQuery({ path: 'my.tag' }))).rejects.toThrow("No tags matched the path 'my.tag'");
  });

  test('numeric tag history', async () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: 'path = "my.tag"' } }))
      .mockReturnValue(createQueryTagsResponse());

    backendSrv.fetch
      .calledWith(
        requestMatching({
          url: '/nitaghistorian/v2/tags/query-decimated-history',
          data: {
            paths: ['my.tag'],
            workspace: '1',
            startTime: queryRequest.range.from.toISOString(),
            endTime: queryRequest.range.to.toISOString(),
            decimation: 300,
          },
        })
      )
      .mockReturnValue(
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
          { name: 'my.tag', values: [1, 2] },
        ],
        refId: 'A',
      },
    ]);
  });

  test('string tag history', async () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValueOnce(
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
          { name: 'my.tag', values: ['3.14', 'foo'] },
        ],
        refId: 'A',
      },
    ]);
  });

  test('decimation parameter does not go above 1000', async () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });
    queryRequest.maxDataPoints = 1500;

    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());

    backendSrv.fetch.mockReturnValueOnce(
      createTagHistoryResponse('my.tag', 'INT', [
        { timestamp: '2023-01-01T00:00:00Z', value: '1' },
        { timestamp: '2023-01-01T00:01:00Z', value: '2' },
      ])
    );

    await ds.query(queryRequest);

    expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('decimation', 1000);
  });

  test('replaces tag path with variable', async () => {
    templateSrv.replace.calledWith('$my_variable').mockReturnValue('my.tag');
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: 'path = "my.tag"' } }))
      .mockReturnValue(createQueryTagsResponse());

    const result = await ds.query(buildQuery({ type: TagQueryType.Current, path: '$my_variable' }));

    expect(result.data[0].fields[0]).toHaveProperty('name', 'my.tag');
  });

  test('filters by workspace if provided', async () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse({ workspace_id: '2' }));
    backendSrv.fetch.mockReturnValueOnce(createTagHistoryResponse('my.tag', 'DOUBLE', []));

    await ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag', workspace: '2' }));

    expect(backendSrv.fetch.mock.calls[0][0].data).toHaveProperty('filter', 'path = "my.tag" && workspace = "2"');
    expect(backendSrv.fetch.mock.calls[1][0].data).toHaveProperty('workspace', '2');
  });

  test('retries failed request with 429 status', async () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValueOnce(createFetchError(429));
    backendSrv.fetch.mockReturnValueOnce(createTagHistoryResponse('my.tag', 'INT', []));

    await ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' }));

    expect(backendSrv.fetch).toHaveBeenCalledTimes(3);
  });

  test('retries a maximum of three times', async () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValue(createFetchError(429));

    await expect(ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' }))).rejects.toHaveProperty(
      'status',
      429
    );

    expect(backendSrv.fetch).toHaveBeenCalledTimes(5);
  });

  test('attempts to replace variables in history query', async () => {
    const workspaceVariable = '$workspace';
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');
  
    await ds.query(buildQuery({ path: 'my.tag', workspace: workspaceVariable }));
  
    expect(templateSrv.replace).toHaveBeenCalledTimes(2);
    expect(templateSrv.replace.mock.calls[1][0]).toBe(workspaceVariable);
  });
});

function createQueryTagsResponse(
  tag?: DeepPartial<TagWithValue['tag']>,
  current?: DeepPartial<TagWithValue['current']>
) {
  return createFetchResponse({
    tagsWithValues: [
      _.defaultsDeep(
        { tag, current },
        {
          current: { value: { value: '3.14' } },
          tag: { datatype: 'DOUBLE', path: 'my.tag', properties: {}, workspace_id: '1' },
        }
      ),
    ],
  });
}

function createTagHistoryResponse(path: string, type: string, values: Array<{ timestamp: string; value: string }>) {
  return createFetchResponse({ results: { [path]: { type, values } } });
}
