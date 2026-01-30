import { DataFrameDataSourceV2 } from './DataFrameDataSourceV2';
import { DataQueryRequest, DataSourceInstanceSettings, FieldDTO } from '@grafana/data';
import { BackendSrv, TemplateSrv } from '@grafana/runtime';
import { ColumnType, DATA_TABLE_ID_FIELD, DATA_TABLE_NAME_FIELD, DataFrameDataQuery, DataFrameFeatureTogglesDefaults, DataFrameQueryType, DataFrameQueryV1, DataFrameQueryV2, DataFrameVariableQuery, DataFrameVariableQueryType, DataFrameVariableQueryV2, DataTableProjectionLabelLookup, DataTableProjections, DataTableProperties, defaultQueryV2, ValidDataFrameQueryV2 } from '../../types';
import { COLUMN_SELECTION_LIMIT, REQUESTS_PER_SECOND, TAKE_LIMIT } from 'datasources/data-frame/constants';
import * as queryBuilderUtils from 'core/query-builder.utils';
import { DataTableQueryBuilderFieldNames } from 'datasources/data-frame/components/v2/constants/DataTableQueryBuilder.constants';
import { Workspace } from 'core/types';
import { isObservable, lastValueFrom, Observable, of, throwError } from 'rxjs';
import * as coreUtils from 'core/utils';
import { DataFrameQueryParamsHandler } from './DataFrameQueryParamsHandler';
import Papa from 'papaparse';

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

    function findField(fields: FieldDTO[], name: string): FieldDTO | undefined {
        return fields.find(field => field.name === name);
    }

    beforeEach(() => {
        jest.clearAllMocks();
        const actualQueryBuilderUtils = jest.requireActual('core/query-builder.utils');
        (queryBuilderUtils.transformComputedFieldsQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.transformComputedFieldsQuery);
        (queryBuilderUtils.timeFieldsQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.timeFieldsQuery);
        (queryBuilderUtils.multipleValuesQuery as jest.Mock).mockImplementation(actualQueryBuilderUtils.multipleValuesQuery);

        const actualCoreUtils = jest.requireActual('core/utils');
        (coreUtils.replaceVariables as jest.Mock).mockImplementation(actualCoreUtils.replaceVariables);

        jest.spyOn(DataFrameQueryParamsHandler, 'updateSyncXAxisRangeTargetsQueryParam').mockImplementation(() => { });

        instanceSettings = {
            id: 1,
            name: 'test',
            type: 'test',
            url: '',
            jsonData: {
                featureToggles:  {
                    ...DataFrameFeatureTogglesDefaults,
                    highResolutionZoom: true
                }
            },
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
        ds = new DataFrameDataSourceV2(
            instanceSettings,
            backendSrv,
            templateSrv
        );
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
            },
            targets: [query]
        } as unknown as DataQueryRequest<DataFrameQueryV2>;

        it('should call processQuery with the provided query', async () => {
            const processQuerySpy = jest.spyOn(ds, 'processQuery');
            await lastValueFrom(ds.runQuery(query, options));

            expect(processQuerySpy).toHaveBeenCalledWith(query);
        });

        describe('syncXAxisRangeTargets query param initialization', () => {
            const optionsWithoutPanelId = {
                ...options,
                targets: [
                    {
                        ...query,
                        applyTimeFilters: false,
                    },
                    {
                        ...query,
                        applyTimeFilters: true,
                    }
                ],
            } as unknown as DataQueryRequest<DataFrameQueryV2>;
            const optionsWithPanelId = {
                ...options,
                panelId: 42,
                targets: [
                    {
                        ...query,
                        applyTimeFilters: false,
                    },
                    {
                        ...query,
                        applyTimeFilters: true,
                    }
                ],
            } as unknown as DataQueryRequest<DataFrameQueryV2>;

            beforeEach(() => {
                jest.spyOn(ds, 'queryTables$').mockReturnValue(of([]));
                jest.spyOn(ds, 'post$').mockReturnValue(of({ frame: { columns: ['Column1'], data: [] } }));
            });

            it('should call updateSyncXAxisRangeTargetsQueryParam when panelId is defined', async () => {
                await lastValueFrom(ds.runQuery(optionsWithPanelId.targets[0], optionsWithPanelId));

                expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledWith(
                    true,
                    '42'
                );
            });

            it('should call updateSyncXAxisRangeTargetsQueryParam when panelId is undefined', async () => {
                await lastValueFrom(ds.runQuery(optionsWithoutPanelId.targets[0], optionsWithoutPanelId));

                expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledWith(
                    true,
                    undefined
                );
            });

            it('should call updateSyncXAxisRangeTargetsQueryParam when run query is called second time', async () => {
                await lastValueFrom(ds.runQuery(optionsWithPanelId.targets[0], optionsWithPanelId));

                expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledTimes(1);

                await lastValueFrom(ds.runQuery(optionsWithPanelId.targets[0], optionsWithPanelId));
                expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledTimes(2);
            });

            it('should call updateSyncXAxisRangeTargetsQueryParam with false when filterXRangeOnZoomPan is disabled in all the queries in a panel', async () => {
                const optionsWithFilterXRangeOnZoomPanDisabled = {
                    ...optionsWithPanelId,
                    targets: [
                        {
                            ...query,
                            applyTimeFilters: false,
                        },
                        {
                            ...query,
                            applyTimeFilters: false,
                        }
                    ],
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                
                await lastValueFrom(
                    ds.runQuery(
                        optionsWithFilterXRangeOnZoomPanDisabled.targets[0],
                        optionsWithFilterXRangeOnZoomPanDisabled
                    )
                );
                
                expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledWith(
                    false,
                    '42'
                );
            });

            describe('when high resolution zoom feature is disabled', () => {
                let dsWithHighResZoomDisabled: DataFrameDataSourceV2;

                beforeEach(() => {
                    dsWithHighResZoomDisabled = new DataFrameDataSourceV2(
                        {
                            ...instanceSettings,
                            jsonData: {
                                featureToggles:  DataFrameFeatureTogglesDefaults
                            },
                        },
                        backendSrv,
                        templateSrv
                    );
                });

                it('should not call updateSyncXAxisRangeTargetsQueryParam when run query is called', async () => {
                    await lastValueFrom(dsWithHighResZoomDisabled.runQuery(optionsWithPanelId.targets[0], optionsWithPanelId));

                    expect(DataFrameQueryParamsHandler.updateSyncXAxisRangeTargetsQueryParam).toHaveBeenCalledTimes(0);
                });
            });
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
            ds = new DataFrameDataSourceV2(
                instanceSettings,
                backendSrv,
                templateSrv,
            );

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

                    const result = await lastValueFrom(
                        ds.runQuery(query, { ...options, targets: [query] })
                    );

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
                            ds.runQuery(query, { ...options, targets: [query] })
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
                            ds.runQuery(query, { ...options, targets: [query] })
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
                            lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }))
                        ).rejects.toThrow(
                            `The number of columns you selected (${(COLUMN_SELECTION_LIMIT + 1).toLocaleString()}) exceeds the column limit (${COLUMN_SELECTION_LIMIT.toLocaleString()}). Reduce your number of selected columns and try again.`
                        );
                    });

                    it('should not count metadata columns towards the 20 column limit', async () => {
                        const selectedColumns = [
                            DATA_TABLE_ID_FIELD,
                            DATA_TABLE_NAME_FIELD,
                            ...Array.from(
                                {
                                    length: 20
                                },
                                (_, i) => `col${i}-Numeric`
                            )
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            columns: Array.from({ length: 20 }, (_, i) => ({
                                name: `col${i}`,
                                dataType: 'INT32',
                                columnType: ColumnType.Normal
                            }))
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const mockDecimatedData = {
                            frame: {
                                columns: Array.from({ length: 20 }, (_, i) => `col${i}`),
                                data: [Array.from({ length: 20 }, () => '1')]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockReturnValue(of(mockDecimatedData));
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );
                        
                        expect(result.refId).toBe('A');
                        expect(result.fields).toBeDefined();
                        expect(result.fields.length).toBe(22);
                    });

                    it('should include data table ID and name fields in results only when selected', async () => {
                        const selectedColumns = [
                            DATA_TABLE_ID_FIELD,
                            DATA_TABLE_NAME_FIELD,
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            name: 'Test Table',
                            columns: [
                                {
                                    name: 'colA',
                                    dataType: 'STRING',
                                    columnType: ColumnType.Normal
                                },
                            ]
                        },
                        {
                            id: 'table2',
                            name: 'Another Table',
                            columns: [
                                {
                                    name: 'colB',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                },
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        expect(result.refId).toBe('A');
                        expect(result.fields).toHaveLength(2);
                        
                        const dataTableIdField = findField(result.fields,'Data table ID');
                        expect(dataTableIdField).toBeDefined();
                        expect(dataTableIdField?.name).toBe('Data table ID');
                        expect(dataTableIdField?.values).toEqual(['table1', 'table2']);
                        
                        const dataTableNameField = findField(result.fields,'Data table name');
                        expect(dataTableNameField).toBeDefined();
                        expect(dataTableNameField?.name).toBe('Data table name');
                        expect(dataTableNameField?.values).toEqual(['Test Table', 'Another Table']);
                    });

                    it('should include data table ID field when only ID is selected', async () => {
                        const selectedColumns = [DATA_TABLE_ID_FIELD];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            dataTableFilter: 'name = "Test"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            name: 'Test Table',
                            columns: [{
                                name: 'colA',
                                dataType: 'STRING',
                                columnType: ColumnType.Normal
                            }]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        expect(result.fields).toHaveLength(1);
                        const idField = findField(result.fields, 'Data table ID');
                        expect(idField).toBeDefined();
                        expect(idField?.name).toBe('Data table ID');
                        expect(idField?.values).toEqual(['table1']);
                    });

                    it('should include data table name field when only name is selected', async () => {
                        const selectedColumns = [DATA_TABLE_NAME_FIELD];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            dataTableFilter: 'name = "Test"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            name: 'Test Table',
                            columns: [{
                                name: 'colA',
                                dataType: 'STRING',
                                columnType: ColumnType.Normal
                            }]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        expect(result.fields).toHaveLength(1);
                        const nameField = findField(result.fields, 'Data table name');
                        expect(nameField).toBeDefined();
                        expect(nameField?.name).toBe('Data table name');
                        expect(nameField?.values).toEqual(['Test Table']);
                    });

                    it('should combine data table ID and name fields with other columns', async () => {
                        const selectedColumns = [
                            DATA_TABLE_ID_FIELD,
                            'colA-Numeric',
                            DATA_TABLE_NAME_FIELD
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            dataTableFilter: 'name = "Test"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            name: 'Test Table',
                            columns: [{
                                name: 'colA',
                                dataType: 'INT32',
                                columnType: ColumnType.Normal
                            }]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const mockDecimatedData = {
                            frame: {
                                columns: ['colA'],
                                data: [['100']]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockReturnValue(of(mockDecimatedData));
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        expect(result.fields).toHaveLength(3);
                        expect(findField(result.fields, 'Data table ID')).toBeDefined();
                        expect(findField(result.fields, 'colA')).toBeDefined();
                        expect(findField(result.fields, 'Data table name')).toBeDefined();
                    });

                    it('should handle multiple tables with data table ID and name fields', async () => {
                        const selectedColumns = [
                            DATA_TABLE_ID_FIELD,
                            DATA_TABLE_NAME_FIELD,
                            'value-Numeric'
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            dataTableFilter: 'workspace = "test"'
                        } as DataFrameQueryV2;
                        const mockTables = [
                            {
                                id: 'table-A',
                                name: 'Table A',
                                columns: [{
                                    name: 'value',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                }]
                            },
                            {
                                id: 'table-B',
                                name: 'Table B',
                                columns: [{
                                    name: 'value',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                }]
                            },
                            {
                                id: 'table-C',
                                name: 'Table C',
                                columns: [{
                                    name: 'value',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                }]
                            }
                        ];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        
                        const postSpy = jest.spyOn(ds, 'post$');
                        postSpy.mockImplementation((url: string) => {
                            if (url.includes('table-A/query-decimated-data')) {
                                return of({ frame: { columns: ['value'], data: [['1']] } });
                            }
                            if (url.includes('table-B/query-decimated-data')) {
                                return of({ frame: { columns: ['value'], data: [['2']] } });
                            }
                            if (url.includes('table-C/query-decimated-data')) {
                                return of({ frame: { columns: ['value'], data: [['3']] } });
                            }
                            return of({});
                        });
                        
                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        const idField = findField(result.fields, 'Data table ID');
                        expect(idField?.values).toEqual(['table-A', 'table-B', 'table-C']);
                        
                        const nameField = findField(result.fields, 'Data table name');
                        expect(nameField?.values).toEqual(['Table A', 'Table B', 'Table C']);
                        
                        const valueField = findField(result.fields, 'value');
                        expect(valueField?.values).toEqual([1, 2, 3]);
                    });

                    it('should not call decimated data API when only metadata columns are selected', async () => {
                        const selectedColumns = [
                            DATA_TABLE_ID_FIELD,
                            DATA_TABLE_NAME_FIELD,
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                {
                                    name: 'colA',
                                    dataType: 'STRING',
                                    columnType: ColumnType.Normal
                                },
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const decimatedDataSpy = jest.spyOn(ds, 'post$');
                
                        await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );
                        
                        expect(decimatedDataSpy).not.toHaveBeenCalled();
                    });

                    it('should call query tables API with name as projection when data table name column is selected', async () => {
                        const selectedColumns = [
                            DATA_TABLE_NAME_FIELD,
                            'colA-Numeric'
                        ];
                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            dataTableFilter: 'name = "Test"'
                        } as DataFrameQueryV2;
                        const mockTables = [{
                            id: 'table1',
                            name: 'Test Table',
                            columns: [
                                {
                                    name: 'colA',
                                    dataType: 'INT32',
                                    columnType: ColumnType.Normal
                                }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        const mockDecimatedData = {
                            frame: {
                                columns: ['colA'],
                                data: [['123']]
                            }
                        };
                        jest.spyOn(ds, 'post$').mockReturnValue(of(mockDecimatedData));

                        await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

                        expect(queryTablesSpy).toHaveBeenCalledWith(
                            {
                                "dataTableFilter": "name = \"Test\"",
                                "columnFilter": "",
                                "resultFilter": ""
                            },
                            TAKE_LIMIT,
                            [
                                ...projections,
                                DataTableProjections.Name
                            ]
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

                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

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

                        const result = await lastValueFrom(
                            ds.runQuery(query, { ...options, targets: [query] })
                        );

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
                            lastValueFrom(
                                ds.runQuery(query, { ...options, targets: [query] })
                            )
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
                            lastValueFrom(
                                ds.runQuery(query, { ...options, targets: [query] })
                            )
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
                            lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }))
                        ).rejects.toThrow(
                            'One or more selected columns are invalid. Please update your column selection or refine your filters.'
                        );
                    });

                    it(`should publish alert when user selects more than 20 columns`, async () => {
                        const selectedColumns = Array.from(
                            {
                                length: 20 + 1
                            },
                            (_, i) => `col${i}-Numeric`
                        );
                        const publishMock = jest.fn();
                        (ds as any).appEvents = { publish: publishMock };

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: selectedColumns,
                            resultFilter: 'status = "Active"',
                            dataTableFilter: 'name = "Test"',
                            columnFilter: 'name = "colA"'
                        } as DataFrameQueryV2;

                        await expect(
                            lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }))
                        ).rejects.toThrow();

                        expect(publishMock).toHaveBeenCalledWith({
                            type: 'alert-error',
                            payload: [
                                'Column selection error',
                                `The number of columns you selected (${(COLUMN_SELECTION_LIMIT + 1).toLocaleString()}) exceeds the column limit (${COLUMN_SELECTION_LIMIT.toLocaleString()}). Reduce your number of selected columns and try again.`
                            ]
                        });
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
                            lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }))
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
                            lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }))
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

            describe('fetch decimated data', () => {
                let queryTablesSpy: jest.SpyInstance;
                let postSpy: jest.SpyInstance;

                beforeEach(() => {
                    queryTablesSpy = jest.spyOn(ds, 'queryTables$');
                    postSpy = jest.spyOn(ds, 'post$');
                });

                it('should fetch and aggregate decimated data for selected columns across multiple tables', async () => {
                    const mockTables = [
                        {
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        },
                        {
                            id: 'table2',
                            name: 'table2',
                            columns: [
                                { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }
                    ];
                    queryTablesSpy.mockReturnValue(of(mockTables));
                    
                    const mockDecimatedData1 = {
                        frame: {
                            columns: ['time', 'voltage'],
                            data: [
                                ['2024-01-01T00:00:00Z', '10.5'],
                                ['2024-01-01T01:00:00Z', '20.3']
                            ]
                        }
                    };
                    const mockDecimatedData2 = {
                        frame: {
                            columns: ['time', 'voltage'],
                            data: [
                                ['2024-01-01T00:00:00Z', '15.2'],
                                ['2024-01-01T01:00:00Z', '25.8']
                            ]
                        }
                    };

                    postSpy.mockImplementation((url: string) => {
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
                        columns: ['time-Timestamp', 'voltage-Numeric', 'Data table ID-Metadata', 'Data table name-Metadata'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'LOSSY',
                        xColumn: 'time-Timestamp',
                        filterNulls: false,
                        filterXRangeOnZoomPan: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(ds.runQuery(query, options));

                    expect(result.refId).toBe('A');
                    expect(result.fields.length).toBeGreaterThan(0);
                    expect(postSpy).toHaveBeenCalledWith(
                        expect.stringContaining('table1/query-decimated-data'),
                        expect.objectContaining({
                            columns: ['time', 'voltage'],
                            decimation: expect.objectContaining({
                                method: 'LOSSY',
                                xColumn: 'time',
                                intervals: 1000
                            })
                        }),
                        expect.any(Object)
                    );
                    expect(postSpy).toHaveBeenCalledWith(
                        expect.stringContaining('table2/query-decimated-data'),
                        expect.objectContaining({
                            columns: ['time', 'voltage'],
                            decimation: expect.objectContaining({
                                method: 'LOSSY',
                                xColumn: 'time',
                                intervals: 1000
                            })
                        }),
                        expect.any(Object)
                    );

                    expect(result.fields.length).toBeGreaterThan(0);
                    // Verify that tableId and tableName fields have correct values
                    const tableIdField = findField(result.fields, 'Data table ID');
                    expect(tableIdField?.values).toEqual(['table1', 'table1', 'table2', 'table2']);
                    
                    const tableNameField = findField(result.fields, 'Data table name');
                    expect(tableNameField?.values).toEqual(['table1', 'table1', 'table2', 'table2']);

                    // Verify that there are 2 rows (one from each table)
                    const timeField = findField(result.fields, 'time');
                    const timestamp1 = new Date('2024-01-01T00:00:00Z').getTime();
                    const timestamp2 = new Date('2024-01-01T01:00:00Z').getTime();
                    expect(timeField?.values).toEqual([timestamp1, timestamp2, timestamp1, timestamp2]);

                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([10.5, 20.3, 15.2, 25.8]);
                });

                it('should apply null filters when filterNulls is true', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'current', dataType: 'INT32', columnType: ColumnType.Nullable }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const mockDecimatedData = {
                        frame: {
                            columns: ['voltage', 'current'],
                            data: [['10.5', '20'], ['15.3', '25']]
                        }
                    };
                    postSpy.mockReturnValue(of(mockDecimatedData));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric', 'current-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'LOSSY',
                        filterNulls: true,
                        filterXRangeOnZoomPan: false
                    } as DataFrameQueryV2;

                    await lastValueFrom(ds.runQuery(query, options));

                    // Verify that filters were applied for FLOAT64 (NaN filter) and NULLABLE (null filter)
                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            filters: expect.arrayContaining([
                                expect.objectContaining({
                                    column: 'voltage',
                                    operation: 'NOT_EQUALS',
                                    value: 'NaN'
                                }),
                                expect.objectContaining({
                                    column: 'current',
                                    operation: 'NOT_EQUALS',
                                    value: null
                                })
                            ])
                        }),
                        expect.any(Object)
                    );
                });

                it('should apply time filters when filterXRangeOnZoomPan is true', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const mockDecimatedData = {
                        frame: {
                            columns: ['time', 'voltage'],
                            data: [['2024-01-01T00:00:00Z'], ['10.5']]
                        }
                    };
                    postSpy.mockReturnValue(of(mockDecimatedData));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['time-Timestamp', 'voltage-Numeric'],
                        xColumn: 'time-Timestamp',
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'LOSSY',
                        filterNulls: false,
                        filterXRangeOnZoomPan: true
                    } as DataFrameQueryV2;

                    const optionsWithRange = {
                        ...options,
                        range: {
                            from: { toISOString: () => '2024-01-01T00:00:00Z' },
                            to: { toISOString: () => '2024-01-02T00:00:00Z' }
                        },
                        targets: [query]
                    } as any;

                    await lastValueFrom(ds.runQuery(query, optionsWithRange));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            filters: [
                                expect.objectContaining({
                                    column: 'time',
                                    operation: 'GREATER_THAN_EQUALS',
                                    value: '2024-01-01T00:00:00Z'
                                }),
                                expect.objectContaining({
                                    column: 'time',
                                    operation: 'LESS_THAN_EQUALS',
                                    value: '2024-01-02T00:00:00Z'
                                })
                            ]
                        }),
                        expect.any(Object)
                    );
                });

                it('should apply combined null and time filters when both enabled', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));
                    postSpy.mockReturnValue(of({ frame: { columns: ['time', 'voltage'], data: [['2024-01-01T00:00:00Z'], ['10.5']] } }));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['time-Timestamp', 'voltage-Numeric'],
                        xColumn: 'time-Timestamp',
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'LOSSY',
                        filterNulls: true,
                        filterXRangeOnZoomPan: true
                    } as DataFrameQueryV2;

                    const optionsWithRange = {
                        ...options,
                        range: {
                            from: { toISOString: () => '2024-01-01T00:00:00Z' },
                            to: { toISOString: () => '2024-01-02T00:00:00Z' }
                        },
                        targets: [query]
                    } as any;

                    await lastValueFrom(ds.runQuery(query, optionsWithRange));

                    const filters = postSpy.mock.calls[0][1].filters;
                    expect(filters.length).toBe(3);
                    expect(filters).toEqual(expect.arrayContaining([
                        expect.objectContaining({ column: 'voltage', operation: 'NOT_EQUALS', value: 'NaN' }),
                        expect.objectContaining({ column: 'time', operation: 'GREATER_THAN_EQUALS' }),
                        expect.objectContaining({ column: 'time', operation: 'LESS_THAN_EQUALS' })
                    ]));
                });

                describe('X-column behaviour', () => {
                    it('should use TIMESTAMP INDEX column fallback when xColumn is null', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['timestamp', 'voltage'],
                                data: [['2024-01-01T00:00:00Z'], ['10.5']]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['timestamp-Timestamp', 'voltage-Numeric'],
                            xColumn: null,
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: true
                        } as DataFrameQueryV2;

                        const optionsWithRange = {
                            ...options,
                            range: {
                                from: { toISOString: () => '2024-01-01T00:00:00Z' },
                                to: { toISOString: () => '2024-01-02T00:00:00Z' }
                            },
                            targets: [query]
                        } as any;

                        await lastValueFrom(ds.runQuery(query, optionsWithRange));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.any(String),
                            expect.objectContaining({
                                filters: expect.arrayContaining([
                                    expect.objectContaining({
                                        column: 'timestamp',
                                        operation: 'GREATER_THAN_EQUALS',
                                        value: '2024-01-01T00:00:00Z'
                                    }),
                                    expect.objectContaining({
                                        column: 'timestamp',
                                        operation: 'LESS_THAN_EQUALS',
                                        value: '2024-01-02T00:00:00Z'
                                    })
                                ])
                            }),
                            expect.any(Object)
                        );
                    });

                    it('should use xColumn for filter when timestamp xColumn is selected', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                                { name: 'customTime', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['timestamp', 'customTime', 'voltage'],
                                data: [['2024-01-01T00:00:00Z'], ['2024-01-01T01:00:00Z'], ['10.5']]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['customTime-Timestamp', 'voltage-Numeric'],
                            xColumn: 'customTime-Timestamp',
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: true
                        } as DataFrameQueryV2;

                        const optionsWithRange = {
                            ...options,
                            range: {
                                from: { toISOString: () => '2024-01-01T00:00:00Z' },
                                to: { toISOString: () => '2024-01-02T00:00:00Z' }
                            },
                            targets: [query]
                        } as any;

                        await lastValueFrom(ds.runQuery(query, optionsWithRange));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.any(String),
                            expect.objectContaining({
                                filters: expect.arrayContaining([
                                    expect.objectContaining({
                                        column: 'customTime',
                                        operation: 'GREATER_THAN_EQUALS',
                                        value: '2024-01-01T00:00:00Z'
                                    }),
                                    expect.objectContaining({
                                        column: 'customTime',
                                        operation: 'LESS_THAN_EQUALS',
                                        value: '2024-01-02T00:00:00Z'
                                    })
                                ])
                            }),
                            expect.any(Object)
                        );
                    });

                    it('should not apply time filters when xColumn is not selected and index column is not timestamp', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'id', dataType: 'INT32', columnType: ColumnType.Index },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['id', 'voltage'],
                                data: [['1'], ['10.5']]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['id-Numeric', 'voltage-Numeric'],
                            xColumn: null,
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: true
                        } as DataFrameQueryV2;

                        const optionsWithRange = {
                            ...options,
                            range: {
                                from: { toISOString: () => '2024-01-01T00:00:00Z' },
                                to: { toISOString: () => '2024-01-02T00:00:00Z' }
                            },
                            targets: [query]
                        } as any;

                        await lastValueFrom(ds.runQuery(query, optionsWithRange));

                        // Should not include time filters
                        const filters = postSpy.mock.calls[0][1].filters;
                        expect(filters).toEqual([]);
                    });

                    it('should not apply time filters when xColumn is selected and selected xColumn is not timestamp', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'id', dataType: 'INT32', columnType: ColumnType.Index },
                                { name: 'customTime', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['id', 'customTime', 'voltage'],
                                data: [['1'], ['2024-01-01T00:00:00Z'], ['10.5']]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['customTime-Timestamp', 'voltage-Numeric'],
                            xColumn: 'voltage-Numeric',
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: true
                        } as DataFrameQueryV2;

                        const optionsWithRange = {
                            ...options,
                            range: {
                                from: { toISOString: () => '2024-01-01T00:00:00Z' },
                                to: { toISOString: () => '2024-01-02T00:00:00Z' }
                            },
                            targets: [query]
                        } as any;

                        await lastValueFrom(ds.runQuery(query, optionsWithRange));

                        // Should not include time filters
                        const filters = postSpy.mock.calls[0][1].filters;
                        expect(filters).toEqual([]);
                    });
                });

                describe('yColumns behaviour', () => {
                    let options: DataQueryRequest<DataFrameQueryV2>;

                    beforeEach(() => {
                        options = {
                            scopedVars: {}
                        } as any;
                    });

                    it('should exclude xColumn from yColumns when xColumn is numeric', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                { name: 'timestamp', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                                { name: 'current', dataType: 'INT32', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric', 'current-Numeric'],
                            xColumn: 'voltage-Numeric',
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    xColumn: 'voltage',
                                    yColumns: ['current']
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
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                                { name: 'current', dataType: 'INT32', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['timestamp-Timestamp', 'voltage-Numeric', 'current-Numeric'],
                            xColumn: 'timestamp-Timestamp',
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    xColumn: 'timestamp',
                                    yColumns: ['voltage', 'current']
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
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                                { name: 'current', dataType: 'INT32', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric', 'current-Numeric'],
                            xColumn: null,
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    xColumn: undefined,
                                    yColumns: ['voltage', 'current']
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
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                                { name: 'flag', dataType: 'BOOL', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['name-String', 'voltage-Numeric', 'flag-Bool'],
                            xColumn: null,
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    yColumns: ['voltage']
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
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

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
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                                { name: 'name', dataType: 'STRING', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric', 'name-String'],
                            xColumn: 'voltage-Numeric',
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        await lastValueFrom(ds.runQuery(query, { ...options, targets: [query] }));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    xColumn: 'voltage',
                                    yColumns: []
                                })
                            }),
                            expect.any(Object)
                        );
                    });
                });
        
                describe('maxDataPoints handling', () => {

                    it('should use 0 intervals when maxDataPoints is negative', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE'
                        } as DataFrameQueryV2;

                        const optionsWithNegativeMaxDataPoints = {
                            ...options,
                            maxDataPoints: -100
                        } as unknown as DataQueryRequest<DataFrameQueryV2>;

                        await lastValueFrom(ds.runQuery(query, optionsWithNegativeMaxDataPoints));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    intervals: 0
                                })
                            }),
                            expect.any(Object)
                        );
                    });

                    it('should cap maxDataPoints at TOTAL_ROWS_LIMIT when it exceeds the limit', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE'
                        } as DataFrameQueryV2;

                        const optionsWithLargeMaxDataPoints = {
                            ...options,
                            maxDataPoints: 2000000 // Greater than TOTAL_ROWS_LIMIT
                        } as unknown as DataQueryRequest<DataFrameQueryV2>;

                        await lastValueFrom(ds.runQuery(query, optionsWithLargeMaxDataPoints));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    intervals: 1000000 // TOTAL_ROWS_LIMIT
                                })
                            }),
                            expect.any(Object)
                        );
                    });

                    it('should use maxDataPoints when it is valid and within limit', async () => {
                        const mockTables = [{
                            id: 'table1',
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        postSpy.mockReturnValue(of({ frame: { columns: [], data: [] } }));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "test"',
                            decimationMethod: 'DECIMATE_MIN_MAX_AVERAGE'
                        } as DataFrameQueryV2;

                        const optionsWithValidMaxDataPoints = {
                            ...options,
                            maxDataPoints: 5000
                        } as unknown as DataQueryRequest<DataFrameQueryV2>;

                        await lastValueFrom(ds.runQuery(query, optionsWithValidMaxDataPoints));

                        expect(postSpy).toHaveBeenCalledWith(
                            expect.stringContaining('query-decimated-data'),
                            expect.objectContaining({
                                decimation: expect.objectContaining({
                                    intervals: 5000
                                })
                            }),
                            expect.any(Object)
                        );
                    });
                });

                describe('field type conversion and null handling', () => {
                    it('should convert field types correctly', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'boolValue', dataType: 'BOOL', columnType: ColumnType.Normal },
                                { name: 'stringValue', dataType: 'STRING', columnType: ColumnType.Normal },
                                { name: 'timestampValue', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'intValue', dataType: 'INT32', columnType: ColumnType.Normal },
                                { name: 'floatValue', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['boolValue', 'stringValue', 'timestampValue', 'intValue', 'floatValue'],
                                data: [
                                    ['true', 'test', '2024-01-01T00:00:00Z', '42', '3.14']  // Single row
                                ]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['boolValue-Bool', 'stringValue-String', 'timestampValue-Timestamp', 'intValue-Numeric', 'floatValue-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        // Find fields by name
                        const boolField = result.fields.find(field => field.name === 'boolValue');
                        const stringField = result.fields.find(field => field.name === 'stringValue');
                        const timestampField = result.fields.find(field => field.name === 'timestampValue');
                        const intField = result.fields.find(field => field.name === 'intValue');
                        const floatField = result.fields.find(field => field.name === 'floatValue');

                        // Verify field types
                        expect(boolField?.type).toBe('boolean');
                        expect(stringField?.type).toBe('string');
                        expect(timestampField?.type).toBe('time');
                        expect(intField?.type).toBe('number');
                        expect(floatField?.type).toBe('number');

                        // Verify boolean conversion
                        expect(boolField?.values).toEqual([true]);

                        // Verify string handling (not converted)
                        expect(stringField?.values).toEqual(['test']);

                        // Verify timestamp conversion
                        expect(timestampField?.values?.[0]).toBeGreaterThan(0); // Valid timestamp

                        // Verify numeric conversions
                        expect(intField?.values).toEqual([42]);
                        expect(floatField?.values).toEqual([3.14]);
                    });

                    it('should convert empty strings to null for all types except STRING', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'boolValue', dataType: 'BOOL', columnType: ColumnType.Normal },
                                { name: 'stringValue', dataType: 'STRING', columnType: ColumnType.Normal },
                                { name: 'timestampValue', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                                { name: 'intValue', dataType: 'INT32', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['boolValue', 'stringValue', 'timestampValue', 'intValue'],
                                data: [
                                    ['', '', '', '']  // Single row with empty values
                                ]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['boolValue-Bool', 'stringValue-String', 'timestampValue-Timestamp', 'intValue-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        // Find fields by name
                        const boolField = result.fields.find(field => field.name === 'boolValue');
                        const stringField = result.fields.find(field => field.name === 'stringValue');
                        const timestampField = result.fields.find(field => field.name === 'timestampValue');
                        const intField = result.fields.find(field => field.name === 'intValue');

                        // Boolean: empty → null
                        expect(boolField?.values).toEqual([null]);
                        // String: empty remains empty
                        expect(stringField?.values).toEqual(['']);
                        // Timestamp: empty → null
                        expect(timestampField?.values).toEqual([null]);
                        // Numeric: empty → null
                        expect(intField?.values).toEqual([null]);
                    });

                    it('should handle numeric types (INT32, INT64, FLOAT32, FLOAT64) consistently', async () => {
                        const mockTables = [{
                            id: 'table1',
                            name: 'table1',
                            columns: [
                                { name: 'int32Value', dataType: 'INT32', columnType: ColumnType.Normal },
                                { name: 'int64Value', dataType: 'INT64', columnType: ColumnType.Normal },
                                { name: 'float32Value', dataType: 'FLOAT32', columnType: ColumnType.Normal },
                                { name: 'float64Value', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }];
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const mockDecimatedData = {
                            frame: {
                                columns: ['int32Value', 'int64Value', 'float32Value', 'float64Value'],
                                data: [
                                    ['10', '20', '1.5', '2.5']  // Single row
                                ]
                            }
                        };
                        postSpy.mockReturnValue(of(mockDecimatedData));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['int32Value-Numeric', 'int64Value-Numeric', 'float32Value-Numeric', 'float64Value-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        const result = await lastValueFrom(ds.runQuery(query, options));

                        // Find fields by name
                        const int32Field = result.fields.find(field => field.name === 'int32Value');
                        const int64Field = result.fields.find(field => field.name === 'int64Value');
                        const float32Field = result.fields.find(field => field.name === 'float32Value');
                        const float64Field = result.fields.find(field => field.name === 'float64Value');

                        // All numeric types should be FieldType.number
                        expect(int32Field?.type).toBe('number');
                        expect(int64Field?.type).toBe('number');
                        expect(float32Field?.type).toBe('number');
                        expect(float64Field?.type).toBe('number');

                        // All should convert correctly
                        expect(int32Field?.values).toEqual([10]);
                        expect(int64Field?.values).toEqual([20]);
                        expect(float32Field?.values).toEqual([1.5]);
                        expect(float64Field?.values).toEqual([2.5]);
                    });
                });

                describe('batching decimated data requests', () => {
                    beforeEach(() => {
                        jest.useFakeTimers();
                    });

                    afterEach(() => {
                        jest.useRealTimers();
                    });

                    it('should batches with delay between each batch', async () => {
                        // Create 8 tables to test delays (2 batches: 6 + 2)
                        const mockTables = Array.from({ length: 8 }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        postSpy.mockImplementation((url) => {
                            return of({
                                frame: {
                                    columns: ['voltage'],
                                    data: [['1.0']]
                                }
                            });
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        lastValueFrom(ds.runQuery(query, options));
                        
                        // Advance timers step by step to verify delays
                        await jest.advanceTimersByTimeAsync(0);  // First batch (6 requests)
                        expect(postSpy).toHaveBeenCalledTimes(6);
                        
                        await jest.advanceTimersByTimeAsync(1000);  // Second batch (2 requests) after 1000ms delay
                        expect(postSpy).toHaveBeenCalledTimes(8);
                    });

                    it('should stop fetching when TOTAL_ROWS_LIMIT is reached', async () => {
                        // Create 10 tables but have them return enough data to exceed the limit
                        const mockTables = Array.from({ length: 10 }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));
                        
                        const largeDataArray = Array.from({ length: 300000 }, () => ['1.0']);
                        // Each table returns 300k rows with 1 column = 300k data points
                        // After 4 tables, we'll have 1.2M data points (exceeds TOTAL_ROWS_LIMIT of 1M)
                        postSpy.mockImplementation(() => {
                            return of({
                                frame: {
                                    columns: ['voltage'],
                                    data: largeDataArray
                                }
                            });
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        const queryPromise = lastValueFrom(ds.runQuery(query, options));
                        
                        await jest.runAllTimersAsync();
                        
                        const result = await queryPromise;

                        // Should stop after fetching enough to reach the limit
                        // With 300k rows per table, we need 4 tables to exceed 1M limit
                        expect(postSpy.mock.calls.length).toEqual(6); // At least 3 tables should be fetched
                        expect(result.refId).toBe('A');
                    });

                    it('should handle exactly REQUESTS_PER_SECOND (6) tables within a batch concurrently', async () => {
                        // Create exactly 6 tables (one full batch, no second batch)
                        const mockTables = Array.from({ length: 6 }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const callOrder: number[] = [];
                        postSpy.mockImplementation((url) => {
                            const tableIdMatch = url.match(/table(\d+)/);
                            const tableIndex = tableIdMatch ? parseInt(tableIdMatch[1], 10) : 0;
                            callOrder.push(tableIndex);
                            return of({
                                frame: {
                                    columns: ['voltage'],
                                    data: [['1.0']]
                                }
                            });
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'LOSSY',
                            filterNulls: false,
                            filterXRangeOnZoomPan: false
                        } as DataFrameQueryV2;

                        const queryPromise = lastValueFrom(ds.runQuery(query, options));
                        
                        await jest.runAllTimersAsync();
                        
                        await queryPromise;

                        // Should make exactly 6 requests (one complete batch)
                        expect(postSpy).toHaveBeenCalledTimes(6);
                        expect(callOrder).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5]));
                    });
                });
            });

            describe('fetch undecimated data', () => {
                let queryTablesSpy: jest.SpyInstance;
                let postSpy: jest.SpyInstance;
                let datasource: DataFrameDataSourceV2;
                let featureToggles = {
                    queryUndecimatedData: true
                }
                const undecimatedInstanceSettings = {
                    id: 1,
                    name: 'test',
                    type: 'test',
                    url: 'http://localhost',
                    jsonData: {
                        featureToggles
                    }
                } as any;

                beforeEach(() => {
                    datasource = new DataFrameDataSourceV2(
                        undecimatedInstanceSettings,
                        backendSrv,
                        templateSrv,
                    );
                    queryTablesSpy = jest.spyOn(datasource, 'queryTables$');
                    postSpy = jest.spyOn(datasource, 'post$');
                });

                it('should fetch undecimated data using export-data API when decimationMethod is NONE', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Index },
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'time,voltage\n2024-01-01T00:00:00Z,10.5\n2024-01-01T01:00:00Z,20.3';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['time-Timestamp', 'voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 5000
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.stringContaining('table1/export-data'),
                        expect.objectContaining({
                            columns: ['time', 'voltage'],
                            destination: 'INLINE',
                            responseFormat: 'CSV',
                            take: 5000
                        }),
                        expect.any(Object)
                    );
                    expect(result.refId).toBe('A');
                });

                it('should parse CSV response correctly into fields', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Index },
                            { name: 'current', dataType: 'INT32', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage,current\n10.5,20\n20.3,25\n30.1,30';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric', 'current-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    const valueField = findField(result.fields, 'voltage');
                    expect(valueField?.values).toEqual([10.5, 20.3, 30.1]);

                    const currentField = findField(result.fields, 'current');
                    expect(currentField?.values).toEqual([20, 25, 30]);
                });

                it('should apply null filters for undecimated data when filterNulls is true', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'current', dataType: 'INT32', columnType: ColumnType.Nullable }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage,current\n10.5,20\n15.3,25';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric', 'current-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: true,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            filters: expect.arrayContaining([
                                expect.objectContaining({
                                    column: 'current',
                                    operation: 'NOT_EQUALS',
                                    value: null
                                })
                            ])
                        }),
                        expect.any(Object)
                    );
                });

                it('should apply time filters for undecimated data when filterXRangeOnZoomPan is true', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'time,voltage\n2024-01-01T00:00:00Z,10.5';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['time-Timestamp', 'voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        xColumn: 'time-Timestamp',
                        filterNulls: false,
                        applyTimeFilters: true
                    } as DataFrameQueryV2;

                    const optionsWithRange = {
                        ...options,
                        range: {
                            from: { toISOString: () => '2024-01-01T00:00:00Z' },
                            to: { toISOString: () => '2024-01-02T00:00:00Z' }
                        }
                    } as any;

                    await lastValueFrom(datasource.runQuery(query, optionsWithRange));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            filters: expect.arrayContaining([
                                expect.objectContaining({
                                    column: 'time',
                                    operation: 'GREATER_THAN_EQUALS',
                                    value: '2024-01-01T00:00:00Z'
                                }),
                                expect.objectContaining({
                                    column: 'time',
                                    operation: 'LESS_THAN_EQUALS',
                                    value: '2024-01-02T00:00:00Z'
                                })
                            ])
                        }),
                        expect.any(Object)
                    );
                });

                it('should apply orderBy based on xColumn for undecimated data', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'time', dataType: 'TIMESTAMP', columnType: ColumnType.Normal },
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'time,voltage\n2024-01-01T00:00:00Z,10.5';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['time-Timestamp', 'voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        xColumn: 'time-Timestamp',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            orderBy: [{ column: 'time' }]
                        }),
                        expect.any(Object)
                    );
                });

                it('should not apply orderBy when xColumn is not specified for undecimated data', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];

                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage\n10.5';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            orderBy: undefined
                        }),
                        expect.any(Object)
                    );
            
                })

                it('should limit undecimatedRecordCount to UNDECIMATED_RECORDS_LIMIT', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage\n10.5';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 2000000 // Exceeds limit of 1,000,000
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            take: 1000000 // Should be capped at UNDECIMATED_RECORDS_LIMIT
                        }),
                        expect.any(Object)
                    );
                });

                it('should calculate take based on number of columns to ensure total data points <= 1M', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'col1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col2', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col3', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col4', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col5', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col6', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col7', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col8', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col9', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col10', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'col1,col2,col3,col4,col5,col6,col7,col8,col9,col10\n1,2,3,4,5,6,7,8,9,10';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['col1-Numeric', 'col2-Numeric', 'col3-Numeric', 'col4-Numeric', 'col5-Numeric',
                                  'col6-Numeric', 'col7-Numeric', 'col8-Numeric', 'col9-Numeric', 'col10-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 500000
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            take: 100000
                        }),
                        expect.any(Object)
                    );
                });

                it('should allow full 1M rows when only 1 column is selected', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage\n10.5';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 2000000
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            take: 1000000
                        }),
                        expect.any(Object)
                    );
                });

                it('should use user entered undecimatedRecordCount when it is less than calculated max data points', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'col1', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                            { name: 'col2', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'col1,col2\n1,2';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['col1-Numeric', 'col2-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 5000
                    } as DataFrameQueryV2;

                    await lastValueFrom(datasource.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.objectContaining({
                            take: 5000
                        }),
                        expect.any(Object)
                    );
                });

                it('should fall back to decimated data when feature toggle is disabled', async () => {
                    queryTablesSpy = jest.spyOn(ds, 'queryTables$');
                    postSpy = jest.spyOn(ds, 'post$');

                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const mockDecimatedData = {
                        frame: {
                            columns: ['voltage'],
                            data: [['10.5']]
                        }
                    };
                    postSpy.mockReturnValue(of(mockDecimatedData));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE', // Even with NONE, should use decimated
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    await lastValueFrom(ds.runQuery(query, options));

                    expect(postSpy).toHaveBeenCalledWith(
                        expect.stringContaining('query-decimated-data'),
                        expect.any(Object),
                        expect.any(Object)
                    );
                });

                it('should handle empty CSV response gracefully', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = '';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    expect(result.refId).toBe('A');
                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([]);
                });

                it('should handle CSV with no delimiters to parse', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal },
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage\n10.5\n20.3\n30.1';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    const voltageField = findField(result.fields, 'voltage');
                    
                    expect(voltageField?.values).toEqual([10.5, 20.3, 30.1]);
                });

                it('should handle CSV parsing errors gracefully and publish alertError event when CSV parsing fails', async () => {
                    const publishMock = jest.fn();
                    (datasource as any).appEvents = { publish: publishMock };

                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const originalPapaParse = Papa.parse;
                    (Papa.parse as any) = jest.fn().mockReturnValue({
                        data: [],
                        errors: [{ message: 'Invalid CSV format', type: 'FieldMismatch' }]
                    });

                    const csvResponse = 'invalid;;csv\ndata';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    expect(result.refId).toBe('A');
                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([]);

                    expect(publishMock).toHaveBeenCalledWith({
                        type: 'alert-error',
                        payload: [
                            'Error fetching undecimated table data',
                            expect.any(String)
                        ],
                    });

                    (Papa.parse as any) = originalPapaParse;
                });

                it('should publish alertError when export-data API returns error response', async () => {
                    const publishMock = jest.fn();
                    (datasource as any).appEvents = { publish: publishMock };
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const errorResponse = new Error('Export failed: Table not found');
                    postSpy.mockReturnValue(throwError(() => errorResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    expect(result.refId).toBe('A');
                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([]);

                    expect(publishMock).toHaveBeenCalledWith({
                        type: 'alert-error',
                        payload: [
                            'Error fetching undecimated table data',
                            expect.any(String)
                        ],
                    });
                });

                it('should handle CSV with only headers (no data rows)', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([]);
                });

                it('should handle malformed CSV with inconsistent column counts', async () => {
                    const mockTables = [{
                        id: 'table1',
                        name: 'table1',
                        columns: [
                            { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Index },
                            { name: 'current', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                        ]
                    }];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    const csvResponse = 'voltage,current\n10.5,20.3\n15.2,25.8,35.0';
                    postSpy.mockReturnValue(of(csvResponse));

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric', 'current-Numeric'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 500000
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toHaveLength(2);
                });

                it('should aggregate undecimated data from multiple tables', async () => {
                    const mockTables = [
                        {
                            id: 'table1',
                            name: 'Table 1',
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Index },
                                { name: 'current', dataType: 'FLOAT64', columnType: ColumnType.Normal}
                            ]
                        },
                        {
                            id: 'table2',
                            name: 'Table 2',
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Index },
                                { name: 'current', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }
                    ];
                    queryTablesSpy.mockReturnValue(of(mockTables));

                    postSpy.mockImplementation((url: string) => {
                        if (url.includes('table1/export-data')) {
                            return of('voltage,current\n10.5,1\n20.3,2');
                        }
                        if (url.includes('table2/export-data')) {
                            return of('voltage,current\n15.2,3\n25.8,4');
                        }
                        return of('');
                    });

                    const query = {
                        refId: 'A',
                        type: DataFrameQueryType.Data,
                        columns: ['voltage-Numeric', 'current-Numeric', 'Data table ID-Metadata', 'Data table name-Metadata'],
                        dataTableFilter: 'name = "Test"',
                        decimationMethod: 'NONE',
                        filterNulls: false,
                        applyTimeFilters: false,
                        undecimatedRecordCount: 1000000
                    } as DataFrameQueryV2;

                    const result = await lastValueFrom(datasource.runQuery(query, options));

                    const voltageField = findField(result.fields, 'voltage');
                    expect(voltageField?.values).toEqual([10.5, 20.3, 15.2, 25.8]);

                    const currentField = findField(result.fields, 'current');
                    expect(currentField?.values).toEqual([1, 2, 3, 4]);

                    const tableIdField = findField(result.fields, 'Data table ID');
                    expect(tableIdField?.values).toEqual(['table1', 'table1', 'table2', 'table2']);

                    const tableNameField = findField(result.fields, 'Data table name');
                    expect(tableNameField?.values).toEqual(['Table 1', 'Table 1', 'Table 2', 'Table 2']);
                });

                describe('batching undecimated data requests', () => {
                    beforeEach(() => {
                        jest.useFakeTimers();
                    });

                    afterEach(() => {
                        jest.useRealTimers();
                    });

                    it('should batch undecimated requests with delay between batches', async () => {
                        const mockTables = Array.from({ length: 8 }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        postSpy.mockImplementation(() => of('voltage\n1.0'));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'NONE',
                            filterNulls: false,
                            applyTimeFilters: false
                        } as DataFrameQueryV2;

                        lastValueFrom(datasource.runQuery(query, options));

                        await jest.advanceTimersByTimeAsync(0);
                        expect(postSpy).toHaveBeenCalledTimes(6);

                        await jest.advanceTimersByTimeAsync(1000);
                        expect(postSpy).toHaveBeenCalledTimes(8);
                    });

                    it('should stop fetching undecimated data when TOTAL_ROWS_LIMIT is reached', async () => {
                        const mockTables = Array.from({ length: 10 }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const largeDataRows = Array.from({ length: 300000 }, () => '1.0').join('\n');
                        const largeCsvResponse = 'voltage\n' + largeDataRows;
                        postSpy.mockImplementation(() => of(largeCsvResponse));

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'NONE',
                            filterNulls: false,
                            applyTimeFilters: false,
                            undecimatedRecordCount: 1000000
                        } as DataFrameQueryV2;

                        const queryPromise = lastValueFrom(datasource.runQuery(query, options));
                        await jest.runAllTimersAsync();
                        const result = await queryPromise;

                        // Should stop after fetching enough to reach the limit
                        // With 300k rows per table, we need 4 tables to exceed 1M limit
                        // But the first batch of 6 runs concurrently before stopSignal propagates
                        expect(postSpy.mock.calls.length).toEqual(6);
                        expect(result.refId).toBe('A');
                    });

                    it('should handle exactly REQUESTS_PER_SECOND tables within a batch concurrently for undecimated data', async () => {
                        const mockTables = Array.from({ length: REQUESTS_PER_SECOND }, (_, i) => ({
                            id: `table${i}`,
                            name: `table${i}`,
                            columns: [
                                { name: 'voltage', dataType: 'FLOAT64', columnType: ColumnType.Normal }
                            ]
                        }));
                        queryTablesSpy.mockReturnValue(of(mockTables));

                        const callOrder: number[] = [];
                        postSpy.mockImplementation((url) => {
                            const tableIdMatch = url.match(/table(\d+)/);
                            const tableIndex = tableIdMatch ? parseInt(tableIdMatch[1], 10) : 0;
                            callOrder.push(tableIndex);
                            return of('voltage\n1.0');
                        });

                        const query = {
                            refId: 'A',
                            type: DataFrameQueryType.Data,
                            columns: ['voltage-Numeric'],
                            dataTableFilter: 'name = "Test"',
                            decimationMethod: 'NONE',
                            filterNulls: false,
                            applyTimeFilters: false,
                            undecimatedRecordCount: 10000

                        } as DataFrameQueryV2;

                        const queryPromise = lastValueFrom(datasource.runQuery(query, options));
                        
                        await jest.runAllTimersAsync();
                        
                        await queryPromise;

                        expect(postSpy).toHaveBeenCalledTimes(REQUESTS_PER_SECOND);
                        expect(callOrder).toEqual(expect.arrayContaining([0, 1, 2, 3, 4, 5]));
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
                        },
                        {
                            name: "key",
                            type: 'string',
                            values: [
                                'value',
                                'value',
                                'value2',
                                'value2',
                                'value2'
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

                describe('when DataTableProperties.Properties is selected', () => {

                    it('should return properties flattened into fields', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: {
                                    author: 'John Doe',
                                    version: '1.0'
                                }
                            },
                            {
                                id: 'table-2',
                                name: 'Table 2',
                                properties: {
                                    author: 'Jane Smith',
                                    department: 'QA'
                                }
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        const authorField = findField(result.fields, 'author');
                        const versionField = findField(result.fields, 'version');
                        const departmentField = findField(result.fields, 'department');

                        expect(authorField?.values).toEqual(['John Doe', 'Jane Smith']);
                        expect(versionField?.values).toEqual(['1.0', undefined]);
                        expect(departmentField?.values).toEqual([undefined, 'QA']);
                    });

                    it('should return no property fields when tables have no properties', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.Name, DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: {}
                            },
                            {
                                id: 'table-2',
                                name: 'Table 2',
                                properties: {}
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        expect(result.fields).toHaveLength(1); // Only Name field
                        expect(result.fields[0].name).toBe(
                            DataTableProjectionLabelLookup[DataTableProperties.Name].label
                        );
                    });

                    it('should sort property keys alphabetically', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: {
                                    zebra: 'last',
                                    alpha: 'first',
                                    charlie: 'middle',
                                    beta: 'second'
                                }
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        const fieldNames = result.fields.map((field: FieldDTO) => field.name);
                        expect(fieldNames).toEqual(['alpha', 'beta', 'charlie', 'zebra']);
                    });

                    it('should set all property fields to string type', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: {
                                    stringProp: 'text',
                                    numericProp: '123',
                                    boolProp: 'true'
                                }
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        expect(result.fields.every((field: FieldDTO) => field.type === 'string')).toBe(true);
                    });

                    it('should work with flattened columns tables', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [
                                DataTableProperties.Name, 
                                DataTableProperties.Properties
                            ],
                            columnProperties: [DataTableProperties.ColumnName],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: { author: 'John' },
                                columns: [
                                    { name: 'Col1', dataType: 'STRING' },
                                    { name: 'Col2', dataType: 'INT32' }
                                ]
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        const authorField = findField(result.fields, 'author');
                        expect(authorField?.values).toEqual(['John', 'John']);
                    });

                    it('should return only 100 fields when more than 100 unique property keys exist', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                properties: Object.fromEntries(
                                    Array.from({ length: 101 }, (_, i) => [`prop${i}`, `value${i}`])
                                )
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        expect(result.fields.length).toBe(100);
                    });

                    it('should add a suffix `(Data table)` to property field names that conflict with first-class property names', async () => {
                        const queryWithProperties = {
                            type: DataFrameQueryType.Properties,
                            dataTableProperties: [DataTableProperties.ColumnCount, DataTableProperties.Properties],
                            columnProperties: [],
                            take: 1000,
                            refId: 'A',
                        };
                        const mockTables = [
                            {
                                id: 'table-1',
                                name: 'Table 1',
                                columns: 2,
                                properties: {
                                    Columns: 'Conflicting property value',
                                }
                            }
                        ];
                        queryTablesSpy$.mockReturnValue(of(mockTables));

                        const result = await lastValueFrom(ds.runQuery(queryWithProperties, options));

                        const nameField = findField(result.fields, 'Columns (Data table)');
                        expect(nameField?.values).toEqual(['Conflicting property value']);
                    });
                });
            });
        });

        describe("when the field name is 'value'", () => {
            let queryTablesSpy$: jest.SpyInstance;

            beforeEach(() => {
                queryTablesSpy$ = jest.spyOn(ds, 'queryTables$');
            });

            it('should set the displayName in the field config when the query type is Data', async () => {
                const queryWithValueField = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['value-Numeric', 'otherField-String']
                } as DataFrameQueryV2;
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            { name: 'value', dataType: 'INT32' },
                            { name: 'otherField', dataType: 'STRING' }
                        ]
                    }
                ];
                const mockDecimatedData = {
                    frame: {
                        columns: ['value', 'otherField'],
                        data: [
                            ['1', 'One'],
                            ['2', 'Two']
                        ]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                let queryDecimatedDataSpy$ = jest.spyOn(ds, 'post$');
                queryDecimatedDataSpy$.mockReturnValue(of(mockDecimatedData));

                const result = await lastValueFrom(ds.runQuery(queryWithValueField, options));

                const valueField = findField(result.fields, 'value');
                expect(valueField?.config?.displayName).toBe('value');
            });

            it('should set the displayName in the field config when the query type is Properties', async () => {
                const queryWithValueField = {
                    type: DataFrameQueryType.Properties,
                    dataTableFilter: 'name = "Test Table"',
                    dataTableProperties: [DataTableProperties.Properties],
                    refId: 'A',
                } as DataFrameQueryV2;
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        properties: {
                            value: 'Some property value',
                            otherField: 'Another property value'
                        }
                    }
                ];
                queryTablesSpy$.mockReturnValue(of(mockTables));

                const result = await lastValueFrom(ds.runQuery(queryWithValueField, options));

                const valueField = findField(result.fields, 'value');
                expect(valueField?.config?.displayName).toBe('value');
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
            ds = new DataFrameDataSourceV2(
                instanceSettings,
                backendSrv,
                templateSrv,
            );
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
        describe('DataFrameDataQuery.type', () => {
            it('should convert MetaData type to Properties type', () => {
                const query = {
                    type: 'Metadata' as any,
                    refId: 'A'
                } as DataFrameDataQuery;

                const result = ds.processQuery(query);

                expect(result.type).toBe(DataFrameQueryType.Properties);
            });
        });

        describe('DataFrameDataQuery.columns', () => {
            let getSpy$: jest.SpyInstance;

            beforeEach(() => {
                getSpy$ = jest.spyOn(ds, 'get$');
            });

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

            it('should return an observable that resolves to migrated columns when columns are provided and tableId is present', async () => {
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

            it('should not call get$ when no columns are provided', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-789',
                    columns: [],
                    refId: 'E'
                } as DataFrameQueryV1;

                ds.processQuery(v1Query);

                expect(getSpy$).not.toHaveBeenCalled();
            });

            it('should not call get$ when columns are objects without name property', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-789',
                    columns: [{ dataType: 'string' }, { dataType: 'string' }] as any,
                    refId: 'E'
                } as DataFrameQueryV1;

                ds.processQuery(v1Query);

                expect(getSpy$).not.toHaveBeenCalled();
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

        describe('DataFrameDataQuery.dataTableFilter', () => {
            it('should transform tableId as dataTableFilter when query type is properties', () => {
                const v1Query = {
                    type: DataFrameQueryType.Properties,
                    tableId: 'table-123',
                    refId: 'A'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableFilter).toBe('id = "table-123"');
                expect(result).not.toHaveProperty('tableId');
            });

            it('should transform tableId as dataTableFilter when query type is data', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-456',
                    refId: 'B'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableFilter).toBe('id = "table-456"');
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
                expect(result).not.toHaveProperty('tableId');
            });

            it('should handle undefined tableId by setting empty dataTableFilter', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: undefined,
                    refId: 'D'
                } as any;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableFilter).toBe('');
                expect(result).not.toHaveProperty('tableId');
            });
        });

        describe('DataFrameDataQuery.dataTableProperties', () => {
            it('should set dataTableProperties as [DataTableProperties.Properties] when query type is properties', () => {
                const v1Query = {
                    type: DataFrameQueryType.Properties,
                    tableId: 'table-123',
                    refId: 'A'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableProperties).toEqual([DataTableProperties.Properties]);
            });

            it('should set dataTableProperties with default values when query type is data', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-456',
                    refId: 'B'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result.dataTableProperties).toEqual([
                    DataTableProperties.Name,
                    DataTableProperties.Id,
                    DataTableProperties.RowCount,
                    DataTableProperties.ColumnCount,
                    DataTableProperties.CreatedAt,
                    DataTableProperties.Workspace
                ]);
            });
        });

        describe('DataFrameDataQuery.filterXRangeOnZoomPan', () => {
            it('should copy applyTimeFilters value into filterXRangeOnZoomPan and remove applyTimeFilters', () => {
                const v1Query = {
                    type: DataFrameQueryType.Data,
                    tableId: 'table-123',
                    applyTimeFilters: true,
                    refId: 'A'
                } as DataFrameQueryV1;

                const result = ds.processQuery(v1Query);

                expect(result.filterXRangeOnZoomPan).toBe(true);
                expect(result).not.toHaveProperty('applyTimeFilters');
            });
        });

        describe('when the query is already migrated', () => {
            it('should return query merged with defaults', () => {
                const v2Query: DataFrameQueryV2 = {
                    type: DataFrameQueryType.Properties,
                    dataTableFilter: 'name = "test"',
                    columns: [],
                    dataTableProperties: [DataTableProperties.Name, DataTableProperties.Id],
                    filterXRangeOnZoomPan: true,
                    refId: 'E'
                };

                const result = ds.processQuery(v2Query);

                expect(result).toEqual({
                    type: DataFrameQueryType.Properties,
                    resultFilter: '',
                    dataTableFilter: 'name = "test"',
                    columnFilter: '',
                    dataTableProperties: [DataTableProperties.Name, DataTableProperties.Id],
                    columnProperties: [],
                    columns: [],
                    includeIndexColumns: false,
                    filterNulls: false,
                    decimationMethod: 'LOSSY',
                    xColumn: null,
                    filterXRangeOnZoomPan: true,
                    take: 1000,
                    undecimatedRecordCount: 10000,
                    showUnits: false,
                    refId: 'E'
                });
            });

            it('should preserve all V2 query properties', () => {
                const v2Query: ValidDataFrameQueryV2 = {
                    type: DataFrameQueryType.Data,
                    resultFilter: '',
                    dataTableFilter: 'workspace = "ws-1"',
                    columnFilter: '',
                    dataTableProperties: [DataTableProperties.Name, DataTableProperties.Id],
                    columnProperties: [DataTableProperties.ColumnName],
                    columns: ['col1', 'col2'],
                    includeIndexColumns: true,
                    filterNulls: true,
                    decimationMethod: 'LOSSY',
                    xColumn: 'time',
                    filterXRangeOnZoomPan: true,
                    showUnits: false,
                    take: 100,
                    undecimatedRecordCount: 10000,
                    refId: 'F'
                };

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

            it('should return only metadata field options when no tables are found', async () => {
                queryTablesMock$.mockReturnValue(of([]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([
                    {
                        label: 'Data table ID',
                        value: 'Data table ID-Metadata',
                        group: 'Metadata'
                    },
                    {
                        label: 'Data table name',
                        value: 'Data table name-Metadata',
                        group: 'Metadata'
                    }
                ]);
            });

            it('should return only metadata field options when tables have no columns', async () => {
                queryTablesMock$.mockReturnValue(of([
                    { id: '1', name: 'Table 1', columns: [] },
                    { id: '2', name: 'Table 2' },
                ]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([
                    {
                        label: 'Data table ID',
                        value: 'Data table ID-Metadata',
                        group: 'Metadata'
                    },
                    {
                        label: 'Data table name',
                        value: 'Data table name-Metadata',
                        group: 'Metadata'
                    }
                ]);
            });

            it('should include data table ID and name labels in column dropdown when tables with columns are found', async () => {
                queryTablesMock$.mockReturnValue(of([
                    {
                        id: '1',
                        name: 'Table 1',
                        columns: [
                            { name: 'Column1', dataType: 'STRING' }
                        ]
                    }
                ]));

                const result = await ds.getColumnOptionsWithVariables({ dataTableFilter: 'some-filter' });

                expect(result.uniqueColumnsAcrossTables).toEqual([
                    { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                    { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                    { label: 'Column1', value: 'Column1-String', group: 'Columns' }
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
                    { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                    { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                    { label: 'Alpha', value: 'Alpha-Numeric', group: 'Columns' },
                    { label: 'Column1', value: 'Column1-Numeric', group: 'Columns' },
                    { label: 'column2', value: 'column2-Numeric', group: 'Columns' },
                    { label: 'Test (Numeric)', value: 'Test-Numeric', group: 'Columns' },
                    { label: 'Test (String)', value: 'Test-String', group: 'Columns' },
                    { label: 'test1', value: 'test1-Numeric', group: 'Columns' },
                    { label: 'Zeta', value: 'Zeta-String', group: 'Columns' },
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
                    { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                    { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                    { label: 'Column 1', value: 'Column 1-Numeric', group: 'Columns' },
                    { label: 'Column 2', value: 'Column 2-Numeric', group: 'Columns' },
                    { label: 'Column 3', value: 'Column 3-Numeric', group: 'Columns' },
                    { label: 'Column 4', value: 'Column 4-Numeric', group: 'Columns' },
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
                        { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                        { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                        { label: 'Column 1', value: 'Column 1-String', group: 'Columns' },
                        { label: 'Column 2', value: 'Column 2-Numeric', group: 'Columns' },
                        { label: 'Column 3', value: 'Column 3-Timestamp', group: 'Columns' },
                        { label: 'Column 4', value: 'Column 4-Boolean', group: 'Columns' },
                        { label: 'Column 5', value: 'Column 5-String', group: 'Columns' },
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
                        { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                        { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                        { label: 'Column 1 (Numeric)', value: 'Column 1-Numeric', group: 'Columns' },
                        { label: 'Column 1 (String)', value: 'Column 1-String', group: 'Columns' }
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
                        { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                        { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                        { label: 'Column A (Boolean)', value: 'Column A-Boolean', group: 'Columns' },
                        { label: 'Column A (String)', value: 'Column A-String', group: 'Columns' },
                        { label: 'Column B (Numeric)', value: 'Column B-Numeric', group: 'Columns' },
                        { label: 'Column B (Timestamp)', value: 'Column B-Timestamp', group: 'Columns' },
                        { label: 'Column C (Boolean)', value: 'Column C-Boolean', group: 'Columns' },
                        { label: 'Column C (String)', value: 'Column C-String', group: 'Columns' },
                        { label: 'Column D', value: 'Column D-Numeric', group: 'Columns' },
                        { label: 'Column E', value: 'Column E-Numeric', group: 'Columns' }
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
                        { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                        { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                        { label: 'Column A', value: 'Column A-String', group: 'Columns' },
                        { label: 'Column B', value: 'Column B-Numeric', group: 'Columns' },
                        { label: 'Column C', value: 'Column C-Boolean', group: 'Columns' },
                        { label: 'Column D', value: 'Column D-Numeric', group: 'Columns' },
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
                        { label: 'Data table ID', value: 'Data table ID-Metadata', group: 'Metadata' },
                        { label: 'Data table name', value: 'Data table name-Metadata', group: 'Metadata' },
                        { label: '$var1', value: '$var1', group: 'Columns' },
                        { label: '$var2', value: '$var2', group: 'Columns' },
                        { label: 'Column 1', value: 'Column 1-String', group: 'Columns' },
                        { label: 'Column 2', value: 'Column 2-Numeric', group: 'Columns' }
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
                scopedVars: scopedVars,
                targets: [query],
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
                scopedVars: scopedVars,
                targets: [query],
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
                scopedVars: scopedVars,
                targets: [query],
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

    describe('showUnits', () => {
        let queryTablesSpy$: jest.SpyInstance;
        let postSpy$: jest.SpyInstance;

        beforeEach(() => {
            queryTablesSpy$ = jest.spyOn(ds, 'queryTables$');
            postSpy$ = jest.spyOn(ds, 'post$');
        });

        describe('when showUnits is true', () => {
            it('should call query tables API with ColumnProperties in projection', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5'], ['21.0']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                await lastValueFrom(ds.runQuery(query, queryOptions));

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        "dataTableFilter": "name = \"Test Table\"",
                        "columnFilter": "",
                        "resultFilter": ""
                    },
                    TAKE_LIMIT,
                    [
                        DataTableProjections.ColumnName,
                        DataTableProjections.ColumnDataType,
                        DataTableProjections.ColumnType,
                        DataTableProjections.ColumnProperties
                    ]
                );
            });

            it('should append unit to column display name and set unit in field config', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5'], ['21.0']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const temperatureField = findField(result.fields, 'Temperature (Celsius)');
                expect(temperatureField).toBeDefined();
                expect(temperatureField?.config?.unit).toBe('Celsius');
            });

            it('should handle columns with empty unit values', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Count',
                                dataType: 'INT64',
                                columnType: ColumnType.Normal,
                                properties: {}
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Count-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Count'],
                        data: [['100'], ['200']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const countField = findField(result.fields, 'Count');
                expect(countField).toBeDefined();
                expect(countField?.config?.unit).toBe(undefined);
            });

            it('should handle columns with different units separately', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            },
                            {
                                name: 'Pressure',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'atm' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Temperature-Numeric', 'Pressure-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {}
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Temperature', 'Pressure'],
                        data: [['20.5', '1.0'], ['21.0', '1.1']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const temperatureField = findField(result.fields, 'Temperature (Celsius)');
                const pressureField = findField(result.fields, 'Pressure (atm)');
                expect(temperatureField).toBeDefined();
                expect(temperatureField?.config?.unit).toBe('Celsius');
                expect(pressureField).toBeDefined();
                expect(pressureField?.config?.unit).toBe('atm');
            });

            it('should create separate fields for same column name with different units', async () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'id = "table-1" OR id = "table-2"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    },
                    {
                        id: 'table-2',
                        name: 'Table 2',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Fahrenheit' }
                            }
                        ]
                    }
                ];
                const mockDecimatedDataTable1 = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5']]
                    }
                };
                const mockDecimatedDataTable2 = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['68.9']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockImplementation((url: string) => {
                    return url.includes('table-1')
                        ? of(mockDecimatedDataTable1)
                        : of(mockDecimatedDataTable2);
                });

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const celsiusField = findField(result.fields, 'Temperature (Celsius)');
                const fahrenheitField = findField(result.fields, 'Temperature (Fahrenheit)');
                expect(celsiusField).toBeDefined();
                expect(fahrenheitField).toBeDefined();
                expect(celsiusField?.config?.unit).toBe('Celsius');
                expect(fahrenheitField?.config?.unit).toBe('Fahrenheit');
                expect(celsiusField?.values).toEqual([20.5, null]);
                expect(fahrenheitField?.values).toEqual([null, 68.9]);
            });

            it('should append the data type to column name if columns in different tables have the same name but different data types along with unit', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Value',
                                dataType: 'INT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'unit1' }
                            }
                        ]
                    },
                    {
                        id: 'table-2',
                        name: 'Table 2',
                        columns: [
                            {
                                name: 'Value',
                                dataType: 'STRING',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'unit2' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'id = "table-1" OR id = "table-2"',
                    refId: 'A',
                    columns: ['Value-String', 'Value-Numeric'],
                    showUnits: true
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedDataTable1 = {
                    frame: {
                        columns: ['Value'],
                        data: [['100']]
                    }
                };
                const mockDecimatedDataTable2 = {
                    frame: {
                        columns: ['Value'],
                        data: [['200.5']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockImplementation((url: string) => {
                    return url.includes('table-1')
                        ? of(mockDecimatedDataTable1)
                        : of(mockDecimatedDataTable2);
                });

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const intField = findField(result.fields, 'Value (Numeric) (unit1)');
                const floatField = findField(result.fields, 'Value (String) (unit2)');
                expect(intField).toBeDefined();
                expect(floatField).toBeDefined();
                expect(intField?.config?.unit).toBe('unit1');
                expect(floatField?.config?.unit).toBe('unit2');
                expect(intField?.values).toEqual([100, null]);
                expect(floatField?.values).toEqual([null, "200.5"]);
            });

            describe('different unit conventions', () => {
                it('should extract unit from column properties with lowercase "unit" key', async () => {
                    const mockTables = [
                        {
                            id: 'table-1',
                            name: 'Table 1',
                            columns: [
                                {
                                    name: 'Temperature',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal,
                                    properties: { unit: 'Celsius' }
                                }
                            ]
                        }
                    ];
                    const query = {
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Test Table"',
                        refId: 'A',
                        columns: ['Temperature-Numeric'],
                        showUnits: true
                    } as DataFrameQueryV2;
                    const queryOptions = {
                        scopedVars: {},
                        targets: [query]
                    } as unknown as DataQueryRequest<DataFrameQueryV2>;
                    const mockDecimatedData = {
                        frame: {
                            columns: ['Temperature'],
                            data: [['20.5']]
                        }
                    };
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    postSpy$.mockReturnValue(of(mockDecimatedData));

                    const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                    const temperatureField = findField(result.fields, 'Temperature (Celsius)');
                    expect(temperatureField).toBeDefined();
                    expect(temperatureField?.config?.unit).toBe('Celsius');
                });

                it('should extract unit from column properties with uppercase "Unit" key', async () => {
                    const mockTables = [
                        {
                            id: 'table-1',
                            name: 'Table 1',
                            columns: [
                                {
                                    name: 'Temperature',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal,
                                    properties: { Unit: 'Fahrenheit' }
                                }
                            ]
                        }
                    ];
                    const query = {
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Test Table"',
                        refId: 'A',
                        columns: ['Temperature-Numeric'],
                        showUnits: true
                    } as DataFrameQueryV2;
                    const queryOptions = {
                        scopedVars: {},
                        targets: [query]
                    } as unknown as DataQueryRequest<DataFrameQueryV2>;
                    const mockDecimatedData = {
                        frame: {
                            columns: ['Temperature'],
                            data: [['68.9']]
                        }
                    };
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    postSpy$.mockReturnValue(of(mockDecimatedData));

                    const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                    const temperatureField = findField(result.fields, 'Temperature (Fahrenheit)');
                    expect(temperatureField).toBeDefined();
                    expect(temperatureField?.config?.unit).toBe('Fahrenheit');
                });

                it('should extract unit from column properties with lowercase "units" key', async () => {
                    const mockTables = [
                        {
                            id: 'table-1',
                            name: 'Table 1',
                            columns: [
                                {
                                    name: 'Distance',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal,
                                    properties: { units: 'meters' }
                                }
                            ]
                        }
                    ];
                    const query = {
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Test Table"',
                        refId: 'A',
                        columns: ['Distance-Numeric'],
                        showUnits: true
                    } as DataFrameQueryV2;
                    const queryOptions = {
                        scopedVars: {},
                        targets: [query]
                    } as unknown as DataQueryRequest<DataFrameQueryV2>;
                    const mockDecimatedData = {
                        frame: {
                            columns: ['Distance'],
                            data: [['100.5']]
                        }
                    };
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    postSpy$.mockReturnValue(of(mockDecimatedData));

                    const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                    const distanceField = findField(result.fields, 'Distance (meters)');
                    expect(distanceField).toBeDefined();
                    expect(distanceField?.config?.unit).toBe('meters');
                });

                it('should extract unit from column properties with uppercase "Units" key', async () => {
                    const mockTables = [
                        {
                            id: 'table-1',
                            name: 'Table 1',
                            columns: [
                                {
                                    name: 'Speed',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal,
                                    properties: { Units: 'mph' }
                                }
                            ]
                        }
                    ];
                    const query = {
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Test Table"',
                        refId: 'A',
                        columns: ['Speed-Numeric'],
                        showUnits: true
                    } as DataFrameQueryV2;
                    const queryOptions = {
                        scopedVars: {},
                        targets: [query]
                    } as unknown as DataQueryRequest<DataFrameQueryV2>;
                    const mockDecimatedData = {
                        frame: {
                            columns: ['Speed'],
                            data: [['55.5']]
                        }
                    };
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    postSpy$.mockReturnValue(of(mockDecimatedData));

                    const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                    const speedField = findField(result.fields, 'Speed (mph)');
                    expect(speedField).toBeDefined();
                    expect(speedField?.config?.unit).toBe('mph');
                });

                it('should prioritize "unit" over other unit property keys', async () => {
                    const mockTables = [
                        {
                            id: 'table-1',
                            name: 'Table 1',
                            columns: [
                                {
                                    name: 'Measurement',
                                    dataType: 'FLOAT64',
                                    columnType: ColumnType.Normal,
                                    properties: { unit: 'kg', units: 'grams' }
                                }
                            ]
                        }
                    ];
                    const query = {
                        type: DataFrameQueryType.Data,
                        dataTableFilter: 'name = "Test Table"',
                        refId: 'A',
                        columns: ['Measurement-Numeric'],
                        showUnits: true
                    } as DataFrameQueryV2;
                    const queryOptions = {
                        scopedVars: {}
                    } as unknown as DataQueryRequest<DataFrameQueryV2>;
                    const mockDecimatedData = {
                        frame: {
                            columns: ['Measurement'],
                            data: [['5.5']]
                        }
                    };
                    queryTablesSpy$.mockReturnValue(of(mockTables));
                    postSpy$.mockReturnValue(of(mockDecimatedData));

                    const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                    const measurementField = findField(result.fields, 'Measurement (kg)');
                    expect(measurementField).toBeDefined();
                    expect(measurementField?.config?.unit).toBe('kg');
                });
            });
        });

        describe('when showUnits is false', () => {
            it('should call query tables API without ColumnProperties in projection', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: false
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5'], ['21.0']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                await lastValueFrom(ds.runQuery(query, queryOptions));

                expect(queryTablesSpy$).toHaveBeenCalledWith(
                    {
                        "dataTableFilter": "name = \"Test Table\"",
                        "columnFilter": "",
                        "resultFilter": ""
                    },
                    TAKE_LIMIT,
                    [
                        DataTableProjections.ColumnName,
                        DataTableProjections.ColumnDataType,
                        DataTableProjections.ColumnType,
                    ]
                );
            });

            it('should not append unit to column display name and set unit in field config', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'name = "Test Table"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: false
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedData = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5'], ['21.0']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockReturnValue(of(mockDecimatedData));

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const temperatureField = findField(result.fields, 'Temperature');
                expect(temperatureField).toBeDefined();
                expect(temperatureField?.config?.unit).toBeUndefined();
                expect(temperatureField?.values).toEqual([20.5, 21.0]);
            });

            it('should create only one field for same column name with different units', async () => {
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'id = "table-1" OR id = "table-2"',
                    refId: 'A',
                    columns: ['Temperature-Numeric'],
                    showUnits: false
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Celsius' }
                            }
                        ]
                    },
                    {
                        id: 'table-2',
                        name: 'Table 2',
                        columns: [
                            {
                                name: 'Temperature',
                                dataType: 'FLOAT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'Fahrenheit' }
                            }
                        ]
                    }
                ];
                const mockDecimatedDataTable1 = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['20.5']]
                    }
                };
                const mockDecimatedDataTable2 = {
                    frame: {
                        columns: ['Temperature'],
                        data: [['68.9']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockImplementation((url: string) => {
                    return url.includes('table-1')
                        ? of(mockDecimatedDataTable1)
                        : of(mockDecimatedDataTable2);
                });

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const temperatureField = findField(result.fields, 'Temperature');
                expect(temperatureField).toBeDefined();
                expect(temperatureField?.config?.unit).toBe(undefined);
                expect(temperatureField?.values).toEqual([20.5, 68.9]);
            });

            it('should append only the data type to column name if columns in different tables have the same name but different data types', async () => {
                const mockTables = [
                    {
                        id: 'table-1',
                        name: 'Table 1',
                        columns: [
                            {
                                name: 'Value',
                                dataType: 'INT64',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'unit1' }
                            }
                        ]
                    },
                    {
                        id: 'table-2',
                        name: 'Table 2',
                        columns: [
                            {
                                name: 'Value',
                                dataType: 'STRING',
                                columnType: ColumnType.Normal,
                                properties: { unit: 'unit2' }
                            }
                        ]
                    }
                ];
                const query = {
                    type: DataFrameQueryType.Data,
                    dataTableFilter: 'id = "table-1" OR id = "table-2"',
                    refId: 'A',
                    columns: ['Value-String', 'Value-Numeric'],
                    showUnits: false
                } as DataFrameQueryV2;
                const queryOptions = {
                    scopedVars: {},
                    targets: [query]
                } as unknown as DataQueryRequest<DataFrameQueryV2>;
                const mockDecimatedDataTable1 = {
                    frame: {
                        columns: ['Value'],
                        data: [['100']]
                    }
                };
                const mockDecimatedDataTable2 = {
                    frame: {
                        columns: ['Value'],
                        data: [['200.5']]
                    }
                };
                queryTablesSpy$.mockReturnValue(of(mockTables));
                postSpy$.mockImplementation((url: string) => {
                    return url.includes('table-1')
                        ? of(mockDecimatedDataTable1)
                        : of(mockDecimatedDataTable2);
                });

                const result = await lastValueFrom(ds.runQuery(query, queryOptions));

                const intField = findField(result.fields, 'Value (Numeric)');
                const floatField = findField(result.fields, 'Value (String)');
                expect(intField).toBeDefined();
                expect(floatField).toBeDefined();
                expect(intField?.config?.unit).toBe(undefined);
                expect(floatField?.config?.unit).toBe(undefined);
                expect(intField?.values).toEqual([100, null]);
                expect(floatField?.values).toEqual([null, "200.5"]);
            });
        });
    });
});
