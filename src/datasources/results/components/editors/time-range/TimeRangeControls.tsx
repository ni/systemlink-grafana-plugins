import { SelectableValue } from '@grafana/data';
import { InlineField, InlineSwitch, Select } from '@grafana/ui';
import { enumToOptions } from 'core/utils';
import { QueryResults } from 'datasources/results/types/QueryResults.types';
import { QuerySteps } from 'datasources/results/types/QuerySteps.types';
import { UseTimeRangeFor } from 'datasources/results/types/types';
import React from 'react';

type Props = {
  query: QueryResults | QuerySteps;
  handleQueryChange: (query: QueryResults | QuerySteps, runQuery?: boolean) => void;
};

export function TimeRangeControls({query, handleQueryChange}: Props) {
  const onUseTimeRangeChecked = (value: boolean) => {
    if (query.useTimeRangeFor === undefined) {
      handleQueryChange({ ...query, useTimeRange: value }, false);
      return;
    }
    handleQueryChange({ ...query, useTimeRange: value });
  };

  const onUseTimeRangeChanged = (value: SelectableValue<string>) => {
    handleQueryChange({ ...query, useTimeRangeFor: value.value! });
  };

  return (
    <div className="results-horizontal-control-group">
      <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={26}>
        <InlineSwitch
          onChange={event => onUseTimeRangeChecked(event.currentTarget.checked)}
          value={query.useTimeRange}
        />
      </InlineField>
      <InlineField label="to filter by" disabled={!query.useTimeRange} tooltip={tooltips.useTimeRangeFor}>
        <Select
          placeholder="Choose"
          options={enumToOptions(UseTimeRangeFor)}
          onChange={onUseTimeRangeChanged}
          value={query.useTimeRangeFor}
          width={25}
        />
      </InlineField>
    </div>
  );
}

const tooltips = {
  useTimeRange: 'This toggle enables querying within the dashboard time range.',
  useTimeRangeFor: 'This field specifies the property to query within the dashboard time range.',
};
