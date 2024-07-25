import React, { useRef, useEffect } from 'react';
import { QueryBuilder, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';
import { TestInsightQueryType } from './types';

type TestResultsQueryBuilderProps = Omit<QueryBuilderProps, 'customOperations' | 'fields' | 'messages' | 'showIcons'> &
  React.HTMLAttributes<Element> & {
    queryType: string
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
      lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Family',
      dataField: 'family',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('FAMILY'), minLength: 1},
    },
    {
      label: 'Name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
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
      dataField: 'workspaceName',
      dataType: 'string',
      filterOperations: ['=', '<>'],
    },
  ];

  const resultFields = [
    {
      label: 'Part Number',
      dataField: 'partNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('PART_NUMBER'), minLength: 1 },
    },
    {
      label: 'Test Program',
      dataField: 'programName',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('PROGRAM_NAME'), minLength: 1 },
    },
    {
      label: 'Serial Number',
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
      lookup: { dataSource: getDataSource('OPERATOR'), minLength: 1 },
    },
    {
      label: 'Serial Number',
      dataField: 'serialNumber',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('SERIAL_NUMBER'), minLength: 1 },
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
      lookup: { dataSource: getDataSource('SYSTEM_ID'), minLength: 1 },
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

  const queryBuilderFields = props.queryType === TestInsightQueryType.Products ? fields : resultFields
  return (
    <QueryBuilder
      customOperations={customOperations}
      getDynamicField={getDynamicField}
      fields={ queryBuilderFields}
      messages={messages}
      showIcons
      // Only set value on first render
      {...(initialize.current && { value: props.defaultValue })}
      {...props}
    />
  );
};

const customOperations = [
  // Regular field expressions
  {
    label: 'Equals',
    name: '=',
    expressionTemplate: '{0} = "{1}"',
  },
  {
    label: 'Does not equal',
    name: '<>',
    expressionTemplate: '{0} != "{1}"',
  },
  {
    label: 'Starts with',
    name: 'startswith',
    expressionTemplate: '{0}.StartsWith("{1}")',
  },
  {
    label: 'Ends with',
    name: 'endswith',
    expressionTemplate: '{0}.EndsWith("{1}")',
  },
  {
    label: 'Contains',
    name: 'contains',
    expressionTemplate: '{0}.Contains("{1}")',
  },
  {
    label: 'Does not contain',
    name: 'notcontains',
    expressionTemplate: '!({0}.Contains("{1}"))',
  },
  {
    label: 'Is blank',
    name: 'isblank',
    expressionTemplate: 'string.IsNullOrEmpty({0})',
    hideValue: true,
  },
  {
    label: 'Is not blank',
    name: 'isnotblank',
    expressionTemplate: '!string.IsNullOrEmpty({0})',
    hideValue: true,
  },
  {
    label: 'Greater than',
    name: '>',
    expressionTemplate: '{0} > "{1}"',
  },
  {
    label: 'Greater than or equal to',
    name: '>=',
    expressionTemplate: '{0} >= "{1}"',
  },
  {
    label: 'Less than',
    name: '<',
    expressionTemplate: '{0} < "{1}"',
  },
  {
    label: 'Less than or equal to',
    name: '<=',
    expressionTemplate: '{0} <= "{1}"',
  },
  // List expressions
  {
    label: 'Equals',
    name: 'listequals',
    expressionTemplate: '{0}.Contains("{1}")',
  },
  {
    label: 'Does not equal',
    name: 'listnotequals',
    expressionTemplate: '!({0}.Contains("{1}"))',
  },
  {
    label: 'Contains',
    name: 'listcontains',
    expressionTemplate: '{0}.Any(it.Contains("{1}"))',
  },
  {
    label: 'Does not contain',
    name: 'listnotcontains',
    expressionTemplate: '{0}.Any(!it.Contains("{1}"))',
  },
  // Properties expressions
  {
    label: 'Equals',
    name: 'propertyequals',
    expressionTemplate: 'properties["{0}"] = "{1}"',
  },
  {
    label: 'Does not equal',
    name: 'propertynotequals',
    expressionTemplate: 'properties["{0}"] != "{1}"',
  },
  {
    label: 'Starts with',
    name: 'propertystartswith',
    expressionTemplate: 'properties["{0}"].StartsWith("{1}")',
  },
  {
    label: 'Ends with',
    name: 'propertyendswith',
    expressionTemplate: 'properties["{0}"].EndsWith("{1}")',
  },
  {
    label: 'Contains',
    name: 'propertycontains',
    expressionTemplate: 'properties["{0}"].Contains("{1}")',
  },
  {
    label: 'Does not contains',
    name: 'propertynotcontains',
    expressionTemplate: '!(properties["{0}"].Contains("{1}"))',
  },
  {
    label: 'Is blank',
    name: 'propertyisblank',
    expressionTemplate: 'string.IsNullOrEmpty(properties["{0}"])',
    hideValue: true,
  },
  {
    label: 'Is not blank',
    name: 'propertyisnotblank',
    expressionTemplate: '!string.IsNullOrEmpty(properties["{0}"])',
    hideValue: true,
  },
];

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

const messages = {
  en: {
    propertyUnknownType: "'' property is with undefined 'type' member!",
    propertyInvalidValue: "Invalid '!",
    propertyInvalidValueType: "Invalid '!",
    elementNotInDOM: 'Element does not exist in DOM! Please, add the element to the DOM, before invoking a method.',
    moduleUndefined: 'Module is undefined.',
    missingReference: '.',
    htmlTemplateNotSuported: ": Browser doesn't support HTMLTemplate elements.",
    invalidTemplate: "' property accepts a string that must match the id of an HTMLTemplate element from the DOM.",
    add: 'Add',
    addCondition: 'Add Condition',
    addGroup: 'Add Group',
    and: 'And',
    notand: 'Not And',
    or: 'Or',
    notor: 'Not Or',
    '=': 'Equals',
    '<>': 'Does not equal',
    '>': 'Greater than',
    '>=': 'Greater than or equal to',
    '<': 'Less than',
    '<=': 'Less than or equal to',
    startswith: 'Starts with',
    endswith: 'Ends with',
    contains: 'Contains',
    notcontains: 'Does not contain',
    isblank: 'Is blank',
    isnotblank: 'Is not blank',
    wrongParentGroupIndex: "' method.",
    missingFields:
      ': Fields are required for proper condition\'s adding. Set "fields" source and then conditions will be added as expected.',
    wrongElementNode: "' method.",
    invalidDataStructure: ': Used invalid data structure in updateCondition/updateGroup method.',
    dateTabLabel: 'DATE',
    timeTabLabel: 'TIME',
    queryLabel: '',
  },
};
