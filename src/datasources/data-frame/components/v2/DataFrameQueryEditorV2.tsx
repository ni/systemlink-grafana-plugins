import React, { useCallback, useState } from 'react';
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { AutoSizeInput, Collapse, InlineField, InlineLabel, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQuery, DataFrameQueryType, Props } from "datasources/data-frame/types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { TAKE_LIMIT } from 'datasources/data-frame/constants';

export const DataFrameQueryEditorV2: React.FC<Props> = ({ query, onChange, onRunQuery, datasource }: Props) => {
    query = datasource.processQuery(query);

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');

    const handleQueryChange = useCallback(
        (query: DataFrameQuery, runQuery = true): void => {
            onChange(query);
            if (runQuery) {
                onRunQuery();
            }
        }, [onChange, onRunQuery]
    );
    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...query, type: queryType }, false);
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
            </div>
        </>
    );
};

const labels = {
    queryType: 'Query type',
    datatableProperties: 'Data table properties',
    columnProperties: 'Column properties',
    queryConfigurations: 'Query configurations',
    queryByDatatableProperties: 'Query by data table properties',
    take: 'Take',
};
const tooltips = {
    queryType: 'This field specifies the type for the query that searches the data tables. The query can retrieve row data or metadata.',
    queryByDatatableProperties: 'This optional field applies a filter to a query while searching the data tables.',
    take: 'This field sets the maximum number of records to return from the query.',
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
