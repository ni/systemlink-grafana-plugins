import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { WorkOrdersDataSource } from '../WorkOrdersDataSource';
import { WorkOrdersQuery } from '../types';
import { WorkOrdersQueryBuilder } from './query-builder/WorkOrdersQueryBuilder';
import { InlineField, VerticalGroup } from '@grafana/ui';

type Props = QueryEditorProps<WorkOrdersDataSource, WorkOrdersQuery>;

export function WorkOrdersQueryEditor({ query, onChange, onRunQuery }: Props) {
  return (
    <>
      <VerticalGroup>
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
          <WorkOrdersQueryBuilder 
            globalVariableOptions={[]}
          ></WorkOrdersQueryBuilder>
        </InlineField>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  queryBy: 'This optional field specifies the query filters.',
};
