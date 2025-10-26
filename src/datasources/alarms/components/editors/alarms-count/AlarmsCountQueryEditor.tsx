import { AlarmsCountQuery } from 'datasources/alarms/types/AlarmsCount.types';
import React, { useEffect, useState } from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import { ERROR_SEVERITY_WARNING, LABEL_WIDTH, labels, tooltips } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { AlarmsCountQueryHandler } from 'datasources/alarms/query-type-handlers/alarms-count/AlarmsCountQueryHandler';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';

type Props = {
  query: AlarmsCountQuery;
  handleQueryChange: (query: AlarmsCountQuery, runQuery?: boolean) => void;
  datasource: AlarmsCountQueryHandler
};

export function AlarmsCountQueryEditor({ query, handleQueryChange, datasource }: Props) {
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
