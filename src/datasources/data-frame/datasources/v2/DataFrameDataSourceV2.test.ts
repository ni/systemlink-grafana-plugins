import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameQuery, DataFrameQueryType, defaultQueryV2 } from '../../types';

describe('DataFrameDataSourceV2', () => {
    let instanceSettings: DataSourceInstanceSettings<any>;
    let backendSrv: jest.Mocked<BackendSrv>;
    let templateSrv: jest.Mocked<TemplateSrv>;
    let ds: DataFrameDataSourceV2;

    beforeEach(() => {
        instanceSettings = { id: 1, name: 'test', type: 'test', url: '', jsonData: {} } as any;
        backendSrv = {} as any;
        templateSrv = {} as any;
        ds = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
    });

    it('should be constructed with instanceSettings, backendSrv, and templateSrv', () => {
        expect(ds.instanceSettings).toBe(instanceSettings);
        expect(ds.backendSrv).toBe(backendSrv);
        expect(ds.templateSrv).toBe(templateSrv);
    });

    it('should have defaultQuery set to defaultQueryV2', () => {
        expect(ds.defaultQuery).toBe(defaultQueryV2);
    });

    describe('runQuery', () => {
        it('should return an object with empty fields array', async () => {
            const result = await ds.runQuery({} as any, {} as any);
            expect(result).toEqual({ fields: [] });
        });
    });

    describe('metricFindQuery', () => {
        it('should return an empty array', async () => {
            const result = await ds.metricFindQuery({} as any);
            expect(result).toEqual([]);
        });
    });

    describe('shouldRunQuery', () => {
        it('should always return false', () => {
            expect(ds.shouldRunQuery({} as any)).toBe(false);
        });
    });

    describe('processQuery', () => {
        it('should return the query with default values when all the fields from `ValidDataFrameQueryV2` are missing', () => {
            const query = {} as DataFrameQuery;
            const expectedQuery = {
                type: DataFrameQueryType.Data,
                columns: [],
                decimationMethod: 'LOSSY',
                applyTimeFilters: false
            } as any;

            const result = ds.processQuery(query);

            expect(result).toEqual(expectedQuery);
        });

        it('should return the query with default values for missing fields when some of the fields from `ValidDataFrameQueryV2` are missing', () => {
            const query = { decimationMethod: 'MAX_MIN', applyTimeFilters: true } as DataFrameQuery;
            const expectedQuery = {
                type: DataFrameQueryType.Data,
                columns: [],
                decimationMethod: 'MAX_MIN',
                applyTimeFilters: true
            } as any;

            const result = ds.processQuery(query);

            expect(result).toEqual(expectedQuery);
        });
    });

    describe('getTableProperties', () => {
        it('should throw "Method not implemented."', async () => {
            await expect(ds.getTableProperties()).rejects.toThrow('Method not implemented.');
        });
    });

    describe('getDecimatedTableData', () => {
        it('should throw "Method not implemented."', async () => {
            await expect(
                ds.getDecimatedTableData({} as any, [] as any, {} as any)
            ).rejects.toThrow('Method not implemented.');
        });
    });

    describe('queryTables', () => {
        let postMock: jest.SpyInstance;
        const mockTables = [{ id: '1', name: 'Table 1' }, { id: '2', name: 'Table 2' }];

        beforeEach(() => {
            postMock = jest.spyOn(ds, 'post').mockResolvedValue({ tables: mockTables });
        });

        it('should make a POST request to the correct URL and return tables', async () => {
            const filter = 'test-filter';
            const take = 10;
            const result = await ds.queryTables(filter, take);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take });
            expect(result).toBe(mockTables);
        });

        it('should use TAKE_LIMIT as default take value when not provided', async () => {
            const filter = 'test-filter';
            const result = await ds.queryTables(filter);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take: 1000 });
            expect(result).toBe(mockTables);
        });
    });
});