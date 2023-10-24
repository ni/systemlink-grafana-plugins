import { DataQuery } from '@grafana/schema';

export enum TagQueryType {
  Current = 'Current',
  History = 'History',
}

export interface TagQuery extends DataQuery {
  type: TagQueryType;
  path: string;
  workspace: string;
  properties: boolean;
}

interface TagWithValueBase {
  current: {
    value: { value: string };
    timestamp: string;
  } | null;
  tag: {
    path: string;
    properties: Record<string, string> | null;
  };
}

// Legacy tag properties from SystemLink Cloud
interface TagWithValueV1 {
  tag: {
    collect_aggregates: boolean;
    datatype: string;
    last_updated: number;
    workspace_id: string;
  }
}

// Tag properties renamed in SystemLink Server and Enterprise
interface TagWithValueV2 {
  tag: {
    type: string;
    workspace: string;
  }
}

export type TagWithValue = TagWithValueBase & TagWithValueV1 & TagWithValueV2;

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
