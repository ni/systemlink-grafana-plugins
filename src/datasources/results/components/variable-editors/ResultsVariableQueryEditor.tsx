import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import React, { useEffect, useRef, useState } from 'react';
import { ResultsVariableProperties, ResultsVariableQuery } from 'datasources/results/types/QueryResults.types';
import { ResultsQueryBuilder } from '../query-builders/query-results/ResultsQueryBuilder';
import { Select } from '@grafana/ui';
import { Workspace } from 'core/types';
import { enumToOptions } from 'core/utils';
import { ResultsDataSourceOptions, ResultsQuery, TestMeasurementStatus } from 'datasources/results/types/types';
import { ResultsDataSource } from 'datasources/results/ResultsDataSource';

type Props = QueryEditorProps<ResultsDataSource, ResultsQuery, ResultsDataSourceOptions>;

export function ResultsVariableQueryEditor({ query, onChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const queryResultsquery = query as ResultsVariableQuery;
  const queryResultsDataSource = useRef(datasource.queryResultsDataSource);

  useEffect(() => { 
    const loadWorkspaces = async () => {
      await queryResultsDataSource.current.loadWorkspaces();
      setWorkspaces(Array.from(queryResultsDataSource.current.workspacesCache.values()));
    };
    const loadPartNumbers = async () => {
      await queryResultsDataSource.current.getPartNumbers();
      setPartNumbers(queryResultsDataSource.current.partNumbersCache);
    };

    loadWorkspaces();
    loadPartNumbers();
  }, [datasource]);

  const onPropertiesChange = (item: SelectableValue<string>) => {
    onChange({ ...queryResultsquery, properties: item.value } as ResultsVariableQuery);
  };

  const onQueryByChange = (value: string) => {
    onChange({ ...queryResultsquery, queryBy: value } as ResultsVariableQuery);
  };

  return (
    <>
      <InlineField label="Properties" labelWidth={25} tooltip={tooltips.properties}>
        <Select
          onChange={onPropertiesChange}
          options={ResultsVariableProperties as SelectableValue[]}
          value={queryResultsquery.properties}
          defaultValue={queryResultsquery.properties}
        ></Select>
      </InlineField>
      {(queryResultsquery.properties! === ResultsVariableProperties[0].value ||
        queryResultsquery.properties === ResultsVariableProperties[1].value) && (
        <InlineField label="Query by result properties" labelWidth={25} tooltip={tooltips.queryBy}>
          <ResultsQueryBuilder
            filter={queryResultsquery.queryBy}
            onChange={(event: any) => onQueryByChange(event.detail.linq)}
            workspaces={workspaces}
            partNumbers={partNumbers}
            status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
            globalVariableOptions={queryResultsDataSource.current.globalVariableOptions()}
          ></ResultsQueryBuilder>
        </InlineField>
      )}
    </>
  );
}

const tooltips = {
  queryBy: 'Apply a filter to the query results using this field.',
  properties: 'Select the property to return from the query.',
};
