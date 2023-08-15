import { DataQuery } from '@grafana/schema';

export interface TagQuery extends DataQuery {
  path: string;
  aggregates: string[];
}

export interface TagWithValue {
  current: { value: { value: string } };
  tag: {
    path: string;
    properties: { displayName?: string };
  };
  aggregate: {
    min: string;
    max: string;
    avg: string;
    count: string;
  };
}

export interface TagsWithValues {
  tagsWithValues: TagWithValue[];
}
