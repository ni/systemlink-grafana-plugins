import React, { useCallback, useEffect } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OrderBy, OutputType, WorkOrderProperties, WorkOrderPropertiesOptions, WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import {
  HorizontalGroup,
  InlineField,
  InlineSwitch, MultiSelect, RadioButtonGroup,
  Select,
  VerticalGroup
} from '@grafana/ui';
import './WorkOrdersQueryEditor.scss';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  useEffect(() => {
    handleQueryChange(query, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

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

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as WorkOrderPropertiesOptions) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onQueryByChange = (queryBy: string) => {
    if(query.queryBy !== queryBy) {
      query.queryBy = queryBy;
      handleQueryChange({ ...query, queryBy });
    }
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
          {query.outputType === OutputType.Properties && (
          <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select the properties to query"
              options={
                Object.values(WorkOrderProperties).map(workOrderProperty => ({
                  label: workOrderProperty.label,
                  value: workOrderProperty.value,
                })) as SelectableValue[]
              }
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              noMultiValueWrap={true}
              maxVisibleValues={5}
              width={65}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
            <WorkOrdersQueryBuilder
              filter={query.queryBy} 
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onQueryByChange(event.detail.linq)}
            ></WorkOrdersQueryBuilder>
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
