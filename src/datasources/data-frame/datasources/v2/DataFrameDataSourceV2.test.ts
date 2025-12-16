import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { ColumnType, DataFrameDataQuery, DataFrameQueryType, DataFrameQueryV1, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataFrameVariableQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, ValidDataFrameQueryV2 } from '../../types';
import { COLUMN_SELECTION_LIMIT, TAKE_LIMIT } from 'datasources/data-frame/constants';
import * as queryBuilderUtils from 'core/query-builder.utils';
import { DataTableQueryBuilderFieldNames } from 'datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants';
import { Workspace } from 'core/types';
import { isObservable, lastValueFrom, Observable, of, throwError } from 'rxjs';
import * as coreUtils from 'core/utils';

jest.mock('core/query-builder.utils', () => {
    const actualQueryBuilderUtils = jest.requireActual('core/query-builder.utils');
    return {
        ...actualQueryBuilderUtils,
        transformComputedFieldsQuery: jest.fn(actualQueryBuilderUtils.transformComputedFieldsQuery),
        timeFieldsQuery: jest.fn(actualQueryBuilderUtils.timeFieldsQuery),
        multipleValuesQuery: jest.fn(actualQueryBuilderUtils.multipleValuesQuery),
    };
});

jest.mock('core/utils', () => {
    const actualCoreUtils = jest.requireActual('core/utils');
    return {
        ...actualCoreUtils,
        replaceVariables: jest.fn(actualCoreUtils.replaceVariables),
    };
});

