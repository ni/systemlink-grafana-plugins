import { SlQueryBuilder } from "core/components/SlQueryBuilder/SlQueryBuilder";
import { queryBuilderMessages, QueryBuilderOperations } from "core/query-builder.constants";
import { expressionBuilderCallback, expressionReaderCallback } from "core/query-builder.utils";
import { QBField, QueryBuilderOption } from "core/types";
import { WorkOrdersQueryBuilderFields, WorkOrdersQueryBuilderStaticFields } from "datasources/work-orders/constants/WorkOrdersQueryBuilder.constants";
import React, { useState, useEffect, useMemo } from "react";
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
  
  const addOptionsToLookup = (field: QBField, options: QueryBuilderOption[]) => {
    return {
      ...field,
      lookup: {
        ...field.lookup,
        dataSource: [
          ...(field.lookup?.dataSource || []),
          ...options,
        ],
      },
    };
  };

  const timeFields = useMemo(() => {
    const timeOptions = [
      { label: 'From', value: '${__from:date}' },
      { label: 'To', value: '${__to:date}' },
      { label: 'Now', value: '${__now:date}' },
    ]

    return [
      addOptionsToLookup(WorkOrdersQueryBuilderFields.EARLIEST_START_DATE, timeOptions),
      addOptionsToLookup(WorkOrdersQueryBuilderFields.DUE_DATE, timeOptions),
      addOptionsToLookup(WorkOrdersQueryBuilderFields.CREATED_AT, timeOptions),
      addOptionsToLookup(WorkOrdersQueryBuilderFields.UPDATED_AT, timeOptions),
    ];
  }, []);

  useEffect(() => {
    const updatedFields = [...WorkOrdersQueryBuilderStaticFields, ...timeFields]

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

  }, [globalVariableOptions, timeFields]);

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
