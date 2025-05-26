import { SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  InlineField,
  InlineSwitch,
  MultiSelect,
  RadioButtonGroup,
  Select,
  VerticalGroup,
} from '@grafana/ui';
import { enumToOptions, validateNumericInput } from 'core/utils';
import React, { useState } from 'react';
import '../../ResultsQueryEditor.scss';
import { OutputType } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { OrderBy, QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { StepsQueryBuilderWrapper } from '../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';

type Props = {
  query: QuerySteps;
  handleQueryChange: (query: QuerySteps, runQuery?: boolean) => void;
  datasource: QueryStepsDataSource;
};

export function QueryStepsEditor({ query, handleQueryChange, datasource }: Props) {
  const [disableStepsQueryBuilder, setDisableStepsQueryBuilder] = useState(true);
  
  const onOutputChange = (outputType: OutputType) => {
    handleQueryChange({ ...query, outputType: outputType });
  };

  const onPropertiesChange = (properties: Array<SelectableValue<string>>) => {
    if (properties !== undefined) {
      handleQueryChange({ ...query, properties: properties.map(property => property.value as StepsProperties) });
    }
  };

  const onOrderByChange = (orderBy: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: orderBy.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  };

  const onShowMeasurementChange = (isShowMeasurementChecked: boolean) => {
    handleQueryChange({ ...query, showMeasurements: isShowMeasurementChecked });
  };

  const onResultsFilterChange = (resultsQuery: string) => {
    if(resultsQuery === "") {
      handleQueryChange({ ...query, resultsQuery: resultsQuery }, false);
      setDisableStepsQueryBuilder(true);
    } else if (query.resultsQuery !== resultsQuery) {
      handleQueryChange({ ...query, resultsQuery: resultsQuery });
      setDisableStepsQueryBuilder(false);
    }
  };

  const onStepsFilterChange = (stepsQuery: string) => {
    if (query.stepsQuery !== stepsQuery) {
      handleQueryChange({ ...query, stepsQuery: stepsQuery });
    }
  };


  return (
    <>
      <VerticalGroup>
        <InlineField label="Output" labelWidth={26} tooltip={tooltips.output}>
          <RadioButtonGroup
            options={Object.values(OutputType).map(value => ({ label: value, value })) as SelectableValue[]}
            value={query.outputType}
            onChange={onOutputChange}
          />
        </InlineField>
        {query.outputType === OutputType.Data && (
          <InlineField label="Properties" labelWidth={26} tooltip={tooltips.properties}>
            <MultiSelect
              placeholder="Select properties to fetch"
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
            <InlineField label="Show Measurements" labelWidth={26} tooltip={tooltips.showMeasurements}>
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
        </div>
        <div className="horizontal-control-group">
          <StepsQueryBuilderWrapper
            datasource={datasource}
            resultsQuery={query.resultsQuery}
            stepsQuery={query.stepsQuery}
            onResultsQueryChange={(value: string) => onResultsFilterChange(value)}
            onStepsQueryChange={(value: string) => onStepsFilterChange(value)}
            disableStepsQueryBuilder={disableStepsQueryBuilder}
          />
          {query.outputType === OutputType.Data && (
          <div className="right-query-controls">
            <div className="horizontal-control-group">
              <InlineField label="OrderBy" labelWidth={26} tooltip={tooltips.orderBy}>
                <Select
                  options={OrderBy as SelectableValue[]}
                  width={25}
                  placeholder="Select field to order by"
                  onChange={onOrderByChange}
                  value={query.orderBy}
                  defaultValue={query.orderBy}
                />
              </InlineField>
              <InlineField label="Descending" tooltip={tooltips.descending}>
                <InlineSwitch
                  onChange={event => onDescendingChange(event.currentTarget.checked)}
                  value={query.descending}
                />
              </InlineField>
            </div>
            <InlineField label="Take" labelWidth={26} tooltip={tooltips.recordCount}>
              <AutoSizeInput
                minWidth={25}
                maxWidth={25}
                type="number"
                defaultValue={query.recordCount}
                onCommitChange={recordCountChange}
                placeholder="Enter record count"
                onKeyDown={event => {
                  validateNumericInput(event);
                }}
              />
            </InlineField>
          </div>
          )}
        </div>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  output: 'This field specifies the output type for the query steps.',
  properties: 'This field specifies the properties to use in the query.',
  recordCount: 'This field sets the maximum number of steps.',
  orderBy: 'This field orders the query steps by field.',
  descending: 'This field returns the query steps in descending order.',
  showMeasurements: 'This toggle enables the display of step measurement data.',
};
