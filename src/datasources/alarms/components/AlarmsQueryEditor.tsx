import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AlarmsQuery, QueryType } from '../types/types';
import { AlarmsCountQueryEditor } from './editors/alarms-count/AlarmsCountQueryEditor';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsQuery>;

export function AlarmsQueryEditor({ datasource, query }: Props) {
  query = datasource.prepareQuery(query);

  return (
    <>
      {query.queryType === QueryType.AlarmsCount && (
        <AlarmsCountQueryEditor query={query} />
      )}
    </>
  );
}
