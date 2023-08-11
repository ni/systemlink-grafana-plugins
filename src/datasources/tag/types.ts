import { DataQuery } from '@grafana/schema';

export interface TagQuery extends DataQuery {
  path: string;
}

export interface TagWithValue {
  current: {
    timestamp: string;
    value: {
      type: string;
      value: string;
    };
  };
  tag: {
    path: string;
    properties: { displayName?: string }
  }
}

export interface TagsWithValues {
  tagsWithValues: TagWithValue[];
};
