import React, { useCallback, useEffect, useState } from 'react';
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { AutoSizeInput, Collapse, Combobox, ComboboxOption, InlineField, InlineLabel, InlineSwitch, MultiCombobox, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryV2, DataFrameQueryType, PropsV2, DataTableProjectionLabelLookup, DataTableProjectionType, ValidDataFrameQueryV2, DataTableProjections } from "../../types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { decimationMethods, TAKE_LIMIT } from 'datasources/data-frame/constants';
import { SelectableValue } from '@grafana/data';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { DataTableQueryBuilderFieldNames } from './constants/DataTableQueryBuilder.constants';

export const DataFrameQueryEditorV2: React.FC<PropsV2> = ({ query, onChange, onRunQuery, datasource }: PropsV2) => {
    const migratedQuery = datasource.processQuery(query) as ValidDataFrameQueryV2;

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [isDecimationSettingsSectionOpen, setIsDecimationSettingsSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [columnOptions, setColumnOptions] = useState<Array<ComboboxOption<string>>>([]);

    const getPropertiesOptions = (type: DataTableProjectionType): Array<SelectableValue<DataTableProjections>> =>
        Object.entries(DataTableProjectionLabelLookup)
            .filter(([_, value]) => value.type === type)
            .map(([_, value]) => ({ label: value.label, value: value.projection }));

    const datatablePropertiesOptions = getPropertiesOptions(DataTableProjectionType.DataTable);
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

    const fetchAndSetColumnOptions = async (filter: string) => {
      if (filter !== '') {
        try {
          const tables = await datasource.queryTables(filter, TAKE_LIMIT, [
            DataTableProjections.Name,
            DataTableProjections.ColumnName,
            DataTableProjections.ColumnDataType,
            DataTableProjections.ColumnType,
          ]);
          const columnsSet = new Set<string>();
          tables.forEach(table => {
            table.columns?.forEach((col: { name?: string }) => {
              if (col?.name) {
                columnsSet.add(col.name);
              }
            });
          });
          setColumnOptions(Array.from(columnsSet).map(name => ({ label: name, value: name })));
        } catch (error) {
          setColumnOptions([]);
        }
      }
    };

    const onDataTableFilterChange = async (event: any) => {
      const filter = event.detail.linq;
      handleQueryChange({ ...migratedQuery, dataTableFilter: filter }, false);
      await fetchAndSetColumnOptions(filter);
    };

    const onDataTablePropertiesChange = (properties: Array<SelectableValue<DataTableProjections>>) => {
        const dataTableProperties = properties.map(property => property.value) as DataTableProjections[];
        handleQueryChange({ ...migratedQuery, dataTableProperties }, false);
    };

    const onColumnPropertiesChange = (properties: Array<SelectableValue<DataTableProjections>>) => {
        const columnProperties = properties.map(property => property.value) as DataTableProjections[];
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
        const filter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
        const response = await datasource.queryTables(filter, 5, [DataTableProjections.Name]);

        if (response.length === 0) {
            return [];
        }

        const uniqueNames = new Set(response.map(table => table.name));
        return Array.from(uniqueNames).map(name => ({ label: name, value: name }));
    };

    useEffect(() => {
        const loadWorkspaces = async () => {
            const workspaces = await datasource.loadWorkspaces();
            setWorkspaces(Array.from(workspaces.values()));
        };

        loadWorkspaces();
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
                        label={labels.datatableProperties}
                        labelWidth={inlineLabelWidth}
                        tooltip={tooltips.datatableProperties}
                    >
                        <MultiSelect
                            placeholder={placeholders.datatableProperties}
                            width={valueFieldWidth}
                            value={migratedQuery.dataTableProperties}
                            onChange={onDataTablePropertiesChange}
                            options={datatablePropertiesOptions}
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
                    <InlineLabel
                        width={valueFieldWidth}
                        tooltip={tooltips.queryByDatatableProperties}
                    >
                        {labels.queryByDatatableProperties}
                    </InlineLabel>
                    <div style={{
                        width: getValuesInPixels(valueFieldWidth),
                        marginBottom: getValuesInPixels(defaultMarginBottom)
                    }}>
                        <DataTableQueryBuilder
                            filter={migratedQuery.dataTableFilter}
                            workspaces={workspaces}
                            globalVariableOptions={datasource.globalVariableOptions()}
                            onChange={onDataTableFilterChange}
                            dataTableNameLookupCallback={dataTableNameLookupCallback}
                        />
                    </div>

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
                                width={40}
                                value={migratedQuery.columns}
                                onChange={onColumnsChange}
                                options={columnOptions}
                                createCustomValue={false}
                                isClearable={true}
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

const labels = {
    queryType: 'Query type',
    datatableProperties: 'Data table properties',
    columnProperties: 'Column properties',
    queryConfigurations: 'Query configurations',
    columnConfigurations: 'Column configurations',
    decimationSettings: 'Decimation settings',
    queryByDatatableProperties: 'Query by data table properties',
    columns: 'Columns',
    filterNulls: 'Filter nulls',
    includeIndexColumns: 'Include index columns',
    decimationMethod: 'Decimation method',
    xColumn: 'X-column',
    useTimeRange: 'Use time range',
    take: 'Take',
};
const tooltips = {
    queryType: 'This field specifies the type for the query that searches the data tables. The query can retrieve row data or metadata.',
    queryByDatatableProperties: 'This optional field applies a filter to a query while searching the data tables.',
    take: 'This field sets the maximum number of records to return from the query.',
    columns: 'Specifies the columns to include in the response data.',
    filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,
    includeIndexColumns: 'Specifies whether to include index columns in the response data.',
    datatableProperties: 'This field specifies the data table properties to be queried.',
    columnProperties: 'This field specifies the column properties to be queried.',
    decimationMethod: 'Specifies the method used to decimate the data.',
    xColumn: 'Specifies the column to use for the x-axis when decimating the data.',
    useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};
const placeholders = {
    datatableProperties: 'Select data table properties to fetch',
    columnProperties: 'Select column properties to fetch',
    take: 'Enter record count',
    columns: 'Select columns',
    xColumn: 'Select x-column',
};

const errorMessages = {
    take: {
        greaterOrEqualToZero: 'The take value must be greater than or equal to 0.',
        lessOrEqualToTakeLimit: `The take value must be less than or equal to ${TAKE_LIMIT}.`
    }
};

const getValuesInPixels = (valueInGrafanaUnits: number) => {
    return valueInGrafanaUnits * 8 + 'px';
};

// The following values are multiples of 8 to align with Grafana's grid system, hence 25 in grafana 
// is equal to 25*8 = 200px.
const inlineLabelWidth = 25;
const valueFieldWidth = 65.5;
const inlineMarginBetweenLabelAndField = 0.5;
const defaultMarginBottom = 1;
const sectionWidth = inlineLabelWidth + valueFieldWidth + inlineMarginBetweenLabelAndField;
