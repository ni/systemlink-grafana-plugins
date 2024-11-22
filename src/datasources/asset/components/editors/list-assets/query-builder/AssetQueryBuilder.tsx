import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { QueryBuilder, QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { RadioButtonGroup, TextArea, useTheme2 } from '@grafana/ui';

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
import { ListAssetsFields, ListAssetsStaticFields } from '../../../../constants/ListAssets.constants';
import { enumToOptions, filterXSSField, filterXSSLINQExpression } from 'core/utils';
import { QueryBuilderType } from 'datasources/asset/constants/constants';
import { ListAssetsQuery } from 'datasources/asset/types/ListAssets.types';

type AssetCalibrationQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[];
    systems: SystemMetadata[];
    globalVariableOptions: QueryBuilderOption[];
    areDependenciesLoaded: boolean;
    query: ListAssetsQuery;
    handleQueryChange: (value: ListAssetsQuery, runQuery: boolean) => void;
  };

export const AssetQueryBuilder: React.FC<AssetCalibrationQueryBuilderProps> = ({
  filter,
  onChange,
  workspaces,
  systems,
  globalVariableOptions,
  areDependenciesLoaded,
  query,
  handleQueryChange
}) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  const sanitizedFilter = useMemo(() => {
    return filterXSSLINQExpression(filter);
  }, [filter])

  const onFilterChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) =>
  {
    handleQueryChange({...query, filter: event.target.value}, false);
  }, [query, handleQueryChange])

  const handleQueryBuilderTypeChange = useCallback((newQueryBuilderType: QueryBuilderType) =>
  {
    handleQueryChange({...query, queryBuilderType: newQueryBuilderType}, false);
  }, [query, handleQueryChange])

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
        ],
      },
    };
  }, [systems]);

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
    <>
      <div style={{alignSelf: 'flex-end', textAlign: 'right', marginBottom: '4px'}}>
        <RadioButtonGroup
          options={enumToOptions(QueryBuilderType)}
          onChange={handleQueryBuilderTypeChange}
          value={query.queryBuilderType}
          />
      </div>
      { query.queryBuilderType === QueryBuilderType.Builder &&
        <QueryBuilder
          customOperations={operations}
          fields={fields}
          messages={queryBuilderMessages}
          onChange={onChange}
          value={sanitizedFilter}
          style={{width: '520px'}}
          />
      }
      { query.queryBuilderType === QueryBuilderType.Code &&
        <TextArea style={{width: "520px"}} value={sanitizedFilter} onChange={onFilterChange} />
      }
    </>
  );
};
