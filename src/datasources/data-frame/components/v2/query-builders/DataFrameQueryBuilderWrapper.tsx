import React, { useCallback, useEffect, useState } from 'react';
import { InlineLabel } from '@grafana/ui';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { DataTableQueryBuilder } from 'datasources/data-frame/components/v2/query-builders/data-table-query-builder/DataTableQueryBuilder';
import { Workspace } from 'core/types';
import { DataTableProjections } from 'datasources/data-frame/types';
import { DataTableQueryBuilderFieldNames } from '../constants/DataTableQueryBuilder.constants';
import {
    VALUE_FIELD_WIDTH,
    labels,
    tooltips,
    DEFAULT_MARGIN_BOTTOM,
    getValuesInPixels,
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';

interface DataFrameQueryBuilderWrapperProps {
    datasource: DataFrameDataSource;
    dataTableFilter?: string;
    onDataTableFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
}

export const DataFrameQueryBuilderWrapper: React.FC<DataFrameQueryBuilderWrapperProps> = ({
    datasource,
    dataTableFilter,
    onDataTableFilterChange,
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

    useEffect(() => {
        const loadWorkspaces = async () => {
            const workspaces = await datasource.loadWorkspaces();
            setWorkspaces(Array.from(workspaces.values()));
        };

        loadWorkspaces();
    }, [datasource]);

    const dataTableNameLookupCallback = useCallback(async (query: string) => {
        const filter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
        const response = await datasource.queryTables(filter, 5, [DataTableProjections.Name]);

        if (response.length === 0) {
            return [];
        }

        const uniqueNames = new Set(response.map(table => table.name));
        return Array.from(uniqueNames).map(name => ({ label: name, value: name }));
    }, [datasource]);

    return (
        <>
            <InlineLabel
                width={VALUE_FIELD_WIDTH}
                tooltip={tooltips.queryByDataTableProperties}
            >
                {labels.queryByDataTableProperties}
            </InlineLabel>
            <div
                style={{
                    width: getValuesInPixels(VALUE_FIELD_WIDTH),
                    marginBottom: getValuesInPixels(DEFAULT_MARGIN_BOTTOM),
                }}
            >
                <DataTableQueryBuilder
                    filter={dataTableFilter}
                    workspaces={workspaces}
                    globalVariableOptions={datasource.globalVariableOptions()}
                    onChange={onDataTableFilterChange}
                    dataTableNameLookupCallback={dataTableNameLookupCallback}
                />
            </div>
        </>
    );
};
