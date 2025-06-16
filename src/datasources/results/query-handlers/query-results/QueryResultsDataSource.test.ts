import { MockProxy } from 'jest-mock-extended';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';
import { QueryResultsDataSource } from './QueryResultsDataSource';
import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { OutputType, QueryType } from 'datasources/results/types/types';
import { ResultsQueryBuilderFieldNames } from 'datasources/results/constants/ResultsQueryBuilder.constants';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { Workspace } from 'core/types';

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
const mockQueryResultsValuesResponse = ["partNumber1", "partNumber2"];


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
        .toThrow('The query failed due to the following error: (status 400) \"Error\"');
    });

    test('should publish alertError event when error occurs', async () => {
        const publishMock = jest.fn();
        (datastore as any).appEvents = { publish: publishMock };
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results' }))
          .mockReturnValue(createFetchError(400));
    
        await expect(datastore.queryResults())
          .rejects
          .toThrow('The query failed due to the following error: (status 400) "Error".');
    
        expect(publishMock).toHaveBeenCalledWith({
          type: 'alert-error',
          payload: ['Error during result query', expect.stringContaining('The query failed due to the following error: (status 400) "Error".')],
        });
      });

    test('should throw timeOut error when API returns 504 status', async () => {
        backendServer.fetch
          .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results' }))
          .mockReturnValue(createFetchError(504));
    
        await expect(datastore.queryResults())
          .rejects
          .toThrow('The query to fetch results experienced a timeout error. Narrow your query with a more specific filter and try again.');
      })
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

    test('returns empty data for invalid query', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        properties: []
      });

      const response = await datastore.query(query);

      expect(response.data).toMatchSnapshot();
    });

    test('should set the default order by to "STARTED_AT" and descending to "true"', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledTimes(1);
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderBy: 'STARTED_AT',
            descending: true,
          }),
        })
      )
    });

    test('should set the default time range filter to "Started" when useTimerange is true', async () => {
      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.Data,
        useTimeRange: true,
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledTimes(1);
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: "(startedAt > \"${__from:date}\" && startedAt < \"${__to:date}\")"
          }),
        })
      )
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

    test('returns totalCount as 0 in query() when OutputType is TotalCount and no results', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(createFetchResponse({
          results: [],
          totalCount: 0
        } as QueryResultsResponse));

      const query = buildQuery({
        refId: 'A',
        outputType: OutputType.TotalCount
      });

      const response = await datastore.query(query);

      expect(response.data[0].fields).toEqual([{ name: 'A', values: [0] }]);
      expect(response.data[0].refId).toBe('A');
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
        .toThrow('The query failed due to the following error: (status 400) \"Error\"');
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

    test('includes templateSrv replaced values in the filter', async () => {
      const timeRange = {
        Started: 'startedAt',
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
          },
        );

        const response = await datastore.query(query);
        const fields = response.data[0].fields as Field[];
        expect(fields).toEqual([
          { name: 'properties', values: [""], type: 'string' },
        ]);
    });

    describe('Dependencies', () => {
    afterEach(() => {
      (ResultsDataSourceBase as any)._partNumbersCache = null;
      (ResultsDataSourceBase as any)._workspacesCache = null;
    });

     test('should return the same promise instance when partnumber promise already exists', async () => {
      const mockPromise = Promise.resolve(['partNumber1', 'partNumber2']);
      (ResultsDataSourceBase as any)._partNumbersCache = mockPromise;
      backendServer.fetch.mockClear();
      const partNumbersPromise = datastore.getPartNumbers();
      expect(partNumbersPromise).toEqual(mockPromise);
      expect(datastore.partNumbersCache).toEqual(mockPromise);
      expect(backendServer.fetch).not.toHaveBeenCalledWith(expect.objectContaining({ url: '/nitestmonitor/v2/query-result-values' }));
    });
    
    test('should create and return a new promise when partnumber promise does not exist', async () => {
      (ResultsDataSourceBase as any)._partNumbersCache = null;
      backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-result-values', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockQueryResultsValuesResponse));
      const promise = datastore.getPartNumbers();
      expect(promise).not.toBeNull();
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({ url: '/nitestmonitor/v2/query-result-values' })

        );
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

    test('should create and return a new promise when wrokspace promise does not exist', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const workspaceSpy = jest.spyOn(ResultsDataSourceBase.prototype, 'getWorkspaces');

      const promise = datastore.loadWorkspaces();

      expect(promise).not.toBeNull();
      expect(workspaceSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in getWorkspaces', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const error = new Error('API failed');
      jest.spyOn(QueryResultsDataSource.prototype, 'getWorkspaces').mockRejectedValue(error);

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain('Some values may not be available in the query builder lookups due to an unknown error.');
    });

    it('should handle errors in getPartNumbers', async () => {
      (ResultsDataSourceBase as any)._partNumbersCache = null;
      const error = new Error('API failed');
      jest.spyOn(QueryResultsDataSource.prototype, 'queryResultsValues').mockRejectedValue(error);

      await datastore.getPartNumbers();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain('Some values may not be available in the query builder lookups due to an unknown error.');
    });

    it('should contain error details when error contains additional information', async () => {
      (ResultsDataSourceBase as any)._workspacesCache = null;
      const error = new Error(`API failed Error message: ${JSON.stringify({ message: 'Detailed error message', statusCode: 500 })}`);
      jest.spyOn(QueryResultsDataSource.prototype, 'getWorkspaces').mockRejectedValue(error);

      await datastore.loadWorkspaces();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain('Some values may not be available in the query builder lookups due to the following error:Detailed error message.');
    });

    it('should handle 504 error in getPartNumbers', async () => {
      (ResultsDataSourceBase as any)._partNumbersCache = null;
      const error = new Error(`API failed Error message: status code: 504 ${JSON.stringify({ message: 'Detailed error message'})}`);
      jest.spyOn(QueryResultsDataSource.prototype, 'queryResultsValues').mockRejectedValue(error);

      await datastore.getPartNumbers();

      expect(datastore.errorTitle).toBe('Warning during result value query');
      expect(datastore.errorDescription).toContain('The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.');
    })
  });
  
    describe('query builder queries', () => {
      test('should transform field when queryBy contains a single value', async () => {
        const query = buildQuery(
          {
            refId: 'A',
            properties: [
              ResultsPropertiesOptions.PART_NUMBER
            ] as ResultsProperties[],
            queryBy: `${ResultsPropertiesOptions.PART_NUMBER} = '123'`
          },
        );
  
        await datastore.query(query);
  
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/nitestmonitor/v2/query-results',
            data: expect.objectContaining({
              filter: "partNumber = '123'"
            }),
          })
        );
      });
  
      test('should transform fields when queryBy contains a multiple values', async () => {
        const query = buildQuery(
          {
            refId: 'A',
            properties: [
              ResultsPropertiesOptions.PART_NUMBER
            ] as ResultsProperties[],
            queryBy: `${ResultsQueryBuilderFieldNames.PART_NUMBER} = "{partNumber1,partNumber2}"`
          },
        );
  
        await datastore.query(query);
  
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/nitestmonitor/v2/query-results',
            data: expect.objectContaining({
              filter: "(PartNumber = \"partNumber1\" || PartNumber = \"partNumber2\")"
            }),
          })
        );
      });

      test('should transform fields when queryBy contains a date', async () => {   
        jest.useFakeTimers().setSystemTime(new Date('2025-01-01'));     

        const query = buildQuery(
          {
            refId: 'A',
            properties: [
              ResultsPropertiesOptions.UPDATED_AT
            ] as ResultsProperties[],
            queryBy: 'UpdatedAt = "${__now:date}"'
          },
        );
      
        await datastore.query(query);
      
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/nitestmonitor/v2/query-results',
            data: expect.objectContaining({
              filter: 'UpdatedAt = "2025-01-01T00:00:00.000Z"'
            }),
          })
        );

        jest.useRealTimers();
      });

      test('should transform query when queryBy contains nested expressions', async () => {
        const query = buildQuery(
          {
            refId: 'A',
            queryBy: `(${ResultsQueryBuilderFieldNames.PART_NUMBER} = "123" || ${ResultsQueryBuilderFieldNames.KEYWORDS} != "456") && ${ResultsQueryBuilderFieldNames.HOSTNAME} contains "Test"`,
          },
        );
      
        await datastore.query(query);
      
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/nitestmonitor/v2/query-results',
            data: expect.objectContaining({
              filter: '(PartNumber = "123" || Keywords != "456") && HostName contains "Test"'
            }),
          })
        );
      });
    });

    describe('buildQueryFilter', () => {
      test('should combine queryBy and useTimeRangeFilter into a single filter', async () => {
        const filter = '(startedAt > "\${__from:date}" && startedAt < "\${__to:date}")';
        const replacedFilter = '(startedAt > "2025-04-01" && startedAt < "2025-04-02")';
        templateSrv.replace.calledWith(filter).mockReturnValue(replacedFilter); 

        const queryBy = `(${ResultsQueryBuilderFieldNames.PART_NUMBER} = "123"` 
          && `${ResultsQueryBuilderFieldNames.KEYWORDS} != "keyword1") `;
        const query = buildQuery({
          refId: 'A',
          queryBy,
          useTimeRange: true,
        });
        const expectedFilter = `${queryBy} && ${replacedFilter}`;

        await datastore.query(query);
      
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              filter: expectedFilter,
            }),
          })
        );
      });

      test('should return only queryBy filter when useTimeRange filter is not defined', async () => {
        const queryBy = `(${ResultsQueryBuilderFieldNames.PART_NUMBER} = "123"` 
          && `${ResultsQueryBuilderFieldNames.KEYWORDS} != "keyword1") `;
        const query = buildQuery({
          refId: 'A',
          queryBy,
          useTimeRange: false,
        });
        const expectedFilter = `${queryBy}`;

        await datastore.query(query);
      
        expect(backendServer.fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              filter: expectedFilter,
            }),
          })
        );
      });
    });

    test('should return only useTimeRange filter when queryby is not defined', async () => {
      const filter = '(startedAt > "\${__from:date}" && startedAt < "\${__to:date}")';
      const replacedFilter = '(startedAt > "2025-04-01" && startedAt < "2025-04-02")';
      templateSrv.replace.calledWith(filter).mockReturnValue(replacedFilter); 
      const query = buildQuery({
        refId: 'A',
        queryBy: '',
        useTimeRange: true,
      });

      await datastore.query(query);

      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filter: replacedFilter,
          }),
        })
      );
    });
  });

  describe('metricFindQuery', () => {
    test('should return empty array when properties is not selected', async () => {
      const query = { properties: undefined, queryBy: '', resultsTake: 1000 } as ResultsVariableQuery;
      const result = await datastore.metricFindQuery(query, {});

      expect(result).toEqual([]);
    });

    test('should set the default order by to "started at" and descending to true', async () =>{
      const query = { properties: ResultsPropertiesOptions.PART_NUMBER, queryBy: '', resultsTake: 1000 } as ResultsVariableQuery;

      await datastore.metricFindQuery(query, {});

      expect(backendServer.fetch).toHaveBeenCalledTimes(1);
      expect(backendServer.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderBy: 'STARTED_AT',
            descending: true,
          }),
        })
      );
    })

     it.each([-1, NaN, 10001])('should return empty array if resultsTake value is invalid (%p)', async (invalidResultsTake) => {
            const query = {
              refId: 'A',
              queryType: QueryType.Results,
              queryByResults: 'PartNumber = "partNumber1"',
              resultsTake: invalidResultsTake,
            } as unknown as ResultsVariableQuery;
            const result = await datastore.metricFindQuery(query);
    
            expect(result).toEqual([]);
          });

    test('should return empty array when there are no results', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(createFetchResponse({ results: [], totalCount: 0 }));

      const query = { properties: ResultsPropertiesOptions.PART_NUMBER, queryBy: '', resultsTake: 1000 } as ResultsVariableQuery;
      const result = await datastore.metricFindQuery(query, {});

      expect(result).toEqual([]);
    });

    test('should return flattened and deduplicated values as MetricFindValue[]', async () => {
      const mockResults = [
        { dataTableIds: ['A', 'B'] },
        { dataTableIds: ['B', 'C'] },
        { dataTableIds: ['C'] },
      ];
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(createFetchResponse({ results: mockResults, totalCount: 3 }));

      const query = { properties: 'DATA_TABLE_IDS', queryBy: '', resultsTake: 1000 } as ResultsVariableQuery;
      const result = await datastore.metricFindQuery(query, {});

      expect(result).toEqual([
        { text: 'A', value: 'A' },
        { text: 'B', value: 'B' },
        { text: 'C', value: 'C' },
      ]);
    });

    test('should return values when results is scalar', async () => {
      const mockResults = [
        { programName: 'programName1' },
        { programName: 'programName2' },
      ];
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(createFetchResponse({ results: mockResults, totalCount: 2 }));

      const query = { properties: 'PROGRAM_NAME', queryBy: '',resultsTake: 1000 } as ResultsVariableQuery;
      const result = await datastore.metricFindQuery(query, {});

      expect(result).toEqual([
        { text: 'programName1', value: 'programName1' },
        { text: 'programName2', value: 'programName2' },
      ]);
    });

    test('should replace variables', async () => {
      const mockResults = [
        { programName: 'TestProgram' }
      ];
      const queryBy = 'ProgramName = "${var}"';
      const replacedQueryBy = 'ProgramName = "ReplacedValue"';
      templateSrv.replace.calledWith(queryBy, expect.anything()).mockReturnValue(replacedQueryBy);

      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-results', method: 'POST' }))
        .mockReturnValue(createFetchResponse({ results: mockResults, totalCount: 1 }));

      const query = { properties: 'PROGRAM_NAME', queryBy, resultsTake: 1000 } as ResultsVariableQuery;
      const options = { scopedVars: { var: { value: 'ReplacedValue' } } };
      const result = await datastore.metricFindQuery(query, options);

      expect(templateSrv.replace).toHaveBeenCalledWith(queryBy, options.scopedVars);
      expect(result).toEqual([{ text: 'TestProgram', value: 'TestProgram' }]);
    });
  });

  const buildQuery = getQueryBuilder<QueryResults>()({
    refId: 'A',
    queryType: QueryType.Results,
    outputType: OutputType.Data
  });
});
