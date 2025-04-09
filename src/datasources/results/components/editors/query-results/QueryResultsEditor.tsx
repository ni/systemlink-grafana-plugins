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
import { enumToOptions } from 'core/utils';
import { OrderBy, OutputType, ResultsProperties, ResultsQuery, UseTimeRangeFor } from 'datasources/results/types';
import React from 'react';
import './QueryResultsEditor.scss';

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

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: isNaN(value) ? undefined : value });
  };

  function checkIfNumber(event: React.KeyboardEvent<HTMLInputElement>) {
    if (isNaN(Number(event.key)) && !['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }

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
          <VerticalGroup>
            <InlineField label="Properties" labelWidth={18} tooltip={tooltips.properties}>
              <MultiSelect
                placeholder="Select properties to fetch"
                options={enumToOptions(ResultsProperties)}
                onChange={onPropertiesChange}
                value={query.properties}
                defaultValue={query.properties!}
                noMultiValueWrap={true}
                maxVisibleValues={5}
                width={60}
                allowCustomValue={false}
                closeMenuOnSelect={false}
              />
            </InlineField>
            <div>
              <div className="horizontal-control-group">
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
              <InlineField label="Take" labelWidth={18} tooltip={tooltips.recordCount}>
                <AutoSizeInput
                  minWidth={20}
                  maxWidth={40}
                  type="number"
                  defaultValue={query.recordCount}
                  onCommitChange={recordCountChange}
                  placeholder="Enter record count"
                  onKeyDown={(event) => {checkIfNumber(event)}}
                />
              </InlineField>
              <UseTimeRangeControls
                query={query}
                handleQueryChange={handleQueryChange}
              />
            </div>
          </VerticalGroup>
        )}
        {query.outputType === OutputType.TotalCount && (
          <UseTimeRangeControls
            query={query}
            handleQueryChange={handleQueryChange}
          />
        )}
      </VerticalGroup>
    </>
  );
}

export function UseTimeRangeControls({ query, handleQueryChange }: Props) {
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

  return (
    <div className="horizontal-control-group">
      <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={18}>
        <InlineSwitch 
          onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)} 
          value={query.useTimeRange}
        />
      </InlineField>
      <InlineField label="to filter by" disabled={!query.useTimeRange} tooltip={tooltips.useTimeRangeFor}>
        <Select
          placeholder="Choose"
          options={enumToOptions(UseTimeRangeFor)}
          onChange={onUseTimeRangeChanged}
          value={query.useTimeRangeFor}
          width={25}
        />
      </InlineField>
    </div>
  );
}

const tooltips = {
  output: 'Specifies the type of output for the queried result.',
  properties: 'Specifies the properties to be queried.',
  recordCount: 'Specifies the maximum number of results to return.',
  orderBy: 'Specifies the field to order the queried results by.',
  descending: 'Specifies whether to return the queried results in descending order.',
  useTimeRange: 'Specifies whether to query only for data within the dashboard time range for the selected property.',
  useTimeRangeFor: 'Specifies the property to query within the dashboard time range.',
};
