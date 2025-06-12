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
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  DUE_DATE: {
    label: 'Due date',
    dataField: WorkOrdersQueryBuilderFieldNames.DueDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
},
  CREATED_AT: {
    label: 'Created',
    dataField: WorkOrdersQueryBuilderFieldNames.CreatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ],
  },
  UPDATED_AT: {
    label: 'Updated',
    dataField: WorkOrdersQueryBuilderFieldNames.UpdatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
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
  WorkOrdersQueryBuilderFields.PROPERTIES,
  WorkOrdersQueryBuilderFields.DUE_DATE,
];
