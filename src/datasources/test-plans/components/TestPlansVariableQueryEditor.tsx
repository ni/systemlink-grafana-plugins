import React, { useCallback, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { OrderBy, TestPlansVariableQuery } from '../types';
import { AutoSizeInput, InlineField, InlineSwitch, Select, VerticalGroup } from '@grafana/ui';
import './TestPlansQueryEditor.scss';
import { validateNumericInput } from 'core/utils';
import { TestPlansDataSource } from '../TestPlansDataSource';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansVariableQuery>;

export function TestPlansVariableQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: TestPlansVariableQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    }, [onChange, onRunQuery]
  );

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (isNaN(value) || value < 0 || value > 10000) {
      setIsRecordCountValid(false);
    } else {
      setIsRecordCountValid(true);
    }
    handleQueryChange({ ...query, recordCount: value });
  };

  const [isRecordCountValid, setIsRecordCountValid] = useState<boolean>(true);

  return (
    <VerticalGroup>
      <div className="horizontal-control-group">
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
        <InlineField label="Descending" tooltip={tooltips.descending}>
          <InlineSwitch
            onChange={event => onDescendingChange(event.currentTarget.checked)}
            value={query.descending}
          />
        </InlineField>
      </div>
      <InlineField
        label="Take"
        labelWidth={25}
        tooltip={tooltips.recordCount}
        invalid={!isRecordCountValid}
        error={errors.recordCount}
      >
        <AutoSizeInput
          minWidth={26}
          maxWidth={26}
          type='number'
          defaultValue={query.recordCount}
          onCommitChange={recordCountChange}
          placeholder="Enter record count"
          onKeyDown={(event) => { validateNumericInput(event) }}
        />
      </InlineField>
    </VerticalGroup >
  );
}

const tooltips = {
  orderBy: 'This field specifies the query order of the test plans.',
  descending: 'This toggle returns the test plans query in descending order.',
  recordCount: 'This field specifies the maximum number of test plans to return.'
};

const errors = {
  recordCount: 'Record count must be less than 10000'
};
