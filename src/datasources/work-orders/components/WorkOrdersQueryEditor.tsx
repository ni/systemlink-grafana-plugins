import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { OutputType, WorkOrderProperties, WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { InlineField, MultiSelect, RadioButtonGroup, VerticalGroup } from '@grafana/ui';

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

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as WorkOrderProperties) });
    }
  };
  
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
        {query.outputType === OutputType.Properties && (
          <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select the properties to query"
              options={Object.entries(WorkOrderProperties).map(([key, value]) => ({ label: value, value: key })) as SelectableValue[]}
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
            globalVariableOptions={[]}
          ></WorkOrdersQueryBuilder>
        </InlineField>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  queryBy: 'This optional field specifies the query filters.',
  properties: 'This field specifies the properties to use in the query.'
};
