import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';
import { WorkItemTypes } from '../constants/QueryEditor.constants';
import { State } from '../types';

/**
 * Field names below are sourced from the SystemLink Work Items data source FRD
 * (Grafana-data-source-for-work-items.md), section "SystemLink Work Items data source".
 * Timeline and schedule fields use the dotted API property paths given in the FRD
 * (e.g. timeline.earliestStartDateTime, schedule.plannedStartDateTime).
 */
export enum WorkItemsQueryBuilderFieldNames {
  Id = 'id',
  Name = 'name',
  Type = 'type',
  State = 'state',
  Substate = 'substate',
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
  ParentWorkItemName = 'parentWorkItemName',
  ParentWorkItemId = 'parentWorkItemId',
  TemplateId = 'templateId',
  EarliestStartDate = 'timeline.earliestStartDateTime',
  DueDate = 'timeline.dueDateTime',
  EstimatedDuration = 'timeline.estimatedDurationInSeconds',
  EstimatedDurationInDays = 'estimatedDurationInDays',
  EstimatedDurationInHours = 'estimatedDurationInHours',
  PlannedStartDate = 'schedule.plannedStartDateTime',
  PlannedEndDate = 'schedule.plannedEndDateTime',
  PlannedDuration = 'schedule.plannedDurationInSeconds',
  PlannedDurationInDays = 'plannedDurationInDays',
  PlannedDurationInHours = 'plannedDurationInHours',
  AssetName = 'assetName',
  AssetId = 'assetId',
  DutName = 'dutName',
  DutId = 'dutId',
  FixtureName = 'fixtureName',
  FixtureId = 'fixtureId',
  SystemName = 'systemName',
  SystemId = 'systemId',
  TargetLocation = 'targetLocation',
  TargetParent = 'targetParent',
  Properties = 'properties',
}

export const WorkItemsQueryBuilderFields: Record<string, QBField> = {
  // Work item details
  ID: {
    label: 'Work item ID',
    dataField: WorkItemsQueryBuilderFieldNames.Id,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  NAME: {
    label: 'Work item name',
    dataField: WorkItemsQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.STARTS_WITH.name,
      QueryBuilderOperations.ENDS_WITH.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  TYPE: {
    label: 'Work item type',
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
        { label: 'New', value: State.New },
        { label: 'Defined', value: State.Defined },
        { label: 'Reviewed', value: State.Reviewed },
        { label: 'Scheduled', value: State.Scheduled },
        { label: 'In progress', value: State.InProgress },
        { label: 'Pending approval', value: State.PendingApproval },
        { label: 'Closed', value: State.Closed },
        { label: 'Canceled', value: State.Canceled },
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
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  UPDATED_BY: {
    label: 'Updated by',
    dataField: WorkItemsQueryBuilderFieldNames.UpdatedBy,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  CREATED_AT: {
    label: 'Created at',
    dataField: WorkItemsQueryBuilderFieldNames.CreatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ],
  },
  UPDATED_AT: {
    label: 'Updated at',
    dataField: WorkItemsQueryBuilderFieldNames.UpdatedAt,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
    ],
  },
  PARENT_WORK_ITEM_NAME: {
    label: 'Parent work item name',
    dataField: WorkItemsQueryBuilderFieldNames.ParentWorkItemName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  PARENT_WORK_ITEM_ID: {
    label: 'Parent work item ID',
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
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  // Timeline
  EARLIEST_START_DATE: {
    label: 'Earliest start date',
    dataField: WorkItemsQueryBuilderFieldNames.EarliestStartDate,
    filterOperations: [
      QueryBuilderOperations.DATE_TIME_IS_AFTER.name,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE.name,
      QueryBuilderOperations.DATE_TIME_IS_BLANK.name,
      QueryBuilderOperations.DATE_TIME_IS_NOT_BLANK.name,
    ],
  },
  DUE_DATE: {
    label: 'Due date',
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
  ASSET_NAME: {
    label: 'Asset Name',
    dataField: WorkItemsQueryBuilderFieldNames.AssetName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  ASSET_ID: {
    label: 'Asset ID',
    dataField: WorkItemsQueryBuilderFieldNames.AssetId,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  DUT_NAME: {
    label: 'DUT Name',
    dataField: WorkItemsQueryBuilderFieldNames.DutName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  DUT_ID: {
    label: 'DUT ID',
    dataField: WorkItemsQueryBuilderFieldNames.DutId,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  FIXTURE_NAME: {
    label: 'Fixture Name',
    dataField: WorkItemsQueryBuilderFieldNames.FixtureName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  FIXTURE_ID: {
    label: 'Fixture ID',
    dataField: WorkItemsQueryBuilderFieldNames.FixtureId,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  SYSTEM_NAME: {
    label: 'System Name',
    dataField: WorkItemsQueryBuilderFieldNames.SystemName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  SYSTEM_ID: {
    label: 'System alias name',
    dataField: WorkItemsQueryBuilderFieldNames.SystemId,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  TARGET_LOCATION: {
    label: 'Target location',
    dataField: WorkItemsQueryBuilderFieldNames.TargetLocation,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  TARGET_PARENT: {
    label: 'Target parent',
    dataField: WorkItemsQueryBuilderFieldNames.TargetParent,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
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
  WorkItemsQueryBuilderFields.SUBSTATE,
  WorkItemsQueryBuilderFields.DESCRIPTION,
  WorkItemsQueryBuilderFields.TEST_PROGRAM,
  WorkItemsQueryBuilderFields.PARENT_WORK_ITEM_NAME,
  WorkItemsQueryBuilderFields.PARENT_WORK_ITEM_ID,
  WorkItemsQueryBuilderFields.TEMPLATE_ID,
  WorkItemsQueryBuilderFields.ESTIMATED_DURATION_IN_DAYS,
  WorkItemsQueryBuilderFields.ESTIMATED_DURATION_IN_HOURS,
  WorkItemsQueryBuilderFields.PLANNED_DURATION_IN_DAYS,
  WorkItemsQueryBuilderFields.PLANNED_DURATION_IN_HOURS,
  WorkItemsQueryBuilderFields.ASSET_NAME,
  WorkItemsQueryBuilderFields.ASSET_ID,
  WorkItemsQueryBuilderFields.DUT_NAME,
  WorkItemsQueryBuilderFields.DUT_ID,
  WorkItemsQueryBuilderFields.FIXTURE_NAME,
  WorkItemsQueryBuilderFields.FIXTURE_ID,
  WorkItemsQueryBuilderFields.SYSTEM_NAME,
  WorkItemsQueryBuilderFields.TARGET_LOCATION,
  WorkItemsQueryBuilderFields.TARGET_PARENT,
  WorkItemsQueryBuilderFields.PROPERTIES,
];
