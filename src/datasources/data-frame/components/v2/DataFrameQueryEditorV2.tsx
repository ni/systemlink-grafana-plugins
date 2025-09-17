import React, { } from "react";
import { DataTableQueryBuilder } from "./query-builders/DataTableQueryBuilder";
import { Props } from "../DataFrameQueryEditorCommon";
import { AutoSizeInput, Collapse, InlineField, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQuery, DataFrameQueryType } from "datasources/data-frame/types";
import { enumToOptions } from "core/utils";

export const DataFrameQueryEditorV2 = (props: Props) => {
    // TODO AB#3259790: Add `Data table properties` Query Builder

    const [isOpen, setIsOpen] = React.useState(true);
    const query = props.datasource.processQuery(props.query);

    const onQueryTypeChange = (value: DataFrameQuery) => {
        handleQueryChange(value, false);
    };

    const handleQueryChange = (value: DataFrameQuery, runQuery: boolean) => {
        props.onChange(value);
        if (runQuery) {
            props.onRunQuery();
        }
    };

    return (
        <>
            <InlineField
                label="Query type"
                labelWidth={27}
                tooltip={tooltips.queryType}>
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={query.type}
                    onChange={value => onQueryTypeChange({ ...query, type: value })}
                />
            </InlineField>
            <Collapse
                label="Query configurations"
                isOpen={isOpen}
                collapsible={true}
                onToggle={() => setIsOpen(!isOpen)}>
                <InlineField
                    label="Query by data table propeties"
                    labelWidth={27}
                    tooltip={tooltips.queryByDatatableProperties}>
                    <DataTableQueryBuilder
                        workspaces={[]}
                        globalVariableOptions={[]}
                    />
                </InlineField>
                {query.type === DataFrameQueryType.Properties && (<InlineField
                    label="Take"
                    labelWidth={27}
                    tooltip={tooltips.take}
                >
                    <AutoSizeInput
                        minWidth={26}
                        maxWidth={26}
                        type='number'
                        placeholder="Enter record count"
                    />
                </InlineField>)}
            </Collapse >
        </>
    );
}

const tooltips = {
    queryType: 'Specifies whether to visualize the data rows or properties associated with a table.',
    queryByDatatableProperties: 'This field applies a filter to the query dataframes.',
    take: 'This field sets the maximum number of records to return from the query.',
}
