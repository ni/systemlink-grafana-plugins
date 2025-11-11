import { Combobox, ComboboxOption } from "@grafana/ui";
import { InlineField } from "core/components/InlineField";
import { FloatingError } from "core/errors";
import { INLINE_LABEL_WIDTH } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";
import { DataFrameVariableQuery, DataFrameVariableQueryType, Props } from "datasources/data-frame/types";
import React from "react";

export const DataFrameVariableQueryEditorV2: React.FC<Props> = ({ query, onChange, datasource }: Props) => {
    const migratedQuery = datasource.processVariableQuery(query);
    const queryTypeOptions = [
        { label: 'List data tables', value: DataFrameVariableQueryType.ListDataTables },
        { label: 'List data table columns', value: DataFrameVariableQueryType.ListColumns },
    ];

    const onQueryTypeChange = (option: ComboboxOption<string>) => {
        onChange({ ...migratedQuery, queryType: option.value } as DataFrameVariableQuery);
    };

    return (
        <>
            <InlineField
                label={label}
                tooltip={tooltip}
                labelWidth={INLINE_LABEL_WIDTH}
            >
                <Combobox
                    value={migratedQuery.queryType}
                    onChange={onQueryTypeChange}
                    options={queryTypeOptions}
                    placeholder={placeholder}
                    width={40} />
            </InlineField>
            {/* TODO: #3463943 - Integrate query builder wrapper to variable query editor */}
            <FloatingError
                message={datasource.errorTitle}
                innerMessage={datasource.errorDescription}
                severity="warning"
            />
        </>
    );
};

const label = 'Query type';
const tooltip = 'This field specifies the type for the query that searches the data tables. ' +
    'The query can retrieve list of data tables or list of data table columns.';
const placeholder = 'Select query type';
