import React, { useEffect, useState } from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import { ERROR_SEVERITY_WARNING, LABEL_WIDTH, labels, tooltips } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { ListAlarmsDataSource } from 'datasources/alarms/query-type-handlers/list-alarms/ListAlarmsDataSource';

type Props = {
  query: ListAlarmsQuery;
  handleQueryChange: (query: ListAlarmsQuery, runQuery?: boolean) => void;
  datasource: ListAlarmsDataSource
};

export function ListAlarmsQueryEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);

  const onFilterChange = (event?: Event | React.FormEvent<Element>) => {
    if (event && 'detail' in event) {
      const value = (event as CustomEvent).detail.linq;
      
      if (query.filter !== value) {
        query.filter = value;
        handleQueryChange({ ...query, filter: value });
      }
    }
  };

  return (
    <>
      <InlineField
        label={labels.queryBy}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.queryBy}
      >
        <AlarmsQueryBuilder
          filter={query.filter}
          globalVariableOptions={datasource.globalVariableOptions()}
          workspaces={workspaces}
          onChange={onFilterChange}
        />
      </InlineField>
      <FloatingError
        message={datasource.errorTitle}
        innerMessage={datasource.errorDescription}
        severity={ERROR_SEVERITY_WARNING}
      />
    </>
  );
}
