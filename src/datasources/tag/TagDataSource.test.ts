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
import { TagQuery, TagQueryType, TagWithValue, TagDataType, TagDataSourceOptions } from './types';

let ds: TagDataSource, backendSrv: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;
let tagOptions: TagDataSourceOptions = {
  featureToggles: {
    parseMultiSelectValues: false,
  }
}

beforeEach(() => {
  [ds, backendSrv, templateSrv] = setupDataSource(TagDataSource, () => tagOptions);
});

const buildQuery = getQueryBuilder<TagQuery>()({ type: TagQueryType.Current, workspace: '', properties: false });
mockTimers();


describe('testDatasource', () => {
  beforeEach(() => {
    tagOptions.featureToggles.parseMultiSelectValues = false;
  });

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

    await expect(ds.testDatasource()).rejects.toThrow('Request to url "/nitag/v2/tags-count" failed with status code: 400. Error message: "Error"');
  });
});

describe('queries', () => {
  test('tag current value', () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('applies query defaults when missing fields', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query({ ...defaultQueryOptions, targets: [{ path: 'my.tag', refId: 'A' } as TagQuery] });
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('uses displayName property', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{ tag: { properties: { displayName: 'My cool tag' } } }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('multiple current values with properties', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([
      { tag: { path: 'my.1.tag', properties: { unit: 'A' } } },
      { tag: { path: 'my.2.tag', properties: { unit: 'A' } }, current: { value: { value: '41.3' } } }
    ]));

    const response$ = ds.query(buildQuery({ path: 'my.*.tag', properties: true }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('multiple current values with different properties', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([
      { tag: { path: 'my.1.tag', properties: { upperCriticalThreshold: '15' } } },
      { tag: { path: 'my.2.tag', properties: { unit: 'A' } }, current: { value: { value: '41.3' } } }
    ]));

    const response$ = ds.query(buildQuery({ path: 'my.*.tag', properties: true }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('handles null tag properties', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{ tag: { properties: null } }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('handles tag with no current value', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{ tag: {}, current: null }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('multiple targets - skips invalid queries', () => {
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: '(path = "my.tag1")' } }))
      .mockReturnValue(createQueryTagsResponse([{ tag: { path: 'my.tag1' } }]));
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: '(path = "my.tag2")' } }))
      .mockReturnValue(createQueryTagsResponse([{ tag: { path: 'my.tag2' }, current: { value: { value: '41.3' } } }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag1' }, { path: '' }, { path: 'my.tag2' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('current value for all data types', () => {
    backendSrv.fetch
      .mockReturnValueOnce(createQueryTagsResponse([{
        tag: { type: TagDataType.INT, path: 'tag1' },
        current: { value: { value: '3' } }
      }]))
      .mockReturnValueOnce(createQueryTagsResponse([{
        tag: { type: TagDataType.DOUBLE, path: 'tag2' },
        current: { value: { value: '3.3' } }
      }]))
      .mockReturnValueOnce(createQueryTagsResponse([{
        tag: { type: TagDataType.STRING, path: 'tag3' },
        current: { value: { value: 'foo' } }
      }]))
      .mockReturnValueOnce(createQueryTagsResponse([{
        tag: { type: TagDataType.BOOLEAN, path: 'tag4' },
        current: { value: { value: 'True' } }
      }]))
      .mockReturnValueOnce(
        createQueryTagsResponse([{
          tag: { type: TagDataType.U_INT64, path: 'tag5' },
          current: { value: { value: '2147483648' } }
        }])
      );

    const response$ = ds.query(
      buildQuery({ path: 'tag1' }, { path: 'tag2' }, { path: 'tag3' }, { path: 'tag4' }, { path: 'tag5' })
    );
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('throw when no tags matched', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([]));

    await expect(
      new Promise((resolve, reject) => {
        const response$ = ds.query(buildQuery({ path: 'my.tag' }));
        response$.subscribe({
          next: () => reject('Should not have reached here'),
          error: error => resolve(error),
        });
      })
    ).resolves.toThrow("No tags matched the path 'my.tag'");
  });

  test('numeric tag history', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
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
        createTagHistoryResponse([
          {
            path: 'my.tag',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ]
          }
        ])
      );

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('numeric multiple tags history', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag.*' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag.*")' } }))
      .mockReturnValue(createQueryTagsResponse([
        { tag: { path: 'my.tag.1' } },
        { tag: { path: 'my.tag.2' } },
        { tag: { path: 'my.tag.3' } }
      ]));

    backendSrv.fetch
      .calledWith(
        requestMatching({
          url: '/nitaghistorian/v2/tags/query-decimated-history',
          data: {
            paths: ['my.tag.1', 'my.tag.2', 'my.tag.3'],
            workspace: '1',
            startTime: queryRequest.range.from.toISOString(),
            endTime: queryRequest.range.to.toISOString(),
            decimation: 300,
          },
        })
      )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ]
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          },
          {
            path: 'my.tag.3',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '3' },
              { timestamp: '2023-01-01T00:02:00Z', value: '4' },
            ]
          }
        ])
      );

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('string tag history', () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValueOnce(
      createTagHistoryResponse([
        {
          path: 'my.tag',
          type: TagDataType.STRING,
          values: [
            { timestamp: '2023-01-01T00:00:00Z', value: '3.14' },
            { timestamp: '2023-01-01T00:01:00Z', value: 'foo' },
          ]
        }
      ])
    );

    const response$ = ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('add workspace prefix only when a tag with the same path exists in multiple workspaces', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag.*' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag.*")' } }))
      .mockReturnValue(createQueryTagsResponse([
        { tag: { path: 'my.tag.1', workspace: '1' } },
        { tag: { path: 'my.tag.2', workspace: '1' } },
        { tag: { path: 'my.tag.1', workspace: '2' } },
        { tag: { path: 'my.tag.2', workspace: '2' } },
        { tag: { path: 'my.tag.3', workspace: '2' } },
        { tag: { path: 'my.tag.4', workspace: '2' } }
      ]));

    backendSrv.fetch
      .calledWith(
        requestMatching({
          url: '/nitaghistorian/v2/tags/query-decimated-history',
          data: {
            paths: ['my.tag.1', 'my.tag.2'],
            workspace: '1',
            startTime: queryRequest.range.from.toISOString(),
            endTime: queryRequest.range.to.toISOString(),
            decimation: 300,
          },
        })
      )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ],
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          }
        ])
      )

    backendSrv.fetch.calledWith(
      requestMatching({
        url: '/nitaghistorian/v2/tags/query-decimated-history',
        data: {
          paths: ['my.tag.1', 'my.tag.2', 'my.tag.3', 'my.tag.4'],
          workspace: '2',
          startTime: queryRequest.range.from.toISOString(),
          endTime: queryRequest.range.to.toISOString(),
          decimation: 300,
        },
      })
    )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ],
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          },
          {
            path: 'my.tag.3',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '3' },
              { timestamp: '2023-01-01T00:01:00Z', value: '4' },
            ],
          },
          {
            path: 'my.tag.4',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '4' },
              { timestamp: '2023-01-01T00:01:00Z', value: '5' },
            ]
          }
        ])
      )

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('decimation parameter does not go above 1000', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });
    queryRequest.maxDataPoints = 1500;

    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());

    backendSrv.fetch.mockReturnValueOnce(
      createTagHistoryResponse([
        {
          path: 'my.tag',
          type: TagDataType.INT,
          values: [
            { timestamp: '2023-01-01T00:00:00Z', value: '1' },
            { timestamp: '2023-01-01T00:01:00Z', value: '2' },
          ]
        }
      ])
    );

    ds.query(queryRequest).subscribe(() => {
      expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('decimation', 1000);
    });
  });

  test('replaces tag path with variable', () => {
    templateSrv.containsTemplate.calledWith('$my_variable').mockReturnValue(true);
    templateSrv.replace.calledWith('$my_variable').mockReturnValue('my.tag');
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({ type: TagQueryType.Current, path: '$my_variable' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('filters by workspace if provided', () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse([{ tag: { workspace: '2' } }]));
    backendSrv.fetch.mockReturnValueOnce(createTagHistoryResponse([{
      path: 'my.tag',
      type: TagDataType.DOUBLE,
      values: []
    }
    ]));

    ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag', workspace: '2' })).subscribe(() => {
      expect(backendSrv.fetch.mock.calls[0][0].data).toHaveProperty('filter', '(path = "my.tag") && workspace = "2"');
      expect(backendSrv.fetch.mock.calls[1][0].data).toHaveProperty('workspace', '2');
    });
  });

  test('retries failed request with 429 status', () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValueOnce(createFetchError(429));
    backendSrv.fetch.mockReturnValueOnce(createTagHistoryResponse([{
      path: 'my.tag',
      type: TagDataType.INT,
      values: []
    }]));

    ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' })).subscribe(() => {
      expect(backendSrv.fetch).toHaveBeenCalledTimes(3);
    });
  });

  test('retries a maximum of three times', async () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    backendSrv.fetch.mockReturnValue(createFetchError(429));

    await expect(
      new Promise((resolve, reject) => {
        const response$ = ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag' }));
        response$.subscribe({
          next: () => reject('Should not have reached here'),
          error: error => resolve(error),
        });
      })
    ).resolves.toThrow('Request to url "/nitaghistorian/v2/tags/query-decimated-history" failed with status code: 429. Error message: "Error"')

    expect(backendSrv.fetch).toHaveBeenCalledTimes(5);
  });

  test('appends tag properties to query result', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{
      tag: {
        properties: {
          nitagHistoryTTLDays: '7',
          foo: 'bar'
        }
      }
    }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag', properties: true }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('attempts to replace variables in history query', () => {
    const workspaceVariable = '$workspace';
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');

    ds.query(buildQuery({ path: 'my.tag', workspace: workspaceVariable })).subscribe(() => {
      expect(templateSrv.replace).toHaveBeenCalledTimes(1);
      expect(templateSrv.replace.mock.calls[0][0]).toBe(workspaceVariable);
    });
  });

  test('supports legacy tag service property "workspace_id"',  () => {
    backendSrv.fetch
      .mockReturnValueOnce(
        createFetchResponse({
          tagsWithValues: [{ tag: { datatype: 'DOUBLE', path: 'my.tag', workspace_id: '1' } }],
        })
      )
      .mockReturnValueOnce(createTagHistoryResponse([{ path: 'my.tag', type: TagDataType.DOUBLE, values: [] }]));

    ds.query(buildQuery({ path: 'my.tag', type: TagQueryType.History })).subscribe(() => {
      expect(backendSrv.fetch.mock.lastCall?.[0].data).toHaveProperty('workspace', '1');
    });
  });

  test('supports legacy tag service property "datatype"', () => {
    backendSrv.fetch.mockReturnValueOnce(
      createFetchResponse({
        tagsWithValues: [
          {
            current: { value: { value: '3.14' }, timestamp: '2023-10-04T00:00:00.000000Z' },
            tag: { datatype: 'DOUBLE', path: 'my.tag', workspace_id: '1' },
          },
        ],
      })
    );

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });
});

