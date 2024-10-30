import React, { useEffect, useMemo, useState } from 'react';
import { QueryBuilder, QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';

import { Workspace, QueryBuilderOption } from 'core/types';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';
import { SystemMetadata } from 'datasources/system/types';
import { QBField } from '../../../../types/CalibrationForecastQuery.types';
import { AssetCalibrationFields, AssetCalibrationStaticFields } from '../../../../constants/CalibrationForecastQuery.constants';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';

type CalibrationForecastQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[];
    systems: SystemMetadata[];
    globalVariableOptions: QueryBuilderOption[];
    areDependenciesLoaded: boolean;
  };

export const CalibrationForecastQueryBuilder: React.FC<CalibrationForecastQueryBuilderProps> = ({ filter, onChange, workspaces, systems, globalVariableOptions, areDependenciesLoaded }) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter])

  const workspaceField = useMemo(() => {
    const workspaceField = AssetCalibrationFields.WORKSPACE;

    return {
      ...workspaceField,
      lookup: {
        ...workspaceField.lookup,
        dataSource: [
          ...workspaceField.lookup?.dataSource || [],
          ...workspaces.map(({ id, name }) => (filterXSSField({ label: name, value: id })))
        ]
      }
    };
  }, [workspaces]);

  const locationField = useMemo(() => {
    const locationField = AssetCalibrationFields.LOCATION;

    return {
      ...locationField,
      lookup: {
        ...locationField.lookup,
        dataSource: [
          ...locationField.lookup?.dataSource || [],
          ...systems.map(({ id, alias }) => (filterXSSField({ label: alias || id, value: id })))
        ]
      }
    };
  }, [systems]);

  useEffect(() => {
    if (areDependenciesLoaded) {
      const fields = [workspaceField, locationField, ...AssetCalibrationStaticFields]
        .map(field => {
          if (field.lookup?.dataSource) {
            return {
              ...field,
              lookup: {
                dataSource: [...globalVariableOptions.map(filterXSSField), ...field.lookup.dataSource.map(filterXSSField)]
              }
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
      ]);
    }
  }, [workspaceField, locationField, areDependenciesLoaded, globalVariableOptions]);

  return (
    <QueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={sanitizedFilter}
      />
  );
};
