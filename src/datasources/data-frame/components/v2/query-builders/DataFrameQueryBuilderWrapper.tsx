import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Alert, InlineLabel } from '@grafana/ui';
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
    infoMessage,
} from 'datasources/data-frame/constants/v2/DataFrameQueryEditorV2.constants';
import { ColumnsQueryBuilder } from './columns-query-builder/ColumnsQueryBuilder';
import { lastValueFrom } from 'rxjs';
import { ResultsQueryBuilder } from 'shared/components/ResultsQueryBuilder/ResultsQueryBuilder';
import { enumToOptions } from 'core/utils';
import { TestMeasurementStatus } from '../constants/ResultsQueryBuilder.constants';

interface DataFrameQueryBuilderWrapperProps {
    datasource: DataFrameDataSource;
    resultFilter?: string;
    dataTableFilter?: string;
    columnFilter?: string;
    additionalInfoMessage?: string;
    infoMessageWidth?: number;
    onResultFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
    onDataTableFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
    onColumnFilterChange?: (event?: Event | React.FormEvent<Element>) => void | Promise<void>;
}

export const DataFrameQueryBuilderWrapper: React.FC<DataFrameQueryBuilderWrapperProps> = ({
    datasource,
    resultFilter,
    dataTableFilter,
    columnFilter,
    additionalInfoMessage = '' ,
    infoMessageWidth = VALUE_FIELD_WIDTH,
    onResultFilterChange,
    onDataTableFilterChange,
    onColumnFilterChange,
}) => {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[] | null>(null);

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

    const dataTableNameLookupCallback = useCallback(async (query: string) => {
        const dataTableFilter = `${DataTableQueryBuilderFieldNames.Name}.Contains("${query}")`;
        try {
            const transformedResultFilter = resultFilter
                ? datasource.transformResultQuery(resultFilter)
                : '';
            const response = await lastValueFrom(
                datasource.queryTables$(  
                    { 
                        resultFilter: transformedResultFilter, 
                        dataTableFilter
                    },  
                    5,  
                    [DataTableProjections.Name]  
                )
            );

            if (response.length === 0) {
                return [];
            }

            const uniqueNames = new Set(response.map(table => table.name));
            return Array.from(uniqueNames).map(name => ({ label: name, value: name }));
        }
        catch {
            return [];
        }
    }, [datasource, resultFilter]);

    return (
        <>
            <div 
                style={
                    { 
                        width: getValuesInPixels(infoMessageWidth),
                    }
                }
            >
                <Alert
                    severity='info'
                    title={infoMessage.queryOptimization.title}
                >
                    {infoMessage.queryOptimization.message}{' '}
                    <a 
                        href={infoMessage.queryOptimization.linkUrl}
                        style={{ textDecoration: 'underline' }}
                        target='_blank'
                        rel='noreferrer noopener'
                    >
                        {infoMessage.queryOptimization.linkText}
                    </a>
                    {' '}{additionalInfoMessage}
                </Alert>
            </div>
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
                    filter={resultFilter}
                    workspaces={workspaces}
                    partNumbers={partNumbers}
                    status={statusOptions}
                    globalVariableOptions={datasource.globalVariableOptions()}
                    onChange={onResultFilterChange}
                />
            </div>
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
                    filter={columnFilter}
                    onChange={onColumnFilterChange}
                    disabled={!resultFilter || resultFilter.trim() === ''}
                />
            </div>
        </>
    );
};
