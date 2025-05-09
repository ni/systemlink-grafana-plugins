import React from 'react';
import { VerticalGroup } from '@grafana/ui';
import { ResultsQueryBuilder } from '../query-results/ResultsQueryBuilder';
import { StepsQueryBuilder } from '../query-steps/StepsQueryBuilder';

export const StepsQueryBuilderContainer = () => {
  return (
    <VerticalGroup>
      <ResultsQueryBuilder
        filter={''}
        onChange={() => {}}
        workspaces={[]}
        partNumbers={[]}
        status={[]}
        globalVariableOptions={[]}>
      </ResultsQueryBuilder>
      <StepsQueryBuilder
        filter={''}
        onChange={() => {}}
        workspaces={[]}
        status={[]}
        stepsPath={[]}
        globalVariableOptions={[]}
        disableQueryBuilder={false}
        onFilterChange={() => {}}
      ></StepsQueryBuilder>
    </VerticalGroup>
  );
};
