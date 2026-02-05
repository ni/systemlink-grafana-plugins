import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { Workspace, QueryBuilderOption, QBField } from 'core/types';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';

import React, { useState, useEffect, useMemo } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

import {
  ResultsQueryBuilderFields,
  ResultsQueryBuilderStaticFields,
} from './ResultsQueryBuilder.constants';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';

type ResultsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    partNumbers: string[] | null;
    status: string[];
    globalVariableOptions: QueryBuilderOption[];
  };

export const ResultsQueryBuilder: React.FC<ResultsQueryBuilderProps> = ({
  filter,
  onChange,
  workspaces,
  partNumbers,
  status,
  globalVariableOptions,
}) => {

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter]);

  const workspaceField = useMemo(() => {
    const workspaceField = ResultsQueryBuilderFields.WORKSPACE;
    if (!workspaces) {
      return null;
    }

    return {
      ...workspaceField,
      lookup: {
        ...workspaceField.lookup,
        dataSource: [
          ...(workspaceField.lookup?.dataSource || []),
          ...workspaces.map(({ id, name }) => ({ label: name, value: id })),
        ],
      },
    };
  }, [workspaces]);

  const statusField = useMemo(() => {
    const statusField = ResultsQueryBuilderFields.STATUS;
    return {
      ...statusField,
      lookup: {
        ...statusField.lookup,
        dataSource: [
          ...(statusField.lookup?.dataSource || []),
          ...status.map(name => ({ label: name, value: name.replace(/\s+/g, '') })),
        ],
      },
    };
  }, [status]);

  const updatedAtField = useMemo(() => {
    const updatedField = ResultsQueryBuilderFields.UPDATEDAT;
    return {
      ...updatedField,
      lookup: {
        ...updatedField.lookup,
        dataSource: [
          ...(updatedField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);

  const startedAtField = useMemo(() => {
    const startedField = ResultsQueryBuilderFields.STARTEDAT;
    return {
      ...startedField,
      lookup: {
        ...startedField.lookup,
        dataSource: [
          ...(startedField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);

  const partNumberField = useMemo(() => {
    if (!partNumbers) {
      return null;
    }

    const partNumberField = ResultsQueryBuilderFields.PARTNUMBER;
    return {
      ...partNumberField,
      lookup: {
        ...partNumberField.lookup,
        dataSource: [
          ...(partNumberField.lookup?.dataSource || []),
          ...partNumbers.map(partNumber => ({ label: partNumber, value: partNumber })),
        ],
      },
    };
  }, [partNumbers]);

  useEffect(() => {
    if(!workspaceField || !partNumberField) {
      return;
    }

    const updatedFields = [
      partNumberField,
      ...ResultsQueryBuilderStaticFields!,
      updatedAtField,
      workspaceField,
      startedAtField,
      statusField
    ].map(
      field => {
        if (field.lookup?.dataSource) {
          return {
            ...field,
            lookup: {
              dataSource: [...globalVariableOptions, ...field.lookup!.dataSource].map(filterXSSField),
            },
          };
        }
        return field;
      }
    );

    setFields(updatedFields);

    const callbacks = {
      expressionBuilderCallback: expressionBuilderCallback(updatedFields),
      expressionReaderCallback: expressionReaderCallback(updatedFields),
    };

    const customOperations = [
      QueryBuilderOperations.EQUALS,
      QueryBuilderOperations.DOES_NOT_EQUAL,
      QueryBuilderOperations.STARTS_WITH,
      QueryBuilderOperations.ENDS_WITH,
      QueryBuilderOperations.CONTAINS,
      QueryBuilderOperations.DOES_NOT_CONTAIN,
      QueryBuilderOperations.LESS_THAN,
      QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO,
      QueryBuilderOperations.GREATER_THAN,
      QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO,
      QueryBuilderOperations.IS_BLANK,
      QueryBuilderOperations.IS_NOT_BLANK,
      QueryBuilderOperations.LIST_EQUALS,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL,
      QueryBuilderOperations.LIST_CONTAINS,
      QueryBuilderOperations.LIST_DOES_NOT_CONTAIN,
      QueryBuilderOperations.DATE_TIME_IS_AFTER,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE,
    ].map(operation => {
      return {
        ...operation,
        ...callbacks,
      };
    });

    const keyValueOperations = [
      QueryBuilderOperations.KEY_VALUE_MATCH,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH,
      QueryBuilderOperations.KEY_VALUE_CONTAINS,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN_OR_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN_OR_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_NOT_EQUAL,
    ];

    setOperations([...customOperations, ...keyValueOperations]);
  }, [workspaceField, startedAtField, updatedAtField, partNumberField, globalVariableOptions, statusField]);

  return (
    <SlQueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={sanitizedFilter}
    />
  );
};
