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
import React, { useEffect, useState } from 'react';
import '../../ResultsQueryEditor.scss';
import { OutputType } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { OrderBy, QuerySteps, StepsProperties } from 'datasources/results/types/QuerySteps.types';
import { QueryStepsDataSource } from 'datasources/results/query-handlers/query-steps/QueryStepsDataSource';
import { StepsQueryBuilderWrapper } from '../../query-builders/steps-querybuilder-wrapper/StepsQueryBuilderWrapper';
import { recordCountErrorMessages, TAKE_LIMIT } from 'datasources/results/constants/StepsQueryEditor.constants';

type Props = {
  query: QuerySteps;
  handleQueryChange: (query: QuerySteps, runQuery?: boolean) => void;
  datasource: QueryStepsDataSource;
};

export function QueryStepsEditor({ query, handleQueryChange, datasource }: Props) {
  const [disableStepsQueryBuilder, setDisableStepsQueryBuilder] = useState(false);
  const [productNameOptions, setProductNameOptions] = useState<Array<SelectableValue<string>>>([]);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  
  useEffect(() => {
    setDisableStepsQueryBuilder(!query.partNumberQuery || query.partNumberQuery.length === 0);
  }, [query.partNumberQuery]);

  useEffect(() => {
    const loadProductNameOptions = async () => {
      const response = await datasource.productCache;
      const productOptions = response.products.map(product => ({
        label: `${product.name} (${product.partNumber})`,
        value: product.partNumber,
      }));
      const globalVariableOptions = datasource.globalVariableOptions();
      setProductNameOptions([...globalVariableOptions, ...productOptions]);
    }
    loadProductNameOptions();
  }, [datasource]);
  
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
    if (isRecordCountValid(value, TAKE_LIMIT)) {
      handleQueryChange({ ...query, recordCount: value });
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
    if (query.resultsQuery !== resultsQuery) {
      handleQueryChange({ ...query, resultsQuery: resultsQuery });
    }
  };

  const onStepsFilterChange = (stepsQuery: string) => {
    if (query.stepsQuery !== stepsQuery) {
      handleQueryChange({ ...query, stepsQuery: stepsQuery });
    }
  };

  const onProductNameChange = (productNames: Array<SelectableValue<string>>) => {
    handleQueryChange({ ...query, partNumberQuery: productNames.map(product => product.value as string) });
  }

  const formatOptionLabel = (option: SelectableValue<string>) => (
    <div style={{ maxWidth: 500, whiteSpace: 'normal' }}>
      {option.label}
    </div>
  );

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
        <InlineField label="Product (part number)" labelWidth={26} tooltip={tooltips.productName}>
          <MultiSelect
            maxVisibleValues={5}
            width={65}
            onChange={onProductNameChange}
            placeholder='Select part numbers to use in a query'
            noMultiValueWrap={true}
            closeMenuOnSelect={false}
            value={query.partNumberQuery}
            formatOptionLabel={formatOptionLabel}
            options={productNameOptions}
          />
        </InlineField>
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
            <InlineField label="Descending" labelWidth={26} tooltip={tooltips.descending}>
              <InlineSwitch
                onChange={event => onDescendingChange(event.currentTarget.checked)}
                value={query.descending}
              />
            </InlineField>
            <InlineField
                label="Take"
                labelWidth={26}
                tooltip={tooltips.recordCount}
                 invalid={!!recordCountInvalidMessage}
                error={recordCountInvalidMessage}>
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
  productName: 'This field filters results by part number.',
};
