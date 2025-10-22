import { DataFrameDTO, DataQueryRequest, DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameDataSourceBase } from './DataFrameDataSourceBase';
import { DataFrameQuery, DataFrameDataSourceOptions, TableProperties, TableDataRows, Column } from './types';
import { WorkspaceUtils } from 'shared/workspace.utils';
import { Workspace } from 'core/types';

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
        templateSrv = {} as any;
    });

    class TestDataFrameDataSource extends DataFrameDataSourceBase {
        defaultQuery = {} as DataFrameQuery;

        runQuery(_query: DataFrameQuery, _options: DataQueryRequest): Promise<DataFrameDTO> {
            throw new Error('Method not implemented.');
        }

        shouldRunQuery(_query: DataFrameQuery): boolean {
            throw new Error('Method not implemented.');
        }

        public processQuery(query: DataFrameQuery) {
            return query as any;
        }

        public getTableProperties(_id?: string): Promise<TableProperties> {
            return Promise.resolve({} as TableProperties);
        }

        public getDecimatedTableData(
            _query: DataFrameQuery,
            _columns: Column[],
            _timeRange: TimeRange,
            _intervals?: number
        ): Promise<TableDataRows> {
            return Promise.resolve([] as unknown as TableDataRows);
        }

        public queryTables(_query: string): Promise<TableProperties[]> {
            return Promise.resolve([]);
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

        expect(ds.get).toHaveBeenCalledWith('http://localhost/nidataframe/v1/tables', { take: 1 });
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

        expect(ds.processQuery({} as DataFrameQuery)).toEqual({});
        await expect(ds.getTableProperties()).resolves.toEqual({});
        await expect(ds.getDecimatedTableData({} as DataFrameQuery, [], {} as TimeRange)).resolves.toEqual([]);
        await expect(ds.queryTables('')).resolves.toEqual([]);
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
});
