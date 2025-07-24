import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption, Workspace } from 'core/types';
import { filterXSSField } from 'core/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { DataframesColumnsQueryBuilderFields } from '../DataframeQuerybuilder.constants';

type DataframeColumnsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    globalVariableOptions: QueryBuilderOption[];
  };

export const DataframeColumnsQueryBuilder: React.FC<DataframeColumnsQueryBuilderProps> = ({
  filter,
  onChange,
  globalVariableOptions,
}) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const columnNames = useMemo(() => {
    const columnNamesField = DataframesColumnsQueryBuilderFields.COLUMN_NAMES;

    return {
      ...columnNamesField,
      lookup: {
        ...columnNamesField.lookup,
        dataSource: [...(columnNamesField.lookup?.dataSource || [])],
      },
    };
  }, []);

  useEffect(() => {
    if (!columnNames) {
      return;
    }

    const updatedFields = [columnNames].map(field => {
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
      QueryBuilderOperations.CONTAINS,
      QueryBuilderOperations.DOES_NOT_CONTAIN,
    ].map(operation => {
      return {
        ...operation,
        ...callbacks,
      };
    });

    setOperations([...customOperations]);
  }, [globalVariableOptions, columnNames]);

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
