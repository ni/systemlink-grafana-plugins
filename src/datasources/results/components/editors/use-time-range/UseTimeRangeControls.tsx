import { SelectableValue } from '@grafana/data';
import { InlineField, InlineSwitch, Select } from '@grafana/ui';
import { enumToOptions } from 'core/utils';
import { UseTimeRangeFor } from 'datasources/results/types/types';
import React from 'react';

type Props = {
  query: any;
  handleQueryChange: (query: any, runQuery?: boolean) => void;
};

export function UseTimeRangeControls({query, handleQueryChange}: Props) {
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
    <div className="horizontal-control-group">
      <InlineField label="Use time range" tooltip={tooltips.useTimeRange} labelWidth={25}>
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
  useTimeRange: 'Select to query using the dashboard time range for the selected field',
  useTimeRangeFor: 'Select the field to apply the dashboard time range',
};
