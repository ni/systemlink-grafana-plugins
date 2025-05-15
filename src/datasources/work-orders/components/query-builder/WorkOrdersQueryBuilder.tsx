import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { QBField, QueryBuilderOption } from "core/types";
import { filterXSSField } from "core/utils";
import { WorkOrdersQueryBuilderStaticFields } from "datasources/work-orders/constants/WorkOrdersQueryBuilder.constants";
import React, { useState, useEffect } from "react";
import { QueryBuilderCustomOperation, QueryBuilderProps } from "smart-webcomponents-react/querybuilder";

type WorkOrdersQueryBuilderProps = QueryBuilderProps & React.HTMLAttributes<Element> & {
  filter?: string;
  globalVariableOptions: QueryBuilderOption[];
};

export const WorkOrdersQueryBuilder: React.FC<WorkOrdersQueryBuilderProps> = ({
  filter,
  onChange,
  globalVariableOptions,
}) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  useEffect(() => {
    const updatedFields = WorkOrdersQueryBuilderStaticFields
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

    setOperations(customOperations);

  }, [globalVariableOptions]);

  return (
    <SlQueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={filter}
      showIcons
    />
  );
}
