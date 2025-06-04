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
import { OrderBy, QueryResults, ResultsProperties } from 'datasources/results/types/QueryResults.types';
import { OutputType, TestMeasurementStatus } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { Workspace } from 'core/types';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { ResultsQueryBuilder } from '../../query-builders/query-results/ResultsQueryBuilder';

type Props = {
  query: QueryResults;
  handleQueryChange: (query: QueryResults, runQuery?: boolean) => void;
  datasource: QueryResultsDataSource;
};

export function QueryResultsEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [productNameOptions, setProductNameOptions] = useState<Array<SelectableValue<string>>>([]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.workspacesCache;
      setWorkspaces(Array.from(workspaces.values()));
    };
    const loadPartNumbers = async () => {
      const partNumbers = await datasource.partNumbersCache;
      setPartNumbers(partNumbers);
    };
    const loadProductNameOptions = async () => {
      const response = await datasource.productCache;
      const productOptions = response.products.map(product => ({
        label: `${product.name} (${product.partNumber})`,
        value: product.partNumber,
      }));
      setProductNameOptions([...datasource.globalVariableOptions(), ...productOptions]);
    }
    loadProductNameOptions();
    loadPartNumbers();
    loadWorkspaces();
  }, [datasource]);

  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as ResultsProperties) });
    }
  };

  const onOrderByChange = (item: SelectableValue<string>) => {
    handleQueryChange({ ...query, orderBy: item.value });
  };

  const onDescendingChange = (isDescendingChecked: boolean) => {
    handleQueryChange({ ...query, descending: isDescendingChecked });
  };

  const recordCountChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    handleQueryChange({ ...query, recordCount: value });
  };

  const onParameterChange = (value: string) => {
    if (query.queryBy !== value) {
      handleQueryChange({ ...query, queryBy: value });
    }
  }

  const onProductNameChange = (productNames: Array<SelectableValue<string>>) => {
    handleQueryChange({ ...query, partNumberQuery: productNames.map(product => product.value as string) });
  }

  const formatOptionLabel = (option: SelectableValue<string>) => (
    <div style={{ maxWidth: 520, whiteSpace: 'normal' }}>
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
              options={enumToOptions(ResultsProperties)}
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
        <TimeRangeControls
          query={query}
          handleQueryChange={(updatedQuery, runQuery) => {
            handleQueryChange(updatedQuery as QueryResults, runQuery);
          }}
        />
        <div className="horizontal-control-group">
          <div>
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
            <InlineField label="Query By" labelWidth={26} tooltip={tooltips.queryBy}>
              <ResultsQueryBuilder
                filter={query.queryBy}
                workspaces={workspaces}
                partNumbers={partNumbers}
                status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
                globalVariableOptions={datasource.globalVariableOptions()}
                onChange={(event: any) => onParameterChange(event.detail.linq)}>
              </ResultsQueryBuilder>
            </InlineField>
          </div>
          {query.outputType === OutputType.Data && (
            <div className="right-query-controls">
              <InlineField label="OrderBy" labelWidth={26} tooltip={tooltips.orderBy}>
                <Select
                  width={25}
                  options={OrderBy as SelectableValue[]}
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
              <InlineField label="Take" labelWidth={26} tooltip={tooltips.recordCount}>
                <AutoSizeInput
                  minWidth={25}
                  maxWidth={25}
                  type="number"
                  defaultValue={query.recordCount}
                  onCommitChange={recordCountChange}
                  placeholder="Enter record count"
                  onKeyDown={(event) => {validateNumericInput(event)}}
                />
              </InlineField>
            </div>
          )}
        </div>
        </div>
      </VerticalGroup>
    </>
  );
}

const tooltips = {
  output: 'This field specifies the output type for the query result.',
  properties: 'This field specifies the properties to use in the query.',
  recordCount: 'This field sets the maximum number of results.',
  orderBy: 'This field orders the query results by field.',
  descending: 'This field returns the query results in descending order.',
  queryBy: 'This optional field applies a filter to the query results.',
  productName: 'This field filters results by part number.',
};
