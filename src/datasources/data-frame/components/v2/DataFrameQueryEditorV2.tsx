import React, { useEffect, useCallback, useState } from "react";
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { AutoSizeInput, Collapse, InlineField, InlineLabel, InlineSwitch, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQuery, DataFrameQueryType, DataTableProjectionLabelLookup, Props } from "datasources/data-frame/types";
import { enumToOptions, validateNumericInput } from "core/utils";
import { SelectableValue } from "@grafana/data";
import { Workspace } from "core/types";
import { FloatingError } from "core/errors";
import { TAKE_LIMIT } from 'datasources/data-frame/constants';

export const DataFrameQueryEditorV2: React.FC<Props> = ({ query, onChange, onRunQuery, datasource }: Props) => {
    query = datasource.processQuery(query);

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = useState(true);
    const [isColumnConfigurationSectionOpen, setIsColumnConfigurationSectionOpen] = useState(true);
    const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
    const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);

    const propertiesOptions = Object.entries(DataTableProjectionLabelLookup)
        .map(([key, value]) => ({ label: value.label, value: key })) as SelectableValue[];

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
    const onColumnChange = (items: Array<SelectableValue<string>>) => {
        handleQueryChange({ ...query, columns: items.map(i => i.value!) }, false);
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
                <InlineField
                    label={labels.properties}
                    labelWidth={inlineLabelWidth}
                    tooltip={tooltips.properties}
                >
                    <MultiSelect
                        placeholder={placeholders.properties}
                        width={valueFieldWidth}
                        onChange={(): void => { }}
                        options={propertiesOptions}
                        allowCustomValue={false}
                        closeMenuOnSelect={false}
                    />
                </InlineField>
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
                            workspaces={workspaces}
                            globalVariableOptions={datasource.globalVariableOptions()}
                        />
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
                            <MultiSelect
                                onChange={onColumnChange}
                                options={[]}
                                allowCustomValue={false}
                            />
                        </InlineField>
                        <InlineField
                            label={labels.filterNulls}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.filterNulls}>
                            <InlineSwitch
                            />
                        </InlineField>
                        <InlineField
                            label={labels.includeIndexColumns}
                            labelWidth={inlineLabelWidth}
                            tooltip={tooltips.includeIndexColumns}>
                            <InlineSwitch
                            />
                        </InlineField>
                    </Collapse>
                </div>
            )}

            <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
        </>
    );
};

const labels = {
    queryType: 'Query type',
    properties: 'Properties',
    queryConfigurations: 'Query configurations',
    columnConfigurations: 'Column configurations',
    queryByDatatableProperties: 'Query by data table properties',
    columns: 'Columns',
    filterNulls: 'Filter nulls',
    includeIndexColumns: 'Include index columns',
    take: 'Take',
};
const tooltips = {
    queryType: 'This field specifies the query type to fetch row data or metadata associated with the data tables.',
    queryByDatatableProperties: 'This optional field applies a filter to query data tables.',
    take: 'This field sets the maximum number of records to return from the query.',
    properties: 'Specifies the properties to be queried.',
    columns: 'Specifies the columns to include in the response data.',
    filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,
    includeIndexColumns: 'Specifies whether to include index columns in the response data.'
};
const placeholders = {
    properties: 'Select properties to fetch',
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
