import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import React from 'react';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { ResultsVariableProperties, ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { ResultsQueryBuilder } from '../query-builders/query-results/ResultsQueryBuilder';
import { Select } from '@grafana/ui';

type Props = QueryEditorProps<QueryResultsDataSource, ResultsVariableQuery>;

export function ResultsVariableQueryEditor({ query, onChange, datasource }: Props) {
  const onPropertiesChange = (item: SelectableValue<string>) => {
    onChange({ ...query, properties: item.value });
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...query, queryBy: value });
  };

  return (
    <>
      <InlineField label="Properties" labelWidth={12} tooltip={tooltips.properties}>
        <Select 
            onChange={onPropertiesChange}
            options={ResultsVariableProperties as SelectableValue[]}
            value={query.properties}
            defaultValue={query.properties}
        ></Select>
      </InlineField>
      <InlineField label="Query By" labelWidth={12} tooltip={tooltips.queryBy}>
        <ResultsQueryBuilder
          filter={query.queryBy}
          onChange={(event: any) => onQueryByChange(event.detail.linq)}
          workspaces={[]}
          partNumbers={[]}
          status={[]}
          globalVariableOptions={datasource.globalVariableOptions()}
        ></ResultsQueryBuilder>
      </InlineField>
    </>
  );
}

const tooltips = {
  queryBy: 'Specifies the filter to be applied on the queried products.',
  properties: "Select the properties to be included in the query.",
};
