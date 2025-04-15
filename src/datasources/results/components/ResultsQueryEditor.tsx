import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';
import { defaultResultsQuery, defaultStepsQuery } from '../defaultQueries';
import { QueryStepsEditor } from './editors/query-steps/QueryStepsEditor';
import { QuerySteps } from '../types/QuerySteps.types';
import { InlineField, RadioButtonGroup, VerticalGroup } from '@grafana/ui';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: ResultsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },[onChange, onRunQuery]
  );

  const handleQueryTypeChange = useCallback((queryType: QueryType): void => {
    if (queryType === QueryType.Results) {
      handleQueryChange({ ...query, queryType: QueryType.Results, ...defaultResultsQuery}, true);
    }
    if (queryType === QueryType.Steps) {
      handleQueryChange({ ...query, queryType: QueryType.Steps, ...defaultStepsQuery }, true);
    }
  }, [query, handleQueryChange]);

  return (
    <VerticalGroup>
      <InlineField label="Query Type" labelWidth={25} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={Object.values(QueryType).map(value => ({ label: value, value })) as SelectableValue[]}
          value={query.queryType}
          onChange={handleQueryTypeChange}
        />
      </InlineField>
      {query.queryType === QueryType.Results && (
        <QueryResultsEditor 
          query={query as QueryResults} 
          handleQueryChange={handleQueryChange}
        />
      )}
      {query.queryType === QueryType.Steps && (
        <QueryStepsEditor 
          query={query as QuerySteps} 
          handleQueryChange={handleQueryChange}
        />
      )}
    </VerticalGroup>
  );
}

const tooltips = {
  queryType: 'Specifies the query type to fetch results or steps-related data'
};
