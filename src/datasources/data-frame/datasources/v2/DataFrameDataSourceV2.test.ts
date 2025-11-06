jest.mock('datasources/data-frame/constants', () => ({
    COLUMN_OPTION_LIMIT: 10,
    TAKE_LIMIT: 1000
}));

import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameQuery, DataFrameQueryType, DataTableProjections, defaultDatatableProperties, defaultQueryV2 } from '../../types';
import { COLUMN_OPTION_LIMIT, TAKE_LIMIT } from 'datasources/data-frame/constants';

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
                dataTableFilter: '',
                dataTableProperties: defaultDatatableProperties,
                columnProperties: [],
                columns: [],
                includeIndexColumns: false,
                filterNulls: false,
                decimationMethod: 'LOSSY',
                xColumn: null,
                applyTimeFilters: false,
                take: TAKE_LIMIT
            };

            const result = ds.processQuery(query);

            expect(result).toEqual(expectedQuery);
        });

        it('should return the query with default values for missing fields when some of the fields from `ValidDataFrameQueryV2` are missing', () => {
            const query = { decimationMethod: 'MAX_MIN', applyTimeFilters: true } as DataFrameQuery;
            const expectedQuery = {
                type: DataFrameQueryType.Data,
                dataTableFilter: '',
                dataTableProperties: defaultDatatableProperties,
                columnProperties: [],
                columns: [],
                includeIndexColumns: false,
                filterNulls: false,
                decimationMethod: 'MAX_MIN',
                xColumn: null,
                applyTimeFilters: true,
                take: TAKE_LIMIT
            };

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

        it('should call the `post` method with the expected arguments and return tables', async () => {
            const filter = 'test-filter';
            const take = 10;
            const projection = [DataTableProjections.Name, DataTableProjections.Id];
            const result = await ds.queryTables(filter, take, projection);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take, projection }, { useApiIngress: true });
            expect(result).toBe(mockTables);
        });

        it('should use TAKE_LIMIT as default take value when not provided', async () => {
            const filter = 'test-filter';
            const result = await ds.queryTables(filter);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take: TAKE_LIMIT }, { useApiIngress: true });
            expect(result).toBe(mockTables);
        });

        it('should use undefined as default projection value when not provided', async () => {
            const filter = 'test-filter';
            const take = 15;
            const result = await ds.queryTables(filter, take);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take, projection: undefined }, { useApiIngress: true });
            expect(result).toBe(mockTables);
        });
    });

    describe('loadColumnOption', () => {
        let queryTablesMock: jest.SpyInstance;

        beforeEach(() => {
            queryTablesMock = jest.spyOn(ds, 'queryTables');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return an empty array when no tables are found', async () => {
            queryTablesMock.mockResolvedValue([]);

            const result = await ds.loadColumnOption('some-filter');

            expect(result).toEqual([]);
        });

        it('should return an empty array when tables have no columns', async () => {
            queryTablesMock.mockResolvedValue([
                { id: '1', name: 'Table 1', columns: [] },
                { id: '2', name: 'Table 2' },
            ]);

            const result = await ds.loadColumnOption('some-filter');

            expect(result).toEqual([]);
        });

        it('should treat all numeric types as one data type -`Numeric`', async () => {
            queryTablesMock.mockResolvedValue([
                {
                    id: '1',
                    name: 'Table 1',
                    columns: [
                        { name: 'Column 1', dataType: 'INT32' },
                    ]
                },
                {
                    id: '2',
                    name: 'Table 2',
                    columns: [
                        { name: 'Column 2', dataType: 'INT64' },
                    ]
                },
                {
                    id: '3',
                    name: 'Table 3',
                    columns: [
                        { name: 'Column 3', dataType: 'FLOAT32' },
                    ]
                },
                {
                    id: '4',
                    name: 'Table 4',
                    columns: [
                        { name: 'Column 4', dataType: 'FLOAT64' },
                    ]

                }
            ]);

            const result = await ds.loadColumnOption('some-filter');
            expect(result).toEqual([
                { label: 'Column 1', value: 'Column 1-Numeric' },
                { label: 'Column 2', value: 'Column 2-Numeric' },
                { label: 'Column 3', value: 'Column 3-Numeric' },
                { label: 'Column 4', value: 'Column 4-Numeric' },
            ]);
        });

        describe('when column names do not repeat', () => {
            it('should show only the name in the labels', async () => {
                queryTablesMock.mockResolvedValue([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                            { name: 'Column 2', dataType: 'INT32' },
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column 3', dataType: 'TIMESTAMP' },
                            { name: 'Column 4', dataType: 'BOOLEAN' },
                            { name: 'Column 5', dataType: 'STRING' },
                        ]
                    }
                ]);

                const result = await ds.loadColumnOption('some-filter');

                expect(result).toEqual([
                    { label: 'Column 1', value: 'Column 1-String' },
                    { label: 'Column 2', value: 'Column 2-Numeric' },
                    { label: 'Column 3', value: 'Column 3-Timestamp' },
                    { label: 'Column 4', value: 'Column 4-Boolean' },
                    { label: 'Column 5', value: 'Column 5-String' },
                ]);
            });
        });

        describe('when column names repeat but data type differs', () => {
            it('should group numeric types as `Numeric`', async () => {
                queryTablesMock.mockResolvedValue([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'INT32' },
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column 1', dataType: 'INT64' },
                        ]
                    },
                    {
                        id: '3',
                        name: 'Table 3',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                        ]
                    }
                ]);

                const result = await ds.loadColumnOption('some-filter');

                expect(result).toEqual([
                    { label: 'Column 1 (Numeric)', value: 'Column 1-Numeric' },
                    { label: 'Column 1 (String)', value: 'Column 1-String' }
                ]);
            });

            it('should show data types in label', async () => {
                queryTablesMock.mockResolvedValue([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column A', dataType: 'STRING' },
                            { name: 'Column B', dataType: 'INT64' },
                            { name: 'Column C', dataType: 'BOOLEAN' },
                            { name: 'Column D', dataType: 'INT32' },
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column A', dataType: 'BOOLEAN' },
                            { name: 'Column B', dataType: 'TIMESTAMP' },
                            { name: 'Column C', dataType: 'STRING' },
                            { name: 'Column D', dataType: 'FLOAT64' },
                            { name: 'Column E', dataType: 'FLOAT32' },
                        ]
                    }
                ]);

                const result = await ds.loadColumnOption('some-filter');

                expect(result).toEqual([
                    { label: 'Column A (String)', value: 'Column A-String' },
                    { label: 'Column A (Boolean)', value: 'Column A-Boolean' },
                    { label: 'Column B (Numeric)', value: 'Column B-Numeric' },
                    { label: 'Column B (Timestamp)', value: 'Column B-Timestamp' },
                    { label: 'Column C (Boolean)', value: 'Column C-Boolean' },
                    { label: 'Column C (String)', value: 'Column C-String' },
                    { label: 'Column D', value: 'Column D-Numeric' },
                    { label: 'Column E', value: 'Column E-Numeric' }
                ]);
            });
        });

        describe('when column names repeat but data type is same', () => {
            it('should not show data types in label', async () => {
                queryTablesMock.mockResolvedValue([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column A', dataType: 'STRING' },
                            { name: 'Column B', dataType: 'INT64' },
                            { name: 'Column C', dataType: 'BOOLEAN' },
                            { name: 'Column D', dataType: 'INT32' },
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column A', dataType: 'STRING' },
                            { name: 'Column B', dataType: 'FLOAT64' },
                            { name: 'Column C', dataType: 'BOOLEAN' },
                            { name: 'Column D', dataType: 'FLOAT64' },
                        ]
                    }
                ]);

                const result = await ds.loadColumnOption('some-filter');

                expect(result).toEqual([
                    { label: 'Column A', value: 'Column A-String' },
                    { label: 'Column B', value: 'Column B-Numeric' },
                    { label: 'Column C', value: 'Column C-Boolean' },
                    { label: 'Column D', value: 'Column D-Numeric' },
                ]);
            });
        });

        it('should limit the number of returned options to COLUMN_OPTION_LIMIT', async () => {
            const mockColumns = [];
            for (let i = 0; i < 20; i++) {
                mockColumns.push({ name: `Column ${i + 1}`, dataType: 'STRING' });
            }
            queryTablesMock.mockResolvedValue([
                {
                    id: '1',
                    name: 'Table 1',
                    columns: mockColumns
                }
            ]);

            const result = await ds.loadColumnOption('some-filter');

            expect(result.length).toBe(COLUMN_OPTION_LIMIT);
            expect(result).toEqual(
                Array.from({ length: COLUMN_OPTION_LIMIT }, (_, i) => ({
                    label: `Column ${i + 1}`,
                    value: `Column ${i + 1}`
                }))
            );
        });
    });
});
