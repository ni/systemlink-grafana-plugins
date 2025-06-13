import { InlineField, InlineSwitch } from '@grafana/ui';
import { QueryResults } from 'datasources/results/types/QueryResults.types';
import { QuerySteps } from 'datasources/results/types/QuerySteps.types';
import { QueryType } from 'datasources/results/types/types';
import React from 'react';

type Props = {
  query: QueryResults | QuerySteps;
  handleQueryChange: (query: QueryResults | QuerySteps, runQuery?: boolean) => void;
};

export function TimeRangeControls({query, handleQueryChange}: Props) {
  const onUseTimeRangeChecked = (value: boolean) => {
    if(query.queryType === QueryType.Results) {
      handleQueryChange({ ...(query as QueryResults), useTimeRange: value });
      return;
    }
    if(query.queryType === QueryType.Steps) {
      handleQueryChange({ ...(query as QuerySteps), stepsUseTimeRange: value });
      return;
    }
  };

  return (
    <div className="results-horizontal-control-group">
      <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={26}>
        <InlineSwitch
          onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
          value={query.queryType === QueryType.Results ? (query as QueryResults).useTimeRange : (query as QuerySteps).stepsUseTimeRange}
        />
      </InlineField>
    </div>
  );
}

const tooltips = {
  useTimeRange: 'This toggle enables querying within the dashboard time range.',
};
