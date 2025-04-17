import { useTheme2 } from '@grafana/ui';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { QueryBuilderOption } from 'core/types';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';
import {
  ProductsQueryBuilderFields,
} from 'datasources/products/constants/ProductsQueryBuilder.constants';
import { QBField } from 'datasources/products/types';
import React, { useState, useEffect, useMemo } from 'react';
import QueryBuilder, { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';

type ProductsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    queryBuilderDisabled?: boolean;
    productNames?: string[];
    globalVariableOptions: QueryBuilderOption[];
  };

export const ProductsQueryBuilder2: React.FC<ProductsQueryBuilderProps> = ({
  filter,
  onChange,
  productNames,
  queryBuilderDisabled,
  globalVariableOptions,
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter]);

  const productNameField = useMemo(() => {
    const productNameField = ProductsQueryBuilderFields.NAME;

    return {
      ...productNameField,
      lookup: {
        ...productNameField.lookup,
        dataSource: [
          ...(productNameField.lookup?.dataSource || []),
          ...productNames!.map(productNames => ({ label: productNames, value: productNames })),
        ],
      },
    };
  }, [productNames]);

  useEffect(() => {
    const updatedFields = [productNameField].map(field => {
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
    ].map(operation => {
      return {
        ...operation,
        ...callbacks,
      };
    });

    setOperations([...customOperations]);
  }, [globalVariableOptions, productNameField]);

  return (
    <QueryBuilder
      customOperations={operations}
      fields={fields}
      disabled={queryBuilderDisabled}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={sanitizedFilter}
      showIcons
    />
  );
};
