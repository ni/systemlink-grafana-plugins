import React from "react";
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { AutoSizeInput, Collapse, InlineField, InlineLabel, MultiSelect, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQuery, DataFrameQueryType, Props } from "datasources/data-frame/types";
import { enumToOptions } from "core/utils";

export const DataFrameQueryEditorV2 = (props: Props) => {

    const [isQueryConfigurationSectionOpen, setIsQueryConfigurationSectionOpen] = React.useState(true);
    const query = props.datasource.processQuery(props.query);

    const handleQueryChange = (value: DataFrameQuery, runQuery: boolean) => {
        props.onChange(value);
        if (runQuery) {
            props.onRunQuery();
        }
    };

    const onQueryTypeChange = (queryType: DataFrameQueryType) => {
        handleQueryChange({ ...query, type: queryType }, false);
    };

    return (
        <>
            <InlineField
                label={labels.queryType}
                labelWidth={inlinelabelWidth}
                tooltip={tooltips.queryType}
            >
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={query.type}
                    onChange={queryType => onQueryTypeChange(queryType)}
                />
            </InlineField>
            {query.type === DataFrameQueryType.Properties && (<InlineField
                label={labels.properties}
                labelWidth={inlinelabelWidth}
                tooltip={tooltips.properties}
            >
                <MultiSelect
                    placeholder={placeholders.properties}
                    width={valueFieldWidth}
                    onChange={(): void => { }}
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
                        <DataTableQueryBuilder workspaces={[]} globalVariableOptions={[]} />
                    </div>

                    {query.type === DataFrameQueryType.Properties && (
                        <InlineField
                            label={labels.take}
                            labelWidth={inlinelabelWidth}
                            tooltip={tooltips.take}
                        >
                            <AutoSizeInput
                                minWidth={26}
                                maxWidth={26}
                                type="number"
                                placeholder={placeholders.take}
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
    properties: 'Properties',
    queryConfigurations: 'Query configurations',
    queryByDatatableProperties: 'Query by data table properties',
    take: 'Take',
}
const tooltips = {
    queryType: 'Specifies whether to visualize the data rows or properties associated with a table.',
    queryByDatatableProperties: 'This field applies a filter to the query the datatables.',
    take: 'This field sets the maximum number of records to return from the query.',
    properties: 'Specifies the properties to be queried.',
}
const placeholders = {
    properties: 'Select properties to fetch',
    take: 'Enter record count'
}

const getValuesInPixels = (valueInGrafanaUnits: number) => {
    return valueInGrafanaUnits * 8 + 'px';
}

// The following values are multiples of 8 to align with Grafana's grid system, hence 25 in grafana 
// is equal to 25*8 = 200px.
const inlinelabelWidth = 25;
const valueFieldWidth = 65.5;
const inlineMarginBetweenLabelAndField = 0.5;
const defaultMarginBottom = 1;
const sectionWidth = inlinelabelWidth + valueFieldWidth + inlineMarginBetweenLabelAndField;
