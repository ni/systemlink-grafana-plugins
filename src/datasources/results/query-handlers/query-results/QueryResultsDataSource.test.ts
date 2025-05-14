import { MockProxy } from 'jest-mock-extended';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';
import { QueryResultsDataSource } from './QueryResultsDataSource';
import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions } from 'datasources/results/types/QueryResults.types';
import { OutputType, QueryType } from 'datasources/results/types/types';

const mockQueryResultsResponse: QueryResultsResponse = {
  results: [
    {
      id: '000007fb-aa87-4ab9-9757-6568e7893c33',
      programName: 'My Program Name',
      totalTimeInSeconds: 29.9,
      keywords: ['keyword1', 'keyword2'],
    },
  ],
  totalCount: 1
};

let datastore: QueryResultsDataSource, backendServer: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

describe('QueryResultsDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer, templateSrv] = setupDataSource(QueryResultsDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockQueryResultsResponse));
  })

  describe('queryResults', () => {
    test('returns data when there are valid queries', async () => {
      const response = await datastore.queryResults();

      expect(response).toMatchSnapshot();
    });

    test('raises an error returns API fails', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.queryResults())
        .rejects
        .toThrow('Request to url "/nitestmonitor/v2/query-results" failed with status code: 400. Error message: "Error"');
    });
  });

  describe('query', () => {
    test('returns data for valid data-output-type query', () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data
      });

      const response$ = datastore.query(query);
      response$.subscribe((response) => {
        expect(response.data).toMatchSnapshot();
        expect(response.data).toHaveLength(1);
      });
    });

    test('returns total count for valid total count output type queries', () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount
      });

      const response$ = datastore.query(query);
      response$.subscribe((response) => {
        expect(response.data).toMatchSnapshot();
        expect(response.data).toHaveLength(1);
      });
    });

    test('returns no data when QueryResults API returns empty array', () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(
          createFetchResponse(
            {
              results: [],
              continuationToken: null,
              totalCount: 0
            } as unknown as QueryResultsResponse
          )
        );

      const query = buildQuery();
      const response$ = datastore.query(query);
      response$.subscribe((response) => {
        expect(response.data).toMatchSnapshot();
      });
    });

    test('returns no data when Query Results returns error', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results' }))
        .mockReturnValue(createFetchError(400));

      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data
        },
      );

      await expect(
        new Promise((resolve, reject) => {
          const response$ = datastore.query(query);
          response$.subscribe({
            error: error => reject(error),
          });
        })
      ).rejects.toThrow('Request to url "/nitestmonitor/v2/query-results" failed with status code: 400. Error message: "Error"');
    });

    test('should convert properties to Grafana fields', () => {
        const query = buildQuery(
          {
            refId: 'A',
            outputType: OutputType.Data
          },
        );

        const response$ = datastore.query(query);
        response$.subscribe((response) => {
          const fields = response.data[0].fields as Field[];
          expect(fields).toMatchSnapshot();
        });
    });

    test('includes templateSrv replaced values in the filter', () => {
      const timeRange = {
        Started: 'startedAt',
        Updated: 'updatedAt',
      }
      const selectedUseTimeRangeFor = 'Started';
      const filter = `(${timeRange[selectedUseTimeRangeFor]} > "\${__from:date}" && ${timeRange[selectedUseTimeRangeFor]} < "\${__to:date}")`;
      const replacedFilter = `(${timeRange[selectedUseTimeRangeFor]} > "2025-04-01" && ${timeRange[selectedUseTimeRangeFor]} < "2025-04-02")`;
      templateSrv.replace.calledWith().mockReturnValue(replacedFilter);
        const query = buildQuery(
          {
            refId: 'A',
            outputType: OutputType.Data,
            useTimeRange: true,
            useTimeRangeFor: selectedUseTimeRangeFor
          },
        );

      datastore.query(query).subscribe();

      expect(templateSrv.replace).toHaveBeenCalledWith(filter, expect.anything());
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ filter: replacedFilter }),
        })
      );
    });

    test('should handle null and undefined properties', () => {
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results' }))
          .mockReturnValue(createFetchResponse({
            results: [
              {
                id: '1',
                properties: null
              }
            ], continuationToken: null, totalCount: 1
          } as unknown as QueryResultsResponse));

        const query = buildQuery(
          {
            refId: 'A',
            outputType: OutputType.Data,
            properties: [
              ResultsPropertiesOptions.PROPERTIES
            ] as ResultsProperties[],
            orderBy: undefined
          },
        );

        const response$ = datastore.query(query);
        response$.subscribe((response) => {
          const fields = response.data[0].fields as Field[];
          expect(fields).toEqual([
            { name: 'properties', values: [""], type: 'string' },
          ]);
        });
    });
  });

  const buildQuery = getQueryBuilder<QueryResults>()({
    refId: 'A',
    queryType: QueryType.Results,
    outputType: OutputType.Data
  });
});
