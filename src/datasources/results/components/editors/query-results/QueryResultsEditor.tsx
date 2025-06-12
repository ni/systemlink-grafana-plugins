import { SelectableValue } from '@grafana/data';
import {
  AutoSizeInput,
  InlineField,
  MultiSelect,
  RadioButtonGroup,
  VerticalGroup,
} from '@grafana/ui';
import { enumToOptions, validateNumericInput } from 'core/utils';
import React, { useEffect, useState } from 'react';
import '../../ResultsQueryEditor.scss';
import { QueryResults, ResultsProperties } from 'datasources/results/types/QueryResults.types';
import { OutputType, TestMeasurementStatus } from 'datasources/results/types/types';
import { TimeRangeControls } from '../time-range/TimeRangeControls';
import { Workspace } from 'core/types';
import { QueryResultsDataSource } from 'datasources/results/query-handlers/query-results/QueryResultsDataSource';
import { ResultsQueryBuilder } from '../../query-builders/query-results/ResultsQueryBuilder';
import { FloatingError } from 'core/errors';
import { TAKE_LIMIT } from 'datasources/test-plans/constants/QueryEditor.constants';
import { recordCountErrorMessages } from 'datasources/results/constants/ResultsQueryEditor.constants';

type Props = {
  query: QueryResults;
  handleQueryChange: (query: QueryResults, runQuery?: boolean) => void;
  datasource: QueryResultsDataSource;
};

export function QueryResultsEditor({ query, handleQueryChange, datasource }: Props) {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [recordCountInvalidMessage, setRecordCountInvalidMessage] = useState<string>('');
  const [isPropertiesValid, setIsPropertiesValid] = useState<boolean>(true);

  useEffect(() => {
    const loadWorkspaces = async () => {
      const workspaces = await datasource.workspacesCache;
      setWorkspaces(Array.from(workspaces.values()));
    };
    const loadPartNumbers = async () => {
      const partNumbers = await datasource.partNumbersCache;
      setPartNumbers(partNumbers);
    };
    loadPartNumbers();
    loadWorkspaces();
  }, [datasource]);

  const onOutputChange = (value: OutputType) => {
    handleQueryChange({ ...query, outputType: value });
  };

  const onPropertiesChange = (items: Array<SelectableValue<string>>) => {
    setIsPropertiesValid(items.length > 0);
    if (items !== undefined) {
      handleQueryChange({ ...query, properties: items.map(i => i.value as ResultsProperties) });
    }
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

  const onParameterChange = (value: string) => {
    if (query.queryBy !== value) {
      query.queryBy = value;
      handleQueryChange({ ...query, queryBy: value });
    }
  }

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
          <InlineField
            label="Properties"
            labelWidth={26}
            tooltip={tooltips.properties}
            invalid={!isPropertiesValid}
            error='You must select at least one property.'>
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
        <div className="results-horizontal-control-group">
          <InlineField label="Query By" labelWidth={26} tooltip={tooltips.queryBy}>
            <ResultsQueryBuilder
              filter={query.queryBy}
              workspaces={workspaces}
              status={enumToOptions(TestMeasurementStatus).map(option => option.value as string)}
              partNumbers={partNumbers}
              globalVariableOptions={datasource.globalVariableOptions()}
              onChange={(event: any) => onParameterChange(event.detail.linq)}>
            </ResultsQueryBuilder>
          </InlineField>
          {query.outputType === OutputType.Data && (
            <div className="results-right-query-controls">
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
                  onKeyDown={(event) => {validateNumericInput(event)}}
                />
              </InlineField>
            </div>
          )}
        </div>
        </div>
      </VerticalGroup>
      <FloatingError message={datasource.errorTitle} innerMessage={datasource.errorDescription} severity='warning'/>
    </>
  );
}

const tooltips = {
  output: 'This field specifies the output type for the query result.',
  properties: 'This field specifies the properties to use in the query.',
  recordCount: 'This field sets the maximum number of results.',
  queryBy: 'This optional field applies a filter to the query results.',
};
