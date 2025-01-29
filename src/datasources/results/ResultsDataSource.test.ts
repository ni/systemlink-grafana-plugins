import { MockProxy } from 'jest-mock-extended';
import { ResultsDataSource } from './ResultsDataSource';
import { OutputType, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsQuery, UseTimeRange } from './types';
import { BackendSrv, getTemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';

const mockQueryResulltsResponse: QueryResultsResponse = {
  results: [
    {
      status: {
        statusType: 'PASSED',
        statusName: 'Passed',
      },
      startedAt: '2018-05-07T18:58:05.219692Z',
      updatedAt: '2023-10-23T22:30:03.833396Z',
      programName: 'My Program Name',
      id: '000007fb-aa87-4ab9-9757-6568e7893c33',
      systemId: '20FRS0MQ67--SN-R90N9L4N--MAC-54-AA-75-CE-B7-FE',
      hostName: 'My-Host',
      operator: 'admin',
      partNumber: 'cRIO-9050',
      serialNumber: '123-456',
      totalTimeInSeconds: 29.9,
      keywords: ['keyword1', 'keyword2'],
      properties: {
        Mass: '',
        StartTime: '10-19-2022',
        MaxVoltage: '4.02',
        MetrackID1: 'None',

      },
      statusTypeSummary: {
        "LOOPING": 0,
        "SKIPPED": 0,
        "CUSTOM": 0,
        "DONE": 0,
        "PASSED": 1,
        "FAILED": 0,
        "RUNNING": 0,
        "WAITING": 0,
        "TERMINATED": 0,
        "ERRORED": 0,
        "TIMED_OUT": 0
      },
      fileIds: ['5e30934193c608046851acb2'],
      dataTableIds: ['62333547f7521f2f2f4675e5'],
      workspace: '846e297h-a007-47ac-9fc2-fac07eab240e',
    },
  ],
  continuationToken: '',
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
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results-test-api', method: 'GET' }))
      .mockReturnValue(createFetchResponse('testData'));

      const response = await datastore.testDatasource();

      expect(response.status).toEqual('success');
    });

    test('bubbles up exception', async () => {
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results-test-api', method: 'GET' }))
      .mockReturnValue(createFetchError(400));

      await expect(datastore.testDatasource())
      .rejects
      .toThrow('Request to url "/nitestmonitor/v2/query-results-test-api" failed with status code: 400. Error message: "Error"');
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
        outputType: OutputType.Data,
        properties: [
          ResultsPropertiesOptions.ID,
          ResultsPropertiesOptions.PROGRAM_NAME,
          ResultsPropertiesOptions.SERIAL_NUMBER,
          ResultsPropertiesOptions.SYSTEM_ID,
          ResultsPropertiesOptions.STATUS_TYPE_SUMMARY
        ] as ResultsProperties[],
        orderBy: ResultsPropertiesOptions.ID,
        descending: false,
        useTimeRange: true,
        useTimeRangeFor: UseTimeRange.Updated,
        recordCount: 1
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('returns total count for valid total count output type queries', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount,
        useTimeRange: true,
        useTimeRangeFor: UseTimeRange.Updated
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
            outputType: OutputType.Data,
            properties: [
              ResultsPropertiesOptions.ID,
              ResultsPropertiesOptions.PROGRAM_NAME,
              ResultsPropertiesOptions.SERIAL_NUMBER,
              ResultsPropertiesOptions.SYSTEM_ID,
            ] as ResultsProperties[],
            orderBy: ResultsPropertiesOptions.ID,
            descending: false,
            useTimeRange: true,
            useTimeRangeFor: UseTimeRange.Updated,
            recordCount: 1
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
            outputType: OutputType.Data,
            properties: [
              ResultsPropertiesOptions.ID,
              ResultsPropertiesOptions.PROGRAM_NAME,
              ResultsPropertiesOptions.SERIAL_NUMBER,
              ResultsPropertiesOptions.SYSTEM_ID,
              ResultsPropertiesOptions.PROPERTIES,
              ResultsPropertiesOptions.STATUS,
              ResultsPropertiesOptions.STATUS_TYPE_SUMMARY
            ] as ResultsProperties[],
            orderBy: ResultsPropertiesOptions.ID,
            descending: false,
            useTimeRange: true,
            useTimeRangeFor: UseTimeRange.Updated,
            recordCount: 1
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
    properties: [
      ResultsPropertiesOptions.ID,
      ResultsPropertiesOptions.PROGRAM_NAME,
      ResultsPropertiesOptions.SERIAL_NUMBER,
      ResultsPropertiesOptions.SYSTEM_ID,
    ] as ResultsProperties[],
    orderBy: undefined
  });
});
