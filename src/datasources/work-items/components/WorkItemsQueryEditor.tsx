import React, { useEffect } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsQuery } from '../types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  useEffect(() => {
    onChange(Object.assign({ init: true }, query));
    onRunQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span>Work Items datasource query controls will be added in follow-up stories.</span>;
}
