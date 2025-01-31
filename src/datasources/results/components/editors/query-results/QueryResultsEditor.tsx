import { SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  InlineField,
  InlineSwitch,
  MultiSelect,
  RadioButtonGroup,
  Select,
  VerticalGroup,
} from '@grafana/ui';
import { OrderBy, OutputType, ResultsProperties, ResultsQuery, UseTimeRange } from 'datasources/results/types';
import React from 'react';

type Props = {
  query: ResultsQuery;
  handleQueryChange: (query: ResultsQuery, runQuery?: boolean) => void;
};

export function QueryResultsEditor({ query, handleQueryChange }: Props) {
  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as ResultsProperties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onUseTimeRangeChecked = (value: boolean) => {
    if(query.useTimeRangeFor === undefined) {
      handleQueryChange({ ...query, useTimeRange: value }, false);
      return;
    }
    handleQueryChange({ ...query, useTimeRange: value });
  };

  const onUseTimeRangeChanged = (value: SelectableValue<string>) => {
    handleQueryChange({ ...query, useTimeRangeFor: value.value! });
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
        <InlineField label="Output" labelWidth={18} tooltip={tooltips.output}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            value={query.outputType}
            onChange={onOutputChange}
          />
        </InlineField>
        {query.outputType === OutputType.Data && (
          <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select properties to fetch"
              options={Object.keys(ResultsProperties).map(value => ({ label: value, value })) as SelectableValue[]}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              maxVisibleValues={5}
              width={60}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
        <div>
          {query.outputType === OutputType.Data && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField label="OrderBy" labelWidth={18} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  placeholder="Select field to order by"
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={query.orderBy}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltips.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
          )}
          {query.outputType === OutputType.Data && (
            <InlineField label="Take" labelWidth={18} tooltip={tooltips.recordCount}>
              <AutoSizeInput
                minWidth={20}
                maxWidth={40}
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder="Enter record count"
              />
            </InlineField>
          )}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={18}>
              <InlineSwitch
                onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
                value={query.useTimeRange}
              />
            </InlineField>
            <InlineField label="to filter by" disabled={!query.useTimeRange}>
              <Select
                placeholder="Choose"
                options={Object.keys(UseTimeRange).map(value => ({ label: value, value })) as SelectableValue[]}
                onChange={onUseTimeRangeChanged}
                value={query.useTimeRangeFor}
                width={25}
              />
            </InlineField>
          </div>
        </div>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  output: 'Select the output type for the query',
  properties: 'Select the properties fields to query',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the results by',
  descending: 'Select to order the results in descending order',
  useTimeRange: 'Use the time range instead for the selected field',
};
