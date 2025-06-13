import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { QueryType, ResultsDataSourceOptions, ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';
import { defaultResultsQuery, defaultStepsQuery } from '../defaultQueries';
import { InlineField, RadioButtonGroup } from '@grafana/ui';
import { QueryStepsEditor } from './editors/query-steps/QueryStepsEditor';
import { QuerySteps } from '../types/QuerySteps.types';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [resultsQuery, setResultsQuery] = React.useState<QueryResults>();
  const [stepsQuery, setStepsQuery] = React.useState<QuerySteps>();

  query = datasource.prepareQuery(query);
  console.log('query', query);

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
      setStepsQuery(query as QuerySteps);
      handleQueryChange({ ...defaultResultsQuery, ...resultsQuery, refId: query.refId});
    }
    if (queryType === QueryType.Steps) {
      setResultsQuery(query as QueryResults);
      handleQueryChange({...defaultStepsQuery, ...stepsQuery, refId: query.refId});
    }
  }, [query, resultsQuery, stepsQuery, handleQueryChange]);

  return (
    <>
      <InlineField label="Query Type" labelWidth={26} tooltip={tooltips.queryType}>
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
          datasource={datasource.queryResultsDataSource}
        />
      )}
      {query.queryType === QueryType.Steps && (
        <QueryStepsEditor
          query={query as QuerySteps} 
          handleQueryChange={handleQueryChange}
          datasource={datasource.queryStepsDataSource}
        />
      )}
    </>
  );
}

const tooltips = {
  queryType: 'This field specifies the query type to fetch results or steps data'
};
