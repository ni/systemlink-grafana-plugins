import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, Combobox, ComboboxOption, InlineSwitch, MultiCombobox, RadioButtonGroup, Stack } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  OrderBy,
  OrderByOptions,
  OutputType,
  TAKE_LIMIT,
  WorkItemsQuery,
  WorkItemTypeOptions,
  WorkItemTypes,
  takeErrorMessages,
} from '../types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');

  const selectedTypes = useMemo(
    () => (query.types ?? []).map((type) => ({ label: WorkItemTypes.find((option) => option.value === type)?.label ?? type, value: type })),
    [query.types]
  );

  const typeOptions = useMemo(
    () => WorkItemTypes.map((option) => ({ label: option.label, value: option.value })),
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
      handleQueryChange({ ...query, take: datasource.defaultQuery.take }, false);
      return;
    }

    if (value > TAKE_LIMIT) {
      setTakeInvalidMessage(takeErrorMessages.lessOrEqualToTenThousand);
      handleQueryChange({ ...query, take: TAKE_LIMIT }, false);
      return;
    }

    setTakeInvalidMessage('');
    handleQueryChange({ ...query, take: value });
  };

  useEffect(() => {
    if (!query.init) {
      handleQueryChange({ ...query, init: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.init]);

  return (
    <Stack direction='column' gap={0}>
      <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
        <RadioButtonGroup
          options={Object.values(OutputType).map((value) => ({ label: value, value })) as SelectableValue[]}
          onChange={onOutputTypeChange}
          value={query.outputType}
        />
      </InlineField>

      <InlineField label="Type" labelWidth={25} tooltip={tooltips.types}>
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

      {query.outputType === OutputType.Properties && (
        <>
          <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
            <Combobox
              options={OrderBy}
              placeholder="Select a field to set query order"
              onChange={onOrderByChange}
              value={query.orderBy}
              width={26}
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
              type='number'
              value={query.take}
              onBlur={onTakeChange}
              placeholder="Enter record count"
              onKeyDown={(event) => { validateNumericInput(event); }}
            />
          </InlineField>
        </>
      )}
    </Stack>
  );
}

const tooltips = {
  outputType: 'Select whether to return work item properties or only total count.',
  types: 'Choose one or more work item types to query.',
  orderBy: 'Select which property to sort by for properties output.',
  descending: 'Toggle descending sort order for properties output.',
  take: 'Set the maximum number of work items to return. Maximum is 10,000.',
};
