import React, { useCallback } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';
import { defaultResultsEditorValue, defaultStepsEditorValue } from '../defaults';
import { QueryStepsEditor } from './editors/query-steps/QueryStepsEditor';
import { QuerySteps } from '../types/QuerySteps.types';

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

  const handleQueryTypeChange = useCallback((value: QueryType): void => {
    if (value === QueryType.Results) {
      handleQueryChange({ ...query, queryType: QueryType.Results, ...defaultResultsEditorValue}, true);
    }
    if (value === QueryType.Steps) {
      handleQueryChange({ ...query, queryType: QueryType.Steps, ...defaultStepsEditorValue }, true);
    }
  }, [query, handleQueryChange]);

  return (
    <VerticalGroup>
      <InlineField label="Query Type" labelWidth={18} tooltip={tooltips.queryType}>
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
