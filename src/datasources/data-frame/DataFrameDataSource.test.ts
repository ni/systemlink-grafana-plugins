import { from, lastValueFrom, of } from 'rxjs';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameDataSourceV1 } from './datasources/v1/DataFrameDataSourceV1';
import { DataFrameDataSourceV2 } from './datasources/v2/DataFrameDataSourceV2';
import { DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';

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
    let templateSrv: TemplateSrv;
    let backendSrv: BackendSrv;
    const mockFilter = { 
        dataTableFilter: 'dataTableQuery',
        resultFilter: 'resultQuery',
        columnFilter: 'columnQuery'
    };

    beforeEach(() => {
        (DataFrameDataSourceV1 as unknown as jest.Mock).mockClear();
        (DataFrameDataSourceV2 as unknown as jest.Mock).mockClear();
        backendSrv = {} as BackendSrv;
        templateSrv = {
            getVariables: jest.fn(() => []),
            replace: jest.fn((input: string) => input),
        } as unknown as TemplateSrv;

        v1Mock = {
            defaultQuery: { value: 'v1-default' } as any,
            runQuery: jest.fn().mockResolvedValue('v1-runQuery'),
            shouldRunQuery: jest.fn().mockReturnValue(true),
            metricFindQuery: jest.fn().mockResolvedValue(['v1-metric']),
            getTableProperties: jest.fn().mockResolvedValue('v1-tableProps'),
            getDecimatedTableData: jest.fn().mockResolvedValue('v1-decimated'),
            queryTables$: jest.fn().mockReturnValue(of(['v1-tables'])),
            queryTables: jest.fn().mockResolvedValue(['v1-tables']),
            processQuery: jest.fn().mockReturnValue('v1-processed'),
            prepareQuery: jest.fn().mockReturnValue('v1-prepared'),
            processVariableQuery: jest.fn().mockReturnValue('v1-processed'),
            transformQuery: jest.fn((query: string) => `v1-${query}`),
        } as any;

        v2Mock = {
            defaultQuery: { value: 'v2-default' } as any,
            runQuery: jest.fn().mockReturnValue(of('v2-runQuery')),
            shouldRunQuery: jest.fn().mockReturnValue(false),
            metricFindQuery: jest.fn().mockResolvedValue(['v2-metric']),
            getTableProperties: jest.fn().mockResolvedValue('v2-tableProps'),
            getDecimatedTableData: jest.fn().mockResolvedValue('v2-decimated'),
            queryTables$: jest.fn().mockReturnValue(of(['v2-tables'])),
            queryTables: jest.fn().mockResolvedValue(['v2-tables']),
            processQuery: jest.fn().mockReturnValue('v2-processed'),
            prepareQuery: jest.fn().mockReturnValue('v2-prepared'),
            processVariableQuery: jest.fn().mockReturnValue('v2-processed'),
            transformQuery: jest.fn((query: string) => `v2-${query}`),
        } as any;

        (DataFrameDataSourceV1 as unknown as jest.Mock).mockImplementation(() => v1Mock);
        (DataFrameDataSourceV2 as unknown as jest.Mock).mockImplementation(() => v2Mock);
    });

    it('should use DataFrameDataSourceV1 if feature toggle is false', async () => {
        const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
        expect(DataFrameDataSourceV1).toHaveBeenCalled();
        expect(DataFrameDataSourceV2).not.toHaveBeenCalled();

        await expect(ds.runQuery({} as any, {} as any)).resolves.toBe('v1-runQuery');
        expect(v1Mock.runQuery).toHaveBeenCalled();

        expect(ds.shouldRunQuery({} as any)).toBe(true);
        expect(v1Mock.shouldRunQuery).toHaveBeenCalled();

        await expect(ds.metricFindQuery({} as any, {} as any)).resolves.toEqual(['v1-metric']);
        expect(v1Mock.metricFindQuery).toHaveBeenCalled();

        await expect(ds.getTableProperties('id')).resolves.toBe('v1-tableProps');
        expect(v1Mock.getTableProperties).toHaveBeenCalledWith('id');

        await expect(ds.getDecimatedTableData({} as any, [], {} as TimeRange, 10)).resolves.toBe('v1-decimated');
        expect(v1Mock.getDecimatedTableData).toHaveBeenCalled();

        await expect(lastValueFrom(ds.queryTables$(mockFilter))).resolves.toEqual(['v1-tables']);
        expect(v1Mock.queryTables$).toHaveBeenCalledWith(mockFilter, undefined, undefined);

        await expect(ds.queryTables('query')).resolves.toEqual(['v1-tables']);
        expect(v1Mock.queryTables).toHaveBeenCalledWith('query', undefined, undefined);

        expect(ds.processQuery({} as any)).toBe('v1-processed');
        expect(v1Mock.processQuery).toHaveBeenCalled();

        expect(ds.processVariableQuery({} as any)).toBe('v1-processed');
        expect(v1Mock.processVariableQuery).toHaveBeenCalled();

        expect(ds.prepareQuery({} as any)).toBe('v1-prepared');
        expect(v1Mock.prepareQuery).toHaveBeenCalled();

        expect(ds.defaultQuery).toEqual({ ...v1Mock.defaultQuery });
    });

    it('should use DataFrameDataSourceV2 if feature toggle is true', async () => {
        const ds = new DataFrameDataSource(mockInstanceSettings(true), backendSrv, templateSrv);
        expect(DataFrameDataSourceV2).toHaveBeenCalled();
        expect(DataFrameDataSourceV1).not.toHaveBeenCalled();

        await expect(
            lastValueFrom(from(ds.runQuery({} as any, {} as any)))
        ).resolves.toBe('v2-runQuery');
        expect(v2Mock.runQuery).toHaveBeenCalled();

        expect(ds.shouldRunQuery({} as any)).toBe(false);
        expect(v2Mock.shouldRunQuery).toHaveBeenCalled();

        await expect(ds.metricFindQuery({} as any, {} as any)).resolves.toEqual(['v2-metric']);
        expect(v2Mock.metricFindQuery).toHaveBeenCalled();

        await expect(ds.getTableProperties('id')).resolves.toBe('v2-tableProps');
        expect(v2Mock.getTableProperties).toHaveBeenCalledWith('id');

        await expect(ds.getDecimatedTableData({} as any, [], {} as TimeRange, 10)).resolves.toBe('v2-decimated');
        expect(v2Mock.getDecimatedTableData).toHaveBeenCalled();

        await expect(lastValueFrom(ds.queryTables$(mockFilter))).resolves.toEqual(['v2-tables']);
        expect(v2Mock.queryTables$).toHaveBeenCalledWith(mockFilter, undefined, undefined);

        await expect(ds.queryTables('query')).resolves.toEqual(['v2-tables']);
        expect(v2Mock.queryTables).toHaveBeenCalledWith('query', undefined, undefined);

        expect(ds.processQuery({} as any)).toBe('v2-processed');
        expect(v2Mock.processQuery).toHaveBeenCalled();

        expect(ds.processVariableQuery({} as any)).toBe('v2-processed');
        expect(v2Mock.processVariableQuery).toHaveBeenCalled();

        expect(ds.prepareQuery({} as any)).toBe('v2-prepared');
        expect(v2Mock.prepareQuery).toHaveBeenCalled();

        expect(ds.defaultQuery).toEqual({ ...v2Mock.defaultQuery });
    });

    describe('getColumnOptionsWithVariables', () => {
        it('should call getColumnOptionsWithVariables on DataFrameDataSourceV1 when feature toggle is false', async () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false));
            v1Mock.getColumnOptionsWithVariables = jest.fn().mockResolvedValue(['v1-column-options']);

            const result = await ds.getColumnOptionsWithVariables('filter');

            expect(v1Mock.getColumnOptionsWithVariables).toHaveBeenCalledWith('filter');
            expect(result).toEqual(['v1-column-options']);
        });

        it('should call getColumnOptionsWithVariables on DataFrameDataSourceV2 when feature toggle is true', async () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true));
            v2Mock.getColumnOptionsWithVariables = jest.fn().mockResolvedValue(['v2-column-options']);

            const result = await ds.getColumnOptionsWithVariables('filter');

            expect(v2Mock.getColumnOptionsWithVariables).toHaveBeenCalledWith('filter');
            expect(result).toEqual(['v2-column-options']);
        });
   });

    describe('dashboard variables caching', () => {
        const backendSrv = {} as BackendSrv;
        const createTemplateSrv = (variables: Array<{ name: string; value: string }>): TemplateSrv => {
            return {
                getVariables: () => variables,
                replace: (input: string) => {
                    const match = input.match(/^\$(.+)$/);
                    if (match) {
                        const variable = variables.find(variable => variable.name === match[1]);
                        return variable ? variable.value : input;
                    }
                    return input;
                },
            } as unknown as TemplateSrv;
        };

        const query: any = { refId: 'A' };
        const options: any = { range: { from: new Date(), to: new Date() } };

        it('should cache variables on first runQuery', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);

            await ds.runQuery(query, options);

            expect(ds.variablesCache).toEqual({ varA: '1' });
        });

        it('should not replace variablesCache reference when variables unchanged', async () => {
            const initialVars = [{ name: 'varA', value: '1' }];
            const templateSrv = createTemplateSrv(initialVars);
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);

            await ds.runQuery(query, options);

            const firstRef = ds.variablesCache;
            (ds as any).templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);

            await ds.runQuery(query, options);

            expect(ds.variablesCache).toBe(firstRef);
        });

        it('should replace variablesCache when variable value changes', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;
            
            (ds as any).templateSrv = createTemplateSrv([{ name: 'varA', value: '2' }]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).not.toBe(firstRef);
            expect(ds.variablesCache).toEqual({ varA: '2' });
        });

        it('should replace variablesCache when variable name changes', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;
            
            (ds as any).templateSrv = createTemplateSrv([{ name: 'varB', value: '1' }]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).not.toBe(firstRef);
            expect(ds.variablesCache).toEqual({ varB: '1' });
        });

        it('should not replace variablesCache when only variable order changes', async () => {
            const templateSrv = createTemplateSrv([
                { name: 'varA', value: '1' },
                { name: 'varB', value: '2' }
            ]);
            const ds = new DataFrameDataSource(
                mockInstanceSettings(false),
                backendSrv,
                templateSrv
            );
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;
            
            (ds as any).templateSrv = createTemplateSrv([
                { name: 'varB', value: '2' },
                { name: 'varA', value: '1' },
            ]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).toBe(firstRef);
        });

        it('should replace variablesCache when variable added', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;
            
            (ds as any).templateSrv = createTemplateSrv([
                { name: 'varA', value: '1' },
                { name: 'varB', value: '2' },
            ]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).not.toBe(firstRef);
            expect(ds.variablesCache).toEqual({
                varA: '1',
                varB: '2',
            });
        });

        it('should replace variablesCache when variable removed', async () => {
            const templateSrv = createTemplateSrv([
                { name: 'varA', value: '1' },
                { name: 'varB', value: '2' }
            ]);
            const ds = new DataFrameDataSource(
                mockInstanceSettings(false),
                backendSrv,
                templateSrv
            );
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;
            
            (ds as any).templateSrv = createTemplateSrv([
                { name: 'varA', value: '1' },
            ]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).not.toBe(firstRef);
            expect(ds.variablesCache).toEqual({ varA: '1' });
        });
    });

    describe('transformQuery', () => {
        it('should delegate to v2 transformQuery when feature toggle is true', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true), backendSrv, templateSrv);
            v2Mock.transformQuery.mockClear();
            
            const result = ds.transformQuery('filter');
            
            expect(v2Mock.transformQuery).toHaveBeenCalledWith('filter');
            expect(result).toBe('v2-filter');
        });

        it('should delegate to v1 base transformQuery when feature toggle is false', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            v1Mock.transformQuery.mockClear();
            
            const result = ds.transformQuery('filter');
            
            expect(v1Mock.transformQuery).toHaveBeenCalledWith('filter');
            expect(result).toBe('v1-filter');
        });
     });

    describe('createColumnOptions', () => {
        it('should delegate to v2 createColumnOptions when feature toggle is true', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true), backendSrv, templateSrv);
            v2Mock.createColumnOptions = jest.fn().mockReturnValue([
                { label: 'Col1', value: 'Col1-String' }
            ]);
            
            const columnTypeMap = { Col1: new Set(['String']) };
            const result = ds.createColumnOptions(columnTypeMap);
            
            expect(v2Mock.createColumnOptions).toHaveBeenCalledWith(columnTypeMap);
            expect(result).toEqual([{ label: 'Col1', value: 'Col1-String' }]);
        });

        it('should delegate to v1 createColumnOptions when feature toggle is false', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            v1Mock.createColumnOptions = jest.fn().mockReturnValue([]);
            
            const columnTypeMap = { Col1: new Set(['String']) };
            const result = ds.createColumnOptions(columnTypeMap);
            
            expect(v1Mock.createColumnOptions).toHaveBeenCalledWith(columnTypeMap);
            expect(result).toEqual([]);
        });
    });

    describe('transformColumnType', () => {
        it('should delegate to v2 transformColumnType when feature toggle is true', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(true), backendSrv, templateSrv);
            v2Mock.transformColumnType = jest.fn().mockReturnValue('Numeric');
            
            const result = ds.transformColumnType('INT32');
            
            expect(v2Mock.transformColumnType).toHaveBeenCalledWith('INT32');
            expect(result).toBe('Numeric');
        });

        it('should delegate to v1 transformColumnType when feature toggle is false', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings(false), backendSrv, templateSrv);
            v1Mock.transformColumnType = jest.fn().mockReturnValue('INT32');
            
            const result = ds.transformColumnType('INT32');
            
            expect(v1Mock.transformColumnType).toHaveBeenCalledWith('INT32');
            expect(result).toBe('INT32');
        });
    });
});
