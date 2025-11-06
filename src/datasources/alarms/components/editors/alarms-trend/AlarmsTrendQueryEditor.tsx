import { AlarmsTrendQuery } from 'datasources/alarms/types/AlarmsTrend.types';
import React, { useEffect, useState } from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import { ERROR_SEVERITY_WARNING, LABEL_WIDTH, labels, tooltips } from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { AlarmsTrendQueryHandler } from 'datasources/alarms/query-type-handlers/alarms-trend/AlarmsTrendQueryHandler';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { InlineSwitch, Stack } from '@grafana/ui';

type Props = {
  query: AlarmsTrendQuery;
  handleQueryChange: (query: AlarmsTrendQuery, runQuery?: boolean) => void;
  datasource: AlarmsTrendQueryHandler
};

export function AlarmsTrendQueryEditor({ query, handleQueryChange, datasource }: Props) {
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

  const onGroupBySeverityChange = (isGroupBySeverityChecked: boolean) => {
    handleQueryChange({ ...query, groupBySeverity: isGroupBySeverityChecked });
  }

  return (
    <>
      <Stack>
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
        <InlineField
          label={labels.groupBySeverity}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.groupBySeverity}
        >
          <InlineSwitch
            onChange={event => onGroupBySeverityChange(event.currentTarget.checked)}
            value={query.groupBySeverity}
          />
        </InlineField>
      </Stack>
      <FloatingError
        message={datasource.errorTitle}
        innerMessage={datasource.errorDescription}
        severity={ERROR_SEVERITY_WARNING}
      />
    </>
  );
}
