import { MockProxy } from 'jest-mock-extended';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { createFetchError, createFetchResponse, getQueryBuilder, requestMatching, setupDataSource } from 'test/fixtures';
import { Field } from '@grafana/data';
import { QueryResultsDataSource } from './QueryResultsDataSource';
import { QueryResults, QueryResultsResponse, ResultsProperties, ResultsPropertiesOptions, ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { OutputType, QueryType, UseTimeRangeFor } from 'datasources/results/types/types';
import { ResultsQueryBuilderFieldNames } from 'datasources/results/constants/ResultsQueryBuilder.constants';

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

    backendServer.fetch
      .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-result-values', method: 'POST' }))
      .mockReturnValue(createFetchResponse(mockQueryResultsValuesResponse));
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

    test('includes templateSrv replaced values in the filter', async () => {
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

    test('returns part numbers', async () => {  
      await datastore.getPartNumbers();
  
      expect(datastore.partNumbersCache).toEqual(["partNumber1", "partNumber2"]);
    });

    test('should not query part number values if cache exists', async () => {
      backendServer.fetch
        .calledWith(requestMatching({ url: '/nitestmonitor/v2/query-result-values' }))
        .mockReturnValue(createFetchResponse(['value1']));
      datastore.partNumbersCache.push('partNumber');
      backendServer.fetch.mockClear();
  
      await datastore.query(buildQuery())
  
      expect(backendServer.fetch).not.toHaveBeenCalled();
    });

    test('returns workspaces', async () => {
      await datastore.loadWorkspaces();
  
      expect(datastore.workspacesCache.get('1')).toEqual({"id": "1", "name": "Default workspace"});
      expect(datastore.workspacesCache.get('2')).toEqual({"id": "2", "name": "Other workspace"});
    });
  
    test('should not query workspace values if cache exists', async () => {
      const mockWorkspacesResponse = { id: 'workspace1', name: 'workspace1', default: false, enabled: true };
      backendServer.fetch
        .calledWith(requestMatching({ url: '/niauth/v1/user' }))
        .mockReturnValue(createFetchResponse(mockWorkspacesResponse));
      datastore.workspacesCache.set('workspace', mockWorkspacesResponse);
      backendServer.fetch.mockClear();
      const query = buildQuery(
        {
          refId: 'A',
          outputType: OutputType.Data
        },
      );

      await datastore.query(query)
  
      expect(backendServer.fetch).not.toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/niauth/v1/user',
        })
      );
    });

    describe('query builder queries', () => {
      test('should transform field when queryBy contains a single value', async () => {
        const query = buildQuery(
          {
            refId: 'A',
            properties: [
              ResultsPropertiesOptions.PART_NUMBER
            ] as ResultsProperties[],
            orderBy: undefined,
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
            orderBy: undefined,
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
            orderBy: undefined,
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
          useTimeRangeFor: UseTimeRangeFor.Started,
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
        useTimeRangeFor: UseTimeRangeFor.Started,
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
