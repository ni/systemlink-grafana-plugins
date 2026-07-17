import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  ALL_WORK_ITEM_TYPES_VALUE,
  OrderBy,
  OutputType,
  WorkItemProperties,
  WorkItemPropertyGroup,
  WorkItemPropertyKey,
  WorkItemsQuery,
} from '../types';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import {
  AutoSizeInput,
  Combobox,
  ComboboxOption,
  InlineField,
  InlineSwitch,
  MultiCombobox,
  RadioButtonGroup,
  Stack,
} from '@grafana/ui';
import { TAKE_LIMIT, takeErrorMessages, tooltips } from '../constants/QueryEditor.constants';
import { validateNumericInput } from 'core/utils';
import { Workspace } from 'core/types';
import { User } from 'shared/types/QueryUsers.types';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

const ALL_TYPES_OPTION: ComboboxOption<string> = { label: 'All', value: ALL_WORK_ITEM_TYPES_VALUE };

const PROPERTY_DISPLAY_ORDER: WorkItemPropertyKey[] = [
  // Work item details
  WorkItemPropertyKey.ID,
  WorkItemPropertyKey.NAME,
  WorkItemPropertyKey.TYPE,
  WorkItemPropertyKey.STATE,
  WorkItemPropertyKey.SUBSTATE,
  WorkItemPropertyKey.DESCRIPTION,
  WorkItemPropertyKey.TEST_PROGRAM,
  WorkItemPropertyKey.PART_NUMBER,
  WorkItemPropertyKey.WORKSPACE,
  WorkItemPropertyKey.ASSIGNED_TO,
  WorkItemPropertyKey.REQUESTED_BY,
  WorkItemPropertyKey.CREATED_BY,
  WorkItemPropertyKey.UPDATED_BY,
  WorkItemPropertyKey.CREATED_AT,
  WorkItemPropertyKey.UPDATED_AT,
  WorkItemPropertyKey.PARENT_NAME,
  WorkItemPropertyKey.PARENT_ID,
  WorkItemPropertyKey.TEMPLATE_ID,
  // Timeline
  WorkItemPropertyKey.EARLIEST_START_DATE,
  WorkItemPropertyKey.DUE_DATE,
  WorkItemPropertyKey.ESTIMATED_DURATION,
  WorkItemPropertyKey.PLANNED_START_DATE,
  WorkItemPropertyKey.PLANNED_END_DATE,
  WorkItemPropertyKey.PLANNED_DURATION,
  // Resources
  WorkItemPropertyKey.ASSET_NAME,
  WorkItemPropertyKey.ASSET_ID,
  WorkItemPropertyKey.DUT_NAME,
  WorkItemPropertyKey.DUT_ID,
  WorkItemPropertyKey.FIXTURE_NAME,
  WorkItemPropertyKey.FIXTURE_ID,
  WorkItemPropertyKey.TARGET_LOCATION,
  WorkItemPropertyKey.TARGET_PARENT,
  WorkItemPropertyKey.SYSTEM_NAME,
  WorkItemPropertyKey.SYSTEM_ID,
];

const STATIC_PROPERTY_OPTIONS = PROPERTY_DISPLAY_ORDER.map(key => ({
  label: WorkItemProperties[key].label,
  value: key,
  group: WorkItemProperties[key].group as string,
})) as Array<ComboboxOption<string>>;

const byLabel = (a: ComboboxOption<string>, b: ComboboxOption<string>) =>
  (a.label ?? '').localeCompare(b.label ?? '', undefined, { sensitivity: 'base' });

const WORK_ITEM_DETAILS_OPTIONS = STATIC_PROPERTY_OPTIONS
  .filter(option => option.group === WorkItemPropertyGroup.WorkItemDetails)
  .sort(byLabel);

const TIMELINE_OPTIONS = STATIC_PROPERTY_OPTIONS.filter(option => option.group === WorkItemPropertyGroup.Timeline).sort(byLabel);

const RESOURCES_OPTIONS = STATIC_PROPERTY_OPTIONS.filter(option => option.group === WorkItemPropertyGroup.Resources).sort(byLabel);
const ORDER_BY_OPTIONS = OrderBy as Array<ComboboxOption<string>>;

const toSelectedOptions = (selectedValues: string[], options: Array<ComboboxOption<string>>): Array<ComboboxOption<string>> => {
  const optionsByValue = new Map(options.map(option => [option.value, option]));
  return selectedValues.map(value => optionsByValue.get(value) ?? { label: value, value });
};

