import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

const BOOLEAN_FILTER_OPERATIONS = [
  QueryBuilderOperations.EQUALS.name, 
  QueryBuilderOperations.DOES_NOT_EQUAL.name
];

const BASIC_STRING_FILTER_OPERATIONS = [
  QueryBuilderOperations.EQUALS.name,
  QueryBuilderOperations.DOES_NOT_EQUAL.name,
  QueryBuilderOperations.CONTAINS.name,
  QueryBuilderOperations.DOES_NOT_CONTAIN.name,
];

const EXTENDED_STRING_FILTER_OPERATIONS = [
  ...BASIC_STRING_FILTER_OPERATIONS,
  QueryBuilderOperations.IS_BLANK.name,
  QueryBuilderOperations.IS_NOT_BLANK.name,
];

const DATE_TIME_FILTER_OPERATIONS = [
  QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
  QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
];

export const SEVERITY_LEVELS = [
  { label: 'Low', value: '1' },
  { label: 'Moderate', value: '2' },
  { label: 'High', value: '3' },
  { label: 'Critical', value: '4' },
  { label: 'Clear', value: '-1' },
];

export const BOOLEAN_OPTIONS = [
  { label: 'True', value: 'true' },
  { label: 'False', value: 'false' },
];

export const TIME_OPTIONS = [
  { label: 'From', value: '${__from:date}' },
  { label: 'To', value: '${__to:date}' },
  { label: 'Now', value: '${__now:date}' },
];

export const AlarmsQueryBuilderFields: Record<string, QBField> = {
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    dataField: 'acknowledged',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: BOOLEAN_OPTIONS,
    },
  },
  ACKNOWLEDGED_ON: {
    label: 'Acknowledged on',
    dataField: 'acknowledgedAt',
    filterOperations: DATE_TIME_FILTER_OPERATIONS,
  },
  ACTIVE: {
    label: 'Active',
    dataField: 'active',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: BOOLEAN_OPTIONS,
    },
  },
  ALARM_ID: {
    label: 'Alarm ID',
    dataField: 'alarmId',
    filterOperations: BASIC_STRING_FILTER_OPERATIONS,
  },
  ALARM_NAME: {
    label: 'Alarm name',
    dataField: 'displayName',
    filterOperations: EXTENDED_STRING_FILTER_OPERATIONS,
  },
  CHANNEL: {
    label: 'Channel',
    dataField: 'channel',
    filterOperations: EXTENDED_STRING_FILTER_OPERATIONS,
  },
  CLEAR: {
    label: 'Clear',
    dataField: 'clear',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: BOOLEAN_OPTIONS,
    },
  },
  CREATED_BY: {
    label: 'Created by',
    dataField: 'createdBy',
    filterOperations: EXTENDED_STRING_FILTER_OPERATIONS,
  },
  CURRENT_SEVERITY: {
    label: 'Current severity',
    dataField: 'currentSeverityLevel',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
        dataSource: SEVERITY_LEVELS,
    },
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: 'description',
    filterOperations: EXTENDED_STRING_FILTER_OPERATIONS,
  },
  FIRST_OCCURRENCE: {
    label: 'First occurrence',
    dataField: 'occurredAt',
    filterOperations: DATE_TIME_FILTER_OPERATIONS,
  },
  HIGHEST_SEVERITY: {
    label: 'Highest severity',
    dataField: 'highestSeverityLevel',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: SEVERITY_LEVELS,
    },
  },
  KEYWORD: {
    label: 'Keyword',
    dataField: 'keywords',
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_CONTAINS.name,
      QueryBuilderOperations.LIST_DOES_NOT_CONTAIN.name,
    ],
  },
  LAST_TRANSITION_OCCURRENCE: {
    label: 'Last transition occurrence',
    dataField: 'mostRecentTransitionOccurredAt',
    filterOperations: DATE_TIME_FILTER_OPERATIONS,
  },
  LAST_OCCURRENCE: {
    label: 'Last occurrence',
    dataField: 'mostRecentSetOccurredAt',
    filterOperations: DATE_TIME_FILTER_OPERATIONS,
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: 'properties',
    dataType: 'object',
    filterOperations: [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
    ],
  },
  RESOURCE_TYPE: {
    label: 'Resource type',
    dataField: 'resourceType',
    filterOperations: BASIC_STRING_FILTER_OPERATIONS,
  },
  SOURCE: {
    label: 'Source',
    dataField: 'source',
    filterOperations: [
      QueryBuilderOperations.EQUALS.name, 
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
      /* #AB#3422087 - Switch to BASIC_STRING_FILTER_OPERATIONS 
      once transformation support for "contains" and "does not contain" 
      is implemented */
    ],
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: 'workspace',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
  }
};

export const ALARMS_TIME_FIELDS = [
  AlarmsQueryBuilderFields.FIRST_OCCURRENCE.dataField,
  AlarmsQueryBuilderFields.ACKNOWLEDGED_ON.dataField,
  AlarmsQueryBuilderFields.LAST_TRANSITION_OCCURRENCE.dataField,
  AlarmsQueryBuilderFields.LAST_OCCURRENCE.dataField,
];

export const AlarmsQueryBuilderStaticFields: QBField[] = [
  AlarmsQueryBuilderFields.ACKNOWLEDGED,
  AlarmsQueryBuilderFields.ACTIVE,
  AlarmsQueryBuilderFields.ALARM_ID,
  AlarmsQueryBuilderFields.ALARM_NAME,
  AlarmsQueryBuilderFields.CHANNEL,
  AlarmsQueryBuilderFields.CLEAR,
  AlarmsQueryBuilderFields.CREATED_BY,
  AlarmsQueryBuilderFields.CURRENT_SEVERITY,
  AlarmsQueryBuilderFields.DESCRIPTION,
  AlarmsQueryBuilderFields.HIGHEST_SEVERITY,
  AlarmsQueryBuilderFields.KEYWORD,
  AlarmsQueryBuilderFields.PROPERTIES,
  AlarmsQueryBuilderFields.RESOURCE_TYPE,
  AlarmsQueryBuilderFields.SOURCE,
];
