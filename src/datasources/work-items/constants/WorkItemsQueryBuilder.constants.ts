import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';
import { WorkItemTypes } from '../types';

export enum WorkItemsQueryBuilderFieldNames {
  Id = 'id',
  Name = 'name',
  Type = 'type',
  State = 'state',
  Substate = 'substate',
  Description = 'description',
  Workspace = 'workspace',
  EarliestStartDate = 'earliestStartDate',
  DueDate = 'dueDate',
  PlannedStartDate = 'plannedStartDate',
  PlannedEndDate = 'plannedEndDate',
  CreatedAt = 'createdAt',
  UpdatedAt = 'updatedAt',
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
      QueryBuilderOperations.STARTS_WITH.name,
      QueryBuilderOperations.ENDS_WITH.name,
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
  WORKSPACE: {
    label: 'Workspace',
    dataField: WorkItemsQueryBuilderFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
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
  ASSET_NAME: {
    label: 'Asset name',
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
    label: 'DUT name',
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
    label: 'Fixture name',
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
    label: 'System name',
    dataField: WorkItemsQueryBuilderFieldNames.SystemName,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  SYSTEM_ID: {
    label: 'System ID',
    dataField: WorkItemsQueryBuilderFieldNames.SystemId,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
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
  WorkItemsQueryBuilderFields.ASSET_NAME,
  WorkItemsQueryBuilderFields.ASSET_ID,
  WorkItemsQueryBuilderFields.DUT_NAME,
  WorkItemsQueryBuilderFields.DUT_ID,
  WorkItemsQueryBuilderFields.FIXTURE_NAME,
  WorkItemsQueryBuilderFields.FIXTURE_ID,
  WorkItemsQueryBuilderFields.SYSTEM_NAME,
  WorkItemsQueryBuilderFields.SYSTEM_ID,
  WorkItemsQueryBuilderFields.TARGET_LOCATION,
  WorkItemsQueryBuilderFields.TARGET_PARENT,
  WorkItemsQueryBuilderFields.PROPERTIES,
];
