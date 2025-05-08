import { useTheme2, VerticalGroup } from '@grafana/ui';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { Workspace, QueryBuilderOption } from 'core/types';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';

import React, { useState, useEffect, useMemo } from 'react';
import QueryBuilder, { QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';
import { QBField } from 'datasources/results/types/QueryResults.types';
import { StepsQueryBuilderFields, StepsQueryBuilderStaticFields } from 'datasources/results/constants/StepsQueryBuilder.constants';
import { ResultsQueryBuilder } from '../query-results/ResultsQueryBuilder';

type onFilterChange = (filter: string) => void;

type StepsQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    resultsFilter?: string;
    stepsFilter?: string;
    workspaces: Workspace[];
    partNumbers: string[];
    status: string[];
    stepsPath: string[];
    globalVariableOptions: QueryBuilderOption[];
    onResultsFilterChange: onFilterChange;
    onStepsFilterChange: onFilterChange;
    disableResultsQueryBuilder?: boolean;
  };

export const StepsQueryBuilder: React.FC<StepsQueryBuilderProps> = ({
  resultsFilter,
  stepsFilter,
  workspaces,
  partNumbers,
  status,
  stepsPath,
  globalVariableOptions,
  onResultsFilterChange,
  onStepsFilterChange,
  disableResultsQueryBuilder
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(stepsFilter);
  }, [stepsFilter]);

  const workspaceField = useMemo(() => {
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

  const statusField = useMemo(() => {
    const statusField = StepsQueryBuilderFields.STATUS;
    return {
      ...statusField,
      lookup: {
        ...statusField.lookup,
        dataSource: [
          ...(statusField.lookup?.dataSource || []), 
          ...status.map(name => ({ label: name, value: name }))
        ],
      },
    };
  }, [status]);

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
          ...stepsPath.map(path => ({ label: path, value: path })),
        ],
      },
    };
  }, [stepsPath]);

  useEffect(() => {
    const updatedFields = [
      stepsPathField,
      updatedAtField,
      workspaceField,
      statusField,
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
  }, [workspaceField, updatedAtField, stepsPathField, globalVariableOptions, statusField]);

  return (
    <VerticalGroup>
      <ResultsQueryBuilder
        filter={resultsFilter}
        onChange={(event) => onResultsFilterChange((event as CustomEvent<{ linq: string }>).detail.linq)}
        workspaces={workspaces}
        partNumbers={partNumbers}
        status={status}
        globalVariableOptions={globalVariableOptions}
      >
      </ResultsQueryBuilder>
      <QueryBuilder
        customOperations={operations}
        fields={fields}
        messages={queryBuilderMessages}
        onChange={(event) => onStepsFilterChange((event as CustomEvent<{ linq: string }>).detail.linq)}
        value={sanitizedFilter}
        fieldsMode="static"
        disabled={disableResultsQueryBuilder}
      />
    </VerticalGroup>
  );
};
