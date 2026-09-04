import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';
import { WorkItemTypes } from '../constants/QueryEditor.constants';
import { WorkItemState } from '../types';

export enum WorkItemsQueryBuilderFieldNames {
  Id = 'id',
  Name = 'name',
  Type = 'type',
  State = 'state',
  Description = 'description',
  TestProgram = 'testProgram',
  PartNumber = 'partNumber',
  Workspace = 'workspace',
  AssignedTo = 'assignedTo',
  RequestedBy = 'requestedBy',
  CreatedBy = 'createdBy',
  UpdatedBy = 'updatedBy',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
  ParentWorkItemId = 'parentId',
  TemplateId = 'templateId',
  EarliestStartDate = 'timeline.earliestStartDateTime',
  DueDate = 'timeline.dueDateTime',
  EstimatedDurationInDays = 'estimatedDurationInDays',
  EstimatedDurationInHours = 'estimatedDurationInHours',
  PlannedStartDate = 'schedule.plannedStartDateTime',
  PlannedEndDate = 'schedule.plannedEndDateTime',
  PlannedDurationInDays = 'plannedDurationInDays',
  PlannedDurationInHours = 'plannedDurationInHours',
  AssetId = 'assets',
  DutId = 'duts',
  FixtureId = 'fixtures',
  SystemAliasName = 'systems',
  Properties = 'properties',
}

export const WorkItemsQueryBuilderFields: Record<string, QBField> = {
  // Work item details
  ID: {
    label: 'ID',
    dataField: WorkItemsQueryBuilderFieldNames.Id,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  NAME: {
    label: 'Name',
    dataField: WorkItemsQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  TYPE: {
    label: 'Type',
    dataField: WorkItemsQueryBuilderFieldNames.Type,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: WorkItemTypes.map(({ label, value }) => ({ label, value })),
    },
  },
  STATE: {
    label: 'State',
    dataField: WorkItemsQueryBuilderFieldNames.State,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [
        { label: 'New', value: WorkItemState.New },
        { label: 'Defined', value: WorkItemState.Defined },
        { label: 'Reviewed', value: WorkItemState.Reviewed },
        { label: 'Scheduled', value: WorkItemState.Scheduled },
        { label: 'In progress', value: WorkItemState.InProgress },
        { label: 'Pending approval', value: WorkItemState.PendingApproval },
        { label: 'Closed', value: WorkItemState.Closed },
        { label: 'Canceled', value: WorkItemState.Canceled },
      ],
    },
  },
  DESCRIPTION: {
    label: 'Description',
    dataField: WorkItemsQueryBuilderFieldNames.Description,
    filterOperations: [QueryBuilderOperations.CONTAINS.name, QueryBuilderOperations.DOES_NOT_CONTAIN.name],
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
    label: 'Product name (Part number)',
    dataField: WorkItemsQueryBuilderFieldNames.PartNumber,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: WorkItemsQueryBuilderFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
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
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  UPDATED_BY: {
    label: 'Updated by',
    dataField: WorkItemsQueryBuilderFieldNames.UpdatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
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
  PARENT_WORK_ITEM_ID: {
    label: 'Work order ID',
    dataField: WorkItemsQueryBuilderFieldNames.ParentWorkItemId,
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
  // Timeline
  EARLIEST_START_DATE: {
    label: 'Earliest start date/time',
    dataField: WorkItemsQueryBuilderFieldNames.EarliestStartDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  DUE_DATE: {
    label: 'Due date/time',
    dataField: WorkItemsQueryBuilderFieldNames.DueDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  ESTIMATED_DURATION_IN_DAYS: {
    label: 'Estimated duration (days)',
    dataField: WorkItemsQueryBuilderFieldNames.EstimatedDurationInDays,
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
  ESTIMATED_DURATION_IN_HOURS: {
    label: 'Estimated duration (hours)',
    dataField: WorkItemsQueryBuilderFieldNames.EstimatedDurationInHours,
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
  PLANNED_START_DATE: {
    label: 'Planned start date',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedStartDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  PLANNED_END_DATE: {
    label: 'Planned end date',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedEndDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  PLANNED_DURATION_IN_DAYS: {
    label: 'Planned duration (days)',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedDurationInDays,
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
  PLANNED_DURATION_IN_HOURS: {
    label: 'Planned duration (hours)',
    dataField: WorkItemsQueryBuilderFieldNames.PlannedDurationInHours,
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
  // Resources
  ASSET_ID: {
    label: 'Asset identifier',
    dataField: WorkItemsQueryBuilderFieldNames.AssetId,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_IS_EMPTY.name,
      QueryBuilderOperations.LIST_IS_NOT_EMPTY.name,
    ],
  },
  DUT_ID: {
    label: 'Dut identifier',
    dataField: WorkItemsQueryBuilderFieldNames.DutId,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_IS_EMPTY.name,
      QueryBuilderOperations.LIST_IS_NOT_EMPTY.name,
    ],
  },
  FIXTURE_ID: {
    label: 'Fixture identifier',
    dataField: WorkItemsQueryBuilderFieldNames.FixtureId,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_IS_EMPTY.name,
      QueryBuilderOperations.LIST_IS_NOT_EMPTY.name,
    ],
  },
  SYSTEM_ALIAS_NAME: {
    label: 'System alias name',
    dataField: WorkItemsQueryBuilderFieldNames.SystemAliasName,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_IS_EMPTY.name,
      QueryBuilderOperations.LIST_IS_NOT_EMPTY.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  // Custom properties
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
  WorkItemsQueryBuilderFields.ID,
  WorkItemsQueryBuilderFields.NAME,
  WorkItemsQueryBuilderFields.TYPE,
  WorkItemsQueryBuilderFields.STATE,
  WorkItemsQueryBuilderFields.DESCRIPTION,
  WorkItemsQueryBuilderFields.REQUESTED_BY,
  WorkItemsQueryBuilderFields.ASSIGNED_TO,
  WorkItemsQueryBuilderFields.PLANNED_START_DATE,
  WorkItemsQueryBuilderFields.PLANNED_END_DATE,
  WorkItemsQueryBuilderFields.PLANNED_DURATION_IN_DAYS,
  WorkItemsQueryBuilderFields.PLANNED_DURATION_IN_HOURS,
  WorkItemsQueryBuilderFields.EARLIEST_START_DATE,
  WorkItemsQueryBuilderFields.DUE_DATE,
  WorkItemsQueryBuilderFields.ESTIMATED_DURATION_IN_DAYS,
  WorkItemsQueryBuilderFields.ESTIMATED_DURATION_IN_HOURS,
  WorkItemsQueryBuilderFields.SYSTEM_ALIAS_NAME,
  WorkItemsQueryBuilderFields.PART_NUMBER,
  WorkItemsQueryBuilderFields.TEST_PROGRAM,
  WorkItemsQueryBuilderFields.DUT_ID,
  WorkItemsQueryBuilderFields.ASSET_ID,
  WorkItemsQueryBuilderFields.FIXTURE_ID,
  WorkItemsQueryBuilderFields.CREATED_AT,
  WorkItemsQueryBuilderFields.UPDATED_AT,
  WorkItemsQueryBuilderFields.CREATED_BY,
  WorkItemsQueryBuilderFields.UPDATED_BY,
  WorkItemsQueryBuilderFields.PROPERTIES,
  WorkItemsQueryBuilderFields.TEMPLATE_ID,
  WorkItemsQueryBuilderFields.PARENT_WORK_ITEM_ID,
  WorkItemsQueryBuilderFields.WORKSPACE,
];
