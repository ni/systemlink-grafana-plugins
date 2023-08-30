import { DataQuery } from '@grafana/schema';

export enum TagQueryType {
  Current = 'Current',
  History = 'History',
}

export interface TagQuery extends DataQuery {
  type: TagQueryType;
  path: string;
  workspace: string;
}

export interface TagWithValue {
  current: { value: { value: string } };
  tag: {
    path: string;
    properties: { displayName?: string } | null;
    workspace_id: string;
  };
}

export interface TagsWithValues {
  tagsWithValues: TagWithValue[];
}

export interface TagHistoryResponse {
  results: {
    [path: string]: {
      type: string;
      values: Array<{ timestamp: string; value: string }>;
    };
  };
}
