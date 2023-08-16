import { DataQuery } from '@grafana/schema';

export enum TagQueryType {
  Current = 'Current',
  History = 'History',
}

export interface TagQuery extends DataQuery {
  type: TagQueryType;
  path: string;
}

export const defaultTagQuery: Omit<TagQuery, 'refId'> = {
  type: TagQueryType.Current,
  path: '',
};

export interface TagWithValue {
  current: { value: { value: string } };
  tag: {
    path: string;
    properties: { displayName?: string };
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
