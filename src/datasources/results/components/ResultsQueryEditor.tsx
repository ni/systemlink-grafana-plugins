import React, { useCallback } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { ResultsQuery } from '../types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  query = datasource.prepareQuery(query);

  const handleQueryChange = useCallback(
    (query: ResultsQuery, runQuery?: boolean): void => {
      onChange(query);
      runQuery = runQuery !== undefined ? runQuery : true;
      console.log('runQuery', runQuery);
      if (runQuery) {
        console.log('called onRunQuery');
        onRunQuery();
      }
    },[onChange, onRunQuery]
  );

  return (
    <QueryResultsEditor
      query={query} 
      handleQueryChange={handleQueryChange}
    />
  );
}
