import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { Alert, AutoSizeInput, Collapse, Combobox, ComboboxOption, InlineField, InlineSwitch, MultiCombobox, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryV2, DataFrameQueryType, DataTableProjectionLabelLookup, DataTableProjectionType, ValidDataFrameQueryV2, DataTableProperties, Props, DataFrameDataQuery, CombinedFilters, defaultQueryV2, metadataFieldOptions, DataTableProjections } from "../../types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { COLUMN_OPTIONS_LIMIT, decimationMethods, TAKE_LIMIT, UNDECIMATED_RECORDS_LIMIT,decimationNoneOption } from 'datasources/data-frame/constants';
import { FloatingError } from 'core/errors';
import {
    errorMessages,
    INLINE_LABEL_WIDTH,
    VALUE_FIELD_WIDTH,
    getValuesInPixels,
    SECTION_WIDTH,
    labels,
    placeholders,
    tooltips,
    infoMessage,
    DATA_TABLE_CUSTOM_PROPERTIES_GROUP,
    COLUMN_CUSTOM_PROPERTIES_GROUP,
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';
import { isObservable, lastValueFrom } from 'rxjs';
import _ from 'lodash';

export const DataFrameQueryEditorV2: React.FC<Props> = (
    { query, onChange, onRunQuery, datasource }: Props
) => {
    const isQueryUndecimatedDataFeatureEnabled = useMemo(() => 
        datasource.instanceSettings.jsonData?.featureToggles?.queryUndecimatedData ?? false,
        [datasource]
    );

    const isHighResolutionZoomFeatureEnabled = useMemo(() =>
        datasource.instanceSettings.jsonData?.featureToggles?.highResolutionZoom ?? false,
        [datasource]
    );

    const migratedQuery = datasource.processQuery(
        query as DataFrameDataQuery,
    ) as ValidDataFrameQueryV2;

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [isDecimationSettingsSectionOpen, setIsDecimationSettingsSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
    const [undecimatedRecordCountInvalidMessage, setUndecimatedRecordCountInvalidMessage] = useState<string>('');
    const [columnOptions, setColumnOptions] = useState<Array<ComboboxOption<string>>>(metadataFieldOptions);
    const [isPropertiesNotSelected, setIsPropertiesNotSelected] = useState<boolean>(false);
    const [xColumnOptions, setXColumnOptions] = useState<Array<ComboboxOption<string>>>([]);
    const [isColumnOptionsInitialized, setIsColumnOptionsInitialized] = useState<boolean>(false);
    const [dynamicDataTablePropertyKeyOptions, setDynamicDataTablePropertyKeyOptions] = useState<Array<ComboboxOption<string>>>([]);
    const [dynamicColumnPropertyKeyOptions, setDynamicColumnPropertyKeyOptions] = useState<Array<ComboboxOption<string>>>([]);

    const getPropertiesOptions = (
        type: DataTableProjectionType
    ): Array<ComboboxOption<DataTableProperties>> =>
        Object.entries(DataTableProjectionLabelLookup)
            .filter(([_, value]) => value.type === type)
            .map(([key, value]) => ({
                label: value.label,
                value: key as DataTableProperties,
                group: 'Properties'
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

    const dataTablePropertiesOptions = getPropertiesOptions(DataTableProjectionType.DataTable);
    const columnPropertiesOptions = getPropertiesOptions(DataTableProjectionType.Column);

    const lastFilterRef = useRef<CombinedFilters>({
        resultFilter: '',
        dataTableFilter: '',
        columnFilter: '',
    });

    // Auto-run query on initial render
    // if it is default query
    useEffect(() => {
        const isDefaultQuery = _.isMatch(migratedQuery, defaultQueryV2);
        if (isDefaultQuery) {
          onRunQuery();
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

    const fetchAndSetColumnOptions = useCallback(
        async (filters: CombinedFilters) => {
            if (!filters.dataTableFilter && !filters.resultFilter && !filters.columnFilter) {
                return;
            }

            try {
                const columnOptions = await datasource.getColumnOptionsWithVariables(filters);
                const limitedColumnOptions = columnOptions.uniqueColumnsAcrossTables
                    .slice(0, COLUMN_OPTIONS_LIMIT + metadataFieldOptions.length);
                const limitedXColumnOptions = columnOptions.commonColumnsAcrossTables
                    .slice(0, COLUMN_OPTIONS_LIMIT);
                setColumnOptions(limitedColumnOptions);
                setXColumnOptions(limitedXColumnOptions);
            } catch (error) {
                setColumnOptions(metadataFieldOptions);
                setXColumnOptions([]);
            } finally {
                setIsColumnOptionsInitialized(true);
            }
        },
        [
            datasource
        ]
    );

    const fetchAndSetPropertyKeyOptions = useCallback(
        async (filters: CombinedFilters) => {
            try {
                const tables = await lastValueFrom(datasource.queryTables$(
                    filters ,
                    migratedQuery.take,
                    [
                        DataTableProjections.Properties,
                        DataTableProjections.ColumnProperties
                    ]
                    ));
                const dataTableKeySet = new Set<string>();
                const columnKeySet = new Set<string>();

                for (const table of tables) {
                    if (table.properties) {
                        for (const key of Object.keys(table.properties)) {
                            dataTableKeySet.add(key);
                        }
                    }
                    if (table.columns) {
                        for (const column of table.columns) {
                            if (column.properties) {
                                for (const key of Object.keys(column.properties)) {
                                    columnKeySet.add(key);
                                }
                            }
                        }
                    }
                }

                setDynamicDataTablePropertyKeyOptions(
                    Array.from(dataTableKeySet).map(key => ({
                        label: key,
                        value: key,
                        group: DATA_TABLE_CUSTOM_PROPERTIES_GROUP,
                    })).sort((a, b) => a.label.localeCompare(b.label))
                );
                setDynamicColumnPropertyKeyOptions(
                    Array.from(columnKeySet).map(key => ({
                        label: key,
                        value: key,
                        group: COLUMN_CUSTOM_PROPERTIES_GROUP,
                    })).sort((a, b) => a.label.localeCompare(b.label))
                );
            } catch {
                setDynamicDataTablePropertyKeyOptions([]);
                setDynamicColumnPropertyKeyOptions([]);
            }
        },
        [datasource, migratedQuery.take]
    );

    const columnOptionsMap = useMemo(() => {
        return new Map(columnOptions.map(option => [option.value, option]));
    }, [columnOptions]);

    const selectedColumnIds = useMemo(() => {
        if (
            !migratedQuery.columns
            || isObservable(migratedQuery.columns)
        ) {
            return [];
        }

        return migratedQuery.columns;
    }, [migratedQuery.columns]);

    const validColumnSelections = useMemo((): Array<ComboboxOption<string>> => {
        return selectedColumnIds
            .filter(columnId => columnOptionsMap.has(columnId))
            .map(columnId => columnOptionsMap.get(columnId)!);
    }, [columnOptionsMap, selectedColumnIds]);

    const getSelectedColumnLabelForInvalidColumn = useCallback((columnId: string): string => {
        const parsedColumnIdentifier = datasource.parseColumnIdentifier(columnId);
        return `${parsedColumnIdentifier.columnName} (${parsedColumnIdentifier.transformedDataType})`;
    }, [datasource]);

    const invalidColumnSelections = useMemo((): Array<ComboboxOption<string>> => {
        return selectedColumnIds
            .filter(columnId => !columnOptionsMap.has(columnId))
            .map(columnId => ({
                label: getSelectedColumnLabelForInvalidColumn(columnId),
                value: columnId
            }));
    }, [columnOptionsMap, selectedColumnIds, getSelectedColumnLabelForInvalidColumn]);

    const selectedColumnOptions = useMemo((): Array<ComboboxOption<string>> => {
        return [...validColumnSelections, ...invalidColumnSelections];
    }, [validColumnSelections, invalidColumnSelections]);

    const invalidSelectedColumnsMessage = useMemo(() => {
        if (invalidColumnSelections.length === 0 || !isColumnOptionsInitialized) {
            return '';
        }

        const invalidColumnNames = invalidColumnSelections.map(column => column.label).join(', ');
        return invalidColumnSelections.length === 1
            ? `The following selected column is not valid: '${invalidColumnNames}'`
            : `The following selected columns are not valid: '${invalidColumnNames}'`;
    }, [invalidColumnSelections, isColumnOptionsInitialized]);

    useEffect(
        () => {
            const dataTableFilter = migratedQuery.dataTableFilter;
            const resultFilter = migratedQuery.resultFilter;
            const columnFilter = migratedQuery.columnFilter;
            const transformedFilter = {
                resultFilter: datasource.transformResultQuery(resultFilter),
                dataTableFilter: datasource.transformDataTableQuery(dataTableFilter),
                columnFilter: datasource.transformColumnQuery(columnFilter)
            };

            const filterChanged = !_.isEqual(lastFilterRef.current, transformedFilter);
            const hasRequiredFilters = datasource.hasRequiredFilters(migratedQuery);

            if (
                !isColumnOptionsInitialized
                && (!filterChanged || !hasRequiredFilters)
            ) {
                setIsColumnOptionsInitialized(true);
            }

            if (migratedQuery.type !== DataFrameQueryType.Data || !filterChanged) {
                return;
            }

            lastFilterRef.current = transformedFilter;

            if (hasRequiredFilters) {
                fetchAndSetColumnOptions(transformedFilter);
                return;
            }

            // Clear column options (except metadata fields) if filter is empty
            if (columnOptions.length > 0) {
                setColumnOptions(metadataFieldOptions);
            }
            if (xColumnOptions.length > 0) {
                setXColumnOptions([]);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            migratedQuery.type,
            migratedQuery.dataTableFilter,
            migratedQuery.resultFilter,
            migratedQuery.columnFilter,
            datasource.variablesCache,
            fetchAndSetColumnOptions,
            datasource,
        ]
    );

    useEffect(
        () => {
            if (migratedQuery.type !== DataFrameQueryType.Properties) {
                return;
            }

            const transformedFilter = {
                resultFilter: datasource.transformResultQuery(migratedQuery.resultFilter),
                dataTableFilter: datasource.transformDataTableQuery(migratedQuery.dataTableFilter),
                columnFilter: datasource.transformColumnQuery(migratedQuery.columnFilter)
            };

            fetchAndSetPropertyKeyOptions(transformedFilter);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            migratedQuery.type,
            migratedQuery.dataTableFilter,
            migratedQuery.resultFilter,
            migratedQuery.columnFilter,
            migratedQuery.take,
            datasource.variablesCache,
            fetchAndSetPropertyKeyOptions,
            datasource,
        ]
    );

    const xColumnSelection = useMemo((): {
        isInvalid: boolean;
        value: ComboboxOption<string> | string | null;
    } => {
        if (!migratedQuery.xColumn) {
            return { isInvalid: false, value: migratedQuery.xColumn };
        }
        const validXColumn = xColumnOptions.find(option => option.value === migratedQuery.xColumn);
        const value = validXColumn
            ? migratedQuery.xColumn
            : {
                label: getSelectedColumnLabelForInvalidColumn(migratedQuery.xColumn),
                value: migratedQuery.xColumn
            };
        return { isInvalid: !validXColumn && isColumnOptionsInitialized, value };
    }, [
        migratedQuery.xColumn, 
        xColumnOptions, 
        getSelectedColumnLabelForInvalidColumn, 
        isColumnOptionsInitialized
    ]);

    const handleQueryChange = useCallback(
        (query: DataFrameQueryV2, runQuery = true): void => {
            onChange(query);
            if (runQuery) {
                onRunQuery();
            }
        }, [onChange, onRunQuery]
    );

    useEffect(() => {
        const isDataTablePropertiesEmpty = migratedQuery.dataTableProperties.length === 0;
        const isColumnPropertiesEmpty = migratedQuery.columnProperties.length === 0;
        const isPropertiesEmpty = isDataTablePropertiesEmpty && isColumnPropertiesEmpty;

        if (isPropertiesEmpty !== isPropertiesNotSelected) {
            setIsPropertiesNotSelected(isPropertiesEmpty);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [migratedQuery.dataTableProperties, migratedQuery.columnProperties]);

    useEffect(() => {
        if (isObservable(migratedQuery.columns)) {
            lastValueFrom(migratedQuery.columns)
                .then(columns => {
                    handleQueryChange({ ...migratedQuery, columns });
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [migratedQuery.columns]);

    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...migratedQuery, type: queryType });
    };

    const onDataTableFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (!event) {
            return;
        }

        const dataTableFilter = (event as CustomEvent).detail.linq;
        if (dataTableFilter === migratedQuery.dataTableFilter) {
            return;
        }

        (query as DataFrameQueryV2).dataTableFilter = dataTableFilter;
        handleQueryChange({ ...migratedQuery, dataTableFilter });

    };

    const onResultFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (!event) {
            return;
        }

        const resultFilter = (event as CustomEvent).detail.linq;
        if (resultFilter === migratedQuery.resultFilter) {
            return;
        }

        (query as DataFrameQueryV2).resultFilter = resultFilter;
        handleQueryChange({ ...migratedQuery, resultFilter });
    };

    const onColumnFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (!event) {
            return;
        }

        const columnFilter = (event as CustomEvent).detail.linq;
        if (columnFilter === migratedQuery.columnFilter) {
            return;
        }

        (query as DataFrameQueryV2).columnFilter = columnFilter;
        handleQueryChange({ ...migratedQuery, columnFilter });
    };

    const onDataTablePropertiesChange = (properties: Array<ComboboxOption<string>>) => {
        const dataTableProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value);
        handleQueryChange({ ...migratedQuery, dataTableProperties: dataTableProperties as DataTableProperties[] });
    };

    const onColumnPropertiesChange = (properties: Array<ComboboxOption<string>>) => {
        const columnProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value);
        handleQueryChange({ ...migratedQuery, columnProperties: columnProperties as DataTableProperties[] });
    };

    const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const message = validateTakeValue(value, TAKE_LIMIT);

        setRecordCountInvalidMessage(message);
        handleQueryChange({ ...migratedQuery, take: value });
    };

    const onUndecimatedRecordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const message = validateTakeValue(value, UNDECIMATED_RECORDS_LIMIT);

        setUndecimatedRecordCountInvalidMessage(message);
        handleQueryChange({ ...migratedQuery, undecimatedRecordCount: value });
    };

    const onColumnsChange = (columns: Array<ComboboxOption<string>>) => {
        handleQueryChange({ ...migratedQuery, columns: columns.map(column => column.value) });
    };

    const onIncludeIndexColumnsChange = (event: React.FormEvent<HTMLInputElement>) => {
        const includeIndexColumns = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, includeIndexColumns });
    };

    const onShowUnitsChange = (event: React.FormEvent<HTMLInputElement>) => {
        const showUnits = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, showUnits });
    };

    const onFilterNullsChange = (event: React.FormEvent<HTMLInputElement>) => {
        const filterNulls = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, filterNulls });
    };

    const onDecimationMethodChange = (option: ComboboxOption<string>) => {
        handleQueryChange({ ...migratedQuery, decimationMethod: option.value });
    };

    const onXColumnChange = (option: ComboboxOption<string> | null) => {
        const xColumn = option ? option.value : null;
        handleQueryChange({ ...migratedQuery, xColumn });
    };

    const onFilterXRangeOnZoomPanChange = (event: React.FormEvent<HTMLInputElement>) => {
        const filterXRangeOnZoomPan = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, filterXRangeOnZoomPan });
    };

    function validateTakeValue(value: number, TAKE_LIMIT: number) {
        if (isNaN(value) || value <= 0) {
            return errorMessages.take.greaterOrEqualToZero;
        }
        if (value > TAKE_LIMIT) {
            return errorMessages.take.lessOrEqualToTakeLimit
                .replace(
                    '{TAKE_LIMIT}', 
                    TAKE_LIMIT.toString()
                );
        }

        return '';
    }

    const mergedDataTablePropertiesOptions = useMemo(() => [
        ...dataTablePropertiesOptions,
        ...dynamicDataTablePropertyKeyOptions,
    ], [dataTablePropertiesOptions, dynamicDataTablePropertyKeyOptions]);

    const mergedColumnPropertiesOptions = useMemo(() => [
        ...columnPropertiesOptions,
        ...dynamicColumnPropertyKeyOptions,
    ], [columnPropertiesOptions, dynamicColumnPropertyKeyOptions]);

    const decimationMethodOptions = useMemo(() => {
        if (isQueryUndecimatedDataFeatureEnabled) {
            return [decimationNoneOption, ...decimationMethods];
        }
        return decimationMethods;
    }, [isQueryUndecimatedDataFeatureEnabled]);

    return (
        <>
            <InlineField
                label={labels.queryType}
                labelWidth={INLINE_LABEL_WIDTH}
                tooltip={tooltips.queryType}
            >
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={migratedQuery.type}
                    onChange={onQueryTypeChange}
                />
            </InlineField>

            <div
                style={{ width: getValuesInPixels(SECTION_WIDTH) }}
            >
                <Collapse
                    label={labels.queryConfigurations}
                    isOpen={isQueryConfigurationSectionOpen}
                    collapsible={true}
                    onToggle={() => setIsQueryConfigurationSectionOpen(!isQueryConfigurationSectionOpen)}
                >
                    <DataFrameQueryBuilderWrapper
                        datasource={datasource}
                        resultFilter={migratedQuery.resultFilter}
                        dataTableFilter={migratedQuery.dataTableFilter}
                        columnFilter={migratedQuery.columnFilter}
                        additionalInfoMessage={infoMessage.datasourceHelp}
                        infoMessageWidth={infoMessage.width}
                        onResultFilterChange={onResultFilterChange}
                        onDataTableFilterChange={onDataTableFilterChange}
                        onColumnFilterChange={onColumnFilterChange}
                    />

                    {migratedQuery.type === DataFrameQueryType.Properties && (
                        <InlineField
                            label={labels.take}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.take}
                            invalid={!!recordCountInvalidMessage}
                            error={recordCountInvalidMessage}
                        >
                            <AutoSizeInput
                                minWidth={26}
                                maxWidth={26}
                                type="number"
                                placeholder={placeholders.take}
                                value={migratedQuery.take}
                                onBlur={onTakeChange}
                                onKeyDown={(event) => { validateNumericInput(event); }}
                            />
                        </InlineField>
                    )}

                </Collapse>
            </div >

            {migratedQuery.type === DataFrameQueryType.Data && (
                <div
                    style={{ width: getValuesInPixels(SECTION_WIDTH) }}
                >
                    <Collapse
                        label={labels.columnConfigurations}
                        isOpen={isColumnConfigurationSectionOpen}
                        collapsible={true}
                        onToggle={() => setIsColumnConfigurationSectionOpen(!isColumnConfigurationSectionOpen)}
                    >
                        <InlineField
                            label={labels.columns}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.columns}
                            shrink={true}
                            invalid={!!invalidSelectedColumnsMessage}
                            error={invalidSelectedColumnsMessage}
                        >
                            <MultiCombobox
                                placeholder={placeholders.columns}
                                width='auto'
                                minWidth={40}
                                maxWidth={40}
                                value={selectedColumnOptions}
                                onChange={onColumnsChange}
                                options={columnOptions}
                                createCustomValue={false}
                                isClearable={true}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.includeIndexColumns}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.includeIndexColumns}
                        >
                            <InlineSwitch
                                value={migratedQuery.includeIndexColumns}
                                onChange={onIncludeIndexColumnsChange}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.filterNulls}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.filterNulls}
                        >
                            <InlineSwitch
                                value={migratedQuery.filterNulls}
                                onChange={onFilterNullsChange}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.showUnits}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.showUnits}
                        >
                            <InlineSwitch
                                value={migratedQuery.showUnits}
                                onChange={onShowUnitsChange}
                            />
                        </InlineField>
                    </Collapse>

                    <Collapse
                        label={labels.decimationSettings}
                        isOpen={isDecimationSettingsSectionOpen}
                        collapsible={true}
                        onToggle={() => setIsDecimationSettingsSectionOpen(!isDecimationSettingsSectionOpen)}
                    >
                        <InlineField
                            label={labels.decimationMethod}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.decimationMethod}
                        >
                            <Combobox
                                width={INLINE_LABEL_WIDTH}
                                value={migratedQuery.decimationMethod}
                                onChange={onDecimationMethodChange}
                                options={decimationMethodOptions}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.xColumn}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.xColumn}
                            invalid={xColumnSelection.isInvalid}
                            error={xColumnSelection.isInvalid ? errorMessages.xColumnSelectionInvalid : ''}
                        >
                            <Combobox
                                placeholder={placeholders.xColumn}
                                width={INLINE_LABEL_WIDTH}
                                value={xColumnSelection.value}
                                onChange={onXColumnChange}
                                options={xColumnOptions}
                                createCustomValue={false}
                                isClearable={true}
                            />
                        </InlineField>
                        <InlineField
                            label={isHighResolutionZoomFeatureEnabled ? labels.filterXRangeOnZoomPan : labels.useTimeRange}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={isHighResolutionZoomFeatureEnabled ? tooltips.filterXRangeOnZoomPan : tooltips.useTimeRange}
                        >
                            <InlineSwitch
                                value={migratedQuery.filterXRangeOnZoomPan}
                                onChange={onFilterXRangeOnZoomPanChange}
                            />
                        </InlineField>
                        { 
                            (
                                isQueryUndecimatedDataFeatureEnabled 
                                && 
                                migratedQuery.decimationMethod === 'NONE'
                            ) && (
                                <InlineField
                                    label={labels.take}
                                    labelWidth={INLINE_LABEL_WIDTH}
                                    tooltip={tooltips.undecimatedRecordCount}
                                    invalid={!!undecimatedRecordCountInvalidMessage}
                                    error={undecimatedRecordCountInvalidMessage}
                                >
                                    <AutoSizeInput
                                        minWidth={26}
                                        maxWidth={26}
                                        type="number"
                                        placeholder={placeholders.take}
                                        value={migratedQuery.undecimatedRecordCount}
                                        onBlur={onUndecimatedRecordCountChange}
                                        onKeyDown={(event) => { validateNumericInput(event); }}
                                    />
                                </InlineField>
                            )
                        }
                    </Collapse>
                </div >
            )}

            {migratedQuery.type === DataFrameQueryType.Properties && (
                <>
                    {isPropertiesNotSelected && (
                        <Alert 
                            title='Error' 
                            severity='error' 
                            style={{ width: getValuesInPixels(VALUE_FIELD_WIDTH) }}
                        >
                            {errorMessages.propertiesNotSelected}
                        </Alert>
                    )}
                    <InlineField
                        label={labels.dataTableProperties}
                        labelWidth={INLINE_LABEL_WIDTH}
                        tooltip={tooltips.dataTableProperties}
                    >
                        <MultiCombobox
                            placeholder={placeholders.dataTableProperties}
                            width="auto"
                            minWidth={VALUE_FIELD_WIDTH}
                            maxWidth={VALUE_FIELD_WIDTH}
                            value={migratedQuery.dataTableProperties as string[]}
                            onChange={onDataTablePropertiesChange}
                            options={mergedDataTablePropertiesOptions}
                            isClearable={true}
                        />
                    </InlineField>
                    <InlineField
                        label={labels.columnProperties}
                        labelWidth={INLINE_LABEL_WIDTH}
                        tooltip={tooltips.columnProperties}
                    >
                        <MultiCombobox
                            placeholder={placeholders.columnProperties}
                            width="auto"
                            minWidth={VALUE_FIELD_WIDTH}
                            maxWidth={VALUE_FIELD_WIDTH}
                            value={migratedQuery.columnProperties as string[]}
                            onChange={onColumnPropertiesChange}
                            options={mergedColumnPropertiesOptions}
                            isClearable={true}
                        />
                    </InlineField>
                </>
            )}

            <FloatingError
                message={datasource.errorTitle}
                innerMessage={datasource.errorDescription}
                severity="warning"
            />
        </>
    );
};
