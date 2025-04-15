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
import { enumToOptions, validateNumericInput } from 'core/utils';
import React from 'react';
import { OutputType, UseTimeRangeFor } from 'datasources/results/types/types';
import { OrderBy, QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';

type Props = {
  query: QuerySteps;
  handleQueryChange: (query: QuerySteps, runQuery?: boolean) => void;
};

export function QueryStepsEditor({ query, handleQueryChange }: Props) {
  console.log(query);
  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as StepsProperties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const onShowMeasurementChange = (isShowMeasurementChecked: boolean) => {
    handleQueryChange({ ...query, showMeasurements: isShowMeasurementChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  };

  return (
    <>
      <VerticalGroup>
        <InlineField label="Output" labelWidth={25} tooltip={tooltips.output}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            value={query.outputType}
            onChange={onOutputChange}
          />
        </InlineField>
        {query.outputType === OutputType.Data && (
          <VerticalGroup>
            <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
              <MultiSelect
                placeholder="Select properties to fetch"
                options={enumToOptions(StepsProperties)}
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
                <InlineField label="OrderBy" labelWidth={25} tooltip={tooltips.orderBy}>
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
              <InlineField label="Show Measurements" labelWidth={25} tooltip={tooltips.showMeasurements}>
                <InlineSwitch
                  onChange={event => onShowMeasurementChange(event.currentTarget.checked)}
                  value={query.showMeasurements}
                />
              </InlineField>
              <InlineField label="Take" labelWidth={25} tooltip={tooltips.recordCount}>
                <AutoSizeInput
                  minWidth={20}
                  maxWidth={40}
                  type="number"
                  defaultValue={query.recordCount}
                  onCommitChange={recordCountChange}
                  placeholder="Enter record count"
                  onKeyDown={(event) => {validateNumericInput(event)}}
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
      <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={25}>
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
  output: 'Select the output type for the query',
  properties: 'Select the properties fields to query',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the steps by',
  descending: 'Select to order the steps in descending order',
  showMeasurements: 'Select to display step measurement data',
  useTimeRange: 'Select to query using the dashboard time range for the selected field',
  useTimeRangeFor: 'Select the field to apply the dashboard time range',
};