describe('DataFrameDataSourceV2', () => {
    let instanceSettings: DataSourceInstanceSettings<any>;
    let backendSrv: jest.Mocked<BackendSrv>;
    let templateSrv: jest.Mocked<TemplateSrv>;
    let ds: DataFrameDataSourceV2;

    beforeEach(() => {
        jest.clearAllMocks();
        const actualQueryBuilderUtils = jest.requireActual('core/query-builder.utils');
        (queryBuilderUtils.transformComputedFieldsQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.transformComputedFieldsQuery);
        (queryBuilderUtils.timeFieldsQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.timeFieldsQuery);
        (queryBuilderUtils.multipleValuesQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.multipleValuesQuery);

        const actualCoreUtils = jest.requireActual('core/utils');
        (coreUtils.replaceVariables as jest.Mock).mockImplementation(actualCoreUtils.replaceVariables);

        instanceSettings = {
            id: 1,
            name: 'test',
            type: 'test',
            url: '',
            jsonData: {
                featureToggles: {
                    queryByResultAndColumnProperties: true
                }
            }
        } as any;
        backendSrv = {
            fetch: jest.fn().mockReturnValue(of({
                data: {
                    endpoint: 'test',
                    sessionKey: {
                        expiry: new Date(Date.now() + 3600000).toISOString(),
                        secret: 'test-secret'
                    }
                }
            }))
        } as any;
        templateSrv = {
            replace: jest.fn((value: string) => value),
            getVariables: jest.fn(() => []),
            containsTemplate: jest.fn((value: string) => value.includes("$"))
        } as any;
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
        const query = {
            type: DataFrameQueryType.Data,
            dataTableFilter: 'name = "${name}"',
            dataTableProperties: [DataTableProperties.Name],
            take: 1000
        } as DataFrameQueryV2;
        const options = {
            scopedVars: {
                name: { value: 'Test Table' }
            }
        } as unknown as DataQueryRequest<DataFrameQueryV2>;

        it('should call processQuery with the provided query', async () => {
            const processQuerySpy = jest.spyOn(ds, 'processQuery');
            await lastValueFrom(ds.runQuery(query, options));

            expect(processQuerySpy).toHaveBeenCalledWith(query);
        });

        it('should call transformComputedFieldsQuery when dataTableFilter is present', async () => {
            templateSrv.replace.mockReturnValue('name = "Test Table"');

            await lastValueFrom(ds.runQuery(query, options));

            expect(templateSrv.replace).toHaveBeenCalledWith('name = "${name}"', options.scopedVars);
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'name = "Test Table"',
                expect.any(Object)
            );
        });

        it('should transform resultFilter and use it in API calls when resultFilter is present', async () => {
            const query = {
                type: DataFrameQueryType.Properties,
                resultFilter: 'status = "${status}"'
            } as DataFrameQueryV2;
            templateSrv.replace.mockReturnValue('status = "Passed"');
            const postMock$ = jest.spyOn(ds, 'post$').mockImplementation((url) => {
                if (url.includes('nitestmonitor/v2/query-results')) {
                    return of({ results: [{ id: 'result-1' }], continuation: null });
                }
                return of({ tables: [] });
            });

            await lastValueFrom(ds.runQuery(query, options));

            expect(templateSrv.replace).toHaveBeenCalledWith('status = "${status}"', options.scopedVars);
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'status = "Passed"',
                expect.any(Object)
            );
            expect(postMock$).toHaveBeenCalledWith(
                `${instanceSettings.url}/nitestmonitor/v2/query-results`,
                expect.objectContaining({
                    filter: 'status = "Passed"'
                }),
                expect.any(Object)
            );
        });

        it('should call transformComputedFieldsQuery when columnFilter is present', async () => {
            const query = {
                type: DataFrameQueryType.Properties,
                columnFilter: 'name = "${columnName}"',
                dataTableProperties: [DataTableProperties.Name],
                take: 1000,
                refId: 'A'
            } as DataFrameQueryV2;
            templateSrv.replace.mockReturnValue('TestColumn');
            const queryTablesSpy$ = jest.spyOn(ds, 'queryTables$').mockReturnValue(of([]));

            await lastValueFrom(ds.runQuery(query, options));

            expect(templateSrv.replace).toHaveBeenCalledWith('${columnName}', options.scopedVars);
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'name = "${columnName}"',
                expect.any(Object)
            );
            expect(queryTablesSpy$).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnFilter: 'columns.any(it.name = "TestColumn")'
                }),
                expect.anything(),
                expect.anything()
            );
        });

        it('should use expected ExpressionTransformFunction for the fields', async () => {
            const transformComputedFieldsQuerySpy = queryBuilderUtils.transformComputedFieldsQuery as jest.Mock;
            const timeFieldsQuery = queryBuilderUtils.timeFieldsQuery as jest.Mock;
            const multipleValuesQuery = queryBuilderUtils.multipleValuesQuery as jest.Mock;
            const mockTimeFieldsExpressionTransformFunction = jest.fn().mockReturnValue("transformed-time-expressions");
            const mockMultipleValuesExpressionTransformFunction = jest.fn().mockReturnValue("transformed-multiple-values");
            timeFieldsQuery.mockReturnValue(mockTimeFieldsExpressionTransformFunction);
            multipleValuesQuery.mockReturnValue(mockMultipleValuesExpressionTransformFunction);
            ds = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);

            await lastValueFrom(ds.runQuery(query, options));

            const dataTableComputedDataFields = transformComputedFieldsQuerySpy
                .mock.calls[0][1] as Map<string, queryBuilderUtils.ExpressionTransformFunction>;
            const transformedFields = Array.from(dataTableComputedDataFields.entries())
                .map(([field, expressionTransformFunction]) => ({
                    field,
                    value: expressionTransformFunction('123', '=')
                }));
            expect(transformedFields).toEqual([
                { field: DataTableQueryBuilderFieldNames.Name, value: "transformed-multiple-values" },
                { field: DataTableQueryBuilderFieldNames.Id, value: "transformed-multiple-values" },
                { field: DataTableQueryBuilderFieldNames.RowCount, value: "transformed-multiple-values" },
                { field: DataTableQueryBuilderFieldNames.CreatedAt, value: "transformed-time-expressions" },
                { field: DataTableQueryBuilderFieldNames.Workspace, value: "transformed-multiple-values" },
                { field: DataTableQueryBuilderFieldNames.MetadataModifiedAt, value: "transformed-time-expressions" },
                { field: DataTableQueryBuilderFieldNames.RowsModifiedAt, value: "transformed-time-expressions" },
                { field: DataTableQueryBuilderFieldNames.SupportsAppend, value: "transformed-multiple-values" },
                { field: DataTableQueryBuilderFieldNames.Properties, value: "transformed-multiple-values" }
            ]);
        });

        describe("when query type is data", () => {
            const dataQuery = {
                type: DataFrameQueryType.Data,
                refId: 'A'
            } as DataFrameQueryV2;
            let queryTablesSpy$: jest.SpyInstance;

            beforeEach(() => {
                queryTablesSpy$ = jest.spyOn(ds, 'queryTables$');
            });

            it('should return an object with empty fields array', async () => {
                const result = await lastValueFrom(ds.runQuery(dataQuery, options));

                expect(result).toEqual(
                    expect.objectContaining({
                        refId: 'A',
                        name: 'A',
                        fields: []
                    })
                );
            });

            it('should not call loadWorkspaces', async () => {
                const loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces');

                await lastValueFrom(ds.runQuery(dataQuery, options));

                expect(loadWorkspacesSpy).not.toHaveBeenCalled();
            });

            it('should not call queryTables$', async () => {
                await lastValueFrom(ds.runQuery(dataQuery, options));

                expect(queryTablesSpy$).not.toHaveBeenCalled();
            });

            it('should return empty DataFrame without querying tables when all filters are empty', async () => {
                const emptyFilterQuery = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: '',
                    columnFilter: '',
                    resultFilter: '',
                    refId: 'A'
                } as DataFrameQueryV2;

                const result = await lastValueFrom(ds.runQuery(emptyFilterQuery, options));

                expect(result).toEqual(
                    expect.objectContaining({
                        refId: 'A',
                        name: 'A',
                        fields: []
                    })
                );
                expect(queryTablesSpy$).not.toHaveBeenCalled();
            });

            it('should return empty DataFrame without querying tables when only column filter is provided', async () => {
                const emptyFilterQuery = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: '',
                    columnFilter: 'column = "test"',
                    resultFilter: '',
                    refId: 'A'
                } as DataFrameQueryV2;

                const result = await lastValueFrom(ds.runQuery(emptyFilterQuery, options));

                expect(result).toEqual(
                    expect.objectContaining({
                        refId: 'A',
                        name: 'A',
                        fields: []
                    })
                );
                expect(queryTablesSpy$).not.toHaveBeenCalled();
            });

            it('should proceed with query when dataTableFilter is provided', async () => {
                const queryWithFilter = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "test"',
                    columnFilter: '',
                    resultFilter: '',
                    columns: ['col1-Numeric'],
                    refId: 'B'
                } as DataFrameQueryV2;
                queryTablesSpy$.mockReturnValue(of([{
                    id: 'table1',
                    columns: [{
                        name: 'col1',
                        dataType: 'INT32',
                        columnType: ColumnType.Normal
                    }]
                }]));
                jest.spyOn(ds, 'post$').mockReturnValue(of({ frame: { columns: [], data: [] } }));

                await lastValueFrom(ds.runQuery(queryWithFilter, options));

                expect(queryTablesSpy$).toHaveBeenCalled();
            });

            it('should proceed with query when resultFilter is provided', async () => {
                const queryWithResultFilter = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: '',
                    columnFilter: '',
                    resultFilter: 'status = "Passed"',
                    columns: ['col1-Numeric'],
                    refId: 'C'
                } as DataFrameQueryV2;
                const postMock$ = jest.spyOn(ds, 'post$').mockImplementation((url) => {
                    if (url.includes('nitestmonitor/v2/query-results')) {
                        return of({ results: [{ id: 'result1' }], continuation: null });
                    }
                    if (url.includes('query-decimated-data')) {
                        return of({ frame: { columns: ['col1'], data: [] } });
                    }
                    return of({
                        tables: [{
                            id: 'table1',
                            name: 'table1',
                            columns: [{
                                name: 'col1',
                                dataType: 'INT32',
                                columnType: ColumnType.Normal
                            }]
                        }]
                    });
                });

                await lastValueFrom(ds.runQuery(queryWithResultFilter, options));

                expect(postMock$).toHaveBeenCalled();
            });

            describe('column handling', () => {
                let options: DataQueryRequest<DataFrameQueryV2>;
                let queryTablesSpy: jest.SpyInstance;

                const projections = [
                    DataTableProjections.Name,
                    DataTableProjections.ColumnName,
                    DataTableProjections.ColumnDataType,
                    DataTableProjections.ColumnType
                ];

                beforeEach(() => {
                    options = {
                        scopedVars: {},
                    } as any;
                    queryTablesSpy = jest.spyOn(ds, 'queryTables$');
                });

                it('should properly replace variables in the columns array', async () => {
                    const mockTables = [{
                        id: 'table1',
                        columns: [
                            {
                                name: 'col1',
                                dataType: 'INT32',
                                columnType: ColumnType.Normal
                            },
                            {
                                name: 'col2',
                                dataType: 'STRING',
                                columnType: ColumnType.Normal
                            },
                            {
                                name: 'col3',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal
                            }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));
                    jest.spyOn(ds, 'post$').mockReturnValue(of({
                        frame: {
                            columns: ['col1'],
                            data: [['1']]
                        }
                    }));
                    (coreUtils.replaceVariables as jest.Mock).mockReturnValue(['col1-Numeric']);
                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['${colName1}', 'col2-String', '${colName2}'],
                        dataTableFilter: 'name = "Test"',
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(ds.runQuery(query, options));

                    expect(coreUtils.replaceVariables).toHaveBeenCalledWith(
                        ['${colName1}', 'col2-String', '${colName2}'], templateSrv
                    );
                    // TODO: AB#3526598 - Update to check if the decimated data is returned properly for the selected columns.
                    expect(result.refId).toBe('A');
                });

                describe('when columns are not selected', () => {
                    it('should return empty DataFrame and skip table query when columns array is empty', async () => {
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: []
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(
                            ds.runQuery(query, options)
                        );

                        expect(result).toEqual(
                            expect.objectContaining({
                                refId: 'A',
                                name: 'A',
                                fields: []
                            })
                        );
                        expect(queryTablesSpy).not.toHaveBeenCalled();
                    });

                    it('should return empty DataFrame and skip table query when columns observable emits empty array', async () => {
                        const query: any = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: of([]),
                        };

                        const result = await lastValueFrom(
                            ds.runQuery(query, options)
                        );

                        expect(result).toEqual(
                            expect.objectContaining({
                                refId: 'A',
                                name: 'A',
                                fields: []
                            })
                        );
                        expect(queryTablesSpy).not.toHaveBeenCalled();
                    });
                });

                describe('when columns are selected', () => {
                    it(`should throw error when user selects column is more than ${COLUMN_SELECTION_LIMIT}`, async () => {
                        const selectedColumns = Array.from(
                            {
                                length: COLUMN_SELECTION_LIMIT + 1
                            },
                            (_, i) => `col${i}-Numeric`
                        );
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            `The number of columns you selected (${(COLUMN_SELECTION_LIMIT + 1).toLocaleString()}) exceeds the column limit (${COLUMN_SELECTION_LIMIT.toLocaleString()}). Reduce your number of selected columns and try again.`
                        );
                    });

                    it('should query tables and return results when columns are provided as array', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                {
                                    name: 'colA',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                },
                                {
                                    name: 'colB',
                                    dataType: 'TIMESTAMP',
                                    columnType: ColumnType.Normal
                                }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['colA', 'colB'],
                                data: [
                                    ['2024-01-01T00:00:00Z', '1'],
                                    ['2024-01-01T01:00:00Z', '2']
                                ]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: [
                                'colA-Numeric',
                                'colB-Timestamp'
                            ],
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                            {
                                "resultFilter": "status = \"Active\"",
                                "dataTableFilter": "name = \"Test\"",
                                "columnFilter": "columns.any(it.name = \"colA\")"
                            },
                            TAKE_LIMIT,
                            projections
                        );
                        expect(result.refId).toBe('A');
                    });

                    it('should query tables and return results when columns are provided as observable', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                {
                                    name: 'colX',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal
                                }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['colX'],
                                data: [['10.5', '20.3']]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockReturnValue(of(mockDecimatedData));

                        const query: any = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: of(['colX-Numeric']),
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colX"'
                        };

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                            {
                                "resultFilter": "status = \"Active\"",
                                "dataTableFilter": "name = \"Test\"",
                                "columnFilter": "columns.any(it.name = \"colX\")"
                            },
                            TAKE_LIMIT,
                            projections
                        );
                        expect(result.refId).toBe('A');
                    });

                    it('should throw error when table query returns no results', async () => {
                        queryTablesSpy.mockReturnValue(of([]));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['col1-Numeric'],
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your filters.'
                        );
                    });

                    it('should throw error when table has undefined columns property', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: undefined
                            } as any
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['col1-Numeric'],
                            dataTableFilter: 'name = "test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your filters.'
                        );
                    });

                    it('should throw error when table has empty columns array', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: []
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['col1-Numeric'],
                            dataTableFilter: 'name = "test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your filters.'
                        );
                    });
                });

                describe('invalid columns', () => {
                    const errorMessage =
                        'One or more selected columns are invalid. Please update your column selection or refine your filters.';

                    it('should throw error when some selected columns are invalid', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'colA',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'colB',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: [
                                'colA-Numeric',
                                'colB-String',
                                'colC-String'
                            ],
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(errorMessage);
                    });

                    it('should publish alert when any of the selected columns are invalid', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'colX',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        const publishMock = jest.fn();
                        (ds as any).appEvents = { publish: publishMock };
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query: any = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: of(['colY-Numeric']),
                            dataTableFilter: 'name = \"test\"',
                        };

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(errorMessage);

                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'Column selection error',
                                errorMessage
                            ]
                        });
                    });
                });

                describe('include index columns', () => {
                    describe('when includeIndexColumns is true', () => {
                        it('should return empty array when no columns are selected', () => {
                            const selectedColumns: string[] = [];
                            const table = {
                                id: 'table1',
                                name: 'Table1',
                                columns: [
                                    {
                                        name: 'ColumnA',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                    {
                                        name: 'Index',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Index,
                                        properties: {}
                                    },
                                ]
                            };

                            const result = (ds as any).getSelectedColumnsForTable(
                                selectedColumns,
                                table,
                                true
                            );

                            expect(result).toEqual([]);
                        });

                        it('should only include index columns along with columns that are actually selected', () => {
                            const selectedColumns = ['ColumnA-String', 'ColumnB-Numeric'];
                            const table = {
                                id: 'table1',
                                name: 'Table1',
                                columns: [
                                    {
                                        name: 'Index',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Index,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnA',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnB',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnC',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnD',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    }
                                ]
                            };

                            const result = (ds as any).getSelectedColumnsForTable(
                                selectedColumns,
                                table,
                                true
                            );

                            expect(result).toEqual([
                                {
                                    name: 'ColumnA',
                                    dataType: 'STRING',
                                    columnType: ColumnType.Normal,
                                    properties: {}
                                },
                                {
                                    name: 'ColumnB',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal,
                                    properties: {}
                                },
                                {
                                    name: 'Index',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Index,
                                    properties: {}
                                },
                            ]);
                        });
                    });

                    describe('when includeIndexColumns is false', () => {
                        it('should return only selected normal columns without index columns', () => {
                            const selectedColumns = ['ColumnA-String', 'ColumnB-Numeric'];
                            const table = {
                                id: 'table1',
                                name: 'Table1',
                                columns: [
                                    {
                                        name: 'Index',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Index,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnA',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                    {
                                        name: 'ColumnB',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Normal,
                                        properties: {}
                                    },
                                ]
                            };

                            const result = (ds as any).getSelectedColumnsForTable(
                                selectedColumns,
                                table,
                                false
                            );

                            expect(result).toEqual([
                                {
                                    name: 'ColumnA',
                                    dataType: 'STRING',
                                    columnType: ColumnType.Normal,
                                    properties: {}
                                },
                                {
                                    name: 'ColumnB',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal,
                                    properties: {}
                                },
                            ]);
                        });
                    });
                });
            });

            describe('X column handling', () => {
                let queryTablesSpy: jest.SpyInstance;
                let publishMock: jest.Mock;

                beforeEach(() => {
                    queryTablesSpy = jest.spyOn(ds, 'queryTables$');
                    publishMock = jest.fn();
                    (ds as any).appEvents = { publish: publishMock };
                });

                it('should properly replace variable in the x-column', async () => {
                    const mockTables = [{
                        id: 'table1',
                        columns: [
                            {
                                name: 'timestamp',
                                dataType: 'TIMESTAMP',
                                columnType: ColumnType.Normal
                            },
                            {
                                name: 'value',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal
                            }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));
                    jest.spyOn(ds, 'post$').mockReturnValue(of({
                        frame: {
                            columns: ['timestamp', 'value'],
                            data: [['2024-01-01T00:00:00Z'], ['10.5']]
                        }
                    }));
                    templateSrv.replace.mockReturnValue('timestamp-Timestamp');
                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['value-Numeric'],
                        xColumn: '${xColName}',
                        dataTableFilter: 'name = "Test"',
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(ds.runQuery(query, options));

                    expect(templateSrv.replace).toHaveBeenCalledWith(
                        '${xColName}',
                        options.scopedVars
                    );
                    // TODO: AB#3526598 - Update to check if the decimated data api is called with expected x-column.
                    expect(result.refId).toBe('A');
                });
                describe('X column validation', () => {
                    const xColumnErrorMessage =
                        'The selected X column is invalid. Please update your X column selection or refine your filters.';

                    it('should not throw error and should not publish alert when X column is valid', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            },
                            {
                                id: 'table2',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData1 = {
                            frame: {
                                columns: ['time', 'value'],
                                data: [
                                    ['2024-01-01T00:00:00Z', '10.5'],
                                    ['2024-01-01T01:00:00Z', '20.3']
                                ]
                            }
                        };
                        const mockDecimatedData2 = {
                            frame: {
                                columns: ['time'],
                                data: [['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z']]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockImplementation((url: string) => {
                            if (url.includes('table1/query-decimated-data')) {
                                return of(mockDecimatedData1);
                            }
                            if (url.includes('table2/query-decimated-data')) {
                                return of(mockDecimatedData2);
                            }
                            return of({});
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['value-Numeric'],
                            xColumn: 'time-Timestamp',
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).resolves.not.toThrow();
                        expect(publishMock).not.toHaveBeenCalled();
                    });

                    it('should not throw error and should not publish alert when X column is not provided', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            },
                            {
                                id: 'table2',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData1 = {
                            frame: {
                                columns: ['time', 'value'],
                                data: [
                                    ['2024-01-01T00:00:00Z', '10.5'],
                                    ['2024-01-01T01:00:00Z', '20.3']
                                ]
                            }
                        };
                        const mockDecimatedData2 = {
                            frame: {
                                columns: ['time'],
                                data: [['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z']]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockImplementation((url: string) => {
                            if (url.includes('table1/query-decimated-data')) {
                                return of(mockDecimatedData1);
                            }
                            if (url.includes('table2/query-decimated-data')) {
                                return of(mockDecimatedData2);
                            }
                            return of({});
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['value-Numeric'],
                            xColumn: null,
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).resolves.not.toThrow();
                        expect(publishMock).not.toHaveBeenCalled();
                    });

                    it('should throw error and should publish alert when X column does not exist in any table', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'colA',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'colB',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            },
                            {
                                id: 'table2',
                                columns: [
                                    {
                                        name: 'colC',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['colA-Numeric', 'colB-Numeric'],
                            xColumn: 'timestamp-Timestamp',
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(xColumnErrorMessage);
                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'X Column selection error',
                                xColumnErrorMessage
                            ]
                        });
                    });

                    it('should throw error and should publish alert when X column exists in some tables but not all', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'TIMESTAMP',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            },
                            {
                                id: 'table2',
                                columns: [
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['value-Numeric'],
                            xColumn: 'time-Timestamp',
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(xColumnErrorMessage);
                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'X Column selection error',
                                xColumnErrorMessage
                            ]
                        });
                    });

                    it('should throw error and should publish alert when X column data type does not match', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'INT32',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['value-Numeric'],
                            xColumn: 'time-Timestamp',
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(xColumnErrorMessage);
                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'X Column selection error',
                                xColumnErrorMessage
                            ]
                        });
                    });

                    it('should throw error and should publish alert when X column is not numeric or timestamp', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'time',
                                        dataType: 'STRING',
                                        columnType: ColumnType.Normal
                                    },
                                    {
                                        name: 'value',
                                        dataType: 'FLOAT64',
                                        columnType: ColumnType.Normal
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['value-Numeric'],
                            xColumn: 'time-String',
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(xColumnErrorMessage);

                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'X Column selection error',
                                xColumnErrorMessage
                            ]
                        });
                    });
                });
            });
        });

        describe("when query type is properties", () => {
            let queryTablesSpy$: jest.SpyInstance;

            beforeEach(() => {
                queryTablesSpy$ = jest.spyOn(ds, 'queryTables$');
            });

            describe('when dataTableProperties and columnProperties are empty', () => {
                const queryWithEmptyProperties = {
                    type: DataFrameQueryType.Properties,
                    dataTableProperties: [],
                    columnProperties: [],
                    take: 1000,
                    refId: 'A',
                } as DataFrameQueryV2;

                it('should not call loadWorkspaces', async () => {
                    const loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces');

                    await lastValueFrom(ds.runQuery(queryWithEmptyProperties, options));

                    expect(loadWorkspacesSpy).not.toHaveBeenCalled();
                });

                it('should not call queryTables$', async () => {
                    await lastValueFrom(ds.runQuery(queryWithEmptyProperties, options));

                    expect(queryTablesSpy$).not.toHaveBeenCalled();
                });

                it('should return an object with empty fields array', async () => {
                    const result = await lastValueFrom(
                        ds.runQuery(queryWithEmptyProperties, options)
                    );

                    expect(result).toEqual(
                        {
                            refId: 'A',
                            name: 'A',
                            fields: []
                        }
                    );
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

                    it(`should not call loadWorkspaces for take value: ${takeValue}`, async () => {
                        const loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces');

                        await lastValueFrom(ds.runQuery(queryWithInvalidTake, options));

                        expect(loadWorkspacesSpy).not.toHaveBeenCalled();
                    });

                    it(`should not call queryTables$ for take value: ${takeValue}`, async () => {
                        await lastValueFrom(ds.runQuery(queryWithInvalidTake, options));

                        expect(queryTablesSpy$).not.toHaveBeenCalled();
                    });

                    it(`should return an object with empty fields array for take value: ${takeValue}`, async () => {
                        const result = await lastValueFrom(
                            ds.runQuery(queryWithInvalidTake, options)
                        );

                        expect(result).toEqual(
                            {
                                refId: 'A',
                                name: 'A',
                                fields: []
                            }
                        );
                    });
                });
            });

            describe('when dataTableProperties, columnProperties and a valid take are provided', () => {
                const validQuery = {
                    type: DataFrameQueryType.Properties,
                    resultFilter: 'partNumber = "12345"',
                    dataTableFilter: 'name = "Test Table"',
                    dataTableProperties: [DataTableProperties.Name],
                    columnProperties: [],
                    take: 1000,
                    refId: 'A',
                };

                it('should call loadWorkspaces', async () => {
                    const loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces');
                    const mockTables = [
                        { id: 'table-1', name: 'Table 1' },
                        { id: 'table-2', name: 'Table 2' }
                    ];
                    queryTablesSpy$.mockReturnValue(of(mockTables));

                    await lastValueFrom(ds.runQuery(validQuery, options));

                    expect(loadWorkspacesSpy).toHaveBeenCalled();
                });

                it('should call queryTables$ with expected arguments and return fields', async () => {
                    const mockTables = [
                        { id: 'table-1', name: 'Table 1' },
                        { id: 'table-2', name: 'Table 2' }
                    ];
                    queryTablesSpy$.mockReturnValue(of(mockTables));

                    const result = await lastValueFrom(ds.runQuery(validQuery, options));

                    expect(queryTablesSpy$).toHaveBeenCalledWith(
                        {
                            dataTableFilter: 'name = "Test Table"',
                            resultFilter: 'partNumber = "12345"',
                            columnFilter: ''
                        },
                        1000,
                        [DataTableProjections.Name]
                    );
                    expect(result).toEqual({
                        refId: 'A',
                        name: 'A',
                        fields: [
                            {
                                name: DataTableProjectionLabelLookup[DataTableProperties.Name].label,
                                type: 'string',
                                values: ['Table 1', 'Table 2']
                            }
                        ]
                    });
                });

                it('should pass empty resultFilter to queryTables$ when not provided', async () => {
                    const queryWithoutResultFilter = {
                        type: DataFrameQueryType.Properties,
                        dataTableFilter: 'name = "Table1"',
                        dataTableProperties: [DataTableProperties.Name],
                        columnProperties: [],
                        take: 1000,
                        refId: 'C',
                    };
                    const mockTables = [{ id: 'table-1', name: 'Table 1' }];
                    queryTablesSpy$.mockReturnValue(of(mockTables));

                    await lastValueFrom(ds.runQuery(queryWithoutResultFilter, options));

                    expect(queryTablesSpy$).toHaveBeenCalledWith(
                        {
                            dataTableFilter: 'name = "Table1"',
                            resultFilter: '',
                            columnFilter: ''
                        },
                        1000,
                        [DataTableProjections.Name]
                    );
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
                            id: 'table-1',
                            name: 'Table 1',
                            rowCount: 100,
                            columnCount: 2,
                            createdAt: '2023-01-01T00:00:00Z',
                            workspace: 'workspace-1',
                            metadataModifiedAt: '2023-01-02T00:00:00Z',
                            metadataRevision: 2,
                            rowsModifiedAt: '2023-01-03T00:00:00Z',
                            supportsAppend: true,
                            properties: { key: 'value' },
                            columns: [
                                {
                                    name: 'Column 1',
                                    dataType: 'string',
                                    columnType: 'dimension',
                                    properties: { colKey: 'colValue' }
                                },
                                {
                                    name: 'Column 2',
                                    dataType: 'number',
                                    columnType: 'measure',
                                    properties: { colKey2: 'colValue2' }
                                }
                            ]
                        },
                        {
                            id: 'table-2',
                            name: 'Table 2',
                            rowCount: 200,
                            columnCount: 3,
                            createdAt: '2023-01-04T00:00:00Z',
                            workspace: 'workspace-2',
                            metadataModifiedAt: '2023-01-05T00:00:00Z',
                            metadataRevision: 1,
                            rowsModifiedAt: '2023-01-06T00:00:00Z',
                            supportsAppend: false,
                            properties: { key: 'value2' },
                            columns: [
                                {
                                    name: 'Column 1',
                                    dataType: 'string',
                                    columnType: 'dimension',
                                    properties: { colKey: 'colValue' }
                                },
                                {
                                    name: 'Column 2',
                                    dataType: 'number',
                                    columnType: 'measure',
                                    properties: { colKey2: 'colValue2' }
                                },
                                {
                                    name: 'Column 3',
                                    dataType: 'boolean',
                                    columnType: 'dimension',
                                    properties: { colKey3: 'colValue3' }
                                }
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
                            name: DataTableProjectionLabelLookup[DataTableProperties.Name].label,
                            type: 'string',
                            values: ['Table 1', 'Table 1', 'Table 2', 'Table 2', 'Table 2']
                        },
                        {
                            name: DataTableProjectionLabelLookup[DataTableProperties.Id].label,
                            type: 'string',
                            values: ['table-1', 'table-1', 'table-2', 'table-2', 'table-2']
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.RowCount
                            ].label,
                            type: 'number',
                            values: [100, 100, 200, 200, 200]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.ColumnCount
                            ].label,
                            type: 'number',
                            values: [2, 2, 3, 3, 3]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.CreatedAt
                            ].label,
                            type: 'time',
                            values: [
                                '2023-01-01T00:00:00Z',
                                '2023-01-01T00:00:00Z',
                                '2023-01-04T00:00:00Z',
                                '2023-01-04T00:00:00Z',
                                '2023-01-04T00:00:00Z'
                            ]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.Workspace
                            ].label,
                            type: 'string',
                            values: [
                                'Workspace 1',
                                'Workspace 1',
                                'Workspace 2',
                                'Workspace 2',
                                'Workspace 2'
                            ]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.MetadataModifiedAt
                            ].label,
                            type: 'time',
                            values: [
                                '2023-01-02T00:00:00Z',
                                '2023-01-02T00:00:00Z',
                                '2023-01-05T00:00:00Z',
                                '2023-01-05T00:00:00Z',
                                '2023-01-05T00:00:00Z'
                            ]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.MetadataRevision
                            ].label,
                            type: 'number',
                            values: [2, 2, 1, 1, 1]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.RowsModifiedAt
                            ].label,
                            type: 'time',
                            values: [
                                '2023-01-03T00:00:00Z',
                                '2023-01-03T00:00:00Z',
                                '2023-01-06T00:00:00Z',
                                '2023-01-06T00:00:00Z',
                                '2023-01-06T00:00:00Z'
                            ]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.SupportsAppend
                            ].label,
                            type: 'boolean',
                            values: [true, true, false, false, false]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.Properties
                            ].label,
                            type: 'other',
                            values: [
                                { key: 'value' },
                                { key: 'value' },
                                { key: 'value2' },
                                { key: 'value2' },
                                { key: 'value2' }
                            ]
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.ColumnName
                            ].label,
                            type: 'string',
                            values: ['Column 1', 'Column 2', 'Column 1', 'Column 2', 'Column 3']
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.ColumnDataType
                            ].label,
                            type: 'string',
                            values: ['string', 'number', 'string', 'number', 'boolean']
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.ColumnType
                            ].label,
                            type: 'string',
                            values: ['dimension', 'measure', 'dimension', 'measure', 'dimension']
                        },
                        {
                            name: DataTableProjectionLabelLookup[
                                DataTableProperties.ColumnProperties
                            ].label,
                            type: 'other',
                            values: [
                                { colKey: 'colValue' },
                                { colKey2: 'colValue2' },
                                { colKey: 'colValue' },
                                { colKey2: 'colValue2' },
                                { colKey3: 'colValue3' }
                            ]
                        }
                    ];
                    const mockWorkspaces = new Map<string, Workspace>([
                        [
                            'workspace-1',
                            {
                                id: 'workspace-1',
                                name: 'Workspace 1',
                                default: false,
                                enabled: true
                            }
                        ],
                        [
                            'workspace-2',
                            {
                                id: 'workspace-2',
                                name: 'Workspace 2',
                                default: false,
                                enabled: true
                            }
                        ]
                    ]);
                    const loadWorkspacesSpy = jest.spyOn(ds, 'loadWorkspaces');
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    loadWorkspacesSpy.mockResolvedValue(mockWorkspaces);

                    const result = await lastValueFrom(
                        ds.runQuery(queryWithAllProperties, options)
                    );

                    expect(queryTablesSpy$).toHaveBeenCalledWith(
                        {
                            dataTableFilter: 'name = "Test Table"',
                            resultFilter: '',
                            columnFilter: ''
                        },
                        1000,
                        expectedProjections
                    );
                    expect(result).toEqual({
                        refId: 'A',
                        name: 'A',
                        fields: expectedFields
                    });
                });

                it('should return 1 million values when the query returns more than 1 million columns', async () => {
                    const queryWithColumnProperties = {
                        type: DataFrameQueryType.Properties,
                        dataTableProperties: [DataTableProperties.Name],
                        columnProperties: [DataTableProperties.ColumnName],
                        take: 1000,
                        refId: 'A',
                    };
                    const mockTables = Array.from({ length: 1000 }, (_, i) => ({
                        id: `table-${i}`,
                        name: `Table ${i}`,
                        columns: Array.from({ length: 2000 }, (_, j) => ({
                            name: `Column ${j}`,
                            dataType: 'string'
                        }))
                    }));
                    queryTablesSpy$.mockReturnValue(of(mockTables));

                    const result = await lastValueFrom(
                        ds.runQuery(queryWithColumnProperties, options)
                    );

                    for (const field of result.fields) {
                        expect(field.values?.length).toEqual(1000000);
                    }
                });
            });
        });
    });

    describe('metricFindQuery', () => {
        const query = {
            queryType: DataFrameVariableQueryType.ListDataTables,
            dataTableFilter: 'name = "${name}"',
            refId: 'A'
        } as DataFrameVariableQuery;
        const options = {
            scopedVars: {
                name: { value: 'Test Table' }
            }
        };
        let queryTablesSpy$: jest.SpyInstance;

        beforeEach(() => {
            queryTablesSpy$ = jest.spyOn(ds, 'queryTables$').mockReturnValue(of([]));
        });

        it('should call processVariableQuery with the provided query', async () => {
            const processVariableQuerySpy = jest.spyOn(ds, 'processVariableQuery');

            await ds.metricFindQuery(query, options);

            expect(processVariableQuerySpy).toHaveBeenCalledWith(query);
        });

        it('should call transformComputedFieldsQuery when dataTableFilter is present', async () => {
            templateSrv.replace.mockReturnValue('name = "Test Table"');

            await ds.metricFindQuery(query, options);

            expect(templateSrv.replace).toHaveBeenCalledWith('name = "${name}"', options.scopedVars);
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'name = "Test Table"',
                expect.any(Object)
            );
        });

        it('should transform resultFilter and pass transformed value to queryTables$ when present', async () => {
            const query = {
                queryType: DataFrameVariableQueryType.ListDataTables,
                resultFilter: 'status = "${status}"',
                refId: 'A'
            } as DataFrameVariableQuery;
            const optionsWithStatus = {
                scopedVars: {
                    status: { value: 'Passed' }
                }
            };
            templateSrv.replace.mockReturnValue('status = "Passed"');
            queryTablesSpy$.mockReturnValue(of([]));

            await ds.metricFindQuery(query, optionsWithStatus);

            expect(templateSrv.replace).toHaveBeenCalledWith('status = "${status}"', optionsWithStatus.scopedVars);
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'status = "Passed"',
                expect.any(Object)
            );
            expect(queryTablesSpy$).toHaveBeenCalledWith(
                expect.objectContaining({
                    resultFilter: 'status = "Passed"'
                }),
                expect.anything(),
                expect.anything()
            );
        });

        it('should transform columnFilter and pass transformed value to queryTables$ when present', async () => {
            const query = {
                queryType: DataFrameVariableQueryType.ListDataTables,
                columnFilter: 'name = "${columnName}"',
                refId: 'A'
            } as DataFrameVariableQuery;
            const optionsWithColumnName = {
                scopedVars: {
                    columnName: { value: 'TestColumn' }
                }
            };
            templateSrv.replace.mockReturnValue('TestColumn');
            queryTablesSpy$.mockReturnValue(of([]));

            await ds.metricFindQuery(query, optionsWithColumnName);

            expect(templateSrv.replace).toHaveBeenCalledWith('${columnName}', {});
            expect(queryBuilderUtils.transformComputedFieldsQuery).toHaveBeenCalledWith(
                'name = "${columnName}"',
                expect.any(Object)
            );
            expect(queryTablesSpy$).toHaveBeenCalledWith(
                expect.objectContaining({
                    columnFilter: 'columns.any(it.name = "TestColumn")'
                }),
                expect.anything(),
                expect.anything()
            );
        });

        it('should use expected ExpressionTransformFunction for the fields', async () => {
            const transformComputedFieldsQuerySpy = queryBuilderUtils
                .transformComputedFieldsQuery as jest.Mock;
            const timeFieldsQuery = queryBuilderUtils.timeFieldsQuery as jest.Mock;
            const multipleValuesQuery = queryBuilderUtils.multipleValuesQuery as jest.Mock;
            const mockTimeFieldsExpressionTransformFunction = jest.fn().mockReturnValue(
                "transformed-time-expressions"
            );
            const mockMultipleValuesExpressionTransformFunction = jest.fn().mockReturnValue(
                "transformed-multiple-values"
            );
            timeFieldsQuery.mockReturnValue(mockTimeFieldsExpressionTransformFunction);
            multipleValuesQuery.mockReturnValue(mockMultipleValuesExpressionTransformFunction);
            ds = new DataFrameDataSourceV2(instanceSettings, backendSrv, templateSrv);
            queryTablesSpy$ = jest.spyOn(ds, 'queryTables$').mockReturnValue(of([]));

            await ds.metricFindQuery(query, options);

            const dataTableComputedDataFields = transformComputedFieldsQuerySpy
                .mock.calls[0][1] as Map<string, queryBuilderUtils.ExpressionTransformFunction>;
            const transformedFields = Array.from(dataTableComputedDataFields.entries())
                .map(([field, expressionTransformFunction]) => ({
                    field,
                    value: expressionTransformFunction('123', '=')
                }));
            expect(transformedFields).toEqual([
                {
                    field: DataTableQueryBuilderFieldNames.Name,
                    value: "transformed-multiple-values"
                },
                {
                    field: DataTableQueryBuilderFieldNames.Id,
                    value: "transformed-multiple-values"
                },
                {
                    field: DataTableQueryBuilderFieldNames.RowCount,
                    value: "transformed-multiple-values"
                },
                {
                    field: DataTableQueryBuilderFieldNames.CreatedAt,
                    value: "transformed-time-expressions"
                },
                {
                    field: DataTableQueryBuilderFieldNames.Workspace,
                    value: "transformed-multiple-values"
                },
                {
                    field: DataTableQueryBuilderFieldNames.MetadataModifiedAt,
                    value: "transformed-time-expressions"
                },
                {
                    field: DataTableQueryBuilderFieldNames.RowsModifiedAt,
                    value: "transformed-time-expressions"
                },
                {
                    field: DataTableQueryBuilderFieldNames.SupportsAppend,
                    value: "transformed-multiple-values"
                },
                {
                    field: DataTableQueryBuilderFieldNames.Properties,
                    value: "transformed-multiple-values"
                }
            ]);
        });

        describe('when queryType is ListDataTables', () => {
            it('should call queryTables$ with expected arguments and return mapped tables', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const mockTables = [
                    { id: 'table-1', name: 'Table 1' },
                    { id: 'table-2', name: 'Table 2' }
                ];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                const result = await ds.metricFindQuery(query, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Test Table"',
                        resultFilter: '',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.Name]
                );
                expect(result).toEqual([
                    { text: 'Table 1 (table-1)', value: 'table-1' },
                    { text: 'Table 2 (table-2)', value: 'table-2' }
                ]);
            });

            it('should pass resultFilter to queryTables$ when provided', async () => {
                const queryWithResultFilter = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'name = "${name}"',
                    resultFilter: 'status = "Passed"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockImplementation((text?: string) => {
                    if (text === 'name = "${name}"') {
                        return 'name = "Test Table"';
                    }
                    if (text === 'status = "Passed"') {
                        return 'status = "Passed"';
                    }
                    return text || '';
                });
                const mockTables = [{ id: 'table-1', name: 'Table 1' }];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                await ds.metricFindQuery(queryWithResultFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Test Table"',
                        resultFilter: 'status = "Passed"',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.Name]
                );
            });

            it('should pass empty resultFilter when not provided', async () => {
                const queryWithoutResultFilter = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'workspace = "ws-1"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockReturnValue('workspace = "ws-1"');
                const mockTables = [{ id: 'table-1', name: 'Table 1' }];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                await ds.metricFindQuery(queryWithoutResultFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'workspace = "ws-1"',
                        resultFilter: '',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.Name]
                );
            });

            it('should transform columnFilter and pass transformed value to queryTables$ when present', async () => {
                const queryWithColumnFilter = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    columnFilter: 'name = "${columnName}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                const optionsWithColumnName = {
                    scopedVars: {
                        name: { value: 'Test Table' },
                        columnName: { value: 'TestColumn' }
                    }
                };
                templateSrv.replace.mockReturnValue('TestColumn');
                queryTablesSpy$.mockReturnValue(of([]));

                await ds.metricFindQuery(queryWithColumnFilter, optionsWithColumnName);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: '',
                        resultFilter: '',
                        columnFilter: 'columns.any(it.name = "TestColumn")'
                    },
                    1000,
                    [DataTableProjections.Name]
                );
            });

            it('should pass empty columnFilter when not provided', async () => {
                const queryWithoutColumnFilter = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'workspace = "ws-1"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockReturnValue('workspace = "ws-1"');
                const mockTables = [{ id: 'table-1', name: 'Table 1' }];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                await ds.metricFindQuery(queryWithoutColumnFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'workspace = "ws-1"',
                        resultFilter: '',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.Name]
                );
            });
        });

        describe('when queryType is ListColumns', () => {
            it('should should return the expected columns', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                queryTablesSpy$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                            { name: 'Column 2', dataType: 'INT32' }
                        ]
                    }
                ]));

                const result = await ds.metricFindQuery(query, options);

                expect(result).toEqual([
                    { text: 'Column 1', value: 'Column 1-String' },
                    { text: 'Column 2', value: 'Column 2-Numeric' }
                ]);
            });

            it('should return expected columns in sorted order', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                queryTablesSpy$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Zeta', dataType: 'STRING' },
                            { name: 'column2', dataType: 'FLOAT32' },
                            { name: 'Column1', dataType: 'INT32' },
                            { name: 'Test', dataType: 'STRING' },
                            { name: 'test1', dataType: 'INT32' },
                            { name: 'Alpha', dataType: 'INT32' }
                        ]
                    }
                ]));

                const result = await ds.metricFindQuery(query, options);

                expect(result).toEqual([
                    { text: 'Alpha', value: 'Alpha-Numeric' },
                    { text: 'Column1', value: 'Column1-Numeric' },
                    { text: 'column2', value: 'column2-Numeric' },
                    { text: 'Test', value: 'Test-String' },
                    { text: 'test1', value: 'test1-Numeric' },
                    { text: 'Zeta', value: 'Zeta-String' }
                ]);
            });

            it('should pass resultFilter to queryTables$ when provided', async () => {
                const queryWithResultFilter = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    resultFilter: 'status = "Passed"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockImplementation((text) => {
                    if (text === 'name = "${name}"') {
                        return 'name = "Test Table"';
                    }
                    if (text === 'status = "Passed"') {
                        return 'status = "Passed"';
                    }
                    return text || '';
                });
                const mockTables = [{ id: 'table-1', name: 'Table 1' }];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                await ds.metricFindQuery(queryWithResultFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Test Table"',
                        resultFilter: 'status = "Passed"',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.ColumnName, DataTableProjections.ColumnDataType]
                );
            });

            it('should pass empty resultFilter when not provided', async () => {
                const queryWithoutResultFilter = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockReturnValue('name = "Test Table"');

                await ds.metricFindQuery(queryWithoutResultFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Test Table"',
                        resultFilter: '',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.ColumnName, DataTableProjections.ColumnDataType]
                );
            });

            it('should transform columnFilter and pass transformed value to queryTables$ when present', async () => {
                const queryWithColumnFilter = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    columnFilter: 'name = "${columnName}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                const optionsWithColumnName = {
                    scopedVars: {
                        name: { value: 'Test Table' },
                        columnName: { value: 'TestColumn' }
                    }
                };
                templateSrv.replace.mockReturnValue('TestColumn');

                await ds.metricFindQuery(queryWithColumnFilter, optionsWithColumnName);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: '',
                        resultFilter: '',
                        columnFilter: 'columns.any(it.name = "TestColumn")'
                    },
                    1000,
                    [DataTableProjections.ColumnName, DataTableProjections.ColumnDataType]
                );
            });

            it('should pass empty columnFilter when not provided', async () => {
                const queryWithoutColumnFilter = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                templateSrv.replace.mockReturnValue('name = "Test Table"');

                await ds.metricFindQuery(queryWithoutColumnFilter, options);

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Test Table"',
                        resultFilter: '',
                        columnFilter: ''
                    },
                    1000,
                    [DataTableProjections.ColumnName, DataTableProjections.ColumnDataType]
                );
            });

            it('should return only 10000 columns when more than 10000 column options are available', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                const mockColumns = Array.from({ length: 10001 }, (_, i) => ({
                    name: `Column ${i + 1}`,
                    dataType: `STRING`
                }));
                queryTablesSpy$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: mockColumns
                    }
                ]));

                const result = await ds.metricFindQuery(query, options);

                expect(result.length).toEqual(10000);
            });

            it('should not include variable options', async () => {
                templateSrv.getVariables.mockReturnValue([
                    { name: 'var1' },
                    { name: 'var2' }
                ] as any);
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                queryTablesSpy$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                            { name: 'Column 2', dataType: 'INT32' },
                        ]
                    }
                ]));

                const result = await ds.metricFindQuery(query, options);

                expect(result).toEqual([
                    { text: 'Column 1', value: 'Column 1-String' },
                    { text: 'Column 2', value: 'Column 2-Numeric' }
                ]);
            });
        });
    });

    describe('shouldRunQuery', () => {
        it('should return true when query type is Properties', () => {
            const query = {
                type: DataFrameQueryType.Properties,
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(true);
        });

        it('should return true when query type is Data', () => {
            const query = {
                type: DataFrameQueryType.Data,
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(true);
        });

        it('should return false when hide is true', () => {
            const query = {
                type: DataFrameQueryType.Properties,
                hide: true
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(false);
        });

        it('should return true when hide is false', () => {
            const query = {
                type: DataFrameQueryType.Properties,
                hide: false
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(true);
        });
    });

    describe('processQuery', () => {
        describe('when query has legacy MetaData type', () => {
            it('should convert MetaData type to Properties type', () => {
                const query = {
                    type: 'Metadata' as any,
                    refId: 'A'
                } as DataFrameDataQuery;

                const result = ds.processQuery(query);

                expect(result.type).toBe(DataFrameQueryType.Properties);
            });
        });

        describe('when query has columns as objects', () => {
            it('should convert column objects to string array', () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    columns: [{ name: 'col1' }, { name: 'col2' }] as any,
                    refId: 'A'
                } as DataFrameDataQuery;

                const result = ds.processQuery(query);

                expect(result.columns).toEqual(['col1', 'col2']);
            });

            it('should return empty array when columns array is empty', () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-123',
                    columns: [],
                    refId: 'A'
                } as DataFrameDataQuery;

                const result = ds.processQuery(query);

                expect(result.columns).toEqual([]);
            });

            it('should return empty array when columns array contains objects without name property', () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-123',
                    columns: [{ dataType: 'string' }, { dataType: 'string' }] as any,
                    refId: 'A'
                } as DataFrameDataQuery;

                const result = ds.processQuery(query);

                expect(result.columns).toEqual([]);
            });

            it('should not convert columns if they are already strings', () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    columns: ['col1', 'col2'],
                    refId: 'A'
                } as DataFrameQueryV2;

                const result = ds.processQuery(query);

                expect(result.columns).toEqual(['col1', 'col2']);
            });
        });

        describe('when query contains tableId', () => {
            it('should convert V1 query to V2 format when query type is properties', () => {
                const v1Query = {
                    type: DataFrameQueryType.Properties,
                    tableId: 'table-123',
                    refId: 'A'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result).toEqual({
                    type: DataFrameQueryType.Properties,
                    resultFilter: '',
                    dataTableFilter: 'id = "table-123"',
                    columnFilter: '',
                    dataTableProperties: [DataTableProperties.Properties],
                    columnProperties: [],
                    columns: [],
                    includeIndexColumns: false,
                    filterNulls: false,
                    decimationMethod: 'LOSSY',
                    xColumn: null,
                    applyTimeFilters: false,
                    take: 1000,
                    refId: 'A'
                });
                expect(result).not.toHaveProperty('tableId');
            });

            it('should convert V1 query to V2 format when query type is data', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-456',
                    decimationMethod: 'LOSSY',
                    filterNulls: true,
                    applyTimeFilters: true,
                    refId: 'B'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result).toEqual({
                    type: DataFrameQueryType.Data,
                    resultFilter: '',
                    dataTableFilter: 'id = "table-456"',
                    columnFilter: '',
                    dataTableProperties: [
                        DataTableProperties.Name,
                        DataTableProperties.Id,
                        DataTableProperties.RowCount,
                        DataTableProperties.ColumnCount,
                        DataTableProperties.CreatedAt,
                        DataTableProperties.Workspace
                    ],
                    columnProperties: [],
                    columns: [],
                    includeIndexColumns: false,
                    filterNulls: true,
                    decimationMethod: 'LOSSY',
                    xColumn: null,
                    applyTimeFilters: true,
                    take: 1000,
                    refId: 'B'
                });
                expect(result).not.toHaveProperty('tableId');
            });

            it('should handle empty tableId by setting empty dataTableFilter', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: '',
                    refId: 'C'
                } as any;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableFilter).toBe('');
            });

            it('should handle undefined tableId by setting empty dataTableFilter', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: undefined,
                    refId: 'D'
                } as any;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableFilter).toBe('');
            });

            describe('should migrate columns from V1 to V2 correctly', () => {
                let getSpy$: jest.SpyInstance;

                beforeEach(() => {
                    getSpy$ = jest.spyOn(ds, 'get$');
                });

                it('should return an observable that resolves to migrated columns when columns are provided', async () => {
                    getSpy$.mockReturnValue(of({
                        columns: [
                            {
                                name: 'col1',
                                dataType: 'INT64'
                            },
                            {
                                name: 'col2',
                                dataType: 'STRING'
                            }
                        ]
                    }));
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(getSpy$).toHaveBeenCalledWith(
                        expect.stringContaining('tables/table-789')
                    );
                    expect(isObservable(result.columns)).toBe(true);
                    expect(await lastValueFrom(result.columns as Observable<string[]>)).toEqual(
                        ['col1-Numeric', 'col2-String']
                    );
                });

                it('should call get$ with transformed tableId when template variables are used', async () => {
                    templateSrv.replace.mockReturnValue('table-789');
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: '$table',
                        columns: ['col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    ds.processQuery(v1Query);

                    expect(templateSrv.replace).toHaveBeenCalledWith('$table', {});
                    expect(getSpy$).toHaveBeenCalledWith(
                        expect.stringContaining('tables/table-789')
                    );
                });

                it('should not call get$ and should return an empty array when no columns are provided', () => {
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: [],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(getSpy$).not.toHaveBeenCalled();
                    expect(result.columns).toEqual([]);
                });

                it('should not call get$ and should return an empty array when columns are objects without name property', () => {
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: [{ dataType: 'string' }, { dataType: 'string' }] as any,
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(getSpy$).not.toHaveBeenCalled();
                    expect(result.columns).toEqual([]);
                });

                it('should return an observable with original columns and datatype set to unknown when columns are not found in table metadata', async () => {
                    getSpy$.mockReturnValue(of({
                        columns: [
                            {
                                name: 'col2',
                                dataType: 'STRING'
                            }
                        ]
                    }));
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(isObservable(result.columns)).toBe(true);
                    expect(await lastValueFrom(result.columns as Observable<string[]>)).toEqual(
                        ['col1-Unknown', 'col2-String']
                    );
                });

                it('should return an observable with original columns without datatype when using variables for columns', async () => {
                    getSpy$.mockReturnValue(of({
                        columns: [
                            {
                                name: 'col2',
                                dataType: 'STRING'
                            }
                        ]
                    }));
                    templateSrv.containsTemplate.mockImplementation(
                        (target?: string) => target ? target.startsWith('$') : false
                    );
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['$col1', 'col2', 'col3'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(isObservable(result.columns)).toBe(true);
                    expect(await lastValueFrom(result.columns as Observable<string[]>)).toEqual(
                        ['$col1', 'col2-String', 'col3-Unknown']
                    );
                });

                it('should return an observable with original columns when get table call failed', async () => {
                    getSpy$.mockReturnValue(throwError(() => new Error('Table not found')));
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(isObservable(result.columns)).toBe(true);
                    expect(await lastValueFrom(result.columns as Observable<string[]>)).toEqual(
                        ['col1-Unknown', 'col2-Unknown']
                    );
                });

                it('should return an observable with original columns preserving variables when get table call failed', async () => {
                    getSpy$.mockReturnValue(throwError(() => new Error('Table not found')));
                    templateSrv.containsTemplate.mockImplementation(
                        (target?: string) => target ? target.startsWith('$') : false
                    );
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['$col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);

                    expect(isObservable(result.columns)).toBe(true);
                    expect(await lastValueFrom(result.columns as Observable<string[]>)).toEqual(
                        ['$col1', 'col2-Unknown']
                    );
                });

                it('should publish the error when get table call failed', async () => {
                    getSpy$.mockReturnValue(throwError(() => new Error(
                        `Request failed with status code: 404. Error message: "The requested resource was not found."`
                    )));
                    const publishMock = jest.fn();
                    (ds as any).appEvents = { publish: publishMock };
                    const v1Query = {
                        type: DataFrameQueryType.Data,
                        tableId: 'table-789',
                        columns: ['col1', 'col2'],
                        refId: 'E'
                    } as DataFrameQueryV1;

                    const result = ds.processQuery(v1Query);
                    await lastValueFrom(result.columns as Observable<string[]>);

                    expect(publishMock).toHaveBeenCalledWith({
                        type: 'alert-error',
                        payload: [
                            'Error fetching columns for migration',
                            'The query to fetch data table columns failed because the requested resource was not found. Please check the query parameters and try again.'
                        ],
                    });
                });
            });
        });

        describe('when query does not contain tableId', () => {
            it('should return query merged with defaults', () => {
                const v2Query = {
                    type: DataFrameQueryType.Properties,
                    dataTableFilter: 'name = "test"',
                    dataTableProperties: [DataTableProperties.Name, DataTableProperties.Id],
                    columnProperties: [DataTableProperties.ColumnName],
                    take: 500,
                    refId: 'E'
                } as DataFrameQueryV2;

                const result = ds.processQuery(v2Query);

                expect(result).toEqual({
                    type: DataFrameQueryType.Properties,
                    resultFilter: '',
                    dataTableFilter: 'name = "test"',
                    columnFilter: '',
                    dataTableProperties: [DataTableProperties.Name, DataTableProperties.Id],
                    columnProperties: [DataTableProperties.ColumnName],
                    columns: [],
                    includeIndexColumns: false,
                    filterNulls: false,
                    decimationMethod: 'LOSSY',
                    xColumn: null,
                    applyTimeFilters: false,
                    take: 500,
                    refId: 'E'
                });
            });

            it('should preserve all V2 query properties', () => {
                const v2Query = {
                    type: DataFrameQueryType.Data,
                    resultFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnFilter: '',
                    dataTableProperties: [],
                    columnProperties: [],
                    columns: ['col1', 'col2'],
                    includeIndexColumns: true,
                    filterNulls: true,
                    decimationMethod: 'LOSSY',
                    xColumn: 'time',
                    applyTimeFilters: true,
                    take: 100,
                    refId: 'F'
                } as DataFrameQueryV2;

                const result = ds.processQuery(v2Query);

                expect(result).toEqual(v2Query);
            });
        });
    });

    describe('prepareQuery', () => {
        it('should return the query as is', () => {
            const query = {
                type: DataFrameQueryType.Data,
                refId: 'A'
            } as ValidDataFrameQueryV2;

            const result = ds.prepareQuery(query);

            expect(result).toBe(query);
        });
    });

    describe('processVariableQuery', () => {
        describe('when query contains tableId', () => {
            it('should convert V1 query to V2 format', () => {
                const v1Query = {
                    tableId: 'table-123',
                    type: DataFrameQueryType.Data,
                    columns: ['col1'],
                    decimationMethod: 'LOSSY',
                    filterNulls: true,
                    applyTimeFilters: true,
                    refId: 'A'
                } as any;

                const result = ds.processVariableQuery(v1Query);

                expect(result).toEqual({
                    queryType: DataFrameVariableQueryType.ListColumns,
                    resultFilter: '',
                    dataTableFilter: 'id = "table-123"',
                    columnFilter: '',
                    refId: 'A'
                });
                expect(result).not.toHaveProperty('tableId');
                expect(result).not.toHaveProperty('type');
                expect(result).not.toHaveProperty('columns');
                expect(result).not.toHaveProperty('decimationMethod');
                expect(result).not.toHaveProperty('filterNulls');
                expect(result).not.toHaveProperty('applyTimeFilters');
            });

            it('should handle empty tableId by setting empty dataTableFilter', () => {
                const v1Query = {
                    tableId: '',
                    type: DataFrameQueryType.Data,
                    refId: 'B'
                } as any;

                const result = ds.processVariableQuery(v1Query);

                expect(result.dataTableFilter).toBe('');
            });

            it('should handle undefined tableId by setting empty dataTableFilter', () => {
                const v1Query = {
                    tableId: undefined,
                    type: DataFrameQueryType.Data,
                    refId: 'C'
                } as any;

                const result = ds.processVariableQuery(v1Query);

                expect(result.dataTableFilter).toBe('');
            });

            it('should preserve other base query properties during migration', () => {
                const v1Query = {
                    tableId: 'table-456',
                    type: DataFrameQueryType.Properties,
                    columns: ['col1', 'col2'],
                    decimationMethod: 'LOSSY',
                    filterNulls: false,
                    applyTimeFilters: false,
                    refId: 'D',
                    hide: true,
                    key: 'custom-key'
                } as any;

                const result = ds.processVariableQuery(v1Query);

                expect(result).toEqual({
                    queryType: DataFrameVariableQueryType.ListColumns,
                    resultFilter: '',
                    dataTableFilter: 'id = "table-456"',
                    columnFilter: '',
                    refId: 'D',
                    hide: true,
                    key: 'custom-key'
                });
            });
        });

        describe('when query does not contain tableId', () => {
            it('should return query merged with defaults for ListDataTables type', () => {
                const v2Query = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    dataTableFilter: 'name = "test"',
                    refId: 'E'
                } as DataFrameVariableQueryV2;

                const result = ds.processVariableQuery(v2Query);

                expect(result).toEqual({
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    resultFilter: '',
                    dataTableFilter: 'name = "test"',
                    columnFilter: '',
                    refId: 'E'
                });
            });

            it('should return query merged with defaults for ListColumns type', () => {
                const v2Query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'workspace = "ws-1"',
                    refId: 'F'
                } as DataFrameVariableQueryV2;

                const result = ds.processVariableQuery(v2Query);

                expect(result).toEqual({
                    queryType: DataFrameVariableQueryType.ListColumns,
                    resultFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnFilter: '',
                    refId: 'F'
                });
            });

            it('should preserve all V2 variable query properties', () => {
                const v2Query = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    resultFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnFilter: '',
                    refId: 'G',
                    hide: false
                } as DataFrameVariableQueryV2;

                const result = ds.processVariableQuery(v2Query);

                expect(result).toEqual(v2Query);
            });
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

    describe('queryTables$', () => {
        let postMock$: jest.SpyInstance;
        const publishMock = jest.fn();
        const mockTables = [{ id: '1', name: 'Table 1' }, { id: '2', name: 'Table 2' }];
        const mockResultsResponse = { results: [{ id: 'result-1' }, { id: 'result-2' },] };

        function createQueryTablesError(status: number) {
            return new Error(
                `Request to url "${ds.baseUrl}/query-tables" failed with status code: ${status}. Error message: "Error"`
            );
        }

        function createQueryResultsError(status: number) {
            return new Error(
                `Request to url "${ds.instanceSettings.url}/nitestmonitor/v2/query-results" failed with status code: ${status}. Error message: "Error"`
            );
        }

        beforeEach(() => {
            postMock$ = jest.spyOn(ds, 'post$').mockImplementation((url, body, options) => {
                if (url.includes('nitestmonitor/v2/query-results')) {
                    return of(mockResultsResponse);
                } else if (url.includes('query-tables')) {
                    return of({ tables: mockTables });
                }
                return of({});
            });
            (ds as any).appEvents = { publish: publishMock };
        });

        it('should extract result IDs and build filter with substitutions', async () => {
            const filters = { resultFilter: 'status = "Passed"', dataTableFilter: '' };
            await lastValueFrom(ds.queryTables$(filters));

            // Check that the Test Monitor API was called with the correct filter
            expect(postMock$).toHaveBeenCalledWith(
                `${instanceSettings.url}/nitestmonitor/v2/query-results`,
                {
                    filter: 'status = "Passed"',
                    projection: ['id'],
                    take: 1000,
                    orderBy: 'UPDATED_AT',
                    descending: true
                },
                { showErrorAlert: false }
            );
            // Check that the data tables API was called with the correct filter
            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: '(new[]{@0,@1}.Contains(testResultId))',
                    take: TAKE_LIMIT,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: ['result-1', 'result-2']
                },
                { useApiIngress: true, showErrorAlert: false }
            );
        });

        it('should return empty array when Test Monitor API returns no results', async () => {
            postMock$.mockImplementation((url) => {
                if (url.includes('query-results')) {
                    return of({ results: [] });
                }
                return of({ tables: mockTables });
            });

            const filters = { resultFilter: 'status = "Passed"', dataTableFilter: '' };
            const result = await lastValueFrom(ds.queryTables$(filters));

            expect(result).toEqual([]);
            // Should not call DataFrames API when no results
            expect(postMock$).toHaveBeenCalledTimes(1);
        });

        it('should not query result IDs when result filter is empty string', async () => {
            const filters = {
                resultFilter: '',
                dataTableFilter: 'name = "Table1"'
            };

            const result = await lastValueFrom(ds.queryTables$(filters, 10));

            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: 'name = "Table1"',
                    take: 10,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: undefined
                },
                { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should not query result IDs when feature flag is disabled', async () => {
            const dsWithoutFeature = new DataFrameDataSourceV2(
                { ...instanceSettings, jsonData: {} } as any,
                backendSrv,
                templateSrv
            );
            const postMockWithoutFeature$ = jest.spyOn(dsWithoutFeature, 'post$').mockReturnValue(of({ tables: mockTables }));
            const filters = {
                resultFilter: 'status = "Passed"',
                dataTableFilter: 'name = "Table1"'
            };

            const result = await lastValueFrom(dsWithoutFeature.queryTables$(filters, 10));

            // Should only call query-tables, not query-results
            expect(postMockWithoutFeature$).toHaveBeenCalledTimes(1);
            expect(postMockWithoutFeature$).toHaveBeenCalledWith(
                expect.stringContaining('query-tables'),
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: 'name = "Table1"',
                    take: 10,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: undefined
                },
                { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should combine result filter, data table filter and column filter with AND when provided', async () => {
            const filters = {
                resultFilter: 'status = "Passed"',
                dataTableFilter: 'name = "Table1"',
                columnFilter: 'columns.any(it.name = "Column1")'
            };

            await lastValueFrom(ds.queryTables$(filters, 10));

            expect(postMock$).toHaveBeenCalledWith(
                `${instanceSettings.url}/nitestmonitor/v2/query-results`,
                {
                    filter: 'status = "Passed"',
                    projection: ['id'],
                    take: 1000,
                    orderBy: 'UPDATED_AT',
                    descending: true
                },
                { showErrorAlert: false }
            );
            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: '(new[]{@0,@1}.Contains(testResultId))&&(name = "Table1")&&(columns.any(it.name = "Column1"))',
                    take: 10,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: ['result-1', 'result-2']
                },
                { useApiIngress: true, showErrorAlert: false }
            );
        });

        it('should not combine column filter when result filter is empty', async () => {
            const filters = {
                resultFilter: '',
                dataTableFilter: 'name = "Table1"',
                columnFilter: 'columns.any(it.name = "Column1")'
            };

            await lastValueFrom(ds.queryTables$(filters, 10));

            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: 'name = "Table1"',
                    take: 10,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: undefined
                },
                { useApiIngress: true, showErrorAlert: false }
            );
        });

        it('should use only result filter when data table filter is empty', async () => {
            const filters = {
                resultFilter: 'status = "Passed"',
                dataTableFilter: ''
            };

            await lastValueFrom(ds.queryTables$(filters, 10));

            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                {
                    interactive: true,
                    orderBy: 'ROWS_MODIFIED_AT',
                    orderByDescending: true,
                    filter: '(new[]{@0,@1}.Contains(testResultId))',
                    take: 10,
                    projection: [DataTableProjections.RowsModifiedAt],
                    substitutions: ['result-1', 'result-2']
                },
                { useApiIngress: true, showErrorAlert: false }
            );
        });

        it('should return empty array when query results API returns error without status', async () => {
            postMock$.mockReturnValue(throwError(() => new Error('Some unknown error')));

            await lastValueFrom(ds.queryTables$({ resultFilter: 'test-filter' }));

            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error querying test results',
                    'The query failed due to an unknown error.'
                ],
            });
            expect(publishMock).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when query results API returns 429 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryResultsError(429)));

            const result = await lastValueFrom(ds.queryTables$({ resultFilter: 'test-filter' }));

            expect(result).toEqual([]);
            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error querying test results',
                    'The query to fetch results failed due to too many requests. Please try again later.'
                ],
            });
            expect(publishMock).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when query results API returns 504 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryResultsError(504)));

            const result = await lastValueFrom(ds.queryTables$({ resultFilter: 'test-filter' }));

            expect(result).toEqual([]);
            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error querying test results',
                    'The query to fetch results experienced a timeout error. Narrow your query with a more specific filter and try again.'
                ],
            });
            expect(publishMock).toHaveBeenCalledTimes(1);
        });

        it('should return empty array when query results API returns 500 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryResultsError(500)));

            const result = await lastValueFrom(ds.queryTables$({ resultFilter: 'test-filter' }));

            expect(result).toEqual([]);
            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error querying test results',
                    'The query failed due to the following error: (status 500) "Error".'
                ],
            });
            expect(publishMock).toHaveBeenCalledTimes(1);
        });

        it('should publish alertError event when error occurs in query results API', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryResultsError(429)));

            const result = await lastValueFrom(ds.queryTables$({ resultFilter: 'test-filter' }));

            expect(result).toEqual([]);
            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error querying test results',
                    'The query to fetch results failed due to too many requests. Please try again later.'
                ],
            });
            expect(publishMock).toHaveBeenCalledTimes(1);
        });

        it('should call the `post$` method with the expected arguments and return tables', async () => {
            const filter = { dataTableFilter: 'test-filter' };
            const take = 10;
            const projection = [DataTableProjections.Name, DataTableProjections.Id];
            const result = await lastValueFrom(ds.queryTables$(filter, take, projection));
            expect(postMock$).toHaveBeenCalledWith(
              `${ds.baseUrl}/query-tables`,
              {
                interactive: true,
                orderBy: 'ROWS_MODIFIED_AT',
                orderByDescending: true,
                filter: filter.dataTableFilter,
                take,
                projection: [...projection, DataTableProjections.RowsModifiedAt],
                substitutions: undefined
              },
              { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should use TAKE_LIMIT as default take value when not provided', async () => {
            const filter = { dataTableFilter: 'test-filter' };
            const result = await lastValueFrom(ds.queryTables$(filter));

            expect(postMock$).toHaveBeenCalledWith(
              `${ds.baseUrl}/query-tables`,
              {
                interactive: true,
                orderBy: 'ROWS_MODIFIED_AT',
                orderByDescending: true,
                filter: filter.dataTableFilter,
                take: TAKE_LIMIT,
                projection: [DataTableProjections.RowsModifiedAt],
                substitutions: undefined
              },
              { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should use ROWS_MODIFIED_AT as default projection value when not provided', async () => {
            const filter = { dataTableFilter: 'test-filter' };
            const take = 15;
            const result = await lastValueFrom(ds.queryTables$(filter, take));

            expect(postMock$).toHaveBeenCalledWith(
              `${ds.baseUrl}/query-tables`,
              {
                interactive: true,
                orderBy: 'ROWS_MODIFIED_AT',
                orderByDescending: true,
                filter: filter.dataTableFilter,
                take,
                projection: [DataTableProjections.RowsModifiedAt],
                substitutions: undefined
              },
              { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should not duplicate ROWS_MODIFIED_AT when already present in projection', async () => {
            const filter = { dataTableFilter: 'test-filter' };
            const take = 10;
            const projection = [
                DataTableProjections.Name, 
                DataTableProjections.RowsModifiedAt, 
                DataTableProjections.Id
            ];
            const result = await lastValueFrom(ds.queryTables$(filter, take, projection));

            expect(postMock$).toHaveBeenCalledWith(
              `${ds.baseUrl}/query-tables`,
              {
                interactive: true,
                orderBy: 'ROWS_MODIFIED_AT',
                orderByDescending: true,
                filter: filter.dataTableFilter,
                take,
                projection: [
                    DataTableProjections.Name, 
                    DataTableProjections.RowsModifiedAt, 
                    DataTableProjections.Id
                ],
                substitutions: undefined
              },
              { useApiIngress: true, showErrorAlert: false }
            );
            expect(result).toBe(mockTables);
        });

        it('should throw error with unknown error when API returns error without status', async () => {
            postMock$.mockReturnValue(throwError(() => new Error('Some unknown error')));

            await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: 'test-filter' }))).rejects.toThrow(
                'The query failed due to an unknown error.'
            );
        });

        it('should throw too many requests error when API returns 429 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(429)));

            await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: 'test-filter' }))).rejects.toThrow(
                'The query to fetch data tables failed due to too many requests. Please try again later.'
            );
        });

        it('should throw timeOut error when API returns 504 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(504)));

            await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: 'test-filter' }))).rejects.toThrow(
                'The query to fetch data tables experienced a timeout error. Narrow your query with a more specific filter and try again.'
            );
        });

        it('should throw error with status code and message when API returns 500 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(500)));

            await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: 'test-filter' }))).rejects.toThrow(
                'The query failed due to the following error: (status 500) "Error".'
            );
        });

        it('should publish alertError event when error occurs', async () => {
            const publishMock = jest.fn();
            (ds as any).appEvents = { publish: publishMock };
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(429)));

            await expect(lastValueFrom(ds.queryTables$({ dataTableFilter: 'test-filter' }))).rejects.toThrow();

            expect(publishMock).toHaveBeenCalledWith({
                type: 'alert-error',
                payload: [
                    'Error during data tables query',
                    'The query to fetch data tables failed due to too many requests. Please try again later.'
                ],
            });
        });
    });

    describe('queryTables', () => {
        it('should return empty list', async () => {
            const result = await ds.queryTables('test-filter', 5, [
                DataTableProjections.Name,
            ]);
            expect(result).toEqual([]);
        });
    });

    describe('getColumnOptionsWithVariables', () => {
        let queryTablesMock$: jest.SpyInstance;

        beforeEach(() => {
            queryTablesMock$ = jest.spyOn(ds, 'queryTables$');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('unique columns across tables', () => {
            it('should pass all filters to queryTables$', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                        ]
                    }
                ]));

                await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'name = "Table1"',
                    resultFilter: 'status = "Passed"',
                    columnFilter: 'name = "Column 1"'
                });

                expect(queryTablesMock$).toHaveBeenCalledWith(
                    {
                        dataTableFilter: 'name = "Table1"',
                        resultFilter: 'status = "Passed"',
                        columnFilter: 'name = "Column 1"'
                    },
                    expect.any(Number),
                    expect.any(Array)
                );
            });

            it('should pass empty resultFilter when not provided', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'STRING' },
                        ]
                    }
                ]));

                await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'name = "Table1"',
                    resultFilter: ''
                });

                expect(queryTablesMock$).toHaveBeenCalledWith(
                    { dataTableFilter: 'name = "Table1"', resultFilter: '' },
                    expect.any(Number),
                    expect.any(Array)
                );
            });

            it('should return an empty array when no tables are found', async () => {
                queryTablesMock$.mockReturnValue(of([]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([]);
            });

            it('should return an empty array when tables have no columns', async () => {
                queryTablesMock$.mockReturnValue(of([
                    { id: '1', name: 'Table 1', columns: [] },
                    { id: '2', name: 'Table 2' },
                ]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([]);
            });

            it('should return columns in sorted order by label', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Zeta', dataType: 'STRING' },
                            { name: 'Column1', dataType: 'INT32' },
                            { name: 'Test', dataType: 'STRING' },
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'column2', dataType: 'FLOAT32' },
                            { name: 'test1', dataType: 'INT32' },
                            { name: 'Alpha', dataType: 'INT32' },
                            { name: 'Test', dataType: 'INT32' },
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([
                    { label: 'Alpha', value: 'Alpha-Numeric' },
                    { label: 'Column1', value: 'Column1-Numeric' },
                    { label: 'column2', value: 'column2-Numeric' },
                    { label: 'Test (Numeric)', value: 'Test-Numeric' },
                    { label: 'Test (String)', value: 'Test-String' },
                    { label: 'test1', value: 'test1-Numeric' },
                    { label: 'Zeta', value: 'Zeta-String' },
                ]);
            });

            it('should treat all numeric types as one data type -`Numeric`', async () => {
                queryTablesMock$.mockReturnValue(of([
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
                ]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });
                expect(result.uniqueColumnsAcrossTables).toEqual([
                    { label: 'Column 1', value: 'Column 1-Numeric' },
                    { label: 'Column 2', value: 'Column 2-Numeric' },
                    { label: 'Column 3', value: 'Column 3-Numeric' },
                    { label: 'Column 4', value: 'Column 4-Numeric' },
                ]);
            });

            describe('when column names do not repeat', () => {
                it('should show only the name in the labels', async () => {
                    queryTablesMock$.mockReturnValue(of([
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
                    ]));

                    const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                    expect(result.uniqueColumnsAcrossTables).toEqual([
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
                    queryTablesMock$.mockReturnValue(of([
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
                    ]));

                    const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                    expect(result.uniqueColumnsAcrossTables).toEqual([
                        { label: 'Column 1 (Numeric)', value: 'Column 1-Numeric' },
                        { label: 'Column 1 (String)', value: 'Column 1-String' }
                    ]);
                });

                it('should show data types in label', async () => {
                    queryTablesMock$.mockReturnValue(of([
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
                    ]));

                    const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                    expect(result.uniqueColumnsAcrossTables).toEqual([
                        { label: 'Column A (Boolean)', value: 'Column A-Boolean' },
                        { label: 'Column A (String)', value: 'Column A-String' },
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
                    queryTablesMock$.mockReturnValue(of([
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
                    ]));

                    const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                    expect(result.uniqueColumnsAcrossTables).toEqual([
                        { label: 'Column A', value: 'Column A-String' },
                        { label: 'Column B', value: 'Column B-Numeric' },
                        { label: 'Column C', value: 'Column C-Boolean' },
                        { label: 'Column D', value: 'Column D-Numeric' },
                    ]);
                });
            });

            describe('variable handling', () => {
                it('should prepend variable options to the column options list', async () => {
                    templateSrv.getVariables.mockReturnValue([
                        { name: 'var1' },
                        { name: 'var2' }
                    ] as any);

                    queryTablesMock$.mockReturnValue(of([
                        {
                            id: '1',
                            name: 'Table 1',
                            columns: [
                                { name: 'Column 1', dataType: 'STRING' },
                                { name: 'Column 2', dataType: 'INT32' }
                            ]
                        }
                    ]));

                    const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                    expect(result.uniqueColumnsAcrossTables).toEqual([
                        { label: '$var1', value: '$var1' },
                        { label: '$var2', value: '$var2' },
                        { label: 'Column 1', value: 'Column 1-String' },
                        { label: 'Column 2', value: 'Column 2-Numeric' }
                    ]);
                });
            });
        });

        describe('common columns across tables', () => {
            it('should return an empty array when no tables are found', async () => {
                queryTablesMock$.mockReturnValue(of([]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([]);
            });

            it('should return an empty array when tables have no columns', async () => {
                queryTablesMock$.mockReturnValue(of([
                    { id: '1', name: 'Table 1' },
                    { id: '2', name: 'Table 2' },
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([]);
            });

            it('should return only common numeric columns across all tables', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'INT32' },
                            { name: 'Column 2', dataType: 'STRING' },
                            { name: 'Column 3', dataType: 'BOOLEAN' }
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column 1', dataType: 'FLOAT32' },
                            { name: 'Column 2', dataType: 'STRING' },
                            { name: 'Column 4', dataType: 'TIMESTAMP' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([
                    { label: 'Column 1', value: 'Column 1-Numeric' }
                ]);
            });

            it('should return columns in sorted order by label', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Zeta', dataType: 'STRING' },
                            { name: 'Column1', dataType: 'INT32' },
                            { name: 'Test', dataType: 'TIMESTAMP' },
                            { name: 'Alpha1', dataType: 'INT32' },
                            { name: 'Alpha', dataType: 'INT64' }
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Test', dataType: 'TIMESTAMP' },
                            { name: 'column2', dataType: 'BOOLEAN' },
                            { name: 'Alpha', dataType: 'INT32' },
                            { name: 'Alpha1', dataType: 'INT64' },
                            { name: 'test1', dataType: 'INT32' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([
                    { label: 'Alpha', value: 'Alpha-Numeric' },
                    { label: 'Alpha1', value: 'Alpha1-Numeric' },
                    { label: 'Test', value: 'Test-Timestamp' }
                ]);
            });

            it('should return empty array when no columns are common across tables', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'INT32' },
                            { name: 'Column 2', dataType: 'STRING' }
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column 3', dataType: 'BOOLEAN' },
                            { name: 'Column 4', dataType: 'TIMESTAMP' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([]);
            });

            it('should prepend variable options', async () => {
                templateSrv.getVariables.mockReturnValue([
                    { name: 'var1' },
                    { name: 'var2' }
                ] as any);

                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column 1', dataType: 'INT32' },
                            { name: 'Column 2', dataType: 'STRING' }
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'Column 1', dataType: 'INT32' },
                            { name: 'Column 2', dataType: 'STRING' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([
                    { label: '$var1', value: '$var1' },
                    { label: '$var2', value: '$var2' },
                    { label: 'Column 1', value: 'Column 1-Numeric' }
                ]);
            });

            it('should return properly when the column name contains "-" character', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'column-1', dataType: 'INT32' },
                            { name: 'column-2', dataType: 'INT32' }
                        ]
                    },
                    {
                        id: '2',
                        name: 'Table 2',
                        columns: [
                            { name: 'column-1', dataType: 'INT32' },
                            { name: 'column-2', dataType: 'INT32' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({
                    dataTableFilter: 'some-filter'
                });

                expect(result.commonColumnsAcrossTables).toEqual([
                    { label: 'column-1', value: 'column-1-Numeric' },
                    { label: 'column-2', value: 'column-2-Numeric' }
                ]);
            });
        });
    });

    describe('transformDataTableQuery', () => {
        it('should transform with the new scopedVariables when passed in as parameter', () => {
            const input = 'name = "${Table}" AND id != "abc"';
            const scopedVars = {
                Table: { text: 'Table2', value: 'Table2' }
            };

            ds.transformDataTableQuery(input, scopedVars);
            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        });

        it('should transform with saved scopedVariables when not passed in as parameter', async () => {
            const scopedVars = {
                name: { value: 'Test Table' }
            };
            const query = {
                type: DataFrameQueryType.Data,
                dataTableFilter: '',
            } as DataFrameQueryV2;
            const options = {
                scopedVars: scopedVars
            } as unknown as DataQueryRequest<DataFrameQueryV2>;
            await lastValueFrom(ds.runQuery(query, options));
            const input = 'name = "${Table}" AND id != "abc"';

            ds.transformDataTableQuery(input);

            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        });

        it('should replace single-value variables', () => {
            const input = 'name = "${Table}" AND id != "abc"';
            templateSrv.replace.mockReturnValue('name = "Table1" AND id != "abc"');

            const result = ds.transformDataTableQuery(input);

            expect(result).toBe('name = "Table1" AND id != "abc"');
        });

        it('should transform and expand multi-value variables', () => {
            const input = 'name = "{Table1,Table2}" AND id != "abc"';

            const result = ds.transformDataTableQuery(input);

            expect(result).toBe('(name = "Table1" || name = "Table2") AND id != "abc"');
        });

        it('should replace ${__now:date} placeholder in time fields', () => {
            const input = 'createdAt >= "${__now:date}"';

            const result = ds.transformDataTableQuery(input);

            //Check if result matches ISO date format
            expect(result).toMatch(/^createdAt >= "\d{4}-\d{2}-\d{2}T.+Z"$/);
            expect(result).not.toContain('${__now:date}');
        });
    });

    describe('transformResultQuery', () => {
        it('should transform with the new scopedVariables when passed in as parameter', () => {
            const input = 'Name = "${Result}" AND Id != "abc"';
            const scopedVars = {
                Result: { text: 'Result2', value: 'Result2' }
            };

            ds.transformResultQuery(input, scopedVars);
            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        });

        it('should transform with saved scopedVariables when not passed in as parameter', async () => {
            const scopedVars = {
                name: { value: 'Test Result' }
            };
            const query = {
                type: DataFrameQueryType.Data,
                dataTableFilter: '',
            } as DataFrameQueryV2;
            const options = {
                scopedVars: scopedVars
            } as unknown as DataQueryRequest<DataFrameQueryV2>;
            await lastValueFrom(ds.runQuery(query, options));
            const input = 'Name = "${Result}" AND Id != "abc"';

            ds.transformResultQuery(input);

            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        });

        it('should replace single-value variables', () => {
            const input = 'Name = "${Result}" AND Id != "abc"';
            templateSrv.replace.mockReturnValue('Name = "Result1" AND Id != "abc"');

            const result = ds.transformResultQuery(input);

            expect(result).toBe('Name = "Result1" AND Id != "abc"');
        });

        it('should transform and expand multi-value variables', () => {
            const input = 'HostName = "{host1,host2}" AND Id != "abc"';
            const result = ds.transformResultQuery(input);

            expect(result).toBe('(HostName = "host1" || HostName = "host2") AND Id != "abc"');
        });

        it('should replace ${__now:date} placeholder in time fields', () => {
            const input = 'UpdatedAt >= "${__now:date}"';

            const result = ds.transformResultQuery(input);

            //Check if result matches ISO date format
            expect(result).toMatch(/^UpdatedAt >= "\d{4}-\d{2}-\d{2}T.+Z"$/);
            expect(result).not.toContain('${__now:date}');
        });

        it('should transform list field in query', () => {
            const input = 'Keywords.Contains("{keyword1,keyword2}")';

            const result = ds.transformResultQuery(input);

            expect(result).toBe('(Keywords.Contains("keyword1") || Keywords.Contains("keyword2"))');
        });
    });

    describe('transformColumnQuery', () => {
        const scopedVars = {
            column: { value: 'TestColumn' }
        };

        beforeEach(async () => {
            const query = {
                type: DataFrameQueryType.Data,
                dataTableFilter: '',
            } as DataFrameQueryV2;
            const options = {
                scopedVars: scopedVars
            } as unknown as DataQueryRequest<DataFrameQueryV2>;
            await lastValueFrom(ds.runQuery(query, options));
        });

        it('should transform with saved scopedVariables', async () => {
            const input = 'name = "$Column"';

            ds.transformColumnQuery(input);

            expect(templateSrv.replace).toHaveBeenCalledWith('$Column', scopedVars);
        });

        it('should replace single-value variables', () => {
            const input = 'name = "$Column"&&name != "abc"';
            templateSrv.replace.mockReturnValue('Column1');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column1")&&!columns.any(it.name = "abc")');
        });

        it('should transform and expand multi-value variables', () => {
            const input = 'name = "{col1,col2}"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "col1" || it.name = "col2")');
        });

        it('should parse column name with hyphen correctly in single-value variable', () => {
            const input = 'name = "$Column"';
            templateSrv.replace.mockReturnValue('{Column1-Numeric}');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column1")');
        });

        it('should parse column name with hyphen correctly in multi-value variable', () => {
            const input = 'name = "$Column"';
            templateSrv.replace.mockReturnValue('{Column1-Numeric,Column2-String,Column3-Bool,Column4-Timestamp}');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column1" || it.name = "Column2" || it.name = "Column3" || it.name = "Column4")');
        });

        it('should not parse column name when value does not have hyphen', () => {
            const input = 'name = "$Column"';
            templateSrv.replace.mockReturnValue('{ColumnWithoutDataType}');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "ColumnWithoutDataType")');
        });

        it('should not parse column name when value does not contain data type', () => {
            const input = 'name = "$Column"';
            templateSrv.replace.mockReturnValue('{Column-Without-Data-Type}');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column-Without-Data-Type")');
        });

        it('should parse unique column names correctly', () => {
            const input = 'name = "$Column"';
            templateSrv.replace.mockReturnValue('{Column1-Numeric,Column2-String}');

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column1" || it.name = "Column2")');
        });

        it('should not parse column name when variable is not used in name field', () => {
            const input = 'name = "Column-Numeric"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column-Numeric")');
        });

        it('should transform EQUALS operation with column name field to columns.any expression', () => {
            const input = 'name = "Temperature"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Temperature")');
        });

        it('should transform DOES_NOT_EQUAL operation with column name field to negated columns.any expression', () => {
            const input = 'name != "Temperature"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('!columns.any(it.name = "Temperature")');
        });

        it('should transform CONTAINS operation with column name field to columns.any expression', () => {
            const input = 'name.Contains("Temp")';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name.Contains("Temp"))');
        });

        it('should transform DOES_NOT_CONTAIN operation with column name field to negated columns.any expression', () => {
            const input = '!(name.Contains("Temp"))';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('!columns.any(it.name.Contains("Temp"))');
        });

        it('should handle multi-value equals operation correctly', () => {
            const input = 'name = "{col1,col2}"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "col1" || it.name = "col2")');
        });

        it('should handle multi-value not equals operation correctly', () => {
            const input = 'name != "{col1,col2}"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('!columns.any(it.name = "col1" || it.name = "col2")');
        });

        it('should handle multi-value contains operation correctly', () => {
            const input = 'name.Contains("{temp,pressure}")';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name.Contains("temp") || it.name.Contains("pressure"))');
        });

        it('should handle multi-value does not contain operation correctly', () => {
            const input = '!(name.Contains("{temp,pressure}"))';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('!columns.any(it.name.Contains("temp") || it.name.Contains("pressure"))');
        });

        it('should handle complex expressions with AND operator', () => {
            const input = 'name = "Column1"&&name != "Column2"';

            const result = ds.transformColumnQuery(input);

            expect(result).toBe('columns.any(it.name = "Column1")&&!columns.any(it.name = "Column2")');
        });
    });

    describe('parseColumnIdentifier', () => {
        it('should parse column identifier with hyphen correctly', () => {
            const identifier = 'column 1-Numeric';

            const result = ds.parseColumnIdentifier(identifier);

            expect(result).toEqual({ columnName: 'column 1', transformedDataType: 'Numeric' });
        });

        it('should parse column identifier with multiple hyphens correctly', () => {
            const identifier = 'column-2-Timestamp';

            const result = ds.parseColumnIdentifier(identifier);

            expect(result).toEqual({ columnName: 'column-2', transformedDataType: 'Timestamp' });
        });
    });

    describe('hasRequiredFilters', () => {
        it('should return true when at least one filter is non-empty', () => {
            const query1 = {
                resultFilter: 'status = "Passed"',
                dataTableFilter: ''
            } as ValidDataFrameQueryV2;

            const query2 = {
                resultFilter: '',
                dataTableFilter: 'name = "Table1"'
            } as ValidDataFrameQueryV2;

            const query3 = {
                resultFilter: 'status = "Passed"',
                dataTableFilter: 'name = "Table1"'
            } as ValidDataFrameQueryV2;

            expect(ds.hasRequiredFilters(query1)).toBe(true);
            expect(ds.hasRequiredFilters(query2)).toBe(true);
            expect(ds.hasRequiredFilters(query3)).toBe(true);
        });

        it('should return false when both filters are empty', () => {
            const query = {
                resultFilter: '',
                dataTableFilter: ''
            } as ValidDataFrameQueryV2;

            expect(ds.hasRequiredFilters(query)).toBe(false);
        });
    });

    describe('yColumns handling', () => {
        let queryTablesSpy: jest.SpyInstance;
        let postSpy: jest.SpyInstance;
        let options: DataQueryRequest<DataFrameQueryV2>;

        beforeEach(() => {
            queryTablesSpy = jest.spyOn(ds, 'queryTables$');
            postSpy = jest.spyOn(ds, 'post$');
            options = {
                scopedVars: {}
            } as any;
        });

        it('should exclude xColumn from yColumns when xColumn is numeric', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                    { name: 'value1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                    { name: 'value2', dataType: 'INT32', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['value1-Numeric', 'value2-Numeric'],
                xColumn: 'value1-Numeric',
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        xColumn: 'value1',
                        yColumns: ['value2']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should exclude xColumn from yColumns when xColumn is timestamp', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                    { name: 'value1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                    { name: 'value2', dataType: 'INT32', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['timestamp-Timestamp', 'value1-Numeric', 'value2-Numeric'],
                xColumn: 'timestamp-Timestamp',
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        xColumn: 'timestamp',
                        yColumns: ['value1', 'value2']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should include all numeric columns in yColumns when xColumn is null', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                    { name: 'value1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                    { name: 'value2', dataType: 'INT32', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['value1-Numeric', 'value2-Numeric'],
                xColumn: null,
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        xColumn: undefined,
                        yColumns: ['value1', 'value2']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should exclude non-numeric columns from yColumns', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'name', dataType: 'STRING', columnType: ColumnType.Normal },
                    { name: 'value1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                    { name: 'flag', dataType: 'BOOL', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['name-String', 'value1-Numeric', 'flag-Bool'],
                xColumn: null,
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        yColumns: ['value1']
                    })
                }),
                expect.any(Object)
            );
        });

        it('should handle empty yColumns when only non-numeric columns are selected', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'name', dataType: 'STRING', columnType: ColumnType.Normal },
                    { name: 'flag', dataType: 'BOOL', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['name-String', 'flag-Bool'],
                xColumn: null,
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        yColumns: []
                    })
                }),
                expect.any(Object)
            );
        });

        it('should handle yColumns when xColumn is the only numeric column', async () => {
            const mockTables = [{
                id: 'table1',
                columns: [
                    { name: 'value1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                    { name: 'name', dataType: 'STRING', columnType: ColumnType.Normal }
                ]
            }];
            queryTablesSpy.mockReturnValue(of(mockTables));
            postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

            const query = {
                refId: 'A',
                type: DataFrameQueryType.Data,
                columns: ['value1-Numeric', 'name-String'],
                xColumn: 'value1-Numeric',
                dataTableFilter: 'name = "test"',
                decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                filterNulls: false,
                applyTimeFilters: false
            } as DataFrameQueryV2;

            await lastValueFrom(ds.runQuery(query, options));

            expect(postSpy).toHaveBeenCalledWith(
                expect.stringContaining('query-decimated-data'),
                expect.objectContaining({
                    decimation: expect.objectContaining({
                        xColumn: 'value1',
                        yColumns: []
                    })
                }),
                expect.any(Object)
            );
        });
    });
});
