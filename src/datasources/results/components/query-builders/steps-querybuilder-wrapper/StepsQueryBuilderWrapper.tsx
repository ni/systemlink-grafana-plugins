import React, { useEffect, useState } from 'react';
import { useTheme2, InlineField } from '@grafana/ui';
import { ResultsQueryBuilder } from '../query-results/ResultsQueryBuilder';
import { StepsQueryBuilder } from '../query-steps/StepsQueryBuilder';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { Workspace } from 'core/types';
import { enumToOptions } from 'core/utils';
import { TestMeasurementStatus } from 'datasources/results/types/types';
import { QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

type Props = QueryBuilderProps &
React.HTMLAttributes<Element> & {
  datasource: QueryStepsDataSource;
  resultsQuery: string;
  stepsQuery?: string;
  onResultsQueryChange: (query: string) => void;
  onStepsQueryChange: (query: string) => void;
  disableStepsQueryBuilder: boolean;
}

export const StepsQueryBuilderWrapper = (
  {
    datasource, 
    resultsQuery,
    stepsQuery,
    onResultsQueryChange,
    onStepsQueryChange,
    disableStepsQueryBuilder
  }: Props) => {
  const theme = useTheme2();
  
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [stepsPath, setStepsPath] = useState<string[]>([]);
  const [isResultsQueryInvalid, setIsResultsQueryInvalid] = useState(false);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.workspacesCache;
      setWorkspaces(Array.from(workspaces.values()));
    };
    const loadPartNumbers = async () => {
      const partNumbers = await datasource.partNumbersCache;
      setPartNumbers(partNumbers);
    };
    const loadStepsPath = () => {
      setStepsPath(datasource.getStepPaths());
      datasource.setStepsPathChangeCallback(() => {
        setStepsPath(datasource.getStepPaths());
      });
    };
    loadPartNumbers();
    loadStepsPath();
    loadWorkspaces();
  }, [datasource]);

  const onResultsQueryByChange = (query: string) => {
    onResultsQueryChange(query);
    setIsResultsQueryInvalid(!query || query.trim() === '');
  }
  
  return (
    <div>
        <InlineField
          label="Query by results properties"
          labelWidth={26}
          tooltip={tooltips.resultsQueryBuilder}
          invalid={isResultsQueryInvalid}
          error={'You must provide atleast one result filter.'}>
        <div style={{ border: isResultsQueryInvalid ? `1px solid ${theme.colors.error.border}` : 'none', borderRadius: '4px' }}>
          <ResultsQueryBuilder
            filter={resultsQuery}
            onChange={(event) => onResultsQueryByChange((event as CustomEvent<{ linq: string }>).detail.linq)}
            workspaces={workspaces}
            status={enumToOptions(TestMeasurementStatus).map(option => option.value?.toString() || '')}
            partNumbers={partNumbers}
            globalVariableOptions={datasource.globalVariableOptions()}>
          </ResultsQueryBuilder>
        </div>
        </InlineField>
      <InlineField label="Query by steps properties" labelWidth={26} tooltip={tooltips.stepsQueryBuilder}>
        <StepsQueryBuilder
          filter={stepsQuery}
          workspaces={workspaces}
          stepStatus={enumToOptions(TestMeasurementStatus).map(option => option.value?.toString() || '')}
          stepsPath={stepsPath}
          globalVariableOptions={datasource.globalVariableOptions()}
          disableQueryBuilder={disableStepsQueryBuilder}
          onFilterChange={(filter) => onStepsQueryChange(filter)}
        ></StepsQueryBuilder>
      </InlineField>
    </div>
  );
};

const tooltips = {
  resultsQueryBuilder: 'This field applies a filter to the query results.',
  stepsQueryBuilder: 'This optional field applies a filter to the query steps.',
};
