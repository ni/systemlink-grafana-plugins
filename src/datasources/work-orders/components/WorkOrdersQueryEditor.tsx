import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OutputType, WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { InlineField, RadioButtonGroup, VerticalGroup } from '@grafana/ui';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onOutputTypeChange = useCallback((value: OutputType) => {
    onChange({ ...query, outputType: value });
    onRunQuery();
  }, [query, onChange, onRunQuery]);
  
  return (
    <>
      <VerticalGroup>
        <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            onChange={onOutputTypeChange}
            value={query.outputType}
          />
        </InlineField>
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
          <WorkOrdersQueryBuilder 
            globalVariableOptions={[]}
          ></WorkOrdersQueryBuilder>
        </InlineField>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  queryBy: 'This optional field specifies the filters to use in the query.',
  outputType: 'This field specifies the output type to fetch test plan properties or total count'
};
