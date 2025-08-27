import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery } from '../types';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor(_: Props) {

  return (
    <>
      <span>Placeholder for Alarm Query Editor</span>
    </>
  );
}
