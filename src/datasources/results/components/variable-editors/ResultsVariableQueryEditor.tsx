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
import { TAKE_LIMIT } from 'datasources/results/constants/QuerySteps.constants';
import { FloatingError } from 'core/errors';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>;

export function ResultsVariableQueryEditor({ query, onChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [isQueryBuilderDisabled, disableStepsQueryBuilder] = useState<boolean>(true);
  const [stepsRecordCountInvalidMessage, setStepsRecordCountInvalidMessage] = useState<string>('');
  const [resultsRecordCountInvalidMessage, setResultsRecordCountInvalidMessage] = useState<string>('');
  const queryResultsquery = query as ResultsVariableQuery;
  const stepsVariableQuery = query as StepsVariableQuery;
  const queryResultsDataSource = useRef(datasource.queryResultsDataSource);
  const queryStepsDatasource = useRef(datasource.queryStepsDataSource);

  useEffect(() => {
    if (!query.queryType) {
      onChange({ ...query, queryType: QueryType.Results, stepsTake: 1000, resultsTake: 1000 } as ResultsVariableQuery);
      return;
    }
    if (query.queryType === QueryType.Steps) {
      const stepsQuery = query as StepsVariableQuery;
      if (stepsQuery.stepsTake === undefined || Number.isNaN(stepsQuery.stepsTake)) {
        onChange({ ...stepsQuery, stepsTake: 1000 } as StepsVariableQuery);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await queryResultsDataSource.current.workspacesCache;
      setWorkspaces(Array.from(workspaces.values()));
    };
    const loadPartNumbers = async () => {
      const partNumbers = await queryResultsDataSource.current.partNumbersCache;
      setPartNumbers(partNumbers);
    };
    loadPartNumbers();
    loadWorkspaces();
  }, [datasource]);

  useEffect(() => {
    disableStepsQueryBuilder(
      stepsVariableQuery.queryByResults === '' 
      || stepsVariableQuery.queryByResults === undefined
    );
  }, [stepsVariableQuery.queryByResults]);

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
    onChange({ ...stepsVariableQuery, queryByResults: resultsQuery } as StepsVariableQuery);
  };

  const onStepsQueryChange = (stepsQuery: string) => {
    onChange({ ...stepsVariableQuery, queryBySteps: stepsQuery } as StepsVariableQuery);
  };

  const onStepsRecordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    setStepsRecordCountInvalidMessage(validateRecordCount(value, TAKE_LIMIT));
    onChange({ ...stepsVariableQuery, stepsTake: value } as StepsVariableQuery);
  };

  const onResultsRecordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    setResultsRecordCountInvalidMessage(validateRecordCount(value, TAKE_LIMIT));
    onChange({ ...queryResultsquery, resultsTake: value } as ResultsVariableQuery);
  };

  function validateRecordCount(value: number, takeLimit: number): string {
    if (Number.isNaN(value) || value <= 0) {
      return 'Enter a value greater than 0';
    }
    if (value > takeLimit) {
      return `Enter a value less than or equal to ${takeLimit.toLocaleString()}`;
    }
    return '';
  }

  return (
    <>
      <InlineField label={labels.queryType} labelWidth={26} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={Object.values(QueryType).map(value => ({ label: value, value })) as SelectableValue[]}
          value={query.queryType}
          onChange={onQueryTypeChange}
        />
      </InlineField>
      {query.queryType === QueryType.Results && (
        <>
          <InlineField label={labels.properties} labelWidth={26} tooltip={tooltips.properties}>
            <Select
              onChange={onPropertiesChange}
              options={ResultsVariableProperties as SelectableValue[]}
              value={queryResultsquery.properties}
              defaultValue={queryResultsquery.properties}
            ></Select>
          </InlineField>
          {(queryResultsquery.properties! === ResultsVariableProperties[0].value ||
            queryResultsquery.properties === ResultsVariableProperties[1].value) && (
            <>
              <InlineField label={labels.queryByResults} labelWidth={26} tooltip={tooltips.queryBy}>
                <ResultsQueryBuilder
                  filter={queryResultsquery.queryBy}
                  onChange={(event: any) => onQueryByChange(event.detail.linq)}
                  workspaces={workspaces}
                  status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                  partNumbers={partNumbers}
                  globalVariableOptions={queryResultsDataSource.current.globalVariableOptions()}
                ></ResultsQueryBuilder>
              </InlineField>
              <InlineField
                label={labels.take}
                labelWidth={26}
                tooltip={tooltips.resultsTake}
                invalid={!!resultsRecordCountInvalidMessage}
                error={resultsRecordCountInvalidMessage}
              >
                <AutoSizeInput
                  minWidth={25}
                  maxWidth={25}
                  type="number"
                  defaultValue={queryResultsquery.resultsTake}
                  onCommitChange={onResultsRecordCountChange}
                  placeholder={placeholders.take}
                  onKeyDown={event => {
                    validateNumericInput(event);
                  }}
                />
              </InlineField>
            </>
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
            label={labels.take}
            labelWidth={26}
            tooltip={tooltips.stepsTake}
            invalid={!!stepsRecordCountInvalidMessage}
            error={stepsRecordCountInvalidMessage}
          >
            <AutoSizeInput
              minWidth={25}
              maxWidth={25}
              type="number"
              defaultValue={stepsVariableQuery.stepsTake}
              onCommitChange={onStepsRecordCountChange}
              placeholder={placeholders.take}
              onKeyDown={event => {
                validateNumericInput(event);
              }}
            />
          </InlineField>
        </>
      )}
      <FloatingError
        message={queryResultsDataSource.current.errorTitle}
        innerMessage={queryResultsDataSource.current.errorDescription}
        severity="warning"
      />
    </>
  );
}

const tooltips = {
  queryType: 'This field specifies the query type to return as either results data or steps data.',
  stepsTake: 'This field sets the maximum number of steps to return.',
  resultsTake: 'This field sets the maximum number of results to return.',
  queryBy: 'This field applies a filter to the query results.',
  properties: 'This field specifies the property to return from the query.',
};

const labels = {
  queryType: 'Query type',
  properties: 'Properties',
  queryByResults: 'Query by results properties',
  take: 'Take',
};

const placeholders = {
  take: 'Enter record count',
};