describe('parseMultiSelectValues', () => {
  test('tag current value', () => {
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('handles tag with no current value', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{ tag: {}, current: null }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('multiple targets - skips invalid queries', () => {
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: '(path = "my.tag1")' } }))
      .mockReturnValue(createQueryTagsResponse([{ tag: { path: 'my.tag1' } }]));
    backendSrv.fetch
      .calledWith(requestMatching({ data: { filter: '(path = "my.tag2")' } }))
      .mockReturnValue(createQueryTagsResponse([{ tag: { path: 'my.tag2' }, current: { value: { value: '41.3' } } }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag1' }, { path: '' }, { path: 'my.tag2' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('throw when no tags matched', async () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([]));

    await expect(
      new Promise((resolve, reject) => {
        const response$ = ds.query(buildQuery({ path: 'my.tag' }));
        response$.subscribe({
          next: () => reject('Should not have reached here'),
          error: error => resolve(error),
        });
      })
    ).resolves.toThrow("No tags matched the path 'my.tag'");
  });

  test('numeric tag history', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
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
        createTagHistoryResponse([
          {
            path: 'my.tag',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ]
          }
        ])
      );

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('numeric multiple tags history', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag.*' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag.*")' } }))
      .mockReturnValue(createQueryTagsResponse([
        { tag: { path: 'my.tag.1' } },
        { tag: { path: 'my.tag.2' } },
        { tag: { path: 'my.tag.3' } }
      ]));

    backendSrv.fetch
      .calledWith(
        requestMatching({
          url: '/nitaghistorian/v2/tags/query-decimated-history',
          data: {
            paths: ['my.tag.1', 'my.tag.2', 'my.tag.3'],
            workspace: '1',
            startTime: queryRequest.range.from.toISOString(),
            endTime: queryRequest.range.to.toISOString(),
            decimation: 300,
          },
        })
      )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ]
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          },
          {
            path: 'my.tag.3',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '3' },
              { timestamp: '2023-01-01T00:02:00Z', value: '4' },
            ]
          }
        ])
      );

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('add workspace prefix only when a tag with the same path exists in multiple workspaces', () => {
    const queryRequest = buildQuery({ type: TagQueryType.History, path: 'my.tag.*' });

    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag.*")' } }))
      .mockReturnValue(createQueryTagsResponse([
        { tag: { path: 'my.tag.1', workspace: '1' } },
        { tag: { path: 'my.tag.2', workspace: '1' } },
        { tag: { path: 'my.tag.1', workspace: '2' } },
        { tag: { path: 'my.tag.2', workspace: '2' } },
        { tag: { path: 'my.tag.3', workspace: '2' } },
        { tag: { path: 'my.tag.4', workspace: '2' } }
      ]));

    backendSrv.fetch
      .calledWith(
        requestMatching({
          url: '/nitaghistorian/v2/tags/query-decimated-history',
          data: {
            paths: ['my.tag.1', 'my.tag.2'],
            workspace: '1',
            startTime: queryRequest.range.from.toISOString(),
            endTime: queryRequest.range.to.toISOString(),
            decimation: 300,
          },
        })
      )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ],
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          }
        ])
      )

    backendSrv.fetch.calledWith(
      requestMatching({
        url: '/nitaghistorian/v2/tags/query-decimated-history',
        data: {
          paths: ['my.tag.1', 'my.tag.2', 'my.tag.3', 'my.tag.4'],
          workspace: '2',
          startTime: queryRequest.range.from.toISOString(),
          endTime: queryRequest.range.to.toISOString(),
          decimation: 300,
        },
      })
    )
      .mockReturnValue(
        createTagHistoryResponse([
          {
            path: 'my.tag.1',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '1' },
              { timestamp: '2023-01-01T00:01:00Z', value: '2' },
            ],
          },
          {
            path: 'my.tag.2',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '2' },
              { timestamp: '2023-01-01T00:01:00Z', value: '3' },
            ]
          },
          {
            path: 'my.tag.3',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '3' },
              { timestamp: '2023-01-01T00:01:00Z', value: '4' },
            ],
          },
          {
            path: 'my.tag.4',
            type: TagDataType.DOUBLE,
            values: [
              { timestamp: '2023-01-01T00:00:00Z', value: '4' },
              { timestamp: '2023-01-01T00:01:00Z', value: '5' },
            ]
          }
        ])
      )

    const response$ = ds.query(queryRequest);
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('replaces tag path with variable', () => {
    templateSrv.containsTemplate
      .calledWith('$my_variable')
      .mockReturnValue(true)
    templateSrv.replace
      .calledWith(
        '$my_variable',
        undefined,
        expect.any(Function)
      )
      .mockReturnValue('my.tag');
    backendSrv.fetch
      .calledWith(requestMatching({ url: '/nitag/v2/query-tags-with-values', data: { filter: '(path = "my.tag")' } }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({ type: TagQueryType.Current, path: '$my_variable' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('replaces tag path with multi select variable', () => {
    templateSrv.containsTemplate
      .calledWith('localhost.Health.CPU.$cpu.UsePercentage')
      .mockReturnValue(true)
    templateSrv.replace
      .calledWith(
        'localhost.Health.CPU.$cpu.UsePercentage',
        undefined,
        expect.any(Function)
      )
      .mockReturnValue('localhost.Health.CPU.{1,2}.UsePercentage');
    backendSrv.fetch
      .calledWith(requestMatching({
        url: '/nitag/v2/query-tags-with-values', data: {
          filter: '(path = "localhost.Health.CPU.1.UsePercentage" or path = "localhost.Health.CPU.2.UsePercentage")'
        }
      }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({
      type: TagQueryType.Current,
      path: 'localhost.Health.CPU.$cpu.UsePercentage'
    }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('replaces tag path with two multi select variable', () => {
    templateSrv.containsTemplate
      .calledWith('localhost.Health.$var1.$var2')
      .mockReturnValue(true)
    templateSrv.replace
      .calledWith(
        'localhost.Health.$var1.$var2',
        undefined,
        expect.any(Function)
      )
      .mockReturnValue('localhost.Health.{Disk,Memory}.{Used,Total}');
    backendSrv.fetch
      .calledWith(requestMatching({
        url: '/nitag/v2/query-tags-with-values', data: {
          filter: '(path = "localhost.Health.Disk.Used" or path = "localhost.Health.Disk.Total" or path = "localhost.Health.Memory.Used" or path = "localhost.Health.Memory.Total")'
        }
      }))
      .mockReturnValue(createQueryTagsResponse());

    const response$ = ds.query(buildQuery({
      type: TagQueryType.Current,
      path: 'localhost.Health.$var1.$var2'
    }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('filters by workspace if provided', () => {
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse([{ tag: { workspace: '2' } }]));
    backendSrv.fetch.mockReturnValueOnce(createTagHistoryResponse([{
      path: 'my.tag',
      type: TagDataType.DOUBLE,
      values: []
    }
    ]));

    ds.query(buildQuery({ type: TagQueryType.History, path: 'my.tag', workspace: '2' })).subscribe(() => {
      expect(backendSrv.fetch.mock.calls[0][0].data).toHaveProperty('filter', '(path = "my.tag") && workspace = "2"');
      expect(backendSrv.fetch.mock.calls[1][0].data).toHaveProperty('workspace', '2');
    });
  });

  test('appends tag properties to query result', () => {
    backendSrv.fetch.mockReturnValue(createQueryTagsResponse([{
      tag: {
        properties: {
          nitagHistoryTTLDays: '7',
          foo: 'bar'
        }
      }
    }]));

    const response$ = ds.query(buildQuery({ path: 'my.tag', properties: true }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });

  test('attempts to replace variables in history query', () => {
    const workspaceVariable = '$workspace';
    backendSrv.fetch.mockReturnValueOnce(createQueryTagsResponse());
    templateSrv.replace.calledWith(workspaceVariable).mockReturnValue('1');

    ds.query(buildQuery({ path: 'my.tag', workspace: workspaceVariable })).subscribe();

    expect(templateSrv.replace).toHaveBeenCalledTimes(1);
    expect(templateSrv.replace.mock.calls[0][0]).toBe(workspaceVariable);
  });

  test('supports legacy tag service property "datatype"', () => {
    backendSrv.fetch.mockReturnValueOnce(
      createFetchResponse({
        tagsWithValues: [
          {
            current: { value: { value: '3.14' }, timestamp: '2023-10-04T00:00:00.000000Z' },
            tag: { datatype: 'DOUBLE', path: 'my.tag', workspace_id: '1' },
          },
        ],
      })
    );

    const response$ = ds.query(buildQuery({ path: 'my.tag' }));
    response$.subscribe((result) => {
      expect(result.data).toMatchSnapshot();
    });
  });
});

function createQueryTagsResponse(
  tags?: Array<{
    tag?: DeepPartial<TagWithValue['tag']>,
    current?: DeepPartial<TagWithValue['current']>
  }>
) {
  if (tags) {
    if (tags?.length) {
      return createFetchResponse({
        tagsWithValues: [
          ...tags.map(({ tag, current }) => _.defaultsDeep(
            { tag, current },
            {
              current: { value: { value: '3.14' }, timestamp: '2023-10-04T00:00:00.000000Z' },
              tag: { type: 'DOUBLE', path: 'my.tag', properties: {}, workspace: '1' },
            }
          ))
        ],
      });
    } else {
      return createFetchResponse({
        tagsWithValues: [],
      });
    }
  } else {
    return createFetchResponse({
      tagsWithValues: [{
        current: { value: { value: '3.14' }, timestamp: '2023-10-04T00:00:00.000000Z' },
        tag: { type: TagDataType.DOUBLE, path: 'my.tag', properties: {}, workspace: '1' },
      }],
    });
  }
}


function createTagHistoryResponse(tagsHistory: Array<{
  path: string,
  type: TagDataType,
  values: Array<{ timestamp: string; value: string }>
}>) {
  const results: { [key: string]: { type: string, values: any[] } } = {};
  tagsHistory.forEach(({ path, type, values }) => {
    results[path] = { type, values };
  });
  return createFetchResponse({ results });
}
