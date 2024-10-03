import React, { useEffect, useState } from 'react';
import { QueryBuilder, QueryBuilderCustomOperation, QueryBuilderProps } from 'smart-webcomponents-react/querybuilder';
import { useTheme2 } from '@grafana/ui';

import 'smart-webcomponents-react/source/styles/smart.dark-orange.css';
import 'smart-webcomponents-react/source/styles/smart.orange.css';
import 'smart-webcomponents-react/source/styles/components/smart.base.css';
import 'smart-webcomponents-react/source/styles/components/smart.common.css';
import 'smart-webcomponents-react/source/styles/components/smart.querybuilder.css';

import { AssetCalibrationFields, AssetCalibrationStaticFields } from '../constants';
import { Workspace, QueryBuilderOption } from 'core/types';
import { QBField } from '../types';
import { queryBuilderMessages, QueryBuilderOperations } from 'core/query-builder.constants';
import { expressionBuilderCallback, expressionReaderCallback } from 'core/query-builder.utils';

type AssetCalibrationQueryBuilderProps = QueryBuilderProps &
  React.HTMLAttributes<Element> & {
    filter?: string;
    workspaces: Workspace[]
  };

export const AssetCalibrationQueryBuilder: React.FC<AssetCalibrationQueryBuilderProps> = ({ filter, onChange, workspaces }) => {
  const theme = useTheme2();
  document.body.setAttribute('theme', theme.isDark ? 'dark-orange' : 'orange');

  const [fields, setFields] = useState<QBField[]>([]);
  const [operations, setOperations] = useState<QueryBuilderCustomOperation[]>([]);

  useEffect(() => {
    if (workspaces.length) {
      const workspaceField = getWorkspaceField(workspaces);

      const fields = [
        ...AssetCalibrationStaticFields,
        workspaceField,
      ];

      setFields(fields);

      const options = Object.values(fields)
        .reduce((accumulator, fieldConfig) => {
          if (fieldConfig.lookup) {
            accumulator[fieldConfig.dataField!] = fieldConfig.lookup.dataSource;
          }

          return accumulator;
        }, {} as Record<string, QueryBuilderOption[]>);

      const callbacks = {
        expressionBuilderCallback: expressionBuilderCallback(options),
        expressionReaderCallback: expressionReaderCallback(options)
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
        QueryBuilderOperations.DOES_NOT_CONTAIN
      ]);
    }
  }, [workspaces]);

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

function getWorkspaceField(workspaces: Workspace[]) {
  const workspaceField = AssetCalibrationFields.WORKSPACE;

  return {
    ...workspaceField,
    lookup: {
      ...workspaceField.lookup,
      dataSource: [
        ...workspaceField.lookup?.dataSource || [],
        ...workspaces.map(({ id, name }) => ({ label: name, value: id }))
      ]
    }
  };
}


