import React, { useCallback, useEffect, useState } from 'react';
import { InlineField, RadioButtonGroup } from "@grafana/ui";
import { DataFrameQueryBuilderWrapper } from "./DataFrameQueryBuilderWrapper";
import { PropsV2, DataTableProjections } from "../../types";
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { DataTableQueryBuilderFieldNames } from './constants/DataTableQueryBuilder.constants';
import { enumToOptions } from 'core/utils';
import { TestMeasurementStatus } from 'datasources/results/types/types';
import {
    labels,
    tooltips,
    getValuesInPixels,
    inlineLabelWidth,
    sectionWidth,
} from './DataFrameVariableQueryEditorV2.constants';

enum VariableQueryType {
    ListDataTables = 'List data tables',
    ListDataTableColumns = 'List data table columns'
}

export const DataFrameVariableQueryEditorV2: React.FC<PropsV2> = ({ datasource }: PropsV2) => {
    const [queryType, setQueryType] = useState<VariableQueryType>(VariableQueryType.ListDataTables);
    const [dataTableFilter, setDataTableFilter] = useState<string>('');
    const [resultsFilter, setResultsFilter] = useState<string>('');
    const [columnsFilter, setColumnsFilter] = useState<string>('');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[]>([]);
    const [status, setStatus] = useState<string[]>([]);
    const [resultIds, setResultIds] = useState<string[]>([]);

    const onQueryTypeChange = (newQueryType: VariableQueryType) => {
        setQueryType(newQueryType);
    };

    const onDataTableFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            setDataTableFilter((event as CustomEvent).detail.linq);
        }
    };

    const onResultsFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            const newFilter = (event as CustomEvent).detail.linq;
            setResultsFilter(newFilter);
            
            // Query results to get result IDs when filter changes
            if (newFilter && newFilter.trim() !== '') {
                queryResultIds(newFilter);
            } else {
                setResultIds([]);
            }
        }
    };

    const onColumnsFilterChange = (event?: Event | React.FormEvent<Element>) => {
        if (event) {
            setColumnsFilter((event as CustomEvent).detail.linq);
        }
    };

    const queryResultIds = async (filter: string) => {
        try {
            // Cast datasource to access V2 specific methods
            const dataSourceV2 = datasource as any;
            if (dataSourceV2.datasource?.queryResults) {
                const ids = await dataSourceV2.datasource.queryResults(filter);
                setResultIds(ids);
            }
        } catch (error) {
            console.error('Error querying result IDs:', error);
            setResultIds([]);
        }
    };

    const dataTableNameLookupCallback = useCallback(async (query: string) => {
        try {
            let filter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
            let substitutions: string[] | undefined;

            // If we have result IDs, combine them with the name filter
            if (resultIds.length > 0) {
                const placeholders = resultIds.map((_, index) => `@${index}`).join(', ');
                filter = `(new[] {${placeholders}}.Contains(testResultId)) && (${filter})`;
                substitutions = resultIds;
            }

            const response = await datasource.queryTables(
                filter,
                5,
                [DataTableProjections.Name],
                substitutions
            );

            if (response.length === 0) {
                return [];
            }

            const uniqueNames = new Set(response.map((table: any) => table.name));
            return Array.from(uniqueNames).map(name => ({ label: name as string, value: name as string }));
        } catch (error) {
            console.error('Error looking up data table names:', error);
            return [];
        }
    }, [datasource, resultIds]);

    useEffect(() => {
        const loadWorkspaces = async () => {
            const workspaces = await datasource.loadWorkspaces();
            setWorkspaces(Array.from(workspaces.values()));
        };

        const loadPartNumbers = async () => {
            // TODO: Implement loading part numbers from the datasource
            setPartNumbers([]);
        };

        const loadStatus = () => {
            const statusOptions = enumToOptions(TestMeasurementStatus).map(option => option.value?.toString() || '');
            setStatus(statusOptions);
        };

        loadWorkspaces();
        loadPartNumbers();
        loadStatus();
    }, [datasource]);

    return (
        <>
            <InlineField
                label={labels.queryType}
                labelWidth={inlineLabelWidth}
                tooltip={tooltips.queryType}
            >
                <RadioButtonGroup
                    options={enumToOptions(VariableQueryType)}
                    value={queryType}
                    onChange={onQueryTypeChange}
                />
            </InlineField>

            <div style={{ width: getValuesInPixels(sectionWidth) }}>
                <DataFrameQueryBuilderWrapper
                    filter={dataTableFilter}
                    resultsFilter={resultsFilter}
                    columnsFilter={columnsFilter}
                    workspaces={workspaces}
                    partNumbers={partNumbers}
                    status={status}
                    resultIds={resultIds}
                    globalVariableOptions={datasource.globalVariableOptions()}
                    onChange={onDataTableFilterChange}
                    onResultsFilterChange={onResultsFilterChange}
                    onColumnsFilterChange={onColumnsFilterChange}
                    dataTableNameLookupCallback={dataTableNameLookupCallback}
                />
            </div>

            <FloatingError
                message={datasource.errorTitle}
                innerMessage={datasource.errorDescription}
                severity="warning"
            />
        </>
    );
};

