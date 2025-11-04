import React, { useEffect } from 'react';
import { InlineField } from '@grafana/ui';
import { DataTableQueryBuilder } from './query-builders/DataTableQueryBuilder';
import { ColumnsQueryBuilder } from './query-builders/ColumnsQueryBuilder';
import { ResultsQueryBuilder } from 'shared/components/ResultsQueryBuilder/ResultsQueryBuilder';
import { Workspace, QueryBuilderOption } from 'core/types';
import { DataSourceQBLookupCallback } from '../../types';
import { labels, tooltips, defaultLabelWidth, defaultValueWidth } from './DataFrameQueryBuilderWrapper.constants';

interface DataFrameQueryBuilderWrapperProps {
    filter: string;
    resultsFilter?: string;
    columnsFilter?: string;
    workspaces: Workspace[];
    partNumbers?: string[];
    status?: string[];
    resultIds?: string[];
    globalVariableOptions: QueryBuilderOption[];
    onChange: (event?: Event | React.FormEvent<Element>) => void;
    onResultsFilterChange?: (event?: Event | React.FormEvent<Element>) => void;
    onColumnsFilterChange?: (event?: Event | React.FormEvent<Element>) => void;
    dataTableNameLookupCallback: DataSourceQBLookupCallback;
}

/**
 * DataFrameQueryBuilderWrapper - Wraps and coordinates three interdependent query builders:
 * 
 * 1. ResultsQueryBuilder - filters by test result properties
 * 2. DataTableQueryBuilder - filters by data table properties (enhanced with result IDs from results filter)
 * 3. ColumnsQueryBuilder - filters by column properties (enabled only when results filter is active)
 * 
 * Responsibilities:
 * - Manages the layout and presentation of the three query builders
 * - Coordinates interdependencies (e.g., passing resultIds to DataTableQueryBuilder)
 * - Enforces business rules (e.g., disabling columns filter when no results filter exists)
 * - Automatically clears columns filter when results filter is removed
 */
export const DataFrameQueryBuilderWrapper: React.FC<DataFrameQueryBuilderWrapperProps> = ({
    filter,
    resultsFilter,
    columnsFilter,
    workspaces,
    partNumbers = [],
    status = [],
    resultIds = [],
    globalVariableOptions,
    onChange,
    onResultsFilterChange,
    onColumnsFilterChange,
    dataTableNameLookupCallback,
}) => {
    // Determine if columns query builder should be enabled based on results filter
    const isResultsFilterValid = resultsFilter && resultsFilter.trim() !== '';
    const isColumnsQueryBuilderDisabled = !isResultsFilterValid;

    // Automatically clear columns filter when results filter is cleared
    useEffect(() => {
        if (!isResultsFilterValid && columnsFilter && onColumnsFilterChange) {
            const clearEvent = new CustomEvent('change', {
                detail: { linq: '' }
            });
            onColumnsFilterChange(clearEvent);
        }
    }, [isResultsFilterValid, columnsFilter, onColumnsFilterChange]);

    return (
        <>
            <InlineField
                label={labels.queryByResultsProperties}
                labelWidth={defaultLabelWidth}
                tooltip={tooltips.queryByResultsProperties}
            >
                <div style={{ width: `${defaultValueWidth * 8}px` }}>
                    <ResultsQueryBuilder
                        filter={resultsFilter}
                        workspaces={workspaces}
                        status={status}
                        partNumbers={partNumbers}
                        globalVariableOptions={globalVariableOptions}
                        onChange={onResultsFilterChange}
                    />
                </div>
            </InlineField>

            <InlineField
                label={labels.queryByDataTableProperties}
                labelWidth={defaultLabelWidth}
                tooltip={tooltips.queryByDataTableProperties}
            >
                <div style={{ width: `${defaultValueWidth * 8}px` }}>
                    <DataTableQueryBuilder
                        filter={filter}
                        workspaces={workspaces}
                        globalVariableOptions={globalVariableOptions}
                        onChange={onChange}
                        dataTableNameLookupCallback={dataTableNameLookupCallback}
                        resultIds={resultIds}
                    />
                </div>
            </InlineField>

            <InlineField
                label={labels.queryByColumnProperties}
                labelWidth={defaultLabelWidth}
                tooltip={tooltips.queryByColumnProperties}
            >
                <div style={{ width: `${defaultValueWidth * 8}px` }}>
                    <ColumnsQueryBuilder
                        filter={columnsFilter}
                        globalVariableOptions={globalVariableOptions}
                        onChange={onColumnsFilterChange}
                        disabled={isColumnsQueryBuilderDisabled}
                    />
                </div>
            </InlineField>
        </>
    );
};

