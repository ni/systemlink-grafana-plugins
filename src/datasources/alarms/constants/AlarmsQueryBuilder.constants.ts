import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum AlarmsQueryBuilderFieldNames {
  Name = 'name',
  Description = 'description',
  AlarmID = 'id',
  State = 'state',
  Severity = 'severity',
  SeverityLabel = 'severityLabel',
  Workspace = 'workspace',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  Message = 'message',
}

export const AlarmsQueryBuilderFields: Record<string, QBField> = {
  NAME: {
    label: 'Alarm name',
    dataField: AlarmsQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: AlarmsQueryBuilderFieldNames.Description,
    filterOperations: [QueryBuilderOperations.CONTAINS.name, QueryBuilderOperations.DOES_NOT_CONTAIN.name],
  },
  ALARM_ID: {
    label: 'Alarm ID',
    dataField: AlarmsQueryBuilderFieldNames.AlarmID,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  STATE: {
    label: 'State',
    dataField: AlarmsQueryBuilderFieldNames.State,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  SEVERITY: {
    label: 'Severity',
    dataField: AlarmsQueryBuilderFieldNames.Severity,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  SEVERITY_LABEL: {
    label: 'Severity Label',
    dataField: AlarmsQueryBuilderFieldNames.SeverityLabel,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: AlarmsQueryBuilderFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name],
  },
  CREATED_AT: {
    label: 'Created At',
    dataField: AlarmsQueryBuilderFieldNames.CreatedAt,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  UPDATED_AT: {
    label: 'Updated At',
    dataField: AlarmsQueryBuilderFieldNames.UpdatedAt,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  MESSAGE: {
    label: 'Message',
    dataField: AlarmsQueryBuilderFieldNames.Message,
    filterOperations: [QueryBuilderOperations.CONTAINS.name, QueryBuilderOperations.DOES_NOT_CONTAIN.name],
  },
};
