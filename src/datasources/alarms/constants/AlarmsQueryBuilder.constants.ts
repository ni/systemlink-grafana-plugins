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

export const AlarmsQueryBuilderFields: Record<string, QBField> = {
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    dataField: 'acknowledged',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: BOOLEAN_OPTIONS,
    },
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
  HIGHEST_SEVERITY: {
    label: 'Highest severity',
    dataField: 'highestSeverityLevel',
    filterOperations: BOOLEAN_FILTER_OPERATIONS,
    lookup: {
      dataSource: SEVERITY_LEVELS,
    },
  },
  RESOURCE_TYPE: {
    label: 'Resource type',
    dataField: 'resourceType',
    filterOperations: BASIC_STRING_FILTER_OPERATIONS,
  },
};

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
  AlarmsQueryBuilderFields.RESOURCE_TYPE,
];
