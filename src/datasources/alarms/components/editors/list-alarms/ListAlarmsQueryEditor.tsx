import React, { useEffect, useState } from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import {
  AlarmsPropertiesOptions,
  AlarmsTransitionsOptions,
  CONTROL_WIDTH,
  ERROR_SEVERITY_WARNING,
  LABEL_WIDTH,
  labels,
  placeholders,
  PROPERTIES_ERROR_MESSAGE,
  tooltips,
} from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { AlarmsProperties, ListAlarmsQuery } from 'datasources/alarms/types/ListAlarms.types';
import { ListAlarmsQueryHandler } from 'datasources/alarms/query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { Combobox, ComboboxOption, MultiCombobox, Stack } from '@grafana/ui';
import { TransitionInclusionOption } from 'datasources/alarms/types/types';

type Props = {
  query: ListAlarmsQuery;
  handleQueryChange: (query: ListAlarmsQuery, runQuery?: boolean) => void;
  datasource: ListAlarmsQueryHandler;
};

export function ListAlarmsQueryEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isPropertiesControlValid, setIsPropertiesControlValid] = useState<boolean>(true);

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

  const onPropertiesChange = (properties: Array<ComboboxOption<AlarmsProperties>>) => {
    const selectedProperties = properties.map(property => property.value);

    setIsPropertiesControlValid(selectedProperties.length > 0);

    handleQueryChange({ ...query, properties: selectedProperties });
  };

  const onTransitionChange = (option: ComboboxOption<TransitionInclusionOption>) => {
    handleQueryChange({ ...query, transition: option.value });
  };

  return (
    <Stack direction='column'>
      <InlineField
        label={labels.properties}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.properties}
        invalid={!isPropertiesControlValid}
        error={PROPERTIES_ERROR_MESSAGE}
      >
        <MultiCombobox
          placeholder={placeholders.properties}
          options={Object.values(AlarmsPropertiesOptions)}
          onChange={onPropertiesChange}
          value={query.properties}
          width='auto'
          minWidth={CONTROL_WIDTH}
          maxWidth={CONTROL_WIDTH}
        />
      </InlineField>
      <Stack justifyContent={'flex-start'}>
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
        <Stack direction='column'>
          <InlineField
            label={labels.transition}
            labelWidth={LABEL_WIDTH}
            tooltip={tooltips.transition}
          >
            <Combobox
              options={Object.values(AlarmsTransitionsOptions)}
              value={query.transition}
              width={CONTROL_WIDTH}
              onChange={onTransitionChange}
            />
          </InlineField>
        </Stack>
      </Stack>
      <FloatingError
        message={datasource.errorTitle}
        innerMessage={datasource.errorDescription}
        severity={ERROR_SEVERITY_WARNING}
      />
    </Stack>
  );
}
