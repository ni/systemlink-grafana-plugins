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
import { ListAssetsFields } from '../../../../constants/ListAssets.constants';

type AssetCalibrationQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[];
    systems: SystemMetadata[];
    globalVariableOptions: QueryBuilderOption[];
    areDependenciesLoaded: boolean;
  };

export const AssetQueryBuilder: React.FC<AssetCalibrationQueryBuilderProps> = ({
  filter,
  onChange,
  workspaces,
  systems,
  globalVariableOptions,
  areDependenciesLoaded,
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const workspaceField = useMemo(() => {
    const workspaceField = ListAssetsFields.WORKSPACE;

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

  const locationField = useMemo(() => {
    const locationField = ListAssetsFields.LOCATION;

    return {
      ...locationField,
      lookup: {
        ...locationField.lookup,
        dataSource: [
          ...(locationField.lookup?.dataSource || []),
          ...systems.map(({ id, alias }) => ({ label: alias || id, value: id })),
        ],
      },
    };
  }, [systems]);

  useEffect(() => {
    if (!areDependenciesLoaded) {
      return;
    }

    const fields = [workspaceField, locationField]
      .map(field => {
        if (field.lookup?.dataSource) {
          return {
            ...field,
            lookup: {
              dataSource: [...globalVariableOptions, ...field.lookup.dataSource]
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
  }, [workspaceField, locationField, areDependenciesLoaded, globalVariableOptions]);

  return (
    <QueryBuilder
      customOperations={operations}
      fields={fields}
      messages={queryBuilderMessages}
      onChange={onChange}
      value={filter}
    />
  );
};
