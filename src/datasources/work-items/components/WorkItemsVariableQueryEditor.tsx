import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, Combobox, ComboboxOption, InlineSwitch, MultiCombobox, RadioButtonGroup, Stack } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import {
  OrderByOptions,
  WorkItemsQuery,
  WorkItemsVariableQuery,
  WorkItemsVariableQueryType,
  WorkItemTypeOptions,
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

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsVariableQueryEditor({ query: rawQuery, onChange, datasource }: Props) {
  const query = datasource.prepareQuery(rawQuery) as WorkItemsVariableQuery;
  const queryType = query.queryType ?? WorkItemsVariableQueryType.ListWorkItems;

  const isTypesValid = isTypesNonEmpty(query.types);
  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';

  const queryTypeOptions = Object.values(WorkItemsVariableQueryType).map(value => ({
    label: value,
    value,
  }));

  const handleQueryChange = useCallback(
    (query: WorkItemsVariableQuery): void => {
      onChange(query as WorkItemsQuery);
    },
    [onChange]
  );

  const onQueryTypeChange = (value: WorkItemsVariableQueryType) => {
    handleQueryChange({ ...query, queryType: value });
  };

  const onTypesChange = (items: Array<ComboboxOption<WorkItemTypeOptions>>) => {
    const types = items.map(item => item.value).filter(Boolean) as WorkItemTypeOptions[];
    handleQueryChange({ ...query, types });
  };

  const onOrderByChange = (item: SelectableValue<OrderByOptions>) => {
    handleQueryChange({ ...query, orderBy: item.value as OrderByOptions });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, take: value });
  };

  return (
    <Stack direction="column">
      <InlineField label={labels.queryType} labelWidth={LABEL_WIDTH} tooltip={tooltips.queryType}>
        <RadioButtonGroup options={queryTypeOptions} value={queryType} onChange={onQueryTypeChange} />
      </InlineField>
      {queryType === WorkItemsVariableQueryType.ListWorkItems && (
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
              options={WorkItemTypes}
              value={query.types}
              onChange={onTypesChange}
              enableAllOption
              width="auto"
              minWidth={CONTROL_WIDTH}
              maxWidth={CONTROL_WIDTH}
            />
          </InlineField>
          <InlineField label={labels.queryBy} labelWidth={LABEL_WIDTH} tooltip={tooltips.filter}>
            <WorkItemsQueryBuilder />
          </InlineField>
          <InlineField label={labels.orderBy} labelWidth={LABEL_WIDTH} tooltip={tooltips.orderBy}>
            <Combobox
              options={OrderBy}
              placeholder={placeholders.orderBy}
              onChange={onOrderByChange}
              value={query.orderBy}
              width={COMBOBOX_WIDTH}
            />
          </InlineField>
          <InlineField label={labels.descending} labelWidth={LABEL_WIDTH} tooltip={tooltips.descending}>
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
  );
}
