import { useTheme2 } from "@grafana/ui";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { QueryBuilderOption } from "core/types";
import { filterXSSField, filterXSSLINQExpression } from "core/utils";
import { QBField } from "datasources/products/types";
import React, { useState, useEffect, useMemo } from "react";
import QueryBuilder, { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';
import { TestPlansQueryBuilderStaticFields } from "datasources/test-plans/constants/TestPlansQueryBuilder.constants";

type ProductsQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
  filter?: string;
  globalVariableOptions: QueryBuilderOption[];
};

export const ProductsQueryBuilder: React.FC<ProductsQueryBuilderProps> = ({
  filter,
  onChange,
  globalVariableOptions,
}) => {
  const theme = useTheme2();
  document.body.setAttribute("theme", theme.isDark ? "dark-orange" : "orange");

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter])



  useEffect(() => {
    const updatedFields = [...TestPlansQueryBuilderStaticFields!]
      .map((field) => {
        if (field.lookup?.dataSource) {
          return {
            ...field,
            lookup: {
              dataSource: [...globalVariableOptions, ...field.lookup!.dataSource].map(filterXSSField),
            },
          }
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
    ].map((operation) => {
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
      QueryBuilderOperations.KEY_VALUE_IS_NUMERICAL_NOT_EQUAL
    ]

    setOperations([...customOperations, ...keyValueOperations]);

  }, [globalVariableOptions]);

  return (
    <QueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={sanitizedFilter}
      showIcons
    />
  );
}
