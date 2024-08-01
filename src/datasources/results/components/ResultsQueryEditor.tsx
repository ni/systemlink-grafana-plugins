import React from 'react';
import { AutoSizeInput, HorizontalGroup, InlineFormLabel, InlineSwitch, LoadOptionsCallback, MultiSelect, RadioButtonGroup, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue, toOption } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { TestResultsDataSource } from '../ResultsDataSource';
import { MetaData, OutputType, ResultsQuery, ResultsQueryType, useTimeRange } from '../types';
import { enumToOptions, useWorkspaceOptions } from 'core/utils';
import { TestResultsQueryBuilder } from '../ResultsQueryBuilder';
import { TestStepsQueryBuilder } from '../StepsQueryBuilder';
import { OrderBy } from 'datasources/products/types';
import { getTemplateSrv } from '@grafana/runtime';
import _ from 'lodash';
import './resultsQueryEditor.scss'

type Props = QueryEditorProps<TestResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const workspaces = useWorkspaceOptions(datasource);
  const partNumber = query.partNumber;

  const onQueryTypeChange = (value: ResultsQueryType) => {
    onChange({ ...query, type: value });
    onRunQuery();
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    onChange({ ...query, orderBy: item.value });
    onRunQuery();
  }

  const onMetaDataChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      onChange({ ...query, metadata: items.map(i => i.value as MetaData) });
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

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
    onRunQuery();
  };

  const handleLoadPartNumberOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions());
    }

    loadPartNumberOptions(`PART_NUMBER`, query, undefined, cb);

  };

  const getVariableOptions = () => {
    return getTemplateSrv()
      .getVariables()
      .map(v => toOption('$' + v.name));
  };

  const handlePartNumberChange = (item: SelectableValue<string>) => {
    if (!item) {
      onChange({ ...query, partNumber: item });
      onRunQuery();
    }
    else if (query.partNumber !== item.value) {
      onChange({ ...query, partNumber: item.value! });
      onRunQuery();
    }
  };

  const loadPartNumberOptions = _.debounce((field: string, query: string, filter?: string, cb?: LoadOptionsCallback<string>) => {
    Promise.all([datasource.queryTestResultValues(field, query, filter)])
      .then(([partNumbers]) =>
        cb?.(
          partNumbers.map(partNumber => ({
            label: partNumber,
            value: partNumber,
            title: partNumber,
          }))
        )
      )
  }, 300);

  const handleLoadTestProgramOptions = (query: string, cb?: LoadOptionsCallback<string>) => {
    if (!query || query.startsWith('$')) {
      return cb?.(getVariableOptions());
    }

    const filter = partNumber ? `partNumber = (\"${partNumber}\")` : ''

    loadPartNumberOptions('PROGRAM_NAME', query, filter, cb);

  };

  const handleTestProgramChange = (item: SelectableValue<string>) => {
    if (!item) {
      onChange({ ...query, testProgram: item });
      onRunQuery();
    }
    else if (query.testProgram !== item.value) {
      onChange({ ...query, testProgram: item.value! });
      onRunQuery();
    }
  };

  const onUseTimeRangeChecked = (value: boolean) => {
    onChange({ ...query, useTimeRange: value });
  }

  const onShowMeasurementChecked = (value: boolean) => {
    onChange({ ...query, measurementAsEntries: value });
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

  return (
    <>
      <HorizontalGroup spacing='lg' align='flex-start'>
        <VerticalGroup>
          <div>
            <InlineField label="Query type" labelWidth={20} tooltip={tooltip.queryType}>
              <RadioButtonGroup
                options={enumToOptions(ResultsQueryType)}
                value={query.type}
                onChange={onQueryTypeChange}
              />
            </InlineField>
            {(query.type === ResultsQueryType.MetaData || query.type === ResultsQueryType.DataTables) && (
              <>
                <InlineField label="Output" labelWidth={20} tooltip={tooltip.output}>
                  <RadioButtonGroup
                    options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
                    value={query.outputType}
                    onChange={onOutputChange}
                  />
                </InlineField>
              </>
            )}
          </div>
          <div>
            {(query.type === ResultsQueryType.StepData || query.outputType === OutputType.Data && query.type === ResultsQueryType.MetaData) && (
              <>
                <InlineField label="Metadata" labelWidth={20} tooltip={tooltip.metaData}>
                  <MultiSelect
                    placeholder='Select Metadata'
                    options={Object.keys(MetaData).map(value => ({ label: value, value })) as SelectableValue[]}
                    onChange={onMetaDataChange}
                    value={query.metadata}
                    defaultValue={query.metadata!}
                    width={40}
                    closeMenuOnSelect={false}
                  />
                </InlineField>
              </>
            )}
            <InlineField label="Workspace" labelWidth={20} tooltip={tooltip.workspace}>
              <Select
                isClearable
                isLoading={workspaces.loading}
                onChange={onWorkspaceChange}
                options={workspaces.value}
                placeholder="Any workspace"
                value={query.workspace}
              />
            </InlineField>
            {query.type === ResultsQueryType.StepData && (
              <>
                {/* <InlineField label="Step Name" labelWidth={20} tooltip={tooltip.testProgram}>
                  <AutoSizeInput
                    minWidth={30}
                    defaultValue={query.testProgram}
                    onCommitChange={handleTestProgramChange}
                    placeholder="Step Name"
                    value={query.testProgram}
                  />
                </InlineField> */}
                <InlineField
                  label="Show measurements"
                  tooltip={tooltip.useTimeRange}
                  labelWidth={'auto'}
                >
                  <InlineSwitch
                    onChange={event => onShowMeasurementChecked(event.currentTarget.checked)}
                    value={query.measurementAsEntries} />
                </InlineField>
              </>
            )}
          </div>
          <div>
            {(query.type === ResultsQueryType.StepData || query.outputType === OutputType.Data) && (
              <>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <InlineField label="OrderBy" labelWidth={20} tooltip={tooltip.orderBy}>
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
                  <InlineField label="Records to Query" labelWidth={20} tooltip={tooltip.recordCount}>
                    <AutoSizeInput
                      minWidth={20}
                      maxWidth={40}
                      defaultValue={query.recordCount}
                      onCommitChange={recordCountChange}
                    />
                  </InlineField>
                </div>
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField
                label="Use time range"
                tooltip={tooltip.useTimeRange}
                labelWidth={20}
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
          </div>
        </VerticalGroup>
        <VerticalGroup>
          <div>
            {(query.type === ResultsQueryType.MetaData || query.type === ResultsQueryType.DataTables) && (
              <>
                <InlineFormLabel tooltip={tooltip.queryBy}> Query by </InlineFormLabel>
                <TestResultsQueryBuilder
                  autoComplete={datasource.queryTestResultValues.bind(datasource)}
                  onChange={(event: any) => onQueryByChange(event.detail.linq)}
                  defaultValue={query.queryBy}
                />
              </>
            )}
            {query.type === ResultsQueryType.StepData && (
              <>
                <InlineFormLabel width={'auto'}> Query by result metadata </InlineFormLabel>
                <TestResultsQueryBuilder
                  autoComplete={datasource.queryTestResultValues.bind(datasource)}
                  onChange={(event: any) => onResultsParameterChange(event.detail.linq)}
                  defaultValue={query.resultFilter}
                />
                <InlineFormLabel width={'auto'} className='queryBuilder-toggle-button'> Query by step metadata
                  <InlineSwitch
                    height={'auto'}
                    onChange={event => onShowMeasurementChecked(event.currentTarget.checked)}
                    value={query.measurementAsEntries} /> </InlineFormLabel>
                <TestStepsQueryBuilder
                  autoComplete={datasource.queryStepsValues.bind(datasource)}
                  onChange={(event: any) => onStepsParameterChange(event.detail.linq)}
                  defaultValue={query.stepFilter}
                />
              </>
            )}
          </div>
        </VerticalGroup>
      </HorizontalGroup>
    </>
  )
}

const tooltip = {
  metaData: 'Select the metadata fields to query',
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

