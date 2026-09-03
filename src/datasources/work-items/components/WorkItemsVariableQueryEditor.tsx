import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AutoSizeInput, Combobox, InlineSwitch, Stack } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { validateNumericInput } from 'core/utils';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { OrderByOptions, WorkItemsVariableQuery } from '../types';
import {
  COMBOBOX_WIDTH,
  LABEL_WIDTH,
  OrderBy,
  labels,
  placeholders,
  tooltips,
} from '../constants/QueryEditor.constants';
import { getTakeError } from '../utils';
import { WorkItemsQueryBuilder } from './query-builder/WorkItemsQueryBuilder';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsVariableQuery>;

export function WorkItemsVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const takeInvalidMessage = getTakeError(query.take);
  const isTakeValid = takeInvalidMessage === '';

  const handleQueryChange = useCallback(
    (query: WorkItemsVariableQuery): void => {
      onChange(query);
    },
    [onChange]
  );

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
    </Stack>
  );
}
