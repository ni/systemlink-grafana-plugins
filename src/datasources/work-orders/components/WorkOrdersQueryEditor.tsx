import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OutputType, WorkOrdersQuery } from '../types';
import { InlineField, RadioButtonGroup } from '@grafana/ui';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onOutputTypeChange = useCallback((value: OutputType) => {
    onChange({ ...query, outputType: value });
    onRunQuery();
  }, [query, onChange, onRunQuery]);

  return (
    <>
      <InlineField label="Output" labelWidth={14} tooltip={tooltips.outputType}>
        <RadioButtonGroup
          options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
          onChange={onOutputTypeChange}
          value={query.outputType}
        />
      </InlineField>
    </>
  );
}

const tooltips = {
  outputType: 'This field specifies the output type to fetch test plan properties or total count'
};
