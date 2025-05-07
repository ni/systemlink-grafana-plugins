import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum StepsQueryBuilderFieldNames {
  KEYWORDS = 'keywords',
  NAME = 'stepName',
  PATH = 'path',
  PROPERTIES = 'properties',
  STATUS = 'status',
  TYPE = 'stepType',
  UPDATED_AT = 'updatedAt',
  WORKSPACE = 'workspace',
}

export const StepsQueryBuilderFields: Record<string, QBField> = {
  KEYWORDS: {
    label: 'Keyword',
    dataField: StepsQueryBuilderFieldNames.KEYWORDS,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
    ],
  },
  NAME: {
    label: 'Step name',
    dataField: StepsQueryBuilderFieldNames.NAME,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  PATH: {
    label: 'Step path',
    dataField: StepsQueryBuilderFieldNames.PATH,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.STARTS_WITH.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: StepsQueryBuilderFieldNames.PROPERTIES,
    dataType: 'object',
    filterOperations: [
      QueryBuilderOperations.KEY_VALUE_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH.name,
      QueryBuilderOperations.KEY_VALUE_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS.name,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN.name,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN_OR_EQUAL.name,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN.name,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN_OR_EQUAL.name,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_EQUAL.name,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_NOT_EQUAL.name,
    ],
  },
  STATUS: {
    label: 'Status',
    dataField: StepsQueryBuilderFieldNames.STATUS,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  TYPE: {
    label: 'Step type',
    dataField: StepsQueryBuilderFieldNames.TYPE,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
  },
  UPDATEDAT: {
    label: 'Step updated At',
    dataField: StepsQueryBuilderFieldNames.UPDATED_AT,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.GREATER_THAN.name,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO.name,
      QueryBuilderOperations.LESS_THAN.name,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  WORKSPACE: {
    label: 'Workspace',
    dataField: StepsQueryBuilderFieldNames.WORKSPACE,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [],
    },
  },
};

export const StepsQueryBuilderStaticFields = [
  StepsQueryBuilderFields.name,
  StepsQueryBuilderFields.keywords,
  StepsQueryBuilderFields.properties,
  StepsQueryBuilderFields.type,
];
