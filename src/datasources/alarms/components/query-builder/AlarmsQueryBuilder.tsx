import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption } from 'core/types';
import { filterXSSField } from 'core/utils';
import { AlarmsQueryBuilderFields, AlarmsQueryBuilderStaticFields } from 'datasources/alarms/constants/AlarmsQueryBuilder.constants';
import React, { useState, useEffect, useMemo } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

type AlarmsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    globalVariableOptions: QueryBuilderOption[];
    filter?: string;
  };

export const AlarmsQueryBuilder: React.FC<AlarmsQueryBuilderProps> = ({ filter, onChange, globalVariableOptions }) => {
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
  const optionsRef = React.useRef<Record<string, QueryBuilderOption[]>>({});

  const callbacks = useMemo(
    () => ({
      expressionBuilderCallback: expressionBuilderCallbackWithRef(optionsRef),
      expressionReaderCallback: expressionReaderCallbackWithRef(optionsRef),
    }),
    [optionsRef]
  );

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
    ];

    return [
      addOptionsToLookup(AlarmsQueryBuilderFields.ACKNOWLEDGED_ON, timeOptions),
      addOptionsToLookup(AlarmsQueryBuilderFields.FIRST_OCCURRENCE, timeOptions),
    ];
  }, []);

  useEffect(() => {
    if (!timeFields) {
      return;
    }
    
    const updatedFields = [...AlarmsQueryBuilderStaticFields, ...timeFields].map(field => {
      if (field.lookup?.dataSource) {
        return {
          ...field,
          lookup: {
            dataSource: [...globalVariableOptions, ...field.lookup?.dataSource].map(filterXSSField),
          },
        };
      }
      return field;
    })

    const sortedFields = updatedFields.sort((a, b) => {
      const labelA = a.label ?? '';
      const labelB = b.label ?? '';
      return labelA.localeCompare(labelB);
    });

    setFields(sortedFields);

    const options = sortedFields.reduce((accumulator, fieldConfig) => {
      if (fieldConfig.lookup) {
        accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
      }

      return accumulator;
    }, {} as Record<string, QueryBuilderOption[]>);
    
    optionsRef.current = options;

    const customOperations = [
      QueryBuilderOperations.EQUALS,
      QueryBuilderOperations.DOES_NOT_EQUAL,
      QueryBuilderOperations.CONTAINS,
      QueryBuilderOperations.DOES_NOT_CONTAIN,
      QueryBuilderOperations.IS_BLANK,
      QueryBuilderOperations.IS_NOT_BLANK,
      QueryBuilderOperations.DATE_TIME_IS_BEFORE,
      QueryBuilderOperations.DATE_TIME_IS_AFTER,
      QueryBuilderOperations.LIST_EQUALS,
      QueryBuilderOperations.LIST_DOES_NOT_EQUAL,
      QueryBuilderOperations.LIST_CONTAINS,
      QueryBuilderOperations.LIST_DOES_NOT_CONTAIN,
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
  }, [globalVariableOptions, callbacks, timeFields]);

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
