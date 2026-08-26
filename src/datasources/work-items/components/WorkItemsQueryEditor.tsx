import React from 'react';
import { QueryEditorProps } from '@grafana/data';
import { WorkItemsDataSource } from '../WorkItemsDataSource';
import { WorkItemsQuery } from '../types';

type Props = QueryEditorProps<WorkItemsDataSource, WorkItemsQuery>;

export function WorkItemsQueryEditor(_props: Props): React.ReactElement {
  return <span>Work Items datasource query controls will be added in follow-up stories.</span>;
}
