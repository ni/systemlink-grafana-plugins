import { MockProxy } from 'jest-mock-extended';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import {
  createFetchError,
  createFetchResponse,
  getQueryBuilder,
  requestMatching,
  setupDataSource,
} from 'test/fixtures';
import { Field } from '@grafana/data';
import {
  QuerySteps,
  QueryStepsResponse,
  StepsProperties,
  StepsPropertiesOptions,
} from 'datasources/results/types/QuerySteps.types';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { QueryStepsDataSource } from './QueryStepsDataSource';
import { ResultsQueryBuilderFieldNames } from 'datasources/results/constants/ResultsQueryBuilder.constants';
import { StepsQueryBuilderFieldNames } from 'datasources/results/constants/StepsQueryBuilder.constants';
import { StepsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { Workspace } from 'core/types';
import { DataSourceBase } from 'core/DataSourceBase';

const mockQueryStepsResponse: QueryStepsResponse = {
  steps: [
    {
      stepId: '1',
      name: 'Step 1',
      properties: {
        key1: 'value1',
        key2: 'value2',
      },
      workspace: '1'
    },
  ],
  continuationToken: undefined,
  totalCount: 1,
};

let datastore: QueryStepsDataSource, backendServer: MockProxy<BackendSrv>, templateSrv: MockProxy<TemplateSrv>;

jest.mock('datasources/results/constants/QuerySteps.constants', () => ({
  ...jest.requireActual('datasources/results/constants/QuerySteps.constants'),
  QUERY_STEPS_REQUEST_PER_SECOND: 2,
}));

jest.mock('../../constants/QueryStepPath.constants', () => ({
  ...jest.requireActual('../../constants/QueryStepPath.constants'),
  QUERY_PATH_REQUEST_PER_SECOND: 2,
}));

describe('QueryStepsDataSource', () => {
  beforeEach(() => {
    (ResultsDataSourceBase as any).queryResultsValues = jest.fn().mockResolvedValue(['value1', 'value2']);

    [datastore, backendServer, templateSrv] = setupDataSource(QueryStepsDataSource);

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockQueryStepsResponse));

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-result-values', method: 'POST' }))
      .mockReturnValue(createFetchResponse(['name1', 'name2']));

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-paths', method: 'POST' }))
      .mockReturnValue(
        createFetchResponse({
          paths: ['path1', 'path2'],
          continuationToken: null,
          totalCount: 2,
        })
      );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('querySteps', () => {
    test('should return data when there are valid queries', async () => {
      const response = await datastore.querySteps();

      expect(response).toMatchSnapshot();
    });

    test('should raise an error when API fails', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.querySteps()).rejects.toThrow(
        'The query failed due to the following error: (status 400) "Error".'
      );
    });

    test('should publish alertError event when error occurs', async () => {
      const publishMock = jest.fn();
      (datastore as any).appEvents = { publish: publishMock };
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(400));

      await expect(datastore.querySteps()).rejects.toThrow(
        'The query failed due to the following error: (status 400) "Error".'
      );

      expect(publishMock).toHaveBeenCalledWith({
        type: 'alert-error',
        payload: [
          'Error during step query',
          expect.stringContaining('The query failed due to the following error: (status 400) "Error".'),
        ],
      });
    });

    it('should throw timeOut error when API returns 504 status', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(504));

      await expect(datastore.querySteps()).rejects.toThrow(
        'The query to fetch steps experienced a timeout error. Narrow your query with a more specific filter and try again.'
      );
    });
  });

  describe('query', () => {
    test('should return data for valid data-output-type query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
      });

      const response = await datastore.query(query);

      expect(response.data).toHaveLength(1);
      expect(response.data).toMatchSnapshot();
    });

    test('returns empty data for invalid query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: [],
      });

      const response = await datastore.query(query);

      expect(response.data).toMatchSnapshot();
    });

    test('should set default orderby to "STARTED_AT" and descending to "false"', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            orderBy: 'STARTED_AT',
            descending: false,
          }),
        })
      );
    });

    test('should set the default time range filter to "Started" when useTimerange is true', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        useTimeRange: true,
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            filter: '(startedAt > "${__from:date}" && startedAt < "${__to:date}")',
          }),
        })
      );
    });

    test('should display an empty cell when properties annd data are returned as empty objects', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(
          createFetchResponse({
            steps: [
              {
                properties: {},
                data: {}
              },
            ],
            continuationToken: null,
            totalCount: 1,
          } as unknown as QueryStepsResponse)
        );

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: [StepsProperties.properties, StepsProperties.data],
      });

      const response = await datastore.query(query);

      expect(response.data[0].fields).toEqual([
        { name: 'Properties', values: [''], type: 'string' },
        { name: 'Data', values: [''], type: 'string' },
      ]);
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

    test('should show column header with no data when QuerySteps API returns empty array', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(
          createFetchResponse({
            steps: [],
            continuationToken: null,
            totalCount: 0,
          } as unknown as QueryStepsResponse)
        );

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        resultsQuery: 'PartNumber = "1234"',
        properties: [StepsProperties.stepId],
        recordCount: 1,
      });
      const response = await datastore.query(query);

      expect(response.data).toMatchSnapshot();
    });

    test('should return no data when Query Steps returns error', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' }))
        .mockReturnValue(createFetchError(400));

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
      });

      await expect(datastore.query(query)).rejects.toThrow(
        'The query failed due to the following error: (status 400) "Error".'
      );
    });

    test('should convert properties to Grafana fields', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: [StepsPropertiesOptions.PROPERTIES as StepsProperties],
      });

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    test('should return the workspace ID returned by API when the cache is empty', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      jest.spyOn(DataSourceBase.prototype, 'getWorkspaces').mockResolvedValue([]);
      const [datastore, backendServer] = setupDataSource(QueryStepsDataSource);
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(createFetchResponse(mockQueryStepsResponse));
        const query = buildQuery(
          {
            refId: 'A',
            outputType: OutputType.Data,
            properties: [StepsProperties.workspace]
          },
        );

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    test('should return the workspace ID when no matching entry exists in the cache for the ID returned by the API', async () => {
      const mockWorkspaces = [{ id: '2', name: 'Other workspace', default: false, enabled: true }];
      (ResultsDataSourceBase as any)._workspacesCache = null;
      jest.spyOn(DataSourceBase.prototype, 'getWorkspaces').mockResolvedValue(mockWorkspaces);
      const [datastore, backendServer] = setupDataSource(QueryStepsDataSource);
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(createFetchResponse(mockQueryStepsResponse));
      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.workspace]
        },
      );

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });


    describe('show measurements is enabled', () => {
      describe('duplicate measurement names', () => {
        beforeEach(() => {
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
                      value: '',
                    },
                    {
                      name: 'Voltage',
                      measurement: '3.7',
                      status: 'Passed',
                      units: 'V',
                      lowLimit: '3.5',
                      highLimit: '4.0',
                      value: '',
                    }, //duplicate measurement
                    {
                      name: 'Current',
                      measurement: '1.2',
                      status: 'Failed',
                      units: 'A',
                      lowLimit: '1.0',
                      highLimit: '1.5',
                      miscellaneous: 'Misc',
                    },
                  ],
                },
              },
            ],
            totalCount: 1,
          };

          backendServer.fetch
            .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
            .mockReturnValue(createFetchResponse(mockQueryStepsMeasurementResponse));
        });

        test('should convert step measurements to Grafana fields as a column', async () => {
          const query = buildQuery({
            refId: 'A',
            outputType: OutputType.Data,
            showMeasurements: true,
            properties: [StepsProperties.stepId],
          });

          const response = await datastore.query(query);

          const fields = response.data[0].fields as Field[];
          expect(fields).toMatchSnapshot();
        });

        test('should duplicate step properties, inputs and output column values', async () => {
          const query = buildQuery({
            refId: 'A',
            outputType: OutputType.Data,
            showMeasurements: true,
            properties: [StepsProperties.stepId, StepsProperties.inputs, StepsProperties.outputs],
          });

          const response = await datastore.query(query);

          const fields = response.data[0].fields as Field[];
          expect(fields).toMatchSnapshot();
        });
      });

      test('should create empty cells when measurements are not available', async () => {
        const mockQueryStepsMeasurementResponse: QueryStepsResponse = {
          steps: [
            {
              stepId: '1',
              data: {
                text: 'Step 1',
                parameters: [{ name: 'Current', measurement: '1.2' }],
              },
            },
            {
              stepId: '2',
              data: {
                text: 'Step 1',
                parameters: [{ name: 'Voltage', measurement: '3.7' }],
              },
            },
          ],
          totalCount: 1,
        };

        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
          .mockReturnValue(createFetchResponse(mockQueryStepsMeasurementResponse));

        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          showMeasurements: true,
          properties: [StepsProperties.stepId],
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });

      test('should create new columns when units are different in the same measurement', async () => {
        const mockQueryStepsMeasurementResponse: QueryStepsResponse = {
          steps: [
            {
              stepId: '1',
              data: {
                text: 'Step 1',
                parameters: [{ name: 'Current', measurement: '1.2', units: 'A' }],
              },
            },
            {
              stepId: '2',
              data: {
                text: 'Step 1',
                parameters: [{ name: 'Current', measurement: '370', units: 'mA' }],
              },
            },
          ],
          totalCount: 1,
        };

        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
          .mockReturnValue(createFetchResponse(mockQueryStepsMeasurementResponse));

        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          showMeasurements: true,
          properties: [StepsProperties.stepId],
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });
    });

    describe('inputs/outputs are added as properties', () => {
      beforeEach(() => {
        const mockIO = [
          { name: 'Input Voltage', value: 1 },
          { name: 'Output Current', value: 2 },
        ];

        const mockMeasurementData = {
          text: 'Step 1',
          parameters: [{ name: 'Voltage', measurement: '3.7', unit: 'V' }],
        };

        const mockQueryStepsConditionsResponse: QueryStepsResponse = {
          steps: [
            {
              ...mockQueryStepsResponse.steps[0],
              stepId: '1',
              inputs: mockIO,
              outputs: mockIO,
              data: mockMeasurementData,
            },
            {
              ...mockQueryStepsResponse.steps[0],
              stepId: '2',
              inputs: mockIO,
              outputs: mockIO,
              data: mockMeasurementData,
            },
          ],
          totalCount: 2,
        };

        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
          .mockReturnValue(createFetchResponse(mockQueryStepsConditionsResponse));
      });

      test('should return inputs as new columns with measurements', async () => {
        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.inputs],
          showMeasurements: true,
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });

      test('should return outputs as new columns with measurements', async () => {
        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.outputs],
          showMeasurements: true,
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });
    });

    describe('duplicates in inputs, outputs and measurement names', () => {
      beforeEach(() => {
        const mockIO = [
          { name: 'Voltage', value: 1 },
          { name: 'Voltage', value: 2 },
          { name: 'Voltage', value: 3 },
          { name: 'Voltage', value: 4 },
        ];

        const mockMeasurementData = {
          text: 'Step 1',
          parameters: [
            { name: 'Voltage', measurement: '3.5', unit: 'V', highLimit: '4.0', lowLimit: '3.0' },
            { name: 'Voltage', measurement: '3.6', unit: 'V', highLimit: '4.0', lowLimit: '3.0' },
            { name: 'Voltage', measurement: '3.7', unit: 'V', highLimit: '4.0', lowLimit: '3.0' },
          ],
        };

        const mockQueryStepsConditionsResponse: QueryStepsResponse = {
          steps: [
            {
              ...mockQueryStepsResponse.steps[0],
              stepId: '1',
              inputs: mockIO,
              outputs: mockIO,
              data: mockMeasurementData,
            },
            {
              ...mockQueryStepsResponse.steps[0],
              stepId: '2',
              inputs: mockIO,
              outputs: mockIO,
              data: mockMeasurementData,
            },
          ],
          totalCount: 2,
        };

        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
          .mockReturnValue(createFetchResponse(mockQueryStepsConditionsResponse));
      });

      test('should return inputs as new columns with measurements', async () => {
        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.inputs],
          showMeasurements: true,
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });

      test('should return outputs as new columns with measurements', async () => {
        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.outputs],
          showMeasurements: true,
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });

      test('should return inputs and outputs with suffixes as new columns with measurements', async () => {
        const query = buildQuery({
          refId: 'A',
          outputType: OutputType.Data,
          properties: [StepsProperties.inputs, StepsProperties.outputs, StepsProperties.stepId],
          showMeasurements: true,
        });

        const response = await datastore.query(query);

        const fields = response.data[0].fields as Field[];
        expect(fields).toMatchSnapshot();
      });
    });

    test('should return inputs as new columns with measurements when the all names are duplicates', async () => {
      const mockIO = [
        { name: 'Voltage', value: 1 },
        { name: 'Voltage', value: 2 },
        { name: 'Voltage', value: 3 },
        { name: 'Voltage', value: 4 },
      ];

      const mockMeasurementData = {
        text: 'Step 1',
        parameters: [
          { name: 'Voltage', measurement: '3.5' },
          { name: 'Voltage', measurement: '3.6' },
          { name: 'Voltage', measurement: '3.7' },
        ],
      };

      const mockQueryStepsConditionsResponse: QueryStepsResponse = {
        steps: [
          {
            ...mockQueryStepsResponse.steps[0],
            stepId: '1',
            inputs: mockIO,
            outputs: mockIO,
            data: mockMeasurementData,
          },
          {
            ...mockQueryStepsResponse.steps[0],
            stepId: '2',
            inputs: mockIO,
            outputs: mockIO,
            data: mockMeasurementData,
          },
        ],
        totalCount: 2,
      };

      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockReturnValue(createFetchResponse(mockQueryStepsConditionsResponse));

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: [StepsProperties.inputs],
        showMeasurements: true,
      });

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toMatchSnapshot();
    });

    test('should include templateSrv replaced values in the filter', async () => {
      const timeRange = {
        Started: 'startedAt',
      };
      const selectedUseTimeRangeFor = 'Started';
      const filter = `(${timeRange[selectedUseTimeRangeFor]} > "\${__from:date}" && ${timeRange[selectedUseTimeRangeFor]} < "\${__to:date}")`;
      const replacedFilter = `(${timeRange[selectedUseTimeRangeFor]} > "2025-04-01" && ${timeRange[selectedUseTimeRangeFor]} < "2025-04-02")`;
      templateSrv.replace.calledWith().mockReturnValue(replacedFilter);

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        useTimeRange: true,
      });

      await datastore.query(query);

      expect(templateSrv.replace).toHaveBeenCalledWith(filter, expect.anything());
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ filter: replacedFilter }),
        })
      );
    });

    test('should handle null and undefined properties', async () => {
      backendServer.fetch.calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps' })).mockReturnValue(
        createFetchResponse({
          steps: [
            {
              id: '1',
              properties: null,
            },
          ],
          continuationToken: null,
          totalCount: 1,
        } as unknown as QueryStepsResponse)
      );

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: [StepsPropertiesOptions.PROPERTIES] as StepsProperties[],
      });

      const response = await datastore.query(query);
      const fields = response.data[0].fields as Field[];
      expect(fields).toEqual([{ name: 'Properties', values: [''], type: 'string' }]);
    });

    test('should call query steps API once when output type is total count', async () => {
      const mockResponses = [
        createFetchResponse({
          steps: Array(100).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: null,
          totalCount: 5000,
        }),
        createFetchResponse({
          steps: Array(100).fill({ stepId: '2', name: 'Step 2' }),
          continuationToken: null,
          totalCount: 5000,
        }),
      ];
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockImplementationOnce(() => mockResponses[0])
        .mockImplementationOnce(() => mockResponses[1]);
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount,
        properties: [],
        orderBy: undefined,
        useTimeRange: true,
      });

      const response = await datastore.query(query);

      const fields = response.data[0].fields as Field[];
      expect(fields).toEqual([{ name: 'A', values: [5000] }]);
      const callsToQuerySteps = backendServer.fetch.mock.calls.filter(
        ([request]) => request.url === '/nitestmonitor/v2/query-steps'
      );
      expect(callsToQuerySteps).toHaveLength(1);
    });
  });

  describe('Dependencies', () => {
    afterEach(() => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
    });

    test('should return the same promise instance when workspacePromise already exists', async () => {
      const mockWorkspaces = new Map<string, Workspace>([
        ['1', { id: '1', name: 'Default workspace', default: true, enabled: true }],
        ['2', { id: '2', name: 'Other workspace', default: false, enabled: true }],
      ]);
      const mockPromise = Promise.resolve(mockWorkspaces);
      (ResultsDataSourceBase as any)._workspacesCache = mockPromise;
      backendServer.fetch.mockClear();

      const workspacePromise = datastore.loadWorkspaces();

      expect(workspacePromise).toEqual(mockPromise);
      expect(await workspacePromise).toEqual(mockWorkspaces);
      expect(backendServer.fetch).not.toHaveBeenCalledWith(expect.objectContaining({ url: '/niauth/v1/user' }));
    });

    test('should create and return a new promise when workspace promise does not exist', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const workspaceSpy = jest.spyOn(ResultsDataSourceBase.prototype, 'getWorkspaces');

      const promise = datastore.loadWorkspaces();

      expect(promise).not.toBeNull();
      expect(workspaceSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in getWorkspaces', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const error = new Error('API failed');
      jest.spyOn(QueryStepsDataSource.prototype, 'getWorkspaces').mockRejectedValue(error);

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to an unknown error.'
      );
    });

    it('should contain error details when error contains additional information', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const error = new Error(
        `API failed Error message: ${JSON.stringify({ message: 'Detailed error message', statusCode: 500 })}`
      );
      jest.spyOn(QueryStepsDataSource.prototype, 'getWorkspaces').mockRejectedValue(error);

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to the following error:Detailed error message.'
      );
    });
  });

  it('should not call query-steps when resultsQuery is empty', async () => {
    const query = buildQuery({
      refId: 'A',
      outputType: OutputType.Data,
      resultsQuery: '',
    });

    const response = await datastore.query(query);

    const fields = response.data[0].fields as Field[];
    expect(fields).toEqual([]);
    expect(backendServer.fetch).not.toHaveBeenCalled();
  });

  describe('fetch Steps with rate limiting', () => {
    it('should make a single request when take is less than MAX_TAKE_PER_REQUEST', async () => {
      const mockResponses = [
        createFetchResponse({
          steps: Array(100).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: null,
          totalCount: 100,
        }),
      ];
      backendServer.fetch.mockImplementationOnce(() => mockResponses[0]);
      const responsePromise = datastore.queryStepsInBatches(
        undefined,
        undefined,
        undefined,
        100,
        undefined,
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

    test('should batch requests when total number od steps matching the filter is less than requested take', async () => {
      const mockResponses = [
        createFetchResponse({
          steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: 'token1',
          totalCount: 900,
        }),
        createFetchResponse({
          steps: Array(400).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: 'token2',
          totalCount: 900,
        }),
      ];
      backendServer.fetch.mockImplementationOnce(() => mockResponses[0]).mockImplementationOnce(() => mockResponses[1]);
      const responsePromise = datastore.queryStepsInBatches(
        'name = "test"',
        undefined,
        undefined,
        10000,
        undefined,
        undefined,
        true
      );
      const response = await responsePromise;

      expect(response.steps).toHaveLength(900);
      expect(backendServer.fetch).toHaveBeenCalledTimes(2);
      expect(backendServer.fetch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ take: 500, continuationToken: undefined }),
        })
      );
      expect(backendServer.fetch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ take: 400, continuationToken: 'token1' }),
        })
      );
    });

    test('should batch requests with RequestPerSecond', async () => {
      jest.useFakeTimers();
      const fetchSpy = jest.spyOn(backendServer, 'fetch');

      const mockResponses = [
        createFetchResponse({
          steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: 'token1',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '2', name: 'Step 2' }),
          continuationToken: 'token2',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '3', name: 'Step 3' }),
          continuationToken: 'token3',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '4', name: 'Step 4' }),
          continuationToken: null,
          totalCount: 2000,
        }),
      ];

      backendServer.fetch
        .mockImplementationOnce(() => mockResponses[0])
        .mockImplementationOnce(() => mockResponses[1])
        .mockImplementationOnce(() => mockResponses[2])
        .mockImplementationOnce(() => mockResponses[3]);

      const responsePromise = datastore.queryStepsInBatches(
        undefined,
        undefined,
        undefined,
        2000,
        undefined,
        undefined,
        true
      );

      await jest.advanceTimersByTimeAsync(0);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1000);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      await responsePromise;

      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({ take: 500, continuationToken: undefined }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({ take: 500, continuationToken: 'token1' }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          data: expect.objectContaining({ take: 500, continuationToken: 'token2' }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          data: expect.objectContaining({ take: 500, continuationToken: 'token3' }),
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
      const response = await datastore.queryStepsInBatches(
        undefined,
        undefined,
        undefined,
        3000,
        undefined,
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
        .mockImplementationOnce(() =>
          createFetchResponse({
            steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
            continuationToken: 'token1',
            totalCount: 1500,
          })
        )
        .mockImplementationOnce(() => createFetchError(400)) //Error
        .mockImplementationOnce(() =>
          createFetchResponse({
            steps: Array(500).fill({ stepId: '2', name: 'Step 2' }),
            continuationToken: 'token2',
            totalCount: 1500,
          })
        );

      const batchPromise = datastore.queryStepsInBatches('filter', 'orderBy', undefined, 1500, false, undefined, true);

      await expect(batchPromise).rejects.toThrow('The query failed due to the following error: (status 400) "Error".');
      expect(backendServer.fetch).toHaveBeenCalledTimes(2);
    });

    test('should delay between consecutive batch API calls', async () => {
      const mockTimeValues = [1000, 1200];
      let timeCallCount = 0;

      Date.now = jest.fn().mockImplementation(() => {
        return mockTimeValues[timeCallCount++] || mockTimeValues[mockTimeValues.length - 1];
      });

      const spyDelay = jest.spyOn(global, 'setTimeout');

      const mockResponses = [
        createFetchResponse({
          steps: Array(500).fill({ stepId: '1', name: 'Step 1' }),
          continuationToken: 'token1',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '2', name: 'Step 2' }),
          continuationToken: 'token2',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '3', name: 'Step 3' }),
          continuationToken: 'token3',
          totalCount: 2000,
        }),
        createFetchResponse({
          steps: Array(500).fill({ stepId: '4', name: 'Step 3' }),
          continuationToken: null,
          totalCount: 2000,
        }),
      ];
      backendServer.fetch
        .mockImplementationOnce(() => mockResponses[0])
        .mockImplementationOnce(() => mockResponses[1])
        .mockImplementationOnce(() => mockResponses[2])
        .mockImplementationOnce(() => mockResponses[3]);
      const responsePromise = datastore.queryStepsInBatches(
        undefined,
        undefined,
        undefined,
        2000,
        undefined,
        undefined,
        true
      );

      const response = await responsePromise;

      expect(response.steps).toHaveLength(2000);
      expect(backendServer.fetch).toHaveBeenCalledTimes(4);
      expect(spyDelay).toHaveBeenCalledTimes(1);
      expect(spyDelay).toHaveBeenCalledWith(expect.any(Function), 800); // delay for 1000 - 200 = 800ms
    });
  });

  describe('fetch Step path', () => {
    it('should make a single request when take is less than MAX_PATH_TAKE_PER_REQUEST', async () => {
      const mockResponses = [
        createFetchResponse({
          paths: Array(100).fill({ path: 'path1' }),
          continuationToken: null,
          totalCount: 100,
        }),
      ];
      backendServer.fetch.mockImplementationOnce(() => mockResponses[0]);
      const responsePromise = datastore.queryStepPathInBatches(undefined, undefined, 100, true);
      const response = await responsePromise;

      expect(response.paths).toHaveLength(100);
      expect(backendServer.fetch).toHaveBeenCalledTimes(1);
      expect(backendServer.fetch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 100, continuationToken: undefined }),
        })
      );
    });

    test('should batch requests when total number of paths matching the filter is less than requested take', async () => {
      const mockResponses = [
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path1' }),
          continuationToken: 'token1',
          totalCount: 1500,
        }),
        createFetchResponse({
          paths: Array(500).fill({ path: 'path2' }),
          continuationToken: 'token2',
          totalCount: 1500,
        }),
      ];
      backendServer.fetch.mockImplementationOnce(() => mockResponses[0]).mockImplementationOnce(() => mockResponses[1]);
      const responsePromise = datastore.queryStepPathInBatches('name = "test"', undefined, 3000, true);
      const response = await responsePromise;

      expect(response.paths).toHaveLength(1500);
      expect(backendServer.fetch).toHaveBeenCalledTimes(2);
      expect(backendServer.fetch).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: undefined }),
        })
      );
      expect(backendServer.fetch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 500, continuationToken: 'token1' }),
        })
      );
    });

    test('should batch requests with RequestPerSecond', async () => {
      jest.useFakeTimers();
      const fetchSpy = jest.spyOn(backendServer, 'fetch');

      const mockResponses = [
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path1' }),
          continuationToken: 'token1',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path2' }),
          continuationToken: 'token2',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path3' }),
          continuationToken: 'token3',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path4' }),
          continuationToken: null,
          totalCount: 4000,
        }),
      ];

      backendServer.fetch
        .mockImplementationOnce(() => mockResponses[0])
        .mockImplementationOnce(() => mockResponses[1])
        .mockImplementationOnce(() => mockResponses[2])
        .mockImplementationOnce(() => mockResponses[3]);

      const responsePromise = datastore.queryStepPathInBatches(undefined, undefined, 4000, true);

      await jest.advanceTimersByTimeAsync(0);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(1000);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
      await responsePromise;

      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: undefined }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: 'token1' }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: 'token2' }),
        })
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: 'token3' }),
        })
      );
    });

    test('should stop fetching when continuationToken is null', async () => {
      const mockResponses = [
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path1' }),
          continuationToken: null,
          totalCount: 1000,
        }),
      ];

      backendServer.fetch.mockImplementationOnce(() => mockResponses[0]);
      const response = await datastore.queryStepPathInBatches(undefined, undefined, 3000, true);

      expect(response.paths).toHaveLength(1000);
      expect(backendServer.fetch).toHaveBeenCalledTimes(1);
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-paths',
          data: expect.objectContaining({ take: 1000, continuationToken: undefined }),
        })
      );
    });

    test('should stop subsequent API calls after error occurs', async () => {
      backendServer.fetch
        .mockImplementationOnce(() =>
          createFetchResponse({
            paths: Array(1000).fill({ path: 'path1' }),
            continuationToken: 'token1',
            totalCount: 3000,
          })
        )
        .mockImplementationOnce(() => createFetchError(400)) //Error
        .mockImplementationOnce(() =>
          createFetchResponse({
            paths: Array(1000).fill({ path: 'path2' }),
            continuationToken: 'token2',
            totalCount: 3000,
          })
        );

      const batchPromise = datastore.queryStepPathInBatches('filter', undefined, 3000, true);

      await expect(batchPromise).rejects.toThrow(
        'Request to url "/nitestmonitor/v2/query-paths" failed with status code: 400. Error message: "Error"'
      );
      expect(backendServer.fetch).toHaveBeenCalledTimes(2);
    });

    test('should delay between consecutive batch API calls', async () => {
      const mockTimeValues = [1000, 1200];
      let timeCallCount = 0;

      Date.now = jest.fn().mockImplementation(() => {
        return mockTimeValues[timeCallCount++] || mockTimeValues[mockTimeValues.length - 1];
      });

      const spyDelay = jest.spyOn(global, 'setTimeout');

      const mockResponses = [
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path1' }),
          continuationToken: 'token1',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path2' }),
          continuationToken: 'token2',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path3' }),
          continuationToken: 'token3',
          totalCount: 4000,
        }),
        createFetchResponse({
          paths: Array(1000).fill({ path: 'path4' }),
          continuationToken: null,
          totalCount: 4000,
        }),
      ];
      backendServer.fetch
        .mockImplementationOnce(() => mockResponses[0])
        .mockImplementationOnce(() => mockResponses[1])
        .mockImplementationOnce(() => mockResponses[2])
        .mockImplementationOnce(() => mockResponses[3]);
      const responsePromise = datastore.queryStepPathInBatches(undefined, undefined, 4000, true);

      const response = await responsePromise;

      expect(response.paths).toHaveLength(4000);
      expect(backendServer.fetch).toHaveBeenCalledTimes(4);
      expect(spyDelay).toHaveBeenCalledTimes(1);
      expect(spyDelay).toHaveBeenCalledWith(expect.any(Function), 800); // delay for 1000 - 200 = 800ms
    });
  });

  describe('getStepPaths', () => {
    it('should call loadStepPaths when resultsQuery is valid', async () => {
      const spy = jest.spyOn(datastore as any, 'loadStepPaths');

      await datastore.getStepPaths('ProgramName = "Test"');

      expect(spy).toHaveBeenCalled();
    });

    it('should not call loadStepPaths when resultsQuery is empty', async () => {
      const spy = jest.spyOn(datastore as any, 'loadStepPaths');

      await datastore.getStepPaths('');

      expect(spy).not.toHaveBeenCalled();
    });

    it('should return unique step paths', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-paths', method: 'POST' }))
        .mockReturnValue(
          createFetchResponse({
            paths: [{ path: 'path1' }, { path: 'path2' }, { path: 'path1' }, { path: 'path3' }, { path: 'path2' }],
            continuationToken: null,
            totalCount: 5,
          })
        );

      const result = await datastore.getStepPaths('ProgramName = "Test"');

      expect(result).toEqual(['path1', 'path2', 'path3']);
    });

    it('should not call queryStepPathInBatches when no program names are returned', async () => {
      const spy = jest.spyOn(datastore as any, 'queryStepPathInBatches');
      jest.spyOn(datastore as any, 'queryResultsValues').mockResolvedValue([]);

      await datastore.getStepPaths('ProgramName = "Test"');

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle error in query-paths API when loading step path', async () => {
      const error = new Error('API failed');
      jest.spyOn(datastore as any, 'loadStepPaths').mockRejectedValue(error);

      const stepsPathLookupValues = await datastore.getStepPaths('ProgramName = "Test"');

      expect(stepsPathLookupValues).toEqual([]);
      expect(datastore.errorTitle).toBe('Warning during step paths value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to an unknown error.'
      );
    });

    it('should handle 504 errors in query-paths API when loading step path', async () => {
      const error = new Error(
        `API failed Error message: status code: 504 ${JSON.stringify({ message: 'Detailed error message' })}`
      );
      jest.spyOn(datastore as any, 'loadStepPaths').mockRejectedValue(error);

      const stepsPathLookupValues = await datastore.getStepPaths('ProgramName = "Test"');

      expect(stepsPathLookupValues).toEqual([]);
      expect(datastore.errorTitle).toBe('Warning during step paths value query');
      expect(datastore.errorDescription).toContain(
        'The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.'
      );
    });

    it('should handle error in query-result-values when loading step path', async () => {
      const error = new Error('API failed');
      jest.spyOn(datastore as any, 'queryResultsValues').mockRejectedValue(error);

      const stepsPathLookupValues = await datastore.getStepPaths('ProgramName = "Test"');

      expect(stepsPathLookupValues).toEqual([]);
      expect(datastore.errorTitle).toBe('Warning during step paths value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to an unknown error.'
      );
    });

    it('should contain error details when query results values error contains additional information', async () => {
      const error = new Error(
        `API failed Error message: ${JSON.stringify({ message: 'Detailed error message', statusCode: 500 })}`
      );
      jest.spyOn(datastore as any, 'queryResultsValues').mockRejectedValue(error);

      await datastore.getStepPaths('ProgramName = "Test"');

      expect(datastore.errorTitle).toBe('Warning during step paths value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to the following error:Detailed error message.'
      );
    });

    it('should contain error details when query-path error contains additional information', async () => {
      const error = new Error(
        `API failed Error message: ${JSON.stringify({ message: 'Detailed error message', statusCode: 500 })}`
      );
      jest.spyOn(datastore as any, 'queryResultsValues').mockResolvedValue(['name1', 'name2']);
      jest.spyOn(datastore as any, 'queryStepPaths').mockRejectedValue(error);

      await datastore.getStepPaths('ProgramName = "Test"');

      expect(datastore.errorTitle).toBe('Warning during step paths value query');
      expect(datastore.errorDescription).toContain(
        'Some values may not be available in the query builder lookups due to the following error:Detailed error message.'
      );
    });
  });

  describe('query builder queries', () => {
    test('should transform the resultsfilter and stepsfilter contains single query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        resultsQuery: `${ResultsQueryBuilderFieldNames.PROGRAM_NAME} = "name1"`,
        stepsQuery: `${StepsQueryBuilderFieldNames.TYPE} = "Type1"`,
      });
      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            resultFilter: 'ProgramName = "name1"',
            filter: 'stepType = "Type1"',
          }),
        })
      );
    });

    test('should transform fields when contains multiple queries', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        resultsQuery: `${ResultsQueryBuilderFieldNames.PROGRAM_NAME} = "{name1,name2}"`,
      });
      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            resultFilter: '(ProgramName = "name1" || ProgramName = "name2")',
          }),
        })
      );
    });

    test('should transform fields when queryBy contains a date', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));

      const query = buildQuery({
        resultsQuery: 'UpdatedAt = "${__now:date}"',
        stepsQuery: 'StartedAt = "${__now:date}"',
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            resultFilter: 'UpdatedAt = "2025-01-01T00:00:00.000Z"',
          }),
        })
      );

      jest.useRealTimers();
    });

    test('should transform query when queryBy contains nested expressions', async () => {
      const query = buildQuery({
        refId: 'A',
        resultsQuery: `(${ResultsQueryBuilderFieldNames.PART_NUMBER} = "123" || ${ResultsQueryBuilderFieldNames.KEYWORDS} != "456") && ${ResultsQueryBuilderFieldNames.HOSTNAME} contains "Test"`,
        stepsQuery: `(${StepsQueryBuilderFieldNames.TYPE} = "123" || ${StepsQueryBuilderFieldNames.KEYWORDS} != "456") && ${StepsQueryBuilderFieldNames.NAME} contains "Test"`,
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            resultFilter: '(PartNumber = "123" || Keywords != "456") && HostName contains "Test"',
            filter: '(stepType = "123" || keywords != "456") && name contains "Test"',
          }),
        })
      );
    });
  });

  describe('metricFindQuery', () => {
    it('should return empty array if queryByResults is not provided', async () => {
      const query = { stepsTake: 1000 } as StepsVariableQuery;
      const result = await datastore.metricFindQuery(query);

      expect(result).toEqual([]);
    });

    it('should set default orderby to "STARTED_AT" and descending to "false"', async () => {
      const query = { queryByResults: 'programName = "name"', stepsTake: 1000 } as StepsVariableQuery;

      await datastore.metricFindQuery(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            orderBy: 'STARTED_AT',
            descending: false,
          }),
        })
      );
    });

    it.each([-1, NaN, 10001])(
      'should return empty array if stepsTake value is invalid (%p)',
      async invalidStepsTake => {
        const query = {
          refId: 'A',
          queryType: QueryType.Steps,
          queryByResults: 'PartNumber = "partNumber1"',
          stepsTake: invalidStepsTake,
          partNumberQueryInSteps: ['PartNumber1'],
        } as unknown as StepsVariableQuery;
        const result = await datastore.metricFindQuery(query);

        expect(result).toEqual([]);
      }
    );

    it('should return mapped names when queryByResults is provided and API returns steps', async () => {
      backendServer.fetch.mockReturnValue(
        createFetchResponse({
          steps: [{ name: 'StepA' }, { name: 'StepB' }],
          totalCount: 2,
        } as QueryStepsResponse)
      );

      const query = { queryByResults: 'programName = "name"', stepsTake: 1000 } as StepsVariableQuery;
      const result = await datastore.metricFindQuery(query);

      expect(result).toEqual([
        { text: 'StepA', value: 'StepA' },
        { text: 'StepB', value: 'StepB' },
      ]);
    });

    it('should return empty array if API returns no steps', async () => {
      backendServer.fetch.mockReturnValue(
        createFetchResponse({
          steps: [],
          totalCount: 0,
        } as QueryStepsResponse)
      );

      const query = { queryByResults: 'programName = "name"', stepsTake: 1000 } as StepsVariableQuery;
      const result = await datastore.metricFindQuery(query);

      expect(result).toEqual([]);
    });

    it('should return undefined if API throws error', async () => {
      const error = new Error('API failed');
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-steps', method: 'POST' }))
        .mockImplementationOnce(() => {
          throw error;
        });

      const query = { queryByResults: 'programName = "name1"', stepsTake: 1000 } as StepsVariableQuery;

      let result;
      let caughtError;

      try {
        result = await datastore.metricFindQuery(query);
      } catch (error) {
        caughtError = (error as Error).message;
      }

      expect(caughtError).toBe(`The query failed due to an unknown error.`);
      expect(result).toEqual(undefined);
    });

    it('should use templateSrv.replace for queryByResults and queryBySteps', async () => {
      let resultsQuery = 'programName = "${name}"';
      let stepsQuery = 'stepName = "${step}"';
      templateSrv.replace.mockReturnValueOnce('programName = "programName1"').mockReturnValueOnce('stepName = "Step1"');
      backendServer.fetch.mockReturnValue(
        createFetchResponse({
          steps: [{ name: 'Step1' }],
          totalCount: 1,
        } as QueryStepsResponse)
      );

      const query = { queryByResults: resultsQuery, queryBySteps: stepsQuery, stepsTake: 1000 } as StepsVariableQuery;
      await datastore.metricFindQuery(query, { scopedVars: { var: { value: 'replaced' } } } as any);

      expect(templateSrv.replace).toHaveBeenCalledTimes(2);
      expect(templateSrv.replace.mock.calls[0][0]).toBe('programName = "${name}"');
      expect(templateSrv.replace.mock.calls[1][0]).toBe(stepsQuery);
    });

    it('should merge partnumber and resultsQuery filters', async () => {
      let resultsQuery = 'ProgramName = "name1"';
      let stepsQuery = 'stepName = "step1"';
      const query = {
        queryByResults: resultsQuery,
        queryBySteps: stepsQuery,
        stepsTake: 1000,
      } as StepsVariableQuery;
      const options = { scopedVars: { var: { value: 'ReplacedValue' } } };

      await datastore.metricFindQuery(query, options);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/nitestmonitor/v2/query-steps',
          data: expect.objectContaining({
            resultFilter: 'ProgramName = "name1"',
          }),
        })
      );
    });

    it('should not call query-steps API when results query is empty', async () => {
      const query = {
        queryByResults: '',
        stepsTake: 1000,
      } as StepsVariableQuery;

      await datastore.metricFindQuery(query);

      expect(backendServer.fetch).not.toHaveBeenCalled();
    });
  });

  const buildQuery = getQueryBuilder<QuerySteps>()({
    refId: 'A',
    queryType: QueryType.Steps,
    outputType: OutputType.Data,
    resultsQuery: 'ProgramName = "name1"',
    properties: [StepsProperties.stepId, StepsProperties.name, StepsProperties.properties, StepsProperties.workspace],
  });
});
