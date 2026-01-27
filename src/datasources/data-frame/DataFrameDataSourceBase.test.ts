import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameDataSourceBase } from './DataFrameDataSourceBase';
import { DataFrameQuery, DataFrameDataSourceOptions, TableProperties, TableDataRows, Column, DataFrameVariableQuery, ValidDataFrameVariableQuery, DataFrameDataQuery, CombinedFilters, ColumnType, ColumnFilter, ValidDataFrameQuery } from './types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { Workspace } from 'core/types';
import { lastValueFrom, Observable, of } from 'rxjs';

jest.mock('core/utils', () => ({
    ...jest.requireActual('core/utils'),
    getVariableOptions: jest.fn(() => [
        { label: 'Var1', value: 'Value1' },
        { label: 'Var2', value: 'Value2' },
    ]),
}));

describe('DataFrameDataSourceBase', () => {
    let instanceSettings: DataSourceInstanceSettings<DataFrameDataSourceOptions>;
    let backendSrv: jest.Mocked<BackendSrv>;
    let templateSrv: jest.Mocked<TemplateSrv>;

    beforeEach(() => {
        instanceSettings = {
            id: 1,
            uid: 'abc',
            type: 'test-type',
            name: 'Test DS',
            url: 'http://localhost',
            jsonData: {
                featureToggles: {} as any
            },
            meta: {} as any,
            readOnly: false,
            access: 'proxy',
        };
        backendSrv = {
            fetch: jest.fn(),
        } as any;
        templateSrv = {
            getVariables: jest.fn(() => [
                { name: 'Var1' },
                { name: 'Var2' },
            ]),
            replace: jest.fn((query: string) => query),
        } as any;
    });

    class TestDataFrameDataSource extends DataFrameDataSourceBase {
        defaultQuery = {} as DataFrameQuery;

        runQuery(_query: DataFrameDataQuery, _options: DataQueryRequest): Promise<DataFrameDTO> {
            throw new Error('Method not implemented.');
        }

        shouldRunQuery(_query: DataFrameQuery): boolean {
            throw new Error('Method not implemented.');
        }

        public processQuery(query: DataFrameDataQuery) {
            return query as any;
        }

        public processVariableQuery(query: DataFrameVariableQuery): ValidDataFrameVariableQuery {
            return query as ValidDataFrameVariableQuery;
        }

        public getTableProperties(_id?: string): Promise<TableProperties> {
            return Promise.resolve({} as TableProperties);
        }

        public getDecimatedTableData(
            _query: DataFrameDataQuery,
            _columns: Column[],
            _timeRange: TimeRange,
            _intervals?: number
        ): Promise<TableDataRows> {
            return Promise.resolve([] as unknown as TableDataRows);
        }

        public queryTables$(_filters: CombinedFilters): Observable<TableProperties[]> {
            return of([]);
        }

        public queryTables(_query: string): Promise<TableProperties[]> {
            return Promise.resolve([]);
        }

        public constructNullFiltersWrapper(columns: Column[]): ColumnFilter[] {
            return this.constructNullFilters(columns);
        }

        public getNumericColumnsWrapper(columns: Column[]): Column[] {
            return this.getNumericColumns(columns);
        }
    }

    it('should set baseUrl correctly', () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);

        expect(ds.baseUrl).toBe('http://localhost/nidataframe/v1');
    });

    it('should call get with correct URL and params in testDatasource', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const expectedResponse = { data: [{ id: 1 }] };

        ds.get = jest.fn().mockResolvedValue(expectedResponse);

        const result = await ds.testDatasource();

        expect(ds.get).toHaveBeenCalledWith('http://localhost/nidataframe/v1/tables', { params: { take: 1 } });
        expect(result).toEqual({
            status: 'success',
            message: 'Data source connected and authentication successful!',
        });
    });

    it('should throw if get fails in testDatasource', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const error = new Error('Failed');
        ds.get = jest.fn().mockRejectedValue(error);

        await expect(ds.testDatasource()).rejects.toThrow('Failed');
    });

    it('should call abstract methods without error', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);

        expect(ds.processQuery({} as DataFrameDataQuery)).toEqual({});
        expect(ds.processVariableQuery({} as DataFrameVariableQuery)).toEqual({});
        await expect(ds.getTableProperties()).resolves.toEqual({});
        await expect(ds.getDecimatedTableData({} as DataFrameDataQuery, [], {} as TimeRange)).resolves.toEqual([]);
        await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: '' }))).resolves.toEqual([]);
        await expect(ds.queryTables('')).resolves.toEqual([]);
    });

    it('should return global variable options when the `globalVariableOptions` is called', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const options = await ds.globalVariableOptions();

        expect(options).toEqual([
            { label: '$Var1', value: '$Var1' },
            { label: '$Var2', value: '$Var2' },
        ]);
    });

    it('should return empty array for getColumnOptionsWithVariables', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);

        const options = await ds.getColumnOptionsWithVariables({dataTableFilter: 'filter'});

        expect(options).toEqual({ uniqueColumnsAcrossTables: [], commonColumnsAcrossTables: [] });
    });

    it('should return query as it is for processVariableQuery', async () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const query = { key: 'dataframe-variable-query' } as any;

        const result = ds.processVariableQuery(query);

        expect(result).toBe(query);
    });

    it('should construct null filters for nullable and float columns for constructNullFilters', () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const columns: Column[] = [
            {
                name: 'col1',
                columnType: ColumnType.Nullable,
                dataType: 'STRING',
                properties: {}
            },
            {
                name: 'col2',
                columnType: ColumnType.Normal,
                dataType: 'FLOAT32',
                properties: {}
            },
            {
                name: 'col3',
                columnType: ColumnType.Normal,
                dataType: 'INT32',
                properties: {}
            },
            {
                name: 'col4',
                columnType: ColumnType.Nullable,
                dataType: 'INT32',
                properties: {}
            },
        ];

        const result = ds.constructNullFiltersWrapper(columns);

        expect(result).toEqual([
            { column: 'col1', operation: 'NOT_EQUALS', value: null },
            { column: 'col2', operation: 'NOT_EQUALS', value: 'NaN' },
            { column: 'col4', operation: 'NOT_EQUALS', value: null },
        ]);
    });

    it('should return only numeric columns for getNumericColumns', () => {
        const ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        const columns: Column[] = [
            {
                name: 'col1',
                columnType: ColumnType.Normal,
                dataType: 'FLOAT32',
                properties: {}
            },
            {
                name: 'col2',
                columnType: ColumnType.Normal,
                dataType: 'STRING',
                properties: {}
            },
            {
                name: 'col3',
                columnType: ColumnType.Normal,
                dataType: 'INT32',
                properties: {}
            },
            {
                name: 'col4',
                columnType: ColumnType.Normal,
                dataType: 'TIMESTAMP',
                properties: {}
            },
        ];

        const result = ds.getNumericColumnsWrapper(columns);

        expect(result).toEqual([
            columns[0],
            columns[2],
            columns[3]
        ]);
    });

    describe('loadWorkspaces', () => {
        let ds: DataFrameDataSourceBase;
        let getWorkspacesSpy: jest.SpyInstance;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
            getWorkspacesSpy = jest.spyOn(WorkspaceUtils.prototype, 'getWorkspaces');
        });

        it('should return workspaces', async () => {
            getWorkspacesSpy.mockResolvedValue(
                new Map([
                    ['1', { id: '1', name: 'WorkspaceName' } as Workspace],
                    ['2', { id: '2', name: 'AnotherWorkspaceName' } as Workspace],
                ])
            );

            const result = await ds.loadWorkspaces();

            expect(result.get('1')?.name).toBe('WorkspaceName');
            expect(result.get('2')?.name).toBe('AnotherWorkspaceName');
        });

        it('should handle errors and set error and innerError fields', async () => {
            getWorkspacesSpy.mockRejectedValue(new Error('Error'));

            await ds.loadWorkspaces();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                'Some values may not be available in the query builder lookups due to an unknown error.'
            );
        });

        it('should handle errors and set innerError fields with error message detail', async () => {
            ds.errorTitle = '';
            getWorkspacesSpy.mockRejectedValue(
                new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
            );

            await ds.loadWorkspaces();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
            );
        });

        it('should throw timeOut error when API returns 504 status', async () => {
            ds.errorTitle = '';
            getWorkspacesSpy.mockRejectedValue(new Error('Request failed with status code: 504'));

            await ds.loadWorkspaces();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
            );
        });

        it('should throw too many requests error when API returns 429 status', async () => {
            ds.errorTitle = '';
            getWorkspacesSpy.mockRejectedValue(new Error('Request failed with status code: 429'));

            await ds.loadWorkspaces();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups failed due to too many requests. Please try again later.`
            );
        });

        it('should throw not found error when API returns 404 status', async () => {
            ds.errorTitle = '';
            getWorkspacesSpy.mockRejectedValue(new Error('Request failed with status code: 404'));

            await ds.loadWorkspaces();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
            );
        });
    });

    describe('loadPartNumbers', () => {
        let ds: DataFrameDataSourceBase;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
            // Clear the cache before each test
            DataFrameDataSourceBase._partNumbersCache = undefined as any;
        });

        it('should return part numbers from API', async () => {
            const mockPartNumbers = ['PN-001', 'PN-002', 'PN-003'];
            ds.post = jest.fn().mockResolvedValue(mockPartNumbers);

            const result = await ds.loadPartNumbers();

            expect(ds.post).toHaveBeenCalledWith(
                'http://localhost/nitestmonitor/v2/query-result-values',
                {
                    field: 'partNumber',
                    filter: undefined,
                },
                { showErrorAlert: false }
            );
            expect(result).toEqual(mockPartNumbers);
        });

        it('should cache part numbers and not call API on subsequent requests', async () => {
            const mockPartNumbers = ['PN-001', 'PN-002'];
            ds.post = jest.fn().mockResolvedValue(mockPartNumbers);

            const result1 = await ds.loadPartNumbers();
            const result2 = await ds.loadPartNumbers();

            expect(ds.post).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(mockPartNumbers);
            expect(result2).toEqual(mockPartNumbers);
        });

        it('should handle errors and return empty array', async () => {
            ds.post = jest.fn().mockRejectedValue(new Error('API Error'));

            const result = await ds.loadPartNumbers();

            expect(result).toEqual([]);
            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                'Some values may not be available in the query builder lookups'
            );
        });

        it('should handle errors and set error and innerError fields', async () => {
            ds.post = jest.fn().mockRejectedValue(new Error('Error'));

            await ds.loadPartNumbers();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                'Some values may not be available in the query builder lookups due to an unknown error.'
            );
        });

        it('should handle errors and set innerError fields with error message detail', async () => {
            ds.errorTitle = '';
            ds.post = jest.fn().mockRejectedValue(
                new Error('Request failed with status code: 500, Error message: {"message": "Internal Server Error"}')
            );

            await ds.loadPartNumbers();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                'Some values may not be available in the query builder lookups due to the following error: Internal Server Error.'
            );
        });

        it('should throw timeOut error when API returns 504 status', async () => {
            ds.errorTitle = '';
            ds.post = jest.fn().mockRejectedValue(new Error('Request failed with status code: 504'));

            await ds.loadPartNumbers();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups experienced a timeout error. Some values might not be available. Narrow your query with a more specific filter and try again.`
            );
        });

        it('should throw too many requests error when API returns 429 status', async () => {
            ds.errorTitle = '';
            ds.post = jest.fn().mockRejectedValue(new Error('Request failed with status code: 429'));

            await ds.loadPartNumbers();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups failed due to too many requests. Please try again later.`
            );
        });

        it('should throw not found error when API returns 404 status', async () => {
            ds.errorTitle = '';
            ds.post = jest.fn().mockRejectedValue(new Error('Request failed with status code: 404'));

            await ds.loadPartNumbers();

            expect(ds.errorTitle).toBe('Warning during dataframe query');
            expect(ds.errorDescription).toContain(
                `The query builder lookups failed because the requested resource was not found. Please check the query parameters and try again.`
            );
        });
    });

    describe('transformDataTableQuery', () => {
        let ds: TestDataFrameDataSource;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        });

        it('should return the replaced query string', () => {
            const query = 'id = $var';
            (templateSrv.replace as jest.Mock).mockReturnValue('id = <valid-id-value>');  
            
            const result = ds.transformDataTableQuery(query);
            
            expect(result).toBe('id = <valid-id-value>');
        });

        it('should propagate errors thrown by templateSrv.replace', () => {
            const query = 'errorQuery';
            
            (templateSrv.replace as jest.Mock).mockImplementation(() => { throw new Error('replace failed'); });
            
            expect(() => ds.transformDataTableQuery(query)).toThrow('replace failed');
        });
    });

    describe('transformResultQuery', () => {
        let ds: TestDataFrameDataSource;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        });

        it('should return the replaced filter string', () => {
            const filter = 'status = $status';
            (templateSrv.replace as jest.Mock).mockReturnValue('status = "Passed"');  
            
            const result = ds.transformResultQuery(filter);
            
            expect(result).toBe('status = "Passed"');
        });

        it('should propagate errors thrown by templateSrv.replace', () => {
            const filter = 'errorFilter';
            
            (templateSrv.replace as jest.Mock).mockImplementation(() => { throw new Error('replace failed'); });
            
            expect(() => ds.transformResultQuery(filter)).toThrow('replace failed');
        });
    });

    describe('transformColumnQuery', () => {
        let ds: TestDataFrameDataSource;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(instanceSettings, backendSrv, templateSrv);
        });

        it('should return the replaced filter string', () => {
            const filter = 'name = $Column';
            (templateSrv.replace as jest.Mock).mockReturnValue('name = "Column1"');  
            
            const result = ds.transformColumnQuery(filter);
            
            expect(result).toBe('name = "Column1"');
        });

        it('should propagate errors thrown by templateSrv.replace', () => {
            const filter = 'errorFilter';
            
            (templateSrv.replace as jest.Mock).mockImplementation(() => { throw new Error('replace failed'); });
            
            expect(() => ds.transformColumnQuery(filter)).toThrow('replace failed');
        });
    });

    describe('parseColumnIdentifier', () => {
        it('should return the empty column name and data type by default', () => {
            const ds = new TestDataFrameDataSource(
                instanceSettings,
                backendSrv,
                templateSrv
            );

            const parseResult = ds.parseColumnIdentifier('any-input');
            expect(parseResult).toEqual({
                columnName: '',
                transformedDataType: ''
            });
        });
    });

    describe('hasRequiredFilters', () => {
        let ds: TestDataFrameDataSource;

        beforeEach(() => {
            ds = new TestDataFrameDataSource(
                instanceSettings,
                backendSrv,
                templateSrv
            );
        });

        it('should return false for any query object', () => {
            const query = {
                refId: 'A',
                dataTableFilter: 'name = "TestTable"',
            } as ValidDataFrameQuery;
            
            const result = ds.hasRequiredFilters(query);
            
            expect(result).toBe(false);
        });
    });
});
