import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery }: Props) {
  return (
    <>
      <WorkOrdersQueryBuilder 
        globalVariableOptions={[]}
      ></WorkOrdersQueryBuilder>
    </>
  );
}
