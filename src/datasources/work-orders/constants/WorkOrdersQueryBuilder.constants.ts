import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';
import { WorkOrdersFieldNames } from '../types';

export const WorkOrdersQueryBuilderFields: Record<string, QBField> = {
  NAME: {
    label: 'Name',
    dataField: WorkOrdersFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: WorkOrdersFieldNames.Description,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  WORK_ORDER_ID: {
    label: 'Work order ID',
    dataField: WorkOrdersFieldNames.WorkOrderID,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  STATE: {
    label: 'State',
    dataField: WorkOrdersFieldNames.State,
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
    dataField: WorkOrdersFieldNames.Type,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        {label: 'Test request', value: 'TestRequest'}
      ]
    }
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: WorkOrdersFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  EARLIEST_START_DATE: {
    label: 'Earliest start date',
    dataField: WorkOrdersFieldNames.EarliestStartDate,
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
    dataField: WorkOrdersFieldNames.DueDate,
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
    dataField: WorkOrdersFieldNames.CreatedAt,
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
    dataField: WorkOrdersFieldNames.UpdatedAt,
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
    dataField: WorkOrdersFieldNames.AssignedTo,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  REQUESTED_BY: {
    label: 'Requested by',
    dataField: WorkOrdersFieldNames.RequestedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  CREATED_BY: {
    label: 'Created by',
    dataField: WorkOrdersFieldNames.CreatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  UPDATED_BY: {
    label: 'Updated by',
    dataField: WorkOrdersFieldNames.UpdatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: WorkOrdersFieldNames.Properties,
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
  WorkOrdersQueryBuilderFields.ASSIGNED_TO,
  WorkOrdersQueryBuilderFields.REQUESTED_BY,
  WorkOrdersQueryBuilderFields.CREATED_BY,
  WorkOrdersQueryBuilderFields.UPDATED_BY,
  WorkOrdersQueryBuilderFields.PROPERTIES,
];
