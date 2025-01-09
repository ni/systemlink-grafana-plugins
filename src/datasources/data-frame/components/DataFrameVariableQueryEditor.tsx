import React, { useState } from 'react';
import { AsyncSelect, RadioButtonGroup } from '@grafana/ui';
import { InlineField } from 'core/components/InlineField';
import { toOption } from '@grafana/data';
import { isValidId } from '../utils';
import { FloatingError, parseErrorMessage } from '../../../core/errors';
import { DataFrameQueryEditorCommon, Props } from './DataFrameQueryEditorCommon';
import { TestMonitorQueryBuilder } from 'shared/queryBuilder';
import { enumToOptions } from 'core/utils';

export function DataFrameVariableQueryEditor(props: Props) {
  const [errorMsg, setErrorMsg] = useState<string | undefined>('');
  const handleError = (error: Error) => setErrorMsg(parseErrorMessage(error));
  const common = new DataFrameQueryEditorCommon(props, handleError);

  const fields = [
    {
      label: 'Id',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank',],
      // lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Family',
      dataField: 'family',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      // lookup: { dataSource: getDataSource('FAMILY'), minLength: 1},
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      // lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    {
      label: 'Properties',
      dataField: 'properties',
      dataType: 'Object',
      filterOperations: ['key_value_matches'],
    },
    {
      label: 'Updated at',
      dataField: 'updatedAt',
      dataType: 'string',
      filterOperations: ['>', '>=', '<', '<='],
      lookup: {
        dataSource: [
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'From (YYYY-MM-DD)', value: '${__from:date:YYYY-MM-DD}' },
          { label: 'To (YYYY-MM-DD)', value: '${__to:date:YYYY-MM-DD}' },
        ],
      },
    },
    {
      label: 'Workspace',
      dataField: 'workspace',
      dataType: 'string',
      filterOperations: ['=', '<>'],
      // lookup: { dataSource: workspaces},
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* <InlineField label="Id">
        <AsyncSelect
          allowCreateWhileLoading
          allowCustomValue
          cacheOptions={false}
          defaultOptions
          isValidNewOption={isValidId}
          loadOptions={common.handleLoadOptions}
          onChange={common.handleIdChange}
          placeholder="Search by name or enter id"
          width={30}
          value={common.query.tableId ? toOption(common.query.tableId) : null}
        />
      </InlineField> */}
      <InlineField label='Query By' tooltip={'Select query by'}>
            <TestMonitorQueryBuilder
              onChange={(event: any) => { }}
              // defaultValue={query.queryBy}
              fields={fields}
            />
          </InlineField>
      <FloatingError message={errorMsg}/>
    </div>
  );
}
