import { SelectableValue } from '@grafana/data';
import { AutoSizeInput, InlineField, InlineSwitch, MultiSelect, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
import { enumToOptions, validateNumericInput } from 'core/utils';
import React, { useEffect, useState } from 'react';
import { OutputType } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { StepsQueryBuilderWrapper } from '../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';
import { FloatingError } from 'core/errors';
import { recordCountErrorMessages, TAKE_LIMIT } from 'datasources/results/constants/StepsQueryEditor.constants';

type Props = {
  query: QuerySteps;
  handleQueryChange: (query: QuerySteps, runQuery?: boolean) => void;
  datasource: QueryStepsDataSource;
};

export function QueryStepsEditor({ query, handleQueryChange, datasource }: Props) {
  const [disableStepsQueryBuilder, setDisableStepsQueryBuilder] = useState(false);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);

  useEffect(() => {
    setDisableStepsQueryBuilder(!query.resultsQuery);
  }, [query.resultsQuery]);

  const onOutputChange = (outputType: OutputType) => {
    handleQueryChange({ ...query, outputType: outputType });
  };

  const onPropertiesChange = (properties: Array<SelectableValue<string>>) => {
    setIsPropertiesValid(properties.length > 0);
    if (properties !== undefined) {
      handleQueryChange({ ...query, properties: properties.map(property => property.value as StepsProperties) });
    }
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (isRecordCountValid(value, TAKE_LIMIT)) {
      handleQueryChange({ ...query, recordCount: value });
    } else {
      handleQueryChange({ ...query, recordCount: undefined });
    }
  };

  function isRecordCountValid(value: number, takeLimit: number): boolean {
    if (Number.isNaN(value) || value < 0) {
      setRecordCountInvalidMessage(recordCountErrorMessages.greaterOrEqualToZero);
      return false;
    }
    if (value > takeLimit) {
      setRecordCountInvalidMessage(recordCountErrorMessages.lessOrEqualToTakeLimit);
      return false;
    }
    setRecordCountInvalidMessage('');
    return true;
  }

  const onShowMeasurementChange = (isShowMeasurementChecked: boolean) => {
    handleQueryChange({ ...query, showMeasurements: isShowMeasurementChecked });
  };

  const onResultsFilterChange = (resultsQuery: string) => {
    if (resultsQuery === '') {
      handleQueryChange({ ...query, resultsQuery: resultsQuery });
    } else if (query.resultsQuery !== resultsQuery) {
      query.resultsQuery = resultsQuery;
      handleQueryChange({ ...query, resultsQuery: resultsQuery });
    }
  };

  const onStepsFilterChange = (stepsQuery: string) => {
    if (query.stepsQuery !== stepsQuery) {
      query.stepsQuery = stepsQuery;
      handleQueryChange({ ...query, stepsQuery: stepsQuery });
    }
  };

  return (
    <>
      <VerticalGroup>
        <InlineField label={labels.output} labelWidth={26} tooltip={tooltips.output}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            value={query.outputType}
            onChange={onOutputChange}
          />
        </InlineField>
        {query.outputType === OutputType.Data && (
          <InlineField
            label={labels.properties}
            labelWidth={26}
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error={errors.properties}
          >
            <MultiSelect
              placeholder={placeholders.properties}
              options={enumToOptions(StepsProperties)}
              onChange={onPropertiesChange}
              value={query.properties}
              defaultValue={query.properties!}
              noMultiValueWrap={true}
              maxVisibleValues={5}
              width={65}
              allowCustomValue={false}
              closeMenuOnSelect={false}
            />
          </InlineField>
        )}
        <div>
          {query.outputType === OutputType.Data && (
            <InlineField label={labels.showMeasurements} labelWidth={26} tooltip={tooltips.showMeasurements}>
              <InlineSwitch
                onChange={event => onShowMeasurementChange(event.currentTarget.checked)}
                value={query.showMeasurements}
              />
            </InlineField>
          )}
          <TimeRangeControls
            query={query}
            handleQueryChange={(updatedQuery, runQuery) => {
              handleQueryChange(updatedQuery as QuerySteps, runQuery);
            }}
          />
          <StepsQueryBuilderWrapper
            datasource={datasource}
            resultsQuery={query.resultsQuery}
            stepsQuery={query.stepsQuery}
            onResultsQueryChange={(value: string) => onResultsFilterChange(value)}
            onStepsQueryChange={(value: string) => onStepsFilterChange(value)}
            disableStepsQueryBuilder={disableStepsQueryBuilder}
          />
          {query.outputType === OutputType.Data && (
            <InlineField
              label={labels.take}
              labelWidth={26}
              tooltip={tooltips.recordCount}
              invalid={!!recordCountInvalidMessage}
              error={recordCountInvalidMessage}
            >
              <AutoSizeInput
                minWidth={25}
                maxWidth={25}
                type="number"
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder={placeholders.take}
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          )}
        </div>
      </VerticalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity="warning" />
    </>
  );
}

const tooltips = {
  output: 'This field specifies the output type for the query steps.',
  properties: 'This field specifies the properties to use in the query.',
  recordCount: 'This field sets the maximum number of steps.',
  showMeasurements: 'This toggle enables the display of step measurement data.',
};

const labels = {
  output: 'Output',
  properties: 'Properties',
  showMeasurements: 'Show measurements',
  take: 'Take',
};

const errors = {
  properties: 'You must select at least one property.',
};

const placeholders = {
  properties: 'Select properties to fetch',
  take: 'Enter record count',
};
