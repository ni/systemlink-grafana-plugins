import React, { useEffect, useMemo, useState } from 'react';
import { InlineField } from 'core/components/InlineField';
import { AlarmsQueryBuilder } from '../../query-builder/AlarmsQueryBuilder';
import {
  AlarmsPropertiesOptions,
  AlarmsTransitionInclusionOptions,
  CONTROL_WIDTH,
  ERROR_SEVERITY_WARNING,
  LABEL_WIDTH,
  labels,
  placeholders,
  PROPERTIES_ERROR_MESSAGE,
  QUERY_EDITOR_MAX_TAKE,
  QUERY_EDITOR_MIN_TAKE,
  QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL,
  SECONDARY_CONTROL_WIDTH,
  SECONDARY_LABEL_WIDTH,
  takeErrorMessages,
  tooltips,
} from 'datasources/alarms/constants/AlarmsQueryEditor.constants';
import { Workspace } from 'core/types';
import { FloatingError } from 'core/errors';
import { AlarmsProperties, ListAlarmsQuery, OutputType } from 'datasources/alarms/types/ListAlarms.types';
import { ListAlarmsQueryHandler } from 'datasources/alarms/query-type-handlers/list-alarms/ListAlarmsQueryHandler';
import { AutoSizeInput, Combobox, ComboboxOption, InlineSwitch, MultiCombobox, RadioButtonGroup, Stack } from '@grafana/ui';
import { enumToOptions, validateNumericInput } from 'core/utils';
import { TransitionInclusionOption } from 'datasources/alarms/types/types';

type Props = {
  query: ListAlarmsQuery;
  handleQueryChange: (query: ListAlarmsQuery, runQuery?: boolean) => void;
  datasource: ListAlarmsQueryHandler;
};

export function ListAlarmsQueryEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isPropertiesControlValid, setIsPropertiesControlValid] = useState<boolean>(true);
  const [takeInvalidMessage, setTakeInvalidMessage] = useState<string>('');

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

  const onDescendingChange = (descending: boolean) => {
    handleQueryChange({ ...query, descending });
  };

  const updateTakeInvalidMessage = (take: number, transitionInclusionOption: TransitionInclusionOption) => {
    if (isNaN(take) || take < QUERY_EDITOR_MIN_TAKE) {
      setTakeInvalidMessage(takeErrorMessages.minErrorMsg);
      return;
    }

    const { maxTake, errorMsg } =
      transitionInclusionOption === TransitionInclusionOption.All
        ? { maxTake: QUERY_EDITOR_MAX_TAKE_TRANSITION_ALL, errorMsg: takeErrorMessages.transitionAllMaxTakeErrorMsg }
        : { maxTake: QUERY_EDITOR_MAX_TAKE, errorMsg: takeErrorMessages.maxErrorMsg };

    if (take > maxTake) {
      setTakeInvalidMessage(errorMsg);
      return;
    }

    setTakeInvalidMessage('');
  };
  
  const onTakeChange = (event: React.FormEvent<HTMLInputElement>) => {
    const take = parseInt((event.target as HTMLInputElement).value, 10);
    updateTakeInvalidMessage(take, query.transitionInclusionOption!);

    handleQueryChange({ ...query, take });
  };

  const onTransitionInclusionChange = (option: ComboboxOption<TransitionInclusionOption>) => {
    let updatedProperties = query.properties || [];
    
    if (option.value === TransitionInclusionOption.None) {
      updatedProperties = updatedProperties.filter(
        prop => !datasource.isAlarmTransitionProperty(prop)
      );
    }

    setIsPropertiesControlValid(updatedProperties.length > 0);
    updateTakeInvalidMessage(query.take!, option.value);

    handleQueryChange({
      ...query,
      transitionInclusionOption: option.value,
      properties: updatedProperties,
    });
  };

  const onOutputTypeChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const propertiesOptions = useMemo(() => {
    const transitionInclusionOption = query.transitionInclusionOption;
    const allOptions = Object.values(AlarmsPropertiesOptions);

    if (transitionInclusionOption === TransitionInclusionOption.None) {
      return allOptions.filter(
        option => !datasource.isAlarmTransitionProperty(option.value)
      );
    }

    return allOptions;
  }, [query.transitionInclusionOption, datasource]);

  return (
    <Stack direction='column'>
      <InlineField
        label={labels.outputType}
        labelWidth={LABEL_WIDTH}
        tooltip={tooltips.outputType}
      >
        <RadioButtonGroup
          options={Object.values(OutputType).map(value => ({ label: value, value }))}
          value={query.outputType}
          onChange={onOutputTypeChange}
        />
      </InlineField>
      {query.outputType === OutputType.Properties && (
        <InlineField
          label={labels.properties}
          labelWidth={LABEL_WIDTH}
          tooltip={tooltips.properties}
          invalid={!isPropertiesControlValid}
          error={PROPERTIES_ERROR_MESSAGE}
        >
          <MultiCombobox
            placeholder={placeholders.properties}
            options={propertiesOptions}
            onChange={onPropertiesChange}
            value={query.properties}
            width='auto'
            minWidth={CONTROL_WIDTH}
            maxWidth={CONTROL_WIDTH}
          />
        </InlineField>
      )}
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
        {query.outputType === OutputType.Properties && (
          <Stack direction='column'>
            <InlineField
              label={labels.transitionInclusion}
              labelWidth={SECONDARY_LABEL_WIDTH}
              tooltip={tooltips.transitionInclusion}
            >
              <Combobox
                options={Object.values(AlarmsTransitionInclusionOptions)}
                value={query.transitionInclusionOption}
                width={SECONDARY_CONTROL_WIDTH}
                onChange={onTransitionInclusionChange}
              />
            </InlineField>
            <InlineField
              label={labels.descending}
              labelWidth={SECONDARY_LABEL_WIDTH}
              tooltip={tooltips.descending}
            >
              <InlineSwitch
                onChange={event => onDescendingChange(event.currentTarget.checked)}
                value={query.descending}
              />
            </InlineField>
            <InlineField
              label={labels.take}
              labelWidth={SECONDARY_LABEL_WIDTH}
              tooltip={tooltips.take}
              invalid={!!takeInvalidMessage}
              error={takeInvalidMessage}
            >
              <AutoSizeInput
                minWidth={SECONDARY_CONTROL_WIDTH}
                maxWidth={SECONDARY_CONTROL_WIDTH}
                type="number"
                value={query.take}
                onChange={onTakeChange}
                placeholder={placeholders.take}
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          </Stack>
        )}
      </Stack>
      <FloatingError
        message={datasource.errorTitle}
        innerMessage={datasource.errorDescription}
        severity={ERROR_SEVERITY_WARNING}
      />
    </Stack>
  );
}
