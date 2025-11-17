import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { DataFrameDataQuery, DataFrameQueryType, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultDatatableProperties, defaultQueryV2, ValidDataFrameQueryV2 } from '../../types';
import { TAKE_LIMIT } from 'datasources/data-frame/constants';
import * as queryBuilderUtils from 'core/query-builder.utils';
import { DataTableQueryBuilderFieldNames } from 'datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants';
import { Workspace } from 'core/types';
import { lastValueFrom, of, throwError } from 'rxjs';

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
        templateSrv = { replace: jest.fn((value: string) => value) } as any;
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
                    {
                        refId: 'A',
                        name: 'A',
                        fields: []
                    }
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
            it('should call getColumnOptions and should return the expected columns', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                const mockColumns = [
                    { label: 'Column 1', value: 'Column 1' },
                    { label: 'Column 2', value: 'Column 2' }
                ];
                const expectedColumns = mockColumns.map(column => ({
                    text: column.label,
                    value: column.value
                }));
                jest.spyOn(ds, 'getColumnOptions').mockResolvedValue(mockColumns);

                const result = await ds.metricFindQuery(query, options);

                expect(ds.getColumnOptions).toHaveBeenCalledWith('name = "Test Table"');
                expect(result).toEqual(expectedColumns);
            });

            it('should return only 10000 columns when getColumnOptions returns more than 10000 columns', async () => {
                templateSrv.replace.mockReturnValue('name = "Test Table"');
                const query = {
                    queryType: DataFrameVariableQueryType.ListColumns,
                    dataTableFilter: 'name = "${name}"',
                    refId: 'A'
                } as DataFrameVariableQuery;
                const mockColumns = Array.from({ length: 10001 }, (_, i) => ({
                    label: `Column ${i + 1}`,
                    value: `Column ${i + 1}`
                }));
                jest.spyOn(ds, 'getColumnOptions').mockResolvedValue(mockColumns);

                const result = await ds.metricFindQuery(query, options);

                expect(ds.getColumnOptions).toHaveBeenCalledWith('name = "Test Table"');
                expect(result.length).toEqual(10000);
            });
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

        it('should return true when query type is Properties', () => {
            const query = {
                type: DataFrameQueryType.Properties,
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(true);
        });

        it('should return false when query type is not Properties', () => {
            const query = {
                type: DataFrameQueryType.Data,
            } as ValidDataFrameQueryV2;

            const result = ds.shouldRunQuery(query);

            expect(result).toBe(false);
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
        it('should return the query with default values when all the fields from `ValidDataFrameQueryV2` are missing', () => {
            const query = {} as DataFrameDataQuery;
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
            const query = { decimationMethod: 'MAX_MIN', applyTimeFilters: true } as DataFrameDataQuery;
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

        it('should convert legacy MetaData type to Properties type', () => {
            const query = {
                type: 'Metadata' as any,
                refId: 'A'
            } as DataFrameDataQuery;

            const result = ds.processQuery(query);

            expect(result.type).toBe(DataFrameQueryType.Properties);
        });

        it('should migrate columns from object format to string array', () => {
            const query = {
                columns: [{ name: 'col1' }, { name: 'col2' }] as any,
                refId: 'A'
            } as DataFrameDataQuery;

            const result = ds.processQuery(query);

            expect(result.columns).toEqual(['col1', 'col2']);
        });

        it('should not modify columns if they are already strings', () => {
            const query = {
                columns: ['col1', 'col2'],
                refId: 'A'
            } as DataFrameDataQuery;

            const result = ds.processQuery(query);

            expect(result.columns).toEqual(['col1', 'col2']);
        });

        it('should return V2 query as-is when dataTableFilter is present', () => {
            const query = {
                type: DataFrameQueryType.Properties,
                dataTableFilter: 'name = "test"',
                dataTableProperties: [DataTableProperties.Name],
                columnProperties: [],
                columns: ['col1'],
                includeIndexColumns: true,
                filterNulls: true,
                decimationMethod: 'MAX_MIN',
                xColumn: 'timestamp',
                applyTimeFilters: true,
                take: 100,
                refId: 'A'
            } as DataFrameQueryV2;

            const result = ds.processQuery(query);

            expect(result).toEqual({
                ...defaultQueryV2,
                ...query
            });
        });

        it('should return V2 query with default values when some of the fields are missing', () => {
            const query = {
                type: DataFrameQueryType.Properties,
                dataTableFilter: 'name = "test"',
                dataTableProperties: [DataTableProperties.Name],
                refId: 'A'
            } as DataFrameQueryV2;

            const result = ds.processQuery(query);

            expect(result).toEqual({
                type: DataFrameQueryType.Properties,
                dataTableFilter: 'name = "test"',
                dataTableProperties: [DataTableProperties.Name],
                columnProperties: [],
                columns: [],
                includeIndexColumns: false,
                filterNulls: false,
                decimationMethod: 'LOSSY',
                xColumn: null,
                applyTimeFilters: false,
                take: TAKE_LIMIT,
                refId: 'A'
            });
        });

        it('should convert V1 query to V2 query and remove tableId', () => {
            const query = {
                type: DataFrameQueryType.Data,
                tableId: 'table-123',
                columns: ['col1', 'col2'],
                decimationMethod: 'LOSSY',
                filterNulls: true,
                applyTimeFilters: true,
                refId: 'A'
            } as any;

            const result = ds.processQuery(query);

            expect(result.dataTableFilter).toBe('id = "table-123"');
            expect(result).not.toHaveProperty('tableId');
            expect(result.columns).toEqual(['col1', 'col2']);
            expect(result.decimationMethod).toBe('LOSSY');
            expect(result.filterNulls).toBe(true);
            expect(result.applyTimeFilters).toBe(true);
        });

        it('should convert V1 query to V2 query with empty dataTableFilter when tableId is undefined', () => {
            const query = {
                type: DataFrameQueryType.Data,
                columns: ['col1'],
                refId: 'A'
            } as any;

            const result = ds.processQuery(query);

            expect(result.dataTableFilter).toBe('');
            expect(result).not.toHaveProperty('tableId');
        });

        it('should convert V1 query to V2 query with empty dataTableFilter when tableId is empty string', () => {
            const query = {
                type: DataFrameQueryType.Data,
                tableId: '',
                columns: ['col1'],
                refId: 'A'
            } as any;

            const result = ds.processQuery(query);

            expect(result.dataTableFilter).toBe('');
            expect(result).not.toHaveProperty('tableId');
        });

        it('should handle combined migrations: legacy type, object columns, and V1 to V2 conversion', () => {
            const query = {
                type: 'Metadata' as any,
                tableId: 'table-456',
                columns: [{ name: 'col1' }, { name: 'col2' }] as any,
                refId: 'A'
            } as any;

            const result = ds.processQuery(query);

            expect(result.type).toBe(DataFrameQueryType.Properties);
            expect(result.columns).toEqual(['col1', 'col2']);
            expect(result.dataTableFilter).toBe('id = "table-456"');
            expect(result).not.toHaveProperty('tableId');
        });

        it('should add default V2 values when converting V1 query with minimal properties', () => {
            const query = {
                type: DataFrameQueryType.Data,
                tableId: 'table-123',
                refId: 'A'
            } as any;

            const result = ds.processQuery(query);

            expect(result).toMatchObject({
                type: DataFrameQueryType.Data,
                dataTableFilter: 'id = "table-123"',
                dataTableProperties: defaultDatatableProperties,
                columnProperties: [],
                columns: [],
                includeIndexColumns: false,
                filterNulls: false,
                decimationMethod: 'LOSSY',
                xColumn: null,
                applyTimeFilters: false,
                take: TAKE_LIMIT,
                refId: 'A'
            });
            expect(result).not.toHaveProperty('tableId');
        });

        it('should preserve V1 properties and add missing V2 defaults when converting', () => {
            const query = {
                type: DataFrameQueryType.Properties,
                tableId: 'table-789',
                columns: ['col1', 'col2'],
                filterNulls: true,
                refId: 'B'
            } as any;

            const result = ds.processQuery(query);

            // V1 properties should be preserved
            expect(result.type).toBe(DataFrameQueryType.Properties);
            expect(result.columns).toEqual(['col1', 'col2']);
            expect(result.filterNulls).toBe(true);
            expect(result.refId).toBe('B');

            // V2-specific property should be created from tableId
            expect(result.dataTableFilter).toBe('id = "table-789"');

            // Missing V2 properties should have defaults
            expect(result.dataTableProperties).toEqual(defaultDatatableProperties);
            expect(result.columnProperties).toEqual([]);
            expect(result.includeIndexColumns).toBe(false);
            expect(result.decimationMethod).toBe('LOSSY');
            expect(result.xColumn).toBe(null);
            expect(result.applyTimeFilters).toBe(false);
            expect(result.take).toBe(TAKE_LIMIT);
        });
    });

    describe('processVariableQuery', () => {
        it('should return the query with default values when all the fields from `ValidDataFrameVariableQueryV2` are missing', () => {
            const result = ds.processVariableQuery({} as DataFrameVariableQuery);
            expect(result).toEqual({
                queryType: DataFrameVariableQueryType.ListDataTables,
                dataTableFilter: ''
            });
        });

        it('should return the query with default values for missing fields when some of the fields from `ValidDataFrameVariableQueryV2` are missing', () => {
            const query = { dataTableFilter: 'name = "test table"' } as DataFrameVariableQuery;
            const result = ds.processVariableQuery(query);
            expect(result).toEqual({
                queryType: DataFrameVariableQueryType.ListDataTables,
                dataTableFilter: 'name = "test table"'
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

    describe('getColumnOptions', () => {
        let queryTablesMock$: jest.SpyInstance;

        beforeEach(() => {
            queryTablesMock$ = jest.spyOn(ds, 'queryTables$');
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return an empty array when no tables are found', async () => {
            queryTablesMock$.mockReturnValue(of([]));

            const result = await ds.getColumnOptions('some-filter');

            expect(result).toEqual([]);
        });

        it('should return an empty array when tables have no columns', async () => {
            queryTablesMock$.mockReturnValue(of([
                { id: '1', name: 'Table 1', columns: [] },
                { id: '2', name: 'Table 2' },
            ]));

            const result = await ds.getColumnOptions('some-filter');

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

            const result = await ds.getColumnOptions('some-filter');
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

                const result = await ds.getColumnOptions('some-filter');

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

                const result = await ds.getColumnOptions('some-filter');

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

                const result = await ds.getColumnOptions('some-filter');

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

                const result = await ds.getColumnOptions('some-filter');

                expect(result).toEqual([
                    { label: 'Column A', value: 'Column A-String' },
                    { label: 'Column B', value: 'Column B-Numeric' },
                    { label: 'Column C', value: 'Column C-Boolean' },
                    { label: 'Column D', value: 'Column D-Numeric' },
                ]);
            });
        });
    });
});
