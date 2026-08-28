import React, { useCallback, useMemo, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, Combobox, ComboboxOption, InlineSwitch, MultiCombobox, RadioButtonGroup, Stack } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { Workspace } from 'core/types';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { TAKE_LIMIT, labels, propertiesErrorMessages, takeErrorMessages, tooltips } from '../constants/QueryEditor.constants';
import {
  OrderBy,
  OrderByOptions,
  OutputType,
  WorkItemProperties,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
  WorkItemTypes,
} from '../types';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');
  const isPropertiesValid = datasource.isPropertiesValid(query.properties);
  // Workspace and user lookups will be wired once the query builder is connected to the backend (Run Query story).
  const workspaces: Workspace[] | null = null;
  const users: User[] | null = null;

  const selectedTypes = useMemo(
    () => (query.types ?? []).map((type) => ({ label: WorkItemTypes.find((option) => option.value === type)?.label ?? type, value: type })),
    [query.types]
  );

  const typeOptions = useMemo(
    () => WorkItemTypes.map((option) => ({ label: option.label, value: option.value })),
    []
  );

  const selectedProperties = useMemo(
    () => (query.properties ?? []).map((property) => ({
      label: WorkItemProperties[property]?.label ?? property,
      value: property,
      group: WorkItemProperties[property]?.group,
    })),
    [query.properties]
  );

  const propertiesOptions = useMemo(
    () => Object.values(WorkItemProperties).map((property) => ({
      label: property.label,
      value: property.value,
      group: property.group,
    })),
    []
  );

  const handleQueryChange = useCallback((newQuery: WorkItemsQuery, runQuery = true): void => {
    onChange(newQuery);
    if (runQuery) {
      onRunQuery();
    }
  }, [onChange, onRunQuery]);

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onTypesChange = (items: Array<ComboboxOption<WorkItemTypeOptions>>) => {
    const types = items.map((item) => item.value).filter(Boolean) as WorkItemTypeOptions[];
    handleQueryChange({ ...query, types: datasource.normalizeTypes(types) });
  };

  const onPropertiesChange = (items: Array<ComboboxOption<WorkItemPropertiesOptions>>) => {
    const properties = items.map((item) => item.value).filter(Boolean) as WorkItemPropertiesOptions[];
    handleQueryChange({ ...query, properties });
  };

  const onFilterChange = (event: any) => {
    handleQueryChange({ ...query, filter: event.detail.linq });
  };

  const onOrderByChange = (item: SelectableValue<OrderByOptions>) => {
    handleQueryChange({ ...query, orderBy: item.value as OrderByOptions });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (Number.isNaN(value) || value < 0) {
      setTakeInvalidMessage(takeErrorMessages.greaterOrEqualToZero);
      return;
    }

    if (value > TAKE_LIMIT) {
      setTakeInvalidMessage(takeErrorMessages.lessOrEqualToTenThousand);
      return;
    }

    setTakeInvalidMessage('');
    handleQueryChange({ ...query, take: value });
  };

  return (
    <Stack direction='column' gap={0}>
      <InlineField label={labels.outputType} labelWidth={25} tooltip={tooltips.outputType}>
        <RadioButtonGroup
          options={Object.values(OutputType).map((value) => ({ label: value, value })) as SelectableValue[]}
          onChange={onOutputTypeChange}
          value={query.outputType}
        />
      </InlineField>

      <InlineField label={labels.types} labelWidth={25} tooltip={tooltips.types}>
        <MultiCombobox
          placeholder="Select work item types"
          options={typeOptions}
          value={selectedTypes}
          onChange={onTypesChange}
          width='auto'
          minWidth={65}
          maxWidth={65}
        />
      </InlineField>

      <Stack>
        <InlineField label={labels.queryBy} labelWidth={25} tooltip={tooltips.filter}>
          <WorkItemsQueryBuilder
            filter={query.filter}
            workspaces={workspaces}
            users={users}
            globalVariableOptions={datasource.globalVariableOptions()}
            onChange={onFilterChange}
          />
        </InlineField>

      {query.outputType === OutputType.Properties && (
        <Stack direction='column'>
            <InlineField
            label={labels.properties}
            labelWidth={25}
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error={propertiesErrorMessages.atLeastOneRequired}
          >
            <MultiCombobox
              placeholder="Select the properties to query"
              options={propertiesOptions}
              value={selectedProperties}
              onChange={onPropertiesChange}
              width='auto'
              minWidth={65}
              maxWidth={65}
            />
          </InlineField>

          <InlineField label={labels.orderBy} labelWidth={25} tooltip={tooltips.orderBy}>
            <Combobox
              options={OrderBy}
              placeholder="Select a field to set query order"
              onChange={onOrderByChange}
              value={query.orderBy}
              width={26}
            />
          </InlineField>

            <InlineField label={labels.descending} labelWidth={18} tooltip={tooltips.descending}>
              <InlineSwitch
                onChange={event => onDescendingChange(event.currentTarget.checked)}
                value={query.descending}
              />
            </InlineField>

            <InlineField
              label={labels.take}
              labelWidth={18}
              tooltip={tooltips.take}
              invalid={!!takeInvalidMessage}
              error={takeInvalidMessage}
            >
              <AutoSizeInput
                minWidth={26}
                maxWidth={26}
                type='number'
                defaultValue={query.take}
                onBlur={onTakeChange}
                placeholder="Enter record count"
                onKeyDown={(event) => { validateNumericInput(event); }}
              />
            </InlineField>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
