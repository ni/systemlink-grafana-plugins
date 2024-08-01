import { HorizontalGroup, InlineField, InlineFormLabel, RadioButtonGroup, Select, VerticalGroup } from "@grafana/ui";
import { enumToOptions, useWorkspaceOptions } from "core/utils";
import React from "react";
import { ResultsQueryType, ResultsVariableQuery } from "../types";
import { TestResultsDataSource } from "../ResultsDataSource";
import { TestResultsQueryBuilder } from "../ResultsQueryBuilder";
import { TestStepsQueryBuilder } from "../StepsQueryBuilder";
import { SelectableValue } from "@grafana/data";

interface Props {
  query: ResultsVariableQuery;
  onChange: (query: ResultsVariableQuery) => void;
  datasource: TestResultsDataSource;
}


export function ResultsVariableQueryEditor({ onChange, query, datasource }: Props) {
  const workspaces = useWorkspaceOptions(datasource);


  const onQueryTypeChange = (value: ResultsQueryType) => {
    onChange({ ...query, type: value });
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
  };

  const onWorkspaceChange = (option?: SelectableValue<string>) => {
    onChange({ ...query, workspace: option?.value ?? '' });
  };

  const onResultsParameterChange = (value: string) => {
    onChange({ ...query, resultFilter: value });
  };

  const onStepsParameterChange = (value: string) => {
    onChange({ ...query, stepFilter: value });
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
            <InlineField label="Workspace" labelWidth={20} tooltip={tooltip.workspace}>
              <Select
                isClearable
                isLoading={workspaces.loading}
                onChange={onWorkspaceChange}
                options={workspaces.value}
                placeholder="Any workspace"
                value={query.workspace}
                defaultValue={workspaces.value ? workspaces.value[0] : undefined}
              />
            </InlineField>
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
                <InlineFormLabel width={'auto'}> Query by step metadata </InlineFormLabel>
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
  queryType: 'Select the type of query to run',
  workspace: 'Select the workspace to query',
  queryBy: 'Enter the query to filter the results',
  useTimeRange: 'Use the time range instead for the selected field',
};