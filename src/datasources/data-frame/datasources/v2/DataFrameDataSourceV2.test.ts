import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { defaultQueryV2 } from 'datasources/data-frame/types';
import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';

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
        it('should return the query as ValidDataFrameQueryV2', () => {
            const query = { foo: 'bar' } as any;
            const result = ds.processQuery(query);
            expect(result).toEqual(query);
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
        it('should throw "Method not implemented."', async () => {
            await expect(ds.queryTables('')).rejects.toThrow('Method not implemented.');
        });
    });
});
