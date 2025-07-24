import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum DataframesQueryBuilderFieldNames {
  CreatedAt = 'createdAt',
  ID = 'id',
  MetadataModified = 'metadataModifiedAt',
  Name = 'name',
  Properties = 'properties',
  Rows = 'rowCount',
  RowsModified = 'rowsModifiedAt',
  SupportAppend = 'supportAppend',
  Workspace = 'workspace',
}

export const DataframesQueryBuilderFields: Record<string, QBField> = {
  CREATED_AT: {
    label: 'Created at',
    dataField: DataframesQueryBuilderFieldNames.CreatedAt,
    dataType: 'datetime',
    filterOperations: [QueryBuilderOperations.DATE_TIME_IS_AFTER.name, QueryBuilderOperations.DATE_TIME_IS_BEFORE.name],
  },
  ID: {
    label: 'DataTable ID',
    dataField: DataframesQueryBuilderFieldNames.ID,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  METADATA_MODIFIED: {
    label: 'Metadata modified',
    dataField: DataframesQueryBuilderFieldNames.MetadataModified,
        dataType: 'datetime',

    filterOperations: [QueryBuilderOperations.DATE_TIME_IS_AFTER.name, QueryBuilderOperations.DATE_TIME_IS_BEFORE.name],
  },
  NAME: {
    label: 'DataTable Name',
    dataField: DataframesQueryBuilderFieldNames.Name,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: DataframesQueryBuilderFieldNames.Properties,
    dataType: 'object',
    filterOperations: [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
    ],
  },
  ROWS: {
    label: 'Row count',
    dataField: DataframesQueryBuilderFieldNames.Rows,
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
  ROWS_MODIFIED: {
    label: 'Rows modified',
    dataField: DataframesQueryBuilderFieldNames.RowsModified,
        dataType: 'datetime',

    filterOperations: [QueryBuilderOperations.DATE_TIME_IS_AFTER.name, QueryBuilderOperations.DATE_TIME_IS_BEFORE.name],
  },
  SUPPORT_APPEND: {
    label: 'Support append',
    dataField: DataframesQueryBuilderFieldNames.SupportAppend,
    dataType: 'boolean',
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: DataframesQueryBuilderFieldNames.Workspace,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [],
    },
  },
};

export const DataframesColumnsQueryBuilderFields: Record<string, QBField> = {
  COLUMN_NAMES: {
    label: 'Column names',
    dataField: 'columnNames',
    dataType: 'string',
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  }
}

export const DataframesQueryBuilderStaticFields = [
  DataframesQueryBuilderFields.ID,
  DataframesQueryBuilderFields.NAME,
  DataframesQueryBuilderFields.PROPERTIES,
  DataframesQueryBuilderFields.ROWS,
  DataframesQueryBuilderFields.SUPPORT_APPEND,
];
