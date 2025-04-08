import React, { useCallback } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';

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

  return (
    <QueryResultsEditor
      query={query as QueryResults} 
      handleQueryChange={handleQueryChange}
    />
  );
}
