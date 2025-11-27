import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameDataQuery, DataFrameQueryType, DataFrameQueryV1, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataFrameVariableQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, ValidDataFrameQueryV2 } from '../../types';
import { TAKE_LIMIT } from 'datasources/data-frame/constants';
import * as queryBuilderUtils from 'core/query-builder.utils';
import { DataTableQueryBuilderFieldNames } from 'datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants';
import { Workspace } from 'core/types';
import { isObservable, lastValueFrom, Observable, of, throwError } from 'rxjs';

jest.mock('core/query-builder.utils', () => {
    const actualQueryBuilderUtils = jest.requireActual('core/query-builder.utils');
    return {
        ...actualQueryBuilderUtils,
        transformComputedFieldsQuery: jest.fn(actualQueryBuilderUtils.transformComputedFieldsQuery),
        timeFieldsQuery: jest.fn(actualQueryBuilderUtils.timeFieldsQuery),
        multipleValuesQuery: jest.fn(actualQueryBuilderUtils.multipleValuesQuery),
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

        instanceSettings = { id: 1, name: 'test', type: 'test', url: '', jsonData: {} } as any;
        backendSrv = {} as any;
        templateSrv = {
            replace: jest.fn((value: string) => value),
            getVariables: jest.fn(() => [])
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

            describe('column handling', () => {
                let options: DataQueryRequest<DataFrameQueryV2>;
                let queryTablesSpy: jest.SpyInstance;

                const projections = [
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
                    it('should query tables and return results when columns are provided as array', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                {
                                    name: 'colA',
                                    dataType: 'INT32',
                                    columnType: 'NonNullable'
                                },
                                {
                                    name: 'colB',
                                    dataType: 'TIMESTAMP',
                                    columnType: 'NonNullable'
                                }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: [
                                'colA-Numeric',
                                'colB-Timestamp'
                            ],
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                            'name = "Test"',
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
                                    columnType: 'NonNullable'
                                }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const query: any = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: of(['colX-Numeric']),
                            dataTableFilter: 'name == "Test"',
                        };

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                           'name == "Test"',
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
                            'One or more selected columns are invalid. Please update your column selection or refine your data table filter.'
                        );
                    });

                    it('should throw error and publish alert when selected columns do not exist in table', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'colX',
                                        dataType: 'INT32',
                                        columnType: 'NonNullable'
                                    },
                                    {
                                        name: 'colY',
                                        dataType: 'STRING',
                                        columnType: 'NonNullable'
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['colA-Numeric', 'colB-String'],
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your data table filter.'
                        );
                    });

                    it('should include column metadata projections when querying tables with specified columns', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'temp',
                                        dataType: 'FLOAT64',
                                        columnType: 'NonNullable',
                                    }
                                ]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['temp-Numeric'],
                            dataTableFilter: 'name = "Test"',
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, options));

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                            'name = "Test"',
                            TAKE_LIMIT,
                            projections
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
                            dataTableFilter: '',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. ' +
                            'Please update your column selection or ' +
                            'refine your data table filter.'
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
                            dataTableFilter: '',
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, options))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your data table filter.'
                        );
                    });
                });

                describe('invalid columns', () => {
                    const errorMessage =
                        'One or more selected columns are invalid. Please update your column selection or refine your data table filter.';

                    it('should throw error when some selected columns are invalid', async () => {
                        const mockTables = [
                            {
                                id: 'table1',
                                columns: [
                                    {
                                        name: 'colA',
                                        dataType: 'INT32',
                                        columnType: 'NonNullable'
                                    },
                                    {
                                        name: 'colB',
                                        dataType: 'STRING',
                                        columnType: 'NonNullable'
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
                                        columnType: 'NonNullable'
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
                            dataTableFilter: '',
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
                })
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
                        'name = "Test Table"',
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
                    'name = "Test Table"',
                    1000,
                    [DataTableProjections.Name]
                );
                expect(result).toEqual([
                    { text: 'Table 1', value: 'table-1' },
                    { text: 'Table 2', value: 'table-2' }
                ]);
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
                    resultsFilter: '',
                    dataTableFilter: 'id = "table-123"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'id = "table-456"',
                    columnsFilter: '',
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

                it('should return an observable with original columns when columns are not found in table metadata', async () => {
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
                        ['col1', 'col2-String']
                    );
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
                    resultsFilter: '',
                    dataTableFilter: 'name = "test"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'id = "table-123"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'id = "table-456"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'name = "test"',
                    columnsFilter: '',
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
                    resultsFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnsFilter: '',
                    refId: 'F'
                });
            });

            it('should preserve all V2 variable query properties', () => {
                const v2Query = {
                    queryType: DataFrameVariableQueryType.ListDataTables,
                    resultsFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnsFilter: '',
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
        const mockTables = [{ id: '1', name: 'Table 1' }, { id: '2', name: 'Table 2' }];

        function createQueryTablesError(status: number) {
            return new Error(
                `Request to url "${ds.baseUrl}/query-tables" failed with status code: ${status}. Error message: "Error"`
            );
        }

        beforeEach(() => {
            postMock$ = jest.spyOn(ds, 'post$').mockReturnValue(of({ tables: mockTables }));
        });

        it('should call the `post$` method with the expected arguments and return tables', async () => {
            const filter = 'test-filter';
            const take = 10;
            const projection = [DataTableProjections.Name, DataTableProjections.Id];
            const result = await lastValueFrom(ds.queryTables$(filter, take, projection));
            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                { filter, take, projection },
                { useApiIngress: true }
            );
            expect(result).toBe(mockTables);
        });

        it('should use TAKE_LIMIT as default take value when not provided', async () => {
            const filter = 'test-filter';
            const result = await lastValueFrom(ds.queryTables$(filter));

            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                { filter, take: TAKE_LIMIT },
                { useApiIngress: true }
            );
            expect(result).toBe(mockTables);
        });

        it('should use undefined as default projection value when not provided', async () => {
            const filter = 'test-filter';
            const take = 15;
            const result = await lastValueFrom(ds.queryTables$(filter, take));

            expect(postMock$).toHaveBeenCalledWith(
                `${ds.baseUrl}/query-tables`,
                { filter, take, projection: undefined },
                { useApiIngress: true }
            );
            expect(result).toBe(mockTables);
        });

        it('should throw error with unknown error when API returns error without status', async () => {
            postMock$.mockReturnValue(throwError(() => new Error('Some unknown error')));

            await expect(lastValueFrom(ds.queryTables$('test-filter'))).rejects.toThrow(
                'The query failed due to an unknown error.'
            );
        });

        it('should throw too many requests error when API returns 429 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(429)));

            await expect(lastValueFrom(ds.queryTables$('test-filter'))).rejects.toThrow(
                'The query to fetch data tables failed due to too many requests. Please try again later.'
            );
        });

        it('should throw timeOut error when API returns 504 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(504)));

            await expect(lastValueFrom(ds.queryTables$('test-filter'))).rejects.toThrow(
                'The query to fetch data tables experienced a timeout error. Narrow your query with a more specific filter and try again.'
            );
        });

        it('should throw error with status code and message when API returns 500 status', async () => {
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(500)));

            await expect(lastValueFrom(ds.queryTables$('test-filter'))).rejects.toThrow(
                'The query failed due to the following error: (status 500) "Error".'
            );
        });

        it('should publish alertError event when error occurs', async () => {
            const publishMock = jest.fn();
            (ds as any).appEvents = { publish: publishMock };
            postMock$.mockReturnValue(throwError(() => createQueryTablesError(429)));

            await expect(lastValueFrom(ds.queryTables$('test-filter'))).rejects.toThrow();

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

        it('should return an empty array when no tables are found', async () => {
            queryTablesMock$.mockReturnValue(of([]));

            const result = await ds.getColumnOptionsWithVariables('some-filter');

            expect(result).toEqual([]);
        });

        it('should return an empty array when tables have no columns', async () => {
            queryTablesMock$.mockReturnValue(of([
                { id: '1', name: 'Table 1', columns: [] },
                { id: '2', name: 'Table 2' },
            ]));

            const result = await ds.getColumnOptionsWithVariables('some-filter');

            expect(result).toEqual([]);
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

            const result = await ds.getColumnOptionsWithVariables('some-filter');
            expect(result).toEqual([
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

                const result = await ds.getColumnOptionsWithVariables('some-filter');

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

                const result = await ds.getColumnOptionsWithVariables('some-filter');

                expect(result).toEqual([
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

                const result = await ds.getColumnOptionsWithVariables('some-filter');

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

                const result = await ds.getColumnOptionsWithVariables('some-filter');

                expect(result).toEqual([
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

                const result = await ds.getColumnOptionsWithVariables('some-filter');

                expect(result).toEqual([
                    { label: '$var1', value: '$var1' },
                    { label: '$var2', value: '$var2' },
                    { label: 'Column 1', value: 'Column 1-String' },
                    { label: 'Column 2', value: 'Column 2-Numeric' }
                ]);
            });
        });
    });

    describe('transformQuery', () => {
        it('should transform with the new scopedVariables when passed in as parameter', () => {
            const input = 'name = "${Table}" AND id != "abc"';
            const scopedVars = {
                Table: { text: 'Table2', value: 'Table2' }
            };

            ds.transformQuery(input, scopedVars);
            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        })

        it('should transform with saved scopedVariables when not passed in as parameter', async () => {
            const scopedVars = {
                name: { value: 'Test Table' }
            }
            const query = {
                type: DataFrameQueryType.Data,
                dataTableFilter: '',
            } as DataFrameQueryV2;
            const options = {
                scopedVars: scopedVars
            } as unknown as DataQueryRequest<DataFrameQueryV2>;
            await lastValueFrom(ds.runQuery(query, options));
            const input = 'name = "${Table}" AND id != "abc"';
            
            ds.transformQuery(input);   
 
            expect(templateSrv.replace).toHaveBeenCalledWith(input, scopedVars);
        });

        it('should replace single-value variables', () => {
            const input = 'name = "${Table}" AND id != "abc"';
            templateSrv.replace.mockReturnValue('name = "Table1" AND id != "abc"');
            
            const result = ds.transformQuery(input);

            expect(result).toBe('name = "Table1" AND id != "abc"');
        })

        it('should transform and expand multi-value variables', () => {
            const input = 'name = "{Table1,Table2}" AND id != "abc"';

            const result = ds.transformQuery(input);

            expect(result).toBe('(name = "Table1" || name = "Table2") AND id != "abc"');
        });

        it('should replace ${__now:date} placeholder in time fields', () => {
            const input = 'createdAt >= "${__now:date}"';

            const result = ds.transformQuery(input);

            //Check if result matches ISO date format
            expect(result).toMatch(/^createdAt >= "\d{4}-\d{2}-\d{2}T.+Z"$/);
            expect(result).not.toContain('${__now:date}');
        });
    });
});
