import { QueryEditorProps } from '@grafana/data';
import { AlarmsDataSource } from '../AlarmsDataSource';
import { AutoSizeInput, InlineField, InlineSwitch, Stack } from '@grafana/ui';
import { AlarmsQueryBuilder } from './query-builder/AlarmsQueryBuilder';
import { Workspace } from 'core/types';
import React, { useState, useEffect } from 'react';
import { FloatingError } from 'core/errors';
import { AlarmsVariableQuery } from '../types/types';
import { ERROR_SEVERITY_WARNING, LABEL_WIDTH, labels, QUERY_EDITOR_MAX_TAKE, QUERY_EDITOR_MIN_TAKE, placeholders, takeErrorMessages, tooltips } from '../constants/AlarmsQueryEditor.constants';
import { validateNumericInput } from 'core/utils';

type Props = QueryEditorProps<AlarmsDataSource, AlarmsVariableQuery>;

export function AlarmsVariableQueryEditor({ query, onChange, datasource }: Props) {
  query = datasource.prepareQuery(query);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');
  const preparedQuery = query as AlarmsVariableQuery;

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.listAlarmsQueryHandler.loadWorkspaces();
      setWorkspaces(Array.from(workspaces.values()));
    };

    loadWorkspaces();
  }, [datasource]);

  const onFilterChange = (filter: string) => {
    if (preparedQuery.filter !== filter) {
      preparedQuery.filter = filter;
      onChange({ ...preparedQuery, filter });
    }
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    onChange({ ...preparedQuery, descending: isDescendingChecked });
  };

  const validateTakeValue = (value: number) => {
    if (isNaN(value) || value < QUERY_EDITOR_MIN_TAKE) {
      return { message: takeErrorMessages.minErrorMsg, take: value };
    }
    if (value > QUERY_EDITOR_MAX_TAKE) {
      return { message: takeErrorMessages.maxErrorMsg, take: value };
    }
    return { message: '', take: value };
  };
  
  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    const { message, take } = validateTakeValue(value);

    setTakeInvalidMessage(message);
    onChange({ ...preparedQuery, take });
  };

  return (
    <>
      <Stack direction="column">
        <InlineField
          label={labels.queryBy}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.queryBy}
        >
          <AlarmsQueryBuilder
            filter={preparedQuery.filter}
            onChange={(event: any) => onFilterChange(event.detail.linq)}
            workspaces={workspaces}
            globalVariableOptions={datasource.listAlarmsQueryHandler.globalVariableOptions()}
          />
        </InlineField>
        <InlineField
          label={labels.descending}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.descending}
        >
          <InlineSwitch
            onChange={event => onDescendingChange(event.currentTarget.checked)}
            value={preparedQuery.descending}
          />
        </InlineField>
        <InlineField
          label={labels.take}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.take}
          invalid={!!takeInvalidMessage}
          error={takeInvalidMessage}
        >
          <AutoSizeInput
            minWidth={LABEL_WIDTH}
            maxWidth={LABEL_WIDTH}
            type="number"
            value={preparedQuery.take}
            onChange={onTakeChange}
            placeholder={placeholders.take}
            onKeyDown={event => {
              validateNumericInput(event);
            }}
          />
        </InlineField>
      </Stack>
      <FloatingError
        message={datasource.listAlarmsQueryHandler.errorTitle} 
        innerMessage={datasource.listAlarmsQueryHandler.errorDescription} 
        severity={ERROR_SEVERITY_WARNING}
      />
    </>
  );
};
