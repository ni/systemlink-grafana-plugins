import { MockProxy } from 'jest-mock-extended';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';
import { QuerySteps, QueryStepsResponse, StepsProperties, StepsPropertiesOptions } from 'datasources/results/types/QuerySteps.types';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { QueryStepsDataSource } from './QueryStepsDataSource';

const mockQueryStepsResponse: QueryStepsResponse = {
  steps: [
    {
      stepId: '1',
      name: 'Step 1',
      properties: {
        key1: 'value1',
        key2: 'value2',
      },
    },
  ],
  continuationToken: undefined,
  totalCount: 1
};

let datastore: QueryStepsDataSource, backendServer: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

describe('QueryStepsDataSource', () => {
  beforeEach(() => {
    [datastore, backendServer, templateSrv] = setupDataSource(QueryStepsDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockQueryStepsResponse));
  })

  describe('querySteps', () => {
    test('should return data when there are valid queries', async () => {
      const response = await datastore.querySteps();

      expect(response).toMatchSnapshot();
    });

    test('should raise an error when API fails', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.querySteps())
        .rejects
        .toThrow('Request to url "/nitestmonitor/v2/query-steps" failed with status code: 400. Error message: "Error"');
    });
  });

  describe('query', () => {
    test('should return data for valid data-output-type query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('should return total count for valid total count output type queries', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount,
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('should return no data when QuerySteps API returns empty array', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(
          createFetchResponse(
            {
              steps: [],
              continuationToken: null,
              totalCount: 0
            } as unknown as QueryStepsResponse
          )
        );

      const query = buildQuery();
      const response = await datastore.query(query);

      expect(response.data).toMatchSnapshot();
    });

    test('should return no data when Query Steps returns error', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(400));

      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data
        },
      );

      await expect(datastore.query(query))
        .rejects
        .toThrow('Request to url "/nitestmonitor/v2/query-steps" failed with status code: 400. Error message: "Error"');
    });

    test('should convert properties to Grafana fields', async () => {
      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsPropertiesOptions.PROPERTIES as StepsProperties]
        },
      );

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    test('should convert step measurements to Grafana fields when show measurments is enabled', async () => {
      const mockQueryStepsMeasurementResponse: QueryStepsResponse = {
        steps: [
          {
            stepId: '1',
            data: {
              text: 'Step 1',
              parameters: [
                {
                  name: 'Voltage',
                  measurement: '3.7',
                  status: 'Passed',
                  units: 'V',
                  lowLimit: '3.5',
                  highLimit: '4.0',
                  value: ''
                },
                {
                  name: 'Voltage',
                  measurement: '3.7',
                  status: 'Passed',
                  units: 'V',
                  lowLimit: '3.5',
                  highLimit: '4.0',
                  value: ''
                },//duplicate measurement
                {
                  name: 'Current',
                  measurement: '1.2',
                  status: 'Failed',
                  units: 'A',
                  lowLimit: '1.0',
                  highLimit: '1.5',
                  miscellaneous: 'Misc'
                },
              ]
            }
          },
        ],
        totalCount: 1
      };

      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(createFetchResponse(mockQueryStepsMeasurementResponse));

      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data,
          showMeasurements: true
        },
      );

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    test('should include templateSrv replaced values in the filter', async () => {
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

      await datastore.query(query);

      expect(templateSrv.replace).toHaveBeenCalledWith(filter, expect.anything());
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ filter: replacedFilter }),
        })
      );
    });

    test('should handle null and undefined properties', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchResponse({
          steps: [
            {
              id: '1',
              properties: null
            }
          ], continuationToken: null, totalCount: 1
        } as unknown as QueryStepsResponse));

      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data,
          properties: [
            StepsPropertiesOptions.PROPERTIES
          ] as StepsProperties[],
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

  describe('fetch Steps with rate limiting', () => {
    it('should make a single request when take is less than MAX_TAKE_PER_REQUEST', async () => {
      const mockResponses = [
        createFetchResponse({
          steps: Array(100).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: null,
          totalCount: 100,
      })]
      backendServer.fetch
        .mockImplementationOnce(() => mockResponses[0])
        const responsePromise = datastore.queryStepsInBatch(
          undefined,
          undefined,
          undefined,
          100,
          undefined,
          true
        );
        const response = await responsePromise;
  
        expect(response.steps).toHaveLength(100);
        expect(backendServer.fetch).toHaveBeenCalledTimes(1);
        expect(backendServer.fetch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            data: expect.objectContaining({ take: 100, continuationToken: undefined }),
          })
        );
      });
  
      test('should batch requests with a maximum of 6 requests per second', async () => {
        const mockResponses = [
          createFetchResponse({
            steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
            continuationToken: 'token1',
            totalCount: 1500,
          }),
          createFetchResponse({
            steps: Array(500).fill({ stepId: '2', name: 'Step 2' }),
            continuationToken: 'token2',
            totalCount: 1500,
          }),
          createFetchResponse({
            steps: Array(500).fill({ stepId: '3', name: 'Step 3' }),
            continuationToken: null,
            totalCount: 1500,
          }),
        ];
  
        backendServer.fetch
          .mockImplementationOnce(() => mockResponses[0])
          .mockImplementationOnce(() => mockResponses[1])
          .mockImplementationOnce(() => mockResponses[2]);
        const responsePromise = datastore.queryStepsInBatch(
          undefined,
          undefined,
          undefined,
          1500,
          undefined,
          true
        );
        const response = await responsePromise;
  
        expect(response.steps).toHaveLength(1500);
        expect(backendServer.fetch).toHaveBeenCalledTimes(3);
        expect(backendServer.fetch).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            data: expect.objectContaining({ take: 500, continuationToken: undefined }),
          })
        );
        expect(backendServer.fetch).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            data: expect.objectContaining({ take: 500, continuationToken: 'token1' }),
          })
        );
        expect(backendServer.fetch).toHaveBeenNthCalledWith(
          3,
          expect.objectContaining({
            data: expect.objectContaining({ take: 500, continuationToken: 'token2' }),
          })
        );
      });
  
      test('should stop fetching when continuationToken is null', async () => {
        const mockResponses = [
          createFetchResponse({
            steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
            continuationToken: null,
            totalCount: 500,
          }),
        ];
  
        backendServer.fetch.mockImplementationOnce(() => mockResponses[0]);
        const response = await datastore.queryStepsInBatch(
          undefined,
          undefined,
          undefined,
          3000,
          undefined,
          true
        );
  
        expect(response.steps).toHaveLength(500);
        expect(backendServer.fetch).toHaveBeenCalledTimes(1);
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ take: 500, continuationToken: undefined }),
          })
        );
      });

      test('should stop subsequent API calls after error occurs', async () => {
        backendServer.fetch
          .mockImplementationOnce(() => createFetchResponse({
            steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
            continuationToken: 'token1',
            totalCount: 1500,
          }))
          .mockImplementationOnce(() => createFetchError(400)) //Error
          .mockImplementationOnce(() => createFetchResponse({
            steps: Array(500).fill({ stepId: '2', name: 'Step 2' }),
            continuationToken: 'token2',
            totalCount: 1500,
          }));
        
        const batchPromise = datastore.queryStepsInBatch(
          'filter',
          'orderBy',
          undefined,
          1500,
          false,
          true
        );
        
        await expect(batchPromise)
          .rejects
          .toThrow('Request to url "/nitestmonitor/v2/query-steps" failed with status code: 400. Error message: "Error"');
        expect(backendServer.fetch).toHaveBeenCalledTimes(2);
      });
    });

  const buildQuery = getQueryBuilder<QuerySteps>()({
    refId: 'A',
    queryType: QueryType.Steps,
    outputType: OutputType.Data
  });
});
