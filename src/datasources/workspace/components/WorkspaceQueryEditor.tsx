import React, { useEffect } from 'react';
import { WorkspaceQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import { WorkspaceDataSource } from '../WorkspaceDataSource';

type Props = QueryEditorProps<WorkspaceDataSource, WorkspaceQuery>;

export function WorkspaceQueryEditor({ onRunQuery }: Props) {
  useEffect(() => {
    onRunQuery();
  }, [onRunQuery]);

  return (
    <span>This data source does not include a query editor - it simply returns all of the SystemLink Workspaces.</span>
  );
}
