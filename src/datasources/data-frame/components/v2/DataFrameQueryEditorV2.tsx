import { InlineField, RadioButtonGroup } from "@grafana/ui";
import { enumToOptions } from "core/utils";
import { DataFrameQuery, DataFrameQueryType } from "datasources/data-frame/types";
import React from "react";
import { Props } from "../DataFrameQueryEditorCommon";
import { CoreApp } from "@grafana/data";

export const DataFrameQueryEditorV2 = (props: Props) => {
    // TODO AB#3259790: Add `Data table properties` Query Builder

    const onRunQuery = () => {
        if (props.app !== CoreApp.Explore) {
            props.onRunQuery();
        }
    }
    const onQueryTypeChange = (value: DataFrameQuery, runQuery: boolean) => {
        props.onChange(value);
        if (runQuery) {
            onRunQuery();
        }
    };
    const query = props.datasource.processQuery(props.query);

    return (
        <InlineField label="Query type" tooltip={tooltips.queryType}>
            <RadioButtonGroup
                options={enumToOptions(DataFrameQueryType)}
                value={query.type}
                onChange={value => onQueryTypeChange({ ...query, type: value }, true)}
            />
        </InlineField>
    );
}

const tooltips = {
    queryType: `Specifies whether to visualize the data rows or properties associated with a table.`,
}