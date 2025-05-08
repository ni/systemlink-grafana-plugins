import React, { useState } from 'react';
import { HorizontalGroup, Select, VerticalGroup } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField } from 'core/components/InlineField';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmQueryType, AlarmsQuery } from '../types';
import { AlarmsQueryBuilder } from './query-builder/AlarmsQueryBuilder';
import { ListAlarmsEditor } from './editors/list-alams/ListAlarmsEditor';
import { AlarmsTrendEditor } from './editors/alarm-trend/AlaramTrendEditor';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ query, onChange, onRunQuery }: Props) {
  const [ queryKind, setQueryKind ] = useState(query.queryKind);
  const onQueryTypeChange = (value: SelectableValue<AlarmQueryType>) => {
    setQueryKind(value.value!);
    onRunQuery();
  };

  const onParameterChange = (value: string) => {
  }

  return (
    <>
      <InlineField label="Query Type" labelWidth={18} tooltip={'Select the type of query to run'}>
        <Select
          options={Object.values(AlarmQueryType).map(value => ({ label: value, value })) as SelectableValue<AlarmQueryType>[]}
          onChange={onQueryTypeChange}
          value={queryKind}
          width={65}
        />
      </InlineField>

      <HorizontalGroup align="flex-start">
        <VerticalGroup>
          <InlineField label="Query By" labelWidth={18} tooltip={'Select the type of query to run'}>
            <AlarmsQueryBuilder
              filter=''
              partNumbers={[]}
              workspaces={[]}
              familyNames={[]}
              globalVariableOptions={[]}
              onChange={(event: any) => onParameterChange(event.detail.linq)}
            ></AlarmsQueryBuilder>
          </InlineField>
        </VerticalGroup>
        <VerticalGroup>
          {(queryKind === AlarmQueryType.ListAlarms) && (
            <ListAlarmsEditor/>
          )}
          {(queryKind === AlarmQueryType.AlarmTrend) && (
            <AlarmsTrendEditor />
          )}
        </VerticalGroup>
      </HorizontalGroup>
    </>
  );
}
