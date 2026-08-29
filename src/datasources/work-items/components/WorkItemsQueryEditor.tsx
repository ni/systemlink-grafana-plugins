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
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  LABEL_WIDTH,
  OrderBy,
  TAKE_LIMIT,
  WorkItemProperties,
  WorkItemTypes,
  labels,
  placeholders,
  propertiesErrorMessages,
  takeErrorMessages,
  tooltips,
  typesErrorMessages,
} from '../constants/QueryEditor.constants';
import {
  OrderByOptions,
  OutputType,
  WorkItemPropertiesOptions,
  WorkItemsQuery,
  WorkItemTypeOptions,
} from '../types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

const propertiesOptions = Object.values(WorkItemProperties).map(property => ({
  label: property.label,
  value: property.value,
  group: property.group,
}));

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');
  const isPropertiesValid = datasource.isPropertiesValid(query.properties);
  const isTypesValid = datasource.isTypesValid(query.types);

  const handleQueryChange = useCallback(
    (newQuery: WorkItemsQuery, runQuery = true): void => {
      onChange(newQuery);
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
    <Stack
      direction="column"
    >
      <InlineField
        label={labels.outputType}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.outputType}
      >
        <RadioButtonGroup
          options={Object.values(OutputType).map(value => ({ label: value, value }))}
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
          width="auto"
          minWidth={65}
          maxWidth={65}
        />
      </InlineField>
      {query.outputType === OutputType.Properties && (
        <>
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
              minWidth={65}
              maxWidth={65}
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
              width={26}
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
            invalid={!!takeInvalidMessage}
            error={takeInvalidMessage}
          >
            <AutoSizeInput
              minWidth={26}
              maxWidth={26}
              type="number"
              defaultValue={query.take}
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
  );
}
