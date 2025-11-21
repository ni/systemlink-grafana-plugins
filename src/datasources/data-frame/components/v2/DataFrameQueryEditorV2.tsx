import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { Alert, AutoSizeInput, Collapse, Combobox, ComboboxOption, InlineField, InlineSwitch, MultiCombobox, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryV2, DataFrameQueryType, DataTableProjectionLabelLookup, DataTableProjectionType, ValidDataFrameQueryV2, DataTableProperties, Props, DataFrameDataQuery } from "../../types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { COLUMN_OPTIONS_LIMIT, decimationMethods, TAKE_LIMIT } from 'datasources/data-frame/constants';
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
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';
import { isObservable, lastValueFrom } from 'rxjs';
import _ from 'lodash';
export const DataFrameQueryEditorV2: React.FC<Props> = ({ query, onChange, onRunQuery, datasource }: Props) => {
    const migratedQuery = datasource.processQuery(query as DataFrameDataQuery) as ValidDataFrameQueryV2;

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [isDecimationSettingsSectionOpen, setIsDecimationSettingsSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
    const [columnOptions, setColumnOptions] = useState<Array<ComboboxOption<string>>>([]);
    const [isColumnLimitExceeded, setIsColumnLimitExceeded] = useState<boolean>(false);
    const [isPropertiesNotSelected, setIsPropertiesNotSelected] = useState<boolean>(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    const getPropertiesOptions = (
        type: DataTableProjectionType
    ): Array<ComboboxOption<DataTableProperties>> =>
        Object.entries(DataTableProjectionLabelLookup)
            .filter(([_, value]) => value.type === type)
            .map(([key, value]) => ({
                label: value.label,
                value: key as DataTableProperties
            }));

    const dataTablePropertiesOptions = getPropertiesOptions(DataTableProjectionType.DataTable);
    const columnPropertiesOptions = getPropertiesOptions(DataTableProjectionType.Column);

    const lastFilterRef = useRef<string>('');

    const fetchAndSetColumnOptions = useCallback(
        async (filter: string) => {
            if (!filter) {
                return;
            }

            try {
                const columnOptions = await datasource.getColumnOptionsWithVariables(filter);
                const limitedColumnOptions = columnOptions.slice(0, COLUMN_OPTIONS_LIMIT);
                setIsColumnLimitExceeded(columnOptions.length > COLUMN_OPTIONS_LIMIT);
                setColumnOptions(limitedColumnOptions);
            } catch (error) {
                setColumnOptions([]);
            }
        },
        [
            datasource
        ]
    );

    useEffect(
        () => {
            if (migratedQuery.type !== DataFrameQueryType.Data) {
                return;
            }

            const filter = migratedQuery.dataTableFilter;
            if (!filter) {
                setIsColumnLimitExceeded(false);
                setColumnOptions([]);
                return;
            }

            const transformedFilter = datasource.transformQuery(filter);
            const filterChanged = lastFilterRef.current !== transformedFilter;
            lastFilterRef.current = transformedFilter;

            if (filterChanged) {
                fetchAndSetColumnOptions(transformedFilter);
            }
        },
        [
            migratedQuery.type,
            migratedQuery.dataTableFilter,
            datasource.variablesCache,
            fetchAndSetColumnOptions,
            datasource,
        ]
    );

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

        setIsPropertiesNotSelected(isDataTablePropertiesEmpty && isColumnPropertiesEmpty);
    }, [migratedQuery.dataTableProperties, migratedQuery.columnProperties]);

    useEffect(() => {
        if (isObservable(migratedQuery.columns)) {
            lastValueFrom(migratedQuery.columns)
                .then(columns => {
                    setSelectedColumns(columns);
                    handleQueryChange({ ...migratedQuery, columns });
                });
        } else {
            if (!_.isEqual(migratedQuery.columns, selectedColumns)) {
                setSelectedColumns(migratedQuery.columns);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [migratedQuery.columns]);

    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...migratedQuery, type: queryType });
    };

    const onDataTableFilterChange = async (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const dataTableFilter = (event as CustomEvent).detail.linq;
            handleQueryChange({ ...migratedQuery, dataTableFilter });
        }
    };

    const onResultsFilterChange = async (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const resultsFilter = (event as CustomEvent).detail.linq;
            handleQueryChange({ ...migratedQuery, resultsFilter });
        }
    };

    const onColumnsFilterChange = async (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const columnsFilter = (event as CustomEvent).detail.linq;
            handleQueryChange({ ...migratedQuery, columnsFilter });
        }
    };

    const onDataTablePropertiesChange = (properties: Array<ComboboxOption<DataTableProperties>>) => {
        const dataTableProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value as DataTableProperties);
        handleQueryChange({ ...migratedQuery, dataTableProperties });
    };

    const onColumnPropertiesChange = (properties: Array<ComboboxOption<DataTableProperties>>) => {
        const columnProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value as DataTableProperties);
        handleQueryChange({ ...migratedQuery, columnProperties });
    };

    const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const message = validateTakeValue(value, TAKE_LIMIT);

        setRecordCountInvalidMessage(message);
        handleQueryChange({ ...migratedQuery, take: value });
    };

    const onColumnsChange = (columns: Array<ComboboxOption<string>>) => {
        handleQueryChange({ ...migratedQuery, columns: columns.map(column => column.value) }, false);
    };

    const onIncludeIndexColumnsChange = (event: React.FormEvent<HTMLInputElement>) => {
        const includeIndexColumns = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, includeIndexColumns }, false);
    };

    const onFilterNullsChange = (event: React.FormEvent<HTMLInputElement>) => {
        const filterNulls = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, filterNulls }, false);
    };

    const onDecimationMethodChange = (option: ComboboxOption<string>) => {
        handleQueryChange({ ...migratedQuery, decimationMethod: option.value }, false);
    };

    const onXColumnChange = (option: ComboboxOption<string>) => {
        handleQueryChange({ ...migratedQuery, xColumn: option.value }, false);
    };

    const onUseTimeRangeChange = (event: React.FormEvent<HTMLInputElement>) => {
        const applyTimeFilters = event.currentTarget.checked;
        handleQueryChange({ ...migratedQuery, applyTimeFilters }, false);
    };

    function validateTakeValue(value: number, TAKE_LIMIT: number) {
        if (isNaN(value) || value <= 0) {
            return errorMessages.take.greaterOrEqualToZero;
        }
        if (value > TAKE_LIMIT) {
            return errorMessages.take.lessOrEqualToTakeLimit;
        }

        return '';
    }

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
                    {migratedQuery.type === DataFrameQueryType.Data && (
                        <>
                            {isColumnLimitExceeded && (
                                <Alert title='Warning' severity='warning'>{errorMessages.columnLimitExceeded}</Alert>
                            )}
                        </>
                    )}
                    <DataFrameQueryBuilderWrapper
                        datasource={datasource}
                        resultsFilter={migratedQuery.resultsFilter}
                        dataTableFilter={migratedQuery.dataTableFilter}
                        columnsFilter={migratedQuery.columnsFilter}
                        onResultsFilterChange={onResultsFilterChange}
                        onDataTableFilterChange={onDataTableFilterChange}
                        onColumnsFilterChange={onColumnsFilterChange}
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
                                onChange={onTakeChange}
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
                        >
                            <MultiCombobox
                                placeholder={placeholders.columns}
                                width='auto'
                                minWidth={40}
                                maxWidth={40}
                                value={selectedColumns}
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
                                options={decimationMethods}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.xColumn}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.xColumn}
                        >
                            <Combobox
                                placeholder={placeholders.xColumn}
                                width={INLINE_LABEL_WIDTH}
                                value={migratedQuery.xColumn}
                                onChange={onXColumnChange}
                                options={[]}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.useTimeRange}
                            labelWidth={INLINE_LABEL_WIDTH}
                            tooltip={tooltips.useTimeRange}
                        >
                            <InlineSwitch
                                value={migratedQuery.applyTimeFilters}
                                onChange={onUseTimeRangeChange}
                            />
                        </InlineField>
                    </Collapse>
                </div >
            )}

            {migratedQuery.type === DataFrameQueryType.Properties && (
                <>
                    {isPropertiesNotSelected && (
                        <Alert title='Error' severity='error'>
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
                            value={migratedQuery.dataTableProperties}
                            onChange={onDataTablePropertiesChange}
                            options={dataTablePropertiesOptions}
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
                            value={migratedQuery.columnProperties}
                            onChange={onColumnPropertiesChange}
                            options={columnPropertiesOptions}
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
