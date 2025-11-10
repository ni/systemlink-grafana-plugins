import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameDataSourceV1 } from './datasources/v1/DataFrameDataSourceV1';
import { DataFrameDataSourceV2 } from './datasources/v2/DataFrameDataSourceV2';
import { DataSourceInstanceSettings, TimeRange } from '@grafana/data';

jest.mock('./datasources/v1/DataFrameDataSourceV1');
jest.mock('./datasources/v2/DataFrameDataSourceV2');

const mockInstanceSettings = (featureToggle = false): DataSourceInstanceSettings<any> => ({
    id: 1,
    name: 'TestDS',
    type: 'test-type',
    url: 'http://example.com',
    jsonData: {
        featureToggles: {
            queryByDataTableProperties: featureToggle,
        },
    },
} as any);

describe('DataFrameDataSource', () => {
    let v1Mock: jest.Mocked<DataFrameDataSourceV1>;
    let v2Mock: jest.Mocked<DataFrameDataSourceV2>;

    beforeEach(() => {
        (DataFrameDataSourceV1 as unknown as jest.Mock).mockClear();
        (DataFrameDataSourceV2 as unknown as jest.Mock).mockClear();

        v1Mock = {
            runQuery: jest.fn().mockResolvedValue('v1-runQuery'),
            shouldRunQuery: jest.fn().mockReturnValue(true),
            metricFindQuery: jest.fn().mockResolvedValue(['v1-metric']),
            getTableProperties: jest.fn().mockResolvedValue('v1-tableProps'),
            getDecimatedTableData: jest.fn().mockResolvedValue('v1-decimated'),
            queryTables: jest.fn().mockResolvedValue(['v1-tables']),
            processQuery: jest.fn().mockReturnValue('v1-processed'),
        } as any;

        v2Mock = {
            runQuery: jest.fn().mockResolvedValue('v2-runQuery'),
            shouldRunQuery: jest.fn().mockReturnValue(false),
            metricFindQuery: jest.fn().mockResolvedValue(['v2-metric']),
            getTableProperties: jest.fn().mockResolvedValue('v2-tableProps'),
            getDecimatedTableData: jest.fn().mockResolvedValue('v2-decimated'),
            queryTables: jest.fn().mockResolvedValue(['v2-tables']),
            processQuery: jest.fn().mockReturnValue('v2-processed'),
        } as any;

        (DataFrameDataSourceV1 as unknown as jest.Mock).mockImplementation(() => v1Mock);
        (DataFrameDataSourceV2 as unknown as jest.Mock).mockImplementation(() => v2Mock);
    });

    it('should use DataFrameDataSourceV1 if feature toggle is false', async () => {
        const ds = new DataFrameDataSource(mockInstanceSettings(false));
        expect(DataFrameDataSourceV1).toHaveBeenCalled();
        expect(DataFrameDataSourceV2).not.toHaveBeenCalled();

        await expect(ds.runQuery({} as any, {} as any)).resolves.toBe('v1-runQuery');
        expect(v1Mock.runQuery).toHaveBeenCalled();

        expect(ds.shouldRunQuery({} as any)).toBe(true);
        expect(v1Mock.shouldRunQuery).toHaveBeenCalled();

        await expect(ds.metricFindQuery({} as any)).resolves.toEqual(['v1-metric']);
        expect(v1Mock.metricFindQuery).toHaveBeenCalled();

        await expect(ds.getTableProperties('id')).resolves.toBe('v1-tableProps');
        expect(v1Mock.getTableProperties).toHaveBeenCalledWith('id');

        await expect(ds.getDecimatedTableData({} as any, [], {} as TimeRange, 10)).resolves.toBe('v1-decimated');
        expect(v1Mock.getDecimatedTableData).toHaveBeenCalled();

        await expect(ds.queryTables('query')).resolves.toEqual(['v1-tables']);
        expect(v1Mock.queryTables).toHaveBeenCalledWith('query', undefined, undefined);

        expect(ds.processQuery({} as any)).toBe('v1-processed');
        expect(v1Mock.processQuery).toHaveBeenCalled();
    });

    it('should use DataFrameDataSourceV2 if feature toggle is true', async () => {
        const ds = new DataFrameDataSource(mockInstanceSettings(true));
        expect(DataFrameDataSourceV2).toHaveBeenCalled();
        expect(DataFrameDataSourceV1).not.toHaveBeenCalled();

        await expect(ds.runQuery({} as any, {} as any)).resolves.toBe('v2-runQuery');
        expect(v2Mock.runQuery).toHaveBeenCalled();

        expect(ds.shouldRunQuery({} as any)).toBe(false);
        expect(v2Mock.shouldRunQuery).toHaveBeenCalled();

        await expect(ds.metricFindQuery({} as any)).resolves.toEqual(['v2-metric']);
        expect(v2Mock.metricFindQuery).toHaveBeenCalled();

        await expect(ds.getTableProperties('id')).resolves.toBe('v2-tableProps');
        expect(v2Mock.getTableProperties).toHaveBeenCalledWith('id');

        await expect(ds.getDecimatedTableData({} as any, [], {} as TimeRange, 10)).resolves.toBe('v2-decimated');
        expect(v2Mock.getDecimatedTableData).toHaveBeenCalled();

        await expect(ds.queryTables('query')).resolves.toEqual(['v2-tables']);
        expect(v2Mock.queryTables).toHaveBeenCalledWith('query', undefined, undefined);

        expect(ds.processQuery({} as any)).toBe('v2-processed');
        expect(v2Mock.processQuery).toHaveBeenCalled();
    });

    it('should set defaultQuery to defaultQueryV1 when datasource is DataFrameDataSourceV1 with refId "A"', () => {
        const dsV1 = new DataFrameDataSource(mockInstanceSettings(false));
        expect(dsV1.defaultQuery).toBeDefined();
        expect(dsV1.defaultQuery.refId).toBe('A');
        const expectedV1Default = v1Mock.defaultQuery ? { ...v1Mock.defaultQuery, refId: 'A' } : { refId: 'A' };
        expect(dsV1.defaultQuery).toEqual(expectedV1Default);
    });

    it('should set defaultQuery to defaultQueryV2 when datasource is DataFrameDataSourceV2 with refId "A"', () => {
        const dsV2 = new DataFrameDataSource(mockInstanceSettings(true));
        expect(dsV2.defaultQuery).toBeDefined();
        expect(dsV2.defaultQuery.refId).toBe('A');
        const expectedV2Default = v2Mock.defaultQuery ? { ...v2Mock.defaultQuery, refId: 'A' } : { refId: 'A' };
        expect(dsV2.defaultQuery).toEqual(expectedV2Default);
    });

    describe('loadColumnOption', () => {
        it('should delegate loadColumnOption to DataFrameDataSourceV1 when feature toggle is false', async () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false));
            v1Mock.loadColumnOption = jest.fn().mockResolvedValue(['v1-columnOption'] as any);

            await expect(ds.loadColumnOption('test-filter')).resolves.toEqual(['v1-columnOption']);

            expect(v1Mock.loadColumnOption).toHaveBeenCalledWith('test-filter');
        });

        it('should delegate loadColumnOption to DataFrameDataSourceV2 when feature toggle is true', async () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true));
            v2Mock.loadColumnOption = jest.fn().mockResolvedValue(['v2-columnOption'] as any);

            await expect(ds.loadColumnOption('another-filter')).resolves.toEqual(['v2-columnOption']);

            expect(v2Mock.loadColumnOption).toHaveBeenCalledWith('another-filter');
        });
    });

    describe('isColumnLimitExceeded', () => {
        it('should get isColumnLimitExceeded from DataFrameDataSourceV1 when feature toggle is false', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false));
            v1Mock.isColumnLimitExceeded = true;
            expect(ds.isColumnLimitExceeded).toBe(false);
        });

        it('should get isColumnLimitExceeded from DataFrameDataSourceV2 when feature toggle is true', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true));
            v2Mock.isColumnLimitExceeded = false;
            expect(ds.isColumnLimitExceeded).toBe(false);
        });
    });
});
