import { InlineField } from 'core/components/InlineField';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import React from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { ResultsQueryBuilder } from 'datasources/results/components/query-builders/query-results/ResultsQueryBuilder';
import { DataframeQueryBuilder } from './DataframeQuerybuilder';

export function DataFrameVariableQueryEditor(props: Props) {
  const onDecimationMethodChange = (item: SelectableValue<string>) => {
    const common = new DataFrameQueryEditorCommon(props, handleError);
    common.handleQueryChange({ ...props.query, decimationMethod: item.value! }, false);
  };

  return (
    <>
      <InlineField label="Query type" labelWidth={30} tooltip="Select the type of query to run">
        <Select
          options={[{ label: 'List data table', value: '' }]}
          onChange={onDecimationMethodChange}
          value={'List data tables'}
          defaultValue={{ label: 'List data table', value: '' }}
          width={65.5}
        ></Select>
      </InlineField>
        {/* <InlineField label="Query by results properties" labelWidth={30} tooltip="Select the type of query to run">
          <ResultsQueryBuilder
            filter={''}
            workspaces={[]}
            status={[]}
            partNumbers={[]}
            globalVariableOptions={[]}
            onChange={(event: any) => {}}
          ></ResultsQueryBuilder>
        </InlineField> */}
        <InlineField label="Query by data table properties" labelWidth={30} tooltip="Select the type of query to run">
          <DataframeQueryBuilder
            filter={''}
            workspaces={[]}
            globalVariableOptions={[]}
            onChange={(event: any) => {}}
          ></DataframeQueryBuilder>
        </InlineField>
        {/* <InlineField label="Query by column properties" labelWidth={30} tooltip="Select the type of query to run">
          <DataframeQueryBuilder
            filter={''}
            workspaces={[]}
            globalVariableOptions={[]}
            onChange={(event: any) => {}}
          ></DataframeQueryBuilder>
        </InlineField> */}
    </>
  );
}
function handleError(error: Error): void {
  throw new Error('Function not implemented.');
}
