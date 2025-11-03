import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameQuery, DataFrameQueryType, DataFrameQueryV2, DataTableProjections, DataTableProperties, defaultDatatableProperties, defaultQueryV2, ValidDataFrameQueryV2 } from '../../types';
import { TAKE_LIMIT } from 'datasources/data-frame/constants';
import { Workspace } from 'core/types';
import * as queryBuilderUtils from 'core/query-builder.utils';

jest.mock('core/query-builder.utils', () => {
    const actual = jest.requireActual('core/query-builder.utils');
    return {
        ...actual,
        transformComputedFieldsQuery: jest.fn(actual.transformComputedFieldsQuery),
        timeFieldsQuery: jest.fn(actual.timeFieldsQuery),
        multipleValuesQuery: jest.fn(actual.multipleValuesQuery),
    };
});

describe('DataFrameDataSourceV2', () => {
    let instanceSettings: DataSourceInstanceSettings<any>;
    let backendSrv: jest.Mocked<BackendSrv>;
    let templateSrv: jest.Mocked<TemplateSrv>;
    let ds: DataFrameDataSourceV2;

    beforeEach(() => {
        instanceSettings = { id: 1, name: 'test', type: 'test', url: '', jsonData: {} } as any;
        backendSrv = {} as any;
        templateSrv = { replace: jest.fn((value: string) => value) } as any;
        ds = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
        jest.clearAllMocks();
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
        const query = {
            type: DataFrameQueryType.Data,
            dataTableFilter: 'name = "Test Table"',
            dataTableProperties: [DataTableProperties.Name],
            take: 1000
        } as DataFrameQueryV2;
        const options = { scopedVars: {} } as DataQueryRequest<DataFrameQueryV2>;
        const workspaces = new Map<string, Workspace>(
            [
                ['workspace-1', { id: 'workspace-1', name: 'Workspace 1' } as Workspace],
                ['workspace-2', { id: 'workspace-2', name: 'Workspace 2' } as Workspace],
            ]
        );
        let processQuerySpy: jest.SpyInstance;
        let loadWorkspacesSpy: jest.SpyInstance;
        let transformComputedFieldsQuerySpy: jest.SpyInstance;
        let timeFieldsQuery: jest.SpyInstance;
        let multipleValuesQuery: jest.SpyInstance;
        let queryTablesSpy: jest.SpyInstance;

        function getProcessedQuery(overrides?: Partial<DataFrameQueryV2>): DataFrameQueryV2 {
            return {
                refId: 'A',
                ...defaultQueryV2,
                ...overrides,
            };
        }

        beforeEach(() => {
            processQuerySpy = jest.spyOn(ds, 'processQuery');
            loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces').mockResolvedValue(workspaces);
            queryTablesSpy = jest.spyOn(ds, 'queryTables');
            transformComputedFieldsQuerySpy = queryBuilderUtils.transformComputedFieldsQuery as jest.Mock;
            timeFieldsQuery = queryBuilderUtils.timeFieldsQuery as jest.Mock;
            multipleValuesQuery = queryBuilderUtils.multipleValuesQuery as jest.Mock;
        });

        it('should call processQuery with the provided query', async () => {
            await ds.runQuery(query, options);

            expect(processQuerySpy).toHaveBeenCalledWith(query);
        });

        it('should call loadWorkspaces', async () => {
            await ds.runQuery(query, options);

            expect(loadWorkspacesSpy).toHaveBeenCalled();
        });

        it('should call transformComputedFieldsQuery when dataTableFilter is present', async () => {
            const processedQuery = getProcessedQuery(query);
            processQuerySpy.mockReturnValue(processedQuery);
            templateSrv.replace.mockReturnValue('name = "Test Table"');

            await ds.runQuery(query, options);

            expect(templateSrv.replace).toHaveBeenCalledWith('name = "Test Table"', expect.any(Object));
            expect(transformComputedFieldsQuerySpy).toHaveBeenCalledWith(
                'name = "Test Table"',
                expect.any(Object)
            );
        });

        it('should use expected `ExpressionTransformFunction` for the fields', async () => {
            const mockTimeFieldsExpressionTransformFunction = jest.fn().mockReturnValue("transformed-time-expressions");
            const mockMultipleValuesExpressionTransformFunction = jest.fn().mockReturnValue("transformed-multiple-values");
            const processedQuery = getProcessedQuery(query);
            timeFieldsQuery.mockReturnValue(mockTimeFieldsExpressionTransformFunction);
            multipleValuesQuery.mockReturnValue(mockMultipleValuesExpressionTransformFunction);
            ds = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
            processQuerySpy.mockReturnValue(processedQuery);
            await ds.runQuery(query, options);

            const dataTableComputedDataFields = transformComputedFieldsQuerySpy.mock.calls[0][1];
            Object.values(DataTableProperties).forEach(field => {
                const expressionTransformationFunction = dataTableComputedDataFields.get(field);
                const timeFieldProperties = [
                    DataTableProperties.CreatedAt,
                    DataTableProperties.MetadataModifiedAt,
                    DataTableProperties.RowsModifiedAt
                ];

                if (timeFieldProperties.includes(field)) {
                    expect(expressionTransformationFunction()).toBe("transformed-time-expressions");
                } else {
                    expect(expressionTransformationFunction()).toBe("transformed-multiple-values");
                }
            });
        });

        describe("when query type is data", () => {
            const dataQuery = {
                type: DataFrameQueryType.Data,
            } as DataFrameQueryV2;

            beforeEach(() => {
                const processedQuery = getProcessedQuery(dataQuery);
                processQuerySpy.mockReturnValue(processedQuery);
            });

            it('should return an object with empty fields array', async () => {
                const result = await ds.runQuery(dataQuery, options);

                expect(result).toEqual({ fields: [] });
            });

            it('should not call queryTables', async () => {
                await ds.runQuery(dataQuery, options);

                expect(queryTablesSpy).not.toHaveBeenCalled();
            });
        });

        describe("when query type is properties", () => {
            describe('when dataTableProperties and columnProperties are empty', () => {
                const queryWithEmptyProperties = {
                    type: DataFrameQueryType.Properties,
                    dataTableProperties: [],
                    columnProperties: [],
                    take: 1000,
                    refId: 'A',
                } as DataFrameQueryV2;

                beforeEach(() => {
                    const processedQuery = getProcessedQuery(queryWithEmptyProperties);
                    processQuerySpy.mockReturnValue(processedQuery);
                });

                it('should not call queryTables', async () => {
                    await ds.runQuery(queryWithEmptyProperties, options);

                    expect(queryTablesSpy).not.toHaveBeenCalled();
                });

                it('should return an object with empty fields array', async () => {
                    const result = await ds.runQuery(queryWithEmptyProperties, options);

                    expect(result).toEqual({ fields: [] });
                });
            });

            describe('when the take value is less than zero or greater than TAKE_LIMIT', () => {
                const invalidTakeValues = [-10, 0, TAKE_LIMIT + 1];

                invalidTakeValues.forEach((takeValue) => {
                    const queryWithInvalidTake = {
                        type: DataFrameQueryType.Properties,
                        dataTableProperties: [DataTableProperties.Name],
                        columnProperties: [],
                        take: takeValue,
                        refId: 'A',
                    } as DataFrameQueryV2;

                    beforeEach(() => {
                        const processedQuery = getProcessedQuery(queryWithInvalidTake);
                        processQuerySpy.mockReturnValue(processedQuery);
                    });

                    it(`should not call queryTables for take value: ${takeValue}`, async () => {
                        await ds.runQuery(queryWithInvalidTake, options);

                        expect(queryTablesSpy).not.toHaveBeenCalled();
                    });

                    it(`should return an object with empty fields array for take value: ${takeValue}`, async () => {
                        const result = await ds.runQuery(queryWithInvalidTake, options);

                        expect(result).toEqual({ fields: [] });
                    });
                });
            });

            describe('when dataTableProperties, columnProperties and a valid take are provided', () => {
                it('should call queryTables with expected arguments and return fields', async () => {
                    const validQuery = {
                        type: DataFrameQueryType.Properties,
                        dataTableFilter: 'name = "Test Table"',
                        dataTableProperties: [DataTableProperties.Name],
                        columnProperties: [],
                        take: 1000,
                        refId: 'A',
                    };
                    const mockTables = [
                        { id: 'table-1', name: 'Table 1' },
                        { id: 'table-2', name: 'Table 2' }
                    ];
                    const processedQuery = getProcessedQuery(validQuery);
                    processQuerySpy.mockReturnValue(processedQuery);
                    queryTablesSpy.mockResolvedValue(mockTables);
                    transformComputedFieldsQuerySpy.mockImplementation((queryStr, _) => queryStr);

                    const result = await ds.runQuery(validQuery, options);

                    expect(queryTablesSpy).toHaveBeenCalledWith(
                        'name = "Test Table"',
                        1000,
                        [DataTableProjections.Name]
                    );
                    console.log('Result:', result);
                    expect(result).toEqual({
                        refId: 'A',
                        name: 'A',
                        fields: [
                            {
                                name: DataTableProperties.Name,
                                type: 'string',
                                values: ['Table 1', 'Table 2']
                            }
                        ]
                    });
                });

                it('should return expected fields when for all the properties', async () => {
                    const dataTableProperties = [
                        DataTableProperties.Name,
                        DataTableProperties.Id,
                        DataTableProperties.RowCount,
                        DataTableProperties.ColumnCount,
                        DataTableProperties.CreatedAt,
                        DataTableProperties.Workspace,
                        DataTableProperties.MetadataModifiedAt,
                        DataTableProperties.MetadataRevision,
                        DataTableProperties.RowsModifiedAt,
                        DataTableProperties.SupportsAppend,
                        DataTableProperties.Properties
                    ];
                    const columnProperties = [
                        DataTableProperties.ColumnName,
                        DataTableProperties.ColumnDataType,
                        DataTableProperties.ColumnType,
                        DataTableProperties.ColumnProperties
                    ];
                    const queryWithAllProperties = {
                        type: DataFrameQueryType.Properties,
                        dataTableFilter: 'name = "Test Table"',
                        dataTableProperties,
                        columnProperties,
                        take: 1000,
                        refId: 'A',
                    };
                    const mockTables = [
                        {
                            id: 'table-1', name: 'Table 1', rowCount: 100, columnCount: 2, createdAt: '2023-01-01T00:00:00Z',
                            workspace: 'Workspace 1', metadataModifiedAt: '2023-01-02T00:00:00Z', metadataRevision: 2,
                            rowsModifiedAt: '2023-01-03T00:00:00Z', supportsAppend: true, properties: { key: 'value' },
                            columns: [
                                { name: 'Column 1', dataType: 'string', columnType: 'dimension', properties: { colKey: 'colValue' } },
                                { name: 'Column 2', dataType: 'number', columnType: 'measure', properties: { colKey2: 'colValue2' } }
                            ]
                        },
                        {
                            id: 'table-2', name: 'Table 2', rowCount: 200, columnCount: 3, createdAt: '2023-01-04T00:00:00Z',
                            workspace: 'Workspace 2', metadataModifiedAt: '2023-01-05T00:00:00Z', metadataRevision: 1,
                            rowsModifiedAt: '2023-01-06T00:00:00Z', supportsAppend: false, properties: { key: 'value2' },
                            columns: [
                                { name: 'Column 1', dataType: 'string', columnType: 'dimension', properties: { colKey: 'colValue' } },
                                { name: 'Column 2', dataType: 'number', columnType: 'measure', properties: { colKey2: 'colValue2' } },
                                { name: 'Column 3', dataType: 'boolean', columnType: 'dimension', properties: { colKey3: 'colValue3' } }
                            ]
                        }
                    ];
                    const expectedProjections = [
                        DataTableProjections.Name,
                        DataTableProjections.RowCount,
                        DataTableProjections.ColumnCount,
                        DataTableProjections.CreatedAt,
                        DataTableProjections.Workspace,
                        DataTableProjections.MetadataModifiedAt,
                        DataTableProjections.MetadataRevision,
                        DataTableProjections.RowsModifiedAt,
                        DataTableProjections.SupportsAppend,
                        DataTableProjections.Properties,
                        DataTableProjections.ColumnName,
                        DataTableProjections.ColumnDataType,
                        DataTableProjections.ColumnType,
                        DataTableProjections.ColumnProperties
                    ];
                    const expectedFields = [
                        {
                            name: DataTableProperties.Name,
                            type: 'string',
                            values: ['Table 1', 'Table 2']
                        },
                        {
                            name: DataTableProperties.Id,
                            type: 'string',
                            values: ['table-1', 'table-2']
                        },
                        {
                            name: DataTableProperties.RowCount,
                            type: 'number',
                            values: [100, 200]
                        },
                        {
                            name: DataTableProperties.ColumnCount,
                            type: 'number',
                            values: [2, 3]
                        },
                        {
                            name: DataTableProperties.CreatedAt,
                            type: 'time',
                            values: ['2023-01-01T00:00:00Z', '2023-01-04T00:00:00Z']
                        },
                        {
                            name: DataTableProperties.Workspace,
                            type: 'string',
                            values: ['Workspace 1', 'Workspace 2']
                        },
                        {
                            name: DataTableProperties.MetadataModifiedAt,
                            type: 'time',
                            values: ['2023-01-02T00:00:00Z', '2023-01-05T00:00:00Z']
                        },
                        {
                            name: DataTableProperties.MetadataRevision,
                            type: 'number',
                            values: [2, 1]
                        },
                        {
                            name: DataTableProperties.RowsModifiedAt,
                            type: 'time',
                            values: ['2023-01-03T00:00:00Z', '2023-01-06T00:00:00Z']
                        },
                        {
                            name: DataTableProperties.SupportsAppend,
                            type: 'boolean',
                            values: [true, false]
                        },
                        {
                            name: DataTableProperties.Properties,
                            type: 'other',
                            values: [{ key: 'value' }, { key: 'value2' }]
                        },
                        {
                            name: DataTableProperties.ColumnName,
                            type: 'other',
                            values: [['Column 1', 'Column 2'], ['Column 1', 'Column 2', 'Column 3']]
                        },
                        {
                            name: DataTableProperties.ColumnDataType,
                            type: 'other',
                            values: [['string', 'number'], ['string', 'number', 'boolean']]
                        },
                        {
                            name: DataTableProperties.ColumnType,
                            type: 'other',
                            values: [['dimension', 'measure'], ['dimension', 'measure', 'dimension']]
                        },
                        {
                            name: DataTableProperties.ColumnProperties,
                            type: 'other',
                            values: [
                                [{ colKey: 'colValue' }, { colKey2: 'colValue2' }],
                                [{ colKey: 'colValue' }, { colKey2: 'colValue2' }, { colKey3: 'colValue3' }]
                            ]
                        }
                    ];
                    const processedQuery = getProcessedQuery(queryWithAllProperties);
                    processQuerySpy.mockReturnValue(processedQuery);
                    queryTablesSpy.mockResolvedValue(mockTables);
                    transformComputedFieldsQuerySpy.mockImplementation((queryStr, _) => queryStr);

                    const result = await ds.runQuery(queryWithAllProperties, options);

                    expect(queryTablesSpy).toHaveBeenCalledWith(
                        'name = "Test Table"',
                        1000,
                        expectedProjections
                    );
                    expect(result).toEqual({
                        refId: 'A',
                        name: 'A',
                        fields: expectedFields
                    });
                });
            });
        });
    });

    describe('metricFindQuery', () => {
        it('should return an empty array', async () => {
            const result = await ds.metricFindQuery({} as any);
            expect(result).toEqual([]);
        });
    });

    describe('shouldRunQuery', () => {
        it('should call processQuery with the provided query', () => {
            const query = {
                type: DataFrameQueryType.Data,
                dataTableFilter: 'name = "Test Table"',
                dataTableProperties: [DataTableProperties.Name],
                take: 1000
            } as ValidDataFrameQueryV2;
            const processQuerySpy = jest.spyOn(ds, 'processQuery');

            ds.shouldRunQuery(query);

            expect(processQuerySpy).toHaveBeenCalledWith(query);
        });

        it('should return true when processed query type is Properties', () => {
            const query = {
                type: DataFrameQueryType.Properties,
            } as ValidDataFrameQueryV2;
            jest.spyOn(ds, 'processQuery').mockReturnValue(query);

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(true);
        });

        it('should return false when processed query type is not Properties', () => {
            const query = {
                type: DataFrameQueryType.Data,
            } as ValidDataFrameQueryV2;
            jest.spyOn(ds, 'processQuery').mockReturnValue(query);

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(false);
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

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take, projection }, {}, true);
            expect(result).toBe(mockTables);
        });

        it('should use TAKE_LIMIT as default take value when not provided', async () => {
            const filter = 'test-filter';
            const result = await ds.queryTables(filter);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take: TAKE_LIMIT }, {}, true);
            expect(result).toBe(mockTables);
        });

        it('should use undefined as default projection value when not provided', async () => {
            const filter = 'test-filter';
            const take = 15;
            const result = await ds.queryTables(filter, take);

            expect(postMock).toHaveBeenCalledWith(`${ds.baseUrl}/query-tables`, { filter, take, projection: undefined }, {}, true);
            expect(result).toBe(mockTables);
        });
    });
});
