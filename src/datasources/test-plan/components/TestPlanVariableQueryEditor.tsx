import React, { useEffect, useState, useCallback } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { TestPlansQuery } from '../types';
import { Workspace } from 'core/types';
import { TestPlansQueryBuilder } from './query-builder/TestPlansQueryBuilder';
import { VerticalGroup, HorizontalGroup } from '@grafana/ui';
import './TestPlanQueryEditor.scss';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansQuery>;

export function TestPlanVariableQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
    query = datasource.prepareQuery(query);

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [partNumbers, setPartNumbers] = useState<string[]>([]);

    useEffect(() => {
        const loadWorkspaces = async () => {
            await datasource.areWorkspacesLoaded$;
            setWorkspaces(Array.from(datasource.workspacesCache.values()));
        };
        const loadPartNumbers = async () => {
            await datasource.arePartNumberLoaded$;
            setPartNumbers(Array.from(datasource.partNumbersCache.values()));
        };

        loadWorkspaces();
        loadPartNumbers();
    }, [datasource]);

    const handleQueryChange = useCallback((query: TestPlansQuery, runQuery = true): void => {
        onChange(query);
        if (runQuery) {
            onRunQuery();
        }
    }, [onChange, onRunQuery]);

    const onParameterChange = (value: string) => {
        if (query.queryBy !== value) {
            handleQueryChange({ ...query, queryBy: value });
        }
    }


    return (
        <>
            <HorizontalGroup spacing='lg' align='flex-start'>
                <VerticalGroup>
                    <>
                        <InlineField label="Query By" labelWidth={18} tooltip={tooltips.queryBy}>
                            <TestPlansQueryBuilder
                                filter={query.queryBy}
                                workspaces={workspaces}
                                partNumbers={partNumbers}
                                globalVariableOptions={datasource.globalVariableOptions()}
                                onChange={(event: any) => onParameterChange(event.detail.linq)}
                            ></TestPlansQueryBuilder>
                        </InlineField>
                    </>
                </VerticalGroup>
            </HorizontalGroup>
        </>
    );
}

const tooltips = {
    properties: "Specifies the properties to be queried.",
    recordCount: "Specifies the maximum number of workOrders to return.",
    orderBy: "Specifies the field to order the queried workOrders by.",
    descending: "Specifies whether to return the workOrders in descending order.",
    queryBy: 'Specifies the filter to be applied on the queried workOrders. This is an optional field.', output: 'Select the output type for the query',
    useTimeRange: 'Select to query using the dashboard time range for the selected field',
    useTimeRangeFor: 'Select the field to apply the dashboard time range',
};
