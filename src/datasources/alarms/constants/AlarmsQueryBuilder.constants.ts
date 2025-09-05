import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum AlarmsQueryBuilderFieldNames {
  Acknowledged = 'acknowledged',
  Active = 'active',
  AlarmID = 'alarmId',
  AlarmName = 'displayName',
  Channel = 'channel',
  Clear = 'clear',
  CreatedBy = 'createdBy',
  CurrentSeverity = 'currentSeverityLevel',
  Description = 'description',
  HighestSeverity = 'highestSeverityLevel',
  ResourceType = 'resourceType',
}

export const AlarmsQueryBuilderFields: Record<string, QBField> = {
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    dataField: AlarmsQueryBuilderFieldNames.Acknowledged,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
  },
  ACTIVE: {
    label: 'Active',
    dataField: AlarmsQueryBuilderFieldNames.Active,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
  },
  ALARM_ID: {
    label: 'Alarm ID',
    dataField: AlarmsQueryBuilderFieldNames.AlarmID,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  ALARM_NAME: {
    label: 'Alarm name',
    dataField: AlarmsQueryBuilderFieldNames.AlarmName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  CHANNEL: {
    label: 'Channel',
    dataField: AlarmsQueryBuilderFieldNames.Channel,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  CLEAR: {
    label: 'Clear',
    dataField: AlarmsQueryBuilderFieldNames.Clear,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
  },
  CREATED_BY: {
    label: 'Created by',
    dataField: AlarmsQueryBuilderFieldNames.CreatedBy,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  CURRENT_SEVERITY: {
    label: 'Current Severity',
    dataField: AlarmsQueryBuilderFieldNames.CurrentSeverity,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'Clear', value: '-1' },
        { label: 'Low (1)', value: '1' },
        { label: 'Moderate (2)', value: '2' },
        { label: 'High (3)', value: '3' },
        { label: 'Critical (4)', value: '4' },
      ],
    },
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: AlarmsQueryBuilderFieldNames.Description,
    filterOperations: [
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  HIGHEST_SEVERITY: {
    label: 'Highest Severity',
    dataField: AlarmsQueryBuilderFieldNames.HighestSeverity,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'Clear', value: '-1' },
        { label: 'Low (1)', value: '1' },
        { label: 'Moderate (2)', value: '2' },
        { label: 'High (3)', value: '3' },
        { label: 'Critical (4)', value: '4' },
      ],
    },
  },
  RESOURCE_TYPE: {
    label: 'Resource type',
    dataField: AlarmsQueryBuilderFieldNames.ResourceType,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
};

export const AlarmsQueryBuilderStaticFields = [
  AlarmsQueryBuilderFields.ACKNOWLEDGED,
  AlarmsQueryBuilderFields.ACTIVE,
  AlarmsQueryBuilderFields.ALARM_ID,
  AlarmsQueryBuilderFields.ALARM_NAME,
  AlarmsQueryBuilderFields.CHANNEL,
  AlarmsQueryBuilderFields.CLEAR,
  AlarmsQueryBuilderFields.CURRENT_SEVERITY,
  AlarmsQueryBuilderFields.DESCRIPTION,
  AlarmsQueryBuilderFields.HIGHEST_SEVERITY,
  AlarmsQueryBuilderFields.RESOURCE_TYPE,
];
