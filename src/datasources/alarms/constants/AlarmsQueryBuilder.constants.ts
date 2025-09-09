import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum AlarmsQueryBuilderFieldNames {
  Acknowledged = 'acknowledged',
  AcknowledgedOn = 'acknowledgedAt',
  Active = 'active',
  AlarmID = 'alarmId',
  AlarmName = 'displayName',
  Channel = 'channel',
  Clear = 'clear',
  CreatedBy = 'createdBy',
  CurrentSeverity = 'currentSeverityLevel',
  Description = 'description',
  FirstOccurrence = 'occurredAt',
  HighestSeverity = 'highestSeverityLevel',
  Keyword = 'keywords',
  Properties = 'properties',
  ResourceType = 'resourceType',
}

const SEVERITY_LEVELS = [
  { label: 'Low', value: '1' },
  { label: 'Moderate', value: '2' },
  { label: 'High', value: '3' },
  { label: 'Critical', value: '4' },
  { label: 'Clear', value: '-1' },
];

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
  ACKNOWLEDGED_ON: {
    label: 'Acknowledged on',
    dataField: AlarmsQueryBuilderFieldNames.AcknowledgedOn,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
    ],
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
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  CURRENT_SEVERITY: {
    label: 'Current severity',
    dataField: AlarmsQueryBuilderFieldNames.CurrentSeverity,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
        dataSource: SEVERITY_LEVELS,
    },
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: AlarmsQueryBuilderFieldNames.Description,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  FIRST_OCCURRENCE: {
    label: 'First occurrence',
    dataField: AlarmsQueryBuilderFieldNames.FirstOccurrence,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
    ],
  },
  HIGHEST_SEVERITY: {
    label: 'Highest severity',
    dataField: AlarmsQueryBuilderFieldNames.HighestSeverity,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: SEVERITY_LEVELS,
    },
  },
  KEYWORD: {
    label: 'Keyword',
    dataField: AlarmsQueryBuilderFieldNames.Keyword,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_CONTAINS.name,
      QueryBuilderOperations.LIST_DOES_NOT_CONTAIN.name,
    ],
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: AlarmsQueryBuilderFieldNames.Properties,
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
    dataField: AlarmsQueryBuilderFieldNames.ResourceType,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
};

export const AlarmsQueryBuilderStaticFields: QBField[] = [
  AlarmsQueryBuilderFields.ACKNOWLEDGED,
  AlarmsQueryBuilderFields.ACKNOWLEDGED_ON,
  AlarmsQueryBuilderFields.ACTIVE,
  AlarmsQueryBuilderFields.ALARM_ID,
  AlarmsQueryBuilderFields.ALARM_NAME,
  AlarmsQueryBuilderFields.CHANNEL,
  AlarmsQueryBuilderFields.CLEAR,
  AlarmsQueryBuilderFields.CREATED_BY,
  AlarmsQueryBuilderFields.CURRENT_SEVERITY,
  AlarmsQueryBuilderFields.DESCRIPTION,
  AlarmsQueryBuilderFields.FIRST_OCCURRENCE,
  AlarmsQueryBuilderFields.HIGHEST_SEVERITY,
  AlarmsQueryBuilderFields.KEYWORD,
  AlarmsQueryBuilderFields.PROPERTIES,
  AlarmsQueryBuilderFields.RESOURCE_TYPE,
];
