import React, { useCallback, useState } from 'react';
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { AutoSizeInput, Collapse, ComboboxOption, InlineField, InlineLabel, InlineSwitch, MultiCombobox, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryV1, DataFrameQueryType, PropsV1 } from "../../types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { TAKE_LIMIT } from 'datasources/data-frame/constants';
import { SelectableValue } from '@grafana/data';

export const DataFrameQueryEditorV2: React.FC<PropsV1> = ({ query, onChange, onRunQuery, datasource }: PropsV1) => {
    query = datasource.processQuery(query);

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');

    const handleQueryChange = useCallback(
        (query: DataFrameQueryV1, runQuery = true): void => {
            onChange(query);
            if (runQuery) {
                onRunQuery();
            }
        }, [onChange, onRunQuery]
    );

    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...query, type: queryType }, false);
    };

    const onColumnsChange = (columns: ComboboxOption<string>[]) => {
        handleQueryChange({ ...query, columns: columns.map(i => i.value) }, false);
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

    function onTakeChange(event: React.FormEvent<HTMLInputElement>) {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        const message = validateTakeValue(value, TAKE_LIMIT);

        setRecordCountInvalidMessage(message);
    };

    return (
        <>
            <InlineField
                label={labels.queryType}
                labelWidth={inlineLabelWidth}
                tooltip={tooltips.queryType}
            >
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={query.type}
                    onChange={onQueryTypeChange}
                />
            </InlineField>

            {query.type === DataFrameQueryType.Properties && (
                <>
                    <InlineField
                        label={labels.datatableProperties}
                        labelWidth={inlineLabelWidth}
                        tooltip={tooltips.datatableProperties}
                    >
                        <MultiSelect
                            placeholder={placeholders.datatableProperties}
                            width={valueFieldWidth}
                            onChange={(): void => { }}
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
                            onChange={(): void => { }}
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
                        <DataTableQueryBuilder workspaces={[]} globalVariableOptions={[]} />
                    </div>

                    {query.type === DataFrameQueryType.Properties && (
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
                                onChange={onTakeChange}
                                onKeyDown={(event) => { validateNumericInput(event); }}
                            />
                        </InlineField>
                    )}

                </Collapse>
            </div >

            {query.type === DataFrameQueryType.Data && (
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
                            />
                        </InlineField>
                        <InlineField
                            label={labels.filterNulls}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.filterNulls}
                        >
                            <InlineSwitch
                            />
                        </InlineField>
                    </Collapse>
                </div>
            )}
        </>
    );
};

const labels = {
    queryType: 'Query type',
    datatableProperties: 'Data table properties',
    columnProperties: 'Column properties',
    queryConfigurations: 'Query configurations',
    columnConfigurations: 'Column configurations',
    queryByDatatableProperties: 'Query by data table properties',
    columns: 'Columns',
    filterNulls: 'Filter nulls',
    includeIndexColumns: 'Include index columns',
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
};
const placeholders = {
    datatableProperties: 'Select data table properties to fetch',
    columnProperties: 'Select column properties to fetch',
    take: 'Enter record count'
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