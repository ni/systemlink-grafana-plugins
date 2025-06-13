import { InlineField, InlineSwitch } from '@grafana/ui';
import { QueryResults } from 'datasources/results/types/QueryResults.types';
import { QuerySteps } from 'datasources/results/types/QuerySteps.types';
import React from 'react';

type Props = {
  query: QueryResults | QuerySteps;
  handleQueryChange: (query: QueryResults | QuerySteps, runQuery?: boolean) => void;
};

export function TimeRangeControls({query, handleQueryChange}: Props) {
  const onUseTimeRangeChecked = (value: boolean) => {
    handleQueryChange({ ...query, useTimeRange: value });
  };

  return (
    <div className="results-horizontal-control-group">
      <InlineField label={labels.useTimeRange} tooltip={tooltips.useTimeRange} labelWidth={26}>
        <InlineSwitch
          onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
          value={query.useTimeRange}
        />
      </InlineField>
    </div>
  );
}

const tooltips = {
  useTimeRange: 'This toggle enables querying within the dashboard time range.',
};

const labels = {
  useTimeRange: 'Use time range',
};
