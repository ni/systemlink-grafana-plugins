import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum WorkItemsQueryBuilderFieldNames {
  Name = 'name',
  WorkItemID = 'id',
  Type = 'type',
  State = 'state',
  Substate = 'substate',
  Description = 'description',
  ParentId = 'parentId',
  TemplateId = 'templateId',
  AssignedTo = 'assignedTo',
  RequestedBy = 'requestedBy',
  CreatedBy = 'createdBy',
  UpdatedBy = 'updatedBy',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  EarliestStartDateTime = 'timeline.earliestStartDateTime',
  DueDateTime = 'timeline.dueDateTime',
  EstimatedDurationInSeconds = 'timeline.estimatedDurationInSeconds',
  PlannedStartDateTime = 'schedule.plannedStartDateTime',
  PlannedEndDateTime = 'schedule.plannedEndDateTime',
  TestProgram = 'testProgram',
  PartNumber = 'partNumber',
  Workspace = 'workspace',
  Properties = 'properties',
}

export const WorkItemsQueryBuilderFields: Record<string, QBField> = {
  NAME: {
    label: 'Work item name',
    dataField: WorkItemsQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  WORK_ITEM_ID: {
    label: 'Work item ID',
    dataField: WorkItemsQueryBuilderFieldNames.WorkItemID,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
  },
  TYPE: {
    label: 'Work item type',
    dataField: WorkItemsQueryBuilderFieldNames.Type,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  STATE: {
    label: 'State',
    dataField: WorkItemsQueryBuilderFieldNames.State,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
    lookup: {
      dataSource: [
        { label: 'New', value: 'NEW' },
        { label: 'Defined', value: 'DEFINED' },
        { label: 'Reviewed', value: 'REVIEWED' },
        { label: 'Scheduled', value: 'SCHEDULED' },
        { label: 'In progress', value: 'IN_PROGRESS' },
        { label: 'Pending approval', value: 'PENDING_APPROVAL' },
        { label: 'Closed', value: 'CLOSED' },
        { label: 'Canceled', value: 'CANCELED' },
      ],
    },
  },
  SUBSTATE: {
    label: 'Substate',
    dataField: WorkItemsQueryBuilderFieldNames.Substate,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: WorkItemsQueryBuilderFieldNames.Description,
    filterOperations: [
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  PARENT_ID: {
    label: 'Parent work item ID',
    dataField: WorkItemsQueryBuilderFieldNames.ParentId,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  TEMPLATE_ID: {
    label: 'Template ID',
    dataField: WorkItemsQueryBuilderFieldNames.TemplateId,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  TEST_PROGRAM: {
    label: 'Test program',
    dataField: WorkItemsQueryBuilderFieldNames.TestProgram,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  PART_NUMBER: {
    label: 'Part number',
    dataField: WorkItemsQueryBuilderFieldNames.PartNumber,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  ASSIGNED_TO: {
    label: 'Assigned to',
    dataField: WorkItemsQueryBuilderFieldNames.AssignedTo,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  REQUESTED_BY: {
    label: 'Requested by',
    dataField: WorkItemsQueryBuilderFieldNames.RequestedBy,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  CREATED_BY: {
    label: 'Created by',
    dataField: WorkItemsQueryBuilderFieldNames.CreatedBy,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
  },
  UPDATED_BY: {
    label: 'Updated by',
    dataField: WorkItemsQueryBuilderFieldNames.UpdatedBy,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: WorkItemsQueryBuilderFieldNames.Workspace,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
  },
  EARLIEST_START_DATE_TIME: {
    label: 'Earliest start date',
    dataField: WorkItemsQueryBuilderFieldNames.EarliestStartDateTime,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  DUE_DATE_TIME: {
    label: 'Due date',
    dataField: WorkItemsQueryBuilderFieldNames.DueDateTime,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  ESTIMATED_DURATION_IN_SECONDS: {
    label: 'Estimated duration (seconds)',
    dataField: WorkItemsQueryBuilderFieldNames.EstimatedDurationInSeconds,
    dataType: 'number',
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
    ],
  },
  PLANNED_START_DATE_TIME: {
    label: 'Planned start date',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedStartDateTime,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  PLANNED_END_DATE_TIME: {
    label: 'Planned end date',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedEndDateTime,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  CREATED_AT: {
    label: 'Created',
    dataField: WorkItemsQueryBuilderFieldNames.CreatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ],
  },
  UPDATED_AT: {
    label: 'Updated',
    dataField: WorkItemsQueryBuilderFieldNames.UpdatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ],
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: WorkItemsQueryBuilderFieldNames.Properties,
    dataType: 'object',
    filterOperations: [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
    ],
  },
};

export const WorkItemsQueryBuilderStaticFields = [
  WorkItemsQueryBuilderFields.NAME,
  WorkItemsQueryBuilderFields.WORK_ITEM_ID,
  WorkItemsQueryBuilderFields.STATE,
  WorkItemsQueryBuilderFields.SUBSTATE,
  WorkItemsQueryBuilderFields.DESCRIPTION,
  WorkItemsQueryBuilderFields.PARENT_ID,
  WorkItemsQueryBuilderFields.TEMPLATE_ID,
  WorkItemsQueryBuilderFields.TEST_PROGRAM,
  WorkItemsQueryBuilderFields.PART_NUMBER,
  WorkItemsQueryBuilderFields.PROPERTIES,
];
