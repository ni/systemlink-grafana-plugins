import { Combobox, ComboboxOption, Space } from "@grafana/ui";
import { InlineField } from "core/components/InlineField";
import { FloatingError } from "core/errors";
import { INLINE_LABEL_WIDTH } from "datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants";
import { DataFrameVariableQuery, DataFrameVariableQueryType, Props } from "datasources/data-frame/types";
import React from "react";
import { DataFrameQueryBuilderWrapper } from "./query-builders/DataFrameQueryBuilderWrapper";
import { COLUMN_OPTIONS_LIMIT, TAKE_LIMIT } from "datasources/data-frame/constants";

export const DataFrameVariableQueryEditorV2: React.FC<Props> = ({ query, onChange, datasource }: Props) => {
    const migratedQuery = datasource.processVariableQuery(query as DataFrameVariableQuery);
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

    const onResultFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const resultFilter = (event as CustomEvent).detail.linq;
            onChange({ ...migratedQuery, resultFilter });
        }
    }

    const onColumnFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const columnFilter = (event as CustomEvent).detail.linq;
            onChange({ ...migratedQuery, columnFilter });
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
            <Space v={1} />
            <DataFrameQueryBuilderWrapper
                datasource={datasource}
                resultFilter={migratedQuery.resultFilter}
                dataTableFilter={migratedQuery.dataTableFilter}
                columnFilter={migratedQuery.columnFilter}
                onResultFilterChange={onResultFilterChange}
                onDataTableFilterChange={onDataTableFilterChange}
                onColumnFilterChange={onColumnFilterChange}
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
const tooltip = 'This field specifies the type for the query that searches the data tables. '
    + `The query can retrieve list of data tables up to ${TAKE_LIMIT.toLocaleString()} `
    + `or list of data table columns up to ${COLUMN_OPTIONS_LIMIT.toLocaleString()}.`;
const placeholder = 'Select query type';
