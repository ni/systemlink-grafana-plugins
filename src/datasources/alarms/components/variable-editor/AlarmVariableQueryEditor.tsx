import React from 'react';
import { AlarmsQueryBuilder } from '../query-builder/AlarmsQueryBuilder';
import { Props } from 'datasources/data-frame/components/DataFrameQueryEditorCommon';
import { SelectableValue } from '@grafana/data';
import { InlineField, Select, AutoSizeInput } from '@grafana/ui';

export function AlarmVariableQueryEditor(props: Props) {
  const onParameterChange = (value: string) => {};

  return (
    <div style={{ width: '525px' }}>
      <InlineField label="Query By" labelWidth={22} tooltip={'Select the type of query to run'}>
        <AlarmsQueryBuilder
          filter=""
          partNumbers={[]}
          workspaces={[]}
          familyNames={[]}
          globalVariableOptions={[]}
          onChange={(event: any) => onParameterChange(event.detail.linq)}
        ></AlarmsQueryBuilder>
      </InlineField>

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

      <InlineField label="Take" labelWidth={22} tooltip={'Number of alarms to take'}>
        <AutoSizeInput minWidth={26} maxWidth={26} type="number" defaultValue={1000} />
      </InlineField>
    </div>
  );
}
