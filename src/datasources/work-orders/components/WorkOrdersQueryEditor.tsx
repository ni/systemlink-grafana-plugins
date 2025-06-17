import React, { useCallback, useEffect, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OrderBy, OutputType, WorkOrderProperties, WorkOrderPropertiesOptions, WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import {
  AutoSizeInput,
  HorizontalGroup,
  InlineField,
  InlineSwitch, MultiSelect, RadioButtonGroup,
  Select,
  VerticalGroup
} from '@grafana/ui';
import './WorkOrdersQueryEditor.scss';
import { TAKE_LIMIT, takeErrorMessages, tooltips } from '../constants/QueryEditor.constants';
import { validateNumericInput } from 'core/utils';
import { Workspace } from 'core/types';
import { User } from 'shared/types/QueryUsers.types';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);


  const [users, setUsers] = useState<User[] | null>(null);
  useEffect(() => {
    const loadUsers = async () => {
      const users = await datasource.loadUsers();
      setUsers(Array.from(users.values()));
    };

    loadUsers();
  }, [datasource]);

  const handleQueryChange = useCallback(
    (query: WorkOrdersQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    }, [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as WorkOrderPropertiesOptions) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onQueryByChange = (queryBy: string) => {
    if(query.queryBy !== queryBy) {
      query.queryBy = queryBy;
      handleQueryChange({ ...query, queryBy });
    }
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    switch (true) {
      case isNaN(value) || value < 0:
        setRecordCountInvalidMessage(takeErrorMessages.greaterOrEqualToZero);
        break;
      case value > TAKE_LIMIT:
        setRecordCountInvalidMessage(takeErrorMessages.lessOrEqualToTenThousand);
        break;
      default:
        setRecordCountInvalidMessage('');
        handleQueryChange({ ...query, take: value });
        break;
    }
  };

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
            <RadioButtonGroup
              options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onOutputTypeChange}
              value={query.outputType}
            />
          </InlineField>
          {query.outputType === OutputType.Properties && (
          <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select the properties to query"
              options={
                Object.values(WorkOrderProperties).map(workOrderProperty => ({
                  label: workOrderProperty.label,
                  value: workOrderProperty.value,
                })) as SelectableValue[]
              }
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              noMultiValueWrap={true}
              maxVisibleValues={5}
              width={65}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
          <div className="workorders-horizontal-control-group">
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
            <WorkOrdersQueryBuilder
              filter={query.queryBy}
              workspaces={workspaces} 
              users={users}
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onQueryByChange(event.detail.linq)}
            ></WorkOrdersQueryBuilder>
          </InlineField>
          {query.outputType === OutputType.Properties && (
            <div className="workorders-right-query-control">
              <VerticalGroup>
                <div>
                  <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                    <Select
                      options={OrderBy as SelectableValue[]}
                      placeholder="Select a field to set the query order"
                      onChange={onOrderByChange}
                      value={query.orderBy}
                      defaultValue={query.orderBy}
                      width={26}
                    />
                  </InlineField>
                  <InlineField label="Descending" labelWidth={18} tooltip={tooltips.descending}>
                    <InlineSwitch
                      onChange={event => onDescendingChange(event.currentTarget.checked)}
                      value={query.descending}
                    />
                  </InlineField>
                </div>
                <InlineField
                  label="Take"
                  labelWidth={18}
                  tooltip={tooltips.take}
                  invalid={!!recordCountInvalidMessage}
                  error={recordCountInvalidMessage}
                >
                  <AutoSizeInput
                    minWidth={26}
                    maxWidth={26}
                    type='number'
                    defaultValue={query.take}
                    onCommitChange={onTakeChange}
                    placeholder="Enter record count"
                    onKeyDown={(event) => { validateNumericInput(event) }}
                  />
                </InlineField>
              </VerticalGroup>
            </div>
          )}
          </div>
        </VerticalGroup>
      </HorizontalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}
