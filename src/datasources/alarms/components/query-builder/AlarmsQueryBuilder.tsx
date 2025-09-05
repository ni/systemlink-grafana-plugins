import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from 'core/query-builder.utils';
import { QBField, QueryBuilderOption } from 'core/types';
import { filterXSSField } from 'core/utils';
import { AlarmsQueryBuilderStaticFields } from 'datasources/alarms/constants/AlarmsQueryBuilder.constants';
import React, { useState, useEffect, useMemo } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

type AlarmsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    globalVariableOptions: QueryBuilderOption[];
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

  useEffect(() => {
    const updatedFields = AlarmsQueryBuilderStaticFields.map(field => {
      if (field.lookup?.dataSource) {
        return {
          ...field,
          lookup: {
            dataSource: [...globalVariableOptions, ...field.lookup?.dataSource].map(filterXSSField),
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
    optionsRef.current = options;

    const customOperations = [
      QueryBuilderOperations.EQUALS,
      QueryBuilderOperations.DOES_NOT_EQUAL,
      QueryBuilderOperations.CONTAINS,
      QueryBuilderOperations.DOES_NOT_CONTAIN,
      QueryBuilderOperations.IS_BLANK,
      QueryBuilderOperations.IS_NOT_BLANK,
    ].map(operation => {
      return {
        ...operation,
        ...callbacks,
      };
    });

    setOperations([...customOperations]);
  }, [globalVariableOptions, callbacks]);

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
