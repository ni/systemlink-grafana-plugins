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

  const buildQuery = getQueryBuilder<QuerySteps>()({
    refId: 'A',
    queryType: QueryType.Steps,
    outputType: OutputType.Data
  });
});
