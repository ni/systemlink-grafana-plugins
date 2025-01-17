import { useTheme2 } from "@grafana/ui";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { Workspace, QueryBuilderOption } from "core/types";
import { filterXSSField, filterXSSLINQExpression } from "core/utils";
import { ProductsQueryBuilderStaticFields, ProductsQueryBuilderFields } from "datasources/products/constants/ProductsQueryBuilder.constants";
import { QBField } from "datasources/products/types";
import React, { useState, useEffect, useMemo } from "react";
import QueryBuilder, { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";

type ProductsQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
  filter?: string;
  workspaces: Workspace[];
  partNumbers: string[];
  globalVariableOptions: QueryBuilderOption[];
};

export const ProductsQueryBuilder: React.FC<ProductsQueryBuilderProps> = ({
  filter,
  onChange,
  workspaces,
  partNumbers,
  globalVariableOptions
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter])

  const workspaceField = useMemo(() => {
    const workspaceField = ProductsQueryBuilderFields.WORKSPACE;

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
  }, [workspaces])

  const updatedAtField = useMemo(() => {
    const updatedField = ProductsQueryBuilderFields.UPDATEDAT;
    return {
      ...updatedField,
      lookup: {
        ...updatedField.lookup,
        dataSource: [
          ...(updatedField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ]
      }
    }
  }, []);

  const partNumberField = useMemo(() => {
    const partNumberField = ProductsQueryBuilderFields.PARTNUMBER;

    return {
      ...partNumberField,
      lookup: {
        ...partNumberField.lookup,
        dataSource: [
          ...(partNumberField.lookup?.dataSource || []),
          ...partNumbers.map((partNumber) => ({ label: partNumber, value: partNumber }))
        ]
      }
    }
  }, [partNumbers]);


  useEffect(() => {
    const fields = [partNumberField, ...ProductsQueryBuilderStaticFields, updatedAtField, workspaceField]
      .map((field) => {
        if (field.lookup?.dataSource) {
          return {
            ...field,
            lookup: {
              dataSource: [...globalVariableOptions.map(filterXSSField), ...field.lookup!.dataSource.map(filterXSSField)],
            },
          }
        }
        return field;
      });

    setFields(fields);

    const options = Object.values(fields).reduce((accumulator, fieldConfig) => {
      if (fieldConfig.lookup) {
        accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
      }

      return accumulator;
    }, {} as Record<string, QueryBuilderOption[]>);

    const callbacks = {
      expressionBuilderCallback: expressionBuilderCallback(options),
      expressionReaderCallback: expressionReaderCallback(options),
    };

    setOperations([
      {
        ...QueryBuilderOperations.EQUALS,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.DOES_NOT_EQUAL,
        ...callbacks,
      },
      QueryBuilderOperations.CONTAINS,
      QueryBuilderOperations.DOES_NOT_CONTAIN,
      {
        ...QueryBuilderOperations.LESS_THAN,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.GREATER_THAN,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.IS_BLANK,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.IS_NOT_BLANK,
        ...callbacks,
      },
      QueryBuilderOperations.KEY_VALUE_MATCH,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_MATCH,
      QueryBuilderOperations.KEY_VALUE_CONTAINS,
      QueryBuilderOperations.KEY_VALUE_DOES_NOT_CONTAINS,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN,
      QueryBuilderOperations.KEY_VALUE_IS_GREATER_THAN_OR_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN,
      QueryBuilderOperations.KEY_VALUE_IS_LESS_THAN_OR_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_EQUAL,
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_NOT_EQUAL
    ]);

  }, [workspaceField, updatedAtField, partNumberField, globalVariableOptions]);

  return (
    <QueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={sanitizedFilter}
    />
  );
}
