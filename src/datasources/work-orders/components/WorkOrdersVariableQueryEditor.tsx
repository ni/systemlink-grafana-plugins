import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { VerticalGroup, InlineField, Select, InlineSwitch, AutoSizeInput } from '@grafana/ui';
import React, { useCallback, useEffect, useState } from 'react';
import { OrderBy, WorkOrdersVariableQuery } from '../types';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { TAKE_LIMIT, takeErrorMessages, tooltips } from '../constants/QueryEditor.constants';
import { validateNumericInput } from 'core/utils';
import { Workspace } from 'core/types';
import { User } from 'shared/types/QueryUsers.types';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersVariableQuery>;

export function WorkOrdersVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.workspaceUtils.getWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);

  const [users, setUsers] = useState<User[] | null>(null);
  useEffect(() => {
    const loadUsers = async () => {
      const users = await datasource.usersUtils.getUsers();
      setUsers(Array.from(users.values()));
    };

    loadUsers();
  }, [datasource]);

  const handleQueryChange = useCallback(
    (query: WorkOrdersVariableQuery): void => {
      onChange(query);
    }, [onChange]
  );

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onQueryByChange = (queryBy: string) => {
    if (query.queryBy !== queryBy) {
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
    <VerticalGroup>
      <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
        <WorkOrdersQueryBuilder
          filter={query.queryBy}
          workspaces={workspaces}
          users={users}
          globalVariableOptions={datasource.globalVariableOptions()}
          onChange={(event: any) => onQueryByChange(event.detail.linq)}
        ></WorkOrdersQueryBuilder>
      </InlineField>
      <div>
        <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
          <Select
            options={[...OrderBy] as SelectableValue[]}
            placeholder="Select a field to set the query order"
            onChange={onOrderByChange}
            value={query.orderBy}
            defaultValue={query.orderBy}
            width={26}
          />
        </InlineField>
        <InlineField label="Descending" labelWidth={25} tooltip={tooltips.descending}>
          <InlineSwitch
            onChange={event => onDescendingChange(event.currentTarget.checked)}
            value={query.descending}
          />
        </InlineField>
      </div>
      <InlineField
        label="Take"
        labelWidth={25}
        tooltip={tooltips.take}
        invalid={!!recordCountInvalidMessage}
        error={recordCountInvalidMessage}
      >
        <AutoSizeInput
          minWidth={26}
          maxWidth={26}
          type="number"
          defaultValue={query.take}
          onCommitChange={onTakeChange}
          placeholder="Enter record count"
          onKeyDown={event => {
            validateNumericInput(event);
          }}
        />
      </InlineField>
    </VerticalGroup>
  );
}
