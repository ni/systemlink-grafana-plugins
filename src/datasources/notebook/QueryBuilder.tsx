import React, { useRef, useEffect } from 'react';
import { QueryBuilder, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';
import { queryBuilderMessages, customOperations } from 'core/query-builder.constants';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';

type TestResultsQueryBuilderProps = Omit<QueryBuilderProps, 'customOperations' | 'fields' | 'messages' | 'showIcons'> &
  React.HTMLAttributes<Element> & {
    autoComplete: (field: string, startsWith: string) => Promise<string[]>;
    defaultValue?: string;
  };

export const TestResultsQueryBuilder: React.FC<TestResultsQueryBuilderProps> = (props) => {
  const theme = useTheme2();
  // Need to set on body to affect dropdowns
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const initialize = useRef(true);
  useEffect(() => {
    initialize.current = false;
  }, []);

  const getDataSource = (field: string) => {
    return async (query: string, callback: Function) => {
      callback(await props.autoComplete(field, query));
    };
  };

  const fields = [
    {
      label: 'Part Number',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 2 },
    },
    {
      label: 'Test Program',
      dataField: 'programName',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('PROGRAM_NAME'), minLength: 2 },
    },
    {
      label: 'Batch SN',
      dataField: 'nitmBatchSerialNumber',
      dataType: 'string',
      filterOperations: [
        'propertyequals',
        'propertynotequals',
        'propertystartswith',
        'propertyendswith',
        'propertycontains',
        'propertynotcontains',
        'propertyisblank',
        'propertyisnotblank',
      ],
    },
    {
      label: 'Keyword',
      dataField: 'keywords',
      dataType: 'string',
      filterOperations: ['listequals', 'listnotequals', 'listcontains', 'listnotcontains'],
    },
    {
      label: 'Operator',
      dataField: 'operator',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('OPERATOR'), minLength: 2 },
    },
    {
      label: 'Serial Number',
      dataField: 'serialNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('SERIAL_NUMBER'), minLength: 2 },
    },
    {
      label: 'Started at',
      dataField: 'startedAt',
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
    { label: 'Started within', dataField: 'startedWithin', dataType: 'string', filterOperations: ['<='] },
    { label: 'Updated within', dataField: 'updatedWithin', dataType: 'string', filterOperations: ['<='] },
    {
      label: 'Status',
      dataField: 'status.statusType',
      dataType: 'string',
      filterOperations: ['=', '<>'],
      lookup: {
        dataSource: [
          { label: 'Passed', value: 'Passed' },
          { label: 'Failed', value: 'Failed' },
          { label: 'Running', value: 'Running' },
          { label: 'Terminated', value: 'Terminated' },
          { label: 'Errored', value: 'Errored' },
          { label: 'Done', value: 'Done' },
          { label: 'Looping', value: 'Looping' },
          { label: 'Skipped', value: 'Skipped' },
          { label: 'Waiting', value: 'Waiting' },
          { label: 'Timed Out', value: 'TimedOut' },
          { label: 'Custom', value: 'Custom' },
        ],
        readonly: true,
      },
    },
    {
      label: 'System ID',
      dataField: 'systemId',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains'],
      lookup: { dataSource: getDataSource('SYSTEM_ID'), minLength: 2 },
    },
    {
      label: 'System Alias',
      dataField: 'systemAlias',
      dataType: 'string',
      filterOperations: ['=', '<>'],
    },
    {
      label: 'Workspace',
      dataField: 'workspaceName',
      dataType: 'string',
      filterOperations: ['=', '<>'],
    },
  ];

  return (
    <QueryBuilder
      customOperations={customOperations}
      getDynamicField={getDynamicField}
      fields={fields}
      messages={queryBuilderMessages}
      showIcons
      // Only set value on first render
      {...(initialize.current && { value: props.defaultValue })}
      {...props}
    />
  );
};

const getDynamicField = () => ({
  filterOperations: [
    'propertyequals',
    'propertynotequals',
    'propertystartswith',
    'propertyendswith',
    'propertycontains',
    'propertynotcontains',
    'propertyisblank',
    'propertyisnotblank',
  ],
});
