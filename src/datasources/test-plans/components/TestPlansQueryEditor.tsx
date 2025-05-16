import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { TestPlansDataSource } from '../TestPlansDataSource';
import { OrderBy, OutputType, PropertiesWithProjections, TestPlanProperties, TestPlansQuery } from '../types';
import { AutoSizeInput, InlineField, InlineSwitch, MultiSelect, RadioButtonGroup, Select, VerticalGroup } from '@grafana/ui';
import './TestPlansQueryEditor.scss';
import { validateNumericInput } from 'core/utils';

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

  const onPropertiesChange = (items: Array<SelectableValue<TestPlanProperties>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value!) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
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
          <VerticalGroup>
            <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
              <MultiSelect
                placeholder="Select properties to query"
                options={Array.from(PropertiesWithProjections.values()).map(value => ({ label: value.label, value })) as SelectableValue[]}
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
            <div className="horizontal-control-group">
              <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  placeholder="Select field to order by"
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
            <InlineField label="Take" labelWidth={25} tooltip={tooltips.recordCount}>
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
          </VerticalGroup>
        )}
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  outputType: 'This field specifies the output type to fetch test plan properties or total count.',
  properties: "Specifies the properties to be queried.",
  orderBy: "Specifies the field to order the queried test plans by.",
  descending: "Specifies whether to return the test plans in descending order.",
  recordCount: "Specifies the maximum number of test plans to return."
};
