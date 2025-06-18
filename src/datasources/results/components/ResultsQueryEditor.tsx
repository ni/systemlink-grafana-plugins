import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { defaultResultsQueryType, QueryType, ResultsDataSourceOptions, ResultsQuery } from '../types/types';
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

  const handleQueryChange = useCallback(
    (query: ResultsQuery, runQuery = true): void => {
      onChange(query);
      if (runQuery) {
        onRunQuery();
      }
    },
    [onChange, onRunQuery]
  );

  const handleQueryTypeChange = useCallback((queryType: QueryType): void => {
    if (queryType === QueryType.Results) {
      if(query.queryType === QueryType.Steps) {
        // Preserve the current steps query when switching from Steps to Results
        setStepsQuery(query as QuerySteps);
      }
      handleQueryChange({
        ...defaultResultsQuery,
        ...resultsQuery,
        queryType: QueryType.Results,
        refId: query.refId
      });
    }
    if (queryType === QueryType.Steps) {
      setResultsQuery(query as QueryResults);
      handleQueryChange({
        ...defaultStepsQuery,
        ...stepsQuery,
        refId: query.refId
      });
    }
  }, [query, resultsQuery, stepsQuery, handleQueryChange]);

  React.useEffect(() => {
    if (!query.queryType) {
      handleQueryTypeChange(defaultResultsQueryType);
    }
  }, [query.queryType, handleQueryTypeChange]);

  return (
    <>
      <InlineField label={labels.queryType} labelWidth={26} tooltip={tooltips.queryType}>
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
  queryType: 'This field specifies the query type to fetch results or steps data',
};

const labels = {
  queryType: 'Query type',
};
