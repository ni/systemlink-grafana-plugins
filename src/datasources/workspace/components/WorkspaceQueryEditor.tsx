import React, { useEffect } from 'react';
import { WorkspaceQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import { WorkspaceDataSource } from '../WorkspaceDataSource';

type Props = QueryEditorProps<WorkspaceDataSource, WorkspaceQuery>;

export function WorkspaceQueryEditor({ query, onChange, onRunQuery }: Props) {
  // useEffect(onRunQuery, [onRunQuery]);

  // query = datasource.prepareQuery(query);

  useEffect(() => {
    onChange(query);
    onRunQuery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Only run on mount

  return (
    <span>This data source returns all SystemLink workspaces and does not include a query editor.</span>
  );
}
