import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import { filterXSSField } from 'core/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { DataframesQueryBuilderFields, DataframesQueryBuilderStaticFields } from '../DataframeQuerybuilder.constants';

type DataframeQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    globalVariableOptions: QueryBuilderOption[];
  };

export const DataframeQueryBuilder: React.FC<DataframeQueryBuilderProps> = ({
  filter,
  workspaces,
  onChange,
  globalVariableOptions,
}) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const createdAtField = useMemo(() => {
    const createdAtField = DataframesQueryBuilderFields.CREATED_AT;
    return {
      ...createdAtField,
      lookup: {
        ...createdAtField.lookup,
        dataSource: [
          ...(createdAtField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);

  const metaDataModifiedField = useMemo(() => {
    const metaDataModifiedField = DataframesQueryBuilderFields.METADATA_MODIFIED;
    return {
      ...metaDataModifiedField,
      lookup: {
        ...metaDataModifiedField.lookup,
        dataSource: [
          ...(metaDataModifiedField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);

  const rowsModifiedField = useMemo(() => {
    const rowsModifiedField = DataframesQueryBuilderFields.ROWS_MODIFIED;
    return {
      ...rowsModifiedField,
      lookup: {
        ...rowsModifiedField.lookup,
        dataSource: [
          ...(rowsModifiedField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);

  const workspaceField = useMemo(() => {
    const workspaceField = DataframesQueryBuilderFields.WORKSPACE;
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

  useEffect(() => {
    if (!workspaceField) {
      return;
    }

    const updatedFields = [createdAtField, ...DataframesQueryBuilderStaticFields, metaDataModifiedField, rowsModifiedField, workspaceField].map(field => {
      if (field.lookup?.dataSource) {
        return {
          ...field,
          lookup: {
            dataSource: [...globalVariableOptions, ...field.lookup!.dataSource].map(filterXSSField),
          },
        };
      }
      return field;
    });

    setFields(updatedFields);

    const options = Object.values(updatedFields).reduce((accumulator, fieldConfig) => {
      if (fieldConfig.lookup) {
        accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
      }

      return accumulator;
    }, {} as Record<string, QueryBuilderOption[]>);

    const callbacks = {
      expressionBuilderCallback: expressionBuilderCallback(options),
      expressionReaderCallback: expressionReaderCallback(options),
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
    ];

    setOperations([...customOperations, ...keyValueOperations]);
  }, [globalVariableOptions, workspaceField, createdAtField, metaDataModifiedField, rowsModifiedField]);

  return (
    <SlQueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={filter}
    />
  );
};
