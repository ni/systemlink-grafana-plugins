import React from 'react';
import { AutoSizeInput, HorizontalGroup, InlineFormLabel, InlineSwitch, MultiSelect, RadioButtonGroup, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestResultsDataSource } from '../ResultsDataSource';
import { ResultsProperties, OutputType, ResultsQuery, ResultsQueryType, useTimeRange, StepsProperties, DataTablesProperties } from '../types';
import { enumToOptions } from 'core/utils';
import { TestResultsQueryBuilder } from '../ResultsQueryBuilder';
import { TestStepsQueryBuilder } from '../StepsQueryBuilder';
import { OrderBy } from 'datasources/products/types';
import _ from 'lodash';
import './resultsQueryEditor.scss'

type Props = QueryEditorProps<TestResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = datasource.getWorkspaceNames()

  const onQueryTypeChange = (value: ResultsQueryType) => {
    onChange({ ...query, type: value });
    onRunQuery();
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    onChange({ ...query, orderBy: item.value });
    onRunQuery();
  }

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, properties: items.map(i => i.value as ResultsProperties) });
      onRunQuery();
    }
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
    onRunQuery();
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    onChange({ ...query, recordCount: value });
    onRunQuery();
  }

  const onDescendingChange = (isDescendingChecked: boolean) => {
    onChange({ ...query, descending: isDescendingChecked });
    onRunQuery();
  }

  const onUseTimeRangeChecked = (value: boolean) => {
    onChange({ ...query, useTimeRange: value });
  }

  const onShowMeasurementChecked = (value: boolean) => {
    onChange({ ...query, measurementAsEntries: value });
    onRunQuery();
  }

  const onUseTimeRangeChanged = (value: SelectableValue<string>) => {
    onChange({ ...query, useTimeRangeFor: value.value! });
    onRunQuery();
  }

  const onOutputChange = (value: OutputType) => {
    onChange({ ...query, outputType: value });
    onRunQuery();
  }

  const onResultsParameterChange = (value: string) => {
    onChange({ ...query, resultFilter: value });
    onRunQuery();
  };

  const onStepsParameterChange = (value: string) => {
    onChange({ ...query, stepFilter: value });
    onRunQuery();
  }

  const metaData = query.type === ResultsQueryType.Results
    ? ResultsProperties
    : query.type === ResultsQueryType.Steps
      ? StepsProperties
      : DataTablesProperties;

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup>
          <div>
            <InlineField label="Query type" labelWidth={25} tooltip={tooltip.queryType}>
              <RadioButtonGroup
                options={enumToOptions(ResultsQueryType)}
                value={query.type}
                onChange={onQueryTypeChange}
              />
            </InlineField>
            <InlineField label="Output" labelWidth={25} tooltip={tooltip.output}>
              <RadioButtonGroup
                options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
                value={query.outputType}
                onChange={onOutputChange}
              />
            </InlineField>
          </div>
          {(query.outputType === OutputType.Data) && (
            <>
              <InlineField label="Properties" labelWidth={25} tooltip={tooltip.metaData}>
                <MultiSelect
                  placeholder='Select Properties'
                  options={Object.keys(metaData).map(value => ({ label: value, value })) as SelectableValue[]}
                  onChange={onPropertiesChange}
                  value={query.properties}
                  defaultValue={query.properties!}
                  width={65}
                  allowCustomValue={true}
                  closeMenuOnSelect={false}
                />
              </InlineField>
            </>
          )}
          <div>
            {/* {(query.outputType === OutputType.TotalCount &&) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <InlineField
                    label="Use time range"
                    tooltip={tooltip.useTimeRange}
                    labelWidth={25}
                  >
                    <InlineSwitch
                      onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
                      value={query.useTimeRange} />
                  </InlineField>
                  <InlineField label="to filter by" disabled={!query.useTimeRange}>
                    <Select
                      options={enumToOptions(useTimeRange)}
                      onChange={onUseTimeRangeChanged}
                      value={query.useTimeRangeFor}
                      width={25}
                    />
                  </InlineField>
                </div>
              </>
            )} */}
            {(query.type === ResultsQueryType.Steps && query.outputType === OutputType.Data) && (
              <>
                <InlineField
                  label="Show measurements"
                  tooltip={tooltip.useTimeRange}
                  labelWidth={25}
                >
                  <InlineSwitch
                    onChange={event => onShowMeasurementChecked(event.currentTarget.checked)}
                    value={query.measurementAsEntries} />
                </InlineField>
              </>
            )}
            {(query.type === ResultsQueryType.Results) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <InlineField
                    label="Use time range"
                    tooltip={tooltip.useTimeRange}
                    labelWidth={25}
                  >
                    <InlineSwitch
                      onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
                      value={query.useTimeRange} />
                  </InlineField>
                  <InlineField label="to filter by" disabled={!query.useTimeRange}>
                    <Select
                      options={enumToOptions(useTimeRange)}
                      onChange={onUseTimeRangeChanged}
                      value={query.useTimeRangeFor}
                      width={25}
                    />
                  </InlineField>
                </div>
                <div>
                  <InlineField label="QueryBy" labelWidth={25} tooltip={tooltip.queryBy}>
                    <TestResultsQueryBuilder
                      autoComplete={datasource.queryTestResultValues.bind(datasource)}
                      onChange={(event: any) => onQueryByChange(event.detail.linq)}
                      defaultValue={query.queryBy}
                      workspaceList={workspaces}
                    />
                  </InlineField>
                </div>
              </>
            )}
            {query.type === ResultsQueryType.Steps && (
              <>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <InlineField
                    label="Use time range"
                    tooltip={tooltip.useTimeRange}
                    labelWidth={25}
                  >
                    <InlineSwitch
                      onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
                      value={query.useTimeRange} />
                  </InlineField>
                  <InlineField label="to filter by" disabled={!query.useTimeRange}>
                    <Select
                      options={enumToOptions(useTimeRange)}
                      onChange={onUseTimeRangeChanged}
                      value={query.useTimeRangeFor}
                      width={25}
                    />
                  </InlineField>
                </div>
                <InlineField label="Query by result properties" labelWidth={25} tooltip={tooltip.queryBy}>
                  <TestResultsQueryBuilder
                    autoComplete={datasource.queryTestResultValues.bind(datasource)}
                    onChange={(event: any) => onResultsParameterChange(event.detail.linq)}
                    defaultValue={query.resultFilter}
                    workspaceList={workspaces}
                  />
                </InlineField>
                <InlineField label="Query by step properties" labelWidth={25} tooltip={tooltip.queryBy}>
                  <TestStepsQueryBuilder
                    autoComplete={datasource.queryStepsValues.bind(datasource)}
                    onChange={(event: any) => onStepsParameterChange(event.detail.linq)}
                    defaultValue={query.stepFilter}
                  />
                </InlineField>
              </>
            )}
          </div>
        </VerticalGroup>
        <VerticalGroup>
            <div style={{ paddingTop: query.type === ResultsQueryType.Results ? '160px' : '195px' }}>
            {(query.outputType === OutputType.Data) && (
              <>
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                <InlineField label="OrderBy" labelWidth={25} tooltip={tooltip.orderBy}>
                  <Select
                  options={OrderBy as SelectableValue[]}
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={OrderBy[0]}
                  width={25}
                  />
                </InlineField>
                <InlineField label="Descending" labelWidth={'auto'} tooltip={tooltip.descending}>
                  <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                  />
                </InlineField>
                </div>
                <InlineField label="Records to Query" labelWidth={25} tooltip={tooltip.recordCount}>
                <AutoSizeInput
                  minWidth={25}
                  maxWidth={40}
                  defaultValue={query.recordCount}
                  onCommitChange={recordCountChange}
                />
                </InlineField>
              </div>
              </>
            )}
            </div>

        </VerticalGroup>
      </HorizontalGroup>
    </>
  )
}

const tooltip = {
  metaData: 'Select the properties fields to query',
  queryType: 'Select the type of query to run',
  partNumber: 'Enter the part number to query',
  testProgram: 'Enter the test program name to query',
  workspace: 'Select the workspace to query',
  queryBy: 'Enter the query to filter the results',
  recordCount: 'Enter the number of records to query',
  orderBy: 'Select the field to order the results by',
  descending: 'Select to order the results in descending order',
  output: 'Select the output type for the query',
  useTimeRange: 'Use the time range instead for the selected field',
};

