import { QueryBuilderOperations } from 'core/query-builder.constants';
import { QBField } from 'core/types';

export enum ResultsQueryBuilderFieldNames {
  HOSTNAME = 'HostName',
  KEYWORDS = 'Keywords',
  OPERATOR = 'Operator',
  PART_NUMBER = 'PartNumber',
  PROPERTIES = 'Properties',
  SERIAL_NUMBER = 'SerialNumber',
  STARTED_AT = 'StartedAt',
  STATUS = 'Status',
  SYSTEM_ID = 'SystemId',
  PROGRAM_NAME = 'ProgramName',
  UPDATED_AT = 'UpdatedAt',
  WORKSPACE = 'Workspace',
}

export const ResultsQueryBuilderFields: Record<string, QBField> = {
  HOSTNAME: {
    label: 'Host name',
    dataField: ResultsQueryBuilderFieldNames.HOSTNAME,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  KEYWORDS: {
    label: 'Keyword',
    dataField: ResultsQueryBuilderFieldNames.KEYWORDS,
    filterOperations: [
      QueryBuilderOperations.LIST_EQUALS.name,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL.name,
      QueryBuilderOperations.LIST_CONTAINS.name,
      QueryBuilderOperations.LIST_DOES_NOT_CONTAIN.name,
    ],
  },
  OPERATOR: {
    label: 'Operator',
    dataField: ResultsQueryBuilderFieldNames.OPERATOR,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  PARTNUMBER: {
    label: 'Part number',
    dataField: ResultsQueryBuilderFieldNames.PART_NUMBER,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.STARTS_WITH.name,
      QueryBuilderOperations.ENDS_WITH.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  PROPERTIES: {
    label: 'Properties',
    dataField: ResultsQueryBuilderFieldNames.PROPERTIES,
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
  SERIALNUMBER: {
    label: 'Serial number',
    dataField: ResultsQueryBuilderFieldNames.SERIAL_NUMBER,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  STARTEDAT: {
    label: 'Started',
    dataField: ResultsQueryBuilderFieldNames.STARTED_AT,
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
  STATUS: {
    label: 'Status',
    dataField: ResultsQueryBuilderFieldNames.STATUS,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
    ],
    lookup: {
      dataSource: [],
    },
  },
  SYSTEMID: {
    label: 'System ID',
    dataField: ResultsQueryBuilderFieldNames.SYSTEM_ID,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  PROGRAMNAME: {
    label: 'Test program',
    dataField: ResultsQueryBuilderFieldNames.PROGRAM_NAME,
    filterOperations: [
      QueryBuilderOperations.EQUALS.name,
      QueryBuilderOperations.DOES_NOT_EQUAL.name,
      QueryBuilderOperations.CONTAINS.name,
      QueryBuilderOperations.DOES_NOT_CONTAIN.name,
      QueryBuilderOperations.IS_BLANK.name,
      QueryBuilderOperations.IS_NOT_BLANK.name,
    ],
  },
  UPDATEDAT: {
    label: 'Updated',
    dataField: ResultsQueryBuilderFieldNames.UPDATED_AT,
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
    dataField: ResultsQueryBuilderFieldNames.WORKSPACE,
    filterOperations: [QueryBuilderOperations.EQUALS.name, QueryBuilderOperations.DOES_NOT_EQUAL.name],
    lookup: {
      dataSource: [],
    },
  },
};

export const ResultsQueryBuilderStaticFields = [
  ResultsQueryBuilderFields.PROGRAMNAME,
  ResultsQueryBuilderFields.PROPERTIES,
  ResultsQueryBuilderFields.SYSTEMID,
  ResultsQueryBuilderFields.KEYWORDS,
  ResultsQueryBuilderFields.OPERATOR,
  ResultsQueryBuilderFields.SERIALNUMBER,
  ResultsQueryBuilderFields.HOSTNAME,
];
