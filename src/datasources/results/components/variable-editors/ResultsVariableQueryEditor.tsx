import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import React, { useEffect, useRef, useState } from 'react';
import {
  ResultsVariableProperties,
  ResultsVariableQuery,
  StepsVariableQuery,
} from 'datasources/results/types/QueryResults.types';
import { ResultsQueryBuilder } from '../query-builders/query-results/ResultsQueryBuilder';
import { RadioButtonGroup, Select } from '@grafana/ui';
import { Workspace } from 'core/types';
import { enumToOptions } from 'core/utils';
import {
  QueryType,
  ResultsDataSourceOptions,
  ResultsQuery,
  TestMeasurementStatus,
} from 'datasources/results/types/types';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';
import { StepsQueryBuilderWrapper } from '../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>;

export function ResultsVariableQueryEditor({ query, onChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [isQueryBuilderDisabled, disableStepsQueryBuilder] = useState<boolean>(true);
  const queryResultsquery = query as ResultsVariableQuery;
  const stepsVariableQuery = query as StepsVariableQuery;
  const queryResultsDataSource = useRef(datasource.queryResultsDataSource);
  const queryStepsDatasource = useRef(datasource.queryStepsDataSource);

  useEffect(() => {
    if(!query.queryType) {
      onChange({
        ...query,
        queryType: QueryType.Results,
      } as ResultsVariableQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const loadWorkspaces = async () => {
      await queryResultsDataSource.current.loadWorkspaces();
      setWorkspaces(Array.from(queryResultsDataSource.current.workspacesCache.values()));
    };
    const loadPartNumbers = async () => {
      await queryResultsDataSource.current.getPartNumbers();
      setPartNumbers(queryResultsDataSource.current.partNumbersCache);
    };

    loadWorkspaces();
    loadPartNumbers();
  }, [datasource]);

  const onQueryTypeChange = (queryType: QueryType) => {
    if (queryType === QueryType.Results) {
      onChange({ ...queryResultsquery, queryType } as ResultsVariableQuery);
    } else if (queryType === QueryType.Steps) {
      onChange({ ...stepsVariableQuery, queryType } as StepsVariableQuery);
    }
  };

  const onPropertiesChange = (item: SelectableValue<string>) => {
    onChange({ ...queryResultsquery, properties: item.value } as ResultsVariableQuery);
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...queryResultsquery, queryBy: value } as ResultsVariableQuery);
  };

  const onResultsQueryChange = (resultsQuery: string) => {
    disableStepsQueryBuilder(resultsQuery === '');
    onChange({ ...queryResultsquery, queryByResults: resultsQuery } as ResultsVariableQuery);
  };

  const onStepsQueryChange = (stepsQuery: string) => {
    onChange({ ...stepsVariableQuery, queryBySteps: stepsQuery } as StepsVariableQuery);
  };

  return (
    <>
      <InlineField label="Query Type" labelWidth={26} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={Object.values(QueryType).map(value => ({ label: value, value })) as SelectableValue[]}
          value={query.queryType}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      {query.queryType === QueryType.Results && (
        <>
          <InlineField label="Properties" labelWidth={26} tooltip={tooltips.properties}>
            <Select
              onChange={onPropertiesChange}
              options={ResultsVariableProperties as SelectableValue[]}
              value={queryResultsquery.properties}
              defaultValue={queryResultsquery.properties}
            ></Select>
          </InlineField>
          {(queryResultsquery.properties! === ResultsVariableProperties[0].value ||
            queryResultsquery.properties === ResultsVariableProperties[1].value) && (
            <InlineField label="Query by results properties" labelWidth={26} tooltip={tooltips.queryBy}>
              <ResultsQueryBuilder
                filter={queryResultsquery.queryBy}
                onChange={(event: any) => onQueryByChange(event.detail.linq)}
                workspaces={workspaces}
                partNumbers={partNumbers}
                status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                globalVariableOptions={queryResultsDataSource.current.globalVariableOptions()}
              ></ResultsQueryBuilder>
            </InlineField>
          )}
        </>
      )}
      {query.queryType === QueryType.Steps && (
        <StepsQueryBuilderWrapper
          datasource={queryStepsDatasource.current}
          resultsQuery={stepsVariableQuery.queryByResults}
          stepsQuery={stepsVariableQuery.queryBySteps}
          onResultsQueryChange={(value: string) => onResultsQueryChange(value)}
          onStepsQueryChange={(value: string) => onStepsQueryChange(value)}
          disableStepsQueryBuilder={isQueryBuilderDisabled}
        />
      )}
    </>
  );
}

const tooltips = {
  queryType: 'This field specifies the query type to fetch results or steps data',
  queryBy: 'Apply a filter to the query results using this field.',
  properties: 'Select the property to return from the query.',
};
