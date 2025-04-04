import React, { useCallback, useState } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';
import { InlineField, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
import { ResultsDefaults, StepsDefaults } from '../defaults';

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
      handleQueryChange({ ...query, queryType: QueryType.Results, ...ResultsDefaults}, true);
    }
    if (value === QueryType.Steps) {
      handleQueryChange({ ...query, queryType: QueryType.Steps, ...StepsDefaults }, true);
    }
  }, [query, handleQueryChange]);

  return (
    <VerticalGroup>
      <InlineField label="Query Type" labelWidth={18}>
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
    </VerticalGroup>
  );
}
