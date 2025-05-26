import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import React, { useEffect, useRef, useState } from 'react';
import {
  ResultsVariableProperties,
  ResultsVariableQuery,
  StepsVariableQuery,
} from 'datasources/results/types/QueryResults.types';
import { ResultsQueryBuilder } from '../query-builders/query-results/ResultsQueryBuilder';
import { AutoSizeInput, RadioButtonGroup, Select } from '@grafana/ui';
import { Workspace } from 'core/types';
import { enumToOptions, validateNumericInput } from 'core/utils';
import {
  QueryType,
  ResultsDataSourceOptions,
  ResultsQuery,
  TestMeasurementStatus,
} from 'datasources/results/types/types';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';
import { StepsQueryBuilderWrapper } from '../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';
import { ResultsDataSourceBase } from 'datasources/results/ResultsDataSourceBase';
import { TAKE_LIMIT } from 'datasources/results/constants/QuerySteps.constants';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>;

export function ResultsVariableQueryEditor({ query, onChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [isQueryBuilderDisabled, disableStepsQueryBuilder] = useState<boolean>(true);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const queryResultsquery = query as ResultsVariableQuery;
  const stepsVariableQuery = query as StepsVariableQuery;
  const queryResultsDataSource = useRef(datasource.queryResultsDataSource);
  const queryStepsDatasource = useRef(datasource.queryStepsDataSource);

  useEffect(() => {
    if (!query.queryType) {
      onChange({ ...query, queryType: QueryType.Results, take: 1000 } as ResultsVariableQuery);
      return;
    }
    if (query.queryType === QueryType.Steps) {
      const stepsQuery = query as StepsVariableQuery;
      if (stepsQuery.take === undefined || Number.isNaN(stepsQuery.take)) {
        onChange({ ...stepsQuery, take: 1000 } as StepsVariableQuery);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await ResultsDataSourceBase.workspacesPromise;
      workspaces ? setWorkspaces(Array.from(workspaces.values())) : setWorkspaces([]);
    };
    const loadPartNumbers = async () => {
      const partNumbers = await ResultsDataSourceBase.partNumbersPromise;
      partNumbers ? setPartNumbers(partNumbers) : setPartNumbers([]);
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

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    switch (true) {
      case isNaN(value) || value <= 0:
        setRecordCountInvalidMessage('Enter a value greater than 0');
        break;
      case value > TAKE_LIMIT:
        setRecordCountInvalidMessage('Enter a value less than or equal to 10,000');
        break;
      default:
        setRecordCountInvalidMessage('');
        break;
    }
    onChange({ ...stepsVariableQuery, take: value } as StepsVariableQuery);
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
        <>
          <StepsQueryBuilderWrapper
            datasource={queryStepsDatasource.current}
            resultsQuery={stepsVariableQuery.queryByResults}
            stepsQuery={stepsVariableQuery.queryBySteps}
            onResultsQueryChange={(value: string) => onResultsQueryChange(value)}
            onStepsQueryChange={(value: string) => onStepsQueryChange(value)}
            disableStepsQueryBuilder={isQueryBuilderDisabled}
          />
          <InlineField
            label="Take"
            labelWidth={26}
            tooltip={tooltips.take}
            invalid={!!recordCountInvalidMessage}
            error={recordCountInvalidMessage}
          >
            <AutoSizeInput
              minWidth={25}
              maxWidth={25}
              type="number"
              defaultValue={stepsVariableQuery.take ? stepsVariableQuery.take : 1000}
              onCommitChange={recordCountChange}
              placeholder="Enter record count"
              onKeyDown={event => {
                validateNumericInput(event);
              }}
            />
          </InlineField>
        </>
      )}
    </>
  );
}

const tooltips = {
  queryType: 'This field specifies the query type to return as either results data or steps data.',
  take: 'This field sets the maximum number of steps to return.',
  queryBy: 'This field applies a filter to the query results.',
  properties: 'This field specifies the property to return from the query.',
};
