import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, Combobox, ComboboxOption, InlineSwitch, MultiCombobox, Stack } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { FloatingError } from 'core/errors';
import { QueryBuilderOption, Workspace } from 'core/types';
import { validateNumericInput } from 'core/utils';
import { User } from 'shared/types/QueryUsers.types';
import { ProductPartNumberAndName } from 'shared/types/QueryProducts.types';
import { SystemAlias } from 'shared/types/QuerySystems.types';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  OrderByOptions,
  WorkItemsQuery,
  WorkItemsVariableQuery,
  WorkItemsVariableQueryType,
} from '../types';
import {
  COMBOBOX_WIDTH,
  CONTROL_WIDTH,
  LABEL_WIDTH,
  OrderBy,
  WorkItemTypes,
  labels,
  placeholders,
  tooltips,
  typesErrorMessages,
} from '../constants/QueryEditor.constants';
import { getTakeError, isTypesNonEmpty } from '../utils';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { ALL_WORK_ITEM_TYPES_VALUE, WORK_ITEM_TYPE_FILTER_VALUES } from '../constants';

type Props = Omit<QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>, 'query' | 'onChange'> & {
  query: WorkItemsVariableQuery;
  onChange: (query: WorkItemsVariableQuery) => void;
};
const ALL_TYPES_OPTION: ComboboxOption<string> = { label: 'All', value: ALL_WORK_ITEM_TYPES_VALUE };
const LEGACY_TYPE_OPTIONS: Array<ComboboxOption<string>> = WorkItemTypes.map(({ label, value }) => ({
  label,
  value: WORK_ITEM_TYPE_FILTER_VALUES[value],
}));

const dedupeOptionsByValue = (options: Array<ComboboxOption<string>>): Array<ComboboxOption<string>> =>
  Array.from(new Map(options.map(option => [option.value, option])).values());

export function WorkItemsVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareVariableQuery(query);

  const isTypesValid = isTypesNonEmpty(query.types);
  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';

  const queryTypeOptions = Object.values(WorkItemsVariableQueryType)
    .map(value => ({
      label: value,
      value
    }));

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [products, setProducts] = useState<ProductPartNumberAndName[] | null>(null);
  const [systemAliases, setSystemAliases] = useState<SystemAlias[] | null>(null);
  const [workItemTypes, setWorkItemTypes] = useState<QueryBuilderOption[] | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    const loadUsers = async () => {
      const users = await datasource.loadUsers();
      setUsers(Array.from(users.values()));
    };

    const loadProducts = async () => {
      const products = await datasource.loadProductNamesAndPartNumbers();
      setProducts(Array.from(products.values()));
    };

    const loadSystemAliases = async () => {
      const systemAliases = await datasource.loadSystemAliases();
      setSystemAliases(Array.from(systemAliases.values()));
    };

    const loadWorkItemTypes = async () => {
      const workItemTypes = await datasource.loadWorkItemTypes();
      setWorkItemTypes(workItemTypes.map(type => ({
        label: type.label ?? type.value ?? '',
        value: type.value ?? '',
      })));
    };

    loadWorkspaces();
    loadUsers();
    loadProducts();
    loadSystemAliases();
    loadWorkItemTypes();
  }, [datasource]);

  const globalVariableOptions = useMemo(
    () => datasource.globalVariableOptions(),
    [datasource]
  );

  const typeOptions = useMemo(
    () => dedupeOptionsByValue([ALL_TYPES_OPTION, ...globalVariableOptions, ...LEGACY_TYPE_OPTIONS, ...(workItemTypes ?? [])]),
    [globalVariableOptions, workItemTypes]
  );

  const handleQueryChange = useCallback(
    (query: WorkItemsVariableQuery): void => {
      onChange(query);
    },
    [onChange]
  );

  const onQueryTypeChange = (option: ComboboxOption<WorkItemsVariableQueryType>) => {
    handleQueryChange({ ...query, queryType: option.value });
  };

  const onTypesChange = (items: Array<ComboboxOption<string>>) => {
    const selectedValues = items.map(item => item.value)
      .filter((value): value is string => Boolean(value));
    const lastSelected = selectedValues[selectedValues.length - 1];
    const types = lastSelected === ALL_WORK_ITEM_TYPES_VALUE
      ? [ALL_WORK_ITEM_TYPES_VALUE]
      : selectedValues.filter(value => value !== ALL_WORK_ITEM_TYPES_VALUE);
    handleQueryChange({ ...query, types });
  };

  const onFilterChange = (event: any) => {
    if (query.filter !== event.detail.linq) {
      handleQueryChange({ ...query, filter: event.detail.linq });
    }
  };

  const onOrderByChange = (item: SelectableValue<OrderByOptions>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, take: value });
  };

  return (
    <>
      <Stack direction="column">
        <InlineField 
          label={labels.queryType}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.queryType}
        >
          <Combobox
            options={queryTypeOptions}
            value={query.queryType}
            onChange={onQueryTypeChange}
            width={COMBOBOX_WIDTH}
          />
        </InlineField>
        {query.queryType === WorkItemsVariableQueryType.ListWorkItems && (
          <>
            <InlineField
              label={labels.types}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.types}
              invalid={!isTypesValid}
              error={typesErrorMessages.atLeastOneRequired}
            >
              <MultiCombobox
                placeholder={placeholders.types}
                options={typeOptions}
                value={query.types}
                onChange={onTypesChange}
                enableAllOption
                width="auto"
                minWidth={CONTROL_WIDTH}
                maxWidth={CONTROL_WIDTH}
              />
            </InlineField>
            <InlineField 
              label={labels.queryBy}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.filter}
            >
              <WorkItemsQueryBuilder
                filter={query.filter}
                workspaces={workspaces}
                users={users}
                products={products}
                systemAliases={systemAliases}
                workItemTypes={workItemTypes}
                globalVariableOptions={globalVariableOptions}
                onChange={onFilterChange}
              />
            </InlineField>
            <InlineField
              label={labels.orderBy}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.orderBy}
            >
              <Combobox
                options={OrderBy}
                placeholder={placeholders.orderBy}
                onChange={onOrderByChange}
                value={query.orderBy}
                width={COMBOBOX_WIDTH}
              />
            </InlineField>
            <InlineField
              label={labels.descending}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.descending}
            >
              <InlineSwitch
                onChange={event => onDescendingChange(event.currentTarget.checked)}
                value={query.descending}
              />
            </InlineField>
            <InlineField
              label={labels.take}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.take}
              invalid={!isTakeValid}
              error={takeInvalidMessage}
            >
              <AutoSizeInput
                minWidth={COMBOBOX_WIDTH}
                maxWidth={COMBOBOX_WIDTH}
                type="number"
                value={query.take}
                onBlur={onTakeChange}
                placeholder={placeholders.take}
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          </>
        )}
      </Stack>
      <FloatingError 
        message={datasource.errorTitle}
        innerMessage={datasource.errorDescription}
        severity="warning"
      />
    </>
  );
}
