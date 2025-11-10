import React, { useCallback, useEffect, useState } from 'react';
import { InlineLabel } from '@grafana/ui';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { DataTableQueryBuilder } from 'datasources/data-frame/components/v2/query-builders/DataTableQueryBuilder/DataTableQueryBuilder';
import { Workspace } from 'core/types';
import { DataTableProjections } from 'datasources/data-frame/types';
import { DataTableQueryBuilderFieldNames } from '../../constants/DataTableQueryBuilder.constants';
import {
  VALUE_FIELD_WIDTH,
  labels,
  tooltips,
  DEFAULT_MARGIN_BOTTOM,
  getValuesInPixels,
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';
import { ResultsQueryBuilder } from 'shared/components/ResultsQueryBuilder/ResultsQueryBuilder';
import { enumToOptions } from 'core/utils';
import { TestMeasurementStatus } from '../../constants/ResultsQueryBuilder.constants';

interface WrapperProps {
    datasource: DataFrameDataSource;
    dataTableFilter?: string;
    resultsFilter?: string;
    onDataTableFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
}

export const DataFrameQueryBuilderWrapper: React.FC<WrapperProps> = ({
    datasource,
    dataTableFilter,
    resultsFilter,
    onDataTableFilterChange,
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[]>([]);

    useEffect(() => {
        const loadWorkspaces = async () => {
            const workspaces = await datasource.loadWorkspaces();
            setWorkspaces(Array.from(workspaces.values()));
        };

        loadWorkspaces();
    }, [datasource]);
  
    useEffect(() => {
        const loadPartNumbers = async () => {
            const partNumbers = await datasource.loadPartNumbers();
            setPartNumbers(Array.from(partNumbers.values()));
        };

        loadPartNumbers();
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
                tooltip={tooltips.queryByResultProperties}
                data-testid="results-query-builder-label"
            >
                {labels.queryByResultProperties}
            </InlineLabel>
            <div
                style={{
                    width: getValuesInPixels(VALUE_FIELD_WIDTH),
                    marginBottom: getValuesInPixels(DEFAULT_MARGIN_BOTTOM),
                }}
            >
                <ResultsQueryBuilder
                    filter={ resultsFilter }
                    workspaces={ workspaces }
                    globalVariableOptions={ datasource.globalVariableOptions() }
                    partNumbers={ partNumbers } 
                    status={ enumToOptions(TestMeasurementStatus).map(option => option.value as string) } 
                    onChange={()=>{}}               
                />
            </div>
            <InlineLabel
                width={VALUE_FIELD_WIDTH}
                tooltip={tooltips.queryByDataTableProperties}
                data-testid="data-frame-query-builder-label"
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
