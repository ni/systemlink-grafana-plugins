import React, { useEffect, useState, useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OrderBy, OutputType, WorkOrdersQuery } from '../types';
import { Workspace } from 'core/types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { VerticalGroup, Select, InlineSwitch, AutoSizeInput, HorizontalGroup, MultiSelect, RadioButtonGroup } from '@grafana/ui';
import './WorkOrderQueryEditor.scss';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
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

    const handleQueryChange = useCallback((query: WorkOrdersQuery, runQuery = true): void => {
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

    const onOrderByChange = (item: SelectableValue<string>) => {
        handleQueryChange({ ...query, orderBy: item.value });
    };

    const onDescendingChange = (isDescendingChecked: boolean) => {
        handleQueryChange({ ...query, descending: isDescendingChecked });
    };

    const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
        const value = parseInt((event.target as HTMLInputElement).value, 10);
        handleQueryChange({ ...query, recordCount: isNaN(value) ? undefined : value });
    };

    const onOutputChange = (value: OutputType) => {
        handleQueryChange({ ...query, outputType: value });
    };

    return (
        <>
            <HorizontalGroup align='flex-start'>

                <VerticalGroup>
                    <InlineField label="Output" labelWidth={18} tooltip={tooltips.output}>
                        <RadioButtonGroup
                            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
                            value={query.outputType}
                            onChange={onOutputChange}
                        />
                    </InlineField>
                    {query.outputType === OutputType.Data && (
                        <VerticalGroup>
                            <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
                                <MultiSelect
                                    placeholder="Select properties to query"
                                    onChange={() => void 0}
                                    maxVisibleValues={5}
                                    noMultiValueWrap={true}
                                    width={65}
                                    allowCustomValue={false}
                                    closeMenuOnSelect={false}
                                />
                            </InlineField>
                            <InlineField label="Query By" labelWidth={18} tooltip={tooltips.queryBy}>
                                <WorkOrdersQueryBuilder
                                    filter={query.queryBy}
                                    workspaces={workspaces}
                                    partNumbers={partNumbers}
                                    globalVariableOptions={datasource.globalVariableOptions()}
                                    onChange={(event: any) => onParameterChange(event.detail.linq)}
                                ></WorkOrdersQueryBuilder>
                            </InlineField>
                        </VerticalGroup>
                    )}
                    {query.outputType === OutputType.TotalCount && (
                        <InlineField label="Query By" labelWidth={18} tooltip={tooltips.queryBy}>
                            <WorkOrdersQueryBuilder
                                filter={query.queryBy}
                                workspaces={workspaces}
                                partNumbers={partNumbers}
                                globalVariableOptions={datasource.globalVariableOptions()}
                                onChange={(event: any) => onParameterChange(event.detail.linq)}
                            ></WorkOrdersQueryBuilder>
                        </InlineField>
                    )}

                </VerticalGroup>
                <VerticalGroup>
                    {query.outputType === OutputType.Data && (
                        <div className="right-query-controls">
                            <div className="horizontal-control-group">
                                <InlineField label="Order By" labelWidth={18} tooltip={tooltips.orderBy}>
                                    <Select
                                        options={OrderBy as SelectableValue[]}
                                        placeholder="Select field to order by"
                                        onChange={onOrderByChange}
                                        value={query.orderBy}
                                        defaultValue={query.orderBy}
                                    />
                                </InlineField>
                                <InlineField label="Descending" tooltip={tooltips.descending}>
                                    <InlineSwitch
                                        onChange={event => onDescendingChange(event.currentTarget.checked)}
                                        value={query.descending}
                                    />
                                </InlineField>
                            </div>

                            <InlineField label="Take" labelWidth={18} tooltip={tooltips.recordCount}>
                                <AutoSizeInput
                                    minWidth={20}
                                    maxWidth={40}
                                    defaultValue={query.recordCount}
                                    onCommitChange={recordCountChange}
                                    placeholder="Enter record count"
                                />
                            </InlineField>

                        </div>)}
                </VerticalGroup>
            </HorizontalGroup >
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
