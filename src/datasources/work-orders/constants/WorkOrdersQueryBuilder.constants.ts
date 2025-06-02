import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum WorkOrdersQueryBuilderFieldNames {
  Name = 'name',
  Description = 'description',
  WorkOrderID = 'id',
  State = 'state',
  Type = 'type',
  Workspace = 'workspace',
  EarliestStartDate = 'earliestStartDate',
  DueDate = 'dueDate',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  AssignedTo = 'assignedTo',
  RequestedBy = 'requestedBy',
  CreatedBy = 'createdBy',
  UpdatedBy = 'updatedBy',
  Properties = 'properties',
}

export const WorkOrdersQueryBuilderFields: Record<string, QBField> = {
  NAME: {
    label: 'Name',
    dataField: WorkOrdersQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: WorkOrdersQueryBuilderFieldNames.Description,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  WORK_ORDER_ID: {
    label: 'Work order ID',
    dataField: WorkOrdersQueryBuilderFieldNames.WorkOrderID,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  STATE: {
    label: 'State',
    dataField: WorkOrdersQueryBuilderFieldNames.State,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        {label: 'New', value: 'New'},
        {label: 'Defined', value: 'Defined'},
        {label: 'Reviewed', value: 'Reviewed'},
        {label: 'Scheduled', value: 'Scheduled'},
        {label: 'In progress', value: 'InProgress'},
        {label: 'Pending approval', value: 'PendingApproval'},
        {label: 'Closed', value: 'Closed'},
        {label: 'Cancelled', value: 'Cancelled'}
      ]
    }
  },
  TYPE: {
    label: 'Type',
    dataField: WorkOrdersQueryBuilderFieldNames.Type,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        {label: 'Test request', value: 'TestRequest'}
      ]
    }
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: WorkOrdersQueryBuilderFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  EARLIEST_START_DATE: {
    label: 'Earliest start date',
    dataField: WorkOrdersQueryBuilderFieldNames.EarliestStartDate,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
    ],
  },
  DUE_DATE: {
    label: 'Due date',
    dataField: WorkOrdersQueryBuilderFieldNames.DueDate,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
    ],
  },
  CREATED_AT: {
    label: 'Created',
    dataField: WorkOrdersQueryBuilderFieldNames.CreatedAt,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
    ],
  },
  UPDATED_AT: {
    label: 'Updated',
    dataField: WorkOrdersQueryBuilderFieldNames.UpdatedAt,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
    ],
  },
  ASSIGNED_TO: {
    label: 'Assigned to',
    dataField: WorkOrdersQueryBuilderFieldNames.AssignedTo,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  REQUESTED_BY: {
    label: 'Requested by',
    dataField: WorkOrdersQueryBuilderFieldNames.RequestedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  CREATED_BY: {
    label: 'Created by',
    dataField: WorkOrdersQueryBuilderFieldNames.CreatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  UPDATED_BY: {
    label: 'Updated by',
    dataField: WorkOrdersQueryBuilderFieldNames.UpdatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: WorkOrdersQueryBuilderFieldNames.Properties,
    dataType: 'object',
    filterOperations: [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
    ],
  },
};

export const WorkOrdersQueryBuilderStaticFields = [
  WorkOrdersQueryBuilderFields.NAME,
  WorkOrdersQueryBuilderFields.DESCRIPTION,
  WorkOrdersQueryBuilderFields.WORK_ORDER_ID,
  WorkOrdersQueryBuilderFields.STATE,
  WorkOrdersQueryBuilderFields.TYPE,
  WorkOrdersQueryBuilderFields.WORKSPACE,
  WorkOrdersQueryBuilderFields.EARLIEST_START_DATE,
  WorkOrdersQueryBuilderFields.DUE_DATE,
  WorkOrdersQueryBuilderFields.CREATED_AT,
  WorkOrdersQueryBuilderFields.UPDATED_AT,
  WorkOrdersQueryBuilderFields.ASSIGNED_TO,
  WorkOrdersQueryBuilderFields.REQUESTED_BY,
  WorkOrdersQueryBuilderFields.CREATED_BY,
  WorkOrdersQueryBuilderFields.UPDATED_BY,
  WorkOrdersQueryBuilderFields.PROPERTIES,
];