const toStringValues = (items: Array<ComboboxOption<string>>): string[] =>
  items.map(item => item.value).filter((value): value is string => value !== undefined);

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);
  const [isTypesValid, setIsTypesValid] = useState<boolean>(true);

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [workItemTypes, setWorkItemTypes] = useState<Array<ComboboxOption<string>> | null>(null);
  const [customPropertyOptions, setCustomPropertyOptions] = useState<Array<ComboboxOption<string>>>([]);
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

  useEffect(() => {
    const loadCustomKeys = async () => {
      const keys = await datasource.loadCustomPropertyKeys();
      setCustomPropertyOptions(
        keys.map(key => ({ label: key, value: key, group: WorkItemPropertyGroup.CustomProperties }))
      );
    };
    loadCustomKeys();
  }, [datasource]);

  useEffect(() => {
    if (!query.outputType) {
      handleQueryChange({ ...query, outputType: OutputType.Properties });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = useCallback(
    (updated: WorkItemsQuery, runQuery = true): void => {
      onChange(updated);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<ComboboxOption<string>>) => {
    setIsPropertiesValid(items.length > 0);
    handleQueryChange({ ...query, properties: toStringValues(items) });
  };

  const onWorkItemTypesChange = (items: Array<ComboboxOption<string>>) => {
    if (items.length === 0) {
      setIsTypesValid(false);
      handleQueryChange({ ...query, workItemTypes: [] }, false);
      return;
    }
    setIsTypesValid(true);

    const selectedValues = toStringValues(items);
    const lastSelected = selectedValues[selectedValues.length - 1];

    // If "All" was just selected, deselect everything else
    if (lastSelected === ALL_WORK_ITEM_TYPES_VALUE) {
      handleQueryChange({ ...query, workItemTypes: [ALL_WORK_ITEM_TYPES_VALUE] });
      return;
    }

    // If a specific type was selected while "All" was in the list, remove "All"
    const withoutAll = selectedValues.filter(v => v !== ALL_WORK_ITEM_TYPES_VALUE);
    handleQueryChange({ ...query, workItemTypes: withoutAll });
  };

  const onOrderByChange = (item: ComboboxOption<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
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

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(value) || value < 0) {
      setTakeInvalidMessage(takeErrorMessages.greaterOrEqualToZero);
      handleQueryChange({ ...query, take: undefined });
      return;
    }
    if (value > TAKE_LIMIT) {
      setTakeInvalidMessage(takeErrorMessages.lessOrEqualToTenThousand);
      handleQueryChange({ ...query, take: undefined });
      return;
    }
    setTakeInvalidMessage('');
    handleQueryChange({ ...query, take: value });
  };

  const allPropertyOptions = useMemo<Array<ComboboxOption<string>>>(
    () => [...WORK_ITEM_DETAILS_OPTIONS, ...TIMELINE_OPTIONS, ...RESOURCES_OPTIONS, ...[...customPropertyOptions].sort(byLabel)],
    [customPropertyOptions]
  );

  const typeOptions = useMemo<Array<ComboboxOption<string>>>(
    () => [
      ALL_TYPES_OPTION,
      ...datasource.globalVariableOptions().map(option => ({
        label: option.label,
        value: option.value as string,
      })),
      ...(workItemTypes ?? []),
    ],
    [datasource, workItemTypes]
  );

  const selectedPropertyOptions = useMemo<Array<ComboboxOption<string>>>(
    () => toSelectedOptions(query.properties ?? [], allPropertyOptions),
    [query.properties, allPropertyOptions]
  );

  const selectedTypeOptions = useMemo<Array<ComboboxOption<string>>>(
    () => toSelectedOptions(query.workItemTypes ?? [ALL_WORK_ITEM_TYPES_VALUE], typeOptions),
    [query.workItemTypes, typeOptions]
  );

  return (
    <>
      <Stack direction="row" alignItems="flex-start">
        <Stack direction="column">
          <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
            <RadioButtonGroup
              options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onOutputTypeChange}
              value={query.outputType}
            />
          </InlineField>
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
          {query.outputType === OutputType.Properties && (
            <InlineField
              label="Properties"
              labelWidth={25}
              tooltip={tooltips.properties}
              invalid={!isPropertiesValid}
              error={!isPropertiesValid ? 'Select at least one property' : undefined}
            >
              <MultiCombobox
                options={allPropertyOptions}
                value={selectedPropertyOptions}
                onChange={onPropertiesChange}
                width="auto"
                minWidth={65}
                maxWidth={65}
                placeholder="Select properties"
                createCustomValue={false}
                isClearable={true}
              />
            </InlineField>
          )}
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
          {query.outputType === OutputType.Properties && (
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
          )}
        </Stack>
      </Stack>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}
