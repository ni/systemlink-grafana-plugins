import React, { useCallback, useEffect, useState } from 'react';
import { DataFrameQueryBuilderWrapper } from "./DataFrameQueryBuilderWrapper";
import { AutoSizeInput, Collapse, Combobox, ComboboxOption, InlineField, InlineSwitch, MultiCombobox, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryV2, DataFrameQueryType, PropsV2, DataTableProjectionLabelLookup, DataTableProjectionType, ValidDataFrameQueryV2, DataTableProjections, DataTableProperties } from "../../types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { decimationMethods, TAKE_LIMIT } from 'datasources/data-frame/constants';
import { SelectableValue } from '@grafana/data';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { DataTableQueryBuilderFieldNames } from './constants/DataTableQueryBuilder.constants';
import { TestMeasurementStatus } from 'datasources/results/types/types';
import {
    labels,
    tooltips,
    placeholders,
    errorMessages,
    getValuesInPixels,
    inlineLabelWidth,
    valueFieldWidth,
    sectionWidth,
} from './DataFrameQueryEditorV2.constants';

export const DataFrameQueryEditorV2: React.FC<PropsV2> = ({ query, onChange, onRunQuery, datasource }: PropsV2) => {
    const migratedQuery = datasource.processQuery(query) as ValidDataFrameQueryV2;

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [isDecimationSettingsSectionOpen, setIsDecimationSettingsSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[]>([]);
    const [status, setStatus] = useState<string[]>([]);
    const [resultIds, setResultIds] = useState<string[]>([]);
    const [hasMoreThan1000Results, setHasMoreThan1000Results] = useState(false);

    const getPropertiesOptions = (
        type: DataTableProjectionType
    ): Array<SelectableValue<DataTableProperties>> =>
        Object.entries(DataTableProjectionLabelLookup)
            .filter(([_, value]) => value.type === type)
            .map(([key, value]) => ({
                label: value.label,
                value: key as DataTableProperties
            }));

    const dataTablePropertiesOptions = getPropertiesOptions(DataTableProjectionType.DataTable);
    const columnPropertiesOptions = getPropertiesOptions(DataTableProjectionType.Column);

    const handleQueryChange = useCallback(
        (query: DataFrameQueryV2, runQuery = true): void => {
            onChange(query);
            if (runQuery) {
                onRunQuery();
            }
        }, [onChange, onRunQuery]
    );

    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...migratedQuery, type: queryType }, false);
    };

    const onDataTableFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            handleQueryChange({ ...migratedQuery, dataTableFilter: (event as CustomEvent).detail.linq }, false);
        }
    };

    const onResultsFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const newFilter = (event as CustomEvent).detail.linq;
            handleQueryChange({ ...migratedQuery, resultsFilter: newFilter }, false);
            
            // Query results to get result IDs when filter changes
            if (newFilter && newFilter.trim() !== '') {
                queryResultIds(newFilter);
            } else {
                setResultIds([]);
                setHasMoreThan1000Results(false);
            }
        }
    };

    const queryResultIds = async (filter: string) => {
        try {
            // Cast datasource to access V2 specific methods
            const dataSourceV2 = datasource as any;
            if (dataSourceV2.datasource?.queryResults) {
                const ids = await dataSourceV2.datasource.queryResults(filter);
                setResultIds(ids);
                setHasMoreThan1000Results(ids.length >= 1000);
            }
        } catch (error) {
            console.error('Error querying result IDs:', error);
            setResultIds([]);
            setHasMoreThan1000Results(false);
        }
    };

    const onColumnsFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            handleQueryChange({ ...migratedQuery, columnsFilter: (event as CustomEvent).detail.linq }, false);
        }
    };

    const onDataTablePropertiesChange = (properties: Array<SelectableValue<DataTableProperties>>) => {
        const dataTableProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value as DataTableProperties);
        handleQueryChange({ ...migratedQuery, dataTableProperties }, false);
    };

    const onColumnPropertiesChange = (properties: Array<SelectableValue<DataTableProperties>>) => {
        const columnProperties = properties
            .filter(property => property.value !== undefined)
            .map(property => property.value as DataTableProperties);
        handleQueryChange({ ...migratedQuery, columnProperties }, false);
    };

    const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const message = validateTakeValue(value, TAKE_LIMIT);

        setRecordCountInvalidMessage(message);
        handleQueryChange({ ...migratedQuery, take: value }, false);
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

    const dataTableNameLookupCallback = async (query: string) => {
        try {
            let filter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
            let substitutions: string[] | undefined;

            // If we have result IDs, combine them with the name filter
            if (resultIds.length > 0) {
                const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
                filter = `(new[] {${placeholders}}.Contains(testResultId)) && (${filter})`;
                substitutions = resultIds;
            }

            const response = await datasource.queryTables(
                filter,
                5,
                [DataTableProjections.Name],
                substitutions
            );

            if (response.length === 0) {
                return [];
            }

            const uniqueNames = new Set(response.map((table: any) => table.name));
            return Array.from(uniqueNames).map(name => ({ label: name as string, value: name as string }));
        } catch (error) {
            console.error('Error looking up data table names:', error);
            return [];
        }
    };

    useEffect(() => {
        const loadWorkspaces = async () => {
            const workspaces = await datasource.loadWorkspaces();
            setWorkspaces(Array.from(workspaces.values()));
        };

        const loadPartNumbers = async () => {
            // TODO: Implement loading part numbers from the datasource
            // For now, using empty array - this should be replaced with actual API call
            setPartNumbers([]);
        };

        const loadStatus = () => {
            // Load test measurement status from enum
            const statusOptions = enumToOptions(TestMeasurementStatus).map(option => option.value?.toString() || '');
            setStatus(statusOptions);
        };

        loadWorkspaces();
        loadPartNumbers();
        loadStatus();

        // Load result IDs if resultsFilter is already set
        if (migratedQuery.resultsFilter && migratedQuery.resultsFilter.trim() !== '') {
            queryResultIds(migratedQuery.resultsFilter);
        }
    }, [datasource]);

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
                labelWidth={inlineLabelWidth}
                tooltip={tooltips.queryType}
            >
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={migratedQuery.type}
                    onChange={onQueryTypeChange}
                />
            </InlineField>

            {migratedQuery.type === DataFrameQueryType.Properties && (
                <>
                    <InlineField
                        label={labels.dataTableProperties}
                        labelWidth={inlineLabelWidth}
                        tooltip={tooltips.dataTableProperties}
                    >
                        <MultiSelect
                            placeholder={placeholders.dataTableProperties}
                            width={valueFieldWidth}
                            value={migratedQuery.dataTableProperties}
                            onChange={onDataTablePropertiesChange}
                            options={dataTablePropertiesOptions}
                            allowCustomValue={false}
                            closeMenuOnSelect={false}
                        />
                    </InlineField>
                    <InlineField
                        label={labels.columnProperties}
                        labelWidth={inlineLabelWidth}
                        tooltip={tooltips.columnProperties}
                    >
                        <MultiSelect
                            placeholder={placeholders.columnProperties}
                            width={valueFieldWidth}
                            value={migratedQuery.columnProperties}
                            onChange={onColumnPropertiesChange}
                            options={columnPropertiesOptions}
                            allowCustomValue={false}
                            closeMenuOnSelect={false}
                        />
                    </InlineField>
                </>
            )}

            <div
                style={{ width: getValuesInPixels(sectionWidth) }}
            >
                <Collapse
                    label={labels.queryConfigurations}
                    isOpen={isQueryConfigurationSectionOpen}
                    collapsible={true}
                    onToggle={() => setIsQueryConfigurationSectionOpen(!isQueryConfigurationSectionOpen)}
                >
                    <DataFrameQueryBuilderWrapper
                        filter={migratedQuery.dataTableFilter}
                        resultsFilter={migratedQuery.resultsFilter}
                        columnsFilter={migratedQuery.columnsFilter}
                        workspaces={workspaces}
                        partNumbers={partNumbers}
                        status={status}
                        resultIds={resultIds}
                        globalVariableOptions={datasource.globalVariableOptions()}
                        onChange={onDataTableFilterChange}
                        onResultsFilterChange={onResultsFilterChange}
                        onColumnsFilterChange={onColumnsFilterChange}
                        dataTableNameLookupCallback={dataTableNameLookupCallback}
                    />

                    {hasMoreThan1000Results && (
                        <div style={{
                            padding: '8px',
                            marginTop: '8px',
                            marginBottom: '8px',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            border: '1px solid rgba(255, 152, 0, 0.5)',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            ⚠️ More than 1000 test results match your filter. Only the first 1000 most recently updated results are being used for data table filtering.
                        </div>
                    )}

                    {migratedQuery.type === DataFrameQueryType.Properties && (
                        <InlineField
                            label={labels.take}
                            labelWidth={inlineLabelWidth}
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
                    style={{ width: getValuesInPixels(sectionWidth) }}
                >
                    <Collapse
                        label={labels.columnConfigurations}
                        isOpen={isColumnConfigurationSectionOpen}
                        collapsible={true}
                        onToggle={() => setIsColumnConfigurationSectionOpen(!isColumnConfigurationSectionOpen)}
                    >
                        <InlineField
                            label={labels.columns}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.columns}
                        >
                            <MultiCombobox
                                placeholder={placeholders.columns}
                                width={inlineLabelWidth}
                                value={migratedQuery.columns}
                                onChange={onColumnsChange}
                                options={[]}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.includeIndexColumns}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.includeIndexColumns}
                        >
                            <InlineSwitch
                                value={migratedQuery.includeIndexColumns}
                                onChange={onIncludeIndexColumnsChange}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.filterNulls}
                            labelWidth={inlineLabelWidth}
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
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.decimationMethod}
                        >
                            <Combobox
                                width={inlineLabelWidth}
                                value={migratedQuery.decimationMethod}
                                onChange={onDecimationMethodChange}
                                options={decimationMethods}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.xColumn}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.xColumn}
                        >
                            <Combobox
                                placeholder={placeholders.xColumn}
                                width={inlineLabelWidth}
                                value={migratedQuery.xColumn}
                                onChange={onXColumnChange}
                                options={[]}
                                createCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.useTimeRange}
                            labelWidth={inlineLabelWidth}
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
            <FloatingError
                message={datasource.errorTitle}
                innerMessage={datasource.errorDescription}
                severity="warning"
            />
        </>
    );
};

