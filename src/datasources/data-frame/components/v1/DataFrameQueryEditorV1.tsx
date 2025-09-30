import React, { useState } from "react";
import { FloatingError, parseErrorMessage } from "core/errors";

import { useAsync } from 'react-use';
import { SelectableValue, toOption } from "@grafana/data";

import { InlineField, InlineSwitch, MultiSelect, Select, AsyncSelect, RadioButtonGroup } from '@grafana/ui';
import { enumToOptions } from "core/utils";
import { getTemplateSrv } from "@grafana/runtime";
import { DataFrameQueryEditorCommonV1 } from "./DataFrameQueryEditorCommonV1";
import { DataFrameQueryType, Props } from "datasources/data-frame/types";
import { isValidId } from "datasources/data-frame/utils";
import { decimationMethods } from "datasources/data-frame/constants";

export const DataFrameQueryEditorV1 = (props: Props) => {
    const [errorMsg, setErrorMsg] = useState<string | undefined>('');
    const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
    const common = new DataFrameQueryEditorCommonV1(props, handleError);
    const tableProperties = useAsync(() => common.datasource.getTableProperties(common.query.tableId).catch(handleError), [common.query.tableId]);

    const handleColumnChange = (items: Array<SelectableValue<string>>) => {
        common.handleQueryChange({ ...common.query, columns: items.map(i => i.value!) }, false);
    };

    const loadColumnOptions = () => {
        const columnOptions = (tableProperties.value?.columns ?? []).map(c => toOption(c.name));
        columnOptions.unshift(...getVariableOptions());
        return columnOptions;
    }

    return (
        <div style={{ position: 'relative' }}>
            <InlineField label="Query type" tooltip={tooltips.queryType}>
                <RadioButtonGroup
                    options={enumToOptions(DataFrameQueryType)}
                    value={common.query.type}
                    onChange={value => common.handleQueryChange({ ...common.query, type: value }, true)}
                />
            </InlineField>
            <InlineField label="Id">
                <AsyncSelect
                    allowCreateWhileLoading
                    allowCustomValue
                    cacheOptions={false}
                    defaultOptions
                    isValidNewOption={isValidId}
                    loadOptions={common.handleLoadOptions}
                    onChange={common.handleIdChange}
                    placeholder="Search by name or enter id"
                    width={30}
                    value={common.query.tableId ? toOption(common.query.tableId) : null}
                />
            </InlineField>
            {common.query.type === DataFrameQueryType.Data && (
                <>
                    <InlineField label="Columns" shrink={true} tooltip={tooltips.columns}>
                        <MultiSelect
                            isLoading={tableProperties.loading}
                            options={loadColumnOptions()}
                            onChange={handleColumnChange}
                            onBlur={common.onRunQuery}
                            value={common.query.columns.map(toOption)}
                        />
                    </InlineField>
                    <InlineField label="Decimation" tooltip={tooltips.decimation}>
                        <Select
                            options={decimationMethods}
                            onChange={item => common.handleQueryChange({ ...common.query, decimationMethod: item.value! }, true)}
                            value={common.query.decimationMethod}
                        />
                    </InlineField>
                    <InlineField label="Filter nulls" tooltip={tooltips.filterNulls}>
                        <InlineSwitch
                            value={common.query.filterNulls}
                            onChange={event => common.handleQueryChange({ ...common.query, filterNulls: event.currentTarget.checked }, true)}
                        ></InlineSwitch>
                    </InlineField>
                    <InlineField label="Use time range" tooltip={tooltips.useTimeRange}>
                        <InlineSwitch
                            value={common.query.applyTimeFilters}
                            onChange={event => common.handleQueryChange({ ...common.query, applyTimeFilters: event.currentTarget.checked }, true)}
                        ></InlineSwitch>
                    </InlineField>
                </>
            )}
            <FloatingError message={errorMsg} />
        </div>
    );
};

const getVariableOptions = () => {
    return getTemplateSrv()
        .getVariables()
        .map(v => toOption('$' + v.name));
};

const tooltips = {
    queryType: `Specifies whether to visualize the data rows or properties associated with a table.`,

    columns: `Specifies the columns to include in the response data.`,

    decimation: `Specifies the method used to decimate the data.`,

    filterNulls: `Specifies whether to filter out null and NaN values before decimating the data.`,

    useTimeRange: `Specifies whether to query only for data within the dashboard time range if the
                table index is a timestamp. Enable when interacting with your data on a graph.`,
};
