import React, { useRef, useEffect } from 'react';
import { QueryBuilder, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';

type TestStepsQueryBuilderProps = Omit<QueryBuilderProps, 'customOperations' | 'fields' | 'messages' | 'showIcons'> &
  React.HTMLAttributes<Element> & {
    autoComplete: (field: string, startsWith: string) => Promise<string[]>;
    defaultValue?: string;
  };

export const TestStepsQueryBuilder: React.FC<TestStepsQueryBuilderProps> = (props) => {
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
      label: 'Step name',
      dataField: 'name',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith', 'endswith', 'contains', 'notcontains', 'isblank', 'isnotblank'],
      lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    {
      label: 'Step keywords',
      dataField: 'keywords',
      dataType: 'string',
      filterOperations: ['=', '<>', 'contains', 'notcontains',]
    },
    {
      label: 'Step path',
      dataField: 'path',
      dataType: 'string',
      filterOperations: ['=', '<>', 'startswith'],
      lookup: { dataSource: getDataSource('PATH'), minLength: 1}
    },
    {
      label: 'Step type',
      dataField: 'stepType',
      dataType: 'string',
      filterOperations: ['=', '<>'],
      lookup: { dataSource: ['NumericLimitTest', 'MultipleNumericLimitTest', 'StringValueTest'] },
    },
    {
      label: 'Step status',
      dataField: 'status.statusType',
      dataType: 'string',
      filterOperations: ['=', '<>',],
      lookup: { dataSource: ['custom', 'failed', 'passed', 'skipped', 'done', 'running', 'waiting', 'errored', 'looping', 'timedout', 'terminated'] },
    },
    {
      label: 'Step started at',
      dataField: 'stepStartedAt',
      dataType: 'string',
      filterOperations: ['is after', 'is before',],
      // lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    {
      label: 'Step total time',
      dataField: 'totalTimeInSeconds ',
      dataType: 'string',
      filterOperations: ['=', '<>', '>', '>=', '<', '<='],
    },
    {
      label: 'Step updated at',
      dataField: 'stepUpdatedAt',
      dataType: 'string',
      filterOperations: ['is after', 'is before',],
      // lookup: { dataSource: getDataSource('NAME'), minLength: 1 },
    },
    
  ];

  return (
    <QueryBuilder
      customOperations={customOperations}
      getDynamicField={getDynamicField}
      fields={ fields}
      messages={messages}
      showIcons
      // Only set value on first render
      {...(initialize.current && { value: props.value })}
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
