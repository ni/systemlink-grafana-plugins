import { MockProxy } from 'jest-mock-extended';
import { ResultsDataSource } from './ResultsDataSource';
import { OutputType, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsQuery } from './types';
import { BackendSrv, getTemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';

const mockQueryResulltsResponse: QueryResultsResponse = {
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

jest.mock('@grafana/runtime', () => ({
  getTemplateSrv: jest.fn()
}));

let datastore: ResultsDataSource, backendServer: MockProxy<BackendSrv>

describe('ResultsDataSource', () => {
  beforeEach(() => {
    (getTemplateSrv as jest.Mock).mockReturnValue({
        replace: jest.fn((value) => value.replace('${__from:date}', 'replacedDate'))
      });
    [datastore, backendServer] = setupDataSource(ResultsDataSource);

    backendServer.fetch
    .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
    .mockReturnValue(
      createFetchResponse<QueryResultsResponse>(mockQueryResulltsResponse)
    );
  })

  describe('testDataSource', () => {
    test('returns success', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/results?take=1', method: 'GET' }))
      .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/results?take=1', method: 'GET' }))
      .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/results?take=1" failed with status code: 400. Error message: "Error"');
    });
  });

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
    test('returns data for valid data-output-type query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('returns total count for valid total count output type queries', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('returns no data when QueryResults API returns empty array', async () => {
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
      const response = await datastore.query(query);

      expect(response.data).toMatchSnapshot();
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

        await expect(datastore.query(query))
        .rejects
        .toThrow('Request to url "/nitestmonitor/v2/query-results" failed with status code: 400. Error message: "Error"');
    });

    test('should convert properties to Grafana fields', async () => {
        const query = buildQuery(
          {
            refId: 'A',
            outputType: OutputType.Data
          },
        );

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
    });

    test('should handle null and undefined properties', async () => {
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

        const response = await datastore.query(query);
        const fields = response.data[0].fields as Field[];
        expect(fields).toEqual([
          { name: 'properties', values: [""], type: 'string' },
        ]);
    });
  });

  const buildQuery = getQueryBuilder<ResultsQuery>()({
    refId: 'A',
    outputType: OutputType.Data
  });
});
