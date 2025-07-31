import { QueryEditorProps } from '@grafana/data';
import { VerticalGroup, InlineField, InlineSwitch, AutoSizeInput } from '@grafana/ui';
import React from 'react';
import { tooltips } from '../constants/QueryEditor.constants';
import { validateNumericInput } from 'core/utils';
import { FloatingError } from 'core/errors';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { WorkOrdersQueryBuilder } from 'datasources/work-orders/components/query-builder/WorkOrdersQueryBuilder';
import { WorkOrdersVariableQuery } from 'datasources/work-orders/types';

type Props = QueryEditorProps<AlarmsDataSource, WorkOrdersVariableQuery>;

export function AlarmsVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);

  return (
    <>
      <VerticalGroup>
        <InlineField label="Query By" labelWidth={25} tooltip={tooltips.queryBy}>
          <WorkOrdersQueryBuilder
            filter={query.queryBy}
            workspaces={[]}
            users={[]}
            globalVariableOptions={[]}
            onChange={(event: any) => {}}
          ></WorkOrdersQueryBuilder>
        </InlineField>
        <div>
          <InlineField label="Descending" labelWidth={25} tooltip={tooltips.descending}>
            <InlineSwitch
              onChange={event => ()=>{}}
              value={query.descending}
            />
          </InlineField>
        </div>
        <InlineField
          label="Take"
          labelWidth={25}
          tooltip={tooltips.take}
        >
          <AutoSizeInput
            minWidth={26}
            maxWidth={26}
            type="number"
            placeholder="Enter record count"
            onKeyDown={event => {
              validateNumericInput(event);
            }}
          />
        </InlineField>
      </VerticalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}
