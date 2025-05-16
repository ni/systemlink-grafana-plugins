import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OutputType, Properties, TestPlansQuery } from '../types';
import { InlineField, MultiSelect, RadioButtonGroup, VerticalGroup } from '@grafana/ui';

type Props = QueryEditorProps<TestPlansDataSource, TestPlansQuery>;

export function TestPlansQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: TestPlansQuery, runQuery = true): void => {
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
      handleQueryChange({ ...query, properties: items.map(i => i.value as Properties) });
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
              options={Object.entries(Properties).map(([key, value]) => ({ label: value, value: key })) as SelectableValue[]}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties}
              noMultiValueWrap={true}
              maxVisibleValues={5}
              width={60}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  outputType: 'This field specifies the output type to fetch test plan properties or total count.',
  properties: 'This field specifies the properties to use in the query.'
};
