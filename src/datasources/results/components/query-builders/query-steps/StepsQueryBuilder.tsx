import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallbackWithRef, expressionReaderCallbackWithRef } from 'core/query-builder.utils';
import { Workspace, QueryBuilderOption, QBField } from 'core/types';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

import { StepsQueryBuilderFields, StepsQueryBuilderStaticFields } from 'datasources/results/constants/StepsQueryBuilder.constants';
import { StepPath } from 'datasources/results/types/QuerySteps.types';
import { SlQueryBuilder } from 'core/components/SlQueryBuilder/SlQueryBuilder';

type StepsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[] | null;
    stepStatus: string[];
    stepsPath: StepPath[];
    globalVariableOptions: QueryBuilderOption[];
    onFilterChange: (filter: string) => void;
    disableQueryBuilder?: boolean;
  };

export const StepsQueryBuilder: React.FC<StepsQueryBuilderProps> = ({
  filter,
  workspaces,
  stepStatus,
  stepsPath,
  globalVariableOptions,
  onFilterChange,
  disableQueryBuilder
}) => {

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
  const optionsRef = useRef<Record<string, QueryBuilderOption[]>>({});

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter]);

  const workspaceField = useMemo(() => {
    if (!workspaces) {
      return null;
    }
    
    const workspaceField = StepsQueryBuilderFields.WORKSPACE;
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

  const stepStatusField = useMemo(() => {
    const statusField = StepsQueryBuilderFields.STATUS;
    return {
      ...statusField,
      lookup: {
        ...statusField.lookup,
        dataSource: [
          ...(statusField.lookup?.dataSource || []), 
          ...stepStatus.map(name => ({ label: name, value: name.replace(/\s+/g, '') })),
        ],
      },
    };
  }, [stepStatus]);

  const updatedAtField = useMemo(() => {
    const updatedField = StepsQueryBuilderFields.UPDATEDAT;
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

  const stepsPathField = useMemo(() => {
    const stepsPathField = StepsQueryBuilderFields.PATH;
    return {
      ...stepsPathField,
      lookup: {
        ...stepsPathField.lookup,
        dataSource: [
          ...(stepsPathField.lookup?.dataSource || []),
          ...stepsPath,
        ],
      },
    };
  }, [stepsPath]);

  const callbacks = useMemo(() => ({
    expressionBuilderCallback: expressionBuilderCallbackWithRef(optionsRef),
    expressionReaderCallback: expressionReaderCallbackWithRef(optionsRef),
  }), [optionsRef]);

  useEffect(() => {
    if(!workspaceField) {
      return;
    }

    const updatedFields = [
      stepsPathField,
      updatedAtField,
      workspaceField,
      stepStatusField,
      ...StepsQueryBuilderStaticFields!,
    ].map(field => {
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

    optionsRef.current = options;

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
      QueryBuilderOperations.DATE_TIME_IS_BEFORE
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
  }, [workspaceField, updatedAtField, stepsPathField, globalVariableOptions, stepStatusField, callbacks]);

  return (
    <SlQueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={(event) => onFilterChange((event as CustomEvent<{ linq: string }>).detail.linq)}
      value={sanitizedFilter}
      disabled={disableQueryBuilder}
    />
  );
};
