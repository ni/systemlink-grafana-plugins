import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { InlineField, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
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
    <VerticalGroup>
      <InlineField label="Query Type" labelWidth={18} tooltip={tooltips.queryType}>
        <RadioButtonGroup
          options={Object.values(QueryType).map(value => ({ label: value, value })) as SelectableValue[]}
          value={query.queryType}
        />
      </InlineField>
      {query.queryType === QueryType.Results && (
        <QueryResultsEditor 
          query={query as QueryResults} 
          handleQueryChange={handleQueryChange} 
        />
      )}
    </VerticalGroup>
  );
}

const tooltips = {
  queryType: 'Specifies the query type to fetch results or steps-related data'
};
