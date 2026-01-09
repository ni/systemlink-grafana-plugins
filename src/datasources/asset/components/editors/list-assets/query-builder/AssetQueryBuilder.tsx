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
import { SystemProperties } from 'datasources/system/types';
import { QBField } from '../../../../types/CalibrationForecastQuery.types';
import { ListAssetsFields, ListAssetsStaticFields } from '../../../../constants/ListAssets.constants';
import { filterXSSField, filterXSSLINQExpression } from 'core/utils';
import { LocationModel } from 'datasources/asset/types/ListLocations.types';
type AssetCalibrationQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[];
    systems: SystemProperties[];
    locations: LocationModel[];
    globalVariableOptions: QueryBuilderOption[];
    areDependenciesLoaded: boolean;
  };
export const AssetQueryBuilder: React.FC<AssetCalibrationQueryBuilderProps> = ({
  filter,
  onChange,
  workspaces,
  systems,
  locations,
  globalVariableOptions,
  areDependenciesLoaded,
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');
  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);
  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter])
  const workspaceField = useMemo(() => {
    const workspaceField = ListAssetsFields.WORKSPACE;
    return {
      ...workspaceField,
      lookup: {
        ...workspaceField.lookup,
        dataSource: [
          ...(workspaceField.lookup?.dataSource || []),
          ...workspaces.map(({ id, name }) => (filterXSSField({ label: name, value: id }))),
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
          ...systems.map(({ id, alias }) => (filterXSSField({ label: alias || id, value: id }))),
          ...locations.map(({ id, name }) => (filterXSSField({ label: name || id, value: id }))),
        ],
      },
    };
  }, [systems, locations]);

  const calibrationDueDateField = useMemo(() => {
    const calibrationField = ListAssetsFields.CALIBRATION_DUE_DATE;
    return {
      ...calibrationField,
      lookup: {
        ...calibrationField.lookup,
        dataSource: [
          ...(calibrationField.lookup?.dataSource || []),
          { label: 'From', value: '${__from:date}' },
          { label: 'To', value: '${__to:date}' },
          { label: 'Now', value: '${__now:date}' },
        ],
      },
    };
  }, []);
  useEffect(() => {
    if (!areDependenciesLoaded) {
      return;
    }

    const fields = [workspaceField, locationField, calibrationDueDateField, ...ListAssetsStaticFields]
      .sort((a, b) => a.label?.localeCompare(b?.label ?? '') ?? 0)
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
      {
        ...QueryBuilderOperations.IS_BLANK,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.IS_NOT_BLANK,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.CONTAINS,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.DOES_NOT_CONTAIN,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.LESS_THAN,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.LESS_THAN_OR_EQUAL_TO,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.GREATER_THAN,
        ...callbacks,
      },
      {
        ...QueryBuilderOperations.GREATER_THAN_OR_EQUAL_TO,
        ...callbacks,
      }
    ]);
  }, [workspaceField, locationField, calibrationDueDateField, areDependenciesLoaded, globalVariableOptions]);

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