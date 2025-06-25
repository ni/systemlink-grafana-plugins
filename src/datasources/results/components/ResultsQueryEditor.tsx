import React, { useCallback } from 'react';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ResultsDataSource } from '../ResultsDataSource';
import { defaultResultsQueryType, QueryType, ResultsQuery } from '../types/types';
import { QueryResultsEditor } from './editors/query-results/QueryResultsEditor';
import { QueryResults } from '../types/QueryResults.types';
import { defaultResultsQuery, defaultStepsQuery } from '../defaultQueries';
import { InlineField, RadioButtonGroup } from '@grafana/ui';
import { QueryStepsEditor } from './editors/query-steps/QueryStepsEditor';
import { QuerySteps } from '../types/QuerySteps.types';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery>;

export function ResultsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [resultsQuery, setResultsQuery] = React.useState<QueryResults>();
  const [stepsQuery, setStepsQuery] = React.useState<QuerySteps>();

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
    switch (queryType) {
      case QueryType.Results:
        // Preserve the current steps query when switching from Steps to Results
        if (query.queryType === QueryType.Steps) {
          setStepsQuery(query as QuerySteps);
        }
        handleQueryChange({
          ...query,
          queryType,
          ...defaultResultsQuery,
          ...resultsQuery,
          refId: query.refId,
        });
        break;
      case QueryType.Steps:
        // Preserve results query state when switching from Results to Steps
        if (query.queryType === QueryType.Results) {
          setResultsQuery(query as QueryResults);
        }
        handleQueryChange({
          ...query,
          queryType,
          ...defaultStepsQuery,
          ...stepsQuery,
          refId: query.refId,
        });
        break;
      default:
        break;
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
