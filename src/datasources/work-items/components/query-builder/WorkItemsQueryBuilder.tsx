import React from 'react';
import { QueryBuilderOption, Workspace } from 'core/types';
import { User } from 'shared/types/QueryUsers.types';
import {
  QUERY_BUILDER_PLACEHOLDER_BORDER,
  QUERY_BUILDER_PLACEHOLDER_BORDER_RADIUS,
  QUERY_BUILDER_PLACEHOLDER_HEIGHT,
  QUERY_BUILDER_PLACEHOLDER_WIDTH,
} from '../../constants/QueryEditor.constants';

interface WorkItemsQueryBuilderProps {
  filter?: string;
  workspaces?: Workspace[] | null;
  users?: User[] | null;
  globalVariableOptions: QueryBuilderOption[];
  onChange: (event: any) => void;
}

// TODO: AB#3923383 - Replace this layout placeholder with the Work Items query builder.
export function WorkItemsQueryBuilder(_props: WorkItemsQueryBuilderProps) {
  return (
    <div
      style={{
        border: QUERY_BUILDER_PLACEHOLDER_BORDER,
        borderRadius: QUERY_BUILDER_PLACEHOLDER_BORDER_RADIUS,
        minHeight: QUERY_BUILDER_PLACEHOLDER_HEIGHT,
        width: QUERY_BUILDER_PLACEHOLDER_WIDTH,
      }}
    />
  );
}
