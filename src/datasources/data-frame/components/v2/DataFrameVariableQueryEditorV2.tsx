import { Combobox, ComboboxOption } from "@grafana/ui";
import { InlineField } from "core/components/InlineField";
import { FloatingError } from "core/errors";
import { INLINE_LABEL_WIDTH } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";
import { DataFrameVariableQueryType, Props } from "datasources/data-frame/types";
import React from "react";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";

export const DataFrameVariableQueryEditorV2: React.FC<Props> = ({ query, onChange, datasource }: Props) => {
    const migratedQuery = datasource.processVariableQuery(query);
    const queryTypeOptions = [
        { label: 'List data tables', value: DataFrameVariableQueryType.ListDataTables },
        { label: 'List data table columns', value: DataFrameVariableQueryType.ListColumns },
    ];

    const onQueryTypeChange = (option: ComboboxOption<string>) => {
        onChange({ ...migratedQuery, queryType: option.value as DataFrameVariableQueryType });
    };

    const onDataTableFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const dataTableFilter = (event as CustomEvent).detail.linq;
            onChange({ ...migratedQuery, dataTableFilter });
        }
    };

    const onColumnsFilterChange = async (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const columnsFilter = (event as CustomEvent).detail.linq;
            onChange({ ...migratedQuery, columnsFilter });
        }
    }

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
            <DataFrameQueryBuilderWrapper
                datasource={datasource}
                dataTableFilter={migratedQuery.dataTableFilter}
                columnsFilter={migratedQuery.columnsFilter}
                onDataTableFilterChange={onDataTableFilterChange}
                onColumnsFilterChange={onColumnsFilterChange}
            />
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
