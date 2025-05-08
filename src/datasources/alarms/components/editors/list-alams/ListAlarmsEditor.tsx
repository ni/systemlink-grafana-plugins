import React from 'react';

import { AutoSizeInput, InlineField, InlineSwitch, Select } from '@grafana/ui';
import _ from 'lodash';
import { SelectableValue } from '@grafana/data';


import './ListAlarmsEditor.scss';

export function ListAlarmsEditor() {
  return (
    <div className="right-query-controls">
      <div className="horizontal-control-group">
        <InlineField label="Include Transition" labelWidth={22} tooltip={'Include transition alarms'}>
          <Select
            options={
              ['None', 'Most recent only', 'All'].map(value => ({ label: value, value })) as SelectableValue<string>[]
            }
            value={'None'}
            width={26}
            onChange={() => {}}
          />
        </InlineField>
        <InlineField label="Descending" labelWidth={22} tooltip={'Descending order'} >
          <InlineSwitch value={true} />
        </InlineField>
      </div>

      <InlineField label="Take" labelWidth={22} tooltip={'Number of alarms to take'}>
        <AutoSizeInput minWidth={26} maxWidth={26} type="number" defaultValue={1000} />
      </InlineField>
    </div>
  );
}
