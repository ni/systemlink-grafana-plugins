import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { ALL_WORK_ITEM_TYPES_VALUE, OrderBy, WorkItemsVariableQuery } from '../types';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { AutoSizeInput, Combobox, ComboboxOption, InlineField, InlineSwitch, MultiCombobox, Stack } from '@grafana/ui';
import { TAKE_LIMIT, takeErrorMessages, tooltips } from '../constants/QueryEditor.constants';
import { validateNumericInput } from 'core/utils';
import { Workspace } from 'core/types';
import { User } from 'shared/types/QueryUsers.types';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsVariableQuery>;

const ORDER_BY_OPTIONS = OrderBy as Array<ComboboxOption<string>>;
const ALL_TYPES_OPTION: ComboboxOption<string> = { label: 'All', value: ALL_WORK_ITEM_TYPES_VALUE };

const toStringValues = (items: Array<ComboboxOption<string>>): string[] =>
  items.map(item => item.value).filter((value): value is string => value !== undefined);

const toSelectedOptions = (selectedValues: string[], options: Array<ComboboxOption<string>>): Array<ComboboxOption<string>> => {
  const optionsByValue = new Map(options.map(option => [option.value, option]));
  return selectedValues.map(value => optionsByValue.get(value) ?? { label: value, value });
};

export function WorkItemsVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');
  const [isTypesValid, setIsTypesValid] = useState<boolean>(true);

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [workItemTypes, setWorkItemTypes] = useState<Array<ComboboxOption<string>> | null>(null);
  const lastUsedFilter = useRef(query.queryBy);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const ws = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(ws.values()));
    };
    loadWorkspaces();
  }, [datasource]);

  useEffect(() => {
    const loadUsers = async () => {
      const us = await datasource.loadUsers();
      setUsers(Array.from(us.values()));
    };
    loadUsers();
  }, [datasource]);

  useEffect(() => {
    const loadTypes = async () => {
      const types = await datasource.loadWorkItemTypes();
      setWorkItemTypes(
        types.map(type => ({
          label: type.label,
          value: type.value as string,
        }))
      );
    };
    loadTypes();
  }, [datasource]);

  const handleQueryChange = useCallback(
    (updated: WorkItemsVariableQuery): void => {
      onChange(updated);
    },
    [onChange]
  );

  const onOrderByChange = (item: ComboboxOption<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onWorkItemTypesChange = (items: Array<ComboboxOption<string>>) => {
    if (items.length === 0) {
      setIsTypesValid(false);
      handleQueryChange({ ...query, workItemTypes: [] });
      return;
    }
    setIsTypesValid(true);

    const selectedValues = toStringValues(items);
    const lastSelected = selectedValues[selectedValues.length - 1];

    if (lastSelected === ALL_WORK_ITEM_TYPES_VALUE) {
      handleQueryChange({ ...query, workItemTypes: [ALL_WORK_ITEM_TYPES_VALUE] });
      return;
    }

    handleQueryChange({ ...query, workItemTypes: selectedValues.filter(value => value !== ALL_WORK_ITEM_TYPES_VALUE) });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onQueryByChange = (queryBy: string) => {
    if (query.queryBy !== queryBy && lastUsedFilter.current !== queryBy) {
      lastUsedFilter.current = queryBy;
      handleQueryChange({ ...query, queryBy });
    }
  };

  const validateTakeValue = (value: number) => {
    if (isNaN(value) || value < 0) {
      return { message: takeErrorMessages.greaterOrEqualToZero, take: value };
    }
    if (value > TAKE_LIMIT) {
      return { message: takeErrorMessages.lessOrEqualToTenThousand, take: value };
    }
    return { message: '', take: value };
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    const { message, take } = validateTakeValue(value);

    setTakeInvalidMessage(message);
    handleQueryChange({ ...query, take });
  };

  const typeOptions: Array<ComboboxOption<string>> = [
    ALL_TYPES_OPTION,
    ...datasource.globalVariableOptions().map(option => ({
      label: option.label,
      value: option.value as string,
    })),
    ...(workItemTypes ?? []),
  ];

  const selectedTypeOptions = toSelectedOptions(
    query.workItemTypes ?? [ALL_WORK_ITEM_TYPES_VALUE],
    typeOptions
  );

  return (
    <>
      <Stack direction="column">
        <InlineField
          label="Type"
          labelWidth={25}
          tooltip={tooltips.type}
          invalid={!isTypesValid}
          error={!isTypesValid ? 'Select at least one type' : undefined}
        >
          <MultiCombobox
            options={typeOptions}
            value={selectedTypeOptions}
            onChange={onWorkItemTypesChange}
            width="auto"
            minWidth={65}
            maxWidth={65}
            placeholder="Select work item types"
            createCustomValue={true}
            isClearable={true}
          />
        </InlineField>
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
          <WorkItemsQueryBuilder
            filter={query.queryBy}
            workspaces={workspaces}
            users={users}
            workItemTypes={workItemTypes}
            globalVariableOptions={datasource.globalVariableOptions()}
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
          />
        </InlineField>
        <div>
          <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
            <Combobox
              options={ORDER_BY_OPTIONS}
              placeholder="Select a field to set the query order"
              onChange={onOrderByChange}
              value={query.orderBy}
              width={26}
              createCustomValue={false}
            />
          </InlineField>
          <InlineField label="Descending" labelWidth={25} tooltip={tooltips.descending}>
            <InlineSwitch
              onChange={event => onDescendingChange(event.currentTarget.checked)}
              value={query.descending}
            />
          </InlineField>
          <InlineField
            label="Take"
            labelWidth={25}
            tooltip={tooltips.take}
            invalid={!!takeInvalidMessage}
            error={takeInvalidMessage}
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
        </div>
      </Stack>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}
