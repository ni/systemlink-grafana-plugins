import React, { useCallback, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  Combobox,
  ComboboxOption,
  InlineSwitch,
  MultiCombobox,
  RadioButtonGroup,
  Stack,
} from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { Workspace } from 'core/types';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  CONTROL_WIDTH,
  COMBOBOX_WIDTH,
  LABEL_WIDTH,
  OrderBy,
  WorkItemProperties,
  WorkItemTypes,
  labels,
  placeholders,
  propertiesErrorMessages,
  takeErrorMessages,
  tooltips,
  typesErrorMessages,
} from '../constants/QueryEditor.constants';
import { TAKE_LIMIT } from '../constants';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from '../types';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';
import { User } from 'shared/types/QueryUsers.types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');

  const isPropertiesValid = Boolean(query.properties && query.properties.length > 0);
  const isTypesValid = Boolean(query.types && query.types.length > 0);

  const propertiesOptions = Object.values(WorkItemProperties).map(property => ({
    label: property.label,
    value: property.value,
    group: property.group,
  }));

  const outputTypeOptions = Object.values(OutputType).map(value => ({
    label: value,
    value,
  }));

  // TODO: AB#3923383 - workspace/user lookups land with the query builder PR.
  const workspaces: Workspace[] | null = null;
  const users: User[] | null = null;

  const handleQueryChange = useCallback(
    (query: WorkItemsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onTypesChange = (items: Array<ComboboxOption<WorkItemTypeOptions>>) => {
    const types = items.map(item => item.value).filter(Boolean) as WorkItemTypeOptions[];
    handleQueryChange({ ...query, types });
  };

  const onPropertiesChange = (items: Array<ComboboxOption<WorkItemPropertiesOptions>>) => {
    const properties = items.map(item => item.value).filter(Boolean) as WorkItemPropertiesOptions[];
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
    if (Number.isNaN(value) || value <= 0) {
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
    <Stack direction='column'>
      <Stack direction='column' gap={0}>
        <InlineField
          label={labels.outputType}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.outputType}
        >
          <RadioButtonGroup
            options={outputTypeOptions}
            onChange={onOutputTypeChange}
            value={query.outputType}
          />
        </InlineField>
        <InlineField
          label={labels.types}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.types}
          invalid={!isTypesValid}
          error={typesErrorMessages.atLeastOneRequired}
        >
          <MultiCombobox
            placeholder={placeholders.types}
            options={WorkItemTypes}
            value={query.types}
            onChange={onTypesChange}
            enableAllOption
            width='auto'
            minWidth={CONTROL_WIDTH}
            maxWidth={CONTROL_WIDTH}
          />
        </InlineField>
      </Stack>
      {query.outputType === OutputType.Properties && (
        <InlineField
          label={labels.properties}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.properties}
          invalid={!isPropertiesValid}
          error={propertiesErrorMessages.atLeastOneRequired}
        >
          <MultiCombobox
            placeholder={placeholders.properties}
            options={propertiesOptions}
            value={query.properties}
            onChange={onPropertiesChange}
            width="auto"
            minWidth={CONTROL_WIDTH}
            maxWidth={CONTROL_WIDTH}
          />
        </InlineField>
      )}
      <Stack>
        <InlineField
          label={labels.queryBy}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.filter}
        >
          <WorkItemsQueryBuilder
            filter={query.filter}
            workspaces={workspaces}
            users={users}
            globalVariableOptions={datasource.globalVariableOptions()}
            onChange={onFilterChange}
          />
        </InlineField>
        {query.outputType === OutputType.Properties && (
          <Stack direction="column" gap={1}>
            <Stack direction="column" gap={0}>
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
            </Stack>
            <InlineField
              label={labels.take}
              labelWidth={LABEL_WIDTH}
              tooltip={tooltips.take}
              invalid={!!takeInvalidMessage}
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
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
