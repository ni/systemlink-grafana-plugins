import React, { useEffect } from 'react';
import { WorkspaceQuery } from '../types';
import { QueryEditorProps } from '@grafana/data';
import { WorkspaceDataSource } from '../WorkspaceDataSource';

type Props = QueryEditorProps<WorkspaceDataSource, WorkspaceQuery>;

export function WorkspaceQueryEditor({ query, onChange, onRunQuery }: Props) {
  useEffect(() => {
    // The "init" property is required for the initial query in Explore to work since the query
    // only runs if a change to a property is detected. It otherwise has no use and can be removed
    // if a property is added to "WorkspaceQuery".
    onChange(Object.assign({ init: true }, query));
    onRunQuery();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Only run on mount

  return (
    <span>This data source returns all SystemLink workspaces and does not include a query editor.</span>
  );
}
