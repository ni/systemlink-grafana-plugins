import { from, lastValueFrom, of } from 'rxjs';
import { DataFrameDataSource } from './DataFrameDataSource';
import { DataFrameDataSourceV1 } from './datasources/v1/DataFrameDataSourceV1';
import { DataFrameDataSourceV2 } from './datasources/v2/DataFrameDataSourceV2';
import { DataSourceInstanceSettings, TimeRange } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';

jest.mock('./datasources/v1/DataFrameDataSourceV1');
jest.mock('./datasources/v2/DataFrameDataSourceV2');

const mockInstanceSettings: DataSourceInstanceSettings<any> = {
    id: 1,
    name: 'TestDS',
    type: 'test-type',
    url: 'http://example.com',
    jsonData: {},
} as any;

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
            transformDataTableQuery: jest.fn((query: string) => `v1-${query}`),
            transformResultQuery: jest.fn((query: string) => `v1-${query}`),
            transformColumnQuery: jest.fn((query: string) => `v1-${query}`),
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
            transformDataTableQuery: jest.fn((query: string) => `v2-${query}`),
            transformResultQuery: jest.fn((query: string) => `v2-${query}`),
            transformColumnQuery: jest.fn((query: string) => `v2-${query}`),
        } as any;

        (DataFrameDataSourceV1 as unknown as jest.Mock).mockImplementation(() => v1Mock);
        (DataFrameDataSourceV2 as unknown as jest.Mock).mockImplementation(() => v2Mock);
    });

    it('should use DataFrameDataSourceV2', async () => {
        const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
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

        const query = { refId: '1' };
        expect(ds.processQuery(query as any)).toBe('v2-processed');
        expect(v2Mock.processQuery).toHaveBeenCalledWith(query);

        expect(ds.processVariableQuery({} as any)).toBe('v2-processed');
        expect(v2Mock.processVariableQuery).toHaveBeenCalled();

        expect(ds.prepareQuery({} as any)).toBe('v2-prepared');
        expect(v2Mock.prepareQuery).toHaveBeenCalled();

        expect(ds.defaultQuery).toEqual({ ...v2Mock.defaultQuery });
    });

    describe('getColumnOptionsWithVariables', () => {
        it('should call getColumnOptionsWithVariables on DataFrameDataSourceV2', async () => {
            const ds = new DataFrameDataSource(mockInstanceSettings);
            const mockColumnOptions = {
                uniqueColumnsAcrossTables: ['v2-column-options'],
                commonColumnsAcrossTables: ['v2-xcolumn-options']
            };
            v2Mock.getColumnOptionsWithVariables = jest.fn().mockResolvedValue(mockColumnOptions);

            const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'filter' });

            expect(v2Mock.getColumnOptionsWithVariables).toHaveBeenCalledWith({ dataTableFilter: 'filter' });
            expect(result).toEqual(mockColumnOptions);
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
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);

            await ds.runQuery(query, options);

            expect(ds.variablesCache).toEqual({ varA: '1' });
        });

        it('should not replace variablesCache reference when variables unchanged', async () => {
            const initialVars = [{ name: 'varA', value: '1' }];
            const templateSrv = createTemplateSrv(initialVars);
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);

            await ds.runQuery(query, options);

            const firstRef = ds.variablesCache;
            (ds as any).templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);

            await ds.runQuery(query, options);

            expect(ds.variablesCache).toBe(firstRef);
        });

        it('should replace variablesCache when variable value changes', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
            await ds.runQuery(query, options);
            const firstRef = ds.variablesCache;

            (ds as any).templateSrv = createTemplateSrv([{ name: 'varA', value: '2' }]);
            await ds.runQuery(query, options);

            expect(ds.variablesCache).not.toBe(firstRef);
            expect(ds.variablesCache).toEqual({ varA: '2' });
        });

        it('should replace variablesCache when variable name changes', async () => {
            const templateSrv = createTemplateSrv([{ name: 'varA', value: '1' }]);
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
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
                mockInstanceSettings,
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
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
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
                mockInstanceSettings,
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

    describe('transformDataTableQuery', () => {
        it('should delegate to v2 transformDataTableQuery', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
            v2Mock.transformDataTableQuery.mockClear();

            const result = ds.transformDataTableQuery('filter');

            expect(v2Mock.transformDataTableQuery).toHaveBeenCalledWith('filter');
            expect(result).toBe('v2-filter');
        });
    });

    describe('transformResultQuery', () => {
        it('should delegate to v2 transformResultQuery', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
            v2Mock.transformResultQuery.mockClear();

            const result = ds.transformResultQuery('filter');

            expect(v2Mock.transformResultQuery).toHaveBeenCalledWith('filter');
            expect(result).toBe('v2-filter');
        });
    });

    describe('transformColumnQuery', () => {
        it('should delegate to v2 transformColumnQuery', () => {
            const ds = new DataFrameDataSource(mockInstanceSettings, backendSrv, templateSrv);
            v2Mock.transformColumnQuery.mockClear();
            
            const result = ds.transformColumnQuery('filter');
            
            expect(v2Mock.transformColumnQuery).toHaveBeenCalledWith('filter');
            expect(result).toBe('v2-filter');
        });
    });

    describe('parseColumnIdentifier', () => {
        it('should delegate to v2 parseColumnIdentifier', () => {
            const ds = new DataFrameDataSource(
                mockInstanceSettings,
                backendSrv,
                templateSrv
            );
            const parsedColumnIdentifier = {
                columnName: 'column1',
                transformedDataType: 'Numeric'
            };
            v2Mock.parseColumnIdentifier = jest.fn().mockReturnValue(parsedColumnIdentifier);
            
            const result = ds.parseColumnIdentifier('column1-Numeric');
            
            expect(v2Mock.parseColumnIdentifier).toHaveBeenCalledWith('column1-Numeric');
            expect(result).toBe(parsedColumnIdentifier);
        });
    });

    describe('hasRequiredFilters', () => {
        it('should delegate to v2 hasRequiredFilters', () => {
            const ds = new DataFrameDataSource(
                mockInstanceSettings,
                backendSrv,
                templateSrv
            );
            v2Mock.hasRequiredFilters = jest.fn().mockReturnValue(true);
            const mockQuery = {
                test: 'query-v2'
            } as any;
            
            const result = ds.hasRequiredFilters(mockQuery);
            
            expect(v2Mock.hasRequiredFilters).toHaveBeenCalledWith(mockQuery);
            expect(result).toBe(true);
        });
    });
});
