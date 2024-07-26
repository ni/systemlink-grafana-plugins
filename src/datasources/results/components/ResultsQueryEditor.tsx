import React from 'react';
import { InlineFormLabel, InlineSwitch, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { ResultsDataSource } from '../ResultsDataSource';
import { OutputType, ResultsQuery, ResultsQueryType, useTimeRange } from '../types';
import { enumToOptions } from 'core/utils';
import { TestResultsQueryBuilder } from '../ResultsQueryBuilder';
import { TestStepsQueryBuilder } from '../StepsQueryBuilder';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const onQueryTypeChange = (value: ResultsQueryType) => {
    onChange({...query, type: value });
    onRunQuery();
  };

  const onUseTimeRangeChecked = (value: boolean) => {
    onChange({...query, useTimeRange: value });
    onRunQuery();
  }

  const onUseTimeRangeChanged = (value: SelectableValue<string>) => {
    onChange({...query, useTimeRangeFor: value.value! });
    onRunQuery();
  }

  const onOutputChange = (value: OutputType) => {
    onChange({...query, outputType: value });
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
    <InlineField label="Query type" labelWidth={15} tooltip={tooltip.queryType}>
      <RadioButtonGroup
        options={enumToOptions(ResultsQueryType)}
        value={query.type}
        onChange={onQueryTypeChange}
      />
    </InlineField>
    {query.type === ResultsQueryType.MetaData && (
      <>
        <InlineField label="Output" labelWidth={15} tooltip={tooltip.output}>
        <RadioButtonGroup
          options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
          value={query.outputType}
          onChange={onOutputChange}
        />
        </InlineField>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InlineField label="Use time range for" tooltip={tooltip.useTimeRange}>
            <InlineSwitch
              onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
              value={query.useTimeRange} />
          </InlineField>
          <Select
            options={enumToOptions(useTimeRange)}
            onChange={onUseTimeRangeChanged}
            value={query.useTimeRangeFor}
            width={25}
            disabled={!query.useTimeRange} />
        </div>
      </>
      )
    }
    {query.type === ResultsQueryType.StepData && (
      <>
        <br></br>
        <InlineFormLabel width={40}> Query by result metadata </InlineFormLabel>
        <TestResultsQueryBuilder 
            autoComplete={datasource.queryTestResultValues.bind(datasource)}
            onChange={(event: any) => onResultsParameterChange(event.detail.linq) }
            defaultValue={query.resultFilter}/>
        <br></br>
        <InlineFormLabel  width={40}> Query by step metadata </InlineFormLabel>
        <TestStepsQueryBuilder 
            autoComplete={datasource.queryStepsValues.bind(datasource)}
            onChange={(event: any) => onStepsParameterChange(event.detail.linq) }
            defaultValue={query.stepFilter}/>
        </>
    )}
    </>
  );
}

const tooltip = {
  queryType: 'Select the type of query to run',
  output: 'Select the output type for the query',
  useTimeRange: 'Use the time range instead for the selected field',
};

