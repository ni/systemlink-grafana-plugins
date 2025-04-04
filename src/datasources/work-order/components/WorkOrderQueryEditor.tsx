import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OrderBy, OutputType, WorkOrdersQuery } from '../types';
import { Workspace } from 'core/types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { VerticalGroup, Select, InlineSwitch, AutoSizeInput, HorizontalGroup } from '@grafana/ui';
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
  const [queryType, setQueryType] = useState(query.outputType);
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


  const handleQueryTypeChange = useCallback((item: SelectableValue<OutputType>): void => {
    setQueryType(item.value!);

    if (item.value === OutputType.Data) {
      handleQueryChange({ ...query }, true);
    }
    if (item.value === OutputType.Summary) {
      handleQueryChange({ ...query }, true);
    }

  }, [query, handleQueryChange]);

  const filterOptions = useMemo(() => {
    const queryTypeOptions = [
      {
        label: OutputType.Data,
        value: OutputType.Data,
        description: 'List work orders allows you to search for work orders based on various filters.',
      },
      {
        label: OutputType.Summary,
        value: OutputType.Summary,
        description: 'Work order summary allows you to view information about all the work orders.',
      },
    ];

    return queryTypeOptions.filter(option => {
      return (option.value === queryType) ||
        (option.value === OutputType.Data) ||
        (option.value === OutputType.Summary)
    });
  }, [queryType]);

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup>
          <div>
            <InlineField label="Query type" labelWidth={18} tooltip={tooltips.output}>
              <Select
                options={filterOptions}
                onChange={handleQueryTypeChange}
                value={queryType}
                width={65}
              />
            </InlineField>
          </div>
          {queryType === OutputType.Data && (
            <>
              <InlineField label="Query By" labelWidth={18} tooltip={tooltips.queryBy}>
                <WorkOrdersQueryBuilder
                  filter={query.queryBy}
                  workspaces={workspaces}
                  partNumbers={partNumbers}
                  globalVariableOptions={datasource.globalVariableOptions()}
                  onChange={(event: any) => onParameterChange(event.detail.linq)}
                ></WorkOrdersQueryBuilder>
              </InlineField>
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
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

              </div>
            </>
          )}
          {queryType === OutputType.Summary && (
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
