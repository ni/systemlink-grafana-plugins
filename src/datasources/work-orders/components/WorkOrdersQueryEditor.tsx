import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OutputType, WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import {
  HorizontalGroup,
  InlineField,
  InlineSwitch, RadioButtonGroup,
  Select,
  VerticalGroup
} from '@grafana/ui';
import { OrderBy } from 'datasources/products/types';
import './WorkOrdersQueryEditor.scss';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: WorkOrdersQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    }, [onChange, onRunQuery]
  );

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  return (
    <>
      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Output" labelWidth={25} tooltip={tooltips.outputType}>
            <RadioButtonGroup
              options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onOutputTypeChange}
              value={query.outputType}
            />
          </InlineField>
          <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
            <WorkOrdersQueryBuilder globalVariableOptions={[]}></WorkOrdersQueryBuilder>
          </InlineField>
        </VerticalGroup>
        <VerticalGroup>
          {query.outputType === OutputType.Properties && (
            <div className="right-query-controls">
              <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  placeholder="Select a field to set the query order"
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={query.orderBy}
                  width={26}
                />
              </InlineField>
              <InlineField label="Descending" labelWidth={18} tooltip={tooltips.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
          )}
        </VerticalGroup>
      </HorizontalGroup>
    </>
  );
}

const tooltips = {
  queryBy: 'This optional field specifies the query filters.',
  outputType: 'This field specifies the output type to fetch work order properties or total count',
  properties: 'This field specifies the properties to use in the query.',
  orderBy: 'This field specifies the query order of the work orders.',
  descending: 'This toggle returns the work orders query in descending order.',
};
