import { InlineField, RadioButtonGroup } from "@grafana/ui";
import { enumToOptions } from "core/utils";
import React from "react";
import { ResultsVariableQuery, ResultsVariableQueryType } from "../types";
import { TestResultsDataSource } from "../ResultsDataSource";
import { TestResultsQueryBuilder } from "../ResultsQueryBuilder";
import { TestStepsQueryBuilder } from "../StepsQueryBuilder";

interface Props {
  query: ResultsVariableQuery;
  onChange: (query: ResultsVariableQuery) => void;
  datasource: TestResultsDataSource;
}


export function ResultsVariableQueryEditor({ onChange, query, datasource }: Props) {
  const onQueryTypeChange = (value: ResultsVariableQueryType) => {
    onChange({ ...query, type: value });
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
  };

  const onResultsParameterChange = (value: string) => {
    onChange({ ...query, resultFilter: value });
  };

  const onStepsParameterChange = (value: string) => {
    onChange({ ...query, stepFilter: value });
  }

  return (
    <>
      <InlineField label="Query type" labelWidth={20} tooltip={tooltip.queryType}>
        <RadioButtonGroup
          options={enumToOptions(ResultsVariableQueryType)}
          value={query.type}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      {(query.type === ResultsVariableQueryType.Results || query.type === ResultsVariableQueryType.DataTables) && (
        <>
          <InlineField label="Query by" tooltip={tooltip.queryBy} labelWidth={20}>

            <TestResultsQueryBuilder
              autoComplete={datasource.queryTestResultValues.bind(datasource)}
              onChange={(event: any) => onQueryByChange(event.detail.linq)}
              defaultValue={query.queryBy}
            />
          </InlineField>
        </>
      )}
      {query.type === ResultsVariableQueryType.Steps && (
        <>
          <InlineField label="Query by result properties" labelWidth={'auto'}>
            <TestResultsQueryBuilder
              autoComplete={datasource.queryTestResultValues.bind(datasource)}
              onChange={(event: any) => onResultsParameterChange(event.detail.linq)}
              defaultValue={query.resultFilter}
            />
          </InlineField>
          <InlineField label="Query by step properties" labelWidth={'auto'}>
            <TestStepsQueryBuilder
              autoComplete={datasource.queryStepsValues.bind(datasource)}
              onChange={(event: any) => onStepsParameterChange(event.detail.linq)}
              defaultValue={query.stepFilter}
            />
          </InlineField>
        </>
      )}

    </>
  )
}

const tooltip = {
  queryType: 'Select the type of query to run',
  workspace: 'Select the workspace to query',
  queryBy: 'Enter the query to filter the results',
  useTimeRange: 'Use the time range instead for the selected field',
};
