import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { InlineLabel } from '@grafana/ui';
import { DataFrameDataSource } from 'datasources/data-frame/DataFrameDataSource';
import { DataTableQueryBuilder } from 'datasources/data-frame/components/v2/query-builders/data-table-query-builder/DataTableQueryBuilder';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataTableProjections, TableProperties } from 'datasources/data-frame/types';
import { DataTableQueryBuilderFieldNames } from '../constants/DataTableQueryBuilder.constants';
import {
    VALUE_FIELD_WIDTH,
    labels,
    tooltips,
    DEFAULT_MARGIN_BOTTOM,
    getValuesInPixels,
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';
import { ColumnsQueryBuilder } from './columns-query-builder/ColumnsQueryBuilder';
import { ResultsQueryBuilder } from 'shared/components/ResultsQueryBuilder/ResultsQueryBuilder';
import { enumToOptions } from 'core/utils';
import { TestMeasurementStatus } from '../constants/ResultsQueryBuilder.constants';

interface DataFrameQueryBuilderWrapperProps {
    datasource: DataFrameDataSource;
    resultsFilter?: string;
    dataTableFilter?: string;
    columnsFilter?: string;
    onResultsFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
    onDataTableFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
    onColumnsFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
    onResultsLimitExceededChange?: (exceeded: boolean) => void;
}

export const DataFrameQueryBuilderWrapper: React.FC<DataFrameQueryBuilderWrapperProps> = ({
    datasource,
    resultsFilter,
    dataTableFilter,
    columnsFilter,
    onResultsFilterChange,
    onDataTableFilterChange,
    onColumnsFilterChange,
    onResultsLimitExceededChange,
}) => {
    const isQueryByResultAndColumnPropertiesEnabled = 
    datasource.instanceSettings.jsonData.featureToggles.queryByResultAndColumnProperties;
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[] | null>(null);
    const [dataTablesForResults, setDataTablesForResults] = useState<TableProperties[]>([]);
    const [isLoadingDataTables, setIsLoadingDataTables] = useState<boolean>(false);

    const statusOptions = useMemo(
        () => enumToOptions(TestMeasurementStatus).map(option => option.value as string),
        []
    );

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
            setPartNumbers(partNumbers);
        };

        loadPartNumbers();
    }, [datasource]);

    const isResultsAndColumnsFeatureEnabled = Boolean(
        datasource.instanceSettings.jsonData.featureToggles.queryByResultAndColumnProperties
    );
    const isResultsFilterActive = Boolean(resultsFilter && resultsFilter.trim());

    useEffect(() => {
        if (!isResultsAndColumnsFeatureEnabled) {
            onResultsLimitExceededChange?.(false);
            return;
        }

        let isMounted = true;

        const loadDataTablesForResults = async () => {
            if (!isResultsFilterActive) {
                if (isMounted) {
                    setDataTablesForResults([]);
                    setIsLoadingDataTables(false);
                    onResultsLimitExceededChange?.(false);
                }
                return;
            }

            setIsLoadingDataTables(true);

            try {
                const { tables, hasMore } = await datasource.getTablesForResultsFilter(resultsFilter);
                if (isMounted) {
                    setDataTablesForResults(tables);
                    onResultsLimitExceededChange?.(hasMore);
                }
            } catch (_error) {
                if (isMounted) {
                    setDataTablesForResults([]);
                    onResultsLimitExceededChange?.(false);
                }
            } finally {
                if (isMounted) {
                    setIsLoadingDataTables(false);
                }
            }
        };

        loadDataTablesForResults();

        return () => {
            isMounted = false;
        };
    }, [datasource, isResultsAndColumnsFeatureEnabled, isResultsFilterActive, onResultsLimitExceededChange, resultsFilter]);

    const dataTableIdOptions = useMemo<QueryBuilderOption[]>(() => {
        const uniqueIds = new Set<string>();

        return dataTablesForResults.reduce<QueryBuilderOption[]>((accumulator, table) => {
            if (table.id && !uniqueIds.has(table.id)) {
                uniqueIds.add(table.id);
                accumulator.push({ label: table.id, value: table.id });
            }
            return accumulator;
        }, []);
    }, [dataTablesForResults]);

    const dataTableNameOptions = useMemo<QueryBuilderOption[]>(() => {
        const uniqueNames = new Set<string>();

        return dataTablesForResults.reduce<QueryBuilderOption[]>((accumulator, table) => {
            if (table.name && !uniqueNames.has(table.name)) {
                uniqueNames.add(table.name);
                accumulator.push({ label: table.name, value: table.name });
            }
            return accumulator;
        }, []);
    }, [dataTablesForResults]);

    const isColumnsQueryBuilderDisabled = !isResultsFilterActive || isLoadingDataTables;

    const dataTableNameLookupCallback = useCallback(async (query: string) => {
        const sanitizedQuery = query?.trim().toLowerCase();

        if (isResultsAndColumnsFeatureEnabled && isResultsFilterActive) {
            if (!sanitizedQuery) {
                return dataTableNameOptions;
            }

            return dataTableNameOptions.filter(option =>
                option.label?.toLowerCase().includes(sanitizedQuery)
            );
        }

        const filter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
        const response = await datasource.queryTables(filter, 5, [DataTableProjections.Name]);

        if (response.length === 0) {
            return [];
        }

        const uniqueNames = new Set(response.map(table => table.name));
        return Array.from(uniqueNames).map(name => ({ label: name, value: name }));
    }, [
        dataTableNameOptions,
        datasource,
        isResultsAndColumnsFeatureEnabled,
        isResultsFilterActive,
    ]);

    return (
        <>
            {isQueryByResultAndColumnPropertiesEnabled && (
                <>
                    <InlineLabel
                        width={VALUE_FIELD_WIDTH}
                        tooltip={tooltips.queryByResultProperties}
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
                            filter={resultsFilter}
                            workspaces={workspaces}
                            partNumbers={partNumbers}
                            status={statusOptions}
                            globalVariableOptions={datasource.globalVariableOptions()}
                            onChange={onResultsFilterChange}
                        />
                    </div>
                </>
            )}
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
                    dataTableIdOptions={dataTableIdOptions}
                    dataTableNameOptions={dataTableNameOptions}
                />
            </div>
            {isQueryByResultAndColumnPropertiesEnabled && (
                <>
                    <InlineLabel
                        width={VALUE_FIELD_WIDTH}
                        tooltip={tooltips.queryByColumnProperties}
                    >
                        {labels.queryByColumnProperties}
                    </InlineLabel>
                    <div
                        style={{
                            width: getValuesInPixels(VALUE_FIELD_WIDTH),
                            marginBottom: getValuesInPixels(DEFAULT_MARGIN_BOTTOM),
                        }}
                    >
                        <ColumnsQueryBuilder
                            filter={columnsFilter}
                            onChange={onColumnsFilterChange}
                            disabled={isColumnsQueryBuilderDisabled}
                        />
                    </div>
                </>
            )}
        </>
    );
};
